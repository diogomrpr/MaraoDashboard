import {saveDashboardSettings, readDashboardSettings, validateDashboardSettings, dashboardViewForAddress, patchNavbarRoute, moveNavbarRoute} from './dashboard-settings.js';
const navigation=await import(new URL(`./MaraoNavigation.js${new URL(import.meta.url).search}`,import.meta.url));
const words={
  en:{title:'Marao settings',loading:'Loading settings…',loadError:'Could not load settings. Try again.',retry:'Retry',close:'Close',save:'Save',saving:'Saving…',add:'Add a page or destination',remove:'Remove',up:'Move up',down:'Move down',menu:'Page options',drag:'Drag to reorder',label:'Display name',destination:'Page or destination',icon:'Icon',navbar:'Navigation bar',hint:'Choose dashboard pages and arrange them in the order you want.',shortcuts:'Dashboard shortcuts',cache:'Show cache reset button',editor:'Show editor button',empty:'No pages in the navigation bar.',missing:'Destination does not match a current view.',conflict:'This dashboard changed. Close and reopen settings to reconcile your changes.',error:'Could not save settings.',invalid:'Check each destination and display name.'},
  pt:{title:'Definições Marao',loading:'A carregar as definições…',loadError:'Não foi possível carregar as definições. Tente novamente.',retry:'Tentar novamente',close:'Fechar',save:'Guardar',saving:'A guardar…',add:'Adicionar página ou destino',remove:'Remover',up:'Mover para cima',down:'Mover para baixo',menu:'Opções da página',drag:'Arrastar para reordenar',label:'Nome apresentado',destination:'Página ou destino',icon:'Ícone',navbar:'Barra de navegação',hint:'Escolha as páginas do painel e organize a ordem em que aparecem.',shortcuts:'Atalhos do painel',cache:'Mostrar botão de limpeza da cache',editor:'Mostrar botão do editor',empty:'A barra de navegação não tem páginas.',missing:'O destino não corresponde a uma página atual.',conflict:'O painel foi alterado. Feche e reabra as definições para conciliar as alterações.',error:'Não foi possível guardar as definições.',invalid:'Verifique o destino e o nome de cada página.'}
};
const menuIcon='M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z';
const CSS=`
.marao-settings{position:fixed;inset:auto 0 0;margin:auto;width:min(100%,640px);max-width:100%;max-height:calc(100dvh - 24px);box-sizing:border-box;border:0;border-radius:28px 28px 0 0;padding:0;background:var(--ha-card-background);color:var(--primary-text-color);font:1rem/1.5 var(--primary-font-family,Montserrat,sans-serif);overflow:hidden;box-shadow:0 -8px 40px #0002;animation:marao-settings-up .2s ease-out;--ha-font-family-body:var(--primary-font-family);--ha-font-family-heading:var(--primary-font-family);--ha-font-family-code:monospace;--ha-font-size-m:1rem;--ha-font-size-s:.875rem;--ha-font-weight-normal:400;--ha-font-weight-medium:600;--ha-font-weight-bold:700;--ha-color-fill-primary-normal-resting:var(--primary-color);--ha-color-on-primary-normal:var(--text-primary-color)}
.marao-settings[open]{display:grid;grid-template-rows:auto minmax(0,1fr) auto}
.marao-settings::backdrop{background:#0008}
.marao-settings *{box-sizing:border-box}
.marao-settings [hidden]{display:none!important}
.marao-settings header{display:flex;align-items:center;gap:12px;padding:20px 20px 12px}
.marao-settings h2{font-size:1.25rem;line-height:1.4;margin:0;flex:1;overflow-wrap:anywhere}
.marao-settings h3{font-size:1rem;margin:0 0 4px;font-weight:700}
.marao-settings p{margin:0;overflow-wrap:anywhere}
.marao-settings .body{overflow:auto;overscroll-behavior:contain;padding:4px 20px 20px;min-height:0}
.marao-settings .hint,.marao-settings .destination{color:var(--secondary-text-color);font-size:.875rem}
.marao-settings .hint{margin-bottom:16px}
.marao-settings ha-sortable{display:block}
.marao-settings .drag-handle{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;padding:12px;background:transparent;color:var(--secondary-text-color);touch-action:none;cursor:grab}
.marao-settings .drag-handle>*{pointer-events:none}
.marao-settings .drag-handle:active{cursor:grabbing}
.marao-settings .sortable-ghost{opacity:.4}
.marao-settings .sortable-drag{box-shadow:0 4px 16px #0003}
.marao-settings [data-routes]{display:grid;gap:8px;margin-bottom:16px}
.marao-settings .route{border-radius:20px;background:var(--secondary-background-color);min-width:0;overflow:visible}
.marao-settings .route-heading{display:flex;align-items:center;padding:4px;gap:0}
.marao-settings button{min-height:48px;min-width:48px;border:0;border-radius:16px;font:inherit;color:inherit;cursor:pointer;padding:12px 16px;background:var(--secondary-background-color)}
.marao-settings button:focus{outline:none}
.marao-settings button:disabled{opacity:.55;cursor:default}
.marao-settings .route-toggle{flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:8px;text-align:start;background:transparent}
.marao-settings .route-icon{display:grid;place-items:center;background:var(--ha-card-background);border-radius:50%;width:48px;height:48px;flex:0 0 48px;color:var(--primary-color)}
.marao-settings .route-label{flex:1;min-width:0;overflow-wrap:anywhere}
.marao-settings .name{font-weight:600}
.marao-settings .chevron{width:18px;flex-shrink:0;color:var(--secondary-text-color)}
.marao-settings .fields{padding:8px 16px 16px;display:grid;gap:12px}
.marao-settings ha-form{display:block;min-width:0;max-width:100%;--ha-space-4:12px}
.marao-settings ha-icon-button{--mdc-icon-button-size:48px;--ha-icon-button-size:48px;width:48px;height:48px;flex-shrink:0}
.marao-settings ha-dropdown-item{min-height:48px;--wa-form-control-value-font-size:1rem}
.marao-settings .warning{font-size:.875rem;color:var(--error-color)}
.marao-settings .shortcuts{margin-top:24px;padding-top:20px;border-top:1px solid var(--divider-color)}
.marao-settings [data-flags]{margin-top:12px}
.marao-settings footer{padding:12px 20px max(16px,env(safe-area-inset-bottom));border-top:1px solid var(--divider-color);background:var(--ha-card-background)}
.marao-settings .status:empty{display:none}
.marao-settings .status{color:var(--error-color);margin-bottom:12px}
.marao-settings .save{width:100%;background:var(--primary-color);color:var(--text-primary-color);font-weight:600}
@keyframes marao-settings-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
@media(max-width:380px){.marao-settings header{padding:16px 12px 8px}.marao-settings .body{padding:4px 12px 16px}.marao-settings footer{padding-inline:12px}.marao-settings .fields{padding-inline:12px}}
`;

