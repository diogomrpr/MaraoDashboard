const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { chromium } = require("playwright");
const { accessToken, setBrowserToken, connect, fingerprint, readConfig, repoRoot } = require("../ha-test/client");
const { scenarios, themes, contextOptionsForScenario, configurePageEmulation, applyVisualPreferences, emulationIssues } = require("./test-ha-dashboard-accessibility");

const output = path.join(__dirname, ".artifacts/editor");
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
async function tapDialogCandidate(candidate) {
  const visible = await candidate.evaluate(button => {
    button.scrollIntoView({ block: 'start', behavior: 'instant' });
    const dialog = button.closest('ha-dialog'), body = dialog.shadowRoot.querySelector('.body').getBoundingClientRect();
    const box = button.getBoundingClientRect(), actions = dialog.querySelector('.dialog-actions').getBoundingClientRect();
    const top = Math.max(box.top, body.top), bottom = Math.min(box.bottom, body.bottom, actions.top);
    return { width: box.width, height: bottom - top, position: { x: box.width / 2, y: top - box.top + Math.min(24, (bottom - top) / 2) } };
  });
  assert.ok(visible.width >= 48 && visible.height >= 48, 'Candidate must expose at least 48px of clear touch area above the sticky actions');
  await candidate.tap({ position: visible.position });
}
function ssh(config, command, input) {
  const result = spawnSync("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10",
    ...(config.sshKeyPath ? ["-i", config.sshKeyPath] : []), "-p", String(config.sshPort),
    config.sshUser + "@" + config.sshHost, command], { input, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, "Disposable editor backup/cleanup command failed; inspect private backup");
  return result.stdout;
}

async function ready(page, config, { navigate = true } = {}) {
  if (navigate) await page.goto(config.url + "/marao-dashboard-editor");
  const panel = page.locator("marao-dashboard-panel");
  await panel.waitFor({ state: "visible" });
  await page.waitForFunction(p => p._loaded, await panel.elementHandle());
  await page.waitForLoadState('networkidle');
  const expected = fingerprint(path.join(repoRoot, "custom_components/marao_dashboard/frontend"));
  const urls = await page.evaluate(() => performance.getEntriesByType("resource").map(e => e.name));
  assert.ok(urls.some(url => url.includes("/MaraoDashboardPanel.js?v=" + expected)), "Stale editor assets");
  if (process.argv.includes("--startup")) {
    assert.ok(!urls.some(url=>/MaraoDashboardJsonEditor|MaraoDashboard.*Worker/.test(url)), "Visual requested JSON-only resources");
  }
  return panel;
}

async function nativeBrandImages(config) {
  for (const dark of ['', 'dark_']) for (const kind of ['icon', 'logo']) for (const scale of ['', '@2x']) {
    const name = `${dark}${kind}${scale}.png`;
    const response = await fetch(config.url + '/api/brands/integration/marao_dashboard/' + name, {
      headers: { Authorization: 'Bearer ' + config.token }, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, 'Native brand image: ' + name);
    assert.match(response.headers.get('content-type'), /^image\/png/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(repoRoot, 'custom_components/marao_dashboard/brand', name)), 'Native branding must serve the installed image: ' + name);
  }
}

async function brandHeader(page, panel, theme, scenario, run) {
  const mark = panel.locator('.brand-mark');
  await mark.evaluate(image => image.decode());
  assert.equal(await mark.getAttribute('alt'), '');
  assert.equal(await mark.getAttribute('aria-hidden'), 'true');
  const url = new URL(await mark.getAttribute('src'));
  assert.equal(url.pathname, '/marao_dashboard_static/brand/mark' + (theme === 'dark' ? '-dark' : '') + '.svg');
  assert.equal(url.search, '?v=' + fingerprint(path.join(repoRoot, 'custom_components/marao_dashboard/frontend')));
  assert.equal(await panel.locator('h1').evaluate(heading => getComputedStyle(heading).fontWeight), scenario.bold ? '700' : '500');
  assert.deepEqual(await panel.evaluate(p => {
    const root = p.shadowRoot, mark = root.querySelector('.brand-mark').getBoundingClientRect();
    const title = root.querySelector('.title').getBoundingClientRect(), heading = root.querySelector('h1').getBoundingClientRect();
    const issues = [];
    if (mark.width !== 32 || mark.height !== 32 || heading.left < mark.right || heading.right > title.right + 1) issues.push('Brand mark or heading does not fit');
    if (Math.abs((mark.top + mark.bottom - heading.top - heading.bottom) / 2) > 1) issues.push('Brand mark and title are not centered');
    for (const selector of ['#save', '.secondary-actions summary']) {
      const box = root.querySelector(selector).getBoundingClientRect();
      if (box.width < 48 || box.height < 48) issues.push('Header action is below 48px');
    }
    return issues;
  }), []);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(output, run + '-brand-header.png'), scale: 'css' });
}

async function brandSidebar(page) {
  const icons = page.locator('ha-sidebar ha-icon');
  await icons.first().waitFor({ state: 'attached' });
  const index = await icons.evaluateAll(elements => elements.findIndex(icon => icon.icon === 'marao_dashboard:mountain'));
  assert.ok(index >= 0, 'The editor sidebar must use the brand mark');
  const icon = icons.nth(index);
  await page.waitForFunction(icon => icon.shadowRoot?.querySelector('ha-svg-icon')?.shadowRoot?.querySelector('path')?.getAttribute('d'), await icon.elementHandle());
  assert.equal(await icon.locator('path').getAttribute('d'), 'M1 21 6.5 9 9.5 14 14 3 19 15 21 10 23 21Z');
}

async function deletion(page, panel, config, client, original) {
  const before = await client.call({ type: 'marao_dashboard/config/get' });
  const saved = JSON.parse(before.config), fixture = structuredClone(saved);
  const entityId = 'input_boolean.marao_dashboard_test_switch';
  const first = fixture.pages.length;
  for (const path of ['room-editor-check', 'editor-page']) fixture.pages.push({
    id: path, name: path, path, columns: 1,
    entities: [{ id: 'one', entity_id: entityId, name: 'First', variables: { future: 42 } },
      { id: 'shortcut', page: saved.landing_page, name: 'Home', unknown: true },
      { id: 'duplicate', entity_id: entityId, name: 'Duplicate', variables: { color: 'red' } }],
    cards: [{ type: 'markdown', content: 'Raw' }], extension: ['keep'],
  });
  let dialogs = 0;
  const dismiss = async dialog => { dialogs++; await dialog.dismiss(); };
  page.on('dialog', dismiss);
  let savedDraft;
  try {
    for (const index of [first, first + 1]) for (const card of [0, 1, 2]) {
      await panel.evaluate(async (p, source) => {
        await p._switchTab('json'); p._monaco.setValue(source); await p._switchTab('visual');
      }, JSON.stringify(fixture));
      await panel.locator(`[data-action="card-delete"][data-kind="page"][data-room="${index}:0"][data-card="${card}"]`).click();
      const expected = structuredClone(fixture); expected.pages[index].entities.splice(card, 1);
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), expected);
      assert.equal(await panel.evaluate(p => p._dirty), true);
      assert.equal(dialogs, 0, 'Individual card deletion must not prompt');
    }
    await panel.locator(`[data-action="page-delete"][data-room="${first}"]`).click();
    assert.ok((await panel.locator('ha-dialog').evaluate(d => d.headerTitle)).includes('room-editor-check'));
    await panel.locator('ha-dialog [data-close]').click();
    assert.equal(dialogs, 0, 'Whole-page confirmation uses the named form');
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, before.config);
    page.off('dialog', dismiss);
    page.once('dialog', d => d.accept());
    await panel.evaluate(p => p._discard());
    await page.waitForFunction(p => !p._busy, await panel.elementHandle());
    assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), saved);
    savedDraft = await panel.evaluate(async (p, fold) => {
      const index = p._model.pages.findIndex(page => page.path === 'living-room');
      p._roomAction({ dataset: { action: 'card-delete', kind: 'page', room: `${index}:1`, card: '0' } });
      if (fold) {
        p._model.editor_check = { preserved: [{ value: 1, nested: [2, 3] }] };
        p._container('page', `${index}:1`).cards.push({ type: 'markdown', content: 'Folding save check' });
        p._setDirty(); await p._switchTab('json');
        const model = p._monaco.getModel();
        const line = Array.from({ length: model.getLineCount() }, (_, i) => i + 1).find(i => model.getLineContent(i).includes('"pages": ['));
        p._monaco.setPosition({ lineNumber: line, column: 1 }); await p._monaco.getAction('editor.fold').run();
      }
      const expected = p._source(); await p._save();
      if (p._dirty) throw new Error('Fixture Save failed; inspect private browser evidence');
      return expected;
    }, process.argv.includes('--fold'));
    assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), JSON.parse(savedDraft));
    if (process.argv.includes('--fold')) {
      const generated = await client.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
      assert.ok(JSON.stringify(generated).includes('Folding save check'));
    }
    await page.reload(); await ready(page, config, { navigate: false });
    assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), JSON.parse(savedDraft));
  } finally {
    page.off('dialog', dismiss);
    const current = (await client.call({ type: 'marao_dashboard/config/get' })).config;
    assert.ok(current === before.config || (savedDraft && JSON.stringify(JSON.parse(current)) === JSON.stringify(JSON.parse(savedDraft))), 'Concurrent source change; retained private backup');
    if (savedDraft) {
      await client.call({ type: 'marao_dashboard/config/generate', config: before.config });
      ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json'), original);
      assert.ok(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json')).equals(original));
    }
    assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), saved);
    panel = await ready(page, config);
  }
}

async function scrollHeader(panel, allowShort = false) {
  return panel.evaluate(async (p, allowShort) => {
    let scroller = p;
    while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 100 && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) {
      scroller = scroller.parentElement || scroller.getRootNode().host;
    }
    scroller ||= document.scrollingElement;
    const header = p.shadowRoot.querySelector(".editor-header") || p.shadowRoot.querySelector(".toolbar");
    const before = p._source();
    const max = scroller.scrollHeight - scroller.clientHeight;
    if (max < 100 && !allowShort) throw new Error("Header regression requires a genuinely scrollable document");
    const bounds = [];
    for (const fraction of [0, .5, 1]) {
      scroller.scrollTop = max * fraction;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (fraction && max >= 100 && scroller.scrollTop < 50) throw new Error("Header regression did not scroll");
      const box = header.getBoundingClientRect();
      if (p._tab === 'json') for (const control of p.shadowRoot.querySelectorAll('#save, .secondary-actions summary, .tabs button')) {
        const rect = control.getBoundingClientRect();
        const hit = p.shadowRoot.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
        if (!hit?.closest('.editor-header')) throw new Error('JSON content obstructs header control: ' + (control.id || control.textContent.trim()));
      }
      const host = scroller === document.scrollingElement ? { top: 0, bottom: innerHeight } : scroller.getBoundingClientRect();
      bounds.push({ top: box.top, bottom: box.bottom, hostTop: host.top, hostBottom: host.bottom, scroll: scroller.scrollTop });
    }
    if (p._source() !== before) throw new Error("Scrolling modified the document");
    return bounds;
  }, allowShort);
}

