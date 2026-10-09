"""Interactive multi-mode climate entity used only by the local test dashboard."""

from __future__ import annotations

from homeassistant.components.climate import ClimateEntity
from homeassistant.components.climate.const import ClimateEntityFeature, HVACMode
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.util import slugify


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the local visual-test climate entity."""
    async_add_entities([MaraoTestClimate(config.get("name", "Marao Test Climate"), config.get("initial_state", "heat"), config.get("dual_target", False))])


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

    def __init__(self, name: str, initial_state: str = "heat", dual_target: bool = False) -> None:
        self._attr_name = name
        self._attr_unique_id = slugify(name)
        self._attr_hvac_mode = None if initial_state in {"unknown", "unavailable"} else HVACMode(initial_state)
        self._attr_available = initial_state != "unavailable"
        self._marao_initial_attrs = {"_attr_hvac_mode": self._attr_hvac_mode, "_attr_target_temperature": 21}
        if dual_target:
            self._attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
            self._attr_hvac_modes = [HVACMode.HEAT_COOL]
            self._attr_target_temperature = None
            self._attr_target_temperature_low = 18
            self._attr_target_temperature_high = 24
            self._marao_initial_attrs.update({"_attr_target_temperature": None, "_attr_target_temperature_low": 18, "_attr_target_temperature_high": 24})

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        self._attr_hvac_mode = hvac_mode
        self.async_write_ha_state()

    async def async_set_temperature(self, **kwargs) -> None:
        for key, attr in ((ATTR_TEMPERATURE, "_attr_target_temperature"), ("target_temp_low", "_attr_target_temperature_low"), ("target_temp_high", "_attr_target_temperature_high")):
            if (value := kwargs.get(key)) is not None:
                setattr(self, attr, value)
        self.async_write_ha_state()
