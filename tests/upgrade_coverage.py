"""Check the reviewed upgrade inventory and reject incomplete execution evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def case_identities(key: str, value):
    if key == "families":
        return {family["id"]: family["states"] for family in value}
    if isinstance(value, list):
        return [item if isinstance(item, str) else item.get("id", item.get("name")) for item in value]
    return sorted(value)


def validate_inventory(manifest: dict, catalog: dict, cases: dict, profiles: list[str]) -> None:
    require(manifest.get("version") == 2, "Unsupported upgrade coverage inventory")
    require(set(manifest["catalog"]) == {card["id"] for card in catalog["cards"]}, "Unmapped card family")
    for card in catalog["cards"]:
        require(manifest["catalog"][card["id"]]["options"] == [option["key"] for option in card["variables"]], "Unmapped card option")
    require(set(manifest["guided_pages"]) == set(catalog["pages"]), "Unmapped guided page")
    require(manifest["guided_page_options"] == {name: [field["key"] for field in page["fields"]] for name, page in catalog["pages"].items()}, "Unmapped guided-page option")
    require(manifest["energy_options"] == [field["key"] for field in catalog["energy_fields"]], "Unmapped energy option")
    from custom_components.marao_dashboard.editor import page_templates
    require(set(manifest["page_templates"]) == set(page_templates({}, [])), "Unmapped editable page template")
    require(manifest["profiles"] == profiles and manifest["themes"] == ["light", "dark"], "Incomplete mobile/theme matrix")
    require(manifest.get("shared_format") == "generator-json-0", "Missing latest-release shared browser scope")
    require(manifest.get("review_profiles") == ["iphone-normal", "android-page-zoom-200"], "Incomplete representative visual review")
    require(set(manifest["cases"]) == set(cases), "Unmapped Cases collection")
    for key, value in cases.items():
        require(manifest["cases"][key]["identities"] == case_identities(key, value), "Unmapped material state or option: " + key)
    runtime = "\n".join((ROOT / "custom_components/marao_dashboard/frontend" / file).read_text() for file in ["MaraoCards.js", "MaraoDashboard.js", "MaraoFrigateEventsCard.js"])
    registrations = set(re.findall(r'(?:define\(|\[)"(marao-[a-z-]+)"', runtime))
    require(set(manifest["runtime_components"]) == registrations, "Unmapped runtime registration")
    checks = manifest["checks"]
    require(all(checks[name]["scope"] == "profile" for name in ["layout", "popups"]), "Layout must retain the full mobile matrix")
    require(checks["upgraded-pages"]["scope"] == "format", "Targeted upgraded pages must cover each format")
    for check in checks.values():
        file = Path(check["file"])
        require(not file.is_absolute() and ".." not in file.parts and file.parts[0] == "tests", "Invalid assertion source")
        require(check["scope"] in ["candidate", "format", "profile", "shared"], "Invalid assertion scope")
        require(all(profile in profiles for profile in check.get("profiles", [])), "Unknown interaction profile")
        require(check["assertion"] in (ROOT / file).read_text(), "Missing executable assertion: " + check["file"])
    for section in ["catalog", "cases"]:
        for item in manifest[section].values():
            require(bool(item["checks"]) and set(item["checks"]) <= set(checks), "Unmapped executable check")
    for section in ["guided_pages", "page_templates", "capabilities"]:
        for names in manifest[section].values():
            require(bool(names) and set(names) <= set(checks), "Unmapped capability check")


def required_runs(manifest: dict, formats: list[str]) -> set[tuple]:
    runs = set()
    for name, check in manifest["checks"].items():
        if check["scope"] == "candidate":
            runs.add((name, "candidate", None, None))
        else:
            selected_formats = formats if check["scope"] == "format" else [manifest["shared_format"]]
            profiles = manifest["profiles"] if check["scope"] == "profile" else check.get("profiles", ["iphone-normal"])
            runs.update((name, format_, profile, theme) for format_ in selected_formats for profile in profiles for theme in manifest["themes"])
    return runs


def validate_execution(manifest: dict, report: dict, candidate: dict, formats: list[str], baselines: list[str], target: str) -> None:
    origin = urlsplit(target)
    require(origin.scheme in ("http", "https") and origin.hostname == "192.168.0.28"
            and not origin.username and not origin.password and not origin.query and not origin.fragment
            and origin.path in ("", "/"), "Upgrade evidence requires the authorized disposable origin")
    require(report.get("version") == 2 and report.get("candidate") == candidate, "Missing or stale candidate-specific upgrade evidence")
    require(not report.get("failure"), "Failed upgrade operation")
    require(report.get("target") == target, "Upgrade evidence belongs to another target")
    require(report.get("formats") == formats and report.get("baselines") == baselines, "Missing required historical scenario")
    runs = report.get("runs", [])
    require(isinstance(runs, list) and all(isinstance(run, dict) and run.get("passed") is True for run in runs), "Unexecuted or failed upgrade assertion")
    identities = [(run.get("check"), run.get("format"), run.get("profile"), run.get("theme")) for run in runs]
    require(len(identities) == len(set(identities)), "Duplicate upgrade execution evidence")
    require(set(identities) == required_runs(manifest, formats), "Required scenario/profile is unexecuted")
    install = report.get("install_assertions", [])
    require(isinstance(install, list) and all(isinstance(row, dict) and row.get("passed") is True for row in install), "Failed preserved-install assertion")
    identities = [(row.get("baseline"), row.get("assertion")) for row in install]
    require(len(identities) == len(set(identities)), "Duplicate preserved-install evidence")
    expected = {(baseline, assertion) for baseline in baselines for assertion in manifest["required_install_assertions"] if assertion != "baseline-package-health"}
    expected.add(("v0.5.1", "baseline-package-health"))
    require(set(identities) == expected, "Required preservation/recovery/cleanup assertion is unexecuted")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(ROOT))
    from custom_components.marao_dashboard.editor import EDITOR_CATALOG

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--candidate", type=Path)
    args = parser.parse_args()
    manifest = json.loads((ROOT / "ha-test/upgrade/coverage.json").read_text())
    cases = json.loads((ROOT / "ha-test/cases.json").read_text())
    source = (ROOT / "tests/test-ha-dashboard-accessibility.js").read_text().split("const scenarios = [", 1)[1].split("];", 1)[0]
    profiles = re.findall(r'name: "([a-z0-9-]+)"', source)
    validate_inventory(manifest, EDITOR_CATALOG, cases, profiles)
    if args.report:
        require(args.candidate is not None, "Execution checks require the current candidate identity")
        provenance = json.loads((ROOT / "ha-test/upgrade/fixtures/provenance.json").read_text())
        baselines = ["v0.2.0", *[row["tag"] for row in provenance], "predecessor-format-1", "current-format-2"]
        config = json.loads((ROOT / "ha-test/local.json").read_text())
        require(config.get("disposable") is True and config.get("sshHost") == "192.168.0.28", "Upgrade evidence requires the authorized disposable configuration")
        validate_execution(manifest, json.loads(args.report.read_text()), json.loads(args.candidate.read_text()), ["native-storage-0", "generator-json-0", "generator-json-1", "generator-json-2"], baselines, config["url"].rstrip("/"))
    print("Upgrade coverage inventory checked; this does not establish a live upgrade pass.")