async function startupChecks(page, panel) {
  if(process.argv.includes('--surfaces'))await page.exposeFunction('captureEditorStartup', async name => {
    await page.screenshot({path:path.join(output,'startup-'+name+'.png'),scale:'css'});
  });
  await panel.evaluate(async original => {
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const capture = async name => {
      if(window.captureEditorStartup){await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));await window.captureEditorStartup(name);}
    };
    const parent = original.parentNode;
    const payload = await original._hass.callWS({ type: 'marao_dashboard/config/get' });
    let requests = 0, writes = 0, resolve, reject;
    const hass = { ...original._hass, callWS(message) {
      if (message.type !== 'marao_dashboard/config/get') { writes++; throw new Error('Unexpected startup write'); }
      requests++;
      return new Promise((done, fail) => { resolve = done; reject = fail; });
    }};
    const probe = new original.constructor(); probe.hass = hass;
    await original._ensureMonaco();
    const module = original._jsonModule;
    original.remove(); parent.append(probe);
    try {
      await Promise.resolve();
      assert(probe.shadowRoot.getElementById('save').disabled, 'Unloaded save enabled');
      assert(getComputedStyle(probe.shadowRoot.getElementById('retry')).display==='none','Hidden Retry remained visible');
      await probe._switchTab('json');
      assert(!probe._jsonLoading && probe._requestedTab === 'visual', 'Early JSON initialized');
      probe.hass = hass; probe._load(); assert(requests === 1, 'Duplicate config request');
      await capture('loading');
      reject(new Error('Injected configuration failure')); await probe._loading;
      assert(probe._retryKind === 'config' && !probe.shadowRoot.getElementById('retry').hidden, 'No readable retry');
      await capture('retry');
      probe.hass = hass; await Promise.resolve(); assert(requests === 1, 'Automatic retry after failure');
      const retry = probe._load(true); await Promise.resolve(); resolve(payload); await retry;
      assert(probe._loaded && requests === 2, 'Explicit config retry failed');
      probe._model.name = 'Unsaved startup check'; probe._setDirty(); const draft = probe._source();
      const reload = probe._load(true); await Promise.resolve(); reject(new Error('Injected reload failure')); await reload;
      assert(probe._source() === draft && probe._dirty, 'Failed reload replaced draft');
      await capture('retained-draft');
      const deferred = probe._load(true); await Promise.resolve(); probe.remove(); resolve(payload); await deferred;
      assert(probe._source() === draft, 'Detached response replaced draft');
      parent.append(probe);
      // Delay the real JSON initializer while using its installed worker/editor.

      let release; const gate = new Promise(done => { release = done; }); let creates = 0;
      probe._jsonModule = { ...module, async createEditor(...args) { creates++; await gate; return module.createEditor(...args); } };
      const json = probe._switchTab('json'); const repeated = probe._switchTab('json');
      await probe._switchTab('visual');
      probe._model.name = 'Latest unsaved startup check'; probe._setDirty(); const latest = probe._source();
      await capture('json-loading');
      release(); await Promise.all([json, repeated]);
      assert(creates === 1 && probe._tab === 'visual', 'Repeated JSON load or focus/tab steal');
      await probe._switchTab('json');
      assert(probe._monaco.getValue() === latest && probe._dirty, 'JSON lost latest draft');
      const oldEditor = probe._monaco;
      probe.remove(); assert(probe._monaco === null, 'Editor not disposed'); parent.append(probe);
      await probe._ensureMonaco(); await probe._switchTab('json');
      assert(probe._monaco !== oldEditor && probe._monaco.getValue() === latest && probe._dirty, 'Revisit lost draft');
      // Exercise the real Restore action with a local management stub only.
      let restores=0, reads=0;
      probe._history=[{version:'20261010T180000000000Z',created_at:'2026-10-10T18:00:00Z',name:'Restore check',reason:'fixture'}];
      probe._hass={...hass, async callWS(message) {
        if(message.type==='marao_dashboard/history/restore'){restores++;return {};}
        if(message.type==='marao_dashboard/config/get'){reads++;return payload;}
        throw new Error('Unexpected Restore command');
      }};
      const confirm=window.confirm;window.confirm=()=>true;
      try {
        probe._openHistory();const restoreButton=probe.shadowRoot.querySelector('[data-version]');await restoreButton.updateComplete;restoreButton.click();
        await new Promise((done,fail)=>{const start=performance.now();const check=()=>{
          if(restores===1 && reads===1 && !probe._busy)return done();
          if(performance.now()-start>10000)return fail(new Error('Restore did not reload configuration'));
          requestAnimationFrame(check);
        };check();});
      } finally {window.confirm=confirm;}
      assert(probe._source()===probe._savedSource && !probe._dirty,'Restore retained a stale draft');
      assert(writes === 0, 'Startup automatically saved');
    } finally { probe.remove(); parent.append(original); }
  });
}

async function assetRetry(browser, config, scenario, file) {
  const context = await browser.newContext(contextOptionsForScenario(scenario));
  await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
  const page = await context.newPage(); let failures = 0;
  const diagnostics = [];
  page.on('pageerror', error => diagnostics.push(error.message));
  // The single deliberately failed local resource is retained as test evidence.
  const failed = [];
  page.on('requestfailed', request => failed.push(new URL(request.url()).pathname));
  await page.route('**/' + file + '*', async route => {
    if (failures++ === 0) await route.abort('failed'); else await route.continue();
  });
  try {
    const panel = await ready(page, config);
    const source = await panel.evaluate(p => p._source());
    await panel.evaluate(p => Promise.race([p._switchTab('json'), new Promise((_resolve, reject)=>setTimeout(()=>reject(new Error('Injected asset failure did not settle')),10000))]));
    assert.equal(await panel.evaluate(p => p._retryKind), 'json', 'Failed asset did not offer retry: ' + file);
    assert.equal(await panel.evaluate(p => p._source()), source);
    if(process.argv.includes('--surfaces'))await page.screenshot({path:path.join(output,file+'-failure.png'),scale:'css'});
    await panel.locator('#retry').click();
    await page.waitForFunction(p => p._tab === 'json', await panel.elementHandle());
    assert.equal(await panel.evaluate(p => p._monaco.getValue()), source);
    const urls = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name));
    const version = fingerprint(path.join(repoRoot, 'custom_components/marao_dashboard/frontend'));
    assert.ok(urls.filter(url => /MaraoDashboardJsonEditor|MaraoDashboard.*Worker/.test(url)).every(url => new URL(url).searchParams.get('v') === version));
    assert.equal(failures, 2, 'Resource was retried without user action or requested repeatedly: ' + file);
    assert.ok(failed.every(url => url.endsWith('/' + file)), 'Unrelated failed resource');
    // Monaco can report the injected worker failure; keep the exact evidence private.
    fs.writeFileSync(path.join(output, file + '-retry.json'), JSON.stringify({ failed, diagnostics }));
    assert.deepEqual(diagnostics, file === 'MaraoDashboardJsonWorker.js' ? ['Event'] : [], 'Unexpected injected-failure exception');
    assert.equal(await panel.evaluate(p => p._dirty), false);
  } finally { await context.close(); }
}

async function folding(page, panel) {
  await panel.evaluate(p => p._switchTab('json'));
  const result = await panel.evaluate(async p => {
    const editor=p._monaco, model=editor.getModel();
    const source=editor.getValue(), dirty=p._dirty;
    const worker=await (await p._jsonModule.getWorker())(model.uri);
    const diagnostics=await worker.doValidation(model.uri.toString());
    if(diagnostics.length)throw new Error('Valid fixture has JSON diagnostics: '+diagnostics.map(d=>d.message).join('; '));
    const ranges=await worker.getFoldingRanges(model.uri.toString(),{});
    const line=Array.from({length:model.getLineCount()},(_,i)=>i+1).find(i=>model.getLineContent(i).includes('"pages": ['));
    if(!line || !ranges.some(r=>r.startLine===line-1))throw new Error('JSON worker has no page folding range');
    const nested=ranges.find(r=>r.startLine>line && model.getLineContent(r.startLine+1).includes('"entities":'));
    if(!nested)throw new Error('JSON worker has no nested page range');
    editor.setPosition({lineNumber:line,column:1});editor.revealLineInCenter(line);
    const expanded=editor.getTopForLineNumber(line+2);
    return {line,expanded,nested:nested.startLine+1,source,dirty,ranges:ranges.length};
  });
  await panel.locator('#collapse-json').click();
  await page.waitForFunction(({p,line,expanded})=>p._monaco.getTopForLineNumber(line+2)<expanded,{p:await panel.elementHandle(),line:result.line,expanded:result.expanded});
  const collapsed=await panel.evaluate((p,line)=>p._monaco.getTopForLineNumber(line+2),result.line);
  await panel.evaluate(async p=>{await p._switchTab('visual');await p._switchTab('json');});
  assert.equal(await panel.evaluate((p,line)=>p._monaco.getTopForLineNumber(line+2),result.line),collapsed);
  await panel.locator('#expand-json').click();
  await page.waitForFunction(({p,line,expanded})=>p._monaco.getTopForLineNumber(line+2)===expanded,{p:await panel.elementHandle(),line:result.line,expanded:result.expanded});
  // Fold a nested region and check its sibling stays expanded through public geometry.
  const nested=await panel.evaluate(async(p,line)=>{
    const editor=p._monaco;const model=editor.getModel();
    const worker=await(await p._jsonModule.getWorker())(model.uri);
    const ranges=await worker.getFoldingRanges(model.uri.toString(),{});
    const range=ranges.find(r=>r.startLine===line-1);
    const sibling=ranges.find(r=>r.startLine>range.endLine && model.getLineContent(r.startLine+1).includes('"entities":'));
    if(!sibling)throw new Error('Fixture needs a sibling room region');
    const count=(a,b)=>editor.getTopForLineNumber(b)-editor.getTopForLineNumber(a);
    const before=count(sibling.startLine+1,sibling.endLine+1);
    editor.setPosition({lineNumber:line,column:1});await editor.getAction('editor.fold').run();
    if(count(sibling.startLine+1,sibling.endLine+1)!==before)throw new Error('Nested folding collapsed sibling');
    await editor.getAction('editor.unfold').run();
    return {line,expanded:editor.getTopForLineNumber(line+2)};
  },result.nested);
  const mac=await page.evaluate(()=>/Macintosh|iPhone|iPad/.test(navigator.userAgent));
  await panel.evaluate(p=>p._monaco.focus());
  await page.keyboard.press(mac?'Meta+Alt+BracketLeft':'Control+Shift+BracketLeft');
  await page.waitForFunction(({p,line,expanded})=>p._monaco.getTopForLineNumber(line+2)<expanded,{p:await panel.elementHandle(),...nested});
  await page.keyboard.press(mac?'Meta+Alt+BracketRight':'Control+Shift+BracketRight');
  await page.waitForFunction(({p,line,expanded})=>p._monaco.getTopForLineNumber(line+2)===expanded,{p:await panel.elementHandle(),...nested});
  await panel.evaluate(async(p,{source,dirty})=>{
    window.__foldStage='format';
    const editor=p._monaco;
    if(editor.getValue()!==source || p._dirty!==dirty)throw new Error('Folding changed the draft');
    editor.pushUndoStop();editor.executeEdits('fixture',[{range:{startLineNumber:1,startColumn:2,endLineNumber:1,endColumn:2},text:' '}]);editor.pushUndoStop();
    await editor.getAction('editor.action.formatDocument').run();
    window.__foldStage='undo';await editor.getModel().undo();await editor.getModel().undo();
    if(editor.getValue()!==source)throw new Error('Folding/format lost undo history');
    window.__foldStage='redo';await editor.getModel().redo();await editor.getModel().redo();
    if(JSON.stringify(JSON.parse(editor.getValue()))!==JSON.stringify(JSON.parse(source)))throw new Error('Folding/format lost redo content');
    const invalid=JSON.parse(source);invalid.config_version=999;
    editor.setValue(JSON.stringify(invalid,null,2));
    window.__foldStage='validation';
    const model=editor.getModel();const worker=await(await p._jsonModule.getWorker())(model.uri);
    if(!(await worker.doValidation(model.uri.toString())).length)throw new Error('Hidden invalid content has no diagnostics');
    await worker.getFoldingRanges(model.uri.toString(),{});
    const expandedInvalid=editor.getTopForLineNumber(3);editor.setPosition({lineNumber:1,column:1});await editor.getAction('editor.fold').run();
    if(editor.getTopForLineNumber(3)>=expandedInvalid)throw new Error('Invalid configuration was not hidden in a folded region');
    window.__foldStage='invalid-ready';
  },result);
  await panel.locator('[data-tab="visual"]').click();
  assert.equal(await panel.evaluate(p=>p._tab),'json','Invalid JSON bypassed tab protection');
  await panel.evaluate((p,{source,dirty})=>{
    p._setEditorSource(source);p._jsonDraft=source;p._dirty=dirty;
  },result);
  await panel.locator('[data-tab="visual"]').click();
  await page.waitForFunction(p=>p._tab==='visual',await panel.elementHandle());
  await panel.locator('[data-tab="json"]').click();
  await page.waitForFunction(p=>p._tab==='json',await panel.elementHandle());
  const sizes=await panel.evaluate(p=>['collapse-json','expand-json'].map(id=>{const e=p.shadowRoot.getElementById(id);const r=e.getBoundingClientRect();return {width:r.width,height:r.height,label:e.textContent};}));
  assert.ok(sizes.every(s=>s.width>=48&&s.height>=48&&s.label));
  await panel.evaluate(p=>{const language=p._hass.language;p._hass={...p._hass,language:'pt'};p._updateHeader();if(p.shadowRoot.getElementById('collapse-json').textContent!=='Recolher região')throw new Error('Portuguese folding label missing');p._hass={...p._hass,language};p._updateHeader();});
  fs.writeFileSync(path.join(output,'folding.json'),JSON.stringify({...result,source:undefined,collapsed,sizes}));
  await panel.evaluate((p,line)=>{p._monaco.setPosition({lineNumber:line,column:1});p._monaco.revealLineInCenter(line);},result.line);
  const finalExpanded=await panel.evaluate((p,line)=>p._monaco.getTopForLineNumber(line+2),result.line);
  await panel.locator('#collapse-json').click();
  await page.waitForFunction(({p,line,expanded})=>p._monaco.getTopForLineNumber(line+2)<expanded,{p:await panel.elementHandle(),line:result.line,expanded:finalExpanded});
  await scrollHeader(panel, true);
  await page.screenshot({path:path.join(output,'folding-'+(await page.evaluate(()=>document.documentElement.dataset.maraoAccessibilityProfile))+'-'+(await page.evaluate(()=>document.documentElement.dataset.maraoThemeMode))+'.png'),scale:'css'});
  await panel.evaluate(p=>p._switchTab('visual'));
}

