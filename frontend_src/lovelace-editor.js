import { cardYaml, parseCardYaml } from './lovelace-model.js';
import { loadLovelaceEditor } from './lovelace-loader.js';
import { clone, newEntityGroupId } from './editor-model.js';
export { describeCardYaml, validateCardYaml } from './lovelace-model.js';

function context(element, panel) {
  element.dataset.haContext = ''; element.hass = panel._hass;
  return element;
}

function labelButton(text, action) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
  button.className = 'native-card-action';
  button.addEventListener('click', action); return button;
}

export async function mountPicker(panel, dialog, roomIndex, kind) {
  const host = dialog.querySelector('[data-ha-picker]');
  if (host.dataset.loading || host.querySelector('hui-card-picker')) return;
  const model = panel._model, epoch = panel._documentEpoch, revision = panel._revision;
  const active = () => dialog.isConnected && dialog.open && model === panel._model && epoch === panel._documentEpoch && revision === panel._revision;
  host.dataset.loading = 'true'; host.textContent = panel._l('Loading Home Assistant cards…');
  try {
    const lovelace = await loadLovelaceEditor(panel._hass, panel._dashboardUrl);
    if (!active()) return;
    const picker = context(document.createElement('hui-card-picker'), panel);
    picker.lovelace = lovelace;
    picker.addEventListener('config-changed', event => {
      event.stopPropagation();
      if (!active()) return;
      const config = event.detail.config;
      panel._closeDialog(dialog); openEditor(panel, roomIndex, null, kind, config.type === 'manual' ? { type: '' } : config);
    });
    host.replaceChildren(picker);
  } catch (failure) {
    if (!active()) return;
    const error = document.createElement('p'); error.setAttribute('role', 'alert');
    error.textContent = panel._l('Home Assistant card editor could not load.') + ' ' + panel._l(failure.message);
    host.replaceChildren(error, labelButton(panel._t('retry'), () => mountPicker(panel, dialog, roomIndex, kind)));
  } finally { delete host.dataset.loading; }
}

