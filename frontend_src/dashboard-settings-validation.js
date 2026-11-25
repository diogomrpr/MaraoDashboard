export const SETTINGS_VERSION = 1;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateSettings(value, locationError) {
  if (!object(value) || value.version !== SETTINGS_VERSION) throw new Error('Unsupported Marao dashboard settings version.');
  if (!object(value.navbar) || !Array.isArray(value.navbar.routes)) throw new Error('Marao navigation requires a route list.');
  for (const route of value.navbar.routes) {
    if (!object(route) || typeof (route.url || route.path) !== 'string' || !(route.url || route.path).trim()
      || typeof route.label !== 'string' || !route.label.trim()) throw new Error('Each navigation destination needs an address and label.');
    const address = route.url || route.path;
    if (!address.startsWith('/') && !/^https?:\/\//i.test(address)) throw new Error('Navigation addresses must be dashboard paths or HTTP links.');
  }
  const error=locationError(value.navbar.current_room);if(error)throw new Error(error);
  for (const key of ['show_cache_reset', 'show_editor_button']) if (Object.hasOwn(value, key) && typeof value[key] !== 'boolean') throw new Error('Marao shortcut settings must be booleans.');
  return value;
}

export function readSettings(document, locationError) {
  if (!Object.hasOwn(document || {}, 'marao')) return undefined;
  return validateSettings(document.marao, locationError);
}
