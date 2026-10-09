"""Safe in-memory Apple TV remote for the disposable test dashboard."""

from __future__ import annotations

from collections.abc import Iterable

from homeassistant.components.remote import RemoteEntity
from homeassistant.util import slugify


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the local visual-test remote."""
    async_add_entities(
        [MaraoTestAppleTVRemote(config.get("name", "Marao Dashboard Test Apple TV"), config.get("initial_state", "on"))]
    )


class MaraoTestAppleTVRemote(RemoteEntity):
    """Record commands in memory without contacting a physical device."""

    _attr_should_poll = False
    _attr_is_on = True

    def __init__(self, name: str, initial_state: str = "on") -> None:
        self._attr_name = name
        self._attr_unique_id = slugify(name)
        self._attr_is_on = None if initial_state == "unknown" else initial_state == "on"
        self._attr_available = initial_state != "unavailable"
        self._attr_extra_state_attributes = {"last_command": None, "command_count": 0}

    async def async_turn_on(self, **kwargs) -> None:
        """Turn the simulated remote on."""
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs) -> None:
        """Turn the simulated remote off."""
        self._attr_is_on = False
        self.async_write_ha_state()

    async def async_send_command(self, command: Iterable[str], **kwargs) -> None:
        """Record a command without sending it anywhere."""
        self._attr_extra_state_attributes = {"last_command": list(command), "hold_secs": kwargs.get("hold_secs", 0), "command_count": self._attr_extra_state_attributes["command_count"] + 1}
        self.async_write_ha_state()
