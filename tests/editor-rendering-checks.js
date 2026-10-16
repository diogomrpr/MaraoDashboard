const assert = require('node:assert/strict');
const path = require('node:path');

async function activateHeader(expansion, touch) {
  if (!touch) { await expansion.locator('[role="button"]').first().press('Enter'); return; }
  // Center the whole native summary so focus does not scroll it between pointer down/up.
  await expansion.locator('.room-header').evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expansion.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expansion.locator('.room-title strong').tap();
}

// Open the native panel through its visible header; never materialize a hidden body in setup.
async function openPage(panel, index, { touch = false } = {}) {
  const expansion = panel.locator(`[data-page-panel="${index}"]`);
  if (!await expansion.evaluate(e => e.expanded)) await activateHeader(expansion, touch);
  await expansion.locator('.room-body > .page-section').first().waitFor({ state: 'attached' });
  await expansion.evaluate(async e => {
    await e.updateComplete;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all([...e.getAnimations({ subtree: true }), ...e.shadowRoot.getAnimations()].map(a => a.finished));
  });
}

async function editorRenderingChecks(page, panel, { client, scenario, theme, output, geometryOnly = false }) {
  const saved = (await client.call({ type: 'marao_dashboard/config/get' })).config;
  const baseline = await panel.evaluate(p => p._source());
  const fixture = JSON.parse(baseline);
  fixture.pages.push({ id: 'render-empty', path: 'render-empty', name: 'Empty page', entities: [], extension: [] },
    { id: 'render-raw', path: 'render-raw', name: 'Raw page', cards: [{ type: 'markdown', content: 'Retained raw-only page' }], extension: { empty: [] } },
    { id: 'render-sections', path: 'render-sections', name: 'Local section controls', sections: [
      { entities: [{ id: 'render-first', entity_id: 'light.marao_dashboard_test_light', name: 'First occurrence', variables: { enable_slider: false, future: [] } },
        { id: 'render-second', entity_id: 'light.marao_dashboard_test_light', name: 'Independent duplicate' }] },
      { entities: [], cards: [{ type: 'markdown', content: 'Unopened content survives' }] },
    ] });
  const index = fixture.pages.length - 1;
  const load = source => panel.evaluate(async (p, source) => { await p._switchTab('json'); p._monaco.setValue(source); await p._switchTab('visual'); }, JSON.stringify(source));
  try {
    assert.equal(await panel.evaluate(p => [...p.shadowRoot.querySelectorAll('[data-page-panel]')].filter(e => e.expanded).length), 1);
    assert.equal(await panel.evaluate(p => [...p.shadowRoot.querySelectorAll('[data-page-panel]')].every(e => e.expanded || !e.querySelector('.room-body').children.length)), true);
    await load(fixture);
    await openPage(panel, index, { touch: !geometryOnly });
    await openPage(panel, fixture.pages.length - 2, { touch: !geometryOnly });
    await openPage(panel, fixture.pages.length - 3, { touch: !geometryOnly });
    assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), fixture, 'Expansion changed the complete draft');
    await panel.evaluate(p => {
      const entry = p._pageEntries.get(p._model.pages.at(-1));
      p.__renderingCheck = { general: p.shadowRoot.querySelector('#general-form ha-form'), section: entry.sections.get(p._model.pages.at(-1).sections[1]), landing: p._pageEntries.get(p._model.pages.find(page => page.path === p._model.landing_page)).body.firstElementChild };
    });
    if (!geometryOnly) {
      await panel.evaluate(p => {
        const find = root => [...root.children].flatMap(e => e.localName === 'input' ? [e] : [...(e.shadowRoot ? find(e.shadowRoot) : []), ...find(e)]);
        const input = find(p.shadowRoot.querySelector('#general-form')).find(e => e.type === 'text');
        if (!input) throw new Error('General text input missing');
        input.focus(); input.setSelectionRange(0, 2); p.__renderingCheck.input = input;
        p._roomAction({ dataset: { action: 'card-delete', kind: 'page', room: `${p._model.pages.length - 1}:0`, card: '0' } });
      });
      const expected = structuredClone(fixture); expected.pages[index].sections[0].entities.splice(0, 1);
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), expected, 'One click must delete exactly the displayed occurrence');
      assert.equal(await panel.evaluate(p => {
        const c = p.__renderingCheck, entry = p._pageEntries.get(p._model.pages.at(-1));
        const focused = c.input.getRootNode().activeElement === c.input && c.input.selectionStart === 0 && c.input.selectionEnd === 2;
        return focused && c.general === p.shadowRoot.querySelector('#general-form ha-form') && c.section === entry.sections.get(p._model.pages.at(-1).sections[1]) && c.landing?.isConnected;
      }), true, 'A local mutation replaced unrelated controls');
      await panel.evaluate((p, index) => { const source = p._cardSource('page', `${index}:0`, 0); if (!p._commitCardMove(source, 1, 0)) throw new Error('Cross-section move failed'); }, index);
      expected.pages[index].sections[1].entities.push(expected.pages[index].sections[0].entities.pop());
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), expected);
      await panel.evaluate((p, index) => p._pageAction({ dataset: { action: 'page-up', room: String(index) } }), index);
      assert.equal(await panel.evaluate(p => p._model.pages.findIndex(page => page.id === 'render-sections')), index - 1);
      [expected.pages[index - 1], expected.pages[index]] = [expected.pages[index], expected.pages[index - 1]];
      const movedDelete = panel.locator(`[data-action="card-delete"][data-room="${index - 1}:1"][data-card="0"]`);
      await movedDelete.evaluate(e => e.closest('.entity-row').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await movedDelete.tap();
      expected.pages[index - 1].sections[1].entities.splice(0, 1);
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), expected, 'Reordered controls used stale coordinates');
      await panel.evaluate(async p => { await p._switchTab('json'); p.__monaco = { model: p._monaco.getModel(), version: p._monaco.getModel().getAlternativeVersionId() }; await p._switchTab('visual'); await p._switchTab('json'); });
      assert.equal(await panel.evaluate(p => p._monaco.getModel() === p.__monaco.model && p._monaco.getModel().getAlternativeVersionId() === p.__monaco.version), true, 'Unchanged tab switch reset JSON history');
      await panel.evaluate(p => p._switchTab('visual'));
    }
    const source = await panel.evaluate(p => p._source());
    const expansion = panel.locator(`[data-page-panel="${geometryOnly ? index : index - 1}"]`);
    await activateHeader(expansion, !geometryOnly);
    assert.equal(await expansion.locator('.room-body > *').count(), 0, 'Collapsed bodies retained controls');
    await openPage(panel, geometryOnly ? index : index - 1, { touch: !geometryOnly });
    assert.equal(await panel.evaluate(p => p._source()), source);
    const issues = await panel.evaluate(p => {
      const issues = [];
      for (const e of p.shadowRoot.querySelectorAll('.room-header,.page-section,ha-icon-button,[data-card-handle]')) {
        if (!e.getClientRects().length || !e.closest('ha-expansion-panel')?.expanded && !e.closest('.room-header')) continue;
        const r = e.getBoundingClientRect();
        if (r.left < -1 || r.right > innerWidth + 1 || e.scrollWidth > e.clientWidth + 1) issues.push(e.localName + ': overflow');
        if (e.matches('ha-icon-button,[data-card-handle]') && (r.width < 48 || r.height < 48)) issues.push('Small action');
      }
      return issues;
    });
    assert.deepEqual(issues, []);
    if (['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(scenario.name)) {
      await expansion.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `rendering-${scenario.name}-${theme}.png`), scale: 'css' });
    }
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, saved, 'Local rendering wrote saved source');
  } catch (error) {
    await page.screenshot({ path: path.join(output, `rendering-${scenario.name}-${theme}-failure.png`), scale: 'css' });
    throw error;
  } finally {
    await panel.evaluate(async (p, source) => { await p._switchTab('json'); p._monaco.setValue(source); await p._switchTab('visual'); delete p.__renderingCheck; delete p.__monaco; }, baseline);
  }
}
module.exports = { openPage, editorRenderingChecks };
