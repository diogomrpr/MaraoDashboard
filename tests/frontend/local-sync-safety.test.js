import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { changePlan, composeDashboard, patchPackages, referencedEntities, targetKey } = require("../../ha-test/prepare.js");
const { assertCurrentFrontend, fingerprint, readConfig } = require("../../ha-test/client.js");

test('current frontend waits for late card imports and rejects stale fingerprints within a bound', async () => {
  let disposed = false;
  await assertCurrentFrontend({ async waitForFunction(predicate, expected, options) {
    assert.deepEqual(options, { timeout: 15000, polling: 50 });
    const entries = [{ name: 'http://test/MaraoDashboard.js?v=current' }];
    const check = vm.runInNewContext('(' + predicate.toString() + ')', { URL, performance: { getEntriesByType: () => entries } });
    assert.equal(check(expected), false, 'the early navbar does not establish card readiness');
    entries.push({ name: 'http://test/MaraoCards.js?v=old' }, { name: 'http://test/MaraoFrigateEventsCard.js?v=current' });
    assert.equal(check(expected), false, 'a stale card module must not pass');
    entries.push({ name: 'http://test/MaraoCards.js?v=current' });
    assert.equal(check(expected), true);
    return { async dispose() { disposed = true; } };
  } }, 'current');
  assert.equal(disposed, true);
  const deadline = new Error('asset readiness deadline');
  await assert.rejects(assertCurrentFrontend({ async waitForFunction() { throw deadline; } }, 'current'), deadline);
});

test('native readiness requires the current native graph without retired editor or optional camera imports', async () => {
  const expected='a'.repeat(64),entries=[],window={MaraoFrontendPackage:{identity:expected}};
  await assertCurrentFrontend({async waitForFunction(predicate,identity){
    const check=vm.runInNewContext('('+predicate.toString()+')',{URL,window,performance:{getEntriesByType:()=>entries}});
    for(const file of ['MaraoNativeDashboard.js','MaraoNativeBootstrap.js','MaraoDashboard.js'])entries.push({name:'http://test/'+expected+'--'+file});
    assert.equal(check(identity),false,'a strategy alone does not register ordinary cards');
    entries.push({name:'http://test/'+expected+'--MaraoNativeCards.js'});assert.equal(check(identity),true);
    window.MaraoFrontendPackage.identity='b'.repeat(64);assert.equal(check(identity),false,'the active package must match');
    return {async dispose(){}};
  }},expected);
});

test('canonical Cases composition retains ordinary pages, is idempotent and adds no legacy storage', () => {
  const config = { config_version: 2, name: 'Safe', landing_page: 'home', pages: [{ name: 'Home', path: 'home', entities: [] }] };
  const view = { cards: [{ type: 'markdown', content: 'Safe gallery' }, '/config/dashboard/MaraoDashboard/dashboard/components/navigation/navbar.yaml'] };
  const source = structuredClone(config);
  const composed = composeDashboard(config, view);
  assert.deepEqual(composeDashboard(composed, view), composed);
  assert.deepEqual(composed.pages[0], config.pages[0]);
  assert.deepEqual(composed.pages.find(page => page.path === 'card-test-all').sections, [{cards: [view.cards[0]]}]);
  assert.equal(composed.pages[1].path, 'card-test');
  assert.ok(!Object.hasOwn(composed, 'rooms') && !Object.hasOwn(composed, 'overview'));
  assert.deepEqual(config, source);
});

