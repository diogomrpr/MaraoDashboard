from copy import deepcopy
import json
from pathlib import Path
import re
import runpy

import pytest

from custom_components.marao_dashboard.editor import EDITOR_CATALOG

ROOT = Path(__file__).resolve().parents[3]
checker = runpy.run_path(str(ROOT / "tests/upgrade_coverage.py"))
MANIFEST = json.loads((ROOT / "ha-test/upgrade/coverage.json").read_text())
CASES = json.loads((ROOT / "ha-test/cases.json").read_text())
PROFILES = MANIFEST["profiles"]


def test_reviewed_inventory_covers_the_current_catalog_runtime_and_gallery():
    source = (ROOT / "tests/test-ha-dashboard-accessibility.js").read_text().split("const scenarios = [", 1)[1].split("];", 1)[0]
    profiles = re.findall(r'name: "([a-z0-9-]+)"', source)
    checker["validate_inventory"](MANIFEST, EDITOR_CATALOG, CASES, profiles)


@pytest.mark.parametrize("change, message", [
    (lambda m: m["catalog"].pop("hc_entity_group_card"), "card family"),
    (lambda m: m["catalog"]["hc_light_card"]["options"].pop(), "card option"),
    (lambda m: m["guided_pages"].pop("energy"), "guided page"),
    (lambda m: m["guided_page_options"]["energy"].pop(), "guided-page option"),
    (lambda m: m["energy_options"].pop(), "energy option"),
    (lambda m: m["page_templates"].pop("home"), "editable page template"),
    (lambda m: m["profiles"].pop(), "mobile/theme"),
    (lambda m: m["themes"].pop(), "mobile/theme"),
    (lambda m: m["checks"]["layout"].update(scope="shared"), "full mobile matrix"),
    (lambda m: m["checks"]["upgraded-pages"].update(scope="shared"), "each format"),
    (lambda m: m["runtime_components"].pop(), "runtime registration"),
    (lambda m: m["cases"]["entityGroupCases"]["identities"].pop(), "material state"),
    (lambda m: m["cases"]["families"]["identities"]["battery"].pop(), "material state"),
    (lambda m: m["cases"].pop("nativeSurfaceCase"), "Cases collection"),
    (lambda m: m["checks"]["groups"].update(assertion="removedAssertion"), "executable assertion"),
    (lambda m: m["cases"]["entityGroupCases"].update(checks=[]), "executable check"),
])
def test_missing_or_stale_mapping_fails(change, message):
    manifest = deepcopy(MANIFEST)
    change(manifest)
    with pytest.raises(ValueError, match=message):
        checker["validate_inventory"](manifest, EDITOR_CATALOG, CASES, PROFILES)


def execution():
    formats = ["native-storage-0", "generator-json-0", "generator-json-1", "generator-json-2"]
    baselines = ["v0.2.0", "v0.3.0", "v0.3.1", "v0.5.0", "v0.5.1", "predecessor-format-1", "current-format-2"]
    candidate = {"commit": "reviewed", "package_sha256": "a" * 64}
    runs = [dict(check=check, format=format_, profile=profile, theme=theme, passed=True) for check, format_, profile, theme in checker["required_runs"](MANIFEST, formats)]
    installed = [dict(baseline=baseline, assertion=assertion, passed=True) for baseline in baselines for assertion in MANIFEST["required_install_assertions"] if assertion != "baseline-package-health"]
    installed.append(dict(baseline="v0.5.1", assertion="baseline-package-health", passed=True))
    return candidate, formats, baselines, dict(version=2, candidate=candidate, target="http://192.168.10.229:8123", formats=formats, baselines=baselines, runs=runs, install_assertions=installed)


def test_complete_mock_execution_requires_every_historical_format_profile_and_cleanup():
    candidate, formats, baselines, report = execution()
    checker["validate_execution"](MANIFEST, report, candidate, formats, baselines, "http://192.168.10.229:8123")


def test_shared_browser_scope_keeps_the_matrix_and_each_targeted_format():
    _, formats, _, report = execution()
    rows = report["runs"]
    for check, count in [("layout", 26), ("popups", 26), ("numbers", 2), ("sliders", 4), ("builder-pages", 2)]:
        selected = [row for row in rows if row["check"] == check]
        assert len(selected) == count
        assert {row["format"] for row in selected} == {"generator-json-0"}
    assert {(row["format"], row["theme"]) for row in rows if row["check"] == "upgraded-pages"} == {
        (format_, theme) for format_ in formats for theme in ["light", "dark"]
    }


@pytest.mark.parametrize("change, message", [
    (lambda r: r.update(version=1), "stale candidate"),
    (lambda r: r.update(failure="Interrupted run"), "Failed upgrade"),
    (lambda r: r.update(candidate={"commit": "changed"}), "stale candidate"),
    (lambda r: r.update(target="http://192.168.0.29:8123"), "another target"),
    (lambda r: r.update(formats=r["formats"][:-1]), "historical scenario"),
    (lambda r: r.update(baselines=r["baselines"][:-1]), "historical scenario"),
    (lambda r: r["runs"].pop(), "unexecuted"),
    (lambda r: r["runs"][0].update(passed=False), "failed upgrade"),
    (lambda r: r["runs"].append(r["runs"][0]), "Duplicate upgrade"),
    (lambda r: r["install_assertions"].pop(), "unexecuted"),
    (lambda r: r["install_assertions"][0].update(passed=False), "preserved-install"),
    (lambda r: r["install_assertions"].append(r["install_assertions"][0]), "Duplicate preserved"),
])
def test_incomplete_or_stale_execution_fails(change, message):
    candidate, formats, baselines, report = execution()
    change(report)
    with pytest.raises(ValueError, match=message):
        checker["validate_execution"](MANIFEST, report, candidate, formats, baselines, "http://192.168.10.229:8123")


def test_execution_target_uses_the_configured_origin_without_allowing_another_instance():
    candidate, formats, baselines, report = execution()
    report["target"] = "https://192.168.10.229:8443"
    checker["validate_execution"](MANIFEST, report, candidate, formats, baselines, report["target"])
    with pytest.raises(ValueError, match="another target"):
        checker["validate_execution"](MANIFEST, report, candidate, formats, baselines, "http://192.168.10.229:8123")
    for target in ["https://192.168.0.29:8443", "https://192.168.10.229/dashboard", "https://user@192.168.10.229", "https://192.168.10.229?value=1"]:
        report["target"] = target
        with pytest.raises(ValueError, match="authorized disposable"):
            checker["validate_execution"](MANIFEST, report, candidate, formats, baselines, target)
