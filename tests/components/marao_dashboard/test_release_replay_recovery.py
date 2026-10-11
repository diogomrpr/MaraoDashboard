"""Release replay sources at real file-operation failure/interruption boundaries."""
from copy import deepcopy
import json
from pathlib import Path

import pytest

from custom_components.marao_dashboard import history
from custom_components.marao_dashboard.generator import write_dashboard

FIXTURES = Path(__file__).parents[3] / "ha-test/upgrade/fixtures"
PROVENANCE = json.loads((FIXTURES / "provenance.json").read_bytes())
EXPECTATIONS = json.loads((FIXTURES / "page-model-expectations.json").read_bytes())["records"]
ROWS = [(row["tag"].replace("-", "_").replace(".", "_"), FIXTURES / row["fixture"],
         FIXTURES / next(record["expected"] for record in EXPECTATIONS if record["input"] == row["fixture"])) for row in PROVENANCE]
ROWS.extend([
    ("v0_2_0", FIXTURES / "v0.2.0-storage-dashboard.json", FIXTURES / "v0.2.0-storage-format-2-expected.json"),
    ("predecessor_format_1", FIXTURES / "page-parity-format-1-input.json", FIXTURES / next(record["expected"] for record in EXPECTATIONS if record["input"] == "page-parity-format-1-input.json")),
    ("current_format_2", FIXTURES.parents[1] / "marao_dashboard_test_dashboard.json", FIXTURES.parents[1] / "marao_dashboard_test_dashboard.json"),
])


@pytest.mark.parametrize("label,input_file,expected_file", ROWS, ids=[row[0] for row in ROWS])
@pytest.mark.parametrize("boundary", ["output", "configuration", "source", "interruption"])
def test_release_replay_recovers_exact_baseline_and_rejects_future_sources(tmp_path, monkeypatch, label, input_file, expected_file, boundary):
    source, output, configuration = tmp_path / "dashboard.json", tmp_path / "owned", tmp_path / "configuration.yaml"
    before_source = input_file.read_bytes()
    before_input, before_expected = before_source, expected_file.read_bytes()
    # A current-format upgrade can still change generated output without a JSON migration.
    staged_config = json.loads(before_expected)
    staged_config["release_recovery_probe"] = True
    source.write_bytes(before_source)
    output.mkdir(); (output / "owned.yaml").write_bytes(b"Old generated output\r\n")
    (output / "manual.yaml").write_bytes(b"Keep exact custom bytes\r\n")
    configuration.write_bytes(b"# Unrelated registration\r\n")
    archive = tmp_path / ".history" / "preserved"
    archive.mkdir(parents=True); (archive / "source.json").write_bytes(before_source)
    original = history._write_bytes
    target = {"output": output / "owned.yaml", "configuration": configuration, "source": source, "interruption": source}[boundary]
    fired = False

    def fail(path, data):
        nonlocal fired
        if path == target and not fired:
            fired = True
            if boundary == "interruption":
                raise SystemExit("Release replay interruption")
            raise OSError("Release replay write failure")
        original(path, data)

    monkeypatch.setattr(history, "_write_bytes", fail)
    with pytest.raises(SystemExit if boundary == "interruption" else OSError):
        with history.dashboard_operation(tmp_path, source, [output], configuration) as stage:
            stage[source].write_bytes((json.dumps(staged_config) + "\n").encode())
            (stage[output] / "owned.yaml").write_bytes(b"New output\n")
            stage[configuration].write_bytes(b"# New owned registration\n")
    monkeypatch.setattr(history, "_write_bytes", original)
    history.recover_dashboard_operation(tmp_path)
    assert fired and source.read_bytes() == before_source
    assert (output / "owned.yaml").read_bytes() == b"Old generated output\r\n"
    assert (output / "manual.yaml").read_bytes() == b"Keep exact custom bytes\r\n"
    assert configuration.read_bytes() == b"# Unrelated registration\r\n"
    assert (archive / "source.json").read_bytes() == before_source
    invalid = deepcopy(json.loads(before_expected)); invalid["config_version"] = 999
    with pytest.raises(ValueError):
        write_dashboard(invalid, output)
    assert source.read_bytes() == before_source and (output / "owned.yaml").read_bytes() == b"Old generated output\r\n"
    assert input_file.read_bytes() == before_input and expected_file.read_bytes() == before_expected
