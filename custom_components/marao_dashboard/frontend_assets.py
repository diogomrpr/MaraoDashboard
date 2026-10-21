"""Network-only startup and content-verified frontend assets."""

from hashlib import sha256
import json
import mimetypes
from pathlib import Path

from aiohttp import web

from homeassistant.components.http import KEY_HASS, HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN, MARAO_DASHBOARD_BOOTSTRAP, MARAO_DASHBOARD_STATIC_URL

ASSET_URL = "/api/marao_dashboard/frontend"
ASSET_STATE = "frontend_assets"
NO_STORE = {"Cache-Control": "no-store"}


def frontend_files(directory: Path) -> list[Path]:
    """Keep the fingerprint and public file allowlist identical."""
    return sorted(
        (path for path in directory.rglob("*") if path.is_file() and not path.is_symlink()
         and not any(part.startswith(".") or part == "__pycache__" for part in path.relative_to(directory).parts)
         and path.suffix not in (".pyc", ".pyo")),
        key=lambda path: path.relative_to(directory).as_posix(),
    )


def asset_snapshot(directory: Path) -> dict:
    digest = sha256()
    hashes = {}
    for path in frontend_files(directory):
        name = path.relative_to(directory).as_posix()
        content = path.read_bytes()
        digest.update(name.encode("utf-8") + b"\0" + content + b"\0")
        hashes[name] = sha256(content).digest()
    return {"fingerprint": digest.hexdigest()[:16], "directory": directory, "hashes": hashes}


def frontend_fingerprint(directory: Path) -> str:
    return asset_snapshot(directory)["fingerprint"]


def frontend_asset_url(fingerprint: str, filename: str) -> str:
    return f"{ASSET_URL}/{fingerprint}/{filename}?v={fingerprint}"


class FrontendBootstrapView(HomeAssistantView):
    url = MARAO_DASHBOARD_BOOTSTRAP
    extra_urls = [f"{MARAO_DASHBOARD_STATIC_URL}/MaraoDashboard.js"]
    name = "api:marao_dashboard:frontend_bootstrap"
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
        state = request.app[KEY_HASS].data[DOMAIN].get(ASSET_STATE)
        if not state:
            return web.Response(status=503, headers=NO_STORE)
        url = frontend_asset_url(state["fingerprint"], "MaraoDashboard.js")
        # /api/ bypasses HA's stale-while-revalidate custom-file cache.
        return web.Response(text=f"await import({json.dumps(url)});\n",
                            content_type="text/javascript", headers=NO_STORE)


class FrontendAssetView(HomeAssistantView):
    url = ASSET_URL + "/{fingerprint}/{filename:.*}"
    name = "api:marao_dashboard:frontend_asset"
    requires_auth = False

    async def get(self, request: web.Request, fingerprint: str, filename: str) -> web.Response:
        hass: HomeAssistant = request.app[KEY_HASS]
        state = hass.data[DOMAIN].get(ASSET_STATE)
        if not state or fingerprint != state["fingerprint"]:
            return web.Response(status=409, text="Marao frontend version changed", headers=NO_STORE)
        expected = state["hashes"].get(filename)
        if expected is None:
            return web.Response(status=404, headers=NO_STORE)

        def read_asset():
            path = (state["directory"] / filename).resolve()
            if not path.is_relative_to(state["directory"].resolve()):
                return None
            try:
                content = path.read_bytes()
            except OSError:
                return None
            return content if sha256(content).digest() == expected else None

        content = await hass.async_add_executor_job(read_asset)
        if content is None:
            return web.Response(status=503, text="Marao frontend deployment changed; restart Home Assistant",
                                headers=NO_STORE)
        return web.Response(body=content, content_type=mimetypes.guess_type(filename)[0] or "application/octet-stream",
                            headers={"Cache-Control": "public, max-age=2678400, immutable"})
