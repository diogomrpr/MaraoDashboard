"""The disposable providers exercise production APIs without household devices."""

from __future__ import annotations

import importlib.util
import asyncio
import inspect
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[3]


async def test_open_only_door_advertises_only_safe_open_action():
    config = yaml.safe_load((ROOT / "ha-test/marao_dashboard_card_test_helpers.yaml").read_text())
    assert config["cover"] == [{"platform": "marao_test_cover", "name": "Marao Dashboard Test Open Only Door"}]
    assert not any(cover.get("unique_id") == "marao_dashboard_test_open_only_door"
                   for block in config["template"] for cover in block.get("cover", []))
    from unittest.mock import AsyncMock
    fixture = load_fixture("marao_test_cover/cover.py")
    door = fixture.MaraoTestOpenOnlyDoor()
    door.hass = SimpleNamespace(states=SimpleNamespace(is_state=Mock(return_value=True)),
                                services=SimpleNamespace(async_call=AsyncMock()))
    assert door.supported_features == 1
    assert door.device_class == "door"
    assert door.is_closed and door.current_cover_position == 0
    door.hass.states.is_state.return_value = False
    assert not door.is_closed and door.current_cover_position == 100
    await door.async_open_cover()
    door.hass.services.async_call.assert_awaited_once_with("input_boolean", "turn_on", {
        "entity_id": "input_boolean.marao_dashboard_test_open_only_door"}, blocking=True)


