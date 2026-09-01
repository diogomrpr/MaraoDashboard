from __future__ import annotations

from pathlib import Path
import textwrap

from custom_components.marao_dashboard.config_patch import (
    patch_frontend_themes,
    patch_lovelace_dashboard,
    remove_lovelace_dashboard,
)


def test_add_dashboard_preserves_includes(tmp_path: Path) -> None:
    source = textwrap.dedent(
        """
        default_config:

        frontend:
          themes: !include_dir_merge_named themes

        light: !include lights.yaml

        lovelace:
          mode: storage
          dashboards:
            lovelace-test:
              mode: yaml
              title: Test
              icon: mdi:script
              show_in_sidebar: true
              filename: "dashboard/julian/dashboard.yaml"
        """
    ).lstrip()

    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(source, encoding="utf-8")
    result = patch_lovelace_dashboard(
        config_path,
        "marao-dashboard-bd-mobile",
        "BD Mobile",
        "mdi:view-dashboard",
        "dashboard/MaraoDashboard/bd-mobile/dashboard.yaml",
    )

    updated = config_path.read_text(encoding="utf-8")
    assert result.changed
    assert Path(result.backup_path).exists()
    assert "themes: !include_dir_merge_named themes" in updated
    assert "light: !include lights.yaml" in updated
    assert "marao-dashboard-bd-mobile:" in updated
    assert 'filename: "dashboard/MaraoDashboard/bd-mobile/dashboard.yaml"' in updated


def test_update_existing_dashboard_is_idempotent(tmp_path: Path) -> None:
    source = textwrap.dedent(
        """
        lovelace:
          mode: storage
          dashboards:
            marao-dashboard-old:
              mode: yaml
              title: Old
              icon: mdi:script
              show_in_sidebar: true
              filename: "dashboard/old.yaml"
        """
    ).lstrip()

    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(source, encoding="utf-8")
    first = patch_lovelace_dashboard(
        config_path,
        "marao-dashboard-old",
        "New",
        "mdi:view-dashboard",
        "dashboard/MaraoDashboard/new/dashboard.yaml",
    )
    second = patch_lovelace_dashboard(
        config_path,
        "marao-dashboard-old",
        "New",
        "mdi:view-dashboard",
        "dashboard/MaraoDashboard/new/dashboard.yaml",
    )

    updated = config_path.read_text(encoding="utf-8")
    assert first.changed
    assert not second.changed
    assert updated.count("marao-dashboard-old:") == 1
    assert 'title: "New"' in updated


def test_remove_legacy_dashboard_is_safe_and_idempotent(tmp_path: Path) -> None:
    source = textwrap.dedent(
        """
        lovelace:
          mode: storage
          dashboards:
            marao-dashboard:
              mode: yaml
              filename: "dashboard/MaraoDashboard/dashboard/dashboard.yaml"
            marao-dashboard-card-test:
              mode: yaml
              title: Card Test
              filename: "www/community/MaraoDashboard/dashboard/MaraoDashboard/main.yaml"
        """
    ).lstrip()
    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(source, encoding="utf-8")

    first = remove_lovelace_dashboard(
        config_path,
        "marao-dashboard-card-test",
        "www/community/MaraoDashboard/dashboard/MaraoDashboard/main.yaml",
    )
    second = remove_lovelace_dashboard(
        config_path,
        "marao-dashboard-card-test",
        "www/community/MaraoDashboard/dashboard/MaraoDashboard/main.yaml",
    )

    updated = config_path.read_text(encoding="utf-8")
    assert first.changed
    assert not second.changed
    assert "marao-dashboard-card-test:" not in updated
    assert "marao-dashboard:" in updated


def test_remove_legacy_dashboard_preserves_repurposed_key(tmp_path: Path) -> None:
    source = textwrap.dedent(
        """
        lovelace:
          dashboards:
            marao-dashboard-card-test:
              mode: yaml
              filename: "dashboard/my-production-dashboard.yaml"
        """
    ).lstrip()
    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(source, encoding="utf-8")

    result = remove_lovelace_dashboard(
        config_path,
        "marao-dashboard-card-test",
        "www/community/MaraoDashboard/dashboard/MaraoDashboard/main.yaml",
    )

    assert not result.changed
    assert config_path.read_text(encoding="utf-8") == source