async function weatherChecks(context, scenario, theme, config) {
  const page=await context.newPage();const diagnostics=[];
  page.on('pageerror',e=>diagnostics.push(e.message));
  page.on('console',m=>{if(['warning','error'].includes(m.type()))diagnostics.push(m.text());});
  page.on('requestfailed',r=>diagnostics.push(r.failure()?.errorText));
  try {
    for(const route of ['overview','card-test']) {
      await page.goto(config.url+'/marao-dashboard/'+route);
      await page.locator('marao-card').first().waitFor({state:'visible'});
      await applyVisualPreferences(page,scenario,theme);
      const ids=await page.locator('marao-card').evaluateAll(cards=>cards.flatMap((card,i)=>{
        if(!['hc_weather_card','hc_header_card'].includes(card._config?.template))return [];
        card.dataset.editorWeather=String(i);return [{i,template:card._config.template,entity:card._config.entity}];
      }));
      assert.ok(ids.some(c=>c.template==='hc_weather_card'));
      for(const {i,template,entity} of ids) {
        const card=page.locator(`[data-editor-weather="${i}"]`);
        await card.evaluate(c=>c.scrollIntoView({block:'start',behavior:'instant'}));
        const errors=await card.evaluate(c=>{
          const problems=[];const box=c.getBoundingClientRect();
          for(const e of c.shadowRoot.querySelectorAll('.title,.state,.climate,.reading')) {
            const r=e.getBoundingClientRect();
            if(r.width && (r.left<box.left-1||r.right>box.right+1||e.scrollWidth>e.clientWidth+2))problems.push('Weather content overflows');
          }
          if(c._config.entity==='weather.marao_dashboard_test_weather' && !c._hass.states[c._config.entity]?.attributes.forecast?.length)problems.push('Forecast fixture missing');
          return problems;
        });
        assert.deepEqual(errors,[]);
        await card.screenshot({path:path.join(output,`${scenario.name}-${theme}-${route}-${template}-${i}.png`),scale:'css'});
      }
    }
    fs.writeFileSync(path.join(output,`${scenario.name}-${theme}-weather-diagnostics.json`),JSON.stringify(diagnostics));
    assert.deepEqual(diagnostics,[]);
  } finally {await page.close();}
}

async function feedbackChecks(page, panel, scenario, theme) {
  const source=await panel.evaluate(p=>p._source());
  for(const kind of ['loading','retry']) {
    await panel.evaluate(async(p,kind)=>{
      p._jsonLoading=kind==='loading'?Promise.resolve():null;p._retryKind=kind==='retry'?'json':null;
      p._setStatus(kind==='loading'?p._t('loadingJson'):p._t('jsonFailed')+'Injected test failure',kind==='retry'?'error':'');p._updateHeader();
      await p.shadowRoot.getElementById('retry').updateComplete;
    },kind);
    const rect=await panel.locator('.editor-header').boundingBox();
    assert.ok(rect.y+rect.height<(await page.evaluate(()=>innerHeight))-48,'Loading feedback leaves no usable form space');
    const feedback=panel.locator('#load-feedback');assert.ok(await feedback.isVisible());
    if(kind==='retry') {
      const retry=await panel.locator('#retry').boundingBox();
      assert.ok(retry.width>=48&&retry.height>=48&&retry.y>=rect.y&&retry.y+retry.height<=rect.y+rect.height+1,'Retry is not visible in the header');
    }
    await page.screenshot({path:path.join(output,`${scenario.name}-${theme}-json-${kind}.png`),scale:'css'});
  }
  await panel.evaluate(p=>{p._retryKind=null;p._setStatus('','');p._updateHeader();});
  assert.equal(await panel.evaluate(p=>p._source()),source);
}

async function foldingBaseline(browser, config, scenario) {
  const os=require('node:os');const esbuild=require('esbuild');
  const stage=fs.mkdtempSync(path.join(os.tmpdir(),'marao-fold-baseline-'));
  const context=await browser.newContext(contextOptionsForScenario(scenario));
  try {
    for(const file of ['MaraoDashboardPanel.js','editor-model.js','panel.css']) {
      const result=spawnSync('git',['show','HEAD:frontend_src/'+file],{cwd:repoRoot});
      assert.equal(result.status,0);fs.writeFileSync(path.join(stage,file),result.stdout);
    }
    await esbuild.build({entryPoints:[path.join(stage,'MaraoDashboardPanel.js')],bundle:true,format:'esm',minify:true,loader:{'.ttf':'file'},nodePaths:[path.join(repoRoot,'node_modules')],outdir:path.join(stage,'build')});
    await context.addInitScript(setBrowserToken,{hassUrl:config.url,...accessToken(config)});
    const page=await context.newPage();const diagnostics=[];
    page.on('pageerror',e=>diagnostics.push(e.message));
    for(const extension of ['js','css'])await page.route('**/MaraoDashboardPanel.'+extension+'*',route=>route.fulfill({path:path.join(stage,'build/MaraoDashboardPanel.'+extension),contentType:extension==='js'?'text/javascript':'text/css'}));
    const panel=await ready(page,config);await panel.evaluate(p=>p._switchTab('json'));
    const result=await panel.evaluate(async p=>{
      const editor=p._monaco,model=editor.getModel();
      const line=Array.from({length:model.getLineCount()},(_,i)=>i+1).find(i=>model.getLineContent(i).includes('"pages": ['));
      const action=editor.getAction('editor.fold');const before=editor.getTopForLineNumber(line+2);
      editor.setPosition({lineNumber:line,column:1});if(action)await action.run();
      return {action:!!action,before,after:editor.getTopForLineNumber(line+2)};
    });
    fs.writeFileSync(path.join(output,'folding-baseline.json'),JSON.stringify({result,diagnostics}));
    assert.equal(result.after,result.before,'Saved-release baseline no longer reproduces missing folding');
  } finally {await context.close();fs.rmSync(stage,{recursive:true,force:true});}
}

