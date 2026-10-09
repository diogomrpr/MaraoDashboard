"""Static camera entity used only by the disposable Home Assistant test instance."""

from __future__ import annotations

from homeassistant.components.camera import Camera


from pathlib import Path
from homeassistant.util import slugify

CAMERA_IMAGE = Path(__file__).with_name("event.svg").read_bytes()


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the local visual-test camera entity."""
    async_add_entities([MaraoTestCamera(config.get("name", "Marao Test Camera"), config.get("initial_state", "idle"))])


class MaraoTestCamera(Camera):
    """Serve a deterministic still image without network or live-camera access."""

    _attr_should_poll = False

    def __init__(self, name: str, initial_state: str = "idle") -> None:
        super().__init__()
        self.content_type = "image/svg+xml"
        self._attr_name = name
        self._attr_unique_id = slugify(name)
        self._fixture_state = None if initial_state == "unknown" else initial_state
        self._attr_available = initial_state != "unavailable"
        self._attr_extra_state_attributes = {"client_id": "marao_test", "camera_name": "front"}

    @property
    def state(self):
        return self._fixture_state

    async def async_camera_image(self, width=None, height=None) -> bytes:
        """Return the static test frame."""
        return CAMERA_IMAGE
