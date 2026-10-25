import theme from '../custom_components/marao_dashboard/frontend/themes/MaraoDashboard/marao-dashboard.yaml';

const originals = new WeakMap();
export function releaseTheme(root) {
  const saved = originals.get(root);
  if (!saved) return;
  for (const [key, [value, priority, applied]] of saved) {
    if (root.style.getPropertyValue(key) !== applied) continue;
    if (value) root.style.setProperty(key, value, priority); else root.style.removeProperty(key);
  }
  originals.delete(root);
}
export function applyTheme(root, hass) {
  if (!globalThis.window?.MaraoFrontendPackage || !root?.style) return;
  const {modes, ...base} = theme['Marao Dashboard'];
  const tokens = {...base, ...modes[hass?.themes?.darkMode ? 'dark' : 'light']};
  let saved = originals.get(root);
  if (!saved) { saved = new Map(); originals.set(root, saved); }
  for (const [name, raw] of Object.entries(tokens)) {
    const key = name.startsWith('--') ? name : '--' + name;
    const value = String(raw);
    if (!saved.has(key)) saved.set(key, [root.style.getPropertyValue(key), root.style.getPropertyPriority(key), value]);
    if (root.style.getPropertyValue(key) !== value) root.style.setProperty(key, value);
    saved.get(key)[2] = value;
  }
}
