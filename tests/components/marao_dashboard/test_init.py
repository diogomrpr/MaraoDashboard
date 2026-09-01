"""Tests for the Marao Dashboard integration lifecycle."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, call, patch

from homeassistant.components.frontend import DATA_THEMES
from homeassistant.const import EVENT_THEMES_UPDATED
from homeassistant.core import is_callback

from custom_components.marao_dashboard import (
    CAMERA_URL,
    DASHBOARD_URL,
    DOMAIN,
    FRONTEND_DIR,
    THEME_NAME,
    async_setup_entry,
    async_unload_entry,
)


class _Bus:
    """Small event bus double with explicit listener delivery."""

    def __init__(self) -> None:
        self.async_fire = Mock()
        self.listeners = {}

    def async_listen(self, event_type, listener):
        """Register a listener and return its removal callback."""

        self.listeners[event_type] = listener

        def remove_listener():
            self.listeners.pop(event_type, None)

        return Mock(side_effect=remove_listener)

    def emit(self, event_type) -> None:
        """Deliver one event to the registered listener."""

        self.listeners[event_type](object())


def _hass(themes=None):
    async def run_job(target, *args):
        return target(*args)

    return SimpleNamespace(
        data={DATA_THEMES: themes if themes is not None else {}},
        http=SimpleNamespace(async_register_static_paths=AsyncMock()),
        async_add_executor_job=run_job,
        bus=_Bus(),
    )


async def test_setup_registers_dashboard_and_camera_assets() -> None:
    """Setup serves both assets and loads only the dashboard entry module."""

    hass = _hass()

    with patch("custom_components.marao_dashboard.add_extra_js_url") as add_url:
        assert await async_setup_entry(hass, object())
        assert await async_setup_entry(hass, object())

    hass.http.async_register_static_paths.assert_awaited_once()
    static_paths = hass.http.async_register_static_paths.await_args.args[0]
    assert [(item.url_path, item.path, item.cache_headers) for item in static_paths] == [
        (DASHBOARD_URL, str(FRONTEND_DIR / "MaraoDashboard.js"), True),
        (CAMERA_URL, str(FRONTEND_DIR / "MaraoCameraCard.js"), True),
    ]
    assert add_url.call_args_list == [
        call(hass, DASHBOARD_URL),
        call(hass, DASHBOARD_URL),
    ]
    assert hass.data[DOMAIN]["static_paths_registered"] is True

    theme = hass.data[DATA_THEMES][THEME_NAME]
    assert theme["primary-color"] == "#087C99"
    assert theme["accent-color"] == "#F36E63"
    assert theme["modes"]["dark"]["primary-background-color"] == "#091A20"
    hass.bus.async_fire.assert_called_once_with(EVENT_THEMES_UPDATED)


async def test_unload_removes_theme_and_module_then_reloads_safely() -> None:
    """Unload cleans runtime state while retaining the static routes for reload."""

    hass = _hass()

    with (
        patch("custom_components.marao_dashboard.add_extra_js_url") as add_url,
        patch("custom_components.marao_dashboard.remove_extra_js_url") as remove_url,
    ):
        assert await async_setup_entry(hass, object())
        assert await async_unload_entry(hass, object())
        assert THEME_NAME not in hass.data[DATA_THEMES]
        assert await async_setup_entry(hass, object())

    hass.http.async_register_static_paths.assert_awaited_once()
    assert add_url.call_args_list == [
        call(hass, DASHBOARD_URL),
        call(hass, DASHBOARD_URL),
    ]
    remove_url.assert_called_once_with(hass, DASHBOARD_URL)
    assert THEME_NAME in hass.data[DATA_THEMES]
    assert hass.bus.async_fire.call_count == 3


async def test_unload_restores_existing_same_name_theme() -> None:
    """An existing same-name theme is restored exactly on unload."""

    previous_theme = {"primary-color": "#123456"}
    hass = _hass({THEME_NAME: previous_theme})

    with (
        patch("custom_components.marao_dashboard.add_extra_js_url"),
        patch("custom_components.marao_dashboard.remove_extra_js_url"),
    ):
        assert await async_setup_entry(hass, object())
        assert hass.data[DATA_THEMES][THEME_NAME] is not previous_theme
        assert await async_unload_entry(hass, object())

    assert hass.data[DATA_THEMES][THEME_NAME] is previous_theme


async def test_theme_survives_reload_and_restores_reloaded_user_theme() -> None:
    """Theme reload keeps Marao available without losing a user theme."""

    original_theme = {"primary-color": "#111111"}
    reloaded_theme = {"primary-color": "#222222"}
    hass = _hass({THEME_NAME: original_theme})

    with (
        patch("custom_components.marao_dashboard.add_extra_js_url"),
        patch("custom_components.marao_dashboard.remove_extra_js_url"),
    ):
        assert await async_setup_entry(hass, object())
        marao_theme = hass.data[DATA_THEMES][THEME_NAME]
        assert is_callback(hass.bus.listeners[EVENT_THEMES_UPDATED])

        hass.data[DATA_THEMES] = {THEME_NAME: reloaded_theme}
        hass.bus.emit(EVENT_THEMES_UPDATED)

        assert hass.data[DATA_THEMES][THEME_NAME] is marao_theme
        assert hass.bus.async_fire.call_count == 2
        assert await async_unload_entry(hass, object())

    assert hass.data[DATA_THEMES][THEME_NAME] is reloaded_theme
    assert EVENT_THEMES_UPDATED not in hass.bus.listeners


async def test_unload_does_not_replace_a_theme_it_no_longer_owns() -> None:
    """Unloading leaves a same-name theme installed by another owner alone."""

    hass = _hass()
    replacement = {"primary-color": "#333333"}

    with (
        patch("custom_components.marao_dashboard.add_extra_js_url"),
        patch("custom_components.marao_dashboard.remove_extra_js_url"),
    ):
        assert await async_setup_entry(hass, object())
        hass.data[DATA_THEMES][THEME_NAME] = replacement
        assert await async_unload_entry(hass, object())

    assert hass.data[DATA_THEMES][THEME_NAME] is replacement