def test_patch_frontend_themes_adds_frontend_block(tmp_path: Path) -> None:
    config_path = tmp_path / "configuration.yaml"
    config_path.write_text("default_config:\n", encoding="utf-8")

    first = patch_frontend_themes(config_path)
    second = patch_frontend_themes(config_path)

    updated = config_path.read_text(encoding="utf-8")
    assert first.changed
    assert not second.changed
    assert "frontend:\n  themes: !include_dir_merge_named themes\n" in updated


def test_patch_frontend_themes_preserves_existing_theme_include(tmp_path: Path) -> None:
    source = textwrap.dedent(
        """
        frontend:
          themes: !include_dir_merge_named themes
          extra_module_url:
            - /hacsfiles/MaraoDashboard/MaraoDashboard.js
        """
    ).lstrip()

    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(source, encoding="utf-8")
    result = patch_frontend_themes(config_path)

    assert not result.changed
    assert config_path.read_text(encoding="utf-8") == source


def test_patch_frontend_themes_replaces_nonstandard_theme_include(tmp_path: Path) -> None:
    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(
        "frontend:\n  themes: !include_dir_merge_named www/community/MaraoDashboard/themes\n",
        encoding="utf-8",
    )

    result = patch_frontend_themes(config_path)

    assert result.changed
    assert "themes: !include_dir_merge_named themes" in config_path.read_text(encoding="utf-8")


def test_patch_frontend_themes_adds_extra_module_url_idempotently(tmp_path: Path) -> None:
    config_path = tmp_path / "configuration.yaml"
    config_path.write_text("frontend:\n  themes: !include_dir_merge_named themes\n", encoding="utf-8")

    first = patch_frontend_themes(
        config_path,
        extra_module_urls=["/hacsfiles/MaraoDashboard/MaraoDashboard.js"],
    )
    second = patch_frontend_themes(
        config_path,
        extra_module_urls=["/hacsfiles/MaraoDashboard/MaraoDashboard.js"],
    )

    updated = config_path.read_text(encoding="utf-8")
    assert first.changed
    assert not second.changed
    assert updated.count("/hacsfiles/MaraoDashboard/MaraoDashboard.js") == 1
    assert "extra_module_url:" in updated


def test_patch_frontend_themes_replaces_stale_frontend_version(tmp_path: Path) -> None:
    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(
        "frontend:\n  extra_module_url:\n    - /hacsfiles/MaraoDashboard/MaraoDashboard.js?v=old\n",
        encoding="utf-8",
    )

    patch_frontend_themes(
        config_path,
        extra_module_urls=["/hacsfiles/MaraoDashboard/MaraoDashboard.js?v=new"],
    )

    updated = config_path.read_text(encoding="utf-8")
    assert "?v=old" not in updated
    assert updated.count("/hacsfiles/MaraoDashboard/MaraoDashboard.js?v=new") == 1


def test_patch_frontend_themes_removes_only_legacy_marao_module(tmp_path: Path) -> None:
    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(
        textwrap.dedent(
            """
            frontend:
              extra_module_url:
                - /hacsfiles/lovelace-card-mod/card-mod.js
                - /hacsfiles/MaraoDashboard/MaraoDashboard.js?v=old
            """
        ).lstrip(),
        encoding="utf-8",
    )

    result = patch_frontend_themes(
        config_path,
        remove_extra_module_url_prefixes=[
            "/hacsfiles/MaraoDashboard/MaraoDashboard.js"
        ],
    )

    updated = config_path.read_text(encoding="utf-8")
    assert result.changed
    assert "/hacsfiles/lovelace-card-mod/card-mod.js" in updated
    assert "/MaraoDashboard/MaraoDashboard.js" not in updated
    assert "themes: !include_dir_merge_named themes" in updated


def test_patch_frontend_themes_removes_empty_legacy_module_list(tmp_path: Path) -> None:
    config_path = tmp_path / "configuration.yaml"
    config_path.write_text(
        "frontend:\n  extra_module_url:\n    - /hacsfiles/MaraoDashboard/MaraoDashboard.js\n",
        encoding="utf-8",
    )

    patch_frontend_themes(
        config_path,
        remove_extra_module_url_prefixes=[
            "/hacsfiles/MaraoDashboard/MaraoDashboard.js"
        ],
    )

    updated = config_path.read_text(encoding="utf-8")
    assert "extra_module_url:" not in updated
    assert "themes: !include_dir_merge_named themes" in updated
