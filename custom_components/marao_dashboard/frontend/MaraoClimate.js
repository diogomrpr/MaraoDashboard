export function climateConfigError(variables = {}, hass) {
  variables ||= {};
  const pt=String(hass?.language || '').startsWith('pt');
  if(Object.hasOwn(variables,'enable_popup') && typeof variables.enable_popup!=='boolean')return pt?'Ativar popup de climatização tem de ser um valor booleano.':'Enable climate popup must be a boolean.';
  if(variables.humidity_entity!=null && variables.humidity_entity!=='' && (typeof variables.humidity_entity!=='string' || !/^sensor\.[a-z0-9_]+$/.test(variables.humidity_entity)))return pt?'Escolha um sensor de humidade.':'Choose a humidity sensor.';
  return '';
}
export function climateHumidity(variables,hass) {
  if(!variables?.humidity_entity)return null;
  const raw=hass?.states?.[variables.humidity_entity]?.state;
  const value=typeof raw==='string'&&raw.trim()!==''?Number(raw):NaN;
  return Number.isFinite(value)&&value>=0&&value<=100?new Intl.NumberFormat(hass?.locale?.language || hass?.language || 'en',{style:'percent',maximumFractionDigits:1}).format(value/100):'—';
}
