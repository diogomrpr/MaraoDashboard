import {clone, entityMeta, moveItem, sensorThresholdError} from './editor-model.js';

const formEsc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Shared field and list editors; hosts own persistence, dialogs and localization.
export const cardFormMethods = {
  _renderEnergySubEntities(host, values, changed, power = false, thresholdEntity = null) {
    const threshold = thresholdEntity !== null;
    const grouped = !power && !threshold;
    // Keep disclosure identity outside the saved rows, which field edits replace.
    let disclosures = Array.isArray(values) ? values.map(() => ({ open: false })) : [];
    const notify = () => {
      changed(values);
      if (threshold) host.querySelector('[data-list-error]').textContent = this._l(sensorThresholdError({background_thresholds:values}, thresholdEntity));
    };
    const render = () => {
      host.innerHTML = `<h3>${this._l(threshold ? 'Background thresholds' : power ? 'Power devices' : 'Energy breakdown')}</h3>${threshold ? `<p>${this._l('Colors apply from each threshold upward, in source units. Below the first threshold the normal background is used.')} ${formEsc(this._hass?.states?.[thresholdEntity]?.attributes?.unit_of_measurement || '')}</p>` : ''}<div data-energy-rows></div><p data-list-error role="alert"></p><ha-button data-energy-add>${this._t('add')}</ha-button>`;
      const rows = host.querySelector('[data-energy-rows]');
      if (grouped) rows.className = 'energy-contributors';
      if (!Array.isArray(values)) rows.textContent = this._l(power ? 'Power devices must be a list.' : 'Energy breakdown must be a list.');
      else values.forEach((member, index) => {
        const row = document.createElement(grouped ? 'details' : 'div'); row.className = grouped ? 'page-section energy-contributor' : 'advanced-form';
        let formHost = row, heading, updateHeading = () => {};
        if (grouped) {
          const disclosure = disclosures[index];
          row.open = disclosure.element?.open ?? disclosure.open;
          disclosure.element = row;
          heading = document.createElement('summary'); heading.className = 'card-heading';
          heading.innerHTML = '<div class="entity-main"><div class="entity-name"></div><div class="entity-meta"></div></div>';
          updateHeading = () => {
            const current = values[index], entity = current?.entity_id || '';
            heading.querySelector('.entity-name').textContent = current?.name || entityMeta(this._entities || [], entity)?.name || this._hass?.states?.[entity]?.attributes?.friendly_name || entity || this._l('New energy contributor');
            heading.querySelector('.entity-meta').textContent = entity;
          };
          updateHeading(); row.append(heading);
          formHost = document.createElement('div'); formHost.className = 'advanced-form'; row.append(formHost);
        }
        if (!member || typeof member !== 'object' || Array.isArray(member)) formHost.textContent = this._l(power ? 'Choose a power sensor for each device.' : 'Energy breakdown entries must be objects.');
        else {
          const data = threshold ? {value:member.value, color:member.color} : { entity_id: member.entity_id || '', name: member.name || '', cost_entity: member.cost_entity || '' };
          this._mountForm(formHost, data, threshold ? [this._schema('value','Threshold',{number:{mode:'box',step:0.1}},true), this._schema('color','Background color',{text:{type:'color'}},true)] : [
            this._schema('entity_id', power ? 'Power sensor (W/kW)' : 'Energy sensor', { entity: { domain: ['sensor'] } }, true),
            this._schema('name', 'Display name', { text: {} }),
            ...(power ? [] : [this._schema('cost_entity', 'Cost sensor (optional)', { entity: { domain: ['sensor'] } })]),
          ], value => {
            const next = { ...values[index] };
            for (const key of threshold ? ['value','color'] : power ? ['entity_id', 'name'] : ['entity_id', 'name', 'cost_entity']) {
              if (value[key] === (next[key] ?? '')) continue;
              if (threshold || value[key] || key === 'entity_id') next[key] = value[key]; else delete next[key];
            }
            Object.assign(data, value); values[index] = next; updateHeading(); notify();
          });
        }
        const controls = document.createElement('div'); controls.className = 'row-actions';
        controls.innerHTML = `${this._iconButton('mdi:arrow-up', 'Move up', 'up', index, index === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'down', index, index === values.length - 1)}${this._iconButton('mdi:delete-outline', this._t('delete'), 'delete', index)}`;
        controls.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', event => {
          if (grouped) { event.preventDefault(); event.stopPropagation(); }
          if (button.disabled) return;
          this._moveHaptic();
          const action = button.dataset.action, targetIndex = index + (action === 'up' ? -1 : 1);
          if (action === 'delete') { values.splice(index, 1); disclosures.splice(index, 1); }
          else { values = moveItem(values, index, targetIndex); disclosures = moveItem(disclosures, index, targetIndex); }
          notify(); render();
          if (grouped) {
            const targetRow = host.querySelector('[data-energy-rows]').children[Math.min(action === 'delete' ? index : targetIndex, values.length - 1)];
            const control = action !== 'delete' && targetRow?.querySelector(`[data-action="${action}"]`);
            this._focusWithoutScroll(control && !control.disabled ? control : targetRow?.querySelector('summary') || host.querySelector('[data-energy-add]'));
          }
        }));
        (heading || row).append(controls); rows.append(row);
      });
      host.querySelector('[data-energy-add]').addEventListener('click', () => {
        this._moveHaptic(); disclosures.push({ open: true }); values = [...(Array.isArray(values) ? values : []), threshold ? {value:Number.isFinite(values?.at(-1)?.value) ? values.at(-1).value + 10 : 0,color:'#75C89B'} : { entity_id: '' }]; notify(); render();
      });
      if (threshold) host.querySelector('[data-list-error]').textContent = this._l(sensorThresholdError({background_thresholds:values}, thresholdEntity));
    };
    render();
  },

  _openMediaOptions(player, save) {
    if (!this._contextReady) return this._withEditorContext(() => this._openMediaOptions(player, save));
    const original = player.apple_tv && typeof player.apple_tv === 'object' ? clone(player.apple_tv) : {};
    const data = { enabled: player.apple_tv !== false && (Boolean(player.apple_tv) || /apple[_ ]?tv/i.test(player.entity_id || '')),
      remote_entity: original.remote_entity || '', volume_remote_entity: original.volume_remote_entity || '' };
    let apps = clone(original.apps || []);
    const dialog = this._dialog(this._l('Apple TV options')), content = dialog.querySelector('.dialog-content');
    content.innerHTML = `<div id="media-form"></div><h3>${this._l('Apps')}</h3><div id="app-list"></div><ha-button data-add-app>${this._l('Add app')}</ha-button><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t('cancel')}</ha-button><ha-button data-save appearance="filled">${this._t('update')}</ha-button></div>`;
    const editApp = index => {
      const existing = index == null ? {} : apps[index];
      this._openFormDialog(index == null ? 'Add app' : 'Edit app', { name: existing.name || '', source: existing.source || '', icon: existing.icon || '' }, [
        this._schema('name', 'Display name', { text: {} }), this._schema('source', 'App source', { text: {} }, true), this._schema('icon', 'Icon', { icon: {} }),
      ], value => {
        if (!String(value.source || '').trim()) throw new Error('Media app requires an explicit source.');
        const next = { ...existing, source: value.source };
        for (const key of ['name', 'icon']) if (value[key]) next[key] = value[key]; else delete next[key];
        if (index == null) apps.push(next); else apps[index] = next;
        render();
      });
    };
    const render = () => {
      const list = content.querySelector('#app-list');
      list.innerHTML = apps.map((app, index) => `<div class="entity-row"><div class="entity-icon"><ha-icon icon="${formEsc(app.icon || 'mdi:play-box-outline')}"></ha-icon></div><div class="entity-main"><div class="entity-name">${formEsc(app.name || app.source)}</div><div class="entity-meta">${formEsc(app.source)}</div></div><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'app-up', index, index === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'app-down', index, index === apps.length - 1)}${this._iconButton('mdi:pencil', 'Edit app', 'app-edit', index)}${this._iconButton('mdi:delete-outline', this._t('delete'), 'app-delete', index)}</div></div>`).join('');
      list.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
        const index = Number(button.dataset.room), action = button.dataset.action;
        if (action === 'app-edit') { editApp(index); return; }
        if (action === 'app-delete') apps.splice(index, 1); else apps = moveItem(apps, index, index + (action === 'app-up' ? -1 : 1));
        render();
      }));
    };
    this._mountForm(content.querySelector('#media-form'), data, [this._schema('enabled', 'Apple TV controls', { boolean: {} }),
      this._schema('remote_entity', 'Remote entity', { entity: { domain: ['remote'] } }),
      this._schema('volume_remote_entity', 'Volume remote', { entity: { domain: ['remote', 'media_player'] } })], value => Object.assign(data, value));
    content.querySelector('[data-add-app]').addEventListener('click', () => editApp(null));
    content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog));
    content.querySelector('[data-save]').addEventListener('click', () => {
      try {
        const value = { ...original, apps };
        for (const key of ['remote_entity', 'volume_remote_entity']) if (data[key]) value[key] = data[key]; else delete value[key];
        save(data.enabled ? value : false); this._closeDialog(dialog);
      } catch (error) { content.querySelector('[data-error]').textContent = this._error(error); }
    });
    render();
  },

  _openFormDialog(title, initial, schema, save, action = this._t('update')) {
    const dialog = this._dialog(title); const content = dialog.querySelector(".dialog-content"); const data = clone(initial);
    content.innerHTML = `<div id="form"></div><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button><ha-button data-save appearance="filled">${formEsc(action)}</ha-button></div>`;
    this._mountForm(content.querySelector("#form"), data, schema, (value) => { Object.assign(data, value); if (Object.hasOwn(data, "power_entity")) this._refreshEnergyFields(content, data.power_entity); });
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelector("[data-save]").addEventListener("click", () => {
      try { save(data); this._closeDialog(dialog); }
      catch (error) { content.querySelector('[data-error]').textContent = this._error(error); }
    });
  },

  _schema(name, label, selector, required = false) { return { name, label: this._l(label), required, selector }; },

  _mountForm(host, data, schema, changed) {
    const form = document.createElement("ha-form"); form.hass = this._hass; form.data = data; form.schema = schema;
    form.computeLabel = (item) => item.label || item.name; form.computeHelper = (item) => item.helper || "";
    const fit = () => {
      const fitting = this._containForm(form);
      (this._formFitting ||= new WeakMap()).set(form, fitting);
      fitting.catch(error => this._setStatus(this._error(error), "error"));
      return fitting;
    };
    form.addEventListener("value-changed", (event) => { if (!this._busy) changed(event.detail.value); fit(); });
    host.replaceChildren(form); fit();
  },

  async _containForm(element) {
    const tag = element.localName;
    if (tag.startsWith("ha-")) {
      await customElements.whenDefined(tag);
      await element.updateComplete;
    }
    if (!element.isConnected) return;
    const shadow = element.shadowRoot;
    if (tag === 'ha-dialog') {
      const actions = element.querySelector('.dialog-actions');
      if (actions) { actions.slot = 'footer'; element.append(actions); }
    }
    if (tag === 'ha-selector-boolean' && !shadow.querySelector('style[data-marao-boolean]')) {
      const style = document.createElement('style'); style.dataset.maraoBoolean = '';
      style.textContent = '.primary,.secondary{line-height:1.35;overflow-wrap:anywhere}[slot="label"]{min-width:0}ha-switch::part(base){min-width:48px;min-height:48px}';
      shadow.append(style);
    }
    if (tag === 'ha-formfield' && !shadow.querySelector('style[data-marao-formfield]')) {
      const style = document.createElement('style'); style.dataset.maraoFormfield = '';
      style.textContent = '.mdc-form-field{min-height:48px;gap:12px}.mdc-label{min-width:0;flex:1;line-height:1.35}';
      shadow.append(style);
    }
    if (tag === "ha-dialog-header" && !shadow.querySelector('style[data-marao-dialog]')) {
      const style = document.createElement('style'); style.dataset.maraoDialog = '';
      style.textContent = ':host .header-content{white-space:normal;overflow-wrap:anywhere}:host .header-title{height:auto}';
      shadow.append(style);
    }
    if (tag === "ha-dropdown-item") element.style.minHeight = "48px";
    // Native multiple-entity pickers otherwise retain the selected name's minimum width.
    if (tag === "ha-entity-picker") { element.style.minWidth = "0"; element.style.maxWidth = "100%"; }
    if (tag === "ha-icon-button") element.style.setProperty("--ha-icon-button-size", "48px");
    if (tag === 'ha-switch') { element.style.minWidth = '48px'; element.style.minHeight = '48px'; }
    if (tag === "ha-picker-field") { element.style.display = "block"; element.style.container = "marao-picker / inline-size"; }
    if (tag === "ha-combo-box-item" && element.getRootNode().host?.localName === "ha-picker-field") {
      // Native selected rows have zero padding and a fixed height that clips enlarged labels.
      element.style.setProperty("--md-list-item-two-line-container-height", "calc(var(--font-size-primary,1rem) * 1.5 + var(--font-size-caption,.8rem) * 1.2 + 24px)");
      element.style.setProperty("--md-list-item-top-space", "12px");
      element.style.setProperty("--md-list-item-bottom-space", "12px");
      for (const label of element.querySelectorAll('[slot="overline"]')) label.style.lineHeight = "1.2";
      const item = shadow.querySelector('md-item');
      await item?.updateComplete;
      if (item?.shadowRoot && !item.shadowRoot.querySelector('style[data-marao-picker]')) {
        // Trailing native controls move below the text when they would consume its width.
        const style = document.createElement('style'); style.dataset.maraoPicker = '';
        style.textContent = '@container marao-picker (max-width:240px){:host{display:grid!important;grid-template-columns:minmax(0,1fr) auto;column-gap:8px}.text{grid-column:1/-1;grid-row:1;min-width:0}[name="start"],[name="end"]{display:flex;align-items:center;grid-row:2}[name="start"]{grid-column:1}[name="end"]{grid-column:2;justify-self:end}}';
        item.shadowRoot.append(style);
      }
    }
    if (tag === "ha-input") {
      const root = element.getRootNode();
      if (!root.querySelector('style[data-marao-fields]')) {
        // HA's exported input parts otherwise retain a 56px field at enlarged text sizes.
        const style = document.createElement('style'); style.dataset.maraoFields = '';
        style.textContent = 'ha-input::part(wa-base){height:auto;min-height:calc(var(--font-size-primary,1rem) * 1.5 + var(--font-size-caption,.8rem) * 1.2 + 24px)}ha-input::part(wa-input){padding-top:calc(var(--font-size-caption,.8rem) * 1.2 + 8px)}';
        root.append(style);
      }
    }
    await Promise.all([...element.children, ...(shadow?.children || [])].map((child) => this._containForm(child)));
  },

  _variableSchema(field, sourceId) {
    let selector = { text: {} };
    if (field.kind === "select") selector = { select: { mode: 'dropdown', options: field.options.map(value => ({ value, label: this._l(({ auto: 'Automatic', popup: 'Popup', inline: 'On dashboard', slide: 'Slide to open', close: 'Close or lock', hold: 'Security hold', dropdown: 'Dropdown', grid: 'Grid' })[value] || value) })) } };
    if (field.kind === "boolean") selector = { boolean: {} };
    if (field.kind === "entity") selector = { entity: { domain: field.domains || [], multiple: Boolean(field.multiple) } };
    if (field.kind === "energy_period") selector = { select: { mode: 'dropdown', options: [{ value: 'day', label: this._l('Day') }, { value: 'month', label: this._l('Month') }] } };
    if (field.kind === "icon") selector = { icon: {} };
    if (field.kind === "number") selector = { number: {} };
    if (field.kind === "object") selector = { object: {} };
    if (field.kind === "color") selector = { text: { type: "color" } };
    if (field.kind === "energy_precision") selector = { select: { mode: "dropdown", options: [
      { value: "auto", label: this._l("Automatic") }, ...Array.from({length: 7}, (_, value) => ({value: String(value), label: String(value)})),
    ] } };
    if (field.kind === "energy_unit") {
      const units = this._catalog.energy_units || {};
      const source = entityMeta(this._entities, sourceId)?.unit_of_measurement;
      selector = { select: { mode: "dropdown", options: [
        { value: "auto", label: this._l("Automatic") },
        ...Object.keys(units).filter(unit => units[unit][0] === units[source]?.[0]).map(unit => ({value: unit, label: unit})),
      ] } };
    }
    return { ...this._schema(`var__${field.key}`, this._l(field.label), selector), helper: this._l(field.description || "") };
  },

  _refreshEnergyFields(content, sourceId) {
    const field = this._catalog.energy_fields?.find(item => item.kind === "energy_unit");
    if (!field) return;
    for (const form of content.querySelectorAll("ha-form")) {
      if (form._energySource === sourceId) continue;
      form._energySource = sourceId;
      form.schema = form.schema.map(item => item.name === `var__${field.key}` ? this._variableSchema(field, sourceId) : item);
    }
  },

  _expandedFields(fields) {
    return fields.flatMap((field) => field.kind !== "vacuum_action" ? [field] : [
      { key: `${field.key}.icon`, label: `${field.label} icon`, kind: "icon", advanced: true },
      { key: `${field.key}.on_action`, label: `${field.label} service`, kind: "text", advanced: true },
      { key: `${field.key}.segment`, label: `${field.label} segment`, kind: "number", advanced: true, description: "Explicit command data can override the default segment parameters." },
      { key: `${field.key}.data`, label: `${field.label} command data`, kind: "object", advanced: true, description: "Explicit command data can override the default segment parameters." },
    ]);
  },

  _readVariable(variables, field) {
    if (field.kind === 'number_list') return (variables?.[field.key] ?? field.default ?? []).join(', ');
    if (["energy_unit", "energy_precision"].includes(field.kind)) return variables?.[field.key] == null ? "auto" : String(variables[field.key]);
    const [parent, child] = field.key.split("."); return child ? variables?.[parent]?.[child] ?? "" : variables?.[parent] ?? field.default ?? "";
  },

  _writeVariable(variables, field, value) {
    if (field.kind === 'number_list') {
      const numbers = Array.isArray(value) ? value : String(value || '').split(',').map(item => item.trim()).filter(Boolean).map(Number);
      if (numbers.length > 3 || numbers.some(number => typeof number !== 'number' || !Number.isFinite(number))) throw new Error('Charging shortcuts require at most three finite numbers.');
      value = numbers;
    }
    if (["energy_unit", "energy_precision"].includes(field.kind) && value === "auto") value = "";
    if (field.kind === "energy_precision" && /^[0-6]$/.test(value)) value = Number(value);
    const empty = value === "" || value == null; const [parent, child] = field.key.split(".");
    if (child) { variables[parent] ||= {}; if (empty) delete variables[parent][child]; else variables[parent][child] = value; if (!Object.keys(variables[parent]).length) delete variables[parent]; }
    else if (empty) delete variables[parent]; else variables[parent] = value;
  },

  _entityId(value) { return typeof value === "string" ? value : value?.entity_id || ""; },

  _entityIds(values) { if (values == null) return []; return (Array.isArray(values) ? values : [values]).map((value) => this._entityId(value)).filter(Boolean); },

  _renderSceneOrder(host, entries = null, changed = null, edit = null) {
    const scenes = entries || (Array.isArray(this._model.overview.scenes)
      ? this._model.overview.scenes
      : (this._model.overview.scenes ? [this._model.overview.scenes] : []));
    host.innerHTML = scenes.length ? `<div class="advanced"><strong>${this._l("Scene order")}</strong><ha-sortable>${scenes.map((scene, index) => `<div class="load-row"><span>${formEsc(scene.name || entityMeta(this._entities, this._entityId(scene))?.name || this._entityId(scene))}</span>${this._iconButton("mdi:arrow-up", "Move up", "scene-up", index, index === 0)}${this._iconButton("mdi:arrow-down", "Move down", "scene-down", index, index === scenes.length - 1)}${edit ? this._iconButton('mdi:pencil', 'Edit card', 'scene-edit', index) : ''}</div>`).join("")}</ha-sortable></div>` : "";
    host.querySelectorAll("[data-action^='scene-']").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.room);
      if (button.dataset.action === 'scene-edit') { edit(index); return; }
      if (changed) { changed(moveItem(scenes, index, index + (button.dataset.action === 'scene-up' ? -1 : 1))); return; }
      this._model.overview.scenes = moveItem(scenes, index, index + (button.dataset.action === "scene-up" ? -1 : 1));
      this._mountOverviewForm(host.parentElement); this._setDirty();
    }));
  }
};
