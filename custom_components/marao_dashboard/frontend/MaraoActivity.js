const {activityRange,dateKey,filterActivity,loadActivity}=await import(new URL(`./MaraoActivityModel.js${new URL(import.meta.url).search}`,import.meta.url));
const {bindDropdown,dropdownStyles}=await import(new URL(`./MaraoDropdown.js${new URL(import.meta.url).search}`,import.meta.url));
let nextActivityId=0;
export function createActivity(host, options) {
  let generation=0,destroyed=false,data,limit=50,filter={},period='today',custom={},hass=options.hass,reset;
  const dropdowns=new Set();
  const pt=String(hass.language).startsWith('pt'), t=(a,b)=>pt?b:a;
  const names={state:t('State change','Alteração de estado'),activation:t('Activation','Ativação'),request:t('Recorded request','Pedido registado'),opened:t('Opened / unlocked','Aberto / destrancado'),closed:t('Closed / locked','Fechado / trancado'),availability:t('Availability change','Alteração de disponibilidade'),problem:t('Reported problem','Problema comunicado'),unknown:t('Unknown origin','Origem desconhecida'),user:t('User','Utilizador'),automation:t('Automation','Automação')};
  host.innerHTML=`<style>
  .marao-activity{display:flex;flex-direction:column;height:65dvh;max-height:65dvh;min-height:0;min-width:0;flex:1 1 auto;gap:12px;overflow:auto;font-family:var(--primary-font-family,Montserrat,sans-serif);font-size:var(--font-size-secondary,1rem);line-height:1.4}
  .marao-activity [hidden],.marao-activity[hidden]{display:none}
  .marao-activity header{display:flex;flex-wrap:wrap;align-items:end;gap:8px;flex:none}
  .marao-activity :is(label,.marao-activity-field){display:flex;flex:1 1 150px;min-width:0;flex-direction:column;gap:4px;font-size:var(--font-size-caption,.9375rem)}
  .marao-activity :is(input,button):not(.marao-dropdown button){box-sizing:border-box;min-height:48px;min-width:48px;max-width:100%;padding:10px 12px;border:0;border-radius:16px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit}
  .marao-activity input{width:100%}.marao-activity button{overflow-wrap:anywhere}
  .marao-activity-filter-toggle{display:flex;align-items:center;justify-content:center;gap:8px;flex:0 1 auto}.marao-activity-filter-toggle ha-icon{flex:none;--mdc-icon-size:24px}
  .marao-activity-filters,.marao-activity-custom-dates{display:flex;flex-wrap:wrap;align-items:end;gap:12px}.marao-activity-filters{margin-bottom:16px}.marao-activity-custom-dates{flex:1 0 100%}
  .marao-activity-scroll{flex:1 1 auto;overflow:auto;overscroll-behavior:contain;min-height:48px}.marao-activity [role=status]:empty{display:none}
  .marao-activity h3{display:flex;align-items:center;gap:12px;font-size:var(--font-size-primary,1.125rem);font-weight:700;line-height:1.4;margin:20px 0 16px;overflow-wrap:anywhere}
  .marao-activity h3::before,.marao-activity h3::after{content:'';height:1px;min-width:12px;flex:1;background:var(--divider-color,var(--secondary-text-color))}.marao-activity h3 time{min-width:0}
  .marao-activity-day{display:grid;grid-template-columns:minmax(48px,max-content) minmax(0,1fr);column-gap:12px}.marao-activity article{display:grid;grid-template-columns:subgrid;grid-column:1/-1;position:relative;align-items:start}
  .marao-activity .event-time{grid-column:1;grid-row:1;align-self:start;text-align:center;margin-top:52px;padding:0 0 12px;font-size:.8125rem;font-weight:400;line-height:1.4;color:var(--secondary-text-color);font-variant-numeric:tabular-nums;white-space:nowrap}
  .marao-activity .event-rail{grid-column:1;grid-row:1;position:relative;align-self:stretch;display:flex;justify-content:center}.marao-activity article:not(:last-child) .event-rail::after{content:'';position:absolute;top:calc(56px + 1.4 * .8125rem);bottom:0;width:2px;background:var(--divider-color,var(--secondary-text-color))}
  .marao-activity .event-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--secondary-background-color);--mdc-icon-size:24px}
  .marao-activity .event-body{grid-column:2;grid-row:1;min-width:0;padding-bottom:20px}.marao-activity article:last-child .event-body{padding-bottom:0}
  .marao-activity article button{width:100%;text-align:start;background:transparent;padding:0}.marao-activity .event-title{font-weight:700}
  .marao-activity p{margin:4px 0;overflow-wrap:anywhere}.marao-activity small{color:var(--secondary-text-color);font-size:var(--font-size-caption,.9375rem)}.marao-activity-coverage{display:block;margin-top:20px}
  ${dropdownStyles}</style><section class="marao-activity"><header></header><div class="marao-activity-scroll"><div class="marao-activity-filters" hidden></div><p role="status"></p><div class="marao-activity-list"></div></div></section>`;
  const header=host.querySelector('header'),panel=host.querySelector('.marao-activity-filters'),status=host.querySelector('[role=status]'),list=host.querySelector('.marao-activity-list'),scroll=host.querySelector('.marao-activity-scroll');
  const addDropdown=(label,values,value,change,parent=panel)=>{
    const wrapper=document.createElement('div'),caption=document.createElement('span'),picker=document.createElement('div'),trigger=document.createElement('button'),selected=document.createElement('span'),chevron=document.createElement('ha-icon'),menu=document.createElement('div');
    wrapper.className='marao-activity-field';caption.id=`marao-activity-label-${++nextActivityId}`;caption.textContent=label;selected.id=`${caption.id}-value`;
    picker.className='marao-dropdown';trigger.type='button';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-labelledby',`${caption.id} ${selected.id}`);menu.className='marao-dropdown-options';menu.setAttribute('role','menu');menu.setAttribute('aria-labelledby',caption.id);
    chevron.setAttribute('icon','mdi:chevron-down');chevron.setAttribute('aria-hidden','true');trigger.append(selected,chevron);picker.append(trigger,menu);wrapper.append(caption,picker);
    const choices=values.map(([value,text])=>{const button=document.createElement('button'),name=document.createElement('span'),check=document.createElement('ha-icon');button.type='button';button.setAttribute('role','menuitemradio');name.textContent=text;check.setAttribute('icon','mdi:check');check.setAttribute('aria-hidden','true');button.append(name,check);menu.append(button);return {value,button};});
    const binding=bindDropdown(picker,{trigger,menu,choices,value,activeElement:()=>host.getRootNode().activeElement,haptic:()=>options.haptic?.('heavy'),onSelect:next=>{options.haptic?.('heavy');if(next===value())return;change(next);control.sync();}});
    const control={parent,element:wrapper,close:()=>binding.close(),sync(){selected.textContent=values.find(([key])=>key===value())?.[1]||values[0][1];binding.sync();},destroy(){binding.destroy();dropdowns.delete(control);wrapper.remove();}};
    dropdowns.add(control);control.sync();if(parent===panel&&reset)reset.before(wrapper);else parent.append(wrapper);return control;
  };
  const showFilters=show=>{if(!show)for(const control of dropdowns)if(control.parent===panel)control.close();panel.hidden=!show;toggle.setAttribute('aria-expanded',String(show));};
  const toggle=document.createElement('button');toggle.type='button';toggle.className='marao-activity-filter-toggle';toggle.innerHTML='<ha-icon icon="mdi:tune" aria-hidden="true"></ha-icon><span></span>';toggle.setAttribute('aria-expanded','false');panel.id=`marao-activity-filters-${++nextActivityId}`;toggle.setAttribute('aria-controls',panel.id);toggle.onclick=()=>{options.haptic?.('heavy');showFilters(panel.hidden);if(!panel.hidden)scroll.scrollTop=0;};
  const updateFilters=()=>{const count=Object.values(filter).filter(Boolean).length;toggle.querySelector('span').textContent=t('Filters','Filtros')+(count?` (${count})`:'');};
  const day=t('Date','Data');
  addDropdown(day,[['today',t('Today','Hoje')],['yesterday',t('Yesterday','Ontem')],['week',t('Last 7 days','Últimos 7 dias')],['custom',t('Custom range','Intervalo personalizado')]],()=>period,value=>{period=value;customDates.hidden=value!=='custom';if(value==='custom'){showFilters(true);scroll.scrollTop=0;}query();},header);header.append(toggle);updateFilters();
  addDropdown(t('Event type','Tipo de evento'),[['',t('All events','Todos os eventos')],...['state','activation','request','opened','closed','availability','problem'].map(key=>[key,names[key]])],()=>filter.kind||'',value=>{filter.kind=value;limit=50;render();});
  if(options.sources.length>1)addDropdown(t('Source','Origem de dados'),[['',t('All sources','Todas as entidades')],...options.sources.map(id=>[id,hass.states?.[id]?.attributes?.friendly_name||id])],()=>filter.source||'',value=>{filter.source=value;limit=50;render();});
  const customDates=document.createElement('div');customDates.className='marao-activity-custom-dates';customDates.hidden=true;
  for(const key of ['start','end']){const label=document.createElement('label');label.textContent=key==='start'?t('From','De'):t('Through','Até');const input=document.createElement('input');input.type='date';input.value=dateKey(Date.now(),hass.config?.time_zone||'UTC');custom[key]=input.value;input.onchange=()=>{custom[key]=input.value;query();};label.append(input);customDates.append(label);}panel.prepend(customDates);
  reset=document.createElement('button');reset.type='button';reset.textContent=t('Reset filters','Repor filtros');reset.onclick=()=>{options.haptic?.('heavy');filter={};period='today';customDates.hidden=true;for(const control of dropdowns)control.sync();query();};panel.append(reset);
  const coverage=document.createElement('small');coverage.className='marao-activity-coverage';coverage.textContent=t('Recorded coverage only; retention and recording exclusions may limit these results.','Apenas histórico registado; a retenção e exclusões podem limitar estes resultados.');scroll.append(coverage);
  let originSelect,actorSelect;
  const name=id=>hass.states?.[id]?.attributes?.friendly_name||id;
  function render(){
    updateFilters();
    if(!data)return;
    list.replaceChildren();
    const rows=filterActivity(data.records,filter);
    status.textContent=data.errors.length?t('Some recorded history could not be loaded. Results below are incomplete.','Não foi possível carregar parte do histórico. Os resultados estão incompletos.'):rows.length?'':t('No recorded events for these filters.','Sem eventos registados para estes filtros.');
    if(data.errors.length){const coverage=document.createElement('p');coverage.textContent=data.errors.map(error=>`${error.kind==='history'?t('History','Histórico'):t('Activity','Atividade')} · ${dateKey(error.start,hass.config?.time_zone||'UTC')} · ${error.sources.map(name).join(', ')} · ${error.reason==='permission'?t('Permission limited','Permissão limitada'):t('Could not load','Não foi possível carregar')}`).join(' / ');list.append(coverage);const retry=document.createElement('button');retry.textContent=t('Retry','Tentar novamente');retry.onclick=()=>{options.haptic?.('heavy');query();};list.append(retry);}
    let day,events;
    for(const row of rows.slice(0,limit)){
      const key=dateKey(row.time,hass.config?.time_zone||'UTC');
      if(day!==key){day=key;const heading=document.createElement('h3'),date=document.createElement('time');date.dateTime=key;date.textContent=new Intl.DateTimeFormat(hass.language,{dateStyle:'long',timeZone:hass.config?.time_zone}).format(row.time);heading.append(date);events=document.createElement('div');events.className='marao-activity-day';list.append(heading,events);}
      const article=document.createElement('article'),time=document.createElement('time');time.className='event-time';time.dateTime=new Date(row.time).toISOString();time.textContent=new Intl.DateTimeFormat(hass.language,{timeStyle:'short',timeZone:hass.config?.time_zone}).format(row.time);article.append(time);
      const rail=document.createElement('div'),icon=document.createElement('span');rail.className='event-rail';rail.setAttribute('aria-hidden','true');icon.className='event-icon';const symbol=document.createElement('ha-icon');symbol.setAttribute('icon',row.kind==='request'?'mdi:gesture-tap':row.kind==='activation'?'mdi:play-circle-outline':'mdi:swap-horizontal');icon.append(symbol);rail.append(icon);article.append(rail);
      const body=document.createElement('div'),button=document.createElement('button');body.className='event-body';button.type='button';button.setAttribute('aria-expanded','false');
      const title=document.createElement('p');title.className='event-title';title.textContent=`${name(row.source)} · ${names[row.kind]}`;button.append(title);
      const state=document.createElement('p');state.textContent=row.kind==='request'?row.action||names.request:row.kind==='activation'?names.activation:`${row.before??'—'} → ${row.after??'—'}${row.unit?' '+row.unit:''}`;button.append(state);
      const origin=document.createElement('small');origin.textContent=`${names[row.origin]}${row.initiatorName?' · '+row.initiatorName:''}`;button.append(origin);
      const detail=document.createElement('p');detail.hidden=true;detail.textContent=`${row.source} · ${new Intl.DateTimeFormat(hass.language,{timeStyle:'medium',timeZone:hass.config?.time_zone}).format(row.time)}${row.initiator?' · '+t('Recorded user ID: ','ID de utilizador registado: ')+row.initiator:''}`;
      button.onclick=()=>{options.haptic?.('heavy');detail.hidden=!detail.hidden;button.setAttribute('aria-expanded',String(!detail.hidden));};body.append(button,detail);article.append(body);events.append(article);
    }
    if(rows.length>limit){const more=document.createElement('button');more.textContent=t('Load earlier','Carregar anteriores');more.onclick=()=>{options.haptic?.('heavy');limit+=50;render();};list.append(more);}
  }
  async function query(){
    const token=++generation;data=null;limit=50;updateFilters();let range;
    try{range=activityRange(period,hass.config?.time_zone||'UTC',Date.now(),custom);}catch{list.replaceChildren();list.removeAttribute('aria-busy');status.textContent=t('Choose a valid range of up to 31 days.','Escolha um intervalo válido de até 31 dias.');return;}
    list.setAttribute('aria-busy','true');
    status.textContent=t('Loading recorded activity…','A carregar atividade registada…');
    const result=await loadActivity(hass,options.sources,range,()=>!destroyed&&token===generation);
    if(!result||destroyed||token!==generation)return;data=result;list.removeAttribute('aria-busy');
    originSelect?.destroy();actorSelect?.destroy();originSelect=actorSelect=null;
    const origins=[...new Set(data.records.map(row=>row.origin))];if(origins.some(key=>key!=='unknown'))originSelect=addDropdown(t('Origin','Origem'),[['',t('All origins','Todas as origens')],...origins.map(key=>[key,names[key]])],()=>filter.origin||'',value=>{filter.origin=value;render();});else filter.origin='';
    const actors=[...new Set(data.records.map(row=>row.initiator).filter(Boolean))];if(actors.length)actorSelect=addDropdown(t('Initiator','Iniciador'),[['',t('All initiators','Todos os iniciadores')],...actors.map(id=>[id,data.records.find(row=>row.initiator===id)?.initiatorName||hass.states?.[id]?.attributes?.friendly_name||id])],()=>filter.initiator||'',value=>{filter.initiator=value;render();});else filter.initiator='';
    if(filter.origin&&!origins.includes(filter.origin))filter.origin='';if(filter.initiator&&!actors.includes(filter.initiator))filter.initiator='';
    for(const control of dropdowns)control.sync();render();
  }
  query();
  return {update(next){hass=next.hass;},destroy(){destroyed=true;generation++;for(const control of [...dropdowns])control.destroy();host.replaceChildren();}};
}
