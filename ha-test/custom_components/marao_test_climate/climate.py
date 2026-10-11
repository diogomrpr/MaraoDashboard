"""Interactive multi-mode climate entity used only by the local test dashboard."""

from __future__ import annotations

import asyncio
from asyncio import sleep
import math

from homeassistant.components.climate import ClimateEntity
from homeassistant.components.climate.const import ClimateEntityFeature, HVACMode
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import slugify


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the local visual-test climate entity."""
    async_add_entities([MaraoTestClimate(
        config.get("name", "Marao Test Climate"), config.get("initial_state", "heat"), config.get("dual_target", False),
        ack_delay=config.get("ack_delay", 0), confirmation_delay=config.get("confirmation_delay", 0), behavior=config.get("behavior", "normal"),
    )])


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

    def __init__(self, name: str, initial_state: str = "heat", dual_target: bool = False, *, ack_delay: float = 0, confirmation_delay: float = 0, behavior: str = "normal") -> None:
        if behavior not in {"normal", "reject", "unconfirmed", "corrected"}:
            raise ValueError("Invalid climate fixture behavior")
        if any(isinstance(delay, bool) or not isinstance(delay, (int, float)) or not math.isfinite(delay) or not 0 <= delay <= 60 for delay in (ack_delay, confirmation_delay)):
            raise ValueError("Climate fixture delays must be finite seconds from 0 to 60")
        self._ack_delay = ack_delay
        self._confirmation_delay = confirmation_delay
        self._behavior = behavior
        self._confirmation_tasks: set[asyncio.Task] = set()
        self._attr_name = name
        self._attr_unique_id = slugify(name)
        self._attr_hvac_mode = None if initial_state in {"unknown", "unavailable"} else HVACMode(initial_state)
        self._attr_available = initial_state != "unavailable"
        self._marao_initial_attrs = {"_attr_hvac_mode": self._attr_hvac_mode, "_attr_target_temperature": 21}
        if dual_target:
            self._attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
            self._attr_hvac_modes = [HVACMode.HEAT_COOL]
            self._attr_target_temperature = None
            self._attr_target_temperature_low = 18.5
            self._attr_target_temperature_high = 24.5
            self._marao_initial_attrs.update({"_attr_target_temperature": None, "_attr_target_temperature_low": 18.5, "_attr_target_temperature_high": 24.5})

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        await self._request({"_attr_hvac_mode": hvac_mode})

    async def async_set_temperature(self, **kwargs) -> None:
        await self._request({attr: kwargs[key] for key, attr in ((ATTR_TEMPERATURE, "_attr_target_temperature"), ("target_temp_low", "_attr_target_temperature_low"), ("target_temp_high", "_attr_target_temperature_high")) if kwargs.get(key) is not None})

    async def _request(self, values: dict) -> None:
        if not values:
            return
        if self._behavior not in {"reject", "unconfirmed"}:
            if self._confirmation_delay:
                task = self.hass.async_create_task(self._confirm_later(values))
                self._confirmation_tasks.add(task)
                task.add_done_callback(self._confirmation_tasks.discard)
            else:
                self._confirm(values)
        if self._ack_delay:
            await sleep(self._ack_delay)
        if self._behavior == "reject":
            raise HomeAssistantError("Climate fixture rejected the change")

    async def _confirm_later(self, values: dict) -> None:
        await sleep(self._confirmation_delay)
        self._confirm(values)

    def _confirm(self, values: dict) -> None:
        if self._behavior == "corrected":
            values = dict(values)
            if "_attr_hvac_mode" in values:
                values["_attr_hvac_mode"] = HVACMode.HEAT if values["_attr_hvac_mode"] == HVACMode.OFF else HVACMode.OFF
            else:
                delta = 0.5 if max(values.values()) + 0.5 <= self._attr_max_temp else -0.5
                values = {key: value + delta for key, value in values.items()}
        for attr, value in values.items():
            setattr(self, attr, value)
        self.async_write_ha_state()

    async def async_will_remove_from_hass(self) -> None:
        await self._cancel_confirmations()

    async def async_marao_reset(self) -> None:
        await self._cancel_confirmations()
        for key, value in self._marao_initial_attrs.items():
            setattr(self, key, value)
        self.async_write_ha_state()

    async def _cancel_confirmations(self) -> None:
        for task in self._confirmation_tasks:
            task.cancel()
        await asyncio.gather(*self._confirmation_tasks, return_exceptions=True)
        self._confirmation_tasks.clear()
