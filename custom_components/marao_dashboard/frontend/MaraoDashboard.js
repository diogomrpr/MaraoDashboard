const query = new URL(import.meta.url).search;
while (!globalThis.customElements?.get('home-assistant')) await new Promise(resolve => setTimeout(resolve, 16));
const navigation = await import(`./MaraoNavigation.js${query}`);
// Recovery stays usable even when a content module fails to initialize.
export const runtimeReady = import(`./MaraoRuntime.js${query}`).catch(error => {
  console.error('Marao dashboard content failed to initialize', error);
  const message = document.createElement('p'); message.setAttribute('role', 'alert');
  message.textContent = navigation.navigationLocalize('navigation.loading_error', document.querySelector('home-assistant')?.hass);
  (navigation.findElements('hui-root')[0]?.shadowRoot?.querySelector('#view') || document.body).append(message);
});
