import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { assertPackageBoundary, build } = require("../../frontend_src/build-hacs-dist.cjs");
const { sourceFiles, fingerprint } = require("../../ha-test/client.js");

test("private deployment staging is an exact fresh package without reusing the workspace cache", () => {
  const privateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "marao-private-package-"));
  const source = fileURLToPath(new URL("../../custom_components/marao_dashboard/", import.meta.url));
  const cached = fileURLToPath(new URL("../../ha-test/.cache/dist/", import.meta.url));
  const cachedBefore = fs.existsSync(cached) ? fingerprint(cached) : null;
  try {
    const output = path.join(privateRoot, "package");
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, "stale.yaml"), "discarded local staging\n");
    build(output);
    const staged = path.join(output, "custom_components/marao_dashboard");
    assert.deepEqual(sourceFiles(staged), sourceFiles(source));
    for (const file of sourceFiles(source)) assert.ok(fs.readFileSync(path.join(source, file)).equals(fs.readFileSync(path.join(staged, file))), file);
    assert.ok(!fs.existsSync(path.join(output, "stale.yaml")));
    assert.equal(fs.existsSync(cached) ? fingerprint(cached) : null, cachedBefore);
  } finally { fs.rmSync(privateRoot, { recursive: true, force: true }); }
});

test("the shipped integration contains the canonical brand family and native exports", () => {
  const root = new URL("../../custom_components/marao_dashboard/", import.meta.url);
  assert.doesNotThrow(() => assertPackageBoundary(fileURLToPath(root), { allowLocalCache: true }));
  for (const name of ["logo.svg", "logo-dark.svg", "mark.svg", "mark-dark.svg", "mark-monochrome.svg"]) {
    assert.ok(fs.statSync(new URL("frontend/brand/" + name, root)).size);
  }
  for (const dark of ["", "dark_"]) for (const kind of ["icon", "logo"]) for (const scale of ["", "@2x"]) {
    assert.ok(fs.statSync(new URL(`brand/${dark}${kind}${scale}.png`, root)).size);
  }
});

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
