const query = new URL(import.meta.url).search;
if (!window.MaraoDashboardRuntime) {
  // The bridge and HACS resource can coexist; one document must keep one runtime graph.
  const state = window.MaraoDashboardRuntime = {};
  const identity = new URL(import.meta.url).pathname.match(/\/([a-f0-9]{64})--MaraoDashboard\.js$/)?.[1];
  const root = new URL('./',import.meta.url);
  window.MaraoFrontendPackage = identity ? {identity,package_version:window.MaraoInstalledFrontendPackage?.package_version,entryURL:window.MaraoInstalledFrontendPackage?.entryURL,rootURL:root.href,baseURL:root.href,manifestURL:new URL('MaraoFrontend.release.json',root).href} : undefined;
  state.navigation = (async () => {
    while (!globalThis.customElements?.get('home-assistant')) await new Promise(resolve => setTimeout(resolve,16));
    return import(new URL(`./MaraoNavigation.js${query}`,import.meta.url));
  })();
  state.ready = state.navigation.then(navigation => (async () => {
    // Register ordinary HA cards before downloading the larger content runtime.
    const cards = await import(new URL(`./MaraoCards.js${query}`,import.meta.url));
    cards.registerMaraoCards();
    await Promise.all(['MaraoFloorPlanCard.js','MaraoSchedules.js'].map(file => import(new URL(`./${file}${query}`,import.meta.url))));
    await import(new URL(`./MaraoNativeCards.js${query}`,import.meta.url));
    return Promise.all(['MaraoRuntime.js','MaraoFrigateEventsCard.js'].map(file => import(new URL(`./${file}${query}`,import.meta.url))));
  })().catch(error => {
    console.error('Marao dashboard content failed to initialize',error);
    const message=document.createElement('p');message.setAttribute('role','alert');
    message.textContent=navigation.navigationLocalize('navigation.loading_error',document.querySelector('home-assistant')?.hass);
    (navigation.findElements('hui-root')[0]?.shadowRoot?.querySelector('#view') || document.body).append(message);
  }));
}
await window.MaraoDashboardRuntime.navigation;
export const runtimeReady = window.MaraoDashboardRuntime.ready;
