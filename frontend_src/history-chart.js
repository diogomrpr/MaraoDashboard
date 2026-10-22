import { createHistoryLayout, renderHistoryBreakdown, historyText } from '../custom_components/marao_dashboard/frontend/MaraoHistoryLayout.js';
import { Chart, LineController, LineElement, PointElement, BarController, BarElement, LinearScale, Filler } from 'chart.js';
import { color as chartColor } from 'chart.js/helpers';
import { historyWindow, nearestSample, reduceSamples, summary } from './history-data.js';
import { createPowerHistory as createPowerController, powerStateAt } from './power-history.js';

Chart.register(LineController, LineElement, PointElement, BarController, BarElement, LinearScale, Filler);


export function createHistoryChart(container, initial) {
  const { make, root, total, totalTitle, totalValue, reading, value, timestamp, unit, plot, canvas, windows, windowButtons, actions, reset, previous, navigationLabel, next, stats, summaries, status, coverage, retry, comparison, breakdown } = createHistoryLayout(container, initial);
  let options = initial, chart, selectedTime, reportedTime, hours=24, destroyed=false, visible=[], drawError, scrollFrame, inViewport=true;
  const events = new AbortController();
  const seriesColor = index => getComputedStyle(root).getPropertyValue(`--marao-chart-${index % 10 + 1}`).trim() || `hsl(${(210 + index * 137.5) % 360} 55% 48%)`;
  const language = () => options.hass?.locale?.language || options.hass?.language || 'en';
  const text = key => historyText(options, key);
  const formatter = () => new Intl.DateTimeFormat(language(), { timeZone:options.hass?.config?.time_zone || 'UTC',
    ...(options.bars ? options.interval==='hour'?{hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}:{month:'short',day:'numeric'}
      : {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}) });
  const format = number => options.format ? options.format(number) : new Intl.NumberFormat(language(), { maximumFractionDigits:3 }).format(number);
  const haptic = () => container.dispatchEvent(new CustomEvent('haptic',{detail:'heavy',bubbles:true,composed:true}));
  let scrollContainers=[];
  const scrollRestorer = (measure=true) => {
    if(measure){
      scrollContainers=[];
      for(let node=container;node;node=node.parentElement||node.getRootNode?.()?.host){
        if(node.scrollHeight>node.clientHeight)scrollContainers.push(node);
      }
    }
    const scroll=scrollContainers.map(node=>[node,node.scrollTop]);
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
    const selected = visible.find(sample => sample.time === selectedTime);
    let detail = monthly() && options.breakdownForSample ? options.breakdownForSample(selected) : options.breakdown;
    if (detail && (options.unavailable || options.loading || options.error)) detail = { ...detail, items: (detail.items || []).map(item => ({ ...item, value:null, energyLabel:'—', costLabel:'—', problem:text('No data') })) };
    renderHistoryBreakdown({ make, breakdown }, detail, { text, color: seriesColor, language: language() });
  };
  const draw = () => {
    if (destroyed || !inViewport || options.unavailable || options.loading || options.error || drawError || plot.hidden || !visible.length) return;
    const bounds=plot.getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return;
    const computed=getComputedStyle(root), tone=computed.color || '#263338', grid=computed.getPropertyValue('--divider-color').trim() || '#7B8C91';
    const color=options.color || options.series?.[0]?.color || computed.getPropertyValue('--primary-color').trim() || '#506F79';
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
      datasets.push({type:'line',data:holdLastState(points),borderColor:item.color||seriesColor(index),borderWidth:2,pointRadius:0,spanGaps:false,tension:0,stepped:true,fill:false});
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
    // Only interactions discover scrollers; background updates reuse that context.
    const restoreScroll=scrollRestorer(false);
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
    total.hidden=!options.bars&&!options.summaryLabel;
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
      item.item.hidden=index===2&&(options.power||options.stateClass!=='measurement');item.term.textContent=text(item.label);item.value.textContent=number==null?'—':format(number);
    }
    status.setAttribute('role',!options.unavailable&&(options.error||drawError)?'alert':'status');
    status.textContent=options.unavailable?(typeof options.unavailable==='string'?options.unavailable:text('History unavailable')):options.error?String(options.error):drawError?text('Could not draw history.'):options.loading?text('Loading history…'):!valid.length?text('No readings in this period.'):' ';status.hidden=!options.unavailable&&!options.error&&!drawError&&!options.loading&&valid.length>0;
    coverage.textContent=text('Recorded coverage may be limited.');coverage.hidden=true;
    retry.textContent=text('Retry');retry.hidden=Boolean(options.unavailable)||(!options.error&&!drawError&&!options.partialError);
    plot.hidden=false;
    canvas.hidden=Boolean(options.unavailable||options.error||options.loading||!valid.length);
    unit.textContent=options.unit||'\u00a0';unit.hidden=!options.bars&&!options.power;
    if(options.unavailable||options.error||options.loading||!valid.length){chart?.destroy();chart=null;}else draw();
    comparison.hidden=!options.power||(options.series||[]).length<2;
    if(!comparison.hidden){
      const rows=[];
      for(const [index,item] of options.series.entries()){
        const row=make('div'),heading=make('span','history-item-heading',row),swatch=make('span','history-swatch',heading);row.setAttribute('role','listitem');
        swatch.style.background=item.color||(!index?options.color||'var(--primary-color)':seriesColor(index));swatch.setAttribute('aria-hidden','true');
        make('span','',heading).textContent=item.name;
        const sample=Number.isFinite(selectedTime)?powerStateAt(item.samples||[],selectedTime):null;
        const reading=make('span',item.problem?'history-item-problem':'',row);
        const exact=options.selection && options.selection.time===selectedTime ? options.selection.values?.[item.id] : undefined;
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
  for(const {hours:window,button} of windowButtons)button.addEventListener('click',()=>{const restore=scrollRestorer();haptic();hours=window;render();restore();},{signal:events.signal});
  previous.addEventListener('click',()=>{if(previous.disabled)return;const choices=selectable(),index=choices.findIndex(sample=>sample.time===selectedTime);select(index<0?choices.filter(sample=>Number.isFinite(sample.value)).at(-1)||choices.at(-1):choices[index-1]);},{signal:events.signal});
  next.addEventListener('click',()=>{if(next.disabled)return;const choices=selectable(),index=choices.findIndex(sample=>sample.time===selectedTime);select(choices[index+1]);},{signal:events.signal});
  reset.addEventListener('click',()=>{if(reset.disabled)return;select(undefined);},{signal:events.signal});
  retry.addEventListener('click',()=>{haptic();const retryDrawing=Boolean(drawError);drawError=null;if(!retryDrawing&&options.onRetry)options.onRetry();else render();},{signal:events.signal});
  const observer=new ResizeObserver(()=>{if(!destroyed)draw();});observer.observe(plot);
  const visibility=globalThis.IntersectionObserver ? new IntersectionObserver(entries=>{
    const wasVisible=inViewport;inViewport=entries.at(-1).isIntersecting;
    if(inViewport&&!wasVisible)draw();
  },{rootMargin:'150px'}) : null;
  visibility?.observe(plot);
  render();
  return { update(nextOptions){options={...options,...nextOptions};render();},destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(scrollFrame);events.abort();observer.disconnect();visibility?.disconnect();chart?.destroy();chart=null;root.remove();} };
}

export function createPowerHistory(host, options) { return createPowerController(host, options, createHistoryChart); }
