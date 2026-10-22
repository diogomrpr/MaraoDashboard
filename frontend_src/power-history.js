import { normalizeSamples, periodRange, reduceSamples } from './history-data.js';

export function powerStateAt(samples, time) {
  let low = 0, high = samples.length;
  while (low < high) { const middle = (low + high) >>> 1; if (samples[middle].time <= time) low = middle + 1; else high = middle; }
  return samples[low - 1] || null;
}

export async function loadPowerPeriod({ hass, ids, range, timeZone, convert, isCurrent = () => true, now = Date.now() }) {
  const series = Object.fromEntries(ids.map(id => [id, []])), errors = {};
  const finish = Math.min(+range.end, +new Date(now));
  for (let from = +range.start; from < finish;) {
    if (!isCurrent()) return;
    const end = Math.min(+periodRange(from, 0, 'day', timeZone).end, finish);
    const activeIds = ids.filter(id => !errors[id]);
    if (!activeIds.length) break;
    const query = new URLSearchParams({ filter_entity_id: activeIds.join(','), end_time: new Date(end).toISOString(), significant_changes_only: '0' });
    const response = await hass.callApi('GET', `history/period/${new Date(from).toISOString()}?${query}`);
    if (!isCurrent()) return;
    const seen = new Set();
    for (const records of response || []) {
      const id = records[0]?.entity_id;
      if (!Object.hasOwn(series, id) || errors[id]) continue;
      seen.add(id);
      try {
        let unit;
        const full = records.map(record => {
          unit = record.attributes?.unit_of_measurement || unit;
          return { ...record, attributes: { unit_of_measurement: unit } };
        });
        const samples = normalizeSamples(full, { convert: (value, record) => {
          const reading = convert(value, record.attributes.unit_of_measurement);
          if (!reading || reading.error) throw new Error('power.unit_error');
          return reading.value;
        } }).filter(sample => sample.time <= end && sample.time < +range.end);
        const baseline = powerStateAt(samples, from);
        const inside = samples.filter(sample => sample.time >= from);
        if (baseline && baseline.time < from) inside.unshift({ time: from, value: baseline.value });
        series[id] = reduceSamples(normalizeSamples([...series[id], ...inside]), 8192);
      } catch { errors[id] = 'power.unit_error'; series[id] = []; }
    }
    for (const id of ids) if (!seen.has(id) && !errors[id]) series[id].push({ time: from, value: null });
    from = end;
  }
  return { series, errors };
}

const CSS = `
:host{display:block;min-width:0;font-family:var(--primary-font-family,Montserrat,sans-serif);color:var(--primary-text-color)}
.power-toolbar{position:sticky;top:var(--marao-popup-header-height,0px);z-index:1;display:grid;gap:8px;padding:8px 0 12px;background:var(--ha-card-background,var(--card-background-color))}
.power-picker{position:relative;min-width:0}
.power-picker button{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;width:100%;min-width:0;padding:12px;border:0;border-radius:12px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit;text-align:start;cursor:pointer;overflow-wrap:anywhere}
.power-picker ha-icon{flex:0 0 24px;--mdc-icon-size:24px;pointer-events:none}
.power-picker button:active:not(:disabled){transform:scale(.98)}
.power-options{position:absolute;inset:calc(100% + 4px) 0 auto;z-index:2;display:grid;gap:4px;padding:4px;border-radius:16px;background:var(--ha-card-background,var(--card-background-color));box-shadow:0 4px 16px var(--opacity-contrast-200,rgba(0,0,0,.2))}
.power-options[hidden]{display:none}
.power-options button[aria-checked=true]{box-shadow:inset 0 0 0 2px var(--primary-color);font-weight:var(--font-weight-primary,700)}
.power-options button[aria-checked=false] ha-icon{visibility:hidden}
.power-navigation{display:grid;grid-template-columns:48px minmax(0,1fr) 48px;align-items:center;gap:8px;text-align:center}
.power-navigation strong{overflow-wrap:anywhere;font-size:var(--font-size-primary,1.125rem)}
.power-navigation button{display:grid;place-items:center;width:48px;height:48px;padding:0;border:0;border-radius:50%;background:var(--secondary-background-color);color:inherit;font:inherit;cursor:pointer}
.power-navigation button:active{transform:scale(.94)}.power-navigation ha-icon{--mdc-icon-size:24px;pointer-events:none}
.power-toolbar :disabled{opacity:.5}.power-toolbar :focus{outline:none}.power-history-content{min-width:0}
`;

