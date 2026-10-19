const fs = require('node:fs');
const path = require('node:path');
const frontend = path.resolve(__dirname, '../custom_components/marao_dashboard/frontend');
const source = fs.readFileSync(path.join(frontend, 'MaraoDashboard.js'), 'utf8');
const localization = source.slice(source.indexOf('const TRANSLATIONS ='), source.indexOf('const POPUP_SCROLL_GUARD_VERSION'));

function documentHTML(version) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="fixture-build" content="${version}"><link rel="icon" href="data:,"><style>
  :root{--ha-card-background:#eaf0f8;--primary-text-color:#142e50;--primary-color:#28629e;--text-primary-color:#fff;--divider-color:#8297b1;--safe-area-inset-bottom:34px;--safe-area-inset-left:0px;--safe-area-inset-right:0px;--safe-area-inset-top:0px}body{margin:0;font-family:Montserrat,system-ui,sans-serif;background:var(--ha-card-background);color:var(--primary-text-color)}main{padding:16px;min-height:180vh}h1{font-size:1.3rem}ha-icon{display:inline-grid;place-items:center;width:26px;height:26px}ha-icon:before{content:'●'}
  </style></head><body><main><h1>Safe frontend refresh fixture</h1><p>Hold the navbar for three seconds. No entity actions.</p></main><script>${localization}
  window.MaraoDashboard={localize};window.services=0;window.haptics=[];addEventListener('haptic',event=>haptics.push(event.detail));
  // Reproduce HA's recovery cleanup, including its omission of the fragment.
  const haRecovery=new URL(location.href);if(haRecovery.searchParams.has('ha_cache_bust')){haRecovery.searchParams.delete('ha_cache_bust');history.replaceState(null,'',haRecovery.pathname+haRecovery.search);}
  customElements.define('ha-icon',class extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;width:26px;height:26px}svg{display:block;width:100%;height:100%}</style><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 11 12 3l9 8v10h-6v-7H9v7H3z"/></svg>';}});
  localStorage.setItem('fixture-sign-in',localStorage.getItem('fixture-sign-in')||'retained');localStorage.setItem('fixture-preferences','retained');
  </script><script type="module">
  const cards=await import('/marao_dashboard_static/MaraoCards.js?v=${version}');cards.registerMaraoCards();
  await import('/marao_dashboard_static/MaraoNativeCards.js?v=${version}');
  const search=new URLSearchParams(location.search),native=search.has('native');window.kind=native?'native':'generated';
  window.routes=Array.from({length:8},(_,i)=>({url:'/marao-dashboard/'+(i?'page-'+i:'rooms'),label:i?'Destination '+i:'Rooms',icon:'mdi:home'}));
  window.navConfig={type:'custom:marao-navbar-card',routes};
  window.hass={connected:true,connection:{connected:true},language:'en',states:{},user:{is_admin:false},callService(){services++;throw Error('Unexpected service');},callWS:async()=>({card:navConfig,popups:[]})};
  window.card=document.createElement(native?'marao-native-navbar-card':'marao-navbar-card');card.setConfig(native?{type:'custom:marao-native-navbar-card',routes}:navConfig);card.hass=hass;document.body.append(card);
  window.ready=true;
  </script></body></html>`;
}

const serviceWorker = `self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&event.request.mode==='navigate')event.respondWith(caches.match(new URL(event.request.url).pathname,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)));});`;
module.exports = { documentHTML, frontend, serviceWorker };
