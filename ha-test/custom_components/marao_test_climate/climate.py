"""Interactive multi-mode climate entity used only by the local test dashboard."""

from __future__ import annotations

from homeassistant.components.climate import ClimateEntity
from homeassistant.components.climate.const import ClimateEntityFeature, HVACMode
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the local visual-test climate entity."""
    async_add_entities([MaraoTestClimate(config.get("name", "Marao Test Climate"))])


class MaraoTestClimate(ClimateEntity):
    """Small stateful climate entity with the common HVAC modes."""

    _attr_should_poll = False
    _attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE
    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_min_temp = 16
    _attr_max_temp = 30
    _attr_target_temperature_step = 0.5
    _attr_current_temperature = 20
    _attr_target_temperature = 21
    _attr_hvac_mode = HVACMode.HEAT
    _attr_hvac_modes = [
        HVACMode.HEAT,
        HVACMode.COOL,
        HVACMode.HEAT_COOL,
        HVACMode.AUTO,
        HVACMode.DRY,
        HVACMode.FAN_ONLY,
        HVACMode.OFF,
    ]

    def __init__(self, name: str) -> None:
        self._attr_name = name
        self._attr_unique_id = "marao_dashboard_test_multi_mode_climate"

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        self._attr_hvac_mode = hvac_mode
        self.async_write_ha_state()

    async def async_set_temperature(self, **kwargs) -> None:
        if (temperature := kwargs.get(ATTR_TEMPERATURE)) is not None:
            self._attr_target_temperature = temperature
            self.async_write_ha_state()
