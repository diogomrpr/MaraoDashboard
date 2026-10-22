"""Netatmo-shaped HLS camera backed only by generated local media."""
from homeassistant.components.camera import CameraCapabilities, StreamType
from custom_components.marao_test_camera.camera import MaraoTestCamera
from . import CAMERA_ID

async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    camera = NetatmoCamera(config["name"], live=True)
    camera._attr_extra_state_attributes = {"id": CAMERA_ID, "monitoring": True, "sd_status": "on"}
    async_add_entities([camera])

class NetatmoCamera(MaraoTestCamera):
    @property
    def camera_capabilities(self):
        return CameraCapabilities({StreamType.HLS})
