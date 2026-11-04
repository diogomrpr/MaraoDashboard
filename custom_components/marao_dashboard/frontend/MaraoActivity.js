const {activityRange,dateKey,filterActivity,loadActivity}=await import(new URL(`./MaraoActivityModel.js${new URL(import.meta.url).search}`,import.meta.url));
export function createActivity(host, options) {
  let generation=0,destroyed=false,data,limit=50,filter={},period='today',custom={},hass=options.hass;
  const pt=String(hass.language).startsWith('pt'), t=(a,b)=>pt?b:a;
  const names={state:t('State change','Alteração de estado'),activation:t('Activation','Ativação'),request:t('Recorded request','Pedido registado'),opened:t('Opened / unlocked','Aberto / destrancado'),closed:t('Closed / locked','Fechado / trancado'),availability:t('Availability change','Alteração de disponibilidade'),problem:t('Reported problem','Problema comunicado'),unknown:t('Unknown origin','Origem desconhecida'),user:t('User','Utilizador'),automation:t('Automation','Automação')};
  host.innerHTML=`<style>
  .marao-activity{display:flex;flex-direction:column;max-height:65dvh;min-height:0;flex:1;gap:12px;font-family:var(--primary-font-family,Montserrat,sans-serif)}
  .marao-activity[hidden]{display:none}
  .marao-activity header{display:flex;flex-wrap:wrap;gap:8px;flex:0 1 auto;min-height:0;max-height:45%;overflow:auto}.marao-activity label{display:flex;flex:1 1 125px;min-width:0;flex-direction:column;gap:4px;font-size:.875rem}
  .marao-activity :is(select,input,button){box-sizing:border-box;min-height:48px;min-width:48px;max-width:100%;padding:10px 12px;border:0;border-radius:16px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit}
  .marao-activity-list{flex:1;overflow:auto;overscroll-behavior:contain;min-height:0}.marao-activity h3{font-size:1rem;margin:12px 0}.marao-activity article{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;margin:0 0 12px}
  .marao-activity .event-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--secondary-background-color)}
  .marao-activity article button{width:100%;text-align:start;overflow-wrap:anywhere;background:transparent;padding:0}.marao-activity p{margin:4px 0;overflow-wrap:anywhere}.marao-activity small{color:var(--secondary-text-color)}
  </style><section class="marao-activity"><header></header><p role="status"></p><div class="marao-activity-list"></div></section>`;
  const header=host.querySelector('header'),status=host.querySelector('[role=status]'),list=host.querySelector('.marao-activity-list');
  const addSelect=(label,values,change)=>{const wrapper=document.createElement('label');wrapper.append(label);const select=document.createElement('select');for(const [value,text]of values){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.onchange=()=>{options.haptic?.('heavy');change(select.value);};wrapper.append(select);header.append(wrapper);return select;};
  const day=t('Date','Data');
  addSelect(day,[['today',t('Today','Hoje')],['yesterday',t('Yesterday','Ontem')],['week',t('Last 7 days','Últimos 7 dias')],['custom',t('Custom range','Intervalo personalizado')]],value=>{period=value;customDates.hidden=value!=='custom';query();});
  addSelect(t('Event type','Tipo de evento'),[['',t('All events','Todos os eventos')],...['state','activation','request','opened','closed','availability','problem'].map(key=>[key,names[key]])],value=>{filter.kind=value;limit=50;render();});
  if(options.sources.length>1)addSelect(t('Source','Origem de dados'),[['',t('All sources','Todas as entidades')],...options.sources.map(id=>[id,hass.states?.[id]?.attributes?.friendly_name||id])],value=>{filter.source=value;limit=50;render();});
  const customDates=document.createElement('div');customDates.hidden=true;customDates.style.cssText='flex:1 0 100%;display:flex;gap:8px;flex-wrap:wrap';
  // The hidden attribute must override the explicit layout.
  customDates.style.removeProperty('display');
  for(const key of ['start','end']){const label=document.createElement('label');label.textContent=key==='start'?t('From','De'):t('Through','Até');const input=document.createElement('input');input.type='date';input.value=dateKey(Date.now(),hass.config?.time_zone||'UTC');custom[key]=input.value;input.onchange=()=>{custom[key]=input.value;query();};label.append(input);customDates.append(label);}header.append(customDates);
  const reset=document.createElement('button');reset.type='button';reset.textContent=t('Reset filters','Repor filtros');reset.onclick=()=>{options.haptic?.('heavy');filter={};period='today';customDates.hidden=true;for(const select of header.querySelectorAll('select'))select.value=select.options[0].value;query();};header.append(reset);
  const coverage=document.createElement('small');coverage.textContent=t('Recorded coverage only; retention and recording exclusions may limit these results.','Apenas histórico registado; a retenção e exclusões podem limitar estes resultados.');header.append(coverage);
  let originSelect,actorSelect;
  const name=id=>hass.states?.[id]?.attributes?.friendly_name||id;
  function render(){
    list.replaceChildren();
    if(!data)return;
    const rows=filterActivity(data.records,filter);
    status.textContent=data.errors.length?t('Some recorded history could not be loaded. Results below are incomplete.','Não foi possível carregar parte do histórico. Os resultados estão incompletos.'):rows.length?'':t('No recorded events for these filters.','Sem eventos registados para estes filtros.');
    if(data.errors.length){const coverage=document.createElement('p');coverage.textContent=data.errors.map(error=>`${error.kind==='history'?t('History','Histórico'):t('Activity','Atividade')} · ${dateKey(error.start,hass.config?.time_zone||'UTC')} · ${error.sources.map(name).join(', ')} · ${error.reason==='permission'?t('Permission limited','Permissão limitada'):t('Could not load','Não foi possível carregar')}`).join(' / ');list.append(coverage);const retry=document.createElement('button');retry.textContent=t('Retry','Tentar novamente');retry.onclick=()=>{options.haptic?.('heavy');query();};list.append(retry);}
    let day;
    for(const row of rows.slice(0,limit)){
      const key=dateKey(row.time,hass.config?.time_zone||'UTC');
      if(day!==key){day=key;const heading=document.createElement('h3');heading.textContent=new Intl.DateTimeFormat(hass.language,{dateStyle:'full',timeZone:hass.config?.time_zone}).format(row.time);list.append(heading);}
      const article=document.createElement('article'),icon=document.createElement('span');icon.className='event-icon';icon.setAttribute('aria-hidden','true');const symbol=document.createElement('ha-icon');symbol.setAttribute('icon',row.kind==='request'?'mdi:gesture-tap':row.kind==='activation'?'mdi:play-circle-outline':'mdi:swap-horizontal');icon.append(symbol);article.append(icon);
      const body=document.createElement('div'),button=document.createElement('button');button.type='button';button.setAttribute('aria-expanded','false');
      const title=document.createElement('p');title.textContent=`${name(row.source)} · ${names[row.kind]}`;button.append(title);
      const state=document.createElement('p');state.textContent=row.kind==='request'?row.action||names.request:row.kind==='activation'?names.activation:`${row.before??'—'} → ${row.after??'—'}${row.unit?' '+row.unit:''}`;button.append(state);
      const time=document.createElement('small');time.textContent=`${new Intl.DateTimeFormat(hass.language,{timeStyle:'short',timeZone:hass.config?.time_zone}).format(row.time)} · ${names[row.origin]}${row.initiatorName?' · '+row.initiatorName:''}`;button.append(time);
      const detail=document.createElement('p');detail.hidden=true;detail.textContent=`${row.source} · ${new Intl.DateTimeFormat(hass.language,{dateStyle:'medium',timeStyle:'medium',timeZone:hass.config?.time_zone}).format(row.time)}${row.initiator?' · '+t('Recorded user ID: ','ID de utilizador registado: ')+row.initiator:''}`;
      button.onclick=()=>{options.haptic?.('heavy');detail.hidden=!detail.hidden;button.setAttribute('aria-expanded',String(!detail.hidden));};body.append(button,detail);article.append(body);list.append(article);
    }
    if(rows.length>limit){const more=document.createElement('button');more.textContent=t('Load earlier','Carregar anteriores');more.onclick=()=>{options.haptic?.('heavy');limit+=50;render();};list.append(more);}
  }
  async function query(){
    const token=++generation;data=null;limit=50;list.replaceChildren();let range;
    try{range=activityRange(period,hass.config?.time_zone||'UTC',Date.now(),custom);}catch{status.textContent=t('Choose a valid range of up to 31 days.','Escolha um intervalo válido de até 31 dias.');return;}
    status.textContent=t('Loading recorded activity…','A carregar atividade registada…');
    const result=await loadActivity(hass,options.sources,range,()=>!destroyed&&token===generation);
    if(!result||destroyed||token!==generation)return;data=result;
    originSelect?.parentElement.remove();actorSelect?.parentElement.remove();originSelect=actorSelect=null;
    const origins=[...new Set(data.records.map(row=>row.origin))];if(origins.some(key=>key!=='unknown'))originSelect=addSelect(t('Origin','Origem'),[['',t('All origins','Todas as origens')],...origins.map(key=>[key,names[key]])],value=>{filter.origin=value;render();});else filter.origin='';
    const actors=[...new Set(data.records.map(row=>row.initiator).filter(Boolean))];if(actors.length)actorSelect=addSelect(t('Initiator','Iniciador'),[['',t('All initiators','Todos os iniciadores')],...actors.map(id=>[id,data.records.find(row=>row.initiator===id)?.initiatorName||hass.states?.[id]?.attributes?.friendly_name||id])],value=>{filter.initiator=value;render();});else filter.initiator='';
    if(filter.origin&&!origins.includes(filter.origin))filter.origin='';if(filter.initiator&&!actors.includes(filter.initiator))filter.initiator='';
    if(originSelect)originSelect.value=filter.origin||'';if(actorSelect)actorSelect.value=filter.initiator||'';render();
  }
  query();
  return {update(next){hass=next.hass;},destroy(){destroyed=true;generation++;host.replaceChildren();}};
}
