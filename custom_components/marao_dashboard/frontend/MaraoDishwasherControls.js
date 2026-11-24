// The host owns the live config, hass and program request. Rendering and
// interaction state live here only for an opened detail surface.
export function createDishwasherPanelClass({
  bindDropdown, callServiceWithNotification, cardStyles, dishwasherControls, dishwasherReadings,
  dishwasherWarning, domainOf, entityStateLabel, esc, formatLocale,
  haptic, localize, numberStepper, numberStepValue, serviceConnectionReady,
  serviceTargetReady, startDishwasherProgram, stateOf,
}) {
  return class DishwasherPanel {
    constructor(host) { this.host = host; }
    disconnect() {
      this._dropdown?.destroy();
      this._dropdown = null;
      this._markup = null;
    }
    get _request() {
      const owner = this.host.nativeOwner || this.host;
      return owner._dishwasherRequest ||= {};
    }
    _text(key) { return localize('dishwasher.' + key, this.host._hass); }
    _option(value) {
      const state = stateOf(this.host._hass, this.host._config.variables?.selected_program_entity);
      if (!value) return '';
      const formatted = this.host._hass?.formatEntityState?.(state, value);
      if (formatted && formatted !== value) return formatted;
      return String(value).split('.').pop().replace(/^dishcare_dishwasher_program_/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
    }
    async _send(role, value) {
      const request = this._request;
      if (this.host.preview || this.host.nativeOwner?.preview || !this.host.isConnected || request.busy || request.sent) return;
      const model = dishwasherControls(this.host._config, this.host._hass, request.draft);
      const control = model[role];
      if (!control?.enabled) return;
      if (role === 'program' && (!control.options.includes(value) || control.value === value && (!request.draft || model.off))) return;
      if (role === 'start' && (request.program || request.sent)) return;
      if (role === 'stop' && !this._confirmStop) return;
      const nextDelay = role === 'delay' ? numberStepValue(control.value, control.limits, value) : null;
      if (role === 'delay' && nextDelay === control.value) return;
      haptic('heavy');
      request.error = request.errorDetail = this._error = '';
      if (role === 'program' && control.local && model.off) {
        request.draft = value;
        request.draftDevice = model.start.device;
        this._render();
        return;
      }
      if (role === 'start' && request.draft) return startDishwasherProgram(this.host.nativeOwner || this.host);
      if (role === 'program') request.draft = null;
      const domain = role === 'start' ? 'home_connect' : domainOf(control.entity);
      const service = {start:'start_selected_program', stop:'press', delay:'set_value', program:'select_option'}[role] || (control.on ? 'turn_off' : 'turn_on');
      const data = role === 'start' ? {device_id:control.device} : {entity_id:control.entity};
      if (role === 'program') data.option = value;
      if (role === 'delay') data.value = nextDelay;
      this._confirmStop = false;
      request.busy = true;
      if (role === 'program') request.program = value;
      this._render();
      try {
        await callServiceWithNotification(this.host._hass, domain, service, data, (outcome, error) => {
          if (outcome === 'error') this._error = error?.message || this._text('request_failed');
          if (outcome === 'error' || outcome === 'skipped') request.program = null;
          if (outcome === 'success' && role === 'start') request.sent = true;
        });
      } finally {
        request.busy = false;
        if (this.host.isConnected) this._render();
        else if (this.host.nativeOwner?._detailsPopup?._open) this.host.nativeOwner._detailsPopup.hass = this.host.nativeOwner.hass;
      }
    }
    _render() {
      if (!this.host._config || !this.host._hass) return;
      const h = this.host._hass, v = this.host._config.variables || {};
      const request = this._request;
      const model = dishwasherControls(this.host._config, h, request.draft);
      const {program, start, power} = model;
      if (stateOf(h, program.entity).state === request.program) request.program = null;
      if (model.running) request.sent = false;
      if (!model.stop.enabled) this._confirmStop = false;
      const disabled = this.host.preview || this.host.nativeOwner?.preview || request.busy || request.sent;
      const status = !serviceConnectionReady(h) || v.connection_entity && !model.connected
        ? this._text('offline_label') : entityStateLabel(stateOf(h, this.host._config.entity), this.host._config.entity, 'md_dishwasher_card', h);
      const readings = dishwasherReadings({...v, show_reading_names: true}, h, model.operation);
      const indicators = [];
      if (v.door_entity) indicators.push([this._text('door'), entityStateLabel(stateOf(h, v.door_entity), v.door_entity, '', h)]);
      if (v.connection_entity) indicators.push([this._text('connection'), this._text(!serviceConnectionReady(h) || !serviceTargetReady(h,v.connection_entity) ? 'unknown' : stateOf(h,v.connection_entity).state === 'on' ? 'connected' : 'offline_label')]);
      for (const [field,key] of [['remote_control_entity','remote_control'], ['remote_start_entity','remote_start'], ['child_lock_entity','child_lock']]) {
        if (v[field]) indicators.push([this._text(key), entityStateLabel(stateOf(h, v[field]), v[field], '', h)]);
      }
      const warnings = ['salt', 'rinse_aid'].filter(key => dishwasherWarning(stateOf(h, v[key + '_entity'])));
      const optionKeys = ['half_load','speed','intensive_zone','silence'].filter(key => model[key].entity);
      const hasControls = program.entity || v.enable_program_start || power.entity || v.stop_entity || model.delay.entity || optionKeys.length;
      const switchRow = key => {
        const control = model[key];
        return `<button type="button" class="power" data-role="${key}" aria-pressed="${control.on}"${disabled || !control.enabled ? ' disabled' : ''}><span>${esc(this._text(key))}</span><span>${esc(entityStateLabel(stateOf(h, control.entity), control.entity, '', h))}</span></button>`;
      };
      const disclosure = (key, content) => {
        const open = this._sections?.has(key) || false;
        return `<section><h3><button class="disclosure" type="button" data-section="${key}" aria-expanded="${open}">${esc(this._text(key))}<ha-icon aria-hidden="true" icon="mdi:chevron-${open ? 'up' : 'down'}"></ha-icon></button></h3>${open ? content : ''}</section>`;
      };
      const startReason = request.wake ? null : request.program ? 'confirm_program' : start.reason;
      const startLabel = request.wake?.phase || (request.sent ? 'start_requested' : program.local && model.off ? 'power_and_start' : 'start');
      const error = request.errorDetail || (request.error && this._text(request.error)) || this._error;
      const seconds = model.delay.limits.unit_of_measurement === 's' && model.delay.value != null;
      let delayLabel = model.delay.value;
      if (seconds) {
        const duration = [['hour', Math.floor(delayLabel / 3600)], ['minute', Math.floor(delayLabel % 3600 / 60)], ['second', delayLabel % 60]];
        delayLabel = duration.filter(([unit, n]) => n || delayLabel === 0 && unit === 'minute')
          .map(([unit, n]) => new Intl.NumberFormat(formatLocale(h), {style:'unit', unit, unitDisplay:'short'}).format(n)).join(' ');
      }
      const html = `<style>${cardStyles()}
        .cycle-sheet .disclosure{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;background:transparent;border-top:1px solid var(--divider-color);border-radius:0;padding-inline:4px;font-weight:700;text-align:start}
        :host{min-width:0}.cycle-sheet{display:grid;gap:20px;padding:4px 12px 20px}.cycle-sheet section{display:grid;gap:8px;min-width:0}
        .cycle-sheet h3,.cycle-sheet p,.cycle-sheet dl{margin:0;overflow-wrap:anywhere}
        .cycle-sheet h3{font:inherit;font-weight:700}.cycle-status{display:flex;align-items:center;gap:12px;font-size:var(--font-size-primary,1.125rem);font-weight:700}
        .cycle-symbol{display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:16px;background:var(--secondary-background-color)}
        .machine-status{display:grid;gap:6px}.machine-status div{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px}.machine-status dd{margin:0;font-weight:600}
        .delay,.confirm{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.delay .number-stepper{display:flex;align-items:center;justify-content:center;max-width:100%}.delay .number-value{min-width:2.5em;text-align:center}
        .cycle-sheet button{font-family:inherit}.cycle-sheet .start{width:100%;background:var(--primary-color);color:var(--text-primary-color,var(--primary-background-color));font-weight:700}
        .cycle-sheet button:disabled{background:var(--secondary-background-color);color:var(--secondary-text-color);cursor:default}
        .cycle-hint,.machine-status dt{color:var(--secondary-text-color)}.cycle-warning{display:flex;gap:8px;align-items:center}.cycle-sheet .power{display:flex;align-items:center;justify-content:space-between;gap:12px}
      </style><article class="cycle-sheet">
        <section><p class="cycle-status" role="status"><span class="cycle-symbol"><ha-icon icon="mdi:dishwasher" aria-hidden="true"></ha-icon></span>${esc(status)}</p>
        ${readings ? `<dl class="readings dishwasher-readings">${readings}</dl>` : ''}
        ${warnings.map(key=>`<p class="cycle-warning"><ha-icon icon="mdi:alert-circle-outline" aria-hidden="true"></ha-icon>${esc(this._text(key))}</p>`).join('')}
        </section>
        ${program.entity && !(model.running && v.active_program_entity) ? `<section><h3 id="program-heading">${esc(this._text('program'))}</h3><div class="marao-dropdown">
        <button type="button" aria-labelledby="program-heading selected-program" aria-haspopup="menu" aria-expanded="false"${disabled || !program.enabled ? ' disabled' : ''}><span id="selected-program">${esc(this._option(program.value) || this._text(program.local ? 'choose_program' : 'unknown'))}</span><ha-icon icon="mdi:chevron-down" aria-hidden="true"></ha-icon></button>
        <div class="marao-dropdown-options" role="menu" aria-labelledby="program-heading" hidden>${program.options.map(option=>`<button type="button" role="menuitemradio" data-option="${esc(option)}">${esc(this._option(option))}<ha-icon icon="mdi:check" aria-hidden="true"></ha-icon></button>`).join('')}</div></div></section>` : ''}
        ${v.enable_program_start === true && !model.running ? `<section aria-live="polite"><button type="button" class="start" data-start${disabled || startReason || request.sent ? ' disabled' : ''}>${esc(this._text(startLabel))}</button>${startReason && startReason !== 'choose_program' ? `<p class="cycle-hint">${esc(this._text(startReason))}</p>` : ''}</section>` : ''}
        ${model.stop.entity && model.running ? `<section>${this._confirmStop ? `<p>${esc(this._text('stop_question'))}</p><div class="confirm"><button type="button" data-keep>${esc(this._text('keep_running'))}</button><button type="button" data-confirm-stop>${esc(this._text('confirm_stop'))}</button></div>` : `<button type="button" data-stop${disabled || !model.stop.enabled ? ' disabled' : ''}>${esc(this._text('stop'))}</button>`}</section>` : ''}
        ${optionKeys.length || model.delay.entity ? disclosure('options', `${program.local && (model.off || request.draft !== stateOf(h, program.entity).state) ? `<p class="cycle-hint">${esc(this._text('options_after_power'))}</p>` : ''}${optionKeys.map(switchRow).join('')}${model.delay.entity ? `<div class="delay"><span>${esc(this._text('start_delay'))}</span>${numberStepper(delayLabel, this._text('start_delay'), !seconds && model.delay.limits.unit_of_measurement ? ' '+model.delay.limits.unit_of_measurement : '', '', disabled || !model.delay.enabled, h)}</div>` : ''}`) : ''}
        ${indicators.length || power.entity ? disclosure('machine_status', `${indicators.length ? `<dl class="machine-status">${indicators.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>` : ''}
        ${power.entity ? `<button type="button" class="power" data-power${disabled || !power.enabled ? ' disabled' : ''}><span>${esc(this._text(!serviceTargetReady(h,power.entity) ? 'power_unknown' : power.on ? 'turn_off' : 'turn_on'))}</span><ha-icon icon="mdi:power" aria-hidden="true"></ha-icon></button>` : ''}
        `) : ''}
        ${!hasControls ? `<p class="cycle-hint">${esc(this._text('monitor_only'))}</p>` : ''}
        ${error ? `<p role="alert">${esc(error)}</p>` : ''}</article>`;
      if (html === this._markup) return;
      const active = this.host.shadowRoot.activeElement;
      const focus = active?.closest('.marao-dropdown') ? '[aria-haspopup="menu"]' : active?.hasAttribute('data-power') ? '[data-power]' : active?.hasAttribute('data-start') ? '[data-start]' : null;
      this._dropdown?.destroy();
      this.host.shadowRoot.innerHTML = this._markup = html;
      for (const button of this.host.shadowRoot.querySelectorAll('[data-section]')) button.onclick = () => {
        const key = button.dataset.section;
        haptic('heavy');
        this._sections ||= new Set();
        if (this._sections.has(key)) this._sections.delete(key); else this._sections.add(key);
        this._render();
        this.host.shadowRoot.querySelector(`[data-section="${key}"]`)?.focus({preventScroll:true});
      };
      const picker = this.host.shadowRoot.querySelector('.marao-dropdown');
      if (picker) this._dropdown = bindDropdown(picker, {
        trigger: picker.querySelector('[aria-haspopup]'), menu: picker.querySelector('[role=menu]'),
        choices: [...picker.querySelectorAll('[data-option]')].map(button=>({button,value:button.dataset.option})),
        value: () => program.value, activeElement: () => this.host.shadowRoot.activeElement,
        haptic: () => haptic('heavy'), onSelect: option => this._send('program', option),
      });
      for (const button of this.host.shadowRoot.querySelectorAll('[data-role]')) button.onclick = () => this._send(button.dataset.role);
      for (const button of this.host.shadowRoot.querySelectorAll('[data-number-step]')) {
        const direction = button.dataset.numberStep === 'increase' ? 1 : -1;
        if (numberStepValue(model.delay.value, model.delay.limits, direction) === model.delay.value) button.disabled = true;
        button.onclick = () => this._send('delay',direction);
      }
      const stop = this.host.shadowRoot.querySelector('[data-stop]');
      if (stop) stop.onclick = () => { haptic('heavy'); this._confirmStop = true; this._render(); this.host.shadowRoot.querySelector('[data-keep]')?.focus(); };
      const confirm = this.host.shadowRoot.querySelector('[data-confirm-stop]');
      if (confirm) confirm.onclick = () => this._send('stop');
      const keep = this.host.shadowRoot.querySelector('[data-keep]');
      if (keep) keep.onclick = () => { haptic('heavy'); this._confirmStop = false; this._render(); this.host.shadowRoot.querySelector('[data-stop]')?.focus(); };
      const startButton = this.host.shadowRoot.querySelector('[data-start]');
      if (startButton) startButton.onclick = () => { if (!request.program && !request.sent) this._send('start'); };
      const powerButton = this.host.shadowRoot.querySelector('[data-power]');
      if (powerButton) powerButton.onclick = () => this._send('power');
      if (focus) this.host.shadowRoot.querySelector(focus)?.focus({preventScroll:true});
    }
  };
}
