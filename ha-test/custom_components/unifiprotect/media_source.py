"""Exercise native UniFi browse/resolve contracts using safe local fixture media."""

from datetime import timedelta

from homeassistant.components.http.auth import async_sign_path
from homeassistant.components.media_source import MediaSourceError, MediaSource, PlayMedia, Unresolvable
from homeassistant.components.media_source.models import BrowseMediaSource

DOMAIN = "unifiprotect"


async def async_get_media_source(hass):
    return FixtureSource(hass)


class FixtureSource(MediaSource):
    name = "Marao disposable UniFi fixture"

    def __init__(self, hass):
        super().__init__(DOMAIN)
        self.hass = hass

    async def async_resolve_media(self, item):
        if item.identifier == "fixture:event:marao-test-error":
            raise Unresolvable("Simulated event media failure")
        if item.identifier not in {"fixture:event:marao-test-clip", "fixture:eventthumb:marao-test-clip", "fixture:eventthumb:marao-test-error"}:
            raise Unresolvable("Unknown disposable media")
        thumbnail = ":eventthumb:" in item.identifier
        path = (
            "/api/frigate/marao_test/thumbnail/marao-test-clip" if thumbnail
            else "/api/frigate/marao_test/notifications/marao-test-clip/clip.mp4"
        )
        return PlayMedia(
            async_sign_path(self.hass, path, timedelta(minutes=5)),
            "image/svg+xml" if thumbnail else "video/mp4",
        )

    async def async_browse_media(self, item):
        def node(identifier, title, *, play=False, children=None, thumbnail=None):
            return BrowseMediaSource(
                domain=DOMAIN, identifier=identifier, title=title,
                media_class="video" if play else "directory",
                media_content_type="video/mp4" if play else "application/vnd.apple.mpegurl",
                can_play=play, can_expand=not play, children=children, thumbnail=thumbnail,
            )

        event = node("fixture:event:marao-test-clip", "Person · synthetic event", play=True)
        identifier = item.identifier or ""
        if identifier == "fixture:browse:error:all:recent:1":
            raise MediaSourceError("Simulated recorder failure")
        children = {
            "": [node("fixture:browse", "Disposable recorder")],
            "fixture:browse": [node(
                "fixture:browse:front", "Marao Dashboard Test Camera",
                thumbnail="/api/camera_proxy/camera.marao_dashboard_test_camera",
            )],
            "fixture:browse:front": [node("fixture:browse:front:all", "All")],
            "fixture:browse:front:all:recent:1": [event],
            "fixture:browse:empty:all:recent:1": [],
            "fixture:browse:detail-error:all:recent:1": [node("fixture:event:marao-test-error", "Synthetic unavailable recording", play=True)],
        }.get(identifier)
        if children is None:
            raise MediaSourceError("Unknown disposable media folder")
        return node(identifier, self.name, children=children)
