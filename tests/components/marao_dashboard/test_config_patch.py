from __future__ import annotations

from pathlib import Path
import textwrap
import pytest

from custom_components.marao_dashboard.config_patch import (
    patch_frontend_themes,
    patch_lovelace_dashboard,
    remove_lovelace_dashboard,
    registered_dashboard_key,
    validate_dashboard_registration,
)


@pytest.mark.parametrize("entry", [
    "      mode: yaml\n      filename: manual.yaml\n",
    "      mode: storage\n      filename: owned.yaml\n",
    "      mode: yaml\n      filename: owned.yaml\n    chosen-route:\n      mode: yaml\n      filename: manual.yaml\n",
])
def test_registration_collision_rejects_before_backup_or_patch(tmp_path, entry):
    file = tmp_path / "configuration.yaml"
    file.write_bytes(("# preserved\nlovelace:\n  dashboards:\n    chosen-route:\n" + entry).replace("\n", "\r\n").encode())
    original = file.read_bytes()
    with pytest.raises(ValueError, match="unrelated configuration|Duplicate configuration keys"):
        patch_lovelace_dashboard(file, "chosen-route", "Marao", "mdi:home", "owned.yaml")
    assert file.read_bytes() == original
    assert list(tmp_path.iterdir()) == [file]


def test_registration_rename_removes_only_exact_owned_old_route(tmp_path):
    file = tmp_path / "configuration.yaml"
    file.write_text("lovelace:\n  dashboards:\n    old-route:\n      mode: yaml\n      filename: old.yaml\n    keep-route:\n      mode: yaml\n      filename: manual.yaml\n    new-route:\n      mode: yaml\n      filename: new.yaml\n")
    original = file.read_bytes()
    with pytest.raises(ValueError, match="unrelated configuration"):
        validate_dashboard_registration(file, "new-route", "new.yaml", "keep-route", "old.yaml")
    assert file.read_bytes() == original
    result = patch_lovelace_dashboard(file, "new-route", "Marao", "mdi:home", "new.yaml",
                                      previous_dashboard_key="old-route", previous_filename="old.yaml")
    assert result.changed
    assert registered_dashboard_key(file, "old.yaml") is None
    assert registered_dashboard_key(file, "new.yaml") == "new-route"
    assert "    keep-route:\n      mode: yaml\n      filename: manual.yaml\n" in file.read_text()


def test_existing_dashboard_route_uses_exact_filename_and_preserves_source(tmp_path):
    import pytest
    file = tmp_path / "configuration.yaml"
    filename = "dashboard/MaraoDashboard/dashboard/dashboard.yaml"
    source = "homeassistant:\n  packages: !include_dir_named packages\nlovelace:\n  dashboards:\n    chosen-route:\n      mode: yaml\n      filename: " + filename + "\n    unrelated:\n      mode: yaml\n      filename: manual.yaml\n"
    file.write_bytes(source.replace("\n", "\r\n").encode())
    before = file.read_bytes()
    assert registered_dashboard_key(file, filename) == "chosen-route"
    assert registered_dashboard_key(file, "other/dashboard.yaml") is None
    assert file.read_bytes() == before
    file.write_text(source + "    ambiguous:\n      mode: yaml\n      filename: " + filename + "\n")
    with pytest.raises(ValueError, match="Multiple dashboard routes"):
        registered_dashboard_key(file, filename)
    file.write_text("lovelace:\n  dashboards: !include dashboards.yaml\n")
    with pytest.raises(ValueError, match="inline dashboards mapping"):
        registered_dashboard_key(file, filename)


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
        previous_dashboard_key="marao-dashboard-old",
        previous_filename="dashboard/old.yaml",
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


def test_dashboard_patch_preserves_unrelated_crlf_bytes(tmp_path):
    config = tmp_path / "configuration.yaml"
    untouched = b"default_config:\r\n# unrelated comment\r\n"
    config.write_bytes(untouched)
    patch_lovelace_dashboard(config, "marao-dashboard", "Marao", "mdi:home", "dashboard/MaraoDashboard/dashboard/dashboard.yaml")
    assert config.read_bytes().startswith(untouched)
