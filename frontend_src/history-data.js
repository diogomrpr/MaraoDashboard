// Recorder records remain untouched; drawing, selection and summaries derive separate views.
export function normalizeSamples(records, { convert, live } = {}) {
  const ordered = new Map();
  for (const record of [...(records || []), ...(live ? [live] : [])]) {
    const stamp = record.time ?? record.timestamp ?? record.last_updated ?? record.last_changed;
    const time = typeof stamp === 'number' ? stamp : Date.parse(stamp);
    if (!Number.isFinite(time)) continue;
    const raw = record.value !== undefined ? record.value : record.state;
    let value = !['number','string'].includes(typeof raw) || String(raw).trim() === '' ? null : Number(raw);
    if (!Number.isFinite(value)) value = null;
    if (value !== null && convert) value = convert(value, record);
    if (!Number.isFinite(value)) value = null;
    ordered.set(time, { time, value, ...(record === live ? { live: true } : {}) });
  }
  return [...ordered.values()].sort((a, b) => a.time - b.time);
}

export function historyWindow(samples, hours, end = Date.now()) {
  const finish = +new Date(end), start = finish - hours * 3600000;
  return samples.filter(sample => sample.time >= start && sample.time <= finish);
}

export function summary(samples, stateClass) {
  let minimum = Infinity, maximum = -Infinity, total = 0, count = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample.value)) continue;
    minimum = Math.min(minimum, sample.value); maximum = Math.max(maximum, sample.value);
    total += sample.value; count++;
  }
  return { minimum: count ? minimum : null, maximum: count ? maximum : null,
    ...(stateClass === 'measurement' && count ? { average: total / count } : {}) };
}

export function nearestSample(samples, time) {
  let nearest = null, distance = Infinity;
  for (const sample of samples) {
    if (!Number.isFinite(sample.value)) continue;
    const delta = Math.abs(sample.time - time);
    if (delta < distance) { nearest = sample; distance = delta; }
  }
  return nearest;
}

export function reduceSamples(samples, maxPoints = 240) {
  const budget = Math.max(8, Math.floor(maxPoints));
  if (samples.length <= budget) return samples.map(sample => ({ ...sample }));
  // Four candidates and at most one explicit gap between each pair fit each bucket.
  const buckets = Math.max(1, Math.floor((budget - 2) / 8));
  const selected = new Set([0, samples.length - 1]);
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = Math.floor(bucket * samples.length / buckets), end = Math.floor((bucket + 1) * samples.length / buckets);
    let low = -1, high = -1;
    selected.add(start); selected.add(end - 1);
    for (let index = start; index < end; index++) {
      if (!Number.isFinite(samples[index].value)) continue;
      if (low < 0 || samples[index].value < samples[low].value) low = index;
      if (high < 0 || samples[index].value > samples[high].value) high = index;
    }
    if (low >= 0) { selected.add(low); selected.add(high); }
  }
  const indices = [...selected].sort((a, b) => a - b), result = [];
  let previous = -1;
  for (const index of indices) {
    if (previous >= 0 && Number.isFinite(samples[previous].value) && Number.isFinite(samples[index].value)) {
      const gap = samples.slice(previous + 1, index).find(sample => sample.value === null);
      if (gap) result.push({ ...gap });
    }
    result.push({ ...samples[index] }); previous = index;
  }
  return result;
}

export function periodRange(now, offset, period, timeZone = 'UTC') {
  const instant = +new Date(now);
  if (!Number.isFinite(instant) || !Number.isInteger(offset) || !['day', 'week', 'month'].includes(period)) throw new Error('Invalid history period');
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const civil = value => Object.fromEntries(formatter.formatToParts(new Date(value)).filter(part => ['year','month','day'].includes(part.type)).map(part => [part.type, Number(part.value)]));
  const current = civil(instant);
  if (period === 'week') {
    const weekday = new Date(Date.UTC(current.year, current.month - 1, current.day)).getUTCDay();
    current.day += offset * 7 - (weekday + 6) % 7;
    offset = 0;
  }
  const startDate = new Date(Date.UTC(current.year, current.month - 1 + (period === 'month' ? offset : 0), period === 'month' ? 1 : current.day + offset));
  const endDate = new Date(startDate);
  if (period === 'month') endDate.setUTCMonth(endDate.getUTCMonth() + 1); else endDate.setUTCDate(endDate.getUTCDate() + (period === 'week' ? 7 : 1));
  const boundary = date => {
    const key = date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
    let low = +date - 48 * 3600000, high = +date + 48 * 3600000;
    // Find the actual calendar boundary, including skipped/repeated local midnight.
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2), parts = civil(middle);
      if (parts.year * 10000 + parts.month * 100 + parts.day < key) low = middle; else high = middle;
    }
    return new Date(high);
  };
  return { start: boundary(startDate), end: boundary(endDate) };
}

