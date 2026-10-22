"""Safe in-memory Apple TV media player for the disposable test dashboard."""

from __future__ import annotations

import base64

from homeassistant.components.media_player import (
    MediaPlayerDeviceClass,
    MediaPlayerEntity,
)
from homeassistant.components.media_player.const import (
    MediaPlayerEntityFeature,
    MediaPlayerState,
)

from homeassistant.util import slugify
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_state_change_event

SOURCES = ["YouTube", "Plex", "Netflix", "Disney+", "Prime Video", "Spotify", "MEO"]
ARTWORK = "data:image/svg+xml;base64," + base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#805a81"/><circle cx="360" cy="80" r="150" fill="#fff"/><circle cx="90" cy="230" r="170" fill="#e7c278"/></svg>').decode()


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the local visual-test media player."""
    async_add_entities(
        [MaraoTestAppleTV(config.get("name", "Marao Dashboard Test Apple TV"), config.get("initial_state", "idle"), config.get("picture_error", False))]
    )


class MaraoTestAppleTV(MediaPlayerEntity):
    """Exercise media controls without contacting a physical device."""

    _attr_should_poll = False
    _attr_device_class = MediaPlayerDeviceClass.TV
    _attr_state = MediaPlayerState.IDLE
    _attr_source = SOURCES[0]
    _attr_source_list = SOURCES
    _attr_app_name = SOURCES[0]
    _attr_media_duration = 3600
    _attr_media_position = 0
    _attr_volume_level = 0.4
    _attr_supported_features = (
        MediaPlayerEntityFeature.PLAY
        | MediaPlayerEntityFeature.PAUSE
        | MediaPlayerEntityFeature.PREVIOUS_TRACK
        | MediaPlayerEntityFeature.NEXT_TRACK
        | MediaPlayerEntityFeature.SEEK
        | MediaPlayerEntityFeature.SELECT_SOURCE
        | MediaPlayerEntityFeature.VOLUME_SET
        | MediaPlayerEntityFeature.TURN_ON
        | MediaPlayerEntityFeature.TURN_OFF
    )

    def __init__(self, name: str, initial_state: str = "idle", picture_error: bool = False) -> None:
        self._picture_error = picture_error
        self._attr_name = name
        self._attr_unique_id = slugify(name)
        self._attr_state = None if initial_state in {"unknown", "unavailable"} else MediaPlayerState(initial_state)
        self._attr_available = initial_state != "unavailable"
        self._attr_media_title = "Synthetic test programme"
        self._marao_initial_attrs = {"_attr_state": self._attr_state, "_attr_source": SOURCES[0], "_attr_app_name": SOURCES[0], "_attr_media_title": self._attr_media_title, "_attr_media_position": 0, "_attr_volume_level": 0.4}

    async def async_turn_on(self) -> None:
        """Turn the simulated player on."""
        self._attr_state = MediaPlayerState.IDLE
        self.async_write_ha_state()

    @property
    def entity_picture(self) -> str:
        """Expose static synthetic artwork without an external resource."""
        if self._picture_error and not self.hass.states.is_state("input_boolean.marao_dashboard_test_media_failure", "off"):
            return "data:image/svg+xml;base64,PHN2Zw=="
        return ARTWORK

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        if self._picture_error:
            self.async_on_remove(async_track_state_change_event(self.hass, ["input_boolean.marao_dashboard_test_media_failure"], self._fixture_media_changed))

    @callback
    def _fixture_media_changed(self, event):
        self.async_write_ha_state()

    async def async_turn_off(self) -> None:
        """Turn the simulated player off."""
        self._attr_state = MediaPlayerState.OFF
        self.async_write_ha_state()

    async def async_media_play(self) -> None:
        """Play simulated media."""
        self._attr_state = MediaPlayerState.PLAYING
        self.async_write_ha_state()

    async def async_media_pause(self) -> None:
        """Pause simulated media."""
        self._attr_state = MediaPlayerState.PAUSED
        self.async_write_ha_state()

    async def async_media_previous_track(self) -> None:
        """Move to a synthetic previous item without contacting a device."""
        self._attr_media_title = "Synthetic previous programme"
        self._attr_media_position = 0
        self.async_write_ha_state()

    async def async_media_next_track(self) -> None:
        """Move to a synthetic next item without contacting a device."""
        self._attr_media_title = "Synthetic next programme"
        self._attr_media_position = 0
        self.async_write_ha_state()

    async def async_media_seek(self, position: float) -> None:
        """Seek within the simulated item."""
        self._attr_media_position = round(
            max(0, min(position, self._attr_media_duration or position))
        )
        self.async_write_ha_state()

    async def async_select_source(self, source: str) -> None:
        """Select a simulated Apple TV app."""
        if source not in SOURCES:
            raise ValueError(f"Unsupported test source: {source}")
        self._attr_source = source
        self._attr_app_name = source
        self._attr_media_position = 0
        self._attr_state = MediaPlayerState.IDLE
        self.async_write_ha_state()

    async def async_set_volume_level(self, volume: float) -> None:
        """Set the simulated volume."""
        self._attr_volume_level = max(0, min(volume, 1))
        self.async_write_ha_state()
