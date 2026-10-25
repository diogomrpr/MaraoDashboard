export function sensorThresholdError(options = {}, entity = '') {
  if (!Object.hasOwn(options, 'background_thresholds')) return '';
  const rows = options.background_thresholds;
  if (!Array.isArray(rows)) return 'Background thresholds must be a list.';
  if (rows.length && !entity.startsWith('sensor.')) return 'Background thresholds require a sensor entity.';
  let previous = -Infinity;
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return 'Each background threshold must be an object.';
    if (typeof row.value !== 'number' || !Number.isFinite(row.value)) return 'Threshold values must be finite numbers.';
    if (row.value <= previous) return 'Threshold values must be strictly increasing.';
    if (typeof row.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(row.color)) return 'Threshold colors must use #RRGGBB.';
    previous = row.value;
  }
  return '';
}

export function sensorThresholdColor(options, entity, state) {
  if (!entity?.startsWith('sensor.') || typeof state !== 'string' || !state.trim() || !Number.isFinite(Number(state))) return '';
  let color = '';
  for (const row of options.background_thresholds || []) {
    if (Number(state) < row.value) break;
    color = row.color;
  }
  return color;
}
