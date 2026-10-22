// State geometry regression with synthetic entities; never contacts Home Assistant.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const frontend = path.resolve(__dirname, '../custom_components/marao_dashboard/frontend');
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{font:16px Arial;--primary-font-family:Arial;--primary-text-color:#172d32;--secondary-text-color:#50676d;--ha-card-background:#e5ebe8;--secondary-background-color:#d0dbd7;--font-size-primary:18px;--font-size-secondary:16px}body{margin:0;padding:8px}#cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:start}ha-card{display:block}</style><main id="cards"></main>'); return; }
  if (/^\/Marao[\w.-]+\.js$/.test(pathname)) { response.setHeader('Content-Type', 'text/javascript'); response.end(fs.readFileSync(path.join(frontend, path.basename(pathname)))); return; }
  response.statusCode = 204; response.end();
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const report = await page.evaluate(async () => {
      const { MaraoCard } = await import('/MaraoCards.js');
      const specs = [
        ['base','sensor','42'], ['sensor','sensor','42'], ['battery','sensor','65'], ['switch','switch','off'],
        ['light','light','off',{supported_color_modes:['brightness'],brightness:125}], ['fan','fan','off',{supported_features:1,percentage:50}],
        ['cover','cover','closed',{current_position:0}], ['number','number','10',{min:0,max:100,unit_of_measurement:'A'}],
        ['wallbox_current','number','6',{min:6,max:32,unit_of_measurement:'A'},{shortcuts:[6,12,16]}],
        ['climate','climate','heat',{current_temperature:20,temperature:21,hvac_modes:['off','heat','cool']},{show_mode_buttons:true}],
        ['media','media_player','off'], ['weather','weather','sunny',{temperature:20,forecast:[]}],
        ['dishwasher','sensor','idle'], ['washing_machine','sensor','idle'], ['vacuum','vacuum','idle',{supported_features:8192|4|16}],
        ['alarm_controls','alarm_control_panel','disarmed',{supported_features:1|2,code_format:'number'}],
        ['room','','off',{}, {light_entities:['light.safe']}], ['navigation','sensor','42'],
        ['entity_group','','off',{}, {entity_type:'light',summary_entities:['light.safe']}],
        ['glance','','',{}, {entity1:'sensor.safe',entity2:'sensor.other',entity3:'sensor.third'}],
        ['header','weather','sunny'], ['graph','sensor','42'], ['title','',''],
      ];
      const hass = {connected:true,connection:{connected:true},language:'en',config:{time_zone:'UTC'},callService:()=>{throw Error('Unexpected service call')},callApi:async()=>[]};
      const records = specs.map(([family,domain,state,attrs={},variables={}]) => {
        const card = new MaraoCard(); const entity = domain ? domain+'.safe' : '';
        card.setConfig({type:'custom:marao-card',template:'hc_'+family+'_card',entity,name:'Safe '+family,variables});
        document.querySelector('#cards').append(card);
        return {card,entity,state,attrs,family};
      });
      const frame = () => new Promise(resolve => requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      await frame();
      const measure = () => records.map(({card}) => +card.getBoundingClientRect().height.toFixed(2));
      const states = {loading:measure()};
      for (const phase of ['ready','changed','unavailable','error','recovered']) {
        for (const record of records) {
          const {card,entity,state,attrs,family} = record;
          const attributes = {...attrs,friendly_name:'Safe '+family};
          if (phase === 'changed') {
            if (family === 'media') attributes.media_title = 'A very long title '.repeat(20);
            if (family === 'weather') attributes.forecast = Array.from({length:5},(_,index)=>({datetime:new Date(Date.now()+index*86400000).toISOString(),condition:'partlycloudy',temperature:25,templow:10}));
            if (family === 'climate') { attributes.hvac_modes=['off','heat','cool','auto','dry','fan_only'];attributes.temperature=undefined; }
          }
          const entry = {state:phase === 'unavailable' ? 'unavailable' : phase==='changed' && ['switch','light','fan'].includes(family) ? 'on' : state,attributes:phase==='unavailable'?{}:attributes};
          const entities = Object.fromEntries(['light.safe','sensor.safe','sensor.other','sensor.third'].map(id=>[id,{state:phase==='unavailable'?'unavailable':'off',attributes:{friendly_name:'Safe reading'}}]));
          if(entity)entities[entity]=entry;
          card._actionError=phase==='error'?'A detailed failure '.repeat(50):'';
          card.hass={...hass,states:entities};
        }
        await frame();states[phase]=measure();
      }
      return records.map(({family},index)=>({family,...Object.fromEntries(Object.entries(states).map(([phase,values])=>[phase,values[index]]))}));
    });
    const detailReport = await page.evaluate(async () => {
      const { createHistoryPlaceholder, MaraoPopupCard, showCardDetails } = await import('/MaraoCards.js');
      const { createHistoryChart } = await import('/MaraoHistoryChart.js');
      const parent = document.createElement('div'); document.body.append(parent);
      const end = Date.now(), samples = [{time:end-3600000,value:12},{time:end,value:40}];
      const details = [];
      const measure = () => +parent.getBoundingClientRect().height.toFixed(2);
      for (const variant of [{}, {bars:true,interval:'day',windows:false,summaryLabel:'52 kWh',breakdown:{items:[{name:'Kitchen',value:12,energyLabel:'12 kWh',costLabel:'3 EUR'}]}}, {power:true,windows:false,series:[{id:'house',name:'House',samples},{id:'pump',name:'Heat pump',samples}]}]) {
        const options = {samples,end,hass:{language:'pt',config:{time_zone:'UTC'}},stateClass:'measurement',...variant};
        createHistoryPlaceholder(parent,options); const placeholder = measure(); parent.replaceChildren();
        const renderer = createHistoryChart(parent,{...options,loading:true}); const loading = measure();
        renderer.update({loading:false}); const ready = measure();
        renderer.update({error:'History unavailable'}); const error = measure();
        renderer.update({error:'',unavailable:'Unavailable'}); const unavailable = measure();
        details.push({family:variant.bars?'energy-detail':variant.power?'power-detail':'history-detail',placeholder,loading,ready,error,unavailable});
        renderer.destroy(); parent.replaceChildren();
      }
      const { MaraoNativeCard } = await import('/MaraoNativeCards.js');
      const { catalog } = await import('/MaraoNativeCatalog.js');
      for (const family of ['climate','sensor']) {
        const spec = catalog.cards.find(item=>item.id==='hc_'+family+'_card');
        class Native extends MaraoNativeCard { static spec = spec; }
        customElements.define('test-native-'+family,Native);
        const card = new Native(); card.setConfig({type:spec.type,name:'Safe native '+family,entity:family+'.safe',variables:{show_mode_buttons:true}});parent.append(card);
        let resolve; const hass={connected:true,language:'en',states:{[family+'.safe']:{state:family==='sensor'?'40':'heat',attributes:{friendly_name:'Safe native '+family,current_temperature:20,temperature:21,hvac_modes:['off','heat']}}},callWS:()=>new Promise(done=>resolve=done)};
        card.hass=hass; const loading = measure();
        resolve({card:{type:'custom:marao-card',template:spec.id,name:card._config.name,entity:card._config.entity,variables:card._config.variables},popups:[]});
        await new Promise(done=>requestAnimationFrame(done)); const ready=measure();
        card.hass={...hass,states:{[family+'.safe']:{state:'unavailable',attributes:{}}}}; const unavailable=measure();
        card._status('A detailed compilation failure '.repeat(30),true); const error=measure();
        details.push({family:'native-'+family,loading,ready,unavailable,error});parent.replaceChildren();
      }
      const popup = new MaraoPopupCard();
      popup.setConfig({hash:'#safe-layout',title:'Safe popup',cards:[{type:'custom:marao-card',template:'hc_sensor_card',entity:'sensor.safe',name:'Safe sensor'}]});
      popup.hass={states:{'sensor.safe':{state:'40'}}};document.body.append(popup);popup._openSheet();
      const child=popup._overlay.querySelector('marao-card'), opener=child.shadowRoot.querySelector('[data-card-details]');
      showCardDetails(child,'Long error details '.repeat(100),opener);
      if (!popup._open || !child.isConnected || !popup._overlay.inert) throw Error('Details must retain the parent popup');
      const sheet=child._detailsPopup._overlay.querySelector('.marao-popup-sheet');
      if (sheet.getBoundingClientRect().height>innerHeight-49) throw Error('Error details must scroll within the popup limit');
      child._detailsPopup._close(false);
      if (popup._overlay.inert) throw Error('Closing details must restore the parent popup');
      popup._close(false);popup.remove();
      return details;
    });
    report.push(...detailReport);
    console.log(JSON.stringify(report));
    assert.deepEqual(errors, []);
    const mismatches=report.filter(row => Object.values(row).slice(1).some(value=>Math.abs(value-row.ready)>1));
    assert.deepEqual(mismatches, [], 'Loading, missing attributes, state changes and long errors must preserve each card footprint');
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1});