async function energyFormatting(page, panel, config, client, original, run, save) {
  if (process.argv.includes('--portuguese')) run += '-pt';
  const before = await client.call({ type: "marao_dashboard/config/get" });
  const expected = JSON.parse(before.config);
  const energyIndex = expected.pages.findIndex(page => page.path === 'energy');
  const sectionIndex = expected.pages[energyIndex].sections.findIndex(section => section.entities.some(card => card.variables?.popup_hash === '#energy-today-power'));
  const position = `${energyIndex}:${sectionIndex}`;
  const originalSlot = structuredClone(expected.pages[energyIndex].sections[sectionIndex].entities[0]);
  await panel.evaluate((p, position) => window.__energyPosition = position, position);
  const automatic = process.argv.includes('--portuguese') ? 'Automático' : 'Automatic';
  const select = async (index, value, capture) => {
    const field = panel.locator('ha-dialog ha-selector-select').nth(index + 1);
    await field.locator('ha-picker-field button.list-item').click({ position: { x: 12, y: 18 } });
    const item = field.getByRole('menuitem', { name: value, exact: true });
    await item.waitFor({ state: 'visible' });
    await item.evaluate(async element => {
      const animations = [];
      for (let parent = element; parent; parent = parent.assignedSlot || parent.parentElement || parent.getRootNode()?.host) animations.push(...parent.getAnimations());
      await Promise.all(animations.map(animation => animation.finished));
    });
    const issues = await field.getByRole('menuitem').evaluateAll(items => items.flatMap(item => {
      const box = item.getBoundingClientRect();
      return box.width && (box.width < 48 || box.height < 48) ? [`Dropdown target below 48px: ${box.width} × ${box.height}`] : [];
    }));
    assert.deepEqual(issues, []);
    if (index === 0) {
      const options = (await field.getByRole('menuitem').allTextContents()).map(label => label.trim());
      assert.ok(options.includes('Wh') && options.includes('J'));
      assert.ok(!options.includes('W') && !options.includes('kW'), 'Power unit offered for an energy source');
    }
    if (capture) await page.screenshot({ path: path.join(output, run + '-energy-options.png'), scale: 'css' });
    await item.click();
    await item.waitFor({ state: 'hidden' });
  };
  let savedDraft;
  try {
    // Unknown options exercise the real native form without writing a new schema.
    await panel.evaluate(p => {
      p._container('page', window.__energyPosition).entities[0].variables.future = { keep: true };
      p._renderVisual();
    });
    await panel.locator(`[data-action="card-edit"][data-kind="page"][data-room="${position}"][data-card="0"]`).click();
    await panel.locator('ha-dialog [data-save]').waitFor({ state: 'visible' });
    await select(0, automatic);
    await panel.locator('ha-dialog [data-save]').click();
    await panel.locator('ha-dialog').waitFor({ state: 'detached' });
    const reset = await panel.evaluate(p => p._container('page', window.__energyPosition).entities[0].variables);
    assert.equal(Object.hasOwn(reset, 'display_unit'), false);
    assert.equal(reset.display_precision, originalSlot.variables.display_precision);
    assert.deepEqual(reset.future, { keep: true });
    await panel.locator(`[data-action="card-edit"][data-kind="page"][data-room="${position}"][data-card="0"]`).click();
    await panel.locator('ha-dialog [data-save]').waitFor({ state: 'visible' });
    await select(0, 'kWh');
    await select(1, '0', true);
    const dialog = panel.locator('ha-dialog');
    assert.deepEqual(await dialog.evaluate(element => {
      const issues = [];
      const header = element.shadowRoot.querySelector('ha-dialog-header');
      const content = header.shadowRoot.querySelector('.header-content').getBoundingClientRect();
      const title = element.shadowRoot.querySelector('.title');
      const range = document.createRange(); range.selectNodeContents(title);
      if ([...range.getClientRects()].some(box => box.left < content.left - 1 || box.right > content.right + 1 || box.bottom > content.bottom + 1)) issues.push('Dialog heading clipped');
      const close = element.shadowRoot.querySelector('ha-icon-button').getBoundingClientRect();
      if (close.width < 48 || close.height < 48) issues.push('Dialog close below 48px');
      const actions = element.querySelector('.dialog-actions').getBoundingClientRect();
      for (const button of element.querySelectorAll('.dialog-actions ha-button')) {
        const box = button.getBoundingClientRect();
        if (box.width < 48 || box.height < 48 || box.left < actions.left - 1 || box.right > actions.right + 1) issues.push('Dialog action too small or outside its row');
      }
      return issues;
    }), []);
    await dialog.evaluate(element => { element.shadowRoot.querySelector('.body').scrollTop = 0; });
    await page.screenshot({ path: path.join(output, run + '-energy-dialog.png'), scale: 'css' });
    await dialog.evaluate(element => { const body = element.shadowRoot.querySelector('.body'); body.scrollTop = body.scrollHeight; });
    await page.screenshot({ path: path.join(output, run + '-energy-dialog-bottom.png'), scale: 'css' });
    await panel.locator('ha-dialog [data-save]').click();
    await panel.locator('ha-dialog').waitFor({ state: 'detached' });
    assert.deepEqual(await panel.evaluate(p => p._container('page', window.__energyPosition).entities[0].variables), {
      ...originalSlot.variables, display_unit: 'kWh', display_precision: 0, future: { keep: true },
    });
    // Restore the local preservation probe; Save changes only one explicit option.
    await panel.evaluate(p => { delete p._container('page', window.__energyPosition).entities[0].variables.future; p._setDirty(); });
    expected.pages[energyIndex].sections[sectionIndex].entities[0].variables.display_precision = 0;
    assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), expected);
    if (save) {
      savedDraft = await panel.evaluate(p => p._source());
      await panel.locator('#save').click();
      await page.waitForFunction(p => !p._busy, await panel.elementHandle());
      assert.equal(await panel.evaluate(p => p._dirty), false, 'Energy Save failed');
      assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), expected);
      await page.waitForLoadState('networkidle');
      await page.reload();
      const reloaded = await ready(page, config, { navigate: false });
      await page.waitForLoadState('networkidle');
      assert.deepEqual(JSON.parse(await reloaded.evaluate(p => p._source())), expected);
    }
  } catch (error) {
    fs.writeFileSync(path.join(output, run + '-energy-failure-state.json'), JSON.stringify(await panel.evaluate(p => {
      const dialog = p.shadowRoot.querySelector('ha-dialog');
      return { dialogs: p.shadowRoot.querySelectorAll('ha-dialog').length, open: dialog?.open,
        actions: [...(dialog?.querySelectorAll('[data-save]') || [])].map(button => ({ box: button.getBoundingClientRect().toJSON(), display: getComputedStyle(button).display, visibility: getComputedStyle(button).visibility })) };
    }), null, 2));
    await page.screenshot({ path: path.join(output, run + '-energy-failure.png'), scale: 'css' });
    throw error;
  } finally {
    const current = await client.call({ type: 'marao_dashboard/config/get' });
    assert.ok(current.config === before.config || (savedDraft && JSON.stringify(JSON.parse(current.config)) === JSON.stringify(JSON.parse(savedDraft))), 'Concurrent source change; retained private backup');
    if (savedDraft) {
      await client.call({ type: 'marao_dashboard/config/generate', config: before.config });
      ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json'), original);
      assert.ok(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json')).equals(original));
    }
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, before.config);
  }
}

async function releasedDraftPreservation(page, panel, client, scenario, theme) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const before = (await client.call({ type: 'marao_dashboard/config/get' })).config;
  const original = await panel.evaluate(p => ({ source: p._source(), dirty: p._dirty }));
  const fixtures = path.join(repoRoot, 'ha-test/upgrade/fixtures');
  const records = [...JSON.parse(fs.readFileSync(path.join(fixtures, 'provenance.json'), 'utf8')),
    { tag: 'v0.2.0', fixture: 'v0.2.0-storage-dashboard.json', expected: 'v0.2.0-storage-format-2-expected.json' }];
  const installDraft = async source => {
    await panel.locator('[data-tab="json"]').click();
    await page.waitForFunction(p => p._tab === 'json' && p._monaco, await panel.elementHandle());
    await panel.evaluate((p, source) => p._monaco.setValue(source), source);
    await panel.locator('[data-tab="visual"]').click();
    await page.waitForFunction(p => p._tab === 'visual', await panel.elementHandle());
  };
  try {
    for (const record of records) {
      const source = fs.readFileSync(path.join(fixtures, record.fixture), 'utf8');
      const mapping = JSON.parse(fs.readFileSync(path.join(fixtures, 'page-model-expectations.json'), 'utf8')).records.find(item => item.input === record.fixture);
      const expected = JSON.parse(fs.readFileSync(path.join(fixtures, mapping?.expected || record.expected), 'utf8'));
      await installDraft(source);
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), expected, record.tag);
      await applyVisualPreferences(page, scenario, theme);
      assert.deepEqual(await emulationIssues(page, scenario, theme), [], 'Historical Visual draft profile');
      await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-${record.tag}-preserved-visual.png`), scale: 'css' });
      await panel.evaluate(p => p._switchTab('json'));
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._monaco.getValue())), expected, record.tag);
      await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-${record.tag}-preserved-json.png`), scale: 'css' });
    }
  } catch (error) {
    fs.writeFileSync(path.join(output, `${scenario.name}-${theme}-preservation-failure.txt`), error.stack || error.message);
    fs.writeFileSync(path.join(output, `${scenario.name}-${theme}-preservation-state.json`), JSON.stringify(await panel.evaluate(p => ({
      catalogVersion: p._catalog.config_version, modelVersion: p._model.config_version, tab: p._tab,
      status: p.shadowRoot.getElementById('status').textContent,
    }))), { mode: 0o600 });
    throw error;
  } finally {
    await installDraft(original.source);
    await panel.evaluate((p, dirty) => { p._dirty = dirty; p._updateHeader(); }, original.dirty);
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, before, 'Local drafts changed saved JSON');
  }
}

