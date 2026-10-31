export const SETTINGS_VERSION = 1;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function dashboardViewForAddress(document, dashboardPath, address, origin) {
  let url;
  try { url = new URL(address, origin); } catch { return undefined; }
  if (url.origin !== origin) return undefined;
  const parts = url.pathname.replace(/\/$/, '').split('/');
  if (parts[1] !== dashboardPath || parts.length > 3) return undefined;
  if (!parts[2]) return document.views?.[0];
  let viewPath;
  try { viewPath = decodeURIComponent(parts[2]); } catch { return undefined; }
  return document.views?.find((view, index) => String(view.path ?? index) === viewPath);
}

// Native forms emit their complete value; patch only deliberate edits to retain opaque route data.
export function patchNavbarRoute(route, previous, next) {
  const result = {...route};
  for (const key of ['label', 'icon', 'destination']) {
    if (next[key] === previous[key]) continue;
    result[key === 'destination' ? (route.url ? 'url' : 'path') : key] = next[key] || '';
  }
  return result;
}

export function moveNavbarRoute(routes, oldIndex, newIndex) {
  if (![oldIndex, newIndex].every(index => Number.isInteger(index) && index >= 0 && index < routes.length) || oldIndex === newIndex) return routes;
  const next = routes.slice();
  next.splice(newIndex, 0, next.splice(oldIndex, 1)[0]);
  return next;
}

export function validateDashboardSettings(value) {
  if (!object(value) || value.version !== SETTINGS_VERSION) throw new Error('Unsupported Marao dashboard settings version.');
  if (!object(value.navbar) || !Array.isArray(value.navbar.routes)) throw new Error('Marao navigation requires a route list.');
  for (const route of value.navbar.routes) {
    if (!object(route) || typeof (route.url || route.path) !== 'string' || !(route.url || route.path).trim()
      || typeof route.label !== 'string' || !route.label.trim()) throw new Error('Each navigation destination needs an address and label.');
    const address = route.url || route.path;
    if (!address.startsWith('/') && !/^https?:\/\//i.test(address)) throw new Error('Navigation addresses must be dashboard paths or HTTP links.');
  }
  for (const key of ['show_cache_reset', 'show_editor_button']) if (Object.hasOwn(value, key) && typeof value[key] !== 'boolean') throw new Error('Marao shortcut settings must be booleans.');
  return value;
}

export function readDashboardSettings(document) {
  if (!Object.hasOwn(document || {}, 'marao')) return undefined;
  return validateDashboardSettings(document.marao);
}

export function patchDashboardSettings(document, settings) {
  if (!object(document) || document.strategy || !Array.isArray(document.views)) throw new Error('Use an ordinary Home Assistant dashboard.');
  if (Object.hasOwn(document, 'marao')) readDashboardSettings(document);
  validateDashboardSettings(settings);
  return {...structuredClone(document), marao: structuredClone(settings)};
}

export async function saveDashboardSettings(hass, path, baseline, settings, isCurrent) {
  const permitted = () => hass.user?.is_admin && isCurrent();
  if (!permitted()) throw new Error('settings_stale');
  const current = await hass.callWS({type:'lovelace/config',url_path:path,force:true});
  if (!permitted() || JSON.stringify(current) !== JSON.stringify(baseline)) throw new Error('settings_stale');
  const config = patchDashboardSettings(current, settings);
  await hass.callWS({type:'lovelace/config/save',url_path:path,config});
  return config;
}
