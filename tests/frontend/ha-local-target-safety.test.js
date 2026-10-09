import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { assertDisposableHaTarget, setBrowserToken } = require("../../ha-test/client.js");

test("browser authentication is confined to the configured top-level HA HTML document", () => {
  const previous = Object.fromEntries(["window", "location", "document", "localStorage"].map(key => [key, globalThis[key]]));
  const tokens = { hassUrl: "http://192.168.0.28:8123", access_token: "fixture-only" };
  const writes = [];
  try {
    const top = {}; top.top = top;
    globalThis.window = top;
    globalThis.localStorage = { setItem: (...args) => writes.push(args) };
    for (const [origin, contentType] of [["null", "text/html"], ["https://other.example", "text/html"], [tokens.hassUrl, "image/svg+xml"]]) {
      globalThis.location = { origin }; globalThis.document = { contentType };
      setBrowserToken(tokens);
    }
    globalThis.location = { origin: tokens.hassUrl }; globalThis.document = { contentType: "text/html" };
    globalThis.window = { top };
    setBrowserToken(tokens);
    assert.equal(writes.length, 0, "opaque, foreign, SVG, and iframe documents receive no token");
    globalThis.window = top;
    setBrowserToken(tokens);
    assert.deepEqual(writes, [["hassTokens", JSON.stringify(tokens)]]);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});

test("configured disposable targets are portable and must explicitly opt in", () => {
  for (const url of ["http://192.168.0.28:8123", "http://ha-test.local:8123", "https://test.example.org"]) {
    assert.doesNotThrow(() => assertDisposableHaTarget({ url, disposable: true, sshHost: new URL(url).hostname }, { requireSsh: true }));
  }
  for (const disposable of [undefined, false, "true"]) {
    assert.throws(() => assertDisposableHaTarget({ url: "http://ha-test.local", disposable }), /disposable/);
  }
  assert.doesNotThrow(() => assertDisposableHaTarget({ url: "http://ha-test.local", disposable: false }, { dryRun: true }));
});

test("target validation rejects credentials, redirects and a different SSH host", () => {
  for (const url of ["file:///config", "not a URL", "http://user:pass@ha-test.local", "http://ha-test.local/?token=secret", "http://ha-test.local/subpath"]) {
    assert.throws(() => assertDisposableHaTarget({ url, disposable: true }), /URL|origin/);
  }
  assert.throws(() => assertDisposableHaTarget({ url: "http://ha-test.local", disposable: true, sshHost: "other.local" }, { requireSsh: true }), /sshHost/);
});