async function independentRoomChecks(page, panel, client, scenario, theme) {
  const fixtures = require('../ha-test/cases.json').editorRoomCases;
  const saved = (await client.call({ type: 'marao_dashboard/config/get' })).config;
  const original = await panel.evaluate(p => ({ model: p._model, source: p._source(), dirty: p._dirty }));
  const roomIndex = await panel.evaluate(p => p._model.pages.findIndex(page => page.path === 'living-room'));
  assert.ok(roomIndex >= 0);
  const room = `${roomIndex}:1`;
  const open = async (index = room, kind = 'room') => {
    await panel.locator(`[data-action="card-add"][data-kind="page"][data-room="${index}"]`).tap();
    await panel.locator('ha-dialog #by-entity').tap();
    if (process.argv.includes('--portuguese')) assert.equal(await panel.locator('ha-dialog #by-entity').textContent(), 'Por entidade');
    await page.waitForFunction(p => !p._metadataLoading, await panel.elementHandle());
  };
  const close = async () => {
    await panel.locator('ha-dialog [data-close]').tap();
    await panel.locator('ha-dialog').waitFor({ state: 'detached' });
  };
  const capture = async name => {
    await applyVisualPreferences(page, scenario, theme);
    assert.deepEqual(await emulationIssues(page, scenario, theme), []);
    const dialog = panel.locator('ha-dialog');
    await dialog.evaluate(async element => {
      const modal = element.shadowRoot.querySelector('wa-dialog').shadowRoot.querySelector('dialog');
      await Promise.all(modal.getAnimations().map(animation => animation.finished));
      element.shadowRoot.querySelector('.body').scrollTop = 0;
    });
    assert.deepEqual(await dialog.evaluate(element => {
      const issues = [];
      for (const control of element.querySelectorAll('.add-tabs button, .gallery-card, #entity-search')) {
        const box = control.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        if (box.width < 48 || box.height < 48 || box.left < -.5 || box.right > innerWidth + .5) issues.push('Add control is too small or overflows');
        const range = document.createRange(); range.selectNodeContents(control);
        if ([...range.getClientRects()].some(rect => rect.width && (rect.left < box.left - .5 || rect.right > box.right + .5))) issues.push('Add text overflows its control');
      }
      const visit = root => {
        for (const child of root.children || []) {
          if (child.localName === 'ha-selector-boolean') {
            const label = child.shadowRoot.querySelector('.primary');
            const range = document.createRange(); range.selectNodeContents(label);
            const lines = [...range.getClientRects()].filter(rect => rect.width && rect.height);
            for (let index = 1; index < lines.length; index++) if (lines[index].top > lines[index - 1].top && lines[index].top < lines[index - 1].bottom - .5) issues.push('Boolean option label lines overlap');
            const box = child.shadowRoot.querySelector('ha-switch').getBoundingClientRect();
            if (box.width < 48 || box.height < 48) issues.push('Boolean option below 48px');
          }
          if (child.shadowRoot) visit(child.shadowRoot); visit(child);
        }
      };
      visit(element);
      return issues;
    }), []);
    await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-rooms-${name}.png`), scale: 'css' });
    await dialog.evaluate(element => { const body = element.shadowRoot.querySelector('.body'); body.scrollTop = body.scrollHeight; });
    await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-rooms-${name}-bottom.png`), scale: 'css' });
  };
  try {
    await open();
    assert.equal(await panel.locator(`ha-dialog [data-entity="${fixtures.newEntity}"]`).count(), 1);
    await capture('suggestions');
    assert.equal(await panel.evaluate(p => p._source()), original.source);
    await panel.locator('ha-dialog #by-type').tap();
    await capture('types');
    await panel.locator('ha-dialog [data-card="hc_light_card"]').tap();
    await panel.locator('ha-dialog #by-type').waitFor({ state: 'detached' });
    await panel.locator('ha-dialog #card-form ha-form').waitFor({ state: 'visible' });
    assert.equal(await panel.locator('ha-dialog #card-form ha-form').evaluate(form => form.data.entity_id), '');
    await close();
    await open();
    await panel.locator('ha-dialog #by-entity').tap();
    await panel.locator(`ha-dialog [data-entity="${fixtures.newEntity}"]`).tap();
    await panel.locator('ha-dialog #card-form ha-form').waitFor({ state: 'visible' });
    assert.equal(await panel.locator('ha-dialog #card-form ha-form').evaluate(form => form.data.entity_id), fixtures.newEntity);
    await capture('prefilled');
    assert.equal(await panel.evaluate(p => p._source()), original.source, 'Selecting an entity must not add it');
    await panel.locator('ha-dialog #card-form ha-form').evaluate(form => {
      form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ...form.data, var__enable_slider: false } } }));
    });
    await panel.locator('ha-dialog #advanced-form ha-form').evaluate(form => {
      form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ...form.data, var__custom_label: 'Fixture prefix' } } }));
    });
    await panel.evaluate((p, { room, entity_id }) => { p._container('page', room).entities.push({ entity_id }); }, { room, entity_id: fixtures.newEntity });
    const concurrent = await panel.evaluate(p => p._source());
    await panel.locator('ha-dialog [data-save]').tap();
    assert.equal(await panel.locator('ha-dialog .dialog-content > #summary').evaluate(host => Boolean(host.querySelector('strong[style]'))), true);
    assert.equal(await panel.evaluate(p => p._source()), concurrent, 'Confirmation must recheck the current draft and reject a duplicate');
    await panel.evaluate((p, room) => { p._container('page', room).entities.pop(); }, room);
    await close();
    assert.equal(await panel.evaluate(p => p._source()), original.source, 'Cancelling edited basic/advanced options must preserve the draft');
    await open();
    const search = panel.locator('ha-dialog #entity-search');
    const friendly = await panel.evaluate((p, id) => p._entities.find(entity => entity.entity_id === id).name, fixtures.offRoomEntity);
    await search.fill(friendly.toUpperCase());
    assert.equal(await panel.locator(`ha-dialog [data-entity="${fixtures.offRoomEntity}"]`).count(), 1);
    await search.fill(fixtures.offRoomEntity.toUpperCase());
    await capture('off-room');
    await panel.locator(`ha-dialog [data-entity="${fixtures.offRoomEntity}"]`).tap();
    await panel.locator('ha-dialog #card-form ha-form').waitFor({ state: 'visible' });
    assert.equal(await panel.evaluate(p => p._source()), original.source);
    await panel.locator('ha-dialog #card-form ha-form').evaluate(form => {
      form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ...form.data, name: 'Fixture battery options' } } }));
    });
    await panel.locator('ha-dialog [data-save]').tap();
    await panel.locator('ha-dialog').waitFor({ state: 'detached' });
    const added = await panel.evaluate((p, room) => p._container('page', room).entities.at(-1), room);
    assert.equal(added.entity_id, fixtures.offRoomEntity); assert.equal(added.template, fixtures.specializedCard);
    assert.equal(added.name, 'Fixture battery options');
    const local = await panel.evaluate(p => p._source());
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, saved);
    await open();
    await panel.locator('ha-dialog #entity-search').fill(fixtures.offRoomEntity);
    assert.equal(await panel.locator(`ha-dialog [data-entity="${fixtures.offRoomEntity}"]`).isDisabled(), true);
    await capture('duplicate');
    await close();
    assert.equal(await panel.evaluate(p => p._source()), local);
    await panel.evaluate(p => {
      p.__roomOriginalHass = p._hass; p.__roomMetadataCalls = 0; p.__roomMetadataMode = 'delay';
      const intercept = message => {
        if (message.type !== 'marao_dashboard/config/get') return p.__roomOriginalHass.callWS(message);
        p.__roomMetadataCalls++;
        if (p.__roomMetadataMode === 'fail') return Promise.reject(new Error('Fixture metadata unavailable'));
        if (p.__roomMetadataMode === 'delay') return new Promise(resolve => { p.__roomMetadataRelease = async () => resolve(await p.__roomOriginalHass.callWS(message)); });
        return p.__roomOriginalHass.callWS(message);
      };
      const originalDescriptor = Object.getOwnPropertyDescriptor(p, 'hass');
      const setter = (originalDescriptor || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(p), 'hass')).set;
      p.__roomRestoreHass = () => {
        delete p.hass;
        if (originalDescriptor) Object.defineProperty(p, 'hass', originalDescriptor);
        p.hass = { ...p._hass, callWS: p.__roomOriginalHass.callWS };
        delete p.__roomOriginalHass; delete p.__roomMetadataRelease; delete p.__roomRestoreHass;
      };
      Object.defineProperty(p, 'hass', { configurable: true, set(value) { setter.call(this, { ...value, callWS: intercept }); } });
      p.hass = p._hass;
    });
    await panel.locator(`[data-action="card-add"][data-room="${room}"]:not([data-kind="custom"])`).tap();
    await panel.locator('ha-dialog #by-entity').tap();
    await capture('loading');
    await panel.evaluate((p, room) => { p._openCardGallery(room); p.hass = p._hass; }, room);
    assert.equal(await panel.evaluate(p => p.__roomMetadataCalls), 1);
    assert.equal(await panel.evaluate(p => p._source()), local);
    await panel.evaluate(p => p.__roomMetadataRelease());
    await page.waitForFunction(p => !p._metadataLoading, await panel.elementHandle());
    await close();
    await panel.evaluate(p => { p.__roomMetadataMode = 'fail'; p.__roomMetadataCalls = 0; });
    await open();
    await panel.locator('ha-dialog [data-retry]').waitFor({ state: 'visible' });
    await capture('metadata-error');
    assert.equal(await panel.evaluate(p => p.__roomMetadataCalls), 1);
    await panel.evaluate(p => { p.__roomMetadataMode = 'pass'; });
    await panel.locator('ha-dialog [data-retry]').tap();
    await page.waitForFunction(p => p.__roomMetadataCalls === 2 && !p._metadataLoading, await panel.elementHandle());
    assert.equal(await panel.evaluate(p => p.__roomMetadataCalls), 2);
    assert.equal(await panel.evaluate(p => p._source()), local);
    await close();
    await panel.evaluate(p => p.__roomRestoreHass());
    const empty = await panel.evaluate(p => `${p._model.pages.findIndex(page => page.path === 'empty-room')}:1`);
    await open(empty); await capture('empty-area'); await close();
    const custom = await panel.evaluate(p => `${p._model.pages.findIndex(page => page.path === 'card-test')}:0`);
    await open(custom, 'custom');
    await panel.locator('ha-dialog #entity-search').fill('MARAО-NO-MATCH');
    await capture('custom-search'); await close();
    const beforeArea = await panel.evaluate((p, room) => JSON.stringify(p._container('page', room).entities), room);
    for (const area of [fixtures.areas.find(area => area.room === 'utility-room').area_id, '']) {
      await panel.locator(`[data-action="page-edit"][data-room="${roomIndex}"]`).tap();
      await panel.locator('ha-dialog ha-form').evaluate((form, area) => {
        form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ...form.data, area } } }));
      }, area);
      await capture(area ? 'area-selector' : 'area-cleared');
      await panel.locator('ha-dialog [data-save]').tap();
      await panel.locator('ha-dialog').waitFor({ state: 'detached' });
      assert.equal(await panel.evaluate((p, room) => JSON.stringify(p._container('page', room).entities), room), beforeArea);
      assert.equal(await panel.evaluate((p, room) => p._model.pages[Number(room.split(':')[0])].area || '', room), area);
    }
  } catch (error) {
    fs.writeFileSync(path.join(output, `${scenario.name}-${theme}-rooms-failure.txt`), error.stack || error.message, { mode: 0o600 });
    throw error;
  } finally {
    await panel.evaluate((p, original) => {
      p.__roomRestoreHass?.();
      p._model = original.model; p._jsonDraft = original.source;
      p._setEditorSource(original.source); p._dirty = original.dirty;
      p._renderVisual(); p._updateHeader();
    }, original);
    assert.equal(await panel.evaluate(p => p._source()), original.source, 'Room cleanup must restore the exact original draft');
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, saved);
  }
}

