"""Native Netatmo browse/resolve shapes with synthetic local playback."""
from datetime import timedelta
from homeassistant.components.camera import async_request_stream
from homeassistant.components.http.auth import async_sign_path
from homeassistant.components.media_source import MediaSource, PlayMedia, Unresolvable
from homeassistant.components.media_source.models import BrowseMediaSource
from . import CAMERA_ID

async def async_get_media_source(hass):
    return FixtureSource(hass)

class FixtureSource(MediaSource):
    name = "Marao disposable Netatmo fixture"
    def __init__(self, hass):
        super().__init__("netatmo")
        self.hass = hass

    def event(self, item):
        source, camera, key = (item.identifier or "").split("/")
        if source != "events" or camera != CAMERA_ID:
            raise Unresolvable("Unknown synthetic Netatmo camera")
        event = self.hass.data["netatmo"]["netatmo_events"][camera].get(int(key))
        if not event:
            raise Unresolvable("Unknown synthetic Netatmo event")
        return event

    async def async_browse_media(self, item):
        event = self.event(item)
        thumbnail = async_sign_path(self.hass, "/api/frigate/marao_test/thumbnail/marao-test-clip", timedelta(minutes=5))
        return BrowseMediaSource(domain="netatmo", identifier=item.identifier, title=event["message"],
                                 media_class="video", media_content_type="application/x-mpegURL",
                                 can_play=True, can_expand=False, thumbnail=thumbnail)

    async def async_resolve_media(self, item):
        self.event(item)
        url = await async_request_stream(self.hass, "camera.marao_dashboard_test_netatmo", "hls")
        return PlayMedia(url, "application/x-mpegURL")