async function loadControls() {
  if(customElements.get('ha-form')&&customElements.get('ha-dropdown')&&customElements.get('ha-sortable'))return;
  const helpers=await globalThis.loadCardHelpers();
  const card=helpers.createCardElement({type:'entities',entities:[]});
  await card.constructor.getConfigElement();
}

export async function openDashboardSettings(root,opener) {
  if(!root?.hass?.user?.is_admin || root.lovelace?.editMode || root._maraoSettingsDialog)return;
  const hass=root.hass,path=location.pathname.split('/')[1],user=hass.user.id;
  const valid=()=>root.isConnected&&location.pathname.split('/')[1]===path&&root.hass?.user?.id===user&&root.hass?.user?.is_admin&&!root.lovelace?.editMode&&root._maraoSettingsDialog===dialog;
  const t=words[String(hass.language).startsWith('pt')?'pt':'en'];
  const dialog=document.createElement('dialog');dialog.className='marao-settings';root._maraoSettingsDialog=dialog;
  dialog.innerHTML=`<style>${CSS}</style><header><h2 id="marao-settings-title"></h2><button type="button" data-close>×</button></header><div class="body"><p data-loading role="status"></p><button type="button" data-retry hidden></button><div data-settings hidden><h3 data-navbar></h3><p class="hint"></p><ha-sortable data-sortable handle-selector=".drag-handle" draggable-selector=".route" no-style disabled><div data-routes></div></ha-sortable><div data-add></div><section class="shortcuts"><h3 data-shortcuts></h3><div data-flags></div></section></div></div><footer><p class="status" role="alert"></p><button type="button" class="save" data-save disabled></button></footer>`;
  dialog.setAttribute('aria-labelledby','marao-settings-title');
  const restore=navigation.focusRestorer(opener),listeners=new AbortController();let busy=false,expandedRoute;
  const close=()=>{if(busy||root._maraoSettingsDialog!==dialog)return;dialog.close();dialog.remove();delete root._maraoSettingsDialog;listeners.abort();restore();};
  for(const [selector,text]of [['h2',t.title],['[data-loading]',t.loading],['[data-retry]',t.retry],['[data-navbar]',t.navbar],['.hint',t.hint],['[data-shortcuts]',t.shortcuts],['[data-save]',t.save]])dialog.querySelector(selector).textContent=text;
  dialog.querySelector('[data-close]').setAttribute('aria-label',t.close);dialog.querySelector('[data-close]').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(root._maraoSettingsDialog===dialog)close();});
  window.addEventListener('location-changed',()=>{if(!valid()){busy=false;close();}},{signal:listeners.signal});
  root.shadowRoot.append(dialog);dialog.showModal();
  // Show the sheet before waiting for HA; fetch settings and native controls together.
  let baseline,draft;
  try{
    [baseline]=await Promise.all([hass.callWS({type:'lovelace/config',url_path:path,force:true}),loadControls()]);
    if(!valid()){close();return;}
    draft=structuredClone(readDashboardSettings(baseline));
    if(!draft){close();return;}
  }catch{
    if(!valid()){close();return;}
    dialog.querySelector('[data-loading]').textContent=t.loadError;
    dialog.querySelector('[data-loading]').setAttribute('role','alert');
    const retry=dialog.querySelector('[data-retry]');retry.hidden=false;
    retry.onclick=()=>{close();openDashboardSettings(root,opener);};
    return;
  }
  dialog.querySelector('[data-loading]').hidden=true;
  dialog.querySelector('[data-settings]').hidden=false;
  dialog.querySelector('[data-save]').disabled=false;
  const schema=(name,label,selector)=>({name,label,selector});
  const mountForm=(host,data,fields,changed)=>{
    const form=document.createElement('ha-form');form.hass=hass;form.data=data;form.schema=fields;form.computeLabel=item=>item.label;
    form.addEventListener('value-changed',event=>{event.stopPropagation();if(!busy)changed(event.detail.value);});host.append(form);return form;
  };
  const sortable=dialog.querySelector('[data-sortable]');sortable.disabled=false;
  const reorder=(oldIndex,newIndex)=>{
    if(busy||!valid())return;
    const routes=moveNavbarRoute(draft.navbar.routes,oldIndex,newIndex);
    if(routes===draft.navbar.routes)return;
    draft.navbar.routes=routes;
    // HA restores its drag placeholder at drag-end; render after that cleanup.
    queueMicrotask(()=>{if(!valid())return;render();dialog.querySelector('[data-routes]').children[newIndex]?.querySelector('.drag-handle')?.focus({preventScroll:true});});
  };
  sortable.addEventListener('item-moved',event=>{event.stopPropagation();reorder(event.detail.oldIndex,event.detail.newIndex);});
  for(const type of ['drag-start','drag-end'])sortable.addEventListener(type,event=>{event.stopPropagation();navigation.haptic('heavy');});
  const viewFor=address=>dashboardViewForAddress(baseline,path,address,location.origin);
  const render=()=>{
    const host=dialog.querySelector('[data-routes]');host.replaceChildren();
    if(!draft.navbar.routes.length){const empty=document.createElement('p');empty.className='hint';empty.textContent=t.empty;host.append(empty);}
    draft.navbar.routes.forEach((route,index)=>{
      const row=document.createElement('section');row.className='route';
      row.innerHTML='<div class="route-heading"><button type="button" class="drag-handle"><ha-icon icon="mdi:drag-horizontal-variant" aria-hidden="true"></ha-icon></button><button type="button" class="route-toggle"><span class="route-icon"><ha-icon></ha-icon></span><span class="route-label"><span class="name"></span><br><span class="destination"></span></span><ha-icon class="chevron"></ha-icon></button></div><div class="fields" hidden></div>';
      const toggle=row.querySelector('.route-toggle'),fields=row.querySelector('.fields'),icon=row.querySelector('.route-icon ha-icon');
      const handle=row.querySelector('.drag-handle');handle.setAttribute('aria-label',`${t.drag}: ${route.label}`);handle.disabled=draft.navbar.routes.length<2;
      handle.onkeydown=event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();navigation.haptic('heavy');reorder(index,index+(event.key==='ArrowUp'?-1:1));}};
      const previous={destination:route.url||route.path,label:route.label,icon:route.icon||''};
      const warning=document.createElement('p');warning.className='warning';warning.textContent=t.missing;
      const updateHeading=()=>{
        const address=route.url||route.path,view=viewFor(address);
        row.querySelector('.name').textContent=route.label;
        row.querySelector('.destination').textContent=view?.title||address;
        icon.icon=route.icon||view?.icon||'mdi:view-dashboard';
        let destination;
        try{destination=new URL(address,location.origin);}catch{}
        warning.hidden=!!destination&&(destination.origin!==location.origin||!destination.pathname.startsWith(`/${path}/`)||!!view);
        toggle.setAttribute('aria-label',route.label);handle.setAttribute('aria-label',`${t.drag}: ${route.label}`);
      };
      let mounted=false;
      const expand=()=>{
        const open=expandedRoute===route;toggle.setAttribute('aria-expanded',String(open));fields.hidden=!open;
        row.querySelector('.chevron').icon=open?'mdi:chevron-up':'mdi:chevron-down';
        if(open&&!mounted){mounted=true;mountForm(fields,previous,[schema('destination',t.destination,{navigation:{}}),schema('label',t.label,{text:{}}),schema('icon',t.icon,{icon:{}})],value=>{Object.assign(route,patchNavbarRoute(route,previous,value));Object.assign(previous,value);updateHeading();});fields.append(warning);}
      };
      toggle.onclick=()=>{navigation.haptic('heavy');expandedRoute=expandedRoute===route?undefined:route;host.querySelectorAll('.route').forEach(item=>item.expandSettings());};
      row.expandSettings=expand;
      const menu=document.createElement('ha-dropdown');menu.placement='bottom-end';
      const trigger=document.createElement('ha-icon-button');trigger.slot='trigger';trigger.path=menuIcon;trigger.label=`${t.menu}: ${route.label}`;menu.append(trigger);
      for(const [value,label,disabled,iconName]of [['up',t.up,index===0,'arrow-up'],['down',t.down,index===draft.navbar.routes.length-1,'arrow-down'],['remove',t.remove,false,'delete-outline']]){
        const item=document.createElement('ha-dropdown-item');item.value=value;item.disabled=disabled;item.textContent=label;
        const glyph=document.createElement('ha-icon');glyph.icon=`mdi:${iconName}`;glyph.slot='icon';item.prepend(glyph);menu.append(item);
      }
      menu.addEventListener('wa-select',event=>{
        const action=event.detail.item.value,target=index+(action==='up'?-1:1);
        if(busy||!['up','down','remove'].includes(action)||action!=='remove'&&(target<0||target>=draft.navbar.routes.length))return;
        navigation.haptic('heavy');
        if(action!=='remove'){reorder(index,target);return;}
        draft.navbar.routes.splice(index,1);
        render();host.children[Math.min(action==='remove'?index:target,host.children.length-1)]?.querySelector('.route-toggle')?.focus({preventScroll:true});
      });
      row.querySelector('.route-heading').append(menu);host.append(row);updateHeading();expand();
    });
  };
  render();
  const add=mountForm(dialog.querySelector('[data-add]'),{},[schema('destination',t.add,{navigation:{}})],value=>{
    if(!value.destination)return;navigation.haptic('heavy');const view=viewFor(value.destination);
    const route={path:value.destination,label:view?.title||value.destination,icon:view?.icon||'mdi:view-dashboard'};
    draft.navbar.routes.push(route);expandedRoute=route;add.data={};render();
    dialog.querySelector('[data-routes]').lastElementChild?.scrollIntoView({block:'nearest'});
  });
  mountForm(dialog.querySelector('[data-flags]'),{show_cache_reset:draft.show_cache_reset!==false,show_editor_button:draft.show_editor_button!==false},[schema('show_cache_reset',t.cache,{boolean:{}}),schema('show_editor_button',t.editor,{boolean:{}})],value=>{for(const key of ['show_cache_reset','show_editor_button'])if(value[key]!== (draft[key]!==false))draft[key]=value[key];});
  dialog.querySelector('[data-save]').onclick=async()=>{
    if(busy||!valid())return;try{validateDashboardSettings(draft);}catch{dialog.querySelector('.status').textContent=t.invalid;return;}
    navigation.haptic('heavy');busy=true;sortable.disabled=true;dialog.querySelector('[data-save]').disabled=true;dialog.querySelector('[data-save]').textContent=t.saving;
    try{await saveDashboardSettings(root.hass,path,baseline,draft,valid);busy=false;close();}
    catch(error){dialog.querySelector('.status').textContent=error.message==='settings_stale'?t.conflict:(error.message||t.error);busy=false;sortable.disabled=false;dialog.querySelector('[data-save]').disabled=false;dialog.querySelector('[data-save]').textContent=t.save;}
  };
}
