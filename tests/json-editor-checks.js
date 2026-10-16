const { capture: captureScreenshot } = require('./verification-browser');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

async function geometry(panel) {
  const result = await panel.evaluate(p => {
    const root = p.shadowRoot, editor = p._monaco;
    const line = root.querySelector('.view-lines');
    return {
      font: getComputedStyle(line).fontFamily,
      lineHeight: editor.getTopForLineNumber(2) - editor.getTopForLineNumber(1),
      custom: root.querySelectorAll('.marao-fold-button,.json-find-host,.json-problems,#json-tools').length,
      native: Boolean(root.querySelector('.monaco-editor .margin-view-overlays .codicon-folding-expanded')),
      controls: [...root.querySelectorAll('#save,.tab')].map(control => { const r = control.getBoundingClientRect(); return { width: r.width, height: r.height }; }),
    };
  });
  assert.match(result.font, /monospace|Menlo|Monaco|Consolas|Courier/i);
  assert.ok(result.lineHeight > 0 && result.lineHeight < 30, 'Stock Monaco line density was overridden');
  assert.equal(result.custom, 0, 'Custom editor presentation remains');
  assert.ok(result.controls.every(control => control.width >= 48 && control.height >= 48));
}

async function clickFold(page, panel, line) {
  await panel.evaluate((p, line) => { p._monaco.setPosition({ lineNumber: line, column: 1 }); p._monaco.revealLineInCenter(line); }, line);
  await page.waitForFunction(({ p, line }) => {
    const editor = p._monaco, position = editor.getScrolledVisiblePosition({ lineNumber: line, column: 1 });
    const top = editor.getDomNode().getBoundingClientRect().top + position.top;
    return [...p.shadowRoot.querySelectorAll('.margin-view-overlays .codicon')].some(icon => Math.abs(icon.getBoundingClientRect().top - top) < 3);
  }, { p: await panel.elementHandle(), line }, { timeout: 5000 });
  const index = await panel.evaluate((p, line) => {
    const root = p.shadowRoot, editor = p._monaco;
    const top = editor.getDomNode().getBoundingClientRect().top + editor.getScrolledVisiblePosition({ lineNumber: line, column: 1 }).top;
    return [...root.querySelectorAll('.margin-view-overlays .codicon')].findIndex(icon => Math.abs(icon.getBoundingClientRect().top - top) < 3);
  }, line);
  assert.ok(index >= 0, 'Native Monaco gutter arrow missing');
  await panel.locator('.margin-view-overlays .codicon').nth(index).click();
}

