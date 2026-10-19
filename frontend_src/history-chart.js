import { Chart, LineController, LineElement, PointElement, LinearScale, Filler } from 'chart.js';
import { color as chartColor } from 'chart.js/helpers';
import { historyWindow, nearestSample, reduceSamples, summary } from './history-data.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler);
const PT = {
  'History': 'Histórico', 'Selected reading': 'Leitura selecionada', 'Previous reading': 'Leitura anterior', 'Next reading': 'Leitura seguinte',
  'Minimum': 'Mínimo', 'Maximum': 'Máximo', 'Sample average': 'Média das amostras', 'No readings in this period.': 'Sem leituras neste período.',
  'Loading history…': 'A carregar o histórico…', 'Could not draw history.': 'Não foi possível desenhar o histórico.', 'Retry': 'Tentar novamente',
  'Recorded coverage may be limited.': 'A cobertura do histórico pode ser limitada.', 'Time window': 'Intervalo de tempo',
  'History unavailable': 'Histórico indisponível',
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
`;

export function createHistoryChart(container, initial) {
  const doc = container.ownerDocument || document;
  const make = (tag, className, parent) => { const element = doc.createElement(tag); if (className) element.className = className; parent?.append(element); return element; };
  const root = make('section','marao-history-chart'), style = make('style','',root); style.textContent = CSS;
  const reading = make('div','history-reading',root); reading.setAttribute('aria-live','polite');
  const value = make('strong','',reading), timestamp = make('time','',reading);
  const plot = make('div','history-plot',root), canvas = make('canvas','',plot); canvas.setAttribute('role','img');
  const windows = make('div','history-actions',root); windows.setAttribute('role','group');
  const windowButtons = [1,6,24].map(hours => { const button=make('button','',windows);button.type='button';button.textContent=`${hours}h`;return {hours,button}; });
  const actions = make('div','history-actions',root), previous = make('button','',actions), next = make('button','',actions);
  previous.type=next.type='button';
  const stats = make('dl','',root);
  const summaries = ['Minimum','Maximum','Sample average'].map(label => { const item=make('div','',stats);return {label,item,term:make('dt','',item),value:make('dd','',item)}; });
  const status = make('p','',root);status.setAttribute('role','status');
  const coverage = make('p','',root), retry = make('button','',root);retry.type='button';retry.hidden=true;
  container.append(root);
  let options = initial, chart, selectedTime, hours=24, destroyed=false, visible=[], drawError;
  const events = new AbortController();
  const language = () => options.hass?.locale?.language || options.hass?.language || 'en';
  const text = key => {const translated=options.localize?.(key);return translated&&translated!==key?translated:(language().startsWith('pt')?PT[key]:null)||key;};
  const formatter = () => new Intl.DateTimeFormat(language(), { timeZone:options.hass?.config?.time_zone || 'UTC', year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit' });
  const format = number => options.format ? options.format(number) : new Intl.NumberFormat(language(), { maximumFractionDigits:3 }).format(number);
  const haptic = () => container.dispatchEvent(new CustomEvent('haptic',{detail:'heavy',bubbles:true,composed:true}));
  const select = sample => { selectedTime=sample?.time;render(); };
  const range = () => options.range ? { start:+new Date(options.range.start), end:+new Date(options.range.end) }
    : { start:(options.end ?? Date.now())-hours*3600000, end:options.end ?? Date.now() };
  const draw = () => {
    if (destroyed || options.unavailable || options.loading || options.error || drawError || plot.hidden || !visible.length) return;
    const bounds=plot.getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return;
    const computed=getComputedStyle(root), tone=computed.color || '#233044', grid=computed.getPropertyValue('--divider-color').trim() || '#667085';
    const color=options.color || computed.getPropertyValue('--primary-color').trim() || '#235b9c';
    // Resolve theme variables through the DOM before passing a canvas color to Chart.js.
    const probe=make('span','',root);probe.style.color=color;const trace=getComputedStyle(probe).color;probe.remove();
    const data=reduceSamples(visible,Math.max(32,Math.floor(bounds.width*2))).map(sample=>({x:sample.time,y:sample.value}));
    canvas.dataset.historyRenderedPoints=String(data.length);canvas.dataset.historySourcePoints=String(visible.length);
    const selected=nearestSample(visible,selectedTime), selectedPoint=selected ? [{x:selected.time,y:selected.value}] : [];
    const fontSize=parseFloat(computed.fontSize)||14, currentRange=range();
    const axisTime=new Intl.DateTimeFormat(language(),{timeZone:options.hass?.config?.time_zone||'UTC',
      ...(currentRange.end-currentRange.start>2*86400000?{month:'short',day:'numeric'}:{hour:'2-digit',minute:'2-digit'})});
    const datasets=[{data,borderColor:trace,backgroundColor:chartColor(trace).alpha(.12).rgbString(),borderWidth:options.showLine===false?0:2,fill:options.showFill!==false?'origin':false,
      pointRadius:data.filter(point=>point.y!==null).length===1?4:0,pointBackgroundColor:trace,spanGaps:false,tension:0},
      {data:selectedPoint,borderColor:trace,backgroundColor:trace,showLine:false,pointRadius:5,pointBorderColor:tone,pointBorderWidth:1}];
    const chartOptions={responsive:true,maintainAspectRatio:false,animation:false,parsing:false,normalized:true,devicePixelRatio:Math.min(globalThis.devicePixelRatio||1,3),events:['click'],
      onClick:event=>{haptic();select(nearestSample(visible,chart.scales.x.getValueForPixel(event.x)));},
      plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{type:'linear',min:currentRange.start,max:currentRange.end,grid:{display:false},border:{color:grid},ticks:{color:tone,font:{family:computed.fontFamily,size:fontSize,weight:computed.fontWeight},maxTicksLimit:Math.max(2,Math.min(5,Math.floor(bounds.width/(fontSize*7)))),maxRotation:0,callback:stamp=>axisTime.format(new Date(stamp))}},
        y:{type:'linear',grid:{color:grid},border:{display:false},ticks:{color:tone,font:{family:computed.fontFamily,size:fontSize,weight:computed.fontWeight},maxTicksLimit:4,callback:number=>format(number)}}}};
    try {
      if (chart) {chart.data.datasets=datasets;chart.options=chartOptions;chart.update('none');}
      else chart=new Chart(canvas,{type:'line',data:{datasets},options:chartOptions});
      drawError=null;
    } catch (error) { (chart||Chart.getChart(canvas))?.destroy();chart=null;drawError=error; }
    status.hidden=!drawError; if(drawError){status.textContent=text('Could not draw history.');status.setAttribute('role','alert');}
    retry.hidden=!drawError;
  };
  const render = () => {
    if(destroyed)return;
    const currentRange=range();
    visible=options.unavailable?[]:options.windows===false ? (options.samples||[]).filter(sample=>sample.time>=currentRange.start&&sample.time<=currentRange.end)
      : historyWindow(options.samples||[],hours,currentRange.end);
    const valid=visible.filter(sample=>Number.isFinite(sample.value));
    if(!valid.some(sample=>sample.time===selectedTime))selectedTime=valid.at(-1)?.time;
    const selected=valid.find(sample=>sample.time===selectedTime), index=valid.indexOf(selected);
    value.textContent=selected?format(selected.value):'—';
    value.setAttribute('aria-label',`${text('Selected reading')}: ${value.textContent}`);
    timestamp.textContent=selected?formatter().format(new Date(selected.time)):'';
    if(selected)timestamp.dateTime=new Date(selected.time).toISOString();else timestamp.removeAttribute('datetime');
    canvas.setAttribute('aria-label',text('History'));windows.setAttribute('aria-label',text('Time window'));windows.hidden=options.windows===false;
    for(const {hours:window,button} of windowButtons){button.setAttribute('aria-pressed',String(window===hours));button.disabled=Boolean(options.unavailable||options.loading||options.error);}
    previous.textContent=text('Previous reading');next.textContent=text('Next reading');previous.disabled=Boolean(options.unavailable||options.loading||options.error)||index<=0;next.disabled=Boolean(options.unavailable||options.loading||options.error)||index<0||index>=valid.length-1;
    const statsValues=summary(visible,options.stateClass);
    for(const [index,item] of summaries.entries()){
      const number=statsValues[['minimum','maximum','average'][index]];
      item.item.hidden=number==null;item.term.textContent=text(item.label);item.value.textContent=number==null?'':format(number);
    }
    status.setAttribute('role',!options.unavailable&&(options.error||drawError)?'alert':'status');
    status.textContent=options.unavailable?(typeof options.unavailable==='string'?options.unavailable:text('History unavailable')):options.error?String(options.error):drawError?text('Could not draw history.'):options.loading?text('Loading history…'):!valid.length?text('No readings in this period.'):' ';status.hidden=!options.unavailable&&!options.error&&!drawError&&!options.loading&&valid.length>0;
    coverage.textContent=text('Recorded coverage may be limited.');coverage.hidden=Boolean(options.unavailable)||!options.coverageLimited;
    retry.textContent=text('Retry');retry.hidden=Boolean(options.unavailable)||(!options.error&&!drawError);
    plot.hidden=Boolean(options.unavailable||options.error||options.loading||!valid.length);
    if(options.unavailable||options.error||options.loading||!valid.length){chart?.destroy();chart=null;}else draw();
  };
  for(const {hours:window,button} of windowButtons)button.addEventListener('click',()=>{haptic();hours=window;render();},{signal:events.signal});
  previous.addEventListener('click',()=>{const valid=visible.filter(sample=>Number.isFinite(sample.value)),index=valid.findIndex(sample=>sample.time===selectedTime);if(index>0){haptic();select(valid[index-1]);}},{signal:events.signal});
  next.addEventListener('click',()=>{const valid=visible.filter(sample=>Number.isFinite(sample.value)),index=valid.findIndex(sample=>sample.time===selectedTime);if(index>=0&&index<valid.length-1){haptic();select(valid[index+1]);}},{signal:events.signal});
  retry.addEventListener('click',()=>{haptic();const retryDrawing=Boolean(drawError);drawError=null;if(!retryDrawing&&options.onRetry)options.onRetry();else render();},{signal:events.signal});
  const observer=new ResizeObserver(()=>{if(!destroyed)draw();});observer.observe(plot);
  render();
  return { update(nextOptions){options={...options,...nextOptions};render();},destroy(){if(destroyed)return;destroyed=true;events.abort();observer.disconnect();chart?.destroy();chart=null;root.remove();} };
}
