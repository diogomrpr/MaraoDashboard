import { Chart, LineController, LineElement, PointElement, BarController, BarElement, LinearScale, Filler } from 'chart.js';
import { color as chartColor } from 'chart.js/helpers';
import { historyWindow, nearestSample, reduceSamples, summary } from './history-data.js';
import { createPowerHistory as createPowerController, powerStateAt } from './power-history.js';

Chart.register(LineController, LineElement, PointElement, BarController, BarElement, LinearScale, Filler);
const PT = {
  'History': 'Histórico', 'Selected reading': 'Leitura selecionada', 'Previous reading': 'Leitura anterior', 'Next reading': 'Leitura seguinte',
  'Minimum': 'Mínimo', 'Maximum': 'Máximo', 'Sample average': 'Média das amostras', 'No readings in this period.': 'Sem leituras neste período.',
  'Loading history…': 'A carregar o histórico…', 'Could not draw history.': 'Não foi possível desenhar o histórico.', 'Retry': 'Tentar novamente',
  'Recorded coverage may be limited.': 'A cobertura do histórico pode ser limitada.', 'Time window': 'Intervalo de tempo',
  'History unavailable': 'Histórico indisponível',
  'Selected day': 'Dia selecionado', 'Selected hour': 'Hora selecionada', 'Previous day': 'Dia anterior', 'Next day': 'Dia seguinte',
  'Previous hour': 'Hora anterior', 'Next hour': 'Hora seguinte', 'Day': 'Dia', 'Hour': 'Hora', 'No readings for this interval.': 'Sem leituras neste intervalo.',
  'Total': 'Total', 'Where it went': 'Consumo', 'Share of configured items': 'Proporção dos itens configurados',
  'Energy': 'Energia', 'Cost': 'Custo', 'No data': 'Sem dados', 'Full month': 'Mês completo',
  'Negative values are excluded from shares.': 'Os valores negativos são excluídos das proporções.',
};
const CSS = `
.marao-history-chart{font-family:Montserrat,var(--primary-font-family,sans-serif);color:var(--primary-text-color);min-width:0;overflow-wrap:anywhere}
.marao-history-chart *{box-sizing:border-box}.marao-history-chart .history-plot{position:relative;min-width:0;height:clamp(200px,36vh,300px)}
.marao-history-chart canvas{display:block;max-width:100%;touch-action:pan-y pinch-zoom}
.marao-history-chart .history-reading{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;padding:12px 0}
.marao-history-chart .history-reading strong{font-size:1.4em}.marao-history-chart time{flex:1 1 18ch}
.marao-history-chart .history-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.marao-history-chart button{font:inherit;min-width:48px;min-height:48px;flex:1 1 6ch;padding:10px 12px;border:1px solid var(--divider-color,#667085);border-radius:14px;background:var(--ha-card-background,var(--card-background-color,#fff));color:var(--primary-text-color);white-space:normal;overflow-wrap:anywhere;outline:none}
.marao-history-chart button[aria-pressed=true]{background:var(--primary-color,#235b9c);color:var(--text-primary-color,#fff)}
.marao-history-chart button:disabled{opacity:.5}.marao-history-chart dl{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}
.marao-history-chart dl>div{flex:1 1 12ch;min-width:0}.marao-history-chart dt{color:var(--secondary-text-color)}
.marao-history-chart dd{margin:4px 0 0;font-weight:600}.marao-history-chart [hidden]{display:none!important}
.marao-history-chart .history-total{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px}.marao-history-chart .history-total span,.marao-history-chart .history-breakdown p,.marao-history-chart .history-unit{color:var(--secondary-text-color)}
.marao-history-chart .history-unit{margin:0 0 4px}.marao-history-chart[data-bars] .history-selection{justify-content:flex-end;align-items:center;flex-wrap:nowrap;margin:4px 0}
.marao-history-chart .history-selection-label{min-width:0;text-align:center;color:var(--secondary-text-color)}
.marao-history-chart[data-bars] .history-selection button{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;padding:0;border:0;border-radius:50%;background:var(--secondary-background-color)}
.marao-history-chart[data-bars] .history-selection .history-reset{flex:0 1 auto;width:auto;height:auto;min-height:48px;margin-right:auto;padding:8px 12px;border-radius:12px}
.marao-history-chart .history-selection ha-icon{--mdc-icon-size:24px;width:24px;height:24px;pointer-events:none}
.marao-history-chart .history-breakdown{margin-top:20px}.marao-history-chart .history-breakdown h3{font-size:1.1em;margin:0 0 8px}
.marao-history-chart .history-breakdown p{margin:8px 0}.marao-history-chart .history-donut{width:120px;height:120px;border-radius:50%;position:relative;margin:16px auto}
.marao-history-chart .history-breakdown-layout{--marao-control-columns:2;--marao-control-gap:8px}
.marao-history-chart .history-breakdown-layout>.history-donut{align-self:center}
.marao-history-chart .history-comparison{list-style:none;padding:0;margin:16px 0}.marao-history-chart .history-comparison>div{display:flex;justify-content:space-between;align-items:baseline;gap:8px 16px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--divider-color)}.marao-history-chart .history-comparison .history-item-heading{flex:1 1 14ch}.marao-history-chart .history-comparison .history-item-problem{color:var(--secondary-text-color)}
.marao-history-chart .history-donut::after{content:"";position:absolute;inset:24%;border-radius:50%;background:var(--ha-card-background,var(--card-background-color,#fff))}
.marao-history-chart .history-breakdown ul{list-style:none;padding:0;margin:0}.marao-history-chart .history-breakdown li{padding:12px 0;border-bottom:1px solid var(--divider-color,#667085)}
.marao-history-chart .history-item-heading{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.marao-history-chart .history-item-heading strong{flex:1 1 12ch}
.marao-history-chart .history-swatch{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none}
.marao-history-chart .history-item-values{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px}.marao-history-chart .history-item-problem{color:var(--secondary-text-color)}
`;

