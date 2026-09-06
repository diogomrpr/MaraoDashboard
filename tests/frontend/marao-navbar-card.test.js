import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8");

test("navbar uses the iPhone safe area without extra bottom spacing", () => {
  assert.match(source, /iPhone\|iPod[\s\S]+\? "max\(4px, calc\(var\(--marao-safe-area-inset-bottom, env\(safe-area-inset-bottom\)\) - 20px\)\)" : "12px"/);
  assert.match(source, /var\(--marao-safe-area-inset-top, env\(safe-area-inset-top\)\) 0 0/);
  assert.match(source, /calc\(92px \+ var\(--marao-safe-area-inset-bottom, env\(safe-area-inset-bottom\)\)\)/);
});

test("navbar width scales compactly with its route count", () => {
  assert.match(source, /calc\(\$\{routeCount\} \* 54px \+ 20px\)/);
  assert.doesNotMatch(source, /\* 74px \+ 32px/);
});

test("navbar keeps 48px touch targets inside the compact 60px bar", () => {
  assert.match(source, /:host\{display:block;height:128px;/);
  assert.match(source, /height:60px;box-sizing:border-box;padding:6px 10px/);
  assert.match(source, /min-width:48px;width:48px;height:48px;aspect-ratio:1 \/ 1/);
  assert.match(source, /a:active\{transform:scale\(\.92\)/);
});

test("fullscreen behavior starts only after the navbar is connected", () => {
  assert.match(source, /connectedCallback\(\) \{ registerFullscreen\(this\);/);
  assert.doesNotMatch(source, /this\._render\(\); registerFullscreen\(this\);/);
});