async function entityGroupEditorChecks(page, panel, client, config, originalBytes, scenario, theme, persist) {
  const saved = (await client.call({ type: 'marao_dashboard/config/get' })).config;
  const original = await panel.evaluate(p => ({ model: p._model, source: p._source(), dirty: p._dirty }));
  let savedDraft;
  const home = await panel.evaluate(p => window.__groupHome = `${p._model.pages.findIndex(page => page.path === 'overview')}:1`);
  const close = async () => { await panel.locator('ha-dialog [data-close]').tap(); await panel.locator('ha-dialog').waitFor({ state: 'detached' }); };
  const form = async value => panel.locator('ha-dialog #group-form ha-form').evaluate((form, value) => {
    form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ...form.data, ...value } } }));
  }, value);
  const capture = async name => {
    await panel.locator('ha-dialog #entity-search').fill('marao_dashboard_test_');
    await applyVisualPreferences(page, scenario, theme);
    const dialog = panel.locator('ha-dialog');
    await dialog.evaluate(async element => {
      const modal = element.shadowRoot.querySelector('wa-dialog').shadowRoot.querySelector('dialog');
      await Promise.all(modal.getAnimations().map(animation => animation.finished));
      element.shadowRoot.querySelector('.body').scrollTop = 0;
    });
    assert.deepEqual(await dialog.evaluate(element => {
      const issues = [];
      for (const control of element.querySelectorAll('.gallery-card, #entity-search, .row-actions ha-icon-button, .dialog-actions ha-button')) {
        const box = control.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        if (box.width < 48 || box.height < 48 || box.left < -.5 || box.right > innerWidth + .5) issues.push('Group editor control is too small or overflows');
      }
      for (const row of element.querySelectorAll('.entity-row')) if (row.scrollWidth > row.clientWidth + 1) issues.push('Group member row overflows');
      return issues;
    }), []);
    await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-groups-${name}.png`), scale: 'css' });
    await dialog.evaluate(element => { const body = element.shadowRoot.querySelector('.body'); body.scrollTop = body.scrollHeight; });
    await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-groups-${name}-bottom.png`), scale: 'css' });
  };
  try {
    assert.equal(original.dirty, false, 'Displayed defaults must start clean');
    await panel.locator(`[data-action="card-add"][data-kind="page"][data-room="${home}"]`).tap();
    await panel.locator('ha-dialog [data-card="hc_entity_group_card"]').tap();
    await panel.locator('ha-dialog #by-type').waitFor({ state: 'detached' });
    await page.waitForFunction(p => !p._metadataLoading, await panel.elementHandle());
    await capture('new');
    assert.equal(await panel.evaluate(p => p._source()), original.source);
    for (const id of ['light.marao_dashboard_test_light', 'light.marao_dashboard_test_onoff_light']) {
      await panel.locator('ha-dialog #entity-search').fill(id);
      await tapDialogCandidate(panel.locator(`ha-dialog [data-entity="${id}"]`));
      assert.equal(await panel.locator(`ha-dialog [data-entity="${id}"]`).isDisabled(), true);
    }
    await panel.locator('ha-dialog [data-action="member-up"][data-room="1"]').tap();
    await capture('ordered');
    await form({ entity_type: 'cover', name: 'Fixture group · Blinds' });
    await panel.locator('ha-dialog [data-save]').tap();
    assert.ok(await panel.locator('ha-dialog #group-error').textContent());
    assert.equal(await panel.evaluate(p => p._source()), original.source);
    await capture('incompatible');
    await panel.locator('ha-dialog [data-action="member-delete"][data-room="1"]').tap();
    await panel.locator('ha-dialog [data-action="member-delete"][data-room="0"]').tap();
    const cover = 'cover.marao_dashboard_test_cover';
    await panel.locator('ha-dialog #entity-search').fill(cover);
    await tapDialogCandidate(panel.locator(`ha-dialog [data-entity="${cover}"]`));
    await panel.locator('ha-dialog [data-action="member-edit"]').tap();
    await panel.locator('ha-dialog #group-form').waitFor({ state: 'detached' });
    await panel.locator('ha-dialog #card-form ha-form').evaluate(form => form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ...form.data, name: 'Configured blind' } } })));
    await panel.locator('ha-dialog [data-save]').tap();
    await panel.locator('ha-dialog #card-form').waitFor({ state: 'detached' });
    await panel.locator('ha-dialog #group-form ha-form').waitFor({ state: 'visible' });
    await capture('options');
    assert.equal(await panel.evaluate(p => p._source()), original.source);
    await panel.locator('ha-dialog [data-save]').tap();
    await panel.locator('ha-dialog').waitFor({ state: 'detached' });
    const group = await panel.evaluate(p => p._container('page', window.__groupHome).entities.at(-1));
    assert.match(group.id, /^group-[a-f0-9]{32}$/);
    assert.equal(group.entities[0].name, 'Configured blind');
    const index = await panel.evaluate(p => p._container('page', window.__groupHome).entities.length - 1);
    await panel.locator(`[data-action="card-edit"][data-kind="page"][data-room="${home}"][data-card="${index}"]`).tap();
    await form({ name: 'Cancelled rename' }); await close();
    assert.equal(await panel.evaluate(p => p._container('page', window.__groupHome).entities.at(-1).name), group.name);
    const draft = await panel.evaluate(p => p._source());
    await panel.evaluate(async p => { await p._switchTab('json'); });
    await panel.evaluate(async p => { await p._switchTab('visual'); });
    assert.equal(await panel.evaluate(p => p._source()), draft);
    if (persist) {
      savedDraft = draft;
      await panel.locator('#save').tap();
      await page.waitForFunction(p => !p._busy && !p._dirty, await panel.elementHandle());
      assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), JSON.parse(draft));
      await page.reload(); panel = await ready(page, config, { navigate: false });
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), JSON.parse(draft));
    } else {
      if (!await panel.locator('#discard').isVisible()) await panel.locator('.secondary-actions summary').tap();
      page.once('dialog', dialog => dialog.accept());
      await panel.locator('#discard').tap();
      await page.waitForFunction(p => !p._busy && !p._dirty, await panel.elementHandle());
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), JSON.parse(original.source));
    }
    console.log(`Entity Group editor ${scenario.name}/${theme}: explicit type resolution, member options, cancel and round trip passed.`);
  } finally {
    const current = (await client.call({ type: 'marao_dashboard/config/get' })).config;
    assert.ok(current === saved || (savedDraft && JSON.stringify(JSON.parse(current)) === JSON.stringify(JSON.parse(savedDraft))), 'Concurrent source change; retained private backup');
    if (savedDraft) {
      await client.call({ type: 'marao_dashboard/config/generate', config: saved });
      ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json'), originalBytes);
      assert.ok(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json')).equals(originalBytes));
      await page.reload(); await ready(page, config, { navigate: false });
    } else await panel.evaluate((p, original) => { p._model = original.model; p._dirty = original.dirty; p._jsonDraft = original.source; p._monaco?.setValue(original.source); p._renderVisual(); p._updateHeader(); }, original);
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, saved);
  }
}

async function independentRoomPersistence(page, panel, config, client, original, reconnected) {
  const before = (await client.call({ type: 'marao_dashboard/config/get' })).config;
  const baseline = JSON.parse(before), allowed = new Set([JSON.stringify(baseline)]);
  const roomIndex = baseline.pages.findIndex(page => page.path === 'living-room');
  const room = `${roomIndex}:1`;
  const section = baseline.pages[roomIndex].sections[1];
  const removed = Object.values(section.entities).flat()[0].entity_id;
  assert.match(removed, /^light\.marao_dashboard_test_/);
  const save = async () => {
    const source = await panel.evaluate(p => p._source());
    allowed.add(JSON.stringify(JSON.parse(source)));
    await panel.locator('#save').tap();
    await page.waitForFunction(p => !p._busy && !p._dirty, await panel.elementHandle());
    const saved = JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config);
    assert.deepEqual(saved, JSON.parse(source));
    return saved;
  };
  try {
    await panel.locator(`[data-action="card-delete"][data-kind="page"][data-room="${room}"][data-card="0"]`).tap();
    await save();
    const generated = await client.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
    const ordinaryCards = value => {
      if (Array.isArray(value)) return value.flatMap(ordinaryCards);
      if (!value || typeof value !== 'object' || value.type === 'custom:marao-popup-card' || value.template === 'hc_entity_group_card') return [];
      return [value, ...ordinaryCards(value.cards || [])];
    };
    assert.ok(!ordinaryCards(generated.views.find(view => view.path === 'living-room')).some(card => card.entity === removed));
    assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config).pages[0], baseline.pages[0]);
    await page.goto('about:blank');
    client.close();
    await require('../ha-test/prepare').restart(config);
    client = await connect(config);
    reconnected(client);
    panel = await ready(page, config);
    assert.ok(!await panel.evaluate((p, { room, removed }) => p._container('page', room).entities.some(card => card.entity_id === removed), { room, removed }));
    await panel.locator(`[data-action="card-add"][data-room="${room}"][data-kind="page"]`).tap();
    await panel.locator('ha-dialog #by-entity').tap();
    const candidate = panel.locator(`ha-dialog [data-entity="${removed}"]`);
    await candidate.waitFor({ state: 'visible' }); await candidate.tap();
    await panel.locator('ha-dialog [data-save]').tap();
    await panel.locator('ha-dialog').waitFor({ state: 'detached' });
    const added = await save();
    assert.ok(JSON.stringify(added.pages[roomIndex].sections[1].entities).includes(removed));
    await page.reload(); panel = await ready(page, config, { navigate: false });
    assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), added);
    console.log('Saved room deletion remains absent after regeneration/restart and returns only after explicit Add.');
  } finally {
    const current = JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config);
    assert.ok(allowed.has(JSON.stringify(current)), 'Concurrent source change; retained private backup instead of replacing it');
    await client.call({ type: 'marao_dashboard/config/generate', config: before });
    ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json'), original);
    assert.ok(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json')).equals(original));
    assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), baseline);
    panel = await ready(page, config);
  }
  return client;
}