export function createHistoryChart(container, initial) {
  const doc = container.ownerDocument || document;
  const make = (tag, className, parent) => { const element = doc.createElement(tag); if (className) element.className = className; parent?.append(element); return element; };
  const root = make('section','marao-history-chart'), style = make('style','',root); style.textContent = CSS + (initial.breakdownGridStyles || '');
  const total = make('div','history-total',root), totalTitle=make('span','',total), totalValue=make('strong','',total);
  total.setAttribute('aria-live','polite');
  const reading = make('div','history-reading',root); reading.setAttribute('aria-live','polite');
  const value = make('strong','',reading), timestamp = make('time','',reading);
  const unit = make('div','history-unit',root);
  const plot = make('div','history-plot',root), canvas = make('canvas','',plot); canvas.setAttribute('role','img');
  const windows = make('div','history-actions',root); windows.setAttribute('role','group');
  const windowButtons = [1,6,24].map(hours => { const button=make('button','',windows);button.type='button';button.textContent=`${hours}h`;return {hours,button}; });
  const actions = make('div','history-actions history-selection',root), reset = make('button','history-reset',actions), previous = make('button','',actions), navigationLabel = make('span','history-selection-label',actions), next = make('button','',actions);
  reset.type=previous.type=next.type='button';
  const stats = make('dl','',root);
  const summaries = ['Minimum','Maximum','Sample average'].map(label => { const item=make('div','',stats);return {label,item,term:make('dt','',item),value:make('dd','',item)}; });
  const status = make('p','',root);status.setAttribute('role','status');
  const coverage = make('p','',root), retry = make('button','',root);retry.type='button';retry.hidden=true;
  const comparison = make('section','history-comparison',root);comparison.setAttribute('role','list');
  const breakdown = make('section','history-breakdown',root);
  container.append(root);
  let options = initial, chart, selectedTime, reportedTime, hours=24, destroyed=false, visible=[], drawError, scrollFrame;
  const events = new AbortController();
  const language = () => options.hass?.locale?.language || options.hass?.language || 'en';
  const text = key => {const translated=options.localize?.(key);return translated&&translated!==key?translated:(language().startsWith('pt')?PT[key]:null)||key;};
  const formatter = () => new Intl.DateTimeFormat(language(), { timeZone:options.hass?.config?.time_zone || 'UTC',
    ...(options.bars ? options.interval==='hour'?{hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}:{month:'short',day:'numeric'}
      : {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}) });
  const format = number => options.format ? options.format(number) : new Intl.NumberFormat(language(), { maximumFractionDigits:3 }).format(number);
  const haptic = () => container.dispatchEvent(new CustomEvent('haptic',{detail:'heavy',bubbles:true,composed:true}));
  const scrollRestorer = () => {
    const scroll=[];
    for(let node=container;node;node=node.parentElement||node.getRootNode?.()?.host){
      if(node.scrollHeight>node.clientHeight)scroll.push([node,node.scrollTop]);
    }
    return ()=>{for(const [node,top] of scroll)node.scrollTop=top;};
  };
  const select = sample => {
    const restore=scrollRestorer();
    cancelAnimationFrame(scrollFrame);
    selectedTime=sample?.time;haptic();render();
    restore();
    // iOS app WebViews may reposition focused controls after the click finishes.
    scrollFrame=requestAnimationFrame(()=>{scrollFrame=undefined;if(!destroyed)restore();});
  };
  const monthly = () => options.bars && options.interval==='day';
  const range = () => options.range ? { start:+new Date(options.range.start), end:+new Date(options.range.end) }
    : { start:(options.end ?? Date.now())-hours*3600000, end:options.end ?? Date.now() };
  const selectable = () => options.bars ? visible : visible.filter(sample=>Number.isFinite(sample.value));
  const midpoint = (sample,index) => (sample.time+(sample.end ?? visible[index+1]?.time ?? range().end))/2;
  const renderBreakdown = () => {
    const content=make('div');
    const selected=visible.find(sample=>sample.time===selectedTime);
    const detail=monthly()&&options.breakdownForSample ? options.breakdownForSample(selected) : options.breakdown,items=detail?.items||[];
    breakdown.hidden=!detail||Boolean(options.unavailable||options.loading)||(!items.length&&!detail.note);
    if(breakdown.hidden){breakdown.replaceChildren();return;}
    make('h3','',content).textContent=text('Where it went');
    if(detail.note)make('p','',content).textContent=detail.note;
    if(!items.length){breakdown.replaceChildren(...content.children);return;}
    const sum=items.reduce((total,item)=>total+(Number.isFinite(item.value)&&item.value>=0?item.value:0),0);
    const negative=items.some(item=>Number.isFinite(item.value)&&item.value<0);
    if(negative)make('p','',content).textContent=text('Negative values are excluded from shares.');
    const color=index=>`hsl(${(210+index*137.5)%360} 55% 48%)`;
    const comparison=make('div',sum>0&&!negative?'history-breakdown-layout':'',content);
    if(sum>0&&!negative){
      let position=0;
      const stops=items.flatMap((item,index)=>{
        if(!Number.isFinite(item.value)||item.value<=0)return[];
        const start=position;position+=item.value/sum*100;return[`${color(index)} ${start}% ${position}%`];
      });
      const donut=make('div','history-donut',comparison);donut.setAttribute('aria-hidden','true');donut.style.background=`conic-gradient(${stops.join(',')})`;
    }
    const list=make('ul','',comparison),percent=new Intl.NumberFormat(language(),{style:'percent',maximumFractionDigits:0});
    list.setAttribute('aria-label',text('Share of configured items'));
    for(const [index,item] of items.entries()){
      const row=make('li','',list),heading=make('div','history-item-heading',row),swatch=make('span','history-swatch',heading);
      swatch.style.background=color(index);swatch.setAttribute('aria-hidden','true');make('strong','',heading).textContent=item.name;
      if(Number.isFinite(item.value)&&item.value>=0&&sum>0)make('span','',heading).textContent=percent.format(item.value/sum);
      const values=make('div','history-item-values',row);
      for(const [label,amount] of [['Energy',item.energyLabel],['Cost',item.costLabel]]){
        const value=make('span','',values);value.textContent=amount||'—';value.setAttribute('aria-label',`${text(label)}: ${value.textContent}`);
      }
      if(item.problem||!Number.isFinite(item.value))make('p','history-item-problem',row).textContent=item.problem||text('No data');
    }
    // Avoid temporarily collapsing the popup during selection and HA state refreshes.
    breakdown.replaceChildren(...content.children);
  };
  const draw = () => {
    if (destroyed || options.unavailable || options.loading || options.error || drawError || plot.hidden || !visible.length) return;
    const bounds=plot.getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return;
    const computed=getComputedStyle(root), tone=computed.color || '#233044', grid=computed.getPropertyValue('--divider-color').trim() || '#667085';
    const color=options.color || computed.getPropertyValue('--primary-color').trim() || '#235b9c';
    // Resolve theme variables through the DOM before passing a canvas color to Chart.js.
    const probe=make('span','',root);probe.style.color=color;const trace=getComputedStyle(probe).color;probe.remove();
    const data=options.bars ? visible.map((sample,index)=>({x:midpoint(sample,index),y:sample.value}))
      : reduceSamples(visible,Math.max(32,Math.floor(bounds.width*2))).map(sample=>({x:sample.time,y:sample.value}));
    const holdLastState=points=>{
      const last=points.at(-1),end=Math.min(range().end,options.recordedUntil??Date.now());
      // Extend the drawn step only; retained readings and selected timestamps stay untouched.
      if(options.power&&Number.isFinite(last?.y)&&last.x<end)points.push({x:end,y:last.y});
      return points;
    };
    holdLastState(data);
    canvas.dataset.historyRenderedPoints=String(data.length);canvas.dataset.historySourcePoints=String(visible.length);
    const selected=nearestSample(visible,selectedTime), selectedPoint=selected ? [{x:selected.time,y:selected.value}] : [];
    const fontSize=parseFloat(computed.fontSize)||14, currentRange=range();
    const axisTime=new Intl.DateTimeFormat(language(),{timeZone:options.hass?.config?.time_zone||'UTC',
      ...(options.bars&&options.interval==='day'?{day:'numeric'}:currentRange.end-currentRange.start>2*86400000?{month:'short',day:'numeric'}:{hour:'2-digit',minute:'2-digit'})});
    const datasets=options.bars ? [{type:'bar',data,backgroundColor:visible.map(sample=>sample.time===selectedTime?trace:chartColor(trace).alpha(.45).rgbString()),
      borderColor:visible.map(sample=>sample.time===selectedTime?tone:trace),borderWidth:visible.map(sample=>sample.time===selectedTime?2:0),borderRadius:3,borderSkipped:false,barPercentage:.78,categoryPercentage:1,maxBarThickness:28}]
      : [{type:'line',data,borderColor:trace,backgroundColor:chartColor(trace).alpha(.12).rgbString(),borderWidth:options.showLine===false?0:2,fill:options.showFill!==false?'origin':false,
      pointRadius:data.filter(point=>point.y!==null).length===1?4:0,pointBackgroundColor:trace,spanGaps:false,tension:0,stepped:options.stepped||false},
      {type:'line',data:selectedPoint,borderColor:trace,backgroundColor:trace,showLine:false,pointRadius:5,pointBorderColor:tone,pointBorderWidth:1}];
    if(options.power)for(const [index,item] of (options.series||[]).entries()){
      if(!index)continue;
      const points=reduceSamples((item.samples||[]).filter(sample=>sample.time>=currentRange.start&&sample.time<=currentRange.end),Math.max(32,Math.floor(bounds.width*2))).map(sample=>({x:sample.time,y:sample.value}));
      datasets.push({type:'line',data:holdLastState(points),borderColor:item.color,borderWidth:2,pointRadius:0,spanGaps:false,tension:0,stepped:true,fill:false});
    }
    const chartOptions={responsive:true,maintainAspectRatio:false,animation:false,parsing:false,normalized:true,devicePixelRatio:Math.min(globalThis.devicePixelRatio||1,3),events:['click'],
      onClick:event=>{
        const stamp=chart.scales.x.getValueForPixel(event.x);
        const sample=options.bars?visible.find((item,index)=>stamp>=item.time&&stamp<(item.end??visible[index+1]?.time??currentRange.end)):nearestSample(visible,stamp);
        if(sample)select(sample);
      },
      plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{type:'linear',min:currentRange.start,max:currentRange.end,offset:false,grid:{display:false},border:{color:grid},
        ...(options.bars?{afterBuildTicks:scale=>{scale.ticks=data.map(point=>({value:point.x}));}}:{}),
        ticks:{color:tone,font:{family:computed.fontFamily,size:fontSize,weight:computed.fontWeight},maxTicksLimit:Math.max(2,Math.min(5,Math.floor(bounds.width/(fontSize*7)))),maxRotation:0,
          callback:stamp=>axisTime.format(new Date(options.bars?visible[data.findIndex(point=>point.x===stamp)]?.time??stamp:stamp))}},
        y:{type:'linear',beginAtZero:Boolean(options.bars),grid:{color:options.bars?chartColor(grid).alpha(.2).rgbString():grid},border:{display:false},ticks:{color:tone,font:{family:computed.fontFamily,size:fontSize,weight:computed.fontWeight},maxTicksLimit:4,
          ...(options.bars?{precision:0,callback:number=>new Intl.NumberFormat(language(),{maximumFractionDigits:0}).format(number)}:{callback:number=>options.axisFormat?options.axisFormat(number):format(number)})}}}};
    try {
      if (chart) {chart.data.datasets=datasets;chart.options=chartOptions;chart.update('none');}
      else chart=new Chart(canvas,{type:options.bars?'bar':'line',data:{datasets},options:chartOptions});
      drawError=null;
    } catch (error) { (chart||Chart.getChart(canvas))?.destroy();chart=null;drawError=error; }
    status.hidden=!drawError; if(drawError){status.textContent=text('Could not draw history.');status.setAttribute('role','alert');}
    retry.hidden=!drawError;
  };
  const render = () => {
    if(destroyed)return;
    const restoreScroll=scrollRestorer();
    const currentRange=range();
    visible=options.unavailable?[]:options.windows===false ? (options.samples||[]).filter(sample=>sample.time>=currentRange.start&&(options.bars?sample.time<currentRange.end:sample.time<=currentRange.end))
      : historyWindow(options.samples||[],hours,currentRange.end);
    const valid=visible.filter(sample=>Number.isFinite(sample.value));
    const choices=selectable();
    if(!choices.some(sample=>sample.time===selectedTime))selectedTime=monthly()?undefined:valid.at(-1)?.time??choices[0]?.time;
    const selected=choices.find(sample=>sample.time===selectedTime), index=choices.indexOf(selected);
    reading.hidden=monthly();
    value.textContent=selected&&Number.isFinite(selected.value)?format(selected.value):'—';
    value.setAttribute('aria-label',`${text(options.bars?(options.interval==='day'?'Selected day':'Selected hour'):'Selected reading')}: ${selected&&!Number.isFinite(selected.value)?text('No readings for this interval.'):value.textContent}`);
    if(options.bars)root.setAttribute('data-bars','');else root.removeAttribute('data-bars');
    timestamp.textContent=selected?formatter().format(new Date(selected.time)):'';
    if(selected)timestamp.dateTime=new Date(selected.time).toISOString();else timestamp.removeAttribute('datetime');
    total.hidden=(!monthly()&&!options.summaryLabel)||Boolean(options.unavailable||options.loading||options.error);
    totalTitle.textContent=monthly()&&selected?timestamp.textContent:text('Total');
    totalValue.textContent=monthly()&&selected?value.textContent:options.summaryLabel||'—';
    if(monthly()&&selected)totalValue.setAttribute('aria-label',value.getAttribute('aria-label'));else totalValue.removeAttribute('aria-label');
    canvas.setAttribute('aria-label',text('History'));windows.setAttribute('aria-label',text('Time window'));windows.hidden=options.windows===false;
    for(const {hours:window,button} of windowButtons){button.setAttribute('aria-pressed',String(window===hours));button.disabled=Boolean(options.unavailable||options.loading||options.error);}
    const previousLabel=text(options.bars?(options.interval==='day'?'Previous day':'Previous hour'):'Previous reading');
    const nextLabel=text(options.bars?(options.interval==='day'?'Next day':'Next hour'):'Next reading');
    navigationLabel.textContent=text(options.interval==='day'?'Day':'Hour');navigationLabel.hidden=!options.bars;
    reset.textContent=text('Full month');reset.hidden=!monthly();reset.disabled=Boolean(options.unavailable||options.loading||options.error)||!selected;
    if(options.bars){
      // Replacing a focused button's icon makes Safari reposition the popup scroll.
      for(const [button,direction] of [[previous,'left'],[next,'right']]){
        const icon=`<ha-icon icon="mdi:chevron-${direction}" aria-hidden="true"></ha-icon>`;
        if(button.innerHTML!==icon)button.innerHTML=icon;
      }
    }else{previous.textContent=previousLabel;next.textContent=nextLabel;}
    previous.setAttribute('aria-label',previousLabel);next.setAttribute('aria-label',nextLabel);
    previous.disabled=Boolean(options.unavailable||options.loading||options.error)||!choices.length||index===0;
    next.disabled=Boolean(options.unavailable||options.loading||options.error)||!choices.length||index>=choices.length-1;
    actions.hidden=Boolean(options.power);
    stats.hidden=Boolean(options.bars);
    const statsValues=summary(visible,options.stateClass);
    for(const [index,item] of summaries.entries()){
      const number=statsValues[['minimum','maximum','average'][index]];
      item.item.hidden=number==null&&(!options.power||index===2);item.term.textContent=text(item.label);item.value.textContent=number==null?(options.power?'—':''):format(number);
    }
    status.setAttribute('role',!options.unavailable&&(options.error||drawError)?'alert':'status');
    status.textContent=options.unavailable?(typeof options.unavailable==='string'?options.unavailable:text('History unavailable')):options.error?String(options.error):drawError?text('Could not draw history.'):options.loading?text('Loading history…'):!valid.length?text('No readings in this period.'):' ';status.hidden=!options.unavailable&&!options.error&&!drawError&&!options.loading&&valid.length>0;
    coverage.textContent=text('Recorded coverage may be limited.');coverage.hidden=Boolean(options.bars||options.unavailable)||!options.coverageLimited;
    retry.textContent=text('Retry');retry.hidden=Boolean(options.unavailable)||(!options.error&&!drawError&&!options.partialError);
    plot.hidden=!options.power&&Boolean(options.unavailable||options.error||options.loading||!valid.length);
    canvas.hidden=Boolean(options.power&&(options.unavailable||options.error||options.loading||!valid.length));
    if(options.power){status.style.minHeight='1.4em';status.style.visibility=status.hidden?'hidden':'visible';status.hidden=false;}
    unit.textContent=options.unit||'';unit.hidden=(!options.bars&&!options.power)||!options.unit||plot.hidden;
    if(options.unavailable||options.error||options.loading||!valid.length){chart?.destroy();chart=null;}else draw();
    comparison.hidden=!options.power||(options.series||[]).length<2||Boolean(options.unavailable);
    if(!comparison.hidden){
      const rows=[];
      for(const [index,item] of options.series.entries()){
        const row=make('div'),heading=make('span','history-item-heading',row),swatch=make('span','history-swatch',heading);row.setAttribute('role','listitem');
        swatch.style.background=item.color||options.color||'var(--primary-color)';swatch.setAttribute('aria-hidden','true');
        make('span','',heading).textContent=item.name;
        const sample=Number.isFinite(selectedTime)?powerStateAt(item.samples||[],selectedTime):null;
        const reading=make('span',item.problem?'history-item-problem':'',row);
        const exact=options.selection?.time===selectedTime?options.selection.values?.[item.id]:undefined;
        reading.textContent=item.problem||exact?.problem||(Number.isFinite(exact?.value)?format(exact.value):options.onSelect&&index>0?text('No data'):Number.isFinite(sample?.value)?format(sample.value):text('No data'));
        rows.push(row);
      }
      comparison.replaceChildren(...rows);
    }else comparison.replaceChildren();
    renderBreakdown();
    restoreScroll();
    const reportKey=`${options.selectionKey}:${selectedTime}`;
    if(options.onSelect&&reportKey!==reportedTime){reportedTime=reportKey;options.onSelect(selectedTime);}
  };
  for(const {hours:window,button} of windowButtons)button.addEventListener('click',()=>{haptic();hours=window;render();},{signal:events.signal});
  previous.addEventListener('click',()=>{if(previous.disabled)return;const choices=selectable(),index=choices.findIndex(sample=>sample.time===selectedTime);select(index<0?choices.filter(sample=>Number.isFinite(sample.value)).at(-1)||choices.at(-1):choices[index-1]);},{signal:events.signal});
  next.addEventListener('click',()=>{if(next.disabled)return;const choices=selectable(),index=choices.findIndex(sample=>sample.time===selectedTime);select(choices[index+1]);},{signal:events.signal});
  reset.addEventListener('click',()=>{if(reset.disabled)return;select(undefined);},{signal:events.signal});
  retry.addEventListener('click',()=>{haptic();const retryDrawing=Boolean(drawError);drawError=null;if(!retryDrawing&&options.onRetry)options.onRetry();else render();},{signal:events.signal});
  const observer=new ResizeObserver(()=>{if(!destroyed)draw();});observer.observe(plot);
  render();
  return { update(nextOptions){options={...options,...nextOptions};render();},destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(scrollFrame);events.abort();observer.disconnect();chart?.destroy();chart=null;root.remove();} };
}

export function createPowerHistory(host, options) { return createPowerController(host, options, createHistoryChart); }
