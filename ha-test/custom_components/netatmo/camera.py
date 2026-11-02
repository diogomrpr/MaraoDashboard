"""Netatmo-shaped HLS camera backed only by generated local media."""
from homeassistant.components.camera import CameraCapabilities, StreamType
from custom_components.marao_test_camera.camera import MaraoTestCamera
from homeassistant.helpers import entity_registry as er
from . import CAMERA_ID

async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    camera = NetatmoCamera(config["name"], live=True)
    # Keep the existing disposable entity ID/options while matching HA's native identity.
    registry = er.async_get(hass)
    previous = registry.async_get_entity_id("camera", "netatmo", camera.unique_id)
    unique_id = CAMERA_ID + "-outdoor"
    if previous:
        registry.async_update_entity(previous, new_unique_id=unique_id)
    camera._attr_unique_id = unique_id
    camera._attr_extra_state_attributes = {"id": CAMERA_ID, "monitoring": True, "sd_status": "on"}
    async_add_entities([camera])

class NetatmoCamera(MaraoTestCamera):
    @property
    def camera_capabilities(self):
        return CameraCapabilities({StreamType.HLS})
