"""Constants for the Marao Dashboard dashboard integration."""

from __future__ import annotations

DOMAIN = "marao_dashboard"
BASE_DASHBOARD_CREATED = "base_dashboard_created"
GENERATE_DASHBOARD_SERVICE = "generate_dashboard"

DASHBOARD_BASE_DIR = "dashboard/MaraoDashboard"
DEFAULT_DASHBOARD_CONFIG = "dashboard/MaraoDashboard/dashboard.json"
DASHBOARD_KEY_PREFIX = "marao"
MARAO_DASHBOARD_TEMPLATE_INCLUDE = "/config/www/community/MaraoDashboard/dashboard/MaraoDashboard/templates/"
MANAGEMENT_PANEL_PATH = "marao-dashboard-editor"
MANAGEMENT_PANEL_TITLE = "Marao Dashboard Editor"
MANAGEMENT_PANEL_ICON = "mdi:view-dashboard-edit"

BASE_DASHBOARD_NAME = "Marao Dashboard"
BASE_DASHBOARD_SLUG = "dashboard"
BASE_DASHBOARD_ICON = "mdi:home"
BASE_DASHBOARD_THEME = "Marao Dashboard"
CARD_TEST_DASHBOARD_KEY = "marao-dashboard-card-test"
CARD_TEST_DASHBOARD_FILE = "www/community/MaraoDashboard/dashboard/MaraoDashboard/main.yaml"

MARAO_DASHBOARD_FRONTEND_VERSION = "20260902-1"
MARAO_DASHBOARD_STATIC_URL = "/marao_dashboard_static"
MARAO_DASHBOARD_FRONTEND_MODULE = (
    f"{MARAO_DASHBOARD_STATIC_URL}/MaraoDashboard.js?v={MARAO_DASHBOARD_FRONTEND_VERSION}"
)
MARAO_DASHBOARD_PANEL_MODULE = (
    f"{MARAO_DASHBOARD_STATIC_URL}/MaraoDashboardPanel.js?v={MARAO_DASHBOARD_FRONTEND_VERSION}"
)
MARAO_DASHBOARD_CAMERA_EVENTS_MODULE = (
    f"{MARAO_DASHBOARD_STATIC_URL}/MaraoFrigateEventsCard.js?v={MARAO_DASHBOARD_FRONTEND_VERSION}"
)
MARAO_DASHBOARD_MODULES = (
    MARAO_DASHBOARD_FRONTEND_MODULE,
    MARAO_DASHBOARD_CAMERA_EVENTS_MODULE,
)

LEGACY_FRONTEND_MODULE = "/hacsfiles/MaraoDashboard/MaraoDashboard.js"
LEGACY_VENDOR_RESOURCE_PREFIX = "/hacsfiles/MaraoDashboard/vendor/"
DEPENDENCY_DOCUMENTATION_URL = (
    "https://github.com/diogomrpr/MaraoDashboard/blob/main/"
    "docs/docs/installation/dependencies.md"
)