export function createPowerHistory(host, initial, createChart) {
  let options = initial, period = 'day', selectedStart, request = 0, destroyed = false, loading = false, loadedKey = '', data, error;
  const cache = new Map(), events = new AbortController();
  let probeTime, probeValues = {}, probing = false, pendingLive = {};
  let prefetchFrame, prefetchTimer, background;
  const make = (tag, parent, className) => { const node = document.createElement(tag); if (className) node.className = className; parent.append(node); return node; };
  const style = make('style', host); style.textContent = CSS;
  const toolbar = make('div', host, 'power-toolbar'), picker = make('div', toolbar, 'power-picker');
  const trigger = make('button', picker), selectedLabel = make('span', trigger), chevron = make('ha-icon', trigger);
  trigger.type = 'button'; trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
  chevron.setAttribute('icon','mdi:chevron-down'); chevron.setAttribute('aria-hidden','true');
  const menu = make('div', picker, 'power-options'); menu.setAttribute('role','menu'); menu.hidden = true;
  const choices = ['day','week','month'].map(value => {
    const button = make('button', menu), label = make('span', button), check = make('ha-icon', button);
    button.type = 'button'; button.tabIndex = -1; button.setAttribute('role','menuitemradio');
    check.setAttribute('icon','mdi:check'); check.setAttribute('aria-hidden','true');
    return { value, button, label };
  });
  const navigation = make('div', toolbar, 'power-navigation');
  const previous = make('button', navigation), title = make('strong', navigation), next = make('button', navigation);
  previous.type = next.type = 'button';
  previous.innerHTML = '<ha-icon icon="mdi:chevron-left" aria-hidden="true"></ha-icon>';
  next.innerHTML = '<ha-icon icon="mdi:chevron-right" aria-hidden="true"></ha-icon>';
  const content = make('div', host, 'power-history-content');
  const text = key => options.localize?.(key) || key;
  const state = id => options.hass?.states?.[id];
  const availability = id => !options.hass || options.hass.connected === false || options.hass.connection?.connected === false ? 'common.unavailable'
    : !state(id) || state(id).state === 'unknown' ? 'common.unknown' : state(id).state === 'unavailable' ? 'common.unavailable' : '';
  const sources = () => [{ entity_id: options.entity, name: options.name || state(options.entity)?.attributes?.friendly_name || options.entity }, ...(options.power_devices || [])];
  const zone = () => options.hass?.config?.time_zone || 'UTC';
  const now = () => options.now?.() ?? Date.now();
  const range = () => periodRange(selectedStart ?? now(), 0, period, zone());
  const usableIds = () => sources().filter(source => !availability(source.entity_id)).map(source => source.entity_id);
  const periodKey = interval => JSON.stringify([+interval.start, +interval.end, usableIds(), zone()]);
  const nearby = () => [0,-1,1,-2,2,-3,3,-4,4].map(distance => periodRange(range().start, distance, period, zone())).filter(interval => +interval.start <= now());
  const firstPeriods = () => ['day','week','month'].map(unit => periodRange(now(), 0, unit, zone()));
  const format = value => options.format(value, options.display_precision ?? (unit() === 'W' ? 0 : 2), options.hass);
  const unit = () => options.display_unit || state(options.entity)?.attributes?.unit_of_measurement || 'W';
  const display = value => { const reading = options.convert(value, 'W', unit()); return reading?.error ? null : reading?.value; };
  const chart = createChart(content, { loading: true, windows: false, power: true });
  const haptic = () => globalThis.window?.MaraoDashboard?.haptic?.('heavy');
  const render = () => {
    if (destroyed) return;
    const interval = range(), unavailable = availability(options.entity);
    const formatter = new Intl.DateTimeFormat(options.hass?.locale?.language || options.hass?.language, { timeZone: zone(),
      ...(period === 'month' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' }) });
    title.textContent = period === 'week' ? formatter.formatRange(interval.start, new Date(+interval.end - 1)) : formatter.format(interval.start);
    trigger.disabled = previous.disabled = Boolean(loading || unavailable); next.disabled = Boolean(loading || unavailable || +periodRange(interval.start, 1, period, zone()).start > now());
    selectedLabel.textContent = text(`power.${period}`);
    trigger.setAttribute('aria-label', `${text('power.period')}: ${selectedLabel.textContent}`);
    menu.setAttribute('aria-label', text('power.period'));
    for (const item of choices) { item.label.textContent = text(`power.${item.value}`); item.button.disabled = trigger.disabled; item.button.setAttribute('aria-checked', String(item.value === period)); }
    if (trigger.disabled) setPicker(false);
    previous.setAttribute('aria-label', text(`power.previous_${period}`)); next.setAttribute('aria-label', text(`power.next_${period}`));
    const mapped = sources().map((source, index) => {
      const sourceUnit=state(source.entity_id)?.attributes?.unit_of_measurement;
      const problem = availability(source.entity_id) || data?.errors[source.entity_id] || (sourceUnit && options.convert(1,sourceUnit,'W')?.error ? 'power.unit_error' : '');
      const raw = data?.series[source.entity_id] || [];
      const samples = problem || unavailable ? [] : raw.map(sample => ({ ...sample, value: sample.value === null ? null : display(sample.value) }));
      return { id: source.entity_id, name: source.name || state(source.entity_id)?.attributes?.friendly_name || source.entity_id,
        samples, color: index ? `hsl(${(210 + index * 137.5) % 360} 55% 48%)` : options.graph_color, problem: problem ? text(problem) : '' };
    });
    const incompatible = options.convert(1, 'W', unit())?.error;
    chart.update({ samples: mapped[0]?.samples || [], series: mapped, power: true, range: interval, recordedUntil: Math.min(+interval.end,now()), windows: false, unit: unit(), hass: options.hass,
      showFill: false, showLine: true, stepped: true, stateClass: undefined, localize: options.localize,
      format: value => `${format(value)} ${unit()}`, axisFormat: value => format(value),
      unavailable: unavailable ? text(unavailable) : '', loading, error: error ? text('power.load_error') : incompatible || mapped[0]?.problem && !unavailable ? text('power.unit_error') : '',
      selection: { time: probeTime, values: Object.fromEntries(Object.entries(probeValues).map(([id, item]) => [id, { ...item, value: Number.isFinite(item.value) ? display(item.value) : null }])) },
      onSelect: options.power_devices?.length ? selectTime : undefined, selectionKey: request,
      partialError: Boolean(Object.keys(data?.errors||{}).length || Object.values(probeValues).some(item=>item.failed)),
      onRetry: () => { loadedKey = ''; cache.clear(); load(); } });
  };
  function captureLive() {
    const interval=range();
    if(+interval.end<=now())return;
    const target=data?.series||pendingLive;
    for(const source of sources()){
      const live=state(source.entity_id),stamp=Date.parse(live?.last_updated||live?.last_changed);
      if(availability(source.entity_id)||!Number.isFinite(stamp)||stamp<+interval.start||stamp>now())continue;
      const reading=options.convert(live.state,live.attributes?.unit_of_measurement,'W');
      if(reading?.error)continue;
      const samples=target[source.entity_id]||[];
      if(!samples.length||stamp>samples.at(-1).time)target[source.entity_id]=reduceSamples([...samples,{time:stamp,value:reading?.value??null}],8192);
    }
  }
  function selectTime(time) {
    if(destroyed || !Number.isFinite(time) || probeTime===time)return;
    probeTime=time;
    probeValues=Object.fromEntries(sources().slice(1).map(item=>[item.entity_id,{problem:text('power.loading_reading')}]));
    queueMicrotask(() => { render(); probe(); });
  }
  async function probe() {
    if(probing||destroyed||probeTime===undefined)return;
    probing=true;
    try {
      for(let stamp=probeTime;!destroyed&&stamp!==undefined;stamp=probeTime){
        const epoch=request, ids=sources().slice(1).filter(source=>!availability(source.entity_id)).map(source=>source.entity_id);
        let result, failed=false;
        try { result=await loadPowerPeriod({hass:options.hass,ids,range:{start:new Date(stamp),end:new Date(stamp+1)},timeZone:zone(),now:now(),
          convert:(value,source)=>options.convert(value,source,'W'),isCurrent:()=>!destroyed&&request===epoch&&probeTime===stamp}); }
        catch { failed=true; }
        if(destroyed)return;
        if(request===epoch&&probeTime===stamp){
          probeValues=Object.fromEntries(ids.map(id=>[id,{value:powerStateAt(result?.series[id]||[],stamp)?.value??null,
            failed:failed||Boolean(result?.errors[id]),problem:failed?text('power.load_error'):result?.errors[id]?text(result.errors[id]):''}]));
          render();return;
        }
      }
    } finally { probing=false; }
  }
  function cancelPrefetch() {
    (globalThis.cancelAnimationFrame || clearTimeout)(prefetchFrame);
    clearTimeout(prefetchTimer);
    prefetchFrame = prefetchTimer = undefined;
  }
  function requestPeriod(interval, ahead = false) {
    const key = periodKey(interval);
    let entry = cache.get(key);
    if (!entry) {
      entry = { backgroundRequest: ahead ? request : undefined };
      cache.set(key, entry);
      entry.promise = loadPowerPeriod({ hass: options.hass, ids: usableIds(), range: interval, timeZone: zone(), now: now(),
        convert: (value, source) => options.convert(value, source, 'W'),
        isCurrent: () => !destroyed && cache.get(key) === entry && (loadedKey === key || entry.backgroundRequest === request) })
        .then(result => {
          if (result) { entry.result = result; entry.loadedAt = now(); }
          else if (cache.get(key) === entry) cache.delete(key);
          return result;
        }).catch(() => { entry.failed = true; });
    }
    return entry;
  }
  async function prefetch(epoch) {
    // Finish the active background request before starting another worker.
    if (background) await background.promise;
    while (!destroyed && epoch === request && !loading) {
      const interval = [...firstPeriods(), ...nearby()].find(item => !cache.has(periodKey(item)));
      if (!interval) break;
      const entry = requestPeriod(interval, true);
      background = entry;
      await entry.promise;
      if (background === entry) background = undefined;
    }
  }
  function schedulePrefetch() {
    cancelPrefetch();
    const epoch = request;
    // Let the selected chart paint before starting any neighboring history.
    prefetchFrame = (globalThis.requestAnimationFrame || (callback => setTimeout(callback, 0)))(() => {
      prefetchFrame = undefined;
      prefetchTimer = setTimeout(() => { prefetchTimer = undefined; prefetch(epoch); }, 0);
    });
  }
  async function load() {
    if (destroyed) return;
    const interval = range(), key = periodKey(interval);
    if (availability(options.entity)) { cancelPrefetch(); request++; probeTime=undefined;probeValues={}; loading = false; loadedKey = ''; data = undefined; error = undefined; render(); return; }
    if (key === loadedKey) { render(); return; }
    cancelPrefetch();
    const current = ++request;
    probeTime=undefined;probeValues={};pendingLive={};
    loadedKey = key; error = undefined; data = undefined;
    const retained = new Set([...firstPeriods(), ...nearby()].map(periodKey));
    for (const cachedKey of cache.keys()) if (!retained.has(cachedKey)) cache.delete(cachedKey);
    const cached = cache.get(key);
    // Refresh accumulating snapshots after a minute, including periods that just ended.
    if (cached?.failed || cached?.result && (Object.keys(cached.result.errors).length || cached.loadedAt < Math.min(+interval.end, now() - 60000))) cache.delete(key);
    const entry = requestPeriod(interval);
    if (entry.result) { data = entry.result; captureLive(); loading = false; render(); schedulePrefetch(); return; }
    loading = true; captureLive(); render();
    try {
      const result = await entry.promise;
      if (destroyed || request !== current) return;
      if (!result) throw new Error('power.load_error');
      data = result;
      for(const [id,readings] of Object.entries(pendingLive))data.series[id]=reduceSamples(normalizeSamples([...(data.series[id]||[]),...readings]),8192);
      pendingLive={};
    } catch { if (!destroyed && request === current) error = true; }
    if (!destroyed && request === current) { loading = false; render(); if (!error && !Object.keys(data.errors).length) schedulePrefetch(); }
  }
  function setPicker(open, focus = false) {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (focus) (open ? choices.find(item => item.value === period).button : trigger).focus({ preventScroll: true });
  }
  trigger.addEventListener('click', () => { if (!trigger.disabled) { haptic(); setPicker(menu.hidden, true); } }, { signal: events.signal });
  trigger.addEventListener('keydown', event => {
    if (!trigger.disabled && ['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); setPicker(true, true); }
  }, { signal: events.signal });
  for (const item of choices) item.button.addEventListener('click', () => {
    if (item.button.disabled) return;
    haptic(); setPicker(false, true);
    if (period === item.value) return;
    period = item.value; selectedStart = undefined; loadedKey = ''; load();
  }, { signal: events.signal });
  picker.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setPicker(false, true); }
    else if (event.key === 'Tab') { event.preventDefault(); setPicker(false); (event.shiftKey ? trigger : previous).focus({ preventScroll: true }); }
    else if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();
      const index = choices.findIndex(item => item.button === host.activeElement);
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowDown' ? 1 : 2)) % 3;
      choices[target].button.focus({ preventScroll: true });
    }
  }, { signal: events.signal });
  globalThis.document.addEventListener?.('pointerdown', event => { if (!event.composedPath().includes(picker)) setPicker(false); }, { signal: events.signal, capture: true });
  for (const [button, direction] of [[previous, -1], [next, 1]]) button.addEventListener('click', () => {
    if (button.disabled) return; haptic(); selectedStart = periodRange(range().start, direction, period, zone()).start;
    if(+selectedStart===+periodRange(now(),0,period,zone()).start)selectedStart=undefined;
    load();
  }, { signal: events.signal });
  load();
  return {
    update(nextOptions) {
      const priorIds = JSON.stringify(sources().map(source => source.entity_id));
      options = { ...options, ...nextOptions };
      if (priorIds !== JSON.stringify(sources().map(source => source.entity_id))) { loadedKey = ''; cache.clear(); }
      captureLive();load();
    },
    destroy() { if(destroyed)return; destroyed = true; request++; cancelPrefetch(); cache.clear(); probeTime=undefined; events.abort(); chart.destroy(); style.remove(); toolbar.remove(); content.remove(); },
  };
}