def load_fixture(relative):
    path = ROOT / "ha-test/custom_components" / relative
    spec = importlib.util.spec_from_file_location(f"fixture_{path.parent.name}_{path.stem}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


async def test_frigate_fixture_has_real_api_events_and_reported_errors():
    fixture = load_fixture("marao_test_camera/__init__.py")
    handler = inspect.unwrap(fixture.events)
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    message = {"id": 1, "type": "frigate/events/get", "instance_id": "marao_test", "limit": 12}
    await handler(None, connection, message)
    results = connection.send_result.call_args.args[1]
    assert [event["has_clip"] for event in results] == [True, False]
    await handler(None, connection, {**message, "cameras": ["empty"]})
    assert connection.send_result.call_args.args[1] == []
    await handler(None, connection, {**message, "cameras": ["error"]})
    assert connection.send_error.call_args.args[1] == "fixture_error"
    await handler(None, connection, {**message, "instance_id": "real-provider"})
    assert connection.send_error.call_args.args[1] == "not_found"
    assert fixture.FixtureMediaView.requires_auth is True
    assert (Path(fixture.__file__).parent / "event.mp4").read_bytes()[4:8] == b"ftyp"


async def test_protect_fixture_browses_and_resolves_signed_native_media(monkeypatch):
    fixture = load_fixture("unifiprotect/media_source.py")
    monkeypatch.setattr(fixture, "async_sign_path", lambda _hass, path, _expiry: f"{path}?authSig=test")
    source = fixture.FixtureSource(None)
    folder = await source.async_browse_media(SimpleNamespace(identifier=""))
    assert folder.children[0].media_content_id == "media-source://unifiprotect/fixture:browse"
    camera = await source.async_browse_media(SimpleNamespace(identifier="fixture:browse"))
    assert camera.children[0].thumbnail.endswith("camera.marao_dashboard_test_camera")
    events = await source.async_browse_media(SimpleNamespace(identifier="fixture:browse:front:all:recent:1"))
    assert events.children[0].can_play
    clip = await source.async_resolve_media(SimpleNamespace(identifier="fixture:event:marao-test-clip"))
    assert clip.mime_type == "video/mp4"
    assert clip.url.endswith("clip.mp4?authSig=test")
    empty = await source.async_browse_media(SimpleNamespace(identifier="fixture:browse:empty:all:recent:1"))
    assert empty.children == []
    with pytest.raises(fixture.MediaSourceError):
        await source.async_browse_media(SimpleNamespace(identifier="fixture:browse:error:all:recent:1"))
    detail_error = await source.async_browse_media(SimpleNamespace(identifier="fixture:browse:detail-error:all:recent:1"))
    assert detail_error.children[0].media_content_id.endswith(":event:marao-test-error")
    thumbnail = await source.async_resolve_media(SimpleNamespace(identifier="fixture:eventthumb:marao-test-error"))
    assert thumbnail.mime_type == "image/svg+xml"
    with pytest.raises(fixture.Unresolvable):
        await source.async_resolve_media(SimpleNamespace(identifier="fixture:event:marao-test-error"))
    with pytest.raises(fixture.Unresolvable):
        await source.async_resolve_media(SimpleNamespace(identifier="real-provider:event:x"))


async def test_custom_state_examples_use_independent_service_capable_entities():
    climate = load_fixture("marao_test_climate/climate.py")
    media = load_fixture("marao_test_media/media_player.py")
    for cls in [climate.MaraoTestClimate, media.MaraoTestAppleTV]:
        known = cls("Marao Dashboard Test Example", "off")
        unknown = cls("Marao Dashboard Test Unknown", "unknown")
        unavailable = cls("Marao Dashboard Test Unavailable", "unavailable")
        assert known.unique_id != unknown.unique_id != unavailable.unique_id
        assert unknown.state is None
        assert unavailable.available is False
    instance = climate.MaraoTestClimate("Marao Dashboard Test Independent", "heat")
    instance.async_write_ha_state = Mock()
    await instance.async_set_hvac_mode(climate.HVACMode.COOL)
    assert instance.hvac_mode == climate.HVACMode.COOL
    assert instance._marao_initial_attrs["_attr_hvac_mode"] == climate.HVACMode.HEAT


async def test_vacuum_fixture_records_each_command_without_a_device():
    fixture = load_fixture("marao_test_vacuum/vacuum.py")
    vacuum = fixture.MaraoTestVacuum()
    vacuum.async_write_ha_state = Mock()
    await vacuum.async_start()
    assert vacuum.activity == fixture.VacuumActivity.CLEANING
    await vacuum.async_pause()
    assert vacuum.activity == fixture.VacuumActivity.PAUSED
    await vacuum.async_return_to_base()
    assert vacuum.activity == fixture.VacuumActivity.RETURNING
    await vacuum.async_send_command("app_segment_clean", [21])
    assert vacuum.extra_state_attributes == {"command_count": 1, "last_command": "app_segment_clean", "last_segments": [21]}
    assert vacuum._marao_initial_attrs["_attr_extra_state_attributes"] == {"command_count": 0}


async def test_history_fixture_uses_native_routes_auth_and_delegation(hass, hass_admin_user, monkeypatch):
    import json
    from unittest.mock import AsyncMock

    from aiohttp import web
    from aiohttp.test_utils import make_mocked_request
    from homeassistant.components.http import HomeAssistantHTTP
    from homeassistant.components.http.const import KEY_AUTHENTICATED, KEY_HASS, KEY_HASS_USER
    from homeassistant.core import CoreState

    fixture = load_fixture("history/__init__.py")
    hass.http = HomeAssistantHTTP(hass, None, None, None, None, 0, [], "modern")
    # These native startup hooks register the History panel and WS APIs. Their
    # dependencies are unrelated to route dispatch; the actual HA view wrappers
    # and aiohttp router below run unchanged, without opening a network socket.
    panel = Mock()
    websocket = Mock()
    monkeypatch.setattr(fixture.core_history.frontend, "async_register_built_in_panel", panel)
    monkeypatch.setattr(fixture.core_history.websocket_api, "async_setup", websocket)
    sleep = AsyncMock()
    monkeypatch.setattr(fixture.asyncio, "sleep", sleep)
    assert await fixture.async_setup(hass, {"history": {}})
    panel.assert_called_once()
    websocket.assert_called_once()
    hass.state = CoreState.running
    hass.http.app[KEY_HASS] = hass
    base = "/api/history/period/2999-09-15T00:00:00%2B00:00?end_time=2999-09-16T00:00:00%2B00:00&filter_entity_id="

    async def request(entity, authenticated=True):
        result = make_mocked_request("GET", base + entity, app=hass.http.app)
        result[KEY_AUTHENTICATED] = authenticated
        if authenticated:
            result[KEY_HASS_USER] = hass_admin_user
        match = await hass.http.app.router.resolve(result)
        match.add_app(hass.http.app)
        result._match_info = match
        return await match.handler(result)

    with pytest.raises(web.HTTPUnauthorized):
        await request("sensor.marao_dashboard_test_history_error", False)
    # Native History rejects invalid IDs and returns empty for a future period.
    # The combined query must delegate, not trigger the fixture's error response.
    ordinary = await request("sensor.household")
    assert json.loads(ordinary.body) == []
    combined = await request("sensor.marao_dashboard_test_history_error,sensor.household")
    assert json.loads(combined.body) == []
    invalid = await request("@invalid")
    assert invalid.status == 400
    empty = await request("sensor.marao_dashboard_test_history_empty")
    assert json.loads(empty.body) == []
    error = await request("sensor.marao_dashboard_test_history_error")
    assert error.status == 200
    with pytest.raises(json.JSONDecodeError):
        json.loads(error.text)
    loading = await request("sensor.marao_dashboard_test_history_loading")
    assert len(json.loads(loading.body)[0]) == 3
    sleep.assert_awaited_once_with(5)
    with pytest.raises(web.HTTPUnauthorized):
        await request("sensor.marao_dashboard_test_energy_format_mixed", False)
    mixed = json.loads((await request("sensor.marao_dashboard_test_energy_format_mixed")).body)[0]
    assert [record["state"] for record in mixed] == ["1000.001", "3600007.2", "1000.003"]
    assert [record["attributes"]["unit_of_measurement"] for record in mixed] == ["Wh", "J", "Wh"]
    missing = json.loads((await request("sensor.marao_dashboard_test_energy_format_missing_history")).body)[0]
    assert all(record["attributes"] == {} for record in missing)
    incompatible = json.loads((await request("sensor.marao_dashboard_test_energy_format_incompatible_history")).body)[0]
    assert [record["attributes"]["unit_of_measurement"] for record in incompatible] == ["Wh", "W", "Wh"]
    combined = await request("sensor.marao_dashboard_test_energy_format_mixed,sensor.household")
    assert json.loads(combined.body) == []
    sleep.assert_awaited_once_with(5)
    assert fixture.FixtureHistoryPeriodView.requires_auth is True
    assert fixture.CONFIG_SCHEMA is fixture.core_history.CONFIG_SCHEMA


async def test_safe_rejected_action_and_dual_target_fixture(hass):
    from homeassistant.exceptions import HomeAssistantError

    provider = load_fixture("marao_test_camera/__init__.py")
    hass.http = SimpleNamespace(register_view=Mock(), app=SimpleNamespace(middlewares=[]))
    assert await provider.async_setup(hass, {})
    with pytest.raises(HomeAssistantError, match="Simulated safe action failure"):
        await hass.services.async_call("marao_test_camera", "reject_action", {
            "entity_id": "sensor.marao_dashboard_test_temperature",
        }, blocking=True)
    hass.states.async_set("input_boolean.marao_dashboard_test_action_failure", "off")
    await hass.services.async_call("marao_test_camera", "reject_action", {
        "entity_id": "sensor.marao_dashboard_test_temperature",
    }, blocking=True)
    climate = load_fixture("marao_test_climate/climate.py")
    entity = climate.MaraoTestClimate("Marao Dashboard Test Dual Target Climate", "heat_cool", True)
    entity.async_write_ha_state = Mock()
    assert entity.target_temperature is None
    assert (entity.target_temperature_low, entity.target_temperature_high) == (18.5, 24.5)
    await entity.async_set_temperature(target_temp_low=19, target_temp_high=25)
    assert (entity.target_temperature_low, entity.target_temperature_high) == (19, 25)
    assert entity._marao_initial_attrs["_attr_target_temperature_low"] == 18.5


@pytest.mark.parametrize("dual", [False, True])
async def test_climate_fixture_ack_and_confirmation_are_independent(hass, monkeypatch, dual):
    climate = load_fixture("marao_test_climate/climate.py")
    gates = {2: asyncio.Event(), 4: asyncio.Event()}

    async def delay(seconds):
        await gates[seconds].wait()

    monkeypatch.setattr(climate, "sleep", delay)
    entity = climate.MaraoTestClimate("Delayed", "heat_cool" if dual else "heat", dual, ack_delay=2, confirmation_delay=4)
    entity.hass = hass
    entity.async_write_ha_state = Mock()
    other = climate.MaraoTestClimate("Independent")
    settings = {"target_temp_low": 19, "target_temp_high": 25} if dual else {"temperature": 22}
    request = asyncio.create_task(entity.async_set_temperature(**settings))
    await asyncio.sleep(0)
    assert not request.done()
    entity.async_write_ha_state.assert_not_called()
    gates[2].set()
    await request
    entity.async_write_ha_state.assert_not_called()
    gates[4].set()
    await hass.async_block_till_done()
    assert (entity.target_temperature_low, entity.target_temperature_high) == (19, 25) if dual else entity.target_temperature == 22
    entity.async_write_ha_state.assert_called_once()
    assert other.target_temperature == 21
    await entity.async_will_remove_from_hass()


@pytest.mark.parametrize("behavior", ["reject", "unconfirmed", "corrected"])
@pytest.mark.parametrize("dual", [False, True])
async def test_climate_fixture_failure_and_corrected_values(behavior, dual):
    from homeassistant.exceptions import HomeAssistantError

    climate = load_fixture("marao_test_climate/climate.py")
    entity = climate.MaraoTestClimate("Controlled", "heat_cool" if dual else "heat", dual, behavior=behavior)
    entity.async_write_ha_state = Mock()
    settings = {"target_temp_low": 19, "target_temp_high": 25} if dual else {"temperature": 22}
    if behavior == "reject":
        with pytest.raises(HomeAssistantError, match="rejected"):
            await entity.async_set_temperature(**settings)
    else:
        await entity.async_set_temperature(**settings)
    expected = (19.5, 25.5) if dual else 22.5
    baseline = (18.5, 24.5) if dual else 21
    actual = (entity.target_temperature_low, entity.target_temperature_high) if dual else entity.target_temperature
    assert actual == (expected if behavior == "corrected" else baseline)
    assert entity.async_write_ha_state.call_count == (1 if behavior == "corrected" else 0)


async def test_climate_fixture_mode_confirmation_can_precede_ack_and_removal_cancels(hass, monkeypatch):
    climate = load_fixture("marao_test_climate/climate.py")
    gates = {2: asyncio.Event(), 4: asyncio.Event()}

    async def delay(seconds):
        await gates[seconds].wait()

    monkeypatch.setattr(climate, "sleep", delay)
    entity = climate.MaraoTestClimate("Mode", ack_delay=4, confirmation_delay=2)
    entity.hass = hass
    entity.async_write_ha_state = Mock()
    request = asyncio.create_task(entity.async_set_hvac_mode(climate.HVACMode.OFF))
    await asyncio.sleep(0)
    gates[2].set()
    await asyncio.sleep(0)
    assert entity.hvac_mode == climate.HVACMode.OFF
    assert not request.done()
    gates[4].set()
    await request
    gates[2].clear()
    gates[4].set()
    await entity.async_set_hvac_mode(climate.HVACMode.HEAT)
    await entity.async_will_remove_from_hass()
    assert entity.hvac_mode == climate.HVACMode.OFF
    assert not entity._confirmation_tasks


@pytest.mark.parametrize("options", [{"behavior": "invalid"}, {"ack_delay": True}, {"confirmation_delay": float("nan")}, {"ack_delay": -1}, {"confirmation_delay": 61}])
def test_climate_fixture_rejects_invalid_controls(options):
    climate = load_fixture("marao_test_climate/climate.py")
    with pytest.raises(ValueError):
        climate.MaraoTestClimate("Invalid", **options)


@pytest.mark.parametrize("dual", [False, True])
async def test_climate_reset_cancels_delayed_reports_before_restoring_baseline(hass, monkeypatch, dual):
    climate = load_fixture("marao_test_climate/climate.py")
    gate = asyncio.Event()
    monkeypatch.setattr(climate, "sleep", lambda _seconds: gate.wait())
    entity = climate.MaraoTestClimate("Reset", "heat_cool" if dual else "heat", dual, confirmation_delay=4)
    entity.hass = hass
    entity.async_write_ha_state = Mock()
    await entity.async_set_temperature(**({"target_temp_low": 19, "target_temp_high": 25} if dual else {"temperature": 22}))
    await entity.async_marao_reset()
    gate.set()
    await hass.async_block_till_done()
    assert not entity._confirmation_tasks
    assert (entity.target_temperature_low, entity.target_temperature_high) == (18.5, 24.5) if dual else entity.target_temperature == 21
    entity.async_write_ha_state.assert_called_once()


@pytest.mark.parametrize("behavior", ["reject", "unconfirmed", "corrected"])
async def test_climate_fixture_mode_failures(behavior):
    from homeassistant.exceptions import HomeAssistantError

    climate = load_fixture("marao_test_climate/climate.py")
    entity = climate.MaraoTestClimate("Mode failure", behavior=behavior)
    entity.async_write_ha_state = Mock()
    if behavior == "reject":
        with pytest.raises(HomeAssistantError, match="rejected"):
            await entity.async_set_hvac_mode(climate.HVACMode.OFF)
    else:
        await entity.async_set_hvac_mode(climate.HVACMode.OFF)
    assert entity.hvac_mode == climate.HVACMode.HEAT
    assert entity.async_write_ha_state.call_count == (1 if behavior == "corrected" else 0)

async def test_media_artwork_decode_fixture_recovers(hass):
    import base64
    media_fixture = load_fixture('marao_test_media/media_player.py')
    player = media_fixture.MaraoTestAppleTV('Safe artwork failure', 'playing', picture_error=True)
    player.hass = hass
    hass.states.async_set('input_boolean.marao_dashboard_test_media_failure', 'on')
    assert base64.b64decode(player.entity_picture.split(',', 1)[1]) == b'<svg'
    hass.states.async_set('input_boolean.marao_dashboard_test_media_failure', 'off')
    assert b'</svg>' in base64.b64decode(player.entity_picture.split(',', 1)[1])


async def test_energy_unit_fixture_changes_only_its_safe_source_and_resets(hass):
    provider = load_fixture("marao_test_camera/__init__.py")
    hass.http = SimpleNamespace(register_view=Mock(), app=SimpleNamespace(middlewares=[]))
    assert await provider.async_setup(hass, {})
    entity = "sensor.marao_dashboard_test_energy_format_missing_live"
    hass.states.async_set(entity, "42", {"unit_of_measurement": "Wh", "friendly_name": "Safe reading"})
    hass.states.async_set("sensor.other", "7", {"unit_of_measurement": "W"})
    other = hass.states.get("sensor.other")
    for expected in [None, "Wh", None]:
        await hass.services.async_call("marao_test_camera", "toggle_energy_unit", {"entity_id": entity}, blocking=True)
        assert hass.states.get(entity).state == "42"
        assert hass.states.get(entity).attributes.get("unit_of_measurement") == expected
        assert hass.states.get("sensor.other") is other
    await hass.services.async_call("marao_test_camera", "reset", {}, blocking=True)
    assert hass.states.get(entity).attributes["unit_of_measurement"] == "Wh"
    assert hass.states.get(entity).attributes["friendly_name"] == "Safe reading"
