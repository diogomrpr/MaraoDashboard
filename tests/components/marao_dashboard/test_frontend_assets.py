"""Cache and public-file boundaries for integration frontend upgrades."""
from homeassistant.setup import async_setup_component

from custom_components.marao_dashboard.const import DOMAIN, MARAO_DASHBOARD_BOOTSTRAP
from custom_components.marao_dashboard.frontend_assets import (
    ASSET_STATE, FrontendAssetView, FrontendBootstrapView, asset_snapshot,
    frontend_asset_url,
)


async def asset_client(hass, hass_client_no_auth, directory):
    assert await async_setup_component(hass, "http", {})
    hass.data[DOMAIN] = {ASSET_STATE: asset_snapshot(directory)}
    hass.http.register_view(FrontendBootstrapView())
    hass.http.register_view(FrontendAssetView())
    return await hass_client_no_auth()


async def test_stale_bootstrap_selects_installed_graph_without_auth(hass, hass_client_no_auth, tmp_path):
    (tmp_path / "MaraoDashboard.js").write_text("export const version = 1;")
    client = await asset_client(hass, hass_client_no_auth, tmp_path)
    first = hass.data[DOMAIN][ASSET_STATE]["fingerprint"]
    (tmp_path / "MaraoDashboard.js").write_text("export const version = 2;")
    hass.data[DOMAIN][ASSET_STATE] = asset_snapshot(tmp_path)
    current = hass.data[DOMAIN][ASSET_STATE]["fingerprint"]
    assert first != current
    for path in (MARAO_DASHBOARD_BOOTSTRAP, "/marao_dashboard_static/MaraoDashboard.js"):
        response = await client.get(f"{path}?v={first}")
        assert response.status == 200
        assert response.headers["Cache-Control"] == "no-store"
        assert await response.text() == f'await import("{frontend_asset_url(current, "MaraoDashboard.js")}");\n'
    response = await client.get(frontend_asset_url(current, "MaraoDashboard.js"))
    assert response.status == 200
    assert "javascript" in response.content_type
    assert "immutable" in response.headers["Cache-Control"]
    assert await response.text() == "export const version = 2;"
    response = await client.get(frontend_asset_url(first, "MaraoDashboard.js"))
    assert response.status == 409
    assert response.headers["Cache-Control"] == "no-store"


async def test_asset_allowlist_and_partial_deployment(hass, hass_client_no_auth, tmp_path):
    (tmp_path / "MaraoDashboard.js").write_text("export const version = 1;")
    (tmp_path / ".secret").write_text("private")
    (tmp_path / "__pycache__").mkdir()
    (tmp_path / "__pycache__/private").write_text("private")
    outside = tmp_path.parent / "marao-private.txt"
    outside.write_text("private")
    (tmp_path / "outside.js").symlink_to(outside)
    client = await asset_client(hass, hass_client_no_auth, tmp_path)
    version = hass.data[DOMAIN][ASSET_STATE]["fingerprint"]
    for name in (".secret", "__pycache__/private", "missing.js", "outside.js", "../marao-private.txt"):
        response = await client.get(frontend_asset_url(version, name))
        assert response.status == 404
        assert "private" not in await response.text()
    (tmp_path / "MaraoDashboard.js").write_text("export const version = 2;")
    response = await client.get(frontend_asset_url(version, "MaraoDashboard.js"))
    assert response.status == 503
    assert response.headers["Cache-Control"] == "no-store"
    assert "version = 2" not in await response.text()


async def test_text_asset_compression_negotiates_without_changing_contents(hass, hass_client_no_auth, tmp_path):
    source = "export const labels = " + repr("Marao " * 5000) + ";"
    (tmp_path / "MaraoDashboard.js").write_text(source)
    client = await asset_client(hass, hass_client_no_auth, tmp_path)
    version = hass.data[DOMAIN][ASSET_STATE]["fingerprint"]
    url = frontend_asset_url(version, "MaraoDashboard.js")
    for encoding in ("gzip", "deflate", "identity"):
        response = await client.get(url, headers={"Accept-Encoding": encoding})
        assert response.status == 200
        assert await response.text() == source
        assert response.headers["Vary"] == "Accept-Encoding"
        assert "immutable" in response.headers["Cache-Control"]
        if encoding == "identity":
            assert "Content-Encoding" not in response.headers
        else:
            assert response.headers["Content-Encoding"] == encoding
            assert int(response.headers["Content-Length"]) < len(source) // 5
