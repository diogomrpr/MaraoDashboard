"""Native vacuum services without connecting to a physical vacuum."""

from homeassistant.components.vacuum import StateVacuumEntity, VacuumActivity, VacuumEntityFeature


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Add the independent command fixture."""
    async_add_entities([MaraoTestVacuum()])


class MaraoTestVacuum(StateVacuumEntity):
    """Record commands and publish authoritative synthetic state."""

    _attr_name = "Marao Dashboard Test Vacuum Commands"
    _attr_unique_id = "marao_dashboard_test_vacuum_commands"
    _attr_should_poll = False
    _attr_activity = VacuumActivity.DOCKED
    _attr_supported_features = (
        VacuumEntityFeature.START | VacuumEntityFeature.PAUSE
        | VacuumEntityFeature.RETURN_HOME | VacuumEntityFeature.SEND_COMMAND
    )

    def __init__(self):
        self._attr_extra_state_attributes = {"command_count": 0}
        self._marao_initial_attrs = {"_attr_activity": VacuumActivity.DOCKED, "_attr_extra_state_attributes": {"command_count": 0}}

    async def async_start(self):
        self._attr_activity = VacuumActivity.CLEANING
        self.async_write_ha_state()

    async def async_pause(self):
        self._attr_activity = VacuumActivity.PAUSED
        self.async_write_ha_state()

    async def async_return_to_base(self):
        self._attr_activity = VacuumActivity.RETURNING
        self.async_write_ha_state()

    async def async_send_command(self, command, params=None, **kwargs):
        if command != "app_segment_clean" or not isinstance(params, list) or not params:
            raise ValueError("Unsupported synthetic vacuum command")
        self._attr_extra_state_attributes = {
            "command_count": self._attr_extra_state_attributes["command_count"] + 1,
            "last_command": command, "last_segments": params,
        }
        self._attr_activity = VacuumActivity.CLEANING
        self.async_write_ha_state()