export function openEditor(panel, roomIndex, cardIndex, kind, initial = { type: '' }) {
  const container = panel._editableContainer(kind, roomIndex);
  const existing = cardIndex == null ? null : container.entities[cardIndex];
  const model = panel._model, revision = panel._revision, epoch = panel._documentEpoch;
  const dialog = panel._dialog(panel._l('Home Assistant card'));
  const active = () => dialog.isConnected && dialog.open && model === panel._model && epoch === panel._documentEpoch && revision === panel._revision;
  const content = dialog.querySelector('.dialog-content');
  content.innerHTML = '<div class="add-tabs" data-modes></div><p data-loading role="status"></p><div data-editor></div><p data-error role="alert"></p><div data-preview inert></div><div class="dialog-actions"></div>';
  const host = content.querySelector('[data-editor]'), error = content.querySelector('[data-error]');
  const loading = content.querySelector('[data-loading]'), previewHost = content.querySelector('[data-preview]');
  const actions = content.querySelector('.dialog-actions'), modes = content.querySelector('[data-modes]');
  let yaml = existing?.yaml ?? cardYaml(initial), config, editor, visual = false, lovelace, changed = false, loadingNative = false;
  const save = labelButton(panel._t(existing ? 'update' : 'create'), () => {
    if (visual && editor.hasError) return;
    validate(); if (!config) return;
    if (!active() || revision !== panel._revision || existing && container.entities[cardIndex] !== existing) {
      error.textContent = panel._l('The card changed. Close and try again.'); return;
    }
    const entry = { ...existing, template: 'ha_card', yaml, __simple: false };
    if (!entry.id) entry.id = newEntityGroupId().replace('group-', 'card-');
    if (existing) container.entities[cardIndex] = entry; else container.entities.push(entry);
    panel._setDirty(); panel._renderVisual(); panel._closeDialog(dialog);
  });
  actions.append(labelButton(panel._t('cancel'), () => panel._closeDialog(dialog)), save);
  const visualButton = labelButton(panel._t('visual'), () => { changed = true; showVisual(); });
  const yamlButton = labelButton('YAML', () => { changed = true; showYaml(); });
  modes.append(visualButton, yamlButton); visualButton.disabled = true;
  function setMode(isVisual) {
    visual = isVisual; visualButton.setAttribute('aria-pressed', String(visual)); yamlButton.setAttribute('aria-pressed', String(!visual));
  }
  function validate() {
    try { config = parseCardYaml(yaml); error.textContent = ''; save.disabled = false; }
    catch (failure) { config = null; error.textContent = panel._l(failure.message); save.disabled = true; }
  }
  function preview() {
    if (!config || !customElements.get('hui-card')) { previewHost.replaceChildren(); return; }
    let card = previewHost.firstElementChild;
    if (!card) { card = context(document.createElement('hui-card'), panel); card.preview = true; previewHost.append(card); }
    card.hass = panel._hass; card.config = clone(config); card.load();
  }
  function showYaml() {
    setMode(false);
    const native = customElements.get('ha-code-editor');
    editor = context(document.createElement(native ? 'ha-code-editor' : 'textarea'), panel);
    editor.value = yaml; editor.mode = 'yaml'; editor.inDialog = true;
    editor.autocompleteEntities = true; editor.autocompleteIcons = true;
    editor.setAttribute('aria-label', panel._l('Home Assistant card YAML'));
    editor.style.cssText = 'display:block;width:100%;min-height:240px;box-sizing:border-box';
    editor.addEventListener(native ? 'value-changed' : 'input', event => {
      event.stopPropagation(); changed = true; yaml = event.detail?.value ?? editor.value; validate(); preview();
    });
    host.replaceChildren(editor);
  }
  function showVisual() {
    validate(); if (!config || !lovelace) return;
    setMode(true);
    const form = context(document.createElement('hui-card-element-editor'), panel); editor = form;
    form.lovelace = lovelace; form.inDialog = true; form.showVisibilityTab = true;
    form.value = clone(config);
    let interacted = false;
    for (const type of ['pointerdown', 'keydown', 'input']) form.addEventListener(type, event => { if (event.isTrusted) interacted = true; }, true);
    form.addEventListener('config-changed', event => {
      event.stopPropagation(); if (!active() || editor !== form) return;
      if (event.detail.error || form.hasError) { error.textContent = event.detail.error || panel._l('Invalid Home Assistant card YAML.'); save.disabled = true; return; }
      const next = event.detail.config;
      if (interacted && next && JSON.stringify(next) !== JSON.stringify(config)) { changed = true; yaml = cardYaml(next); validate(); preview(); }
      else { error.textContent = ''; save.disabled = false; }
      if (event.detail.guiModeAvailable === false) {
        showYaml(); loading.textContent = panel._l('This card uses YAML editing. All settings are retained.');
      }
    });
    form.addEventListener('GUImode-changed', event => {
      if (active() && editor === form && !event.detail.guiMode) { showYaml(); loading.textContent = panel._l('This card uses YAML editing. All settings are retained.'); }
    });
    host.replaceChildren(form);
  }
  async function loadNative() {
    if (loadingNative) return;
    loadingNative = true; loading.textContent = panel._l('Loading Home Assistant cards…');
    try {
      lovelace = await loadLovelaceEditor(panel._hass, panel._dashboardUrl);
      if (!active()) return;
      loading.textContent = ''; visualButton.disabled = false;
      if (!changed && config) showVisual();
      else if (!changed) showYaml();
      preview();
    } catch (failure) {
      if (!active()) return;
      loading.textContent = panel._l('Home Assistant card editor could not load.') + ' ' + panel._l(failure.message);
      loading.append(labelButton(panel._t('retry'), loadNative));
    } finally { loadingNative = false; }
  }
  validate(); showYaml(); loadNative();
  return dialog;
}