async function jsonEditorChecks(page, panel, { output, scenario, theme, client, config, persist = false, geometryOnly = false }) {
  const mac = await page.evaluate(() => /Macintosh|iPhone|iPad/.test(navigator.userAgent));
  const android = await page.evaluate(() => /Android/.test(navigator.userAgent));
  const workers = [];
  const workerStarted = worker => workers.push(worker.url());
  page.on('worker', workerStarted);
  const source = JSON.stringify(require('../ha-test/json-editor-example.json'), null, 2) + '\n';
  await panel.locator('[data-tab="json"]').tap();
  await page.waitForFunction(p => p._tab === 'json' && p._jsonAssistance, await panel.elementHandle());
  assert.equal(workers.filter(url => url.includes('MaraoDashboardJsonWorker.js')).length, 1, 'Initial JSON opening created duplicate workers');
  assert.equal(await page.locator('body > .monaco-aria-container').count(), 0, 'JSON announcements escaped their styled shadow root');
  assert.equal(await panel.locator('.monaco-aria-container').count(), 1);
  const baseline = await panel.evaluate(p => ({ source: p._monaco.getValue(), dirty: p._dirty }));
  await panel.evaluate(p => {
    const own = Object.getOwnPropertyDescriptor(p, 'hass'), descriptor = own || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(p), 'hass');
    let last = p._hass;
    p._jsonTestMutations = [];
    Object.defineProperty(p, 'hass', { configurable: true, set(value) {
      last = value;
      descriptor.set.call(this, { ...value,
        callWS(message) { if (message.type === 'marao_dashboard/config/generate' || message.type === 'call_service') p._jsonTestMutations.push(message.type); return value.callWS(message); },
        callService(...args) { p._jsonTestMutations.push('call_service'); throw new Error('JSON editing dispatched an entity service'); },
      });
    } });
    p.hass = last;
    p._restoreJsonMonitor = () => { if (own) Object.defineProperty(p, 'hass', own); else delete p.hass; descriptor.set.call(p, last); };
  });
  const setSource = async value => {
    await panel.evaluate((p, value) => p._monaco.setValue(value), value);
    await page.waitForFunction(p => p.shadowRoot.getElementById('monaco').getAttribute('aria-busy') === 'false', await panel.elementHandle());
  };
  const text = () => panel.evaluate(p => p._monaco.getValue());
  const command = async id => panel.evaluate((p, id) => { p._monaco.focus(); p._monaco.trigger('test', id, null); }, id);
  const folded = async line => page.waitForFunction(({ p, line }) => p._monaco.getTopForLineNumber(line + 2) === p._monaco.getTopForLineNumber(line), { p: await panel.elementHandle(), line });
  try {
    await setSource(source);
    const foldLine = await panel.evaluate(p => {
      const model = p._monaco.getModel();
      return model.findMatches('"entities": [', false, false, false, null, false)[0].range.startLineNumber;
    });
    await geometry(panel);
    await clickFold(page, panel, foldLine); await folded(foldLine);
    assert.equal(await text(), source);
    if (geometryOnly) {
      await captureScreenshot(page, { path: path.join(output, `${scenario.name}-${theme}-json-geometry.png`), scale: 'css' });
      return;
    }
    const sibling = await panel.evaluate(async (p, line) => {
      const editor = p._monaco, model = editor.getModel(), worker = await (await p._jsonModule.getWorker())(model.uri);
      const ranges = await worker.getFoldingRanges(model.uri.toString(), {}), region = ranges.find(range => range.startLine === line - 1);
      const next = ranges.find(range => range.startLine > region.endLine && range.endLine > range.startLine);
      return next && { start: next.startLine + 1, end: next.endLine + 1, height: editor.getTopForLineNumber(next.endLine + 1) - editor.getTopForLineNumber(next.startLine + 1) };
    }, foldLine);
    assert.ok(sibling && sibling.height > 0, 'Folding hid an independent sibling');
    await command('actions.find');
    const find = panel.locator('.monaco-editor .find-part .monaco-inputbox .input');
    await find.fill('Searchable');
    await page.waitForFunction(p => /3/.test(p.shadowRoot.querySelector('.matchesCount')?.textContent || ''), await panel.elementHandle());
    await panel.locator('.monaco-editor .codicon-find-next-match').tap();
    await page.waitForFunction(({ p, line }) => p._monaco.getTopForLineNumber(line + 2) > p._monaco.getTopForLineNumber(line), { p: await panel.elementHandle(), line: foldLine });
    await geometry(panel);
    await panel.locator('.monaco-editor .codicon-find-previous-match').tap();
    assert.equal(await text(), source);
    await find.fill('no-such-safe-value');
    await page.waitForFunction(p => /Sem resultados|No results/.test(p.shadowRoot.querySelector('.matchesCount')?.textContent || ''), await panel.elementHandle());
    await find.fill('Searchable');
    await command('editor.action.startFindReplaceAction');
    const replace = panel.locator('.monaco-editor .replace-part .monaco-inputbox .input');
    await panel.locator('.monaco-editor .codicon-find-selection').tap();
    await page.waitForFunction(p => /1/.test(p.shadowRoot.querySelector('.matchesCount')?.textContent || ''), await panel.elementHandle());
    await replace.fill('Scoped');
    await panel.locator('.monaco-editor .codicon-find-replace-all').tap();
    await page.waitForFunction(p => p._monaco.getValue().includes('Scoped'), await panel.elementHandle());
    assert.equal((await text()).match(/Scoped/g).length, 1, 'Selection scope replaced more than one match');
    await command('undo');
    await page.waitForFunction(({ p, source }) => p._monaco.getValue() === source, { p: await panel.elementHandle(), source });
    await panel.locator('.monaco-editor .codicon-find-selection').tap();
    await replace.fill('Changed'); await geometry(panel);
    await panel.locator('.monaco-editor .codicon-find-replace-all').tap();
    await page.waitForFunction(p => p._monaco.getValue().includes('Changed raw card'), await panel.elementHandle());
    assert.equal(await text(), source.replaceAll('Searchable', 'Changed'));
    await command('undo');
    await page.waitForFunction(({ p, source }) => p._monaco.getValue() === source, { p: await panel.elementHandle(), source });
    await panel.locator('.monaco-editor .codicon-widget-close').tap();
    await panel.evaluate(p => p._monaco.focus());
    await page.keyboard.press(mac ? 'Meta+f' : 'Control+f');
    await find.waitFor({ state: 'visible' });
    await panel.locator('.monaco-editor .codicon-widget-close').tap();
    await panel.evaluate(p => p._monaco.focus());
    await page.keyboard.press(mac ? 'Meta+Alt+f' : 'Control+h');
    await replace.waitFor({ state: 'visible' });
    await panel.locator('.monaco-editor .codicon-widget-close').tap();

    const completionSource = source.replace('"enable_slider": false,', '');
    await setSource(completionSource);
    const completions = await panel.evaluate(async p => {
      const model = p._monaco.getModel();
      const match = model.findMatches('"variables": {', false, false, false, null, false)[0].range;
      const position = { lineNumber: match.endLineNumber, column: match.endColumn };
      p._monaco.setPosition(position); p._monaco.revealPositionInCenter(position);
      const worker = await (await p._jsonModule.getWorker())(model.uri);
      const result = await worker.doComplete(model.uri.toString(), { line: position.lineNumber - 1, character: position.column - 1 });
      return result.items.map(item => item.label);
    });
    assert.ok(completions.includes('enable_slider'));
    assert.ok(!completions.includes('event_provider'), 'Camera-only options suggested for a light');
    await command('editor.action.triggerSuggest');
    const suggestion = panel.locator('.suggest-widget .monaco-list-row').filter({ hasText: 'enable_slider' }).first();
    await suggestion.waitFor({ state: 'visible' }); await geometry(panel); await suggestion.tap();
    const valueSuggestion = panel.locator('.suggest-widget .monaco-list-row').filter({ hasText: /^false$/ }).first();
    await valueSuggestion.waitFor({ state: 'visible' }); await valueSuggestion.tap();
    await page.waitForFunction(p => { try { return JSON.parse(p._monaco.getValue()).pages[0].sections[0].entities[0].variables.enable_slider !== undefined; } catch { return false; } }, await panel.elementHandle());
    const accepted = JSON.parse(await text()), expected = JSON.parse(source);
    assert.equal(typeof accepted.pages[0].sections[0].entities[0].variables.enable_slider, 'boolean');
    accepted.pages[0].sections[0].entities[0].variables.enable_slider = false;
    assert.deepEqual(accepted, expected, 'Completion changed neighboring unknown/raw/empty/ordered command data');
    const completedText = await text(), beforeStart = completionSource.indexOf('"variables": {'), afterStart = completedText.indexOf('"variables": {');
    assert.equal(completionSource.slice(0, beforeStart), completedText.slice(0, afterStart));
    assert.equal(completionSource.slice(completionSource.indexOf('}', beforeStart) + 1), completedText.slice(completedText.indexOf('}', afterStart) + 1));

    const dynamic = JSON.parse(source); dynamic.pages[0].path = 'renamed-studio'; dynamic.landing_page = '';
    dynamic.pages[0].sections[0].entities[0].entity_id = '';
    await setSource(JSON.stringify(dynamic, null, 2) + '\n');
    await page.waitForTimeout(200);
    const hints = await panel.evaluate(async p => {
      const model = p._monaco.getModel(), worker = await (await p._jsonModule.getWorker())(model.uri);
      const complete = async key => { const match = model.findMatches(`"${key}": ""`, false, false, false, null, false)[0].range;
        return (await worker.doComplete(model.uri.toString(), { line: match.startLineNumber - 1, character: match.endColumn - 2 })).items.map(item => item.label); };
      return { page: await complete('landing_page'), entity: await complete('entity_id') };
    });
    assert.ok(hints.page.some(label => label.includes('renamed-studio')));
    assert.ok(hints.entity.some(label => label.includes('light.marao_dashboard_test_')));
    assert.ok(!hints.entity.some(label => label.includes('remote.')));

    await setSource(source);
    await clickFold(page, panel, foldLine); await folded(foldLine);
    const session = await panel.evaluate(p => ({ id: p._monaco.getModel().id, view: p._monaco.saveViewState(), scroll: p._monaco.getScrollTop(), dirty: p._dirty }));
    const workerCount = workers.length;
    await panel.locator('[data-tab="visual"]').tap(); await panel.locator('[data-tab="json"]').tap();
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await text(), source);
    assert.equal(await panel.evaluate(p => p._monaco.getModel().id), session.id);
    await folded(foldLine);
    assert.ok(Math.abs(await panel.evaluate(p => p._monaco.getScrollTop()) - session.scroll) < 2, 'Unchanged tab switch lost scroll position');
    assert.deepEqual(await panel.evaluate(p => p._monaco.getSelections().map(selection => ({ line: selection.positionLineNumber, column: selection.positionColumn }))), session.view.cursorState.map(state => ({ line: state.position.lineNumber, column: state.position.column })));
    assert.equal(workers.length, workerCount, 'Unchanged tab switch recreated workers');
    await panel.evaluate((p, line) => p._monaco.setPosition({ lineNumber: line, column: 1 }), foldLine);
    await command('editor.unfold');
    await page.waitForFunction(({ p, line }) => p._monaco.getTopForLineNumber(line + 2) > p._monaco.getTopForLineNumber(line), { p: await panel.elementHandle(), line: foldLine });
    await command('editor.fold');
    await page.waitForFunction(({ p, line }) => p._monaco.getTopForLineNumber(line + 2) === p._monaco.getTopForLineNumber(line), { p: await panel.elementHandle(), line: foldLine });
    await panel.evaluate(p => p._monaco.focus());
    await page.keyboard.press(mac ? 'Meta+Alt+BracketRight' : 'Control+Shift+BracketRight');
    await page.waitForFunction(({ p, line }) => p._monaco.getTopForLineNumber(line + 2) > p._monaco.getTopForLineNumber(line), { p: await panel.elementHandle(), line: foldLine });
    await setSource(JSON.stringify(JSON.parse(source)));
    const compact = await text(); await panel.evaluate(p => p._monaco.getAction('editor.action.formatDocument').run());
    await page.waitForFunction(({ p, source }) => p._monaco.getValue().trim() === source.trim(), { p: await panel.elementHandle(), source });
    await panel.locator('[data-tab="visual"]').tap(); await panel.locator('[data-tab="json"]').tap();
    await command('undo'); assert.equal(await text(), compact);
    await command('redo'); assert.equal((await text()).trim(), source.trim());
    await setSource(source);
    await panel.evaluate(p => {
      const editor = p._monaco, match = editor.getModel().findMatches('Searchable first light', false, false, false, null, false)[0];
      editor.setSelection(match.range); editor.revealRangeInCenter(match.range); editor.focus();
      window.__jsonInputTrace = [];
      const input = p.shadowRoot.querySelector('#monaco textarea.inputarea');
      for (const type of ['keydown', 'beforeinput', 'input']) input.addEventListener(type, event => window.__jsonInputTrace.push({ type, key: event.key, data: event.data, inputType: event.inputType, value: input.value, start: input.selectionStart, end: input.selectionEnd }));
    });
    const selectionReady = async () => page.waitForFunction(({ p, android }) => {
      const input = p.shadowRoot.querySelector('#monaco textarea.inputarea');
      return android ? p.shadowRoot.activeElement === input && p._monaco.getModel().getValueInRange(p._monaco.getSelection()) === 'Searchable first light'
        : input.value.slice(input.selectionStart, input.selectionEnd) === 'Searchable first light';
    }, { p: await panel.elementHandle(), android });
    await selectionReady();
    await page.keyboard.type('TypedSafeLight');
    assert.equal(await text(), source.replace('Searchable first light', 'TypedSafeLight'));
    await page.keyboard.press(mac ? 'Meta+z' : 'Control+z');
    await page.waitForFunction(({ p, source }) => p._monaco.getValue() === source, { p: await panel.elementHandle(), source });
    await selectionReady();
    await panel.evaluate(p => { const input = p.shadowRoot.querySelector('#monaco textarea.inputarea'), data = new DataTransfer(); data.setData('text/plain', 'Pasted safe light'); input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); });
    assert.equal(await text(), source.replace('Searchable first light', 'Pasted safe light'));
    await page.keyboard.press(mac ? 'Meta+z' : 'Control+z');
    await page.waitForFunction(({ p, source }) => p._monaco.getValue() === source, { p: await panel.elementHandle(), source });
    await setSource(source.replace('"enable_slider": false', '"enable_slider": "bad"'));
    await clickFold(page, panel, foldLine); await folded(foldLine);
    await panel.evaluate(p => p._monaco.focus()); await page.keyboard.press('F8');
    await panel.locator('.zone-widget .message').first().waitFor({ state: 'visible' });
    await page.waitForFunction(({ p, line }) => p._monaco.getTopForLineNumber(line + 2) > p._monaco.getTopForLineNumber(line), { p: await panel.elementHandle(), line: foldLine });
    assert.equal(await panel.evaluate(p => p._monaco.getSelection().startLineNumber), source.split('\n').findIndex(line => line.includes('"enable_slider": false')) + 1);
    await page.keyboard.press('Escape');
    await setSource(source);
    await page.waitForFunction(p => !p.shadowRoot.querySelector('.squiggly-error,.squiggly-warning'), await panel.elementHandle());
    await setSource('{ invalid JSON');
    await panel.locator('[data-tab="visual"]').tap(); assert.equal(await panel.evaluate(p => p._tab), 'json');
    await panel.locator('#save').tap(); assert.equal(await text(), '{ invalid JSON');
    assert.deepEqual(await panel.evaluate(p => p._jsonTestMutations), [], 'Assistance dispatched a service or saved automatically');
    await setSource(source);
    await panel.evaluate(async p => {
      const original = p._hass, source = p._monaco.getValue();
      try {
        p._hass = { ...original, callWS: async message => {
          if (message.type === 'marao_dashboard/config/generate') throw new Error('Injected JSON save failure');
          return original.callWS(message);
        } };
        await p._save();
        if (p._monaco.getValue() !== source || !p._dirty || !p.shadowRoot.getElementById('status').textContent.includes('Injected JSON save failure')) throw new Error('Save failure lost the JSON draft');
      } finally { p._hass = original; }
      p._setStatus('', '');
    });
    await panel.locator('[data-tab="visual"]').tap();
    await panel.evaluate(p => { p._model.name = 'Changed in Visual'; p._setDirty(); p._renderVisual(); });
    await panel.locator('[data-tab="json"]').tap();
    assert.equal(JSON.parse(await text()).name, 'Changed in Visual', 'Changed Visual source was not synchronized');
    page.once('dialog', dialog => dialog.accept());
    await panel.evaluate(p => p._discard());
    await page.waitForFunction(p => !p._loading && !p._busy && !p._dirty, await panel.elementHandle());
    assert.deepEqual(JSON.parse(await text()), JSON.parse(baseline.source), 'Explicit Discard retained the old JSON draft');
    await setSource(source);
    if (scenario.name === 'iphone-normal' || scenario.name === 'android-normal') {
      const viewport = page.viewportSize();
      try {
        await page.setViewportSize({ width: viewport.width, height: 420 });
        await command('actions.find'); await find.fill('Searchable');
        await geometry(panel);
        await panel.locator('#save').scrollIntoViewIfNeeded();
        assert.ok(await panel.locator('#save').isVisible());
        await captureScreenshot(page, { path: path.join(output, `${scenario.name}-${theme}-json-keyboard-space.png`), scale: 'css' });
        await panel.locator('.monaco-editor .codicon-widget-close').tap();
      } finally { await page.setViewportSize(viewport); }
    }
    assert.deepEqual(await panel.evaluate(p => {
      const root=p.shadowRoot, save=root.getElementById('save'), box=save.getBoundingClientRect(), failures=[];
      for (const x of [box.left+4,box.left+box.width/2,box.right-4]) for (const y of [box.top+4,box.top+box.height/2,box.bottom-4]) {
        const hit=root.elementFromPoint(x,y);
        if(hit!==save && !save.contains(hit)) failures.push('A Monaco widget covers Save');
      }
      return failures;
    }), [], 'The pinned toolbar must stay above native Monaco widgets while the page scrolls');
    await captureScreenshot(page, { path: path.join(output, `${scenario.name}-${theme}-json-tools.png`), scale: 'css' });
    if (persist) {
      const { nativeBackup } = require('./native-backup');
      const backup = nativeBackup(config, randomUUID(), ['dashboard/MaraoDashboard', 'configuration.yaml']);
      let written = backup({ mode: 'backup' });
      try {
        const saved = JSON.parse(baseline.source);
        const note = saved.pages.find(page => page.path === 'studio').sections.at(-1).cards[0];
        note.content += ' JSON verification.';
        await setSource(JSON.stringify(saved, null, 2) + '\n');
        await clickFold(page, panel, 1); await folded(1);
        await panel.locator('#save').tap();
        await page.waitForFunction(p => !p._busy && !p._dirty, await panel.elementHandle());
        assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), saved);
        assert.deepEqual(await panel.evaluate(p => p._jsonTestMutations), ['marao_dashboard/config/generate']);
        written = backup({ mode: 'snapshot', paths: ['dashboard/MaraoDashboard', 'configuration.yaml'] }).files;
        await page.reload(); await page.waitForFunction(() => document.querySelector('home-assistant')?.shadowRoot, null);
        await page.waitForFunction(p => p._loaded, await page.locator('marao-dashboard-panel').elementHandle());
        assert.equal(await page.locator('marao-dashboard-panel').evaluate(p => p._model.pages.find(page => page.path === 'studio').sections.at(-1).cards[0].content), note.content);
      } finally {
        backup({ mode: 'restore', expected: written }); backup({ mode: 'finish' });
        await client.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
      }
    }
  } catch (error) {
    fs.writeFileSync(path.join(output, `${scenario.name}-${theme}-stock-state.json`), JSON.stringify(await panel.evaluate(p => ({
      margin: p.shadowRoot.querySelector('.margin-view-overlays')?.innerHTML,
      folding: [...p.shadowRoot.querySelectorAll('[class*="folding"]')].map(element => ({ tag: element.tagName, class: element.className, rect: element.getBoundingClientRect().toJSON() })),
      layout: p._monaco.getLayoutInfo(), position: p._monaco.getScrolledVisiblePosition({ lineNumber: 24, column: 1 }),
    })).catch(() => ({}))));
    fs.writeFileSync(path.join(output, `${scenario.name}-${theme}-json-input.json`), JSON.stringify(await page.evaluate(() => window.__jsonInputTrace || []).catch(() => [])));
    await captureScreenshot(page, { path: path.join(output, `${scenario.name}-${theme}-json-tools-failure.png`), scale: 'css' }).catch(() => {});
    throw error;
  } finally {
    page.off('worker', workerStarted);
    if (await panel.count() && await panel.evaluate(p => Boolean(p._monaco)).catch(() => false)) {
      await panel.evaluate(p => p._restoreJsonMonitor?.());
      await panel.evaluate((p, baseline) => { p._setEditorSource(baseline.source); p._jsonDraft = baseline.source; p._dirty = baseline.dirty; p._updateHeader(); }, baseline);
    }
  }
}
module.exports = { jsonEditorChecks, geometry, clickFold };
