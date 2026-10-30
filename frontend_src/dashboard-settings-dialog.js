import {saveDashboardSettings, readDashboardSettings, validateDashboardSettings} from './dashboard-settings.js';
const navigation=await import(new URL(`./MaraoNavigation.js${new URL(import.meta.url).search}`,import.meta.url));
const words={en:{title:'Marao settings',close:'Close',save:'Save',add:'Add destination',remove:'Remove',up:'Move up',down:'Move down',label:'Label',address:'Address',icon:'Icon',cache:'Show cache reset button',editor:'Show editor button',missing:'Destination does not match a current view.',conflict:'This dashboard changed. Close and reopen settings to reconcile your changes.',error:'Could not save settings.',invalid:'Check each destination address and label.'},pt:{title:'Definições Marao',close:'Fechar',save:'Guardar',add:'Adicionar destino',remove:'Remover',up:'Mover para cima',down:'Mover para baixo',label:'Etiqueta',address:'Endereço',icon:'Ícone',cache:'Mostrar botão de limpeza da cache',editor:'Mostrar botão do editor',missing:'O destino não corresponde a uma página atual.',conflict:'O painel foi alterado. Feche e reabra as definições para conciliar as alterações.',error:'Não foi possível guardar as definições.',invalid:'Verifique o endereço e a etiqueta de cada destino.'}};
export async function openDashboardSettings(root,opener) {
  if(!root?.hass?.user?.is_admin || root.lovelace?.editMode || root._maraoSettingsDialog)return;
  const hass=root.hass, path=location.pathname.split('/')[1],user=hass.user.id;
  const baseline=await hass.callWS({type:'lovelace/config',url_path:path,force:true});
  if(!root.isConnected || location.pathname.split('/')[1]!==path || root.hass?.user?.id!==user)return;
  const draft=structuredClone(readDashboardSettings(baseline)),t=words[String(hass.language).startsWith('pt')?'pt':'en'];
  if(!draft)return;
  const dialog=document.createElement('dialog');root._maraoSettingsDialog=dialog;
  dialog.innerHTML=`<style>dialog{position:fixed;inset:auto 0 0;margin:auto;width:min(100%,600px);max-height:calc(100dvh - 50px);box-sizing:border-box;border:0;border-radius:24px 24px 0 0;padding:20px 16px 32px;background:var(--ha-card-background);color:var(--primary-text-color);font:inherit;overflow:auto;overscroll-behavior:contain;animation:marao-up .2s ease-out}dialog::backdrop{background:#0008}header{display:flex;align-items:center;gap:12px}h2{flex:1;margin:0;overflow-wrap:anywhere}button,input{font:inherit;color:inherit;min-width:48px;min-height:48px;box-sizing:border-box;border-radius:16px}button{border:0;padding:12px;background:var(--secondary-background-color)}input{width:100%;border:1px solid var(--divider-color);background:var(--ha-card-background);padding:8px}button:focus,input:focus{outline:none}label{display:block;margin-top:12px;overflow-wrap:anywhere}input[type=checkbox]{width:48px;vertical-align:middle}.route{border:1px solid var(--divider-color);border-radius:20px;padding:12px;margin-top:12px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.status{overflow-wrap:anywhere}footer{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}@keyframes marao-up{from{transform:translateY(100%)}to{transform:translateY(0)}}</style><header><h2></h2><button type=button data-close>×</button></header><div data-routes></div><button type=button data-add></button><div data-flags></div><p class=status role=alert></p><footer><button type=button data-save></button></footer>`;
  const restore=navigation.focusRestorer(opener),listeners=new AbortController();let busy=false;
  const close=()=>{if(busy)return;dialog.close();dialog.remove();delete root._maraoSettingsDialog;listeners.abort();restore();};
  const valid=()=>root.isConnected&&location.pathname.split('/')[1]===path&&root.hass?.user?.id===user&&root.hass?.user?.is_admin&&!root.lovelace?.editMode;
  dialog.querySelector('h2').textContent=t.title;dialog.querySelector('[data-close]').setAttribute('aria-label',t.close);dialog.querySelector('[data-close]').onclick=close;
  dialog.querySelector('[data-add]').textContent=t.add;dialog.querySelector('[data-save]').textContent=t.save;
  const render=()=>{
    const host=dialog.querySelector('[data-routes]');host.replaceChildren();
    draft.navbar.routes.forEach((route,index)=>{
      const row=document.createElement('section');row.className='route';const warning=document.createElement('p');warning.textContent=t.missing;const updateWarning=()=>{let local;try{const destination=new URL(route.url||route.path||'',location.href);if(destination.origin===location.origin)local=destination.pathname.split('/');}catch{}warning.hidden=!(local?.[1]===path&&local[2]&&!baseline.views.some((view,i)=>String(view.path??i)===local[2]));};
      for(const [key,label]of [['label',t.label],['path',t.address],['icon',t.icon]]){
        const field=document.createElement('label');field.textContent=label;const input=document.createElement('input');input.value=key==='path'?(route.url||route.path||''):(route[key]||'');
        input.oninput=()=>{if(key==='path'&&route.url)route.url=input.value;else route[key]=input.value;updateWarning();};field.append(input);row.append(field);
      }
      updateWarning();row.append(warning);
      const actions=document.createElement('div');actions.className='actions';
      for(const [label,disabled,act]of [[t.up,index===0,()=>{[draft.navbar.routes[index-1],draft.navbar.routes[index]]=[route,draft.navbar.routes[index-1]];}],[t.down,index===draft.navbar.routes.length-1,()=>{[draft.navbar.routes[index+1],draft.navbar.routes[index]]=[route,draft.navbar.routes[index+1]];}],[t.remove,false,()=>draft.navbar.routes.splice(index,1)]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled;button.onclick=()=>{navigation.haptic('heavy');act();render();};actions.append(button);}
      row.append(actions);host.append(row);
    });
  };
  render();dialog.querySelector('[data-add]').onclick=()=>{navigation.haptic('heavy');const view=baseline.views[0];draft.navbar.routes.push({path:view?`/${path}/${view.path??0}`:'',label:view?.title||'',icon:view?.icon||'mdi:home'});render();};
  for(const [key,label]of [['show_cache_reset',t.cache],['show_editor_button',t.editor]]){const field=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=draft[key]!==false;input.onchange=()=>draft[key]=input.checked;field.append(input,document.createTextNode(label));dialog.querySelector('[data-flags]').append(field);}
  dialog.querySelector('[data-save]').onclick=async()=>{
    if(busy||!valid())return;try{validateDashboardSettings(draft);}catch{dialog.querySelector('.status').textContent=t.invalid;return;}navigation.haptic('heavy');busy=true;dialog.querySelector('[data-save]').disabled=true;
    try{await saveDashboardSettings(root.hass,path,baseline,draft,valid);busy=false;close();}
    catch(error){dialog.querySelector('.status').textContent=error.message==='settings_stale'?t.conflict:(error.message||t.error);busy=false;dialog.querySelector('[data-save]').disabled=false;}
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(root._maraoSettingsDialog===dialog)close();});
  window.addEventListener('location-changed',()=>{if(!valid()){busy=false;close();}},{signal:listeners.signal});
  root.shadowRoot.append(dialog);dialog.showModal();
}
