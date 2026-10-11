"""Native OPEN capability backed only by a gallery helper."""

from homeassistant.components.cover import CoverDeviceClass, CoverEntity, CoverEntityFeature
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_state_change_event

HELPER = "input_boolean.marao_dashboard_test_open_only_door"


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([MaraoTestOpenOnlyDoor()])


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
