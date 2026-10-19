const assert = require('node:assert/strict');

// Uses actual panel methods with safe local management stubs; no persisted writes.
async function editorPreloadChecks(page, panel) {
  const saved = await panel.evaluate(p => p._hass.callWS({ type: 'marao_dashboard/config/get' }));
  const result = await panel.evaluate(async original => {
    const mark = name => window.__maraoEditorProbePhase?.('preload/' + name);
    await mark('source');
    const check = (value, reason) => { if (!value) throw new Error(reason); };
    const initial = await original._hass.callWS({ type: 'marao_dashboard/config/get', scope: 'initial' });
    const context = await original._hass.callWS({ type: 'marao_dashboard/config/get', scope: 'context' });
    check(!initial.history && !initial.page_templates && initial.editor.display_entity_ids, 'Initial scope includes optional products');
    check(!context.config && !context.history, 'Context includes source or History');
    const parent = original.parentNode;
    const probe = new original.constructor();
    probe._prepareJson = () => Promise.resolve();
    let finishContext, finishHistory;
    const messages = [];
    probe.hass = { ...original._hass, callWS(message) {
      messages.push(message);
      if (message.scope === 'initial') return Promise.resolve(initial);
      if (message.scope === 'context') return new Promise(done => { finishContext = done; });
      if (message.scope === 'history') return new Promise(done => { finishHistory = done; });
      if (message.type === 'marao_dashboard/config/generate') return Promise.resolve({ config: message.config, history: [], dashboard_url: initial.dashboard_url });
      throw new Error('Unexpected scoped editor command');
    } };
    let variant;
    original.remove(); parent.append(probe);
    try {
      await mark('initial-native');
      await probe._loading;
      check(probe._visualReady && !probe._busy && !probe._contextReady, 'Visual waits for optional context');
      check(messages.filter(message => message.scope === 'context').length === 1, 'Context transport duplicated');
      check(!messages.some(message => message.scope === 'history'), 'History was speculative');
      check(probe.shadowRoot.querySelector('#general-form ha-form'), 'General native form missing');
      check([...probe.shadowRoot.querySelectorAll('.entity-row')].every(row => !row.textContent.includes('Missing') || initial.editor.display_entity_ids.some(id => row.textContent.includes(id))), 'Unloaded metadata became Missing');
      const name = 'Latest safe local preload draft';
      const general = probe.shadowRoot.querySelector('#general-form ha-form');
      general.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ...general.data, name } } }));
      check(probe._model.name === name && probe._dirty, 'Native Visual edit blocked by pending context');
      const before = probe._source();
      const save = probe._save(); const repeated = probe._save();
      check(probe._busy && probe.shadowRoot.querySelector('#visual-view').inert, 'Save did not guard before context wait');
      check(!messages.some(message => message.type === 'marao_dashboard/config/generate'), 'Save bypassed full validation context');
      await mark('save-context');
      finishContext(context); await Promise.all([save, repeated]);
      const generated = messages.filter(message => message.type === 'marao_dashboard/config/generate');
      check(generated.length === 1 && generated[0].config === before, 'Save duplicated or lost latest guarded draft');
      check(!probe._busy && !probe._monaco, 'Visual Save initialized unrelated Monaco or retained guard');
      // History has distinct pending and successfully empty states.
      probe._historyLoaded = false; probe._history = undefined;
      await mark('history');
      probe._openHistory(); await Promise.resolve();
      const dialog = probe.shadowRoot.querySelector('ha-dialog');
      check(dialog.querySelector('[role="status"]') && !dialog.querySelector('[data-version]') && !dialog.querySelector('.empty'), 'History became empty/restorable before response');
      finishHistory({ history: [] }); await probe._historyLoading; await Promise.resolve();
      check(dialog.querySelector('.empty') && !dialog.querySelector('[data-version]'), 'Genuine empty History absent');
      probe.remove();
      const variants = [];
      const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
      const nativeInput = root => {
        for (const element of root.children) {
          if (element.localName === 'input' && !element.disabled && element.getBoundingClientRect().width) return element;
          const found = element.shadowRoot && nativeInput(element.shadowRoot) || nativeInput(element);
          if (found) return found;
        }
      };
      for (const name of ['empty', 'raw-only', 'alternate-landing']) {
        const config = JSON.parse(initial.config);
        check(config.config_version === 2, 'Native preload variants require canonical source');
        const landing = { name: `Safe ${name} landing`, path: `preload-${name}`, entities: [] };
        if (name === 'raw-only') landing.cards = [{ type: 'markdown', content: 'Retained safe raw-only landing' }];
        if (name === 'alternate-landing') landing.entities.push({ page: config.landing_page, name: 'Safe landing shortcut' });
        config.pages.push(landing); config.landing_page = landing.path;
        const payload = { ...structuredClone(initial), config: JSON.stringify(config) };
        const reads = [];
        variant = new original.constructor(); variant._prepareJson = () => Promise.resolve();
        variant.hass = { ...original._hass, callWS(message) {
          reads.push(message.scope);
          if (message.type === 'marao_dashboard/config/get' && message.scope === 'initial') return Promise.resolve(payload);
          if (message.type === 'marao_dashboard/config/get' && message.scope === 'context') return new Promise(() => {});
          throw new Error('Native landing probe attempted an unexpected command');
        } };
        parent.append(variant);
        await mark('variant-' + name);
        await variant._loading;
        check(variant._visualReady && !variant._busy && !variant._contextReady, `${name}: optional context blocked native readiness`);
        check(nativeInput(variant.shadowRoot.querySelector('#general-form')), `${name}: native General input is not usable`);
        const page = variant._model.pages.find(page => page.path === landing.path), entry = variant._pageEntries.get(page);
        check(entry?.panel.expanded && entry.body.querySelectorAll('.entity-row').length === (name === 'alternate-landing' ? 1 : 0), `${name}: wrong initial landing body`);
        check(variant.shadowRoot.querySelectorAll('.room-header').length === config.pages.length && variant.shadowRoot.querySelector('#navbar-list'), `${name}: page headers/navbar missing`);
        for (const control of variant.shadowRoot.querySelectorAll('#navbar-list .icon-action,.room-header .icon-action,.room-body .icon-action')) {
          const box = control.getBoundingClientRect();
          check(box.width >= 48 && box.height >= 48, `${name}: native surrounding action is below 48px`);
        }
        check(stable(JSON.parse(variant._source())) === stable(config) && variant._source() === variant._savedSource && !variant._dirty, `${name}: readiness changed the source`);
        check(reads.join(',') === 'initial,context', `${name}: unexpected/duplicate management reads`);
        variants.push(name); variant.remove(); variant = null;
      }
      return { reads: messages.filter(message => message.type === 'marao_dashboard/config/get').map(message => message.scope), localGenerations: generated.length, nativeReady: probe._visualReady, variants };
    } finally { variant?.remove(); probe.remove(); parent.append(original); }
  });
  assert.deepEqual(result.reads, ['initial', 'context', 'history']);
  assert.equal(result.localGenerations, 1); assert.equal(result.nativeReady, true);
  assert.deepEqual(result.variants, ['empty', 'raw-only', 'alternate-landing']);
  assert.equal(await panel.evaluate(p => p._hass.callWS({ type: 'marao_dashboard/config/get' }).then(payload => payload.config)), saved.config, 'Preload checks wrote saved source');
}
module.exports = { editorPreloadChecks };
