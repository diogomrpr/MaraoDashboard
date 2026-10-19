const assert = require('node:assert/strict');
const path = require('node:path');
const { capture: captureScreenshot } = require('./verification-browser');
const { layoutIssues, readySubtree } = require('./test-ha-dashboard-accessibility');

function gridGeometryIssues({ cells, gap, width, columns, order }, expectedOrder) {
  const issues = [];
  if (JSON.stringify(order) !== JSON.stringify(expectedOrder)) issues.push('configured order changed');
  if (cells.length !== expectedOrder.length || !cells.length) return [...issues, 'missing control cells'];
  const height = Math.max(...cells.map(cell => cell.surface.height));
  for (const cell of cells) {
    if (!cell.marker) issues.push('missing standard family marker');
    if (cell.surface.height < 48 || Math.abs(cell.surface.height - height) > .5 || Math.abs(cell.height - cell.surface.height) > .5) issues.push('unequal outer surfaces across rows');
    if (Math.abs(cell.width - cells[0].width) > .5) issues.push('partial row changed card width');
    if (cell.surface.right > width + .5 || cell.surface.left < -.5) issues.push('card escaped grid');
  }
  if (columns < 1 || new Set(cells.map(cell => Math.round(cell.top))).size < 3) issues.push('fixture must cover at least three rows');
  if (Math.abs(gap - 8) > .5) issues.push('unexpected grid gap');
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index], previous = cells[index - 1];
    if (previous && index % columns && Math.abs(cell.left - previous.left - previous.width - gap) > .5) issues.push('interior hole or wider individual opener');
    if (index >= columns && Math.abs(cell.top - cells[index - columns].top - height - gap) > .5) issues.push('row gap or row-major placement changed');
  }
  return [...new Set(issues)];
}
async function measureGrid(grid) {
  return grid.evaluate(element => {
    const host = element.shadowRoot.querySelector('.control-grid'), bounds = host.getBoundingClientRect(), style = getComputedStyle(host);
    const find = root => root.querySelector('marao-card') || [...root.querySelectorAll('*')].map(node => node.shadowRoot && find(node.shadowRoot)).find(Boolean);
    return { width: bounds.width, gap: parseFloat(style.gap), columns: style.gridTemplateColumns.split(' ').length,
      order: element._config.cards.map(card => card.name), cells: [...host.children].map(child => {
        const card = child.localName === 'marao-card' ? child : find(child.shadowRoot), surface = card.shadowRoot.querySelector('ha-card');
        const c = child.getBoundingClientRect(), s = surface.getBoundingClientRect();
        return { width: c.width, height: c.height, top: c.top, left: c.left, marker: surface.classList.contains('control-surface') && card.hasAttribute('data-marao-standard-control'),
          surface: { height: s.height, right: s.right - bounds.left, left: s.left - bounds.left } };
      }) };
  });
}
async function controlGridChecks(page, output, scenario, theme, transitions = true) {
  const names = ['Grid · simple light', 'Grid · brightness', 'Grid · cover', 'Grid · lock', 'Grid · hidden icon', 'Grid · hidden title', 'Grid · guarded lock', 'Grid · door summary', 'Grid · front entrance opening control with a deliberately long later-row title'];
  const grid = page.locator('marao-control-grid').filter({ has: page.locator('.title', { hasText: /^Grid · simple light$/ }) }).first();
  await grid.waitFor({ state: 'attached' }); await readySubtree(page, grid, scenario, theme);
  const measure = () => measureGrid(grid), check = async () => assert.deepEqual(gridGeometryIssues(await measure(), names), []);
  await check();
  assert.deepEqual(await layoutIssues(page, ['hc_light_card', 'hc_cover_card', 'hc_access_action_card', 'hc_access_slide_action_card']), []);
  assert.equal(await grid.locator('marao-card').nth(5).locator('.title').count(), 0);
  if (transitions) {
    const before = await measure();
    for (const fault of ['marker', 'rows', 'surface']) {
      const originalRows = await grid.evaluate((element, fault) => {
        const host = element.shadowRoot.querySelector('.control-grid'), last = host.lastElementChild;
        const originalRows = host.style.gridTemplateRows;
        if (fault === 'marker') last.removeAttribute('data-marao-standard-control');
        if (fault === 'rows') {
          // Make the last row intrinsically taller so this mutation cannot pass
          // merely because the current labels happen to need equal heights.
          last.shadowRoot.querySelector('ha-card').style.minHeight = `${Math.ceil(host.firstElementChild.getBoundingClientRect().height) + 64}px`;
          // The resize observer legitimately recomputes inline row templates.
          // Hold the deliberate regression for the measurement without disabling it.
          const style = document.createElement('style'); style.dataset.gridRowsRegression = '';
          style.textContent = '.control-grid{grid-template-rows:none!important;grid-auto-rows:auto!important}';
          element.shadowRoot.append(style);
        }
        if (fault === 'surface') last.shadowRoot.querySelector('ha-card').style.cssText = 'min-height:0;height:100px;align-self:start';
        return originalRows;
      }, fault);
      try { const mutated = await measure(); assert.ok(gridGeometryIssues(mutated, names).length, fault + ' negative fixture must fail: ' + JSON.stringify(mutated.cells.map(cell => ({height:cell.height,surface:cell.surface.height})))); }
      finally {
        await grid.evaluate((element, rows) => { const host = element.shadowRoot.querySelector('.control-grid'), last = host.lastElementChild;
          host.style.gridTemplateRows = rows; host.style.removeProperty('grid-auto-rows'); last.setAttribute('data-marao-standard-control', ''); last.shadowRoot.querySelector('ha-card').removeAttribute('style'); }, originalRows);
        await grid.evaluate(element => element.shadowRoot.querySelector('[data-grid-rows-regression]')?.remove());
      }
    }
    const last = grid.locator('marao-card').last();
    const original = await last.evaluate(card => card._actionError);
    try {
      await last.evaluate(card => { card._actionError = 'Safe fixture: the requested action could not be completed. '.repeat(8); card._render(); });
      await check(); assert.ok((await measure()).cells[0].height > before.cells[0].height, 'Problem content must grow every row');
    } finally { await last.evaluate((card, error) => { card._actionError = error; card._render(); }, original); }
    await check(); assert.ok(Math.abs((await measure()).cells[0].height - before.cells[0].height) <= .5, 'Clearing errors restores necessary height');
    const input = grid.locator('input[data-slider-key]').first(), originalInput = await input.elementHandle();
    await input.dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch' });
    await grid.evaluate(element => { element.hass = { ...document.querySelector('home-assistant').hass }; });
    assert.equal(await input.evaluate((current, original) => current === original, originalInput), true, 'HA update replaced a mounted range');
    await input.dispatchEvent('pointercancel', { pointerId: 9, pointerType: 'touch' });
    const originalWidth = await grid.evaluate(element => { const old = element.style.width; element.style.width = '180px'; return old; });
    await check(); assert.equal((await measure()).columns, 1);
    await grid.evaluate((element, width) => { element.style.width = width; }, originalWidth); await check();
    assert.equal((await measure()).columns, before.columns, 'Preferred columns did not restore');
    // Group and generated access sheets retain keyed/native children and safe gestures.
    for (const pattern of [/^Entity Group · light all$/, /^Entity Group · cover all$/, /^Lock · locked$/]) {
      const card = page.locator('marao-card').filter({ has: page.locator('.title', { hasText: pattern }) }).first();
      await card.locator('[data-card-action]').tap();
      const sheet = page.locator('.marao-popup-sheet'); await sheet.waitFor({ state: 'visible' });
      await readySubtree(page, sheet, scenario, theme);
      assert.deepEqual(await layoutIssues(page, ['hc_light_card', 'hc_cover_card', 'hc_access_action_card', 'hc_access_slide_action_card']), []);
      await page.locator('.marao-popup-close').tap(); await sheet.waitFor({ state: 'detached' });
    }
  }
  await grid.scrollIntoViewIfNeeded(); await captureScreenshot(page, { path: path.join(output, `control-grid-${scenario.name}-${theme}.png`), scale: 'css' });
}
async function nativeControlGridChecks(page, scenario, theme) {
  const grid = page.locator('marao-control-grid').filter({ has: page.locator('.title').filter({ hasText: /^Native grid light$/ }) });
  await page.waitForFunction(element => element._children.length === 3 && element._children.every(child => child.shadowRoot?.querySelector('marao-card')), await grid.elementHandle());
  await readySubtree(page, grid, scenario, theme);
  const issues = async () => {
    const reading = await measureGrid(grid), maximum = Math.max(...reading.cells.map(cell => cell.surface.height));
    return reading.cells.filter(cell => cell.surface.height < 48 || Math.abs(cell.height - cell.surface.height) > .5 || Math.abs(cell.surface.height - maximum) > .5);
  };
  assert.deepEqual(await issues(), [], 'Native surfaces must fill their equal grid cells');
  const primary = grid.locator('marao-card').first(), original = await primary.evaluate(card => card._actionError);
  try {
    await primary.evaluate(card => { card._actionError = 'Safe native fixture: the reported action could not complete. '.repeat(8); card._render(); });
    assert.deepEqual(await issues(), [], 'Native cards with zero-height popup children must fill growing rows');
    const access = grid.locator('marao-native-access-card');
    await access.evaluate(element => { const style = document.createElement('style'); style.dataset.nativeGridRegression = ''; style.textContent = ':host{display:grid!important;grid-template-rows:auto!important;align-content:stretch!important}'; element.shadowRoot.append(style); });
    try { assert.ok((await issues()).length, 'The former extra popup row must fail surface equality'); }
    finally { await access.evaluate(element => element.shadowRoot.querySelector('[data-native-grid-regression]').remove()); }
  } finally { await primary.evaluate((card, error) => { card._actionError = error; card._render(); }, original); }
  await grid.evaluate(element => { element.preview = true; });
  try {
    assert.equal(await grid.locator('marao-native-light-card [data-card-action]').isDisabled(), true);
    assert.deepEqual(await issues(), [], 'Native preview surfaces must remain uniform');
  } finally { await grid.evaluate(element => { element.preview = false; }); }
}
module.exports = { controlGridChecks, gridGeometryIssues, measureGrid, nativeControlGridChecks };
