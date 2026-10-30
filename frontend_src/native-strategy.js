const query = new URL(import.meta.url).search;
await import(new URL(`./MaraoNativeBootstrap.js${query}`,import.meta.url));
const model = () => import(new URL(`./MaraoNativeModel.js${query}`,import.meta.url));
const theme = await import(new URL(`./MaraoTheme.js${query}`,import.meta.url));
const navigation = await import(new URL(`./MaraoNavigation.js${query}`,import.meta.url));
const language = hass => String(hass?.language || 'en').startsWith('pt');
const rootFor = (config,hass) => {
  const route = globalThis.location?.pathname?.split('/')[1];
  return (hass?.panels?.[route]?.component_name || hass?.panels?.[route]?.component) === 'lovelace' ? route : config.dashboard_root || 'marao-dashboard';
};

export class MaraoDashboardStrategy extends HTMLElement {
  static registryDependencies = [];
  static configRequired = true;
  static getCreateSuggestions() { return {title:'Marao Dashboard',icon:'mdi:view-dashboard-outline'}; }
  static async getConfigElement() { return document.createElement('marao-strategy-editor'); }
  static async generate(config,hass) {
    const {convertDocument,metadataSnapshot} = await model();
    const root = rootFor(config,hass);
    if (!config.source_json) return {title:'Marao Dashboard',views:[{title:'Marao',path:'setup',type:'panel',cards:[{type:'custom:marao-dashboard-editor-card',dashboard_root:root,create:true}]}]};
    const converted = convertDocument(JSON.stringify({strategy:config}),{...metadataSnapshot(hass),dashboardRoot:root,language:hass.language,assetBaseURL:new URL('./',import.meta.url).href});
    const result = converted.compiled;
    // Scoped native styling owns the bundled theme; retain deliberate other named themes.
    for (const view of result.views) {
      if (view.theme === 'Marao Dashboard') delete view.theme;
      let navbar = view.cards.at(-1);
      while (navbar?.cards && navbar.type !== 'custom:marao-navbar-card') navbar = navbar.cards.at(-1);
      if (navbar?.type === 'custom:marao-navbar-card') {
        navbar.dashboard_root = root;
        if (hass.user?.is_admin) navbar.editor_path = converted.document.strategy.editor_path;
      }
    }
    // HA retains the active numeric view index during saves; keep the editor after the landing view.
    if (hass.user?.is_admin) result.views.splice(1,0,{title:language(hass)?'Converter dashboard':'Convert dashboard',path:converted.document.strategy.editor_path,type:'panel',subview:true,cards:[{type:'custom:marao-dashboard-editor-card',dashboard_root:root}]});
    return result;
  }
}

class MaraoMigrationHost extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this._epoch=0;}
  _syncOwner(){
    const owner={root:rootFor(this._config||{},this._hass),user:this._hass?.user?.id,admin:this._hass?.user?.is_admin===true,connection:this._hass?.connection};
    if(this._owner&&Object.keys(owner).some(key=>owner[key]!==this._owner[key])){this._epoch++;this._child=null;this.shadowRoot.replaceChildren();}
    this._owner=owner;
  }
  setConfig(config){this._config=config;this._syncOwner();this._mount();}
  set hass(hass){this._hass=hass;this._syncOwner();this._mount();}
  connectedCallback(){this._mount();}
  disconnectedCallback(){this._epoch++;}
  getCardSize(){return 8;}
  async _mount(){
    if(!this.isConnected||!this._hass||!this._config||this._mounting)return;
    if(!this._hass.user?.is_admin){this.shadowRoot.textContent=language(this._hass)?'Só os administradores podem converter este dashboard.':'Only administrators can convert this dashboard.';this._child=null;return;}
    if(this._child){this._child.hass=this._hass;return;}
    this._mounting=true;const epoch=this._epoch;
    try{
      await import(new URL(`./MaraoOrdinaryMigration.js${query}`,import.meta.url));
      if(!this.isConnected||epoch!==this._epoch||!this._hass.user?.is_admin)return;
      const card=document.createElement('marao-migration-card');card.setConfig({dashboard_root:rootFor(this._config,this._hass)});card.hass=this._hass;
      this._child=card;this.shadowRoot.replaceChildren(card);
    }catch(error){if(this.isConnected&&epoch===this._epoch&&this._hass.user?.is_admin){const alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent=(language(this._hass)?'Não foi possível abrir a conversão. ':'Could not open conversion. ')+error.message;const retry=document.createElement('button');retry.type='button';retry.style.cssText='min-width:48px;min-height:48px;font:inherit';retry.textContent=language(this._hass)?'Tentar novamente':'Retry';retry.onclick=()=>this._mount();this.shadowRoot.replaceChildren(alert,retry);}}
    finally{this._mounting=false;if(this.isConnected&&epoch!==this._epoch)this._mount();}
  }
}
class MaraoEditorCard extends MaraoMigrationHost {}
class MaraoStrategyEditor extends MaraoMigrationHost {}
for(const [name,element]of [['ll-strategy-dashboard-marao-dashboard',MaraoDashboardStrategy],['marao-dashboard-editor-card',MaraoEditorCard],['marao-strategy-editor',MaraoStrategyEditor]])if(!customElements.get(name))customElements.define(name,element);
// Historical routes retain conversion access; fresh dashboards use ordinary HA authoring.
