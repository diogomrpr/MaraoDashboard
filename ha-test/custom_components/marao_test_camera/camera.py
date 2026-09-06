"""Static camera entity used only by the disposable Home Assistant test instance."""

from __future__ import annotations

from homeassistant.components.camera import Camera


CAMERA_IMAGE = b"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#315d78"/><stop offset="1" stop-color="#12222d"/></linearGradient></defs>
<rect width="1280" height="720" fill="url(#g)"/><circle cx="640" cy="360" r="128" fill="none" stroke="#f6f7f2" stroke-width="32"/><circle cx="640" cy="360" r="44" fill="#f6f7f2"/><path d="M370 248h132l46-58h184l46 58h132a52 52 0 0 1 52 52v260a52 52 0 0 1-52 52H370a52 52 0 0 1-52-52V300a52 52 0 0 1 52-52Z" fill="none" stroke="#f6f7f2" stroke-width="28"/></svg>"""


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the local visual-test camera entity."""
    async_add_entities([MaraoTestCamera(config.get("name", "Marao Test Camera"))])


class MaraoTestCamera(Camera):
    """Serve a deterministic still image without network or live-camera access."""

    _attr_should_poll = False

    def __init__(self, name: str) -> None:
        super().__init__()
        self.content_type = "image/svg+xml"
        self._attr_name = name
        self._attr_unique_id = "marao_dashboard_test_camera"

    async def async_camera_image(self, width=None, height=None) -> bytes:
        """Return the static test frame."""
        return CAMERA_IMAGE
