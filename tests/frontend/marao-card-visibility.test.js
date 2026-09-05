import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

globalThis.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    };
  }
};

const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8");
const { MaraoCard } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#visibility`);

test("action cards honor icon-only visibility flags", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "remote.apple_tv",
    icon: "mdi:chevron-up",
    show_name: false,
    show_state: false,
    show_label: false,
  });
  card.hass = { states: { "remote.apple_tv": { state: "on", attributes: { friendly_name: "Apple TV" } } } };

  assert.match(card.shadowRoot.innerHTML, /class="body icon-only"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="title"|class="state"/);
  assert.match(card.shadowRoot.innerHTML, /icon="mdi:chevron-up"/);
});
