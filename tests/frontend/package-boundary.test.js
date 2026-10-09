import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { assertPackageBoundary } = require("../../frontend_src/build-hacs-dist.cjs");

test("HACS boundary rejects fixtures, dependencies, credentials, and caches", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marao-package-"));
  try {
    for (const [name, content] of [
      ["fixtures/camera.svg", "<svg/>"],
      ["node_modules/tool/index.js", "export default 1"],
      ["manifest.json", '{"requirements":["pytest-homeassistant-custom-component==0.13.331"]}'],
      ["frontend/camera.js", 'const provider = { provider: "test" };'],
      ["camera.json", '{"provider":"test"}'],
      ["frontend/camera.js", "const image = MARAO_TEST_EVENT_IMAGE;"],
      ["frontend/card.js", 'const entity = "sensor.marao_dashboard_test_temperature";'],
      ["local.json", '{"token":"secret"}'],
      ["secret.txt", "-----BEGIN PRIVATE KEY-----"],
      ["__pycache__/module.pyc", "compiled"],
    ]) {
      const file = path.join(root, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      assert.throws(() => assertPackageBoundary(root), /cannot ship through HACS/, name);
      fs.rmSync(root, { recursive: true, force: true });
      fs.mkdirSync(root);
    }
    fs.writeFileSync(path.join(root, "migration.py"), 'old_options.pop("test_gallery", None)');
    fs.writeFileSync(path.join(root, "MonacoEditor.LICENSE.txt"), "MIT License");
    assert.doesNotThrow(() => assertPackageBoundary(root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
