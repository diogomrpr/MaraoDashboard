"""Marao Dashboard integration."""

from pathlib import Path
from typing import Any

from homeassistant.components.frontend import (
    DATA_THEMES,
    add_extra_js_url,
    remove_extra_js_url,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_THEMES_UPDATED
from homeassistant.core import HomeAssistant, callback
from homeassistant.util.yaml import load_yaml_dict

DOMAIN = "marao_dashboard"
VERSION = "0.2.0"
THEME_NAME = "Marao Dashboard"

FRONTEND_DIR = Path(__file__).parent / "frontend"
STATIC_URL = f"/{DOMAIN}/{VERSION}"
DASHBOARD_URL = f"{STATIC_URL}/MaraoDashboard.js"
CAMERA_URL = f"{STATIC_URL}/MaraoCameraCard.js"
THEME_PATH = Path(__file__).parent / "theme.yaml"


@callback
def _install_theme(hass: HomeAssistant, data: dict[str, Any]) -> None:
    """Install the Marao theme while preserving any same-name user theme."""

    themes: dict[str, Any] = hass.data[DATA_THEMES]
    theme = data["theme"]
    if themes.get(THEME_NAME) is theme:
        return

    data["previous_theme_present"] = THEME_NAME in themes
    data["previous_theme"] = themes.get(THEME_NAME)
    themes[THEME_NAME] = theme


@callback
def _themes_updated(hass: HomeAssistant, data: dict[str, Any]) -> None:
    """Reinstall the integration theme after frontend.reload_themes."""

    themes: dict[str, Any] = hass.data[DATA_THEMES]
    if themes.get(THEME_NAME) is data["theme"]:
        return
    _install_theme(hass, data)
    # The first event described the freshly reloaded YAML themes. Emit a second
    # event so frontend clients also see the Marao theme added above.
    hass.bus.async_fire(EVENT_THEMES_UPDATED)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve and load Marao Dashboard."""

    data = hass.data.setdefault(DOMAIN, {})
    if not data.get("static_paths_registered"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    DASHBOARD_URL,
                    str(FRONTEND_DIR / "MaraoDashboard.js"),
                    cache_headers=True,
                ),
                StaticPathConfig(
                    CAMERA_URL,
                    str(FRONTEND_DIR / "MaraoCameraCard.js"),
                    cache_headers=True,
                ),
            ]
        )
        data["static_paths_registered"] = True

    if not data.get("theme_registered"):
        data["theme"] = await hass.async_add_executor_job(
            load_yaml_dict, THEME_PATH
        )
        _install_theme(hass, data)

        @callback
        def handle_themes_updated(_: Any) -> None:
            """Handle theme reloads on Home Assistant's event loop."""

            _themes_updated(hass, data)

        data["remove_theme_listener"] = hass.bus.async_listen(
            EVENT_THEMES_UPDATED,
            handle_themes_updated,
        )
        data["theme_registered"] = True
        hass.bus.async_fire(EVENT_THEMES_UPDATED)

    add_extra_js_url(hass, DASHBOARD_URL)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Marao Dashboard and restore the previous theme."""

    remove_extra_js_url(hass, DASHBOARD_URL)

    data = hass.data.get(DOMAIN, {})
    if data.pop("theme_registered", False):
        data.pop("remove_theme_listener")()
        themes: dict[str, Any] = hass.data[DATA_THEMES]
        theme = data.pop("theme")
        if themes.get(THEME_NAME) is theme:
            if data.pop("previous_theme_present", False):
                themes[THEME_NAME] = data.pop("previous_theme")
            else:
                themes.pop(THEME_NAME, None)
                data.pop("previous_theme", None)
            hass.bus.async_fire(EVENT_THEMES_UPDATED)
        else:
            data.pop("previous_theme_present", None)
            data.pop("previous_theme", None)

    return True
