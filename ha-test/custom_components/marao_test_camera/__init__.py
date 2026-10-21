"""Authenticated local media and Frigate API fixtures; never a real camera."""

from __future__ import annotations

import asyncio
from pathlib import Path
import time

from aiohttp import web
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.http.const import KEY_HASS
from homeassistant.exceptions import HomeAssistantError
from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.helpers.service import async_register_admin_service

from .live import FixtureLiveView

MARAO_DISPOSABLE_FIXTURE = True
DOMAIN = "marao_test_camera"
MEDIA = Path(__file__).parent


async def async_setup(hass, config):
    """Expose the normal Frigate API using synthetic, authenticated local media."""
    if "frigate/events/get" in hass.data.get("websocket_api", {}):
        raise RuntimeError("The disposable Frigate fixture cannot replace a real provider")
    websocket_api.async_register_command(hass, events)
    hass.http.register_view(FixtureMediaView)
    hass.http.register_view(FixtureLiveView)

    async def close_rtsp(_event):
        server = hass.data.get(DOMAIN, {}).pop("rtsp", None)
        if server is not None:
            await hass.async_add_executor_job(server.close)

    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, close_rtsp)

    unit_entity = "sensor.marao_dashboard_test_energy_format_missing_live"

    def set_energy_unit(failed):
        state = hass.states.get(unit_entity)
        if state is None:
            raise HomeAssistantError("Safe energy fixture is not ready")
        attributes = dict(state.attributes)
        if failed:
            attributes.pop("unit_of_measurement", None)
        else:
            attributes["unit_of_measurement"] = "Wh"
        hass.states.async_set(unit_entity, state.state, attributes)

    async def toggle_energy_unit(call):
        state = hass.states.get(unit_entity)
        set_energy_unit(state is not None and "unit_of_measurement" in state.attributes)

    async def reset(call):
        if hass.states.get(unit_entity) is not None:
            set_energy_unit(False)
        for domain in ("climate", "media_player"):
            for entity in getattr(hass.data.get(domain), "entities", ()):
                if reset_entity := getattr(entity, "async_marao_reset", None):
                    await reset_entity()
                    continue
                if values := getattr(entity, "_marao_initial_attrs", None):
                    for key, value in values.items():
                        setattr(entity, key, value)
                    entity.async_write_ha_state()

    async def reject_action(call):
        if hass.states.is_state("input_boolean.marao_dashboard_test_action_failure", "off"):
            return
        raise HomeAssistantError("Simulated safe action failure")

    async_register_admin_service(hass, DOMAIN, "toggle_energy_unit", toggle_energy_unit, vol.Schema({
        vol.Optional("entity_id"): unit_entity,
    }))
    async_register_admin_service(hass, DOMAIN, "reset", reset)
    async_register_admin_service(hass, DOMAIN, "reject_action", reject_action, vol.Schema({
        vol.Optional("entity_id"): "sensor.marao_dashboard_test_temperature",
    }))
    return True


@websocket_api.websocket_command({
    vol.Required("type"): "frigate/events/get",
    vol.Required("instance_id"): str,
    vol.Optional("cameras"): [str],
    vol.Optional("limit", default=12): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
})
@websocket_api.async_response
async def events(hass, connection, msg):
    """Repeatable normal, empty, loading and reported-error event cases."""
    if msg["instance_id"] != "marao_test":
        connection.send_error(msg["id"], "not_found", "Only disposable Marao media exists here")
        return
    camera = next(iter(msg.get("cameras", [])), "")
    if camera == "loading":
        await asyncio.sleep(5)
    if camera == "error":
        connection.send_error(msg["id"], "fixture_error", "Simulated camera provider failure")
        return
    now = int(time.time())
    result = [] if camera == "empty" else [
        {"id": "marao-test-clip", "label": "person", "start_time": now - 60, "has_clip": True},
        {"id": "marao-test-snapshot", "label": "car", "start_time": now - 180, "has_clip": False},
    ]
    if camera == "media_error":
        result = [{"id": "marao-test-media-error", "label": "person", "start_time": now - 60, "has_clip": False}]
    connection.send_result(msg["id"], result[:msg["limit"]])


class FixtureMediaView(HomeAssistantView):
    """Home Assistant authenticates native signed paths before serving media."""

    url = "/api/frigate/marao_test/thumbnail/{event_id}"
    extra_urls = [
        "/api/frigate/marao_test/snapshot/{event_id}",
        "/api/frigate/marao_test/notifications/{event_id}/clip.mp4",
    ]
    name = "api:marao_test_camera:media"
    requires_auth = True

    async def get(self, request, event_id):
        if event_id == "marao-test-media-error":
            if not request.app[KEY_HASS].states.is_state("input_boolean.marao_dashboard_test_media_failure", "off"):
                return web.Response(body=b"<svg", content_type="image/svg+xml")
            return web.FileResponse(MEDIA / "event.svg")
        if event_id not in {"marao-test-clip", "marao-test-snapshot"}:
            raise web.HTTPNotFound()
        filename = "event.mp4" if request.path.endswith("/clip.mp4") else "event.svg"
        return web.FileResponse(MEDIA / filename)
