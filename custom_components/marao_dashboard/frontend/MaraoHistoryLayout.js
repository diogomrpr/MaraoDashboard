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

export function historyText(options, key) {
  const translated = options.localize?.(key), language = options.hass?.locale?.language || options.hass?.language || 'en';
  return translated && translated !== key ? translated : (language.startsWith('pt') ? PT[key] : null) || key;
}

export const historyLayoutStyles = `
.marao-history-chart{font-family:Montserrat,var(--primary-font-family,sans-serif);color:var(--primary-text-color);min-width:0;overflow-wrap:anywhere}
.marao-history-chart *{box-sizing:border-box}.marao-history-chart .history-plot{position:relative;min-width:0;height:clamp(200px,36vh,300px)}
.marao-history-chart canvas{display:block;max-width:100%;touch-action:pan-y pinch-zoom}
.marao-history-chart .history-reading{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;padding:12px 0}
.marao-history-chart .history-reading strong{font-size:1.4em}.marao-history-chart time{flex:1 1 18ch}
.marao-history-chart .history-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.marao-history-chart button{font:inherit;min-width:48px;min-height:48px;flex:1 1 6ch;padding:10px 12px;border:1px solid var(--divider-color,#7B8C91);border-radius:14px;background:var(--ha-card-background,var(--card-background-color,#fff));color:var(--primary-text-color);white-space:normal;overflow-wrap:anywhere;outline:none}
.marao-history-chart button[aria-pressed=true]{background:var(--primary-color,#506F79);color:var(--text-primary-color,#fff)}
.marao-history-chart button:disabled{opacity:.5}.marao-history-chart dl{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}
.marao-history-chart dl>div{flex:1 1 12ch;min-width:0}.marao-history-chart dt{color:var(--secondary-text-color)}
.marao-history-chart dd{margin:4px 0 0;font-weight:600;height:1.4em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.marao-history-chart [hidden]{display:none!important}
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
.marao-history-chart .history-breakdown ul{list-style:none;padding:0;margin:0}.marao-history-chart .history-breakdown li{padding:12px 0;border-bottom:1px solid var(--divider-color,#7B8C91)}
.marao-history-chart .history-item-heading{display:grid;grid-template-columns:10px minmax(0,1fr) 5ch;gap:8px;align-items:baseline}.marao-history-chart .history-item-heading strong{min-width:0}
.marao-history-chart .history-breakdown .history-item-heading>span:last-child{white-space:nowrap}
.marao-history-chart .history-swatch{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none}
.marao-history-chart .history-item-values{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px}.marao-history-chart .history-item-problem{color:var(--secondary-text-color)}
.marao-history-chart .history-reading{display:grid;gap:4px}.marao-history-chart .history-reading>*{height:1.4em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.marao-history-chart .history-total{min-height:1.4em;flex-wrap:nowrap}.marao-history-chart .history-total>*{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.marao-history-chart .history-unit{min-height:1.25em}
.marao-history-chart .history-status{position:absolute;inset:0;margin:0;display:grid;place-items:center;padding:16px;text-align:center}
.marao-history-chart .history-retry{position:absolute;right:8px;bottom:8px}
.marao-history-chart .history-donut{background:var(--divider-color)}
.marao-history-chart .history-item-values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.marao-history-chart .history-item-values>*{height:1.4em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.marao-history-chart .history-breakdown-note{height:1.4em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.marao-history-chart .history-comparison>div{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:1.4em}.marao-history-chart .history-comparison .history-item-heading{grid-template-columns:10px minmax(0,1fr)}.marao-history-chart .history-comparison>div>span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;

export function createHistoryLayout(container, initial = {}) {
  const doc = container.ownerDocument || document;
  const make = (tag, className, parent) => { const element = doc.createElement(tag); if (className) element.className = className; parent?.append(element); return element; };
  const root = make('section','marao-history-chart'), style = make('style','',root); style.textContent = historyLayoutStyles + (initial.breakdownGridStyles || '');
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
  const status = make('p','history-status',plot);status.setAttribute('role','status');
  const coverage = make('p','',root), retry = make('button','history-retry',plot);retry.type='button';retry.hidden=true;
  const comparison = make('section','history-comparison',root);comparison.setAttribute('role','list');
  const breakdown = make('section','history-breakdown',root);
  container.append(root);
  return { make, root, total, totalTitle, totalValue, reading, value, timestamp, unit, plot, canvas, windows, windowButtons, actions, reset, previous, navigationLabel, next, stats, summaries, status, coverage, retry, comparison, breakdown };
}

export function createHistoryPlaceholder(container, options = {}) {
  const frame = createHistoryLayout(container, options);
  const text = key => historyText(options, key);
  const { root, total, reading, value, timestamp, unit, canvas, windows, actions, stats, summaries, status, coverage, reset, previous, next, navigationLabel } = frame;
  root.setAttribute('aria-busy', 'true');
  if (options.bars) root.setAttribute('data-bars', '');
  total.hidden = !options.bars; frame.totalTitle.textContent = text('Total'); frame.totalValue.textContent = '—';
  reading.hidden = options.bars && options.interval === 'day'; value.textContent = '—'; timestamp.textContent = '—';
  unit.hidden = !options.bars && !options.power; unit.textContent = options.unit || '\u00a0'; canvas.hidden = true;
  windows.hidden = options.windows === false; actions.hidden = Boolean(options.power); stats.hidden = Boolean(options.bars);
  for (const [index,item] of summaries.entries()) { item.item.hidden = index === 2 && (options.power || options.stateClass !== 'measurement'); item.term.textContent = text(item.label); item.value.textContent = '—'; }
  reset.hidden = !(options.bars && options.interval === 'day'); reset.textContent = text('Full month');
  navigationLabel.hidden = !options.bars; navigationLabel.textContent = text(options.interval === 'day' ? 'Day' : 'Hour');
  previous.textContent = options.bars ? '‹' : text('Previous reading');
  next.textContent = options.bars ? '›' : text('Next reading');
  for (const button of root.querySelectorAll('button')) button.disabled = true;
  status.textContent = options.loadingText || 'Loading…'; coverage.hidden = true;
  renderHistoryBreakdown(frame, options.breakdown, { text, language: options.hass?.language || 'en' });
  if (options.power && options.series?.length > 1) for (const item of options.series) { const row = frame.make('div','',frame.comparison); const heading = frame.make('span','history-item-heading',row); frame.make('span','history-swatch',heading); frame.make('span','',heading).textContent = item.name; frame.make('span','',row).textContent = '—'; }
  else frame.comparison.hidden = true;
  return frame;
}

export function renderHistoryBreakdown(frame, detail, { text = value => value, color = index => `var(--marao-chart-${index % 10 + 1})`, language = 'en' } = {}) {
  const { make, breakdown } = frame, content = make('div'), items = detail?.items || [];
    breakdown.hidden=!detail||(!items.length&&!detail.note);
    if(breakdown.hidden){breakdown.replaceChildren();return;}
    make('h3','',content).textContent=text('Where it went');
    make('p','history-breakdown-note',content).textContent=detail.note || '\u00a0';
    if(!items.length){breakdown.replaceChildren(...content.children);return;}
    const sum=items.reduce((total,item)=>total+(Number.isFinite(item.value)&&item.value>=0?item.value:0),0);
    const negative=items.some(item=>Number.isFinite(item.value)&&item.value<0);
    
    const comparison=make('div','history-breakdown-layout',content);
    const donut=make('div','history-donut',comparison);donut.setAttribute('aria-hidden','true');
    if(sum>0&&!negative){
      let position=0;
      const stops=items.flatMap((item,index)=>{
        if(!Number.isFinite(item.value)||item.value<=0)return[];
        const start=position;position+=item.value/sum*100;return[`${color(index)} ${start}% ${position}%`];
      });
      donut.style.background=`conic-gradient(${stops.join(',')})`;
    }
    const list=make('ul','',comparison),percent=new Intl.NumberFormat(language,{style:'percent',maximumFractionDigits:0});
    list.setAttribute('aria-label',text('Share of configured items'));
    for(const [index,item] of items.entries()){
      const row=make('li','',list),heading=make('div','history-item-heading',row),swatch=make('span','history-swatch',heading);
      swatch.style.background=color(index);swatch.setAttribute('aria-hidden','true');make('strong','',heading).textContent=item.name;
      make('span','',heading).textContent=Number.isFinite(item.value)&&item.value>=0&&sum>0?percent.format(item.value/sum):'—';
      const values=make('div','history-item-values',row);
      for(const [label,amount] of [['Energy',item.energyLabel],['Cost',item.costLabel]]){
        const value=make('span','',values);value.textContent=amount||'—';value.setAttribute('aria-label',`${text(label)}: ${value.textContent}`);
      }
      if(item.problem||!Number.isFinite(item.value)) {
        values.firstChild.textContent=item.problem||text('No data');
        values.firstChild.className='history-item-problem';
      }
    }
    // Avoid temporarily collapsing the popup during selection and HA state refreshes.
    breakdown.replaceChildren(...content.children);
}

export const powerToolbarStyles = `

