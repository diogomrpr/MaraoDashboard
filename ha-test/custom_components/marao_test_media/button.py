"""In-memory discovery button for the fictional Plex library."""

from homeassistant.components.button import ButtonEntity


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([MaraoTestPlexScan()])


class MaraoTestPlexScan(ButtonEntity):
    _attr_name = "Marao Dashboard Test Plex Scan"
    _attr_unique_id = "marao_dashboard_test_plex_scan"

    @property
    def state(self):
        return super().state or "2000-01-01T00:00:00+00:00"

    async def async_press(self):
        """No network, server scan or physical action."""
