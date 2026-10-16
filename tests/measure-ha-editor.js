const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const { readConfig, accessToken, setBrowserToken, connect } = require('../ha-test/client');
const { iphone } = require('./mobile-devices');
const sha = value => createHash('sha256').update(value).digest('hex');
const option = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };

function largeFixture(source) {
  const fixture = JSON.parse(source);
  assert.equal(fixture.config_version, 2, 'Timing requires canonical pages');
  for (let page = 0; page < 16; page++) fixture.pages.push({
    id: `timing-page-${page}`, path: `timing-page-${page}`, name: `Timing page ${page + 1}`, sections: [
      { entities: Array.from({ length: 12 }, (_, card) => ({ id: `timing-card-${page}-${card}`, entity_id: 'light.marao_dashboard_test_light', name: `Safe occurrence ${card + 1}`, variables: { enable_slider: false } })) },
      { entities: [], cards: [{ type: 'markdown', content: 'Retained raw-only section' }] },
    ],
  });
  return fixture;
}
async function main() {
  const config = readConfig(); assert.equal(new URL(config.url).hostname, '192.168.0.28');
  // Deliberately no preparation/deployment: before and after must use the installed assets.
  const fixtureFile = option('--fixture'); assert.ok(fixtureFile, 'Pass a private --fixture path reused for both phases');
  const expectedHash = option('--expected-editor-sha256'); assert.match(expectedHash || '', /^[a-f0-9]{64}$/);
  const label = process.argv[2]; assert.match(label || '', /^[a-z-]+$/);
  const client = await connect(config), saved = await client.call({ type: 'marao_dashboard/config/get' });
  if (!fs.existsSync(fixtureFile)) fs.writeFileSync(fixtureFile, JSON.stringify(largeFixture(saved.config)), { mode: 0o600 });
  const fixture = fs.readFileSync(fixtureFile, 'utf8'), samples = [];
  const browser = await chromium.launch();
  try {
    for (const cpu of [1, 4]) for (let sample = 0; sample < 3; sample++) {
      const context = await browser.newContext(iphone);
      await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
      await context.addInitScript(() => {
        window.__editorTiming = { longTasks: [] };
        new PerformanceObserver(list => window.__editorTiming.longTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
      });
      const page = await context.newPage(), session = await context.newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      let requestAt, responseAt, requestId;
      // One listener per page, independent document samples below.
      page.on('websocket', socket => {
        socket.on('framesent', ({ payload }) => { const m = JSON.parse(payload); if (m.type === 'marao_dashboard/config/get') { requestId = m.id; requestAt = Date.now(); } });
        socket.on('framereceived', ({ payload }) => { const m = JSON.parse(payload); if (m.type === 'result' && m.id === requestId) responseAt = Date.now(); });
      });
      for (const temperature of ['cold', 'warm']) {
        requestAt = responseAt = requestId = null;
        await page.goto(config.url + '/marao-dashboard-editor');
        const panel = page.locator('marao-dashboard-panel'); await panel.waitFor({ state: 'visible' });
        await page.waitForFunction(p => {
          const inspect = root => [...root.children].some(e => e.localName === 'input' && !e.disabled && e.getBoundingClientRect().width || e.shadowRoot && inspect(e.shadowRoot) || inspect(e));
          const general = p.shadowRoot.getElementById('general-form');
          return p._loaded && general && inspect(general);
        }, await panel.elementHandle());
        const data = await page.evaluate(() => ({ ready: performance.now(), startupLongTasks: [...window.__editorTiming.longTasks], resources: performance.getEntriesByType('resource').map(e => ({ url: e.name, bytes: e.decodedBodySize })) }));
        const editor = data.resources.find(r => /\/MaraoDashboardPanel.js\?/.test(r.url)); assert.ok(editor);
        const response = await page.request.get(editor.url); assert.ok(response.ok());
        data.editorSha256 = sha(await response.body()); assert.equal(data.editorSha256, expectedHash, 'Installed editor does not match the declared baseline/candidate');
        data.assetFingerprint = new URL(editor.url).searchParams.get('v');
        assert.ok(!data.resources.some(r => /MaraoDashboardJsonEditor|MaraoDashboard.*Worker/.test(r.url)), 'Visual requested JSON assets');
        assert.ok(requestAt && responseAt); data.management = responseAt - requestAt;
        data.cpu = cpu; data.sample = sample; data.temperature = temperature;
        data.interactions = await panel.evaluate(async (p, fixture) => {
          const original = p._source();
          const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const timed = async operation => { const start = performance.now(); await operation(); await frames(); return performance.now() - start; };
          const start = performance.now();
          await p._switchTab('json'); const firstJson = performance.now() - start;
          p._monaco.setValue(fixture); await p._switchTab('visual');
          if (p._tab !== 'visual') throw new Error('Large canonical fixture failed validation');
          const rows = () => p.shadowRoot.querySelectorAll('.entity-row').length;
          const initialRows = rows(), forms = p.shadowRoot.querySelectorAll('ha-form').length;
          const index = p._model.pages.length - 1;
          const expansion = () => p.shadowRoot.querySelector(`[data-page-panel="${index}"]`);
          const expand = async value => { const e = expansion(); if (Boolean(e.expanded) !== value) e.shadowRoot.querySelector('[role="button"]').click(); await e.updateComplete; };
          const interactionStart = performance.now();
          const firstExpansion = await timed(() => expand(true));
          const expandedRows = rows();
          const general = p.shadowRoot.querySelector('#general-form ha-form');
          const localDelete = await timed(() => p._roomAction({ dataset: { action: 'card-delete', kind: 'page', room: `${index}:0`, card: '0' } }));
          const generalRetained = general === p.shadowRoot.querySelector('#general-form ha-form');
          const crossSection = await timed(() => p._commitCardMove(p._cardSource('page', `${index}:0`, 0), 1, 0));
          const collapse = await timed(() => expand(false));
          const collapsedControls = expansion().querySelector('.room-body')?.children.length;
          const reopen = await timed(() => expand(true));
          const repeatJson = await timed(async () => { await p._switchTab('json'); await p._switchTab('visual'); await p._switchTab('json'); });
          const interactionEnd = performance.now();
          const interactionLongTasks = window.__editorTiming.longTasks.filter(e => e.start >= interactionStart && e.start < interactionEnd);
          p._monaco.setValue(original); await p._switchTab('visual');
          if (p._source() !== original) throw new Error('Read-only timing changed the local source');
          return { firstJson, initialRows, forms, firstExpansion, expandedRows, localDelete, generalRetained, crossSection, collapse, collapsedControls, reopen, repeatJson, interactionLongTasks, unit: 'milliseconds through two animation-frame boundaries; not a paint measurement' };
        }, fixture);
        if (label.startsWith('after')) {
          assert.equal(data.interactions.generalRetained, true);
          assert.equal(data.interactions.collapsedControls, 0);
          assert.equal(data.interactions.expandedRows - data.interactions.initialRows, 12);
        }
        samples.push(data);
      }
      await context.close();
    }
  } finally {
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, saved.config, 'Timing changed saved source');
    client.close(); await browser.close();
  }
  const out = path.join(__dirname, '.artifacts/editor'); fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(out, 'timings-' + label + '.json'), JSON.stringify({ fixtureSha256: sha(fixture), samples }, null, 2), { mode: 0o600 });
  for (const cpu of [1, 4]) for (const temperature of ['cold', 'warm']) {
    const runs = samples.filter(s => s.cpu === cpu && s.temperature === temperature);
    const median = key => Math.round(runs.map(s => key.split('.').reduce((v, k) => v[k], s)).sort((a, b) => a - b)[1]);
    console.log(`${cpu}x/${temperature}: native-ready ${median('ready')}ms; rows ${median('interactions.initialRows')}; local delete ${median('interactions.localDelete')}ms; first expansion ${median('interactions.firstExpansion')}ms; reopen ${median('interactions.reopen')}ms (3 serial samples)`);
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { largeFixture };