:host{display:block;min-width:0;font-family:var(--primary-font-family,Montserrat,sans-serif);color:var(--primary-text-color)}
.power-toolbar{position:sticky;top:var(--marao-popup-header-height,0px);z-index:1;display:grid;gap:8px;padding:8px 0 12px;background:var(--ha-card-background,var(--card-background-color))}
.power-navigation{display:grid;grid-template-columns:48px minmax(0,1fr) 48px;align-items:center;gap:8px;text-align:center}
.power-navigation strong{display:grid;align-content:center;min-height:2.5em;line-height:1.25;overflow-wrap:anywhere;font-size:var(--font-size-primary,1.125rem)}
.power-navigation button{display:grid;place-items:center;width:48px;height:48px;padding:0;border:0;border-radius:50%;background:var(--secondary-background-color);color:inherit;font:inherit;cursor:pointer}
.power-navigation button:active{transform:scale(.94)}.power-navigation ha-icon{--mdc-icon-size:24px;pointer-events:none}
.power-toolbar :disabled{opacity:.5}.power-toolbar :focus{outline:none}.power-history-content{min-width:0}
`;

export function createPowerToolbar(host, css = "") {
  const make = (tag, parent, className) => { const node = document.createElement(tag); if (className) node.className = className; parent.append(node); return node; };
  const style = make('style', host); style.textContent = css + powerToolbarStyles;
  const toolbar = make('div', host, 'power-toolbar'), picker = make('div', toolbar, 'power-picker marao-dropdown');
  const trigger = make('button', picker), selectedLabel = make('span', trigger), chevron = make('ha-icon', trigger);
  trigger.type = 'button'; trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
  chevron.setAttribute('icon','mdi:chevron-down'); chevron.setAttribute('aria-hidden','true');
  const menu = make('div', picker, 'power-options marao-dropdown-options'); menu.setAttribute('role','menu'); menu.hidden = true;
  const choices = ['day','week','month'].map(value => {
    const button = make('button', menu), label = make('span', button), check = make('ha-icon', button);
    button.type = 'button'; button.tabIndex = -1; button.setAttribute('role','menuitemradio');
    check.setAttribute('icon','mdi:check'); check.setAttribute('aria-hidden','true');
    return { value, button, label };
  });
  const navigation = make('div', toolbar, 'power-navigation');
  const previous = make('button', navigation), title = make('strong', navigation), next = make('button', navigation);
  previous.type = next.type = 'button';
  previous.innerHTML = '<ha-icon icon="mdi:chevron-left" aria-hidden="true"></ha-icon>';
  next.innerHTML = '<ha-icon icon="mdi:chevron-right" aria-hidden="true"></ha-icon>';
  const content = make('div', host, 'power-history-content');
  return { style, toolbar, picker, trigger, selectedLabel, menu, choices, previous, title, next, content };
}
