"""Native OPEN capability backed only by a gallery helper."""

import voluptuous as vol
from homeassistant.components.cover import PLATFORM_SCHEMA as COVER_PLATFORM_SCHEMA, CoverDeviceClass, CoverEntity, CoverEntityFeature
from homeassistant.helpers import config_validation as cv
from homeassistant.util import slugify
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_state_change_event

PLATFORM_SCHEMA = COVER_PLATFORM_SCHEMA.extend({
    vol.Optional("name", default="Marao Dashboard Test Open Only Door"): cv.string,
    vol.Optional("device_class", default="door"): vol.In(("door", "damper")),
    vol.Optional("initial_state", default="closed"): vol.In(("closed", "open", "opening", "closing", "unknown", "unavailable")),
})

HELPER = "input_boolean.marao_dashboard_test_open_only_door"


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([MaraoTestOpenOnlyExhaust(config) if config.get("device_class") == "damper" else MaraoTestOpenOnlyDoor()])


class MaraoTestOpenOnlyDoor(CoverEntity):
    _attr_name = "Marao Dashboard Test Open Only Door"
    _attr_unique_id = "marao_dashboard_test_open_only_door"
    _attr_device_class = CoverDeviceClass.DOOR
    _attr_supported_features = CoverEntityFeature.OPEN
    _attr_should_poll = False

    @property
    def is_closed(self):
        return self.hass.states.is_state(HELPER, "off")

    @property
    def current_cover_position(self):
        return 0 if self.is_closed else 100

    async def async_added_to_hass(self):
        @callback
        def changed(event):
            self.async_write_ha_state()

        self.async_on_remove(async_track_state_change_event(self.hass, [HELPER], changed))

    async def async_open_cover(self, **kwargs):
        await self.hass.services.async_call("input_boolean", "turn_on", {"entity_id": HELPER}, blocking=True)


class MaraoTestOpenOnlyExhaust(CoverEntity):
    """In-memory OPEN-only ventilation fixture; no household service target."""
    _attr_device_class = CoverDeviceClass.DAMPER
    _attr_supported_features = CoverEntityFeature.OPEN
    _attr_should_poll = False

    def __init__(self, config):
        self._attr_name = config["name"]
        self._attr_unique_id = slugify(config["name"])
        self._state = config.get("initial_state", "closed")
        self._attr_available = self._state != "unavailable"

    @property
    def is_closed(self):
        return None if self._state == "unknown" else self._state == "closed"

    @property
    def is_opening(self):
        return self._state == "opening"

    @property
    def is_closing(self):
        return self._state == "closing"

    async def async_open_cover(self, **kwargs):
        self._state = "open"
        self.async_write_ha_state()
