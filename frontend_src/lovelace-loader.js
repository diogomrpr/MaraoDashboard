let ready;

export function loadLovelaceEditor(hass, dashboardUrl) {
  if (!ready) {
    let timer;
    ready = Promise.race([load(hass, dashboardUrl), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Home Assistant card editor could not load.')), 20000);
    })]).catch(error => { ready = null; throw error; }).finally(() => clearTimeout(timer));
  }
  return ready;
}

async function load(hass, dashboardUrl) {
  // Internal HA APIs are confined here; no compiled chunk URLs or copied components.
  await hass.loadFragmentTranslation('lovelace');
  if (!customElements.get('hui-view')) {
    const resolver = document.createElement('partial-panel-resolver');
    const route = Object.values(resolver._getRoutes?.(hass.panels)?.routes || {}).find(value => value.tag === 'ha-panel-lovelace');
    if (!route?.load) throw new Error('Home Assistant card editor could not load.');
    await route.load();
  }
  const panel = document.createElement('ha-panel-lovelace');
  panel.hass = hass; panel.panel = hass.panels[new URL(dashboardUrl, location.origin).pathname.split('/')[1]];
  if (!panel.panel || typeof panel._fetchConfig !== 'function') throw new Error('Home Assistant card editor could not load.');
  await panel._fetchConfig(false);
  if (panel._errorMsg) throw new Error(panel._errorMsg);
  const resources = await hass.callWS({ type: 'lovelace/resources' });
  // HA owns classic scripts/styles. Modules are cached by the browser and can be awaited safely.
  await Promise.all(resources.filter(resource => resource.type === 'module').map(resource => import(new URL(resource.url, location.origin).href)));
  const config = { views: [{ cards: [{ type: 'markdown', content: '' }] }] };
  const view = document.createElement('hui-view');
  view.hass = hass; view.index = 0; view.lovelace = { config, saveConfig: () => { throw new Error('Read-only editor bootstrap'); } };
  const imports = [];
  view.addEventListener('show-dialog', event => { event.stopPropagation(); imports.push(event.detail.dialogImport()); });
  // HA 2026.10 attaches these listeners to the view's layout; newer HA attaches to the view.
  view.dispatchEvent(new CustomEvent('ll-create-card', { detail: { path: ['views', 0, 'cards'] } }));
  if (imports.length) view.dispatchEvent(new CustomEvent('ll-edit-card', { detail: { path: ['views', 0, 'cards', 0] } }));
  else if (typeof view._createLayoutElement === 'function') {
    view._createLayoutElement({ type: 'masonry' });
    view._layoutElement.dispatchEvent(new CustomEvent('ll-create-card'));
    view._layoutElement.dispatchEvent(new CustomEvent('ll-edit-card', { detail: { path: [0, 0] } }));
  }
  if (imports.length !== 2) throw new Error('Home Assistant card editor could not load.');
  await Promise.all(imports);
  if (!customElements.get('hui-card-picker') || !customElements.get('hui-card-element-editor')) throw new Error('Home Assistant card editor could not load.');
  return config;
}
