import {readDashboardSettings} from './dashboard-settings.js';
const query = new URL(import.meta.url).search;
const navigation = await import(new URL(`./MaraoNavigation.js${query}`, import.meta.url));
const controllers = new Map();
const rootPath = () => globalThis.location?.pathname.split('/')[1];
let scheduled = false, observer;

export function nativeHostCompatible(root) {
  return typeof root?.addController === 'function' && typeof root?.removeController === 'function' && typeof root.lovelace?.setEditMode === 'function';
}

export function attachDashboardHost(root) {
  if (controllers.has(root)) return controllers.get(root);
  if (!nativeHostCompatible(root)) return undefined;
  const controller = {
    root,
    hostConnected() { this.sync(); },
    hostUpdated() { this.sync(); },
    hostDisconnected() {
      navigation.setDashboardNavigation(root, null);
      controllers.delete(root);root.removeController(this);scheduleDiscovery();
    },
    sync() {
      const path = rootPath(), config = root.lovelace?.rawConfig || root.lovelace?.config;
      const ownPath = root.panel?.url_path || root.panel?.config?.url_path || this.path;
      if (!root.isConnected || ownPath && ownPath !== path) {navigation.setDashboardNavigation(root, null);return;}
      if (!config || config.strategy) {navigation.setDashboardNavigation(root, null);return;}
      this.path ||= path;
      try {
        const settings = readDashboardSettings(config);
        navigation.setDashboardNavigation(root, settings ? {...settings.navbar,
          show_cache_reset: settings.show_cache_reset !== false, show_editor_button: settings.show_editor_button !== false,
          dashboard_root: path, native_editor: true} : null);
        this.error?.remove();this.error=null;
      } catch (error) {
        navigation.setDashboardNavigation(root, null);
        if (!this.error) {this.error=document.createElement('p');this.error.setAttribute('role','alert');this.error.dataset.maraoSettingsError='';root.shadowRoot?.append(this.error);}
        this.error.textContent = String(root.hass?.language || '').startsWith('pt') ? 'A configuração Marao não é suportada. Abra o editor do Home Assistant para a corrigir.' : 'Unsupported Marao settings. Open the Home Assistant editor to correct them.';
      }
    },
  };
  controllers.set(root, controller);root.addController(controller);controller.sync();
  return controller;
}

export function discoverDashboardHosts() {
  scheduled = false;
  const shadows = [];
  const visit = tree => {
    if (!tree?.querySelectorAll) return;
    for (const node of tree.querySelectorAll('*')) {
      if (node.localName === 'hui-root') {
        const attached=attachDashboardHost(node);
        if (!attached && node.shadowRoot) shadows.push(node.shadowRoot);
        continue;
      }
      if (node.shadowRoot && !node.closest?.('[data-marao-navigation-surface]')) {shadows.push(node.shadowRoot);visit(node.shadowRoot);}
    }
  };
  visit(document);
  // Observe HA's host path too: a document observer cannot see shadow-root replacements.
  observer ||= new MutationObserver(scheduleDiscovery);observer.disconnect();observer.observe(document,{childList:true,subtree:true});
  for (const shadow of shadows) if (shadow.host?.localName !== 'hui-root' && !shadow.host?.localName?.startsWith('marao-')) observer.observe(shadow,{childList:true});
  for (const controller of controllers.values()) controller.sync();
}
function scheduleDiscovery() {if (!scheduled) {scheduled=true;queueMicrotask(discoverDashboardHosts);}}

if (globalThis.window && globalThis.document && !window.MaraoNativeBootstrap) {
  window.MaraoNativeBootstrap = {refresh:discoverDashboardHosts,compatible:nativeHostCompatible};
  for (const event of ['location-changed','popstate']) window.addEventListener(event, scheduleDiscovery);
  customElements.whenDefined('hui-root').then(scheduleDiscovery);
  scheduleDiscovery();
}
