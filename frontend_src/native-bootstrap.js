import { languageCode } from '../custom_components/marao_dashboard/frontend/MaraoLocale.js';
import {refreshCardMetadata} from './native-card-language.js';
import {readSettings} from './dashboard-settings-validation.js';
import {createPopupCoordinator} from './popup-coordinator.js';
// Cached older loaders publish installed metadata before loading this graph.
if (globalThis.window?.MaraoInstalledFrontendPackage && !window.MaraoFrontendPackage) {
  window.MaraoFrontendPackage = window.MaraoInstalledFrontendPackage;
}
const query = new URL(import.meta.url).search;
const navigation = await import(new URL(`./MaraoNavigation.js${query}`, import.meta.url));
const controllers = new Map();
const rootPath = () => globalThis.location?.pathname.split('/')[1];
let scheduled = false, observer, checkInitialView;

export function nativeHostCompatible(root) {
  return typeof root?.addController === 'function' && typeof root?.removeController === 'function' && typeof root.lovelace?.setEditMode === 'function';
}

export function findDashboardHost(path) {
  const matches=[...controllers.values()].filter(({root,path:ownerPath})=>root.isConnected && (root.panel?.url_path || root.panel?.config?.url_path || ownerPath)===path);
  return matches.length===1 ? matches[0].root : null;
}

// The resources can register before HA has mounted its first Lovelace view.
// Give that view a paint before using the link for other cards.
export function waitForInitialViewPaint(demand, cardPaint) {
  const path = rootPath(), address = location.pathname;
  const panel = document.querySelector('home-assistant')?.hass?.panels?.[path];
  if (panel?.component_name !== 'lovelace' || document.hidden || demand.aborted) return;
  return new Promise(resolve => {
    let observed, mutation, painting = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      checkInitialView = null;
      mutation?.disconnect();
      clearTimeout(timeout);
      demand.removeEventListener('abort', finish);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('location-changed', check);
      window.removeEventListener('popstate', check);
      resolve();
    };
    const check = () => {
      if (location.pathname !== address || document.hidden) return finish();
      const root = findDashboardHost(path);
      if (!root?.shadowRoot) return;
      if (root.lovelace.rawConfig?.strategy || root.lovelace.config?.strategy || root.lovelace.editMode) return finish();
      if (painting) return;
      const index = root.lovelace.current_view;
      const active = [...root.shadowRoot.querySelectorAll('#view hui-view')].find(view =>
        !view.hidden && (index == null || view.index == null || view.index === index));
      if (active) {
        painting = true;
        const dashboard = root.lovelace.config || root.lovelace.rawConfig;
        const view = dashboard?.views?.[index ?? active.index ?? 0];
        const usesMaraoCard = node => typeof node?.type === 'string' && node.type.startsWith('custom:marao-')
          || (Array.isArray(node?.cards) && node.cards.some(usesMaraoCard)) || (Array.isArray(node?.sections) && node.sections.some(usesMaraoCard))
          || Boolean(node?.card && usesMaraoCard(node.card));
        // Give ordinary cards a layout pass to report a visible surface.
        // Only an otherwise empty first screen needs to start raw custom
        // cards from the view definition before that first card paints.
        const afterLayout = () => {
          if (finished) return;
          const runtime = window.MaraoDashboardRuntime;
          if (cardPaint && runtime?.hasVisibleCard) {
            cardPaint.then(finish);
            return;
          }
          const specialty = runtime?.loadViewContent?.(view);
          if (specialty) specialty.then(() => requestAnimationFrame(() => requestAnimationFrame(finish)), finish);
          else if (cardPaint && usesMaraoCard(view)) cardPaint.then(finish);
          else finish();
        };
        requestAnimationFrame(() => requestAnimationFrame(afterLayout));
      } else if (observed !== root.shadowRoot) {
        mutation?.disconnect();
        observed = root.shadowRoot;
        mutation = new MutationObserver(check);
        mutation.observe(observed, {childList:true, subtree:true});
      }
    };
    // An unsupported host or an interrupted initial navigation must release the
    // global resource as well, including for cards used in another HA panel.
    const timeout = setTimeout(finish, 15000);
    checkInitialView = check;
    demand.addEventListener('abort', finish, {once:true});
    document.addEventListener('visibilitychange', check);
    window.addEventListener('location-changed', check);
    window.addEventListener('popstate', check);
    check();
  });
}

export function attachDashboardHost(root) {
  if (controllers.has(root)) return controllers.get(root);
  if (!nativeHostCompatible(root)) return undefined;
  const controller = {
    root,
    popups:createPopupCoordinator(root),
    hostConnected() { this.sync(); },
    hostUpdated() { this.sync(); },
    hostDisconnected() {
      this.popups.dispose();
      navigation.setDashboardNavigation(root, null);
      controllers.delete(root);root.removeController(this);scheduleDiscovery();
    },
    sync() {
      checkInitialView?.();
      refreshCardMetadata(root.hass);
      this.popups.sync();
      const path = rootPath(), config = root.lovelace?.rawConfig || root.lovelace?.config;
      const ownPath = root.panel?.url_path || root.panel?.config?.url_path || this.path;
      if (!root.isConnected || ownPath && ownPath !== path) {navigation.setDashboardNavigation(root, null);return;}
      if (!config || config.strategy) {navigation.setDashboardNavigation(root, null);return;}
      this.path ||= path;
      try {
        const settings = readSettings(config, navigation.locationError);
        navigation.setDashboardNavigation(root, settings ? {...settings.navbar,
          show_cache_reset: settings.show_cache_reset !== false, show_editor_button: settings.show_editor_button !== false,
          dashboard_root: path, native_editor: true} : null);
        this.error?.remove();this.error=null;
      } catch (error) {
        navigation.setDashboardNavigation(root, null);
        if (!this.error) {this.error=document.createElement('p');this.error.setAttribute('role','alert');this.error.dataset.maraoSettingsError='';root.shadowRoot?.append(this.error);}
        this.error.textContent = languageCode(root.hass) === 'pt' ? 'A configuração Marao não é suportada. Abra o editor do Home Assistant para a corrigir.' : 'Unsupported Marao settings. Open the Home Assistant editor to correct them.';
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
  window.MaraoNativeBootstrap = {refresh:discoverDashboardHosts,compatible:nativeHostCompatible,findHost:findDashboardHost,waitForInitialViewPaint};
  for (const event of ['location-changed','popstate']) window.addEventListener(event, scheduleDiscovery);
  customElements.whenDefined('hui-root').then(scheduleDiscovery);
  scheduleDiscovery();
}
