import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { assertRemoteWritesAllowed } = require("../../scripts/sync-ha-local.js");

test("remote sync is fail-closed but dry runs need no write opt-in", () => {
  assert.doesNotThrow(() => assertRemoteWritesAllowed({}, true));
  assert.doesNotThrow(() => assertRemoteWritesAllowed({ allowRemoteWrites: false }, true));
  assert.doesNotThrow(() => assertRemoteWritesAllowed({ allowRemoteWrites: true }, false));

  assert.throws(
    () => assertRemoteWritesAllowed({}, false),
    /Set allowRemoteWrites to true/
  );
  assert.throws(
    () => assertRemoteWritesAllowed({ allowRemoteWrites: false }, false),
    /Set allowRemoteWrites to true/
  );
  assert.throws(
    () => assertRemoteWritesAllowed({ allowRemoteWrites: "true" }, true),
    /must be a boolean/
  );
});
