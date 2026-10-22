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
    import sys
    from types import ModuleType

    path = ROOT / "ha-test/custom_components" / relative
    package_name = f"fixture_{path.parent.name}"
    if path.name == "__init__.py":
        spec = importlib.util.spec_from_file_location(package_name, path, submodule_search_locations=[str(path.parent)])
    else:
        if package_name not in sys.modules:
            package = ModuleType(package_name)
            package.__path__ = [str(path.parent)]
            sys.modules[package_name] = package
        spec = importlib.util.spec_from_file_location(f"{package_name}.{path.stem}", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
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

    async def request(entity, authenticated=True, period=base):
        result = make_mocked_request("GET", period + entity, app=hass.http.app)
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
    from datetime import timedelta

    start = fixture.dt_util.utcnow() - timedelta(hours=2)
    loading = await request("sensor.marao_dashboard_test_history_loading", period=f"/api/history/period/{start.isoformat()}?filter_entity_id=")
    records = json.loads(loading.body)[0]
    stamps = [fixture.dt_util.parse_datetime(record["last_updated"]) for record in records]
    assert len(records) >= 9
    assert stamps[0] == start
    assert all(0 < (right - left).total_seconds() <= 900 for left, right in zip(stamps, stamps[1:]))
    assert all(float(right["state"]) > float(left["state"]) for left, right in zip(records, records[1:]))
    sleep.assert_awaited_once_with(5)
    with pytest.raises(web.HTTPUnauthorized):
        await request("sensor.marao_dashboard_test_energy_format_mixed", False)
    mixed = json.loads((await request("sensor.marao_dashboard_test_energy_format_mixed")).body)[0]
    assert [record["state"] for record in mixed] == ["1000.001", "unavailable", "3600007.2", "unknown", "1000.003"]
    assert [record["attributes"].get("unit_of_measurement") for record in mixed] == ["Wh", None, "J", None, "Wh"]
    power = json.loads((await request("sensor.marao_dashboard_test_energy_format_power")).body)[0]
    assert [record["state"] for record in power] == ["1000", "unknown", "1.5", "unavailable", "1500"]
    assert [record["attributes"].get("unit_of_measurement") for record in power] == ["W", None, "kW", None, "W"]
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


async def test_energy_demo_history_matches_live_templates_and_period_resets(hass, monkeypatch):
    from datetime import UTC, datetime

    from homeassistant.helpers.template import Template

    fixture = load_fixture("history/__init__.py")
    with monkeypatch.context() as scoped:
        scoped.setattr(fixture.dt_util, "DEFAULT_TIME_ZONE", UTC)
        def entity(name):
            return f"sensor.marao_dashboard_test_energy_demo_{name}"

        first_hour = datetime(2026, 1, 1, 1, tzinfo=UTC)
        midnight = datetime(2026, 1, 2, tzinfo=UTC)
        assert fixture.energy_demo_value(entity("today"), first_hour) == .3
        assert fixture.energy_demo_value(entity("kitchen"), first_hour) == .1
        assert fixture.energy_demo_value(entity("kitchen_cost"), first_hour) == .025
        assert fixture.energy_demo_value(entity("today"), midnight, before_reset=True) == 11.1
        assert fixture.energy_demo_value(entity("today"), midnight) == 0
        assert fixture.energy_demo_value(entity("month"), datetime(2026, 1, 3, tzinfo=UTC)) == 33.3

        config = yaml.safe_load((ROOT / "ha-test/marao_dashboard_card_test_helpers.yaml").read_text())
        sensors = {"sensor." + sensor["unique_id"]: sensor for block in config["template"]
                   for sensor in block.get("sensor", []) if sensor.get("unique_id", "").startswith("marao_dashboard_test_energy_demo_")}
        assert sensors.keys() == fixture.ENERGY_DEMO.keys()
        for instant in (first_hour, midnight, datetime(2026, 1, 3, 20, 30, tzinfo=UTC)):
            variables = {"now": lambda current=instant: current, "today_at": lambda current=instant: current.replace(hour=0, minute=0, second=0, microsecond=0)}
            for sensor_id, sensor in sensors.items():
                assert "state_class" not in sensor
                rendered = Template(sensor["state"], hass).async_render(variables)
                assert float(rendered) == pytest.approx(fixture.energy_demo_value(sensor_id, instant)), sensor_id


async def test_camera_live_fixture_is_distinct_safe_local_media_with_optional_still(monkeypatch):
    # This fixture contract does not need HA's optional native image decoders.
    import sys
    from enum import IntFlag
    from types import ModuleType

    class FixtureCamera:
        pass

    class FixtureCameraFeature(IntFlag):
        STREAM = 2

    camera_module = ModuleType("homeassistant.components.camera")
    camera_module.Camera = FixtureCamera
    camera_module.CameraEntityFeature = FixtureCameraFeature
    monkeypatch.setitem(sys.modules, "homeassistant.components.camera", camera_module)
    fixture = load_fixture("marao_test_camera/camera.py")
    still = fixture.MaraoTestCamera("Safe still")
    live = fixture.MaraoTestCamera("Safe live", live=True)
    missing = fixture.MaraoTestCamera("Safe missing still", live=True, missing_still=True)
    assert await still.stream_source() is None
    live.hass = SimpleNamespace(http=SimpleNamespace(context=None, server_port=18123))
    assert await live.stream_source() == "http://127.0.0.1:18123/api/marao_test_camera/live.ts"
    source = Path(fixture.__file__).with_name("live.mp4")
    assert source.read_bytes()[4:8] == b"ftyp"
    assert source.read_bytes() != source.with_name("event.mp4").read_bytes()
    for quality, width in (("high", 640), ("medium", 480), ("low", 320)):
        tier = fixture.MaraoTestCamera("Safe tier", live=True, quality=quality)
        tier.hass = live.hass
        assert await tier.stream_source() == f"http://127.0.0.1:18123/api/marao_test_camera/live.ts?quality={quality}&bps=24000"
        assert tier._attr_extra_state_attributes["width"] == width
        assert tier._attr_extra_state_attributes["bandwidth"] > 0
        assert tier._attr_extra_state_attributes["codec"].startswith("avc1.")
    assert await live.async_camera_image() == fixture.CAMERA_IMAGE
    assert await missing.async_camera_image() is None
    assert missing.entity_picture is None
    FixtureCamera.entity_picture = property(lambda self: "/api/camera_proxy/camera.safe?token=synthetic")
    error = fixture.MaraoTestCamera("Safe image failure", picture_error=True)
    healthy = False
    error.hass = SimpleNamespace(states=SimpleNamespace(is_state=lambda entity, state: healthy and state == "off"))
    assert error.entity_picture == "/api/camera_proxy/camera.safe?token=synthetic&fixture_media=broken"
    assert await error.async_camera_image() == b"<svg"
    healthy = True
    assert error.entity_picture.endswith("&fixture_media=good")
    assert await error.async_camera_image() == fixture.CAMERA_IMAGE
    config = yaml.safe_load((ROOT / "ha-test/marao_dashboard_card_test_helpers.yaml").read_text())
    assert next(camera for camera in config["camera"] if camera["name"] == "Marao Dashboard Test Camera")["live"] is True


def test_synthetic_live_remux_loops_with_clocked_monotonic_packets_and_closes(monkeypatch):
    import sys
    from fractions import Fraction
    from queue import Queue

    fixture = load_fixture("marao_test_camera/live.py")
    recorded, waits, closed = [], [], []

    class Stop:
        stopped = False

        def is_set(self):
            return self.stopped

        def wait(self, delay):
            waits.append(delay)
            return self.stopped

    stop = Stop()
    video = SimpleNamespace(time_base=Fraction(1, 20), average_rate=20, duration=2)

    class Input:
        streams = SimpleNamespace(video=[video])

        def __enter__(self):
            return self

        def __exit__(self, *_):
            closed.append("input")

        def demux(self, _video):
            return iter([SimpleNamespace(dts=tick, pts=tick, duration=1, time_base=video.time_base, stream=video) for tick in [0, 1]])

        def seek(self, offset, **options):
            assert offset == 0
            assert options == {"stream": video, "backward": True, "any_frame": False}

    class Output:
        def __init__(self, sink):
            self.sink = sink

        def __enter__(self):
            return self

        def __exit__(self, *_):
            closed.append("output")

        def add_stream_from_template(self, template):
            assert template is video
            return "synthetic-output"

        def mux(self, packet):
            assert packet.stream == "synthetic-output"
            recorded.append((packet.dts, packet.pts))
            self.sink.write(b"x")
            if len(recorded) == 5:
                stop.stopped = True

    def open_media(source, **options):
        if options.get("mode") == "w":
            assert options["format"] == "mpegts"
            return Output(source)
        assert Path(source) == fixture.LIVE_FILE
        return Input()

    monkeypatch.setitem(sys.modules, "av", SimpleNamespace(open=open_media))
    monkeypatch.setattr(fixture.time, "monotonic", lambda: 0)
    monkeypatch.setattr(fixture, "SOURCE_EPOCH", 0)
    chunks = Queue(maxsize=8)
    fixture.remux_live(stop, chunks)
    assert recorded == [(tick, tick) for tick in range(5)]
    assert waits == pytest.approx([0, .05, .1, .15, .2, .25])
    assert chunks.qsize() == 5
    assert closed.count("output") == 1 and closed.count("input") == 4


def test_quality_media_has_matching_scene_counters_and_truthful_profiles():
    av = pytest.importorskip("av", reason="Run media proof with HA's pinned PyAV dependency")
    import json

    root = ROOT / "ha-test/custom_components/marao_test_camera"
    profiles = json.loads((root / "live-profiles.json").read_text())
    previous_bandwidth = 0
    for quality in ("low", "medium", "high"):
        profile = profiles[quality]
        with av.open(str(root / profile["file"])) as source:
            video = source.streams.video[0]
            assert (video.width, video.height) == (profile["width"], profile["height"])
            assert "avc1." + video.codec_context.extradata[1:4].hex() == profile["codec"]
            frames = list(source.decode(video))
            assert len(frames) == profile["frames"] == 240
            for tick, frame in enumerate(frames):
                assert float(frame.pts * frame.time_base) == pytest.approx(tick / 20)
                plane = frame.planes[0]
                pixels = bytes(plane)
                y = 40 * frame.height // 360
                observed = sum((pixels[y * plane.line_size + (54 + 76 * bit) * frame.width // 640] > 128) << bit
                               for bit in range(8))
                assert observed == tick, (quality, tick, observed)
                assert bool(frame.key_frame) == (tick % 20 == 0)
        with av.open(str(root / profile["file"])) as source:
            packets = [packet for packet in source.demux(video=0) if packet.dts is not None]
            peak = max(sum(packet.size for packet in packets if second <= float(packet.dts * packet.time_base) < second + 1)
                       for second in range(12)) * 8
            assert profile["bandwidth"] == (peak * 11 + 9) // 10
            assert profile["average_bandwidth"] == round(sum(packet.size for packet in packets) * 8 / 12)
            assert profile["bandwidth"] > previous_bandwidth
            previous_bandwidth = profile["bandwidth"]


def test_independent_live_consumers_join_shared_scene_instead_of_restarting(monkeypatch):
    av = pytest.importorskip("av", reason="Run media proof with HA's pinned PyAV dependency")
    from io import BytesIO
    from queue import Queue
    from concurrent.futures import ThreadPoolExecutor
    from time import perf_counter

    fixture = load_fixture("marao_test_camera/live.py")
    monkeypatch.setattr(fixture, "SOURCE_EPOCH", 0)
    observed = []
    for joined_at, quality, expected_first in ((2.2, "low", 60), (3.2, "high", 80), (11.2, "medium", 0)):
        monkeypatch.setattr(fixture.time, "monotonic", lambda: joined_at)

        class Stop:
            calls = 0
            stopped = False

            def is_set(self):
                return self.stopped or self.calls > 40

            def wait(self, delay):
                self.calls += 1
                assert delay >= 0
                return self.is_set()

        chunks = Queue(maxsize=8)
        from queue import Empty
        content = bytearray()
        stop = Stop()
        with ThreadPoolExecutor(max_workers=1) as pool:
            worker = pool.submit(fixture.remux_live, stop, chunks, fixture.LIVE_FILE.with_name(fixture.PROFILES[quality]["file"]))
            deadline = perf_counter() + 5
            try:
                while not worker.done() or not chunks.empty():
                    assert perf_counter() < deadline, "Synthetic remux did not finish"
                    try:
                        content.extend(chunks.get(timeout=.1))
                    except Empty:
                        pass
            finally:
                stop.stopped = True
                worker.result(timeout=5)
        with av.open(BytesIO(content), format="mpegts") as source:
            frames = list(source.decode(video=0))
        assert len(frames) == 40
        for index, frame in enumerate(frames):
            plane, y = frame.planes[0], 40 * frame.height // 360
            pixels = bytes(plane)
            counter = sum((pixels[y * plane.line_size + (54 + 76 * bit) * frame.width // 640] > 128) << bit
                          for bit in range(8))
            assert counter == (expected_first + index) % 240
        observed.append({round(float(frame.pts * frame.time_base), 2): (expected_first + index) % 240
                         for index, frame in enumerate(frames)})
    overlap = set(observed[0]) & set(observed[1])
    assert len(overlap) == 20
    assert all(observed[0][tick] == observed[1][tick] for tick in overlap)


async def test_synthetic_live_endpoint_rejects_external_and_limits_physical_loopback():
    from aiohttp import web

    fixture = load_fixture("marao_test_camera/live.py")
    view = fixture.FixtureLiveView()
    request = SimpleNamespace(transport=SimpleNamespace(get_extra_info=lambda _: ("192.168.0.28", 12345)))
    with pytest.raises(web.HTTPForbidden):
        await view.get(request)
    assert view._active == 0
    request.transport = SimpleNamespace(get_extra_info=lambda _: ("127.0.0.1", 12345))
    view._active = fixture.MAX_LIVE_CONNECTIONS
    with pytest.raises(web.HTTPTooManyRequests):
        await view.get(request)
    assert view._active == fixture.MAX_LIVE_CONNECTIONS
    assert fixture.MAX_LIVE_CONNECTIONS == 6


async def test_synthetic_live_endpoint_bounds_queue_and_joins_on_native_disconnect(monkeypatch):
    from queue import Queue

    fixture = load_fixture("marao_test_camera/live.py")
    observed = {}

    def bounded_queue(maxsize):
        assert maxsize == 8
        queue = Queue(maxsize=maxsize)
        queue.put(b"synthetic-ts")
        return queue

    class Response:
        def __init__(self, headers):
            assert headers["Content-Type"] == "video/mp2t"

        async def prepare(self, _request):
            pass

        async def write(self, _data):
            raise ConnectionResetError("Native consumer disconnected")

    def executor(_function, stop, _chunks, source_file):
        assert source_file == fixture.LIVE_FILE
        observed["stop"] = stop

        async def producer():
            while not stop.is_set():
                await asyncio.sleep(0)
            observed["joined"] = True

        return asyncio.create_task(producer())

    monkeypatch.setattr(fixture, "Queue", bounded_queue)
    monkeypatch.setattr(fixture.web, "StreamResponse", Response)
    request = SimpleNamespace(query={}, transport=SimpleNamespace(get_extra_info=lambda _: ("::1", 12345)), app={fixture.KEY_HASS: SimpleNamespace(async_add_executor_job=executor)})
    view = fixture.FixtureLiveView()
    await view.get(request)
    assert observed["stop"].is_set() and observed["joined"]
    assert view._active == 0
