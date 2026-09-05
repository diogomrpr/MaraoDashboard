import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8");

test("navbar uses the iPhone safe area without extra bottom spacing", () => {
  assert.match(source, /iPhone\|iPod[\s\S]+\? "max\(4px, calc\(env\(safe-area-inset-bottom\) - 20px\)\)" : "12px"/);
});

test("navbar width scales compactly with its route count", () => {
  assert.match(source, /calc\(\$\{routeCount\} \* 54px \+ 20px\)/);
  assert.doesNotMatch(source, /\* 74px \+ 32px/);
});
