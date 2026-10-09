"""The disposable providers exercise production APIs without household devices."""

from __future__ import annotations

import importlib.util
import inspect
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

ROOT = Path(__file__).resolve().parents[3]


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
    climate = load_fixture("marao_test_climate/climate.py")
    entity = climate.MaraoTestClimate("Marao Dashboard Test Dual Target Climate", "heat_cool", True)
    entity.async_write_ha_state = Mock()
    assert entity.target_temperature is None
    assert (entity.target_temperature_low, entity.target_temperature_high) == (18, 24)
    await entity.async_set_temperature(target_temp_low=18.5, target_temp_high=24.5)
    assert (entity.target_temperature_low, entity.target_temperature_high) == (18.5, 24.5)
    assert entity._marao_initial_attrs["_attr_target_temperature_low"] == 18