async function editablePageChecks(page, panel, client, config, originalBytes, scenario, theme, persist) {
  const before = (await client.call({ type: 'marao_dashboard/config/get' })).config;
  const original = await panel.evaluate(p => ({ model: p._model, source: p._source(), dirty: p._dirty }));
  let savedDraft;
  const form = async value => panel.locator('ha-dialog ha-form').first().evaluate((form, value) => {
    form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ...form.data, ...value } } }));
  }, value);
  const saveDialog = async () => { await panel.locator('ha-dialog [data-save]').tap(); await panel.locator('ha-dialog').waitFor({ state: 'detached' }); };
  const capture = async name => {
    await applyVisualPreferences(page, scenario, theme);
    assert.deepEqual(await emulationIssues(page, scenario, theme), []);
    await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-pages-${name}.png`), scale: 'css' });
    assert.deepEqual(await panel.evaluate(p => {
      const issues = [], dialog = p.shadowRoot.querySelector('ha-dialog');
      const root = dialog || p.shadowRoot.querySelector('#page-manager');
      for (const control of root.querySelectorAll('ha-button, ha-icon-button, button')) {
        const box = control.getBoundingClientRect();
        if (box.width && (box.width < 48 || box.height < 48 || box.left < -.5 || box.right > innerWidth + .5)) issues.push(`Page control ${control.localName}/${control.dataset.action || control.id}: ${JSON.stringify(box.toJSON())}; viewport ${innerWidth}`);
      }
      for (const row of root.querySelectorAll('.entity-row, .room-header, .card-heading')) if (row.scrollWidth > row.clientWidth + 1) issues.push('Page row overflows');
      return issues;
    }), []);
    await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-pages-${name}.png`), scale: 'css' });
  };
  try {
    const pins = await panel.evaluate(p => p._navigationEntries().length);
    await panel.locator('#add-page').tap();
    await panel.locator('ha-dialog ha-form').waitFor({ state: 'visible' });
    await form({ template: 'media', name: 'Editable TV', path: 'editable-tv' });
    await capture('create'); await saveDialog();
    const index = await panel.evaluate(p => p._model.pages.findIndex(page => page.path === 'editable-tv'));
    assert.ok(index >= 0);
    assert.equal(await panel.evaluate(p => p._navigationEntries().length), Math.min(5, pins + 1));
    const position = `${index}:0`;
    const initial = await panel.evaluate((p, position) => p._container('page', position).entities.length, position);
    assert.ok(initial > 1, 'Real Media template must expose its editable cards');
    await panel.locator(`[data-action="card-edit"][data-kind="page"][data-room="${position}"][data-card="0"]`).tap();
    await form({ name: 'My editable TV', icon: 'mdi:television-classic' });
    await capture('card-edit'); await saveDialog();
    await panel.locator(`[data-action="card-delete"][data-kind="page"][data-room="${position}"][data-card="${initial - 1}"]`).tap();
    await panel.locator(`[data-action="section-add"][data-room="${index}"]`).tap();
    await panel.locator(`[data-action="card-add"][data-kind="page"][data-room="${index}:1"]`).tap();
    await panel.locator('ha-dialog [data-card="hc_title_card"]').tap();
    await form({ name: 'My second section' }); await saveDialog();
    await panel.locator(`[data-action="page-duplicate"][data-room="${index}"]`).tap();
    const copyIndex = index + 1;
    await panel.locator(`[data-action="page-edit"][data-room="${copyIndex}"]`).tap();
    await form({ name: 'Independent TV', path: 'independent-tv' }); await saveDialog();
    await panel.locator(`[data-action="page-delete"][data-room="${copyIndex}"]`).tap();
    assert.ok((await panel.locator('ha-dialog').evaluate(d => d.headerTitle)).includes('Independent TV'));
    await panel.locator('ha-dialog [data-close]').tap();
    await panel.locator('ha-dialog').waitFor({ state: 'detached' });
    const draft = JSON.parse(await panel.evaluate(p => p._source()));
    const first = draft.pages.find(page => page.path === 'editable-tv'), copy = draft.pages.find(page => page.path === 'independent-tv');
    assert.equal(first.sections[0].entities.length, initial - 1);
    assert.equal(first.sections[0].entities[0].name, 'My editable TV');
    assert.equal(first.sections[1].entities[0].template, 'hc_title_card');
    assert.notEqual(copy.id, first.id);
    assert.notEqual(copy.sections[0].entities[0].id, first.sections[0].entities[0].id);
    await panel.locator(`[data-page-panel="${copyIndex}"]`).scrollIntoViewIfNeeded();
    await capture('duplicate');
    await panel.evaluate(async p => { await p._switchTab('json'); await p._switchTab('visual'); });
    assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), draft);
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, before, 'Local page edits wrote saved JSON');
    if (persist) {
      savedDraft = await panel.evaluate(p => p._source());
      await panel.locator('#save').tap();
      await page.waitForFunction(p => !p._busy, await panel.elementHandle());
      assert.equal(await panel.evaluate(p => p._dirty), false, 'Page save failed');
      assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), draft);
      await page.reload(); panel = await ready(page, config, { navigate: false });
      assert.deepEqual(JSON.parse(await panel.evaluate(p => p._source())), draft);
      await client.call({ type: 'marao_dashboard/config/generate', config: savedDraft });
      assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), draft, 'Repeat generation reinserted removed cards');
      const dashboard = await client.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
      const sheets = path => {
        const hashes = [];
        const visit = value => { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') { if (value.type === 'custom:marao-popup-card') hashes.push(value.hash); Object.values(value).forEach(visit); } };
        visit(dashboard.views.find(view => view.path === path)); return hashes;
      };
      const firstHashes = sheets('editable-tv'), copyHashes = sheets('independent-tv');
      assert.ok(firstHashes.length && copyHashes.length && !firstHashes.some(hash => copyHashes.includes(hash)), 'Duplicated pages share generated sheets');
    }
    console.log(`Editable pages ${scenario.name}/${theme}: creation, card edits/removal, mixed sections, independent duplication, named deletion cancel and round trip passed${persist ? '; save/reload/repeat generation passed' : ''}.`);
  } finally {
    const current = (await client.call({ type: 'marao_dashboard/config/get' })).config;
    assert.ok(current === before || (savedDraft && JSON.stringify(JSON.parse(current)) === JSON.stringify(JSON.parse(savedDraft))), 'Concurrent source change; retained private backup');
    if (savedDraft) {
      await client.call({ type: 'marao_dashboard/config/generate', config: before });
      ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json'), originalBytes);
      assert.ok(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/dashboard.json')).equals(originalBytes));
      await page.reload(); await ready(page, config, { navigate: false });
    } else await panel.evaluate((p, original) => { p._model = original.model; p._dirty = original.dirty; p._jsonDraft = original.source; p._monaco?.setValue(original.source); p._renderVisual(); p._updateHeader(); }, original);
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, before);
  }
}

