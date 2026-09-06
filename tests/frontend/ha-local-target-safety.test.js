import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { assertDisposableHaTarget } = require("../../scripts/ha-local-safety.js");

test("local Home Assistant tasks accept only the disposable instance", () => {
  assert.doesNotThrow(() => assertDisposableHaTarget({ url: "http://192.168.0.28:8123" }));
  assert.doesNotThrow(() => assertDisposableHaTarget({
    url: "https://192.168.0.28:8123/",
    sshHost: "192.168.0.28",
  }, { requireSsh: true }));

  for (const url of [
    "http://192.168.0.151:8123",
    "http://192.168.0.28.example.com:8123",
    "http://homeassistant.local:8123",
    "not a URL",
  ]) {
    assert.throws(() => assertDisposableHaTarget({ url }), /192\.168\.0\.28|valid Home Assistant URL/);
  }
});

test("local sync rejects an SSH host different from the disposable instance", () => {
  assert.throws(
    () => assertDisposableHaTarget({
      url: "http://192.168.0.28:8123",
      sshHost: "192.168.0.151",
    }, { requireSsh: true }),
    /SSH tasks may target only 192\.168\.0\.28/,
  );
});
