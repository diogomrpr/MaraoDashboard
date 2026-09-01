import test from "node:test";
import assert from "node:assert/strict";

import {
  dependenciesFromPayload,
  recheckDependencies,
  renderDependencyChecklist,
} from "../../frontend_src/dependency-checklist.js";

const dependencies = Array.from({ length: 7 }, (_, index) => ({
  id: `card-${index + 1}`,
  name: `Card ${index + 1}`,
  repository: `https://github.com/example/card-${index + 1}`,
  hacs_url: `https://my.home-assistant.io/redirect/hacs_repository/?repository=card-${index + 1}`,
  tested_version: `${index + 1}.0.0`,
  used_by: index === 0 ? ["hc_light_card", "hc_switch_card"] : [`hc_card_${index + 1}`],
  required: index === 0,
  status: index === 0 ? "installed" : "not_detected",
}));

test("dependency checklist renders all seven dependencies and every backend field", () => {
  const html = renderDependencyChecklist(dependencies);

  assert.equal((html.match(/role="listitem"/g) || []).length, 7);
  assert.match(html, /data-dependency-id="card-1"/);
  assert.match(html, />Card 1</);
  assert.match(html, /https:\/\/github\.com\/example\/card-1/);
  assert.match(html, /my\.home-assistant\.io\/redirect\/hacs_repository/);
  assert.match(html, /1\.0\.0/);
  assert.match(html, /hc_light_card, hc_switch_card/);
  assert.match(html, />Installed</);
  assert.match(html, />Not detected</);
  assert.match(html, />Required</);
  assert.match(html, />Optional</);
});

test("dependency checklist escapes content and rejects unsafe links", () => {
  const html = renderDependencyChecklist([{
    id: 'unsafe" id="injected',
    name: "<script>alert(1)</script>",
    repository: "javascript:alert(1)",
    hacs_url: "data:text/html,unsafe",
    tested_version: "1.0",
    used_by: ["card<&>"],
    required: false,
    status: "not_detected",
  }]);

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /javascript:|data:text/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /unsafe&quot; id=&quot;injected/);
});

test("dependency payload parsing and recheck use the stable websocket contract", async () => {
  const calls = [];
  const hass = {
    async callWS(command) {
      calls.push(command);
      return { dependencies };
    },
  };

  assert.deepEqual(dependenciesFromPayload({ dependencies }), dependencies);
  assert.deepEqual(dependenciesFromPayload({}), []);
  assert.deepEqual(await recheckDependencies(hass), dependencies);
  assert.deepEqual(calls, [{ type: "marao_dashboard/dependencies/recheck" }]);
});