async function main() {
  const config = readConfig();
  assert.equal(new URL(config.url).hostname, "192.168.0.28");
  assert.equal(config.sshHost, "192.168.0.28");
  if (Object.hasOwn(process.env, 'MARAO_UPGRADE_RECEIPT')) await require('../ha-test/prepare').prepare(config);
  fs.mkdirSync(output, { recursive: true });
  const original = ssh(config, "cat " + quote(config.remoteConfigPath + "/dashboard/MaraoDashboard/dashboard.json"));
  fs.writeFileSync(path.join(output, "source-backup.json"), original, { mode: 0o600 });
  let browser = await chromium.launch();
  let client = await connect(config);
  if (process.argv.includes('--brand')) await nativeBrandImages(config);
  const scenarioName = process.argv.find(arg => arg.startsWith('--scenario='))?.slice(11);
  const runs = scenarioName ? scenarios.filter(s => s.name === scenarioName) : process.argv.includes("--matrix") ? scenarios : scenarios.filter(s => s.name === "iphone-normal");
  assert.ok(runs.length, 'Unknown editor profile');
  const themeName = process.argv.find(arg => arg.startsWith('--theme='))?.slice(8);
  const runThemes = themeName ? themes.filter(theme => theme === themeName) : process.argv.includes('--matrix') || scenarioName ? themes : ['light'];
  assert.ok(runThemes.length, 'Unknown editor theme');
  try {
    if(process.argv.includes("--fold-baseline"))await foldingBaseline(browser,config,runs[0]);
    for (const scenario of runs) for (const theme of runThemes) {
      if (process.argv.includes('--preservation') || process.argv.includes('--rooms')) { await browser.close(); browser = await chromium.launch(); }
      const context = await browser.newContext(contextOptionsForScenario(scenario,theme));
      await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
      const page = await context.newPage();
      await configurePageEmulation(context, page, scenario);
      page.on('framenavigated',frame=>{if(frame===page.mainFrame())fs.appendFileSync(path.join(output,'navigations.jsonl'),JSON.stringify({profile:scenario.name,theme,path:new URL(frame.url()).pathname,time:Date.now()})+'\n');});
      const diagnostics = [];
      const diagnostic=value=>{diagnostics.push(value);fs.writeFileSync(path.join(output,"active-diagnostics.json"),JSON.stringify(diagnostics));};
      page.on("pageerror", e => diagnostic(e.stack || e.message));
      page.on("console", m => { if (["warning", "error"].includes(m.type())) diagnostic(m.text()); });
      page.on("requestfailed", r => diagnostic(r.failure()?.errorText));
      page.on('response', response => { if (response.status() >= 400) diagnostic('HTTP ' + response.status() + ': ' + new URL(response.url()).pathname); });
      let panel = await ready(page, config);
      if (process.argv.includes('--brand')) {
        await brandSidebar(page);
        if (scenario === runs[0]) {
          await page.reload();
          panel = await ready(page, config, { navigate: false });
          await brandSidebar(page);
        }
      }
      await page.locator('home-assistant').evaluate((ha,theme)=>{
        ha.hass.selectedTheme={theme:'Marao Dashboard',dark:theme==='dark'};
        ha._applyTheme(theme==='dark');
      },theme);
      await applyVisualPreferences(page, scenario, theme);
      await panel.evaluate((p,theme)=>{p.hass={...p._hass,themes:{...p._hass.themes,darkMode:theme==='dark'}};},theme);
      if (process.argv.includes('--brand')) {
        await brandHeader(page, panel, theme, scenario, scenario.name + '-' + theme);
        if (scenario === runs[0]) {
          const drawer = page.locator('ha-drawer');
          await drawer.evaluate(async element => { element.open = true; await element.updateComplete; });
          const sidebar = await page.locator('ha-sidebar').elementHandle();
          await page.waitForFunction(element => {
            const box = element.getBoundingClientRect();
            return box.left >= -1 && box.right <= innerWidth + 1;
          }, sidebar);
          await page.screenshot({ path: path.join(output, scenario.name + '-' + theme + '-brand-sidebar.png'), scale: 'css' });
          await drawer.evaluate(async element => { element.open = false; await element.updateComplete; });
          await page.waitForFunction(element => element.getBoundingClientRect().right <= 1, sidebar);
        }
      }
      if (process.argv.includes('--portuguese')) await panel.evaluate(p => {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(p), 'hass').set;
        Object.defineProperty(p, 'hass', { configurable: true, set(value) { setter.call(this, { ...value, language: 'pt' }); } });
        p.hass = p._hass; p._updateHeader();
      });
      if (process.argv.includes('--pages')) await editablePageChecks(page, panel, client, config, original, scenario, theme, scenario === runs[0] && theme === runThemes[0]);
      if (process.argv.includes('--rooms')) await independentRoomChecks(page, panel, client, scenario, theme);
      if (process.argv.includes('--groups')) await entityGroupEditorChecks(page, panel, client, config, original, scenario, theme, process.argv.includes('--groups-save') && scenario === runs[0] && theme === runThemes[0]);
      if (process.argv.includes('--rooms-save') && scenario === runs[0] && theme === runThemes[0]) {
        client = await independentRoomPersistence(page, panel, config, client, original, current => { client = current; });
        panel = await ready(page, config, { navigate: false });
      }
      if (process.argv.includes('--preservation')) await releasedDraftPreservation(page, panel, client, scenario, theme);
      if (process.argv.includes('--energy')) await energyFormatting(page, panel, config, client, original, scenario.name + '-' + theme, scenario === runs[0] && theme === runThemes[0]);
      if (process.argv.includes("--startup") && scenario === runs[0] && theme === runThemes[0]) await startupChecks(page, panel);
      if (process.argv.includes("--delete") && scenario === runs[0] && theme === runThemes[0]) await deletion(page, panel, config, client, original);
      if (process.argv.includes("--fold")) {
        try {await folding(page, panel);}
        catch(error) {fs.writeFileSync(path.join(output,'fold-failure-stage.json'),JSON.stringify(await page.evaluate(()=>({stage:window.__foldStage,path:location.pathname})).catch(()=>({stage:'unavailable'}))));throw error;}
      }
      if (process.argv.includes("--header")) {
        const originalDirty = await panel.evaluate(p => { const dirty = p._dirty; p._dirty = true; p._updateHeader(); return dirty; });
        const before = await panel.evaluate(p => p._source());
        await panel.evaluate(async p => {
          p.shadowRoot.querySelector('.secondary-actions').open = true;
          p._setBusy(true);
          await Promise.all([...p.shadowRoot.querySelectorAll('ha-button')].map(button => button.updateComplete));
          // Flush disabled colors before checking the immediate enabled state.
          getComputedStyle(p.shadowRoot.getElementById('history').shadowRoot.querySelector('button')).backgroundColor;
          p._setBusy(false);
          await Promise.all([...p.shadowRoot.querySelectorAll('ha-button')].map(button => button.updateComplete));
        });
        const geometry = await panel.evaluate(p => {
          const issues = [];
          const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const luminance = color => {
            canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = color; canvas.fillRect(0, 0, 1, 1);
            return [...canvas.getImageData(0, 0, 1, 1).data].slice(0, 3).reduce((sum, channel, index) => {
              const value = channel / 255;
              return sum + (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index];
            }, 0);
          };
          const ink = luminance(getComputedStyle(p.shadowRoot.getElementById('dirty')).color);
          const surface = luminance(getComputedStyle(p.shadowRoot.querySelector('.editor-header')).backgroundColor);
          const contrast = (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05);
          if (contrast < 4.5) issues.push('Draft indication contrast is ' + contrast.toFixed(2) + ':1; expected 4.5:1');
          const expected = parseFloat(getComputedStyle(p.shadowRoot.querySelector('.page')).fontSize);
          const save = p.shadowRoot.getElementById('save').shadowRoot.querySelector('button');
          if(parseFloat(getComputedStyle(save).fontSize)<expected-.5)issues.push('Native button text did not scale');
          const menu = p.shadowRoot.querySelector('.secondary-menu').getBoundingClientRect();
          if (menu.top < save.getBoundingClientRect().bottom - 1) issues.push('Actions menu overlaps Save');
          if (menu.left < 0 || menu.right > innerWidth) issues.push('Actions menu leaves the viewport');
          if (Math.abs(menu.right - p.shadowRoot.querySelector('.secondary-actions summary').getBoundingClientRect().right) > 1) issues.push('Actions menu is detached from its trigger');
          for (const control of p.shadowRoot.querySelectorAll('ha-button')) {
            const button = control.shadowRoot?.querySelector('button');
            if (!button || control.disabled || !button.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) continue;
            const style = getComputedStyle(button);
            const foreground = luminance(style.color), background = luminance(style.backgroundColor);
            const ratio = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
            if (ratio < 4.5) issues.push(control.textContent.trim() + ' contrast is ' + ratio.toFixed(2) + ':1; expected 4.5:1');
          }
          for (const button of p.shadowRoot.querySelectorAll('[data-action="card-delete"]')) {
            const b = button.getBoundingClientRect(); const row=button.closest('.entity-row').getBoundingClientRect();
            if (b.width && (b.width<48 || b.height<48 || b.left<row.left-1 || b.right>row.right+1)) issues.push('Delete target is too small or outside its row');
          }
          const visit = root => { for(const e of root.children){
            if(e.localName==='input' && e.getBoundingClientRect().width && e.getRootNode().host?.localName==='wa-input') {
              if(parseFloat(getComputedStyle(e).fontSize)<expected-.5)issues.push('Native input text did not scale');
            }
            if(e.localName==='ha-combo-box-item' && e.getRootNode().host?.localName==='ha-picker-field' && e.getBoundingClientRect().width) {
              const cs=getComputedStyle(e);
              if(parseFloat(cs.getPropertyValue('--md-list-item-top-space'))<12)issues.push('Native picker label has no text clearance');
              for(const label of e.querySelectorAll('[slot="overline"]')) {
                const style=getComputedStyle(label), bounds=label.getBoundingClientRect(), field=e.getBoundingClientRect();
                if(parseFloat(style.lineHeight)<parseFloat(style.fontSize)*1.1 || bounds.top<field.top-1 || bounds.bottom>field.bottom+1) issues.push('Native picker label text is clipped');
                const text=document.createRange();text.selectNodeContents(label);const textBounds=text.getBoundingClientRect();
                for(let ancestor=label.assignedSlot;ancestor&&ancestor!==e;ancestor=ancestor.assignedSlot||ancestor.parentElement||ancestor.getRootNode()?.host) {
                  const box=ancestor.getBoundingClientRect();
                  if(box.width&&getComputedStyle(ancestor).overflowX==='hidden'&&(textBounds.left<box.left-1||textBounds.right>box.right+1))issues.push('Native picker label has insufficient width');
                }
              }
            }
            if(e.localName==='ha-entity-picker' && e.parentElement?.classList.contains('entity')) {
              const b=e.getBoundingClientRect();const r=e.parentElement.getBoundingClientRect();
              if(b.width && (b.left<r.left-1 || b.right>r.right+1)) issues.push('Native picker overflow');
            }
            if(e.shadowRoot)visit(e.shadowRoot);visit(e);
          }}; visit(p.shadowRoot);
          return issues;
        });
        assert.deepEqual(geometry, []);
        await page.screenshot({ path: path.join(output, scenario.name + '-' + theme + '-menu.png'), scale: 'css' });
        await panel.evaluate(p => { p.shadowRoot.querySelector('.secondary-actions').open = false; });
        const input=panel.locator('#general-form input').first();
        await input.scrollIntoViewIfNeeded(); await input.focus();
        const field=await input.boundingBox();const header=await panel.locator('.editor-header').boundingBox();
        assert.ok(field.y>=header.y+header.height-1,'Focused field is hidden behind the pinned header');
        const bounds = await scrollHeader(panel);
        fs.writeFileSync(path.join(output, scenario.name + "-" + theme + "-bounds.json"), JSON.stringify(bounds));
        await page.screenshot({ path: path.join(output, scenario.name + "-" + theme + ".png"), scale: "css" });
        assert.ok(bounds.every(b => b.top >= b.hostTop - 1 && (b.scroll === 0 || b.top <= b.hostTop + 1) && b.bottom < b.hostBottom - 48), "Pinned header must remain visible and leave usable form space");
        await panel.locator('.secondary-actions summary').click();
        assert.equal(await panel.locator('#open-dashboard').getAttribute('target'), '_blank');
        await panel.locator('#history').click();
        await panel.locator('ha-dialog [data-close]').waitFor({state:'visible'});
        await page.waitForFunction(p=>p.shadowRoot.querySelector('ha-dialog')?.shadowRoot.querySelector('wa-dialog')?.shadowRoot.querySelector('dialog')?.matches(':modal'),await panel.elementHandle());
        assert.equal(await panel.locator('ha-dialog').evaluate(d=>d.headerTitle),'History');
        await panel.locator('ha-dialog').evaluate(async d=>{
          const modal=d.shadowRoot.querySelector('wa-dialog').shadowRoot.querySelector('dialog');
          await Promise.all(modal.getAnimations().map(a=>a.finished));
          const close=d.shadowRoot.querySelector('ha-icon-button').getBoundingClientRect();
          if(close.width<48||close.height<48)throw new Error('Dialog close target is too small');
        });
        await panel.locator('ha-dialog [data-close]').click();
        await panel.locator('ha-dialog').waitFor({state:'detached'});
        await panel.locator('[data-tab="json"]').click();
        await panel.evaluate(p=>new Promise(resolve=>{const timer=setInterval(()=>{if(p._tab==='json'){clearInterval(timer);resolve();}},50);}));
        const jsonBounds=await scrollHeader(panel,true);
        assert.ok(jsonBounds.every(b=>b.top>=b.hostTop-1 && b.bottom<b.hostBottom-48));
        const jsonResult=await panel.evaluate(p=>{
          const value=p._monaco.getValue();p._monaco.setPosition({lineNumber:5,column:1});
          p._monaco.setScrollTop(300);return {value,scroll:p._monaco.getScrollTop(),position:p._monaco.getPosition()};
        });
        assert.equal(jsonResult.value,before); assert.ok(jsonResult.scroll>0);
        await panel.evaluate(p=>{
          p._setBusy(true);
          if (!p.shadowRoot.getElementById('save').disabled || !p.shadowRoot.getElementById('history').disabled) throw new Error('Busy actions remain enabled');
          p._setBusy(false);
          const valid=p._monaco.getValue();p._monaco.setValue('{ invalid');
          return p._switchTab('visual').then(()=>{
            if(p._tab!=='json'||!p.shadowRoot.getElementById('status').textContent)throw new Error('Invalid JSON escaped protection');
            p._setEditorSource(valid);
          });
        });
        await panel.locator('[data-tab="visual"]').click();
        assert.equal(await panel.evaluate(p=>p._source()),before);
        // The actual affected room rows, with the pinned controls in view.
        await panel.locator('[data-action="card-delete"]').first().scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(output,scenario.name+'-'+theme+'-rows.png'),scale:'css'});
        await panel.evaluate((p, dirty) => { p._dirty = dirty; p._updateHeader(); }, originalDirty);
      }
      await page.screenshot({ path: path.join(output, scenario.name + "-" + theme + ".png"), scale: "css" });
      if(process.argv.includes('--surfaces')) {
        for(const id of ['general-form','page-manager','navbar-list']) {
          await panel.locator('#'+id).scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(output,scenario.name+'-'+theme+'-'+id+'.png'),scale:'css'});
        }
        const custom=panel.locator('#page-manager [data-kind="page"][data-action="card-delete"]').last();
        await custom.scrollIntoViewIfNeeded();
        const customBounds=await custom.boundingBox();
        assert.ok(customBounds.width>=48&&customBounds.height>=48,'Custom-page Delete target is too small');
        await page.screenshot({path:path.join(output,scenario.name+'-'+theme+'-custom-rows.png'),scale:'css'});
        await panel.locator('.secondary-actions summary').click();
        await page.screenshot({path:path.join(output,scenario.name+'-'+theme+'-menu.png'),scale:'css'});
        await panel.locator('#history').click();
        await panel.locator('ha-dialog [data-close]').waitFor({state:'visible'});
        await page.waitForFunction(p=>p.shadowRoot.querySelector('ha-dialog')?.shadowRoot.querySelector('wa-dialog')?.shadowRoot.querySelector('dialog')?.open,await panel.elementHandle());
        await panel.locator('ha-dialog').evaluate(async d=>{
          const modal=d.shadowRoot.querySelector('wa-dialog').shadowRoot.querySelector('dialog');
          await Promise.all(modal.getAnimations().map(a=>a.finished));
        });
        await page.screenshot({path:path.join(output,scenario.name+'-'+theme+'-history.png'),scale:'css'});
        await panel.locator('ha-dialog [data-close]').click();
        await panel.locator('ha-dialog').waitFor({state:'detached'});
        await feedbackChecks(page,panel,scenario,theme);
      }
      if(process.argv.includes('--feedback') && !process.argv.includes('--surfaces'))await feedbackChecks(page,panel,scenario,theme);
      fs.writeFileSync(path.join(output, scenario.name + "-" + theme + "-diagnostics.json"), JSON.stringify(diagnostics));
      assert.equal(diagnostics.length, 0, "Browser diagnostics found; inspect private editor artifacts");
      if(process.argv.includes("--weather"))await weatherChecks(context,scenario,theme,config);
      await context.close();
      console.log("Editor checked: " + scenario.name + " (" + theme + ")");
    }
    if (process.argv.includes("--startup")) for (const file of ["MaraoDashboardJsonEditor.js", "MaraoDashboardJsonEditor.css", "MaraoDashboardJsonWorker.js"]) await assetRetry(browser, config, runs[0], file);
  } finally { client.close(); await browser.close(); }
}

if (require.main === module) main().catch(error => { fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, "failure.txt"), error.stack || error.message); console.error(error.message); process.exitCode = 1; });
module.exports = { scrollHeader };
