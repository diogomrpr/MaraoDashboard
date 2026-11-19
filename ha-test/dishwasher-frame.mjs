// Only the frame owns this Home Assistant shell and its synthetic state.
export async function mountDishwasher(createSimulation, {config, states, iconPaths, folder}) {
  const packageURL = new URL('/local/community/' + folder + '/', location.href);
  const policy = document.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = 'connect-src ' + packageURL.href;
  document.head.append(policy);

  class Shell extends HTMLElement {
    constructor() { super(); this.attachShadow({mode:'open'}); }
  }
  class Icon extends Shell {
    static observedAttributes = ['icon'];
    set icon(value) { this.setAttribute('icon', value || ''); }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    render() {
      this.shadowRoot.innerHTML = '<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);flex-shrink:0}svg{width:100%;height:100%;fill:currentColor}</style><svg aria-hidden="true" viewBox="0 0 24 24"><path/></svg>';
      const path = iconPaths[this.getAttribute('icon')] || iconPaths['mdi:help-circle-outline'];
      this.shadowRoot.querySelector('path').setAttribute('d', path);
    }
  }
  class StateIcon extends Icon {
    set stateObj(value) { this.icon = value?.attributes?.icon || 'mdi:dishwasher'; }
  }
  customElements.define('home-assistant', Shell);
  customElements.define('hui-root', class extends Shell {});
  customElements.define('ha-icon', Icon);
  customElements.define('ha-state-icon', StateIcon);

  const app = document.createElement('home-assistant');
  const root = document.createElement('hui-root');
  const view = document.createElement('main');
  view.id = 'view';
  view.style.padding = '12px';
  const dashboard = {title:'Dishwasher controls', views:[{path:'dishwasher', cards:[config]}]};
  root.panel = {url_path:'marao-dashboard'};
  root.lovelace = {config:dashboard, rawConfig:dashboard, editMode:false, current_view:0};
  root.shadowRoot.append(view);
  app.shadowRoot.append(root);
  document.body.append(app);
  const language = navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
  const theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.lang = language;
  let card;
  function publish(hass) {
    app.hass = hass;
    root.hass = hass;
    if (card) card.hass = hass;
  }
  const simulation = createSimulation({config, states, dashboard, language, theme, onChange:publish});
  publish(simulation.hass);
  await import(new URL('MaraoFrontend.js', packageURL));
  const identity = window.MaraoInstalledFrontendPackage?.identity;
  if (!/^[\da-f]{64}$/.test(identity)) throw new Error('The installed Marao package could not load');
  await window.MaraoDashboardRuntime.ready;
  const {applyTheme} = await import(new URL(identity + '--MaraoTheme.js', packageURL));
  applyTheme(document.documentElement, simulation.hass);
  const tag = config.type.slice('custom:'.length);
  if (!customElements.get(tag)) throw new Error('The installed dishwasher card could not load');
  card = document.createElement(tag);
  view.append(card);
  card.hass = simulation.hass;
  card.setConfig({...config, name:language === 'pt' ? 'Máquina de lavar loiça simulada' : 'Simulated dishwasher'});
  document.getElementById('status').textContent = '';
}