function consumptionPeriods(range, period, timeZone) {
  const start = +new Date(range.start), end = +new Date(range.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !['day', 'month'].includes(period)) throw new Error('Invalid energy period');
  const samples = [];
  for (let time = start; time < end;) {
    const next = Math.min(end, period === 'day' ? time + 3600000 : +periodRange(time, 0, 'day', timeZone).end);
    samples.push({ time, end: next, value: null });
    time = next;
  }
  return samples;
}

export function energyBuckets(records, { range, period, timeZone = 'UTC', stateClass, convert, now = Date.now() }) {
  const samples = consumptionPeriods(range, period, timeZone), finish = Math.min(+new Date(now), +new Date(range.end));
  const readings = normalizeSamples(records, { convert }).filter(sample => sample.time <= finish);
  let cursor = 0;
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    if (sample.time >= finish) break;
    while (cursor < readings.length && readings[cursor].time <= sample.time) cursor++;
    const baseline = readings[cursor - 1];
    const previousStart = index ? samples[index - 1].time : period === 'day' ? sample.time - 3600000 : +periodRange(sample.time, -1, 'day', timeZone).start;
    let valid = Number.isFinite(baseline?.value) && (stateClass === 'total' || baseline.value >= 0) && baseline.time >= previousStart, value = 0, count = 0, previous = baseline;
    while (cursor < readings.length && readings[cursor].time <= sample.end) {
      const reading = readings[cursor++];
      if (!Number.isFinite(reading.value) || !Number.isFinite(previous?.value) || (stateClass !== 'total' && reading.value < 0)
        || reading.time - previous.time > sample.end - sample.time) valid = false;
      else value += stateClass !== 'total' && reading.value < previous.value ? reading.value : reading.value - previous.value;
      previous = reading; count++;
    }
    if (valid && count) {
      sample.value = value;
      // The final recorded interval is partial; never extend it with invented zero usage.
      if (previous.time < sample.end && cursor === readings.length) sample.coverageLimited = true;
    }
  }
  return { samples, limited: samples.some(sample => sample.time < finish && (sample.value === null || sample.coverageLimited)) };
}

export function statisticsBuckets(records, { range, period, timeZone = 'UTC', convert, now = Date.now() }) {
  const samples = consumptionPeriods(range, period, timeZone), finish = Math.min(+new Date(now), +new Date(range.end));
  const ordered = new Map();
  for (const record of records || []) {
    const start = +new Date(record.start), end = +new Date(record.end);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) ordered.set(start, { record, start, end });
  }
  const intervals = [...ordered.values()].sort((a, b) => a.start - b.start);
  for (const sample of samples) {
    if (sample.time >= finish) break;
    const contained = intervals.filter(interval => interval.start >= sample.time && interval.start < sample.end && interval.start < finish);
    let cursor = sample.time, value = 0, valid = !!contained.length;
    for (const interval of contained) {
      const raw = interval.record.change;
      let change = ['number', 'string'].includes(typeof raw) && String(raw).trim() !== '' ? Number(raw) : null;
      if (Number.isFinite(change) && convert) change = convert(change, interval.record);
      if (interval.start !== cursor || interval.end > sample.end || !Number.isFinite(change)) valid = false;
      else value += change;
      cursor = interval.end;
    }
    if (valid) {
      sample.value = value;
      if (cursor < sample.end || finish < sample.end) sample.coverageLimited = true;
    }
  }
  return { samples, limited: samples.some(sample => sample.time < finish && (sample.value === null || sample.coverageLimited)) };
}

export function energyTotal(samples) {
  const values = samples.filter(sample => Number.isFinite(sample.value));
  return values.length ? values.reduce((total, sample) => total + sample.value, 0) : null;
}

export function validatePowerDevices(options, main) {
  if (!Object.hasOwn(options, 'power_devices')) return [];
  if (!Array.isArray(options.power_devices)) return ['Power devices must be a list.'];
  const seen = new Set(main ? [main] : []), errors = [];
  for (const item of options.power_devices) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !/^sensor\.[a-z0-9_]+$/.test(item.entity_id || '')) { errors.push('Choose a power sensor for each device.'); continue; }
    if (seen.has(item.entity_id)) errors.push('Power devices must be unique and different from the house sensor.');
    seen.add(item.entity_id);
    if (Object.hasOwn(item, 'name') && typeof item.name !== 'string') errors.push('Power device names must be text.');
  }
  return [...new Set(errors)];
}