test("frontend changes reload; backend, fixture, target and missing deployment changes restart", () => {
  const previous = { target: "instance-a", frontend: "1", backend: "1", fixtures: "1", dashboard: "1" };
  assert.equal(changePlan(previous, previous, new Map(), []).restart, false);
  assert.deepEqual(changePlan(previous, { ...previous, frontend: "2" }, new Map(), []), {
    frontend: true, backend: false, fixtures: false, dashboard: false, reload: true, restart: false,
  });
  assert.equal(changePlan(previous, { ...previous, dashboard: "2" }, new Map(), []).restart, false);
  for (const group of ["backend", "fixtures", "target"]) {
    assert.equal(changePlan(previous, { ...previous, [group]: "2" }, new Map(), []).restart, true);
  }
  const files = [{ remote: "/config/custom_components/marao_dashboard/a.py", group: "backend", hash: "abc" }];
  assert.equal(changePlan(previous, previous, new Map(), files).restart, true);
  assert.equal(changePlan(previous, previous, new Map([[files[0].remote, "abc"]]), files).restart, false);
  assert.notEqual(targetKey({ url: "http://a", remoteConfigPath: "/config" }), targetKey({ url: "http://b", remoteConfigPath: "/config" }));
});

test("Cases is an ordinary custom page with raw cards and exactly one generator-owned navbar", () => {
  const popup = { type: "custom:marao-popup-card", hash: "#test", cards: [] };
  const config = { name: "Marao", test_gallery: true, pages: { custom: [{ name: "Other", path: "other" }, { name: "Cases", path: "card-test" }] } };
  const view = { cards: [popup, "/config/dashboard/MaraoDashboard/dashboard/components/navigation/navbar.yaml"] };
  const composed = composeDashboard(config, view);
  assert.equal("test_gallery" in composed, false);
  assert.equal(composed.pages.custom.length, 2);
  assert.deepEqual(composed.pages.custom[1].cards, [popup]);
  assert.equal("columns" in composed.pages.custom[1], false);
  assert.deepEqual(composeDashboard(composed, view), composed);
  assert.equal(config.test_gallery, true);
});

test("package setup preserves unrelated YAML and is idempotent", () => {
  const original = "# Keep this comment\ndefault_config:\nhttp:\n  use_x_forwarded_for: true\n";
  const first = patchPackages(original);
  assert.match(first.source, /# Keep this comment/);
  assert.match(first.source, /use_x_forwarded_for: true/);
  assert.match(first.source, /packages: !include_dir_named packages/);
  assert.equal(patchPackages(first.source).changed, false);
  assert.equal(patchPackages("homeassistant:\n  packages: !include_dir_named fixture_packages\n").helperPath, "fixture_packages/marao_dashboard_card_test_helpers.yaml");
  assert.throws(() => patchPackages("homeassistant:\n  packages: !include secrets.yaml\n"), /packages mapping/);
});

test("fixture reference validation excludes service names and retains actual entity targets", () => {
  const entities = referencedEntities({ entity: "light.marao_dashboard_test_light", tap_action: { action: "call-service", service: "light.turn_off", target: { entity_id: ["light.marao_dashboard_test_room_light"] } }, variables: { action_service: "lock.unlock", tap_action: { perform_action: "remote.send_command" } } });
  assert.deepEqual([...entities].sort(), ["light.marao_dashboard_test_light", "light.marao_dashboard_test_room_light"]);
});

test("invalid private configuration never exposes a token in its error", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marao-config-"));
  try {
    const filename = path.join(root, "local.json");
    fs.writeFileSync(filename, '{"token":"DO_NOT_PRINT_THIS_SECRET" broken}');
    assert.throws(() => readConfig(filename), (error) => error.message === "ha-test/local.json contains invalid JSON.");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("frontend fingerprint changes with paths or content and ignores local caches", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marao-hash-"));
  try {
    fs.writeFileSync(path.join(root, "a.js"), "one");
    const first = fingerprint(root);
    fs.mkdirSync(path.join(root, ".cache"));
    fs.writeFileSync(path.join(root, ".cache", "local"), "ignored");
    assert.equal(fingerprint(root), first);
    fs.writeFileSync(path.join(root, "a.js"), "two");
    assert.notEqual(fingerprint(root), first);
    const second = fingerprint(root);
    fs.renameSync(path.join(root, "a.js"), path.join(root, "b.js"));
    assert.notEqual(fingerprint(root), second);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
