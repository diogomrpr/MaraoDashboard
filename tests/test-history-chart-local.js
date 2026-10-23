// Actual local Chart.js renderer with synthetic readings; no HA credentials or network services.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const {artifactDirectory,capture}=require('./verification-browser');
const frontend=path.resolve(__dirname,'../custom_components/marao_dashboard/frontend');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{--primary-text-color:#142e50;--secondary-text-color:#425571;--primary-color:#235b9c;--divider-color:#667085;--card-background-color:#eef4fc;--ha-card-background:#eef4fc;--text-primary-color:#fff}
*{box-sizing:border-box}body{margin:0;padding:8px;background:var(--ha-card-background);font-family:Montserrat,system-ui,sans-serif;color:var(--primary-text-color)}button{font:inherit;min-width:48px;min-height:48px}#sheet{max-width:600px;margin:auto;height:calc(80vh - 16px);overflow:auto;overscroll-behavior:contain;padding:8px}header{display:flex;gap:8px;align-items:center}h1{font-size:1.2em;flex:1;overflow-wrap:anywhere}
</style></head><body><main id="sheet"><header><h1>Safe measured power history</h1><button id="open">History</button></header><div id="detail"></div><p style="min-height:400px">Safe scrollable detail fixture</p></main><script>
window.end=Date.parse('2026-10-18T12:00:00Z');window.samples=Array.from({length:12000},(_,index)=>({time:end-86400000+index*7200,value:20+Math.sin(index/25)}));samples[1001].value=9876.54321;samples[11900].value=-123.45678;for(let i=7000;i<7020;i++)samples[i].value=null;
window.options={samples,end,hass:{locale:{language:'en'},config:{time_zone:'Europe/Lisbon'}},format:value=>value.toFixed(2),stateClass:'measurement'};
window.openChart=async()=>{window.module??=await import('/MaraoHistoryChart.js?v=local');window.renderer=module.createHistoryChart(document.querySelector('#detail'),options);};
document.querySelector('#open').onclick=()=>openChart();window.ready=true;
</script></body></html>`;
async function runtimeFixture(page,base){
 await page.goto(base);await page.waitForFunction(()=>ready);
 await page.evaluate(async()=>{
  await import('/MaraoCards.js?v=local');window.services=0;window.historyCalls=0;
  const now=Date.now(),stamp=milliseconds=>new Date(now-milliseconds).toISOString();
  const state={entity_id:'sensor.synthetic',state:'42.125',last_updated:stamp(60000),attributes:{friendly_name:'Safe measured power',unit_of_measurement:'W',state_class:'measurement'}};
  window.hass={connected:true,connection:{connected:true},locale:{language:'en'},config:{time_zone:'Europe/Lisbon'},states:{'sensor.synthetic':state,'switch.synthetic':{entity_id:'switch.synthetic',state:'on',attributes:{}}},
   callService(){services++;throw Error('History dispatched an entity service');},callApi:async()=>{historyCalls++;return[[{...state,state:'30',last_updated:stamp(4*3600000)},{...state,state:'unavailable',last_updated:stamp(3*3600000)},{...state,state:'50',last_updated:stamp(2*3600000)},state]];}};
  window.loadCardHelpers=async()=>({createCardElement(config){if(config.type==='markdown'){const spacer=document.createElement('div');spacer.style.minHeight='350px';spacer.textContent=config.content;return spacer;}return document.createElement(config.type.replace('custom:',''));}});
  const config={type:'custom:marao-card',template:'hc_toggle_graph_card',entity:'sensor.synthetic',name:'Safe power graph',variables:{toggle_entity:'switch.synthetic'},tap_action:{action:'toggle'}};
  window.pageGraph=document.createElement('marao-card');pageGraph.setConfig(config);pageGraph.hass=hass;document.querySelector('#detail').append(pageGraph);
  window.parentPopup=document.createElement('marao-popup-card');parentPopup.setConfig({hash:'#group',title:'Safe group',cards:[{type:'markdown',content:'Safe spacer before graph'},config,{type:'markdown',content:'Safe spacer after graph'}]});parentPopup.hass=hass;document.body.append(parentPopup);
  window.openParent=()=>{document.querySelector('#open').focus();history.pushState({keep:'unrelated caller state'},'', '#group');dispatchEvent(new Event('location-changed'));};
 });
 await page.waitForFunction(()=>pageGraph._graphHistory.has('sensor.synthetic'));
}
async function popupChecks(browser,base,output,report){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(['warning','error'].includes(message.type()))errors.push(message.text());});
 try{
  await runtimeFixture(page,base);await page.evaluate(()=>openParent());
  const childButton=page.locator('.marao-popup-content marao-card [data-history-open]');await childButton.waitFor({state:'visible'});await childButton.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>parentPopup._overlay.querySelector('marao-card')._graphHistory.has('sensor.synthetic'));
  await page.evaluate(()=>{window.retained=parentPopup._overlay.querySelector('.marao-popup-content');window.child=retained.querySelector('marao-card');window.childInvoker=child.shadowRoot.querySelector('[data-history-open]');childInvoker.focus({preventScroll:true});window.parentScroll=parentPopup._overlay.querySelector('.marao-popup-sheet').scrollTop;window.requestsBefore=historyCalls;});
  await childButton.tap();await page.locator('.marao-history-content canvas').waitFor({state:'visible'});
  assert.equal(await page.locator('.marao-popup-overlay').count(),1,'Drill-in must retain one modal layer');
  assert.deepEqual(await page.evaluate(()=>({connected:child.isConnected,retained:retained===parentPopup._overlay.querySelector('.marao-popup-content'),hidden:retained.hidden,inert:retained.inert,state:history.state.keep,hash:location.hash,services})),{connected:true,retained:true,hidden:true,inert:true,state:'unrelated caller state',hash:'#group',services:0});
  await page.getByRole('button',{name:'Back',exact:true}).tap();await page.locator('.marao-history-content').waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>({connected:child.isConnected,hidden:retained.hidden,inert:retained.inert,scroll:Math.abs(parentPopup._overlay.querySelector('.marao-popup-sheet').scrollTop-parentScroll)<=.75,focus:child.shadowRoot.activeElement===childInvoker,requests:historyCalls===requestsBefore})),{connected:true,hidden:false,inert:false,scroll:true,focus:true,requests:true});
  await page.goForward();await page.locator('.marao-history-content canvas').waitFor({state:'visible'});assert.equal(await page.locator('.marao-popup-overlay').count(),1);
  await page.goBack();await page.locator('.marao-history-content').waitFor({state:'detached'});
  await childButton.tap();await page.locator('.marao-history-content canvas').waitFor({state:'visible'});
  await capture(page,{path:path.join(output,'popup-drill-in.png'),fullPage:true});
  await page.getByRole('button',{name:'Close popup',exact:true}).tap();await page.locator('.marao-popup-overlay').waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>({state:history.state.keep,transient:!!history.state.maraoHistory,hash:location.hash,inert:[...document.body.children].some(element=>element.inert),focus:document.activeElement===document.querySelector('#open'),services})),{state:'unrelated caller state',transient:false,hash:'',inert:false,focus:true,services:0});
  const pageButton=page.locator('#detail marao-card [data-history-open]');await pageButton.tap();await page.locator('.marao-history-content canvas').waitFor({state:'visible'});
  const canvas=await page.locator('.marao-history-content canvas').elementHandle();
  await page.evaluate(()=>{pageGraph.hass={...hass,language:'pt',locale:{language:'pt'}};});
  assert.equal(await page.locator('.marao-history-content canvas').evaluate((current,previous)=>current===previous,canvas),true,'Live card updates retain a chart instance/canvas');
  await page.getByRole('button',{name:'Leitura anterior',exact:true}).tap();assert.equal(await page.evaluate(()=>services),0);
  await page.evaluate(()=>{history.replaceState({...history.state,keep:'unrelated caller state'},'', '/replacement');dispatchEvent(new Event('location-changed'));});await page.locator('.marao-popup-overlay').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>[...document.body.children].some(element=>element.inert)),false,'Route replacement restores the background');
  assert.deepEqual(errors,[]);report.push({profile:'actual-shared-popup',singleLayer:true,retainedParent:true,backForward:true,sourceCalls:await page.evaluate(()=>historyCalls),entityServices:0});
 }catch(error){await capture(page,{path:path.join(output,'popup-failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{await context.close();}
 const delayed=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),latePage=await delayed.newPage();let release;
 const gate=new Promise(resolve=>{release=resolve;});
 try{
  await latePage.route('**/MaraoHistoryChart.js*',async route=>{await gate;await route.continue();});
  await runtimeFixture(latePage,base);await latePage.locator('#detail marao-card [data-history-open]').tap();await latePage.locator('.marao-history-content').waitFor({state:'visible'});
  await latePage.evaluate(()=>pageGraph.remove());await latePage.locator('.marao-popup-overlay').waitFor({state:'detached'});release();await latePage.evaluate(async()=>{const cards=await import('/MaraoCards.js?v=local');await cards.loadHistoryChart();});
  assert.equal(await latePage.locator('canvas').count(),0,'A late module cannot recreate closed source detail');assert.equal(await latePage.evaluate(()=>[...document.body.children].some(element=>element.inert)),false);
  report.push({profile:'late-module-removal',reopened:false});
 }finally{release();await delayed.close();}
}
async function run(){
 const output=artifactDirectory('history-chart-local'),requests=[],server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://127.0.0.1').pathname;
  if(pathname==='/'){response.setHeader('Content-Type','text/html');response.end(html);return;}
  if(pathname==='/favicon.ico'){response.statusCode=204;response.end();return;}
  if(!['/MaraoHistoryLayout.js','/MaraoDropdown.js','/MaraoHistoryChart.js','/MaraoHistoryData.js','/MaraoCards.js','/MaraoFrontendRefresh.js','/MaraoFrontendUpdates.js','/MaraoNavigation.js','/MaraoSlider.js','/MaraoLightCapabilities.js'].includes(pathname)){response.statusCode=404;response.end();return;}
  response.setHeader('Content-Type','text/javascript');response.end(fs.readFileSync(path.join(frontend,path.basename(pathname))));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(),report=[];
 try{
  const profiles=[{name:'iphone',width:390,height:844},{name:'android',width:360,height:800},{name:'narrow',width:320,height:700},{name:'landscape',width:844,height:390},{name:'text-200',width:390,height:844,font:32}];
  for(const profile of profiles){
   const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:true,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage(),errors=[];
   const profileRequests=[];page.on('request',request=>{requests.push(request.url());profileRequests.push(request.url());});page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(['warning','error'].includes(message.type()))errors.push(message.text());});
   try{
    const base=`http://127.0.0.1:${server.address().port}/`;await page.goto(base);await page.waitForFunction(()=>ready);
    assert.equal(profileRequests.some(url=>url.includes('MaraoHistoryChart.js')),false,'Closed detail must not load Chart.js');
    await page.evaluate(font=>{document.documentElement.style.fontSize=`${font||16}px`;},profile.font);
    const started=Date.now();await page.locator('#open').tap();await page.locator('canvas').waitFor({state:'visible'});await page.waitForTimeout(100);
    const mountMs=Date.now()-started,canvas=await page.locator('canvas').elementHandle();
    const fullSummary=await page.locator('dd').allTextContents();assert.equal(fullSummary[1],'9876.54');
    const initial=await page.locator('.history-reading strong').textContent();
    await page.getByRole('button',{name:'Previous reading',exact:true}).tap();assert.notEqual(await page.locator('.history-reading strong').textContent(),initial,'Previous selects the original sample');
    const selected=await page.locator('.history-reading time').getAttribute('datetime');
    await page.evaluate(()=>renderer.update({format:value=>value.toFixed(3)}));
    assert.equal(await page.locator('.history-reading time').getAttribute('datetime'),selected,'Presentation retains selected timestamp');
    assert.equal(await page.locator('canvas').evaluate((current,previous)=>current===previous,canvas),true,'HA updates retain the mounted canvas');
    await page.locator('canvas').scrollIntoViewIfNeeded();const box=await page.locator('canvas').boundingBox();await page.touchscreen.tap(box.x+box.width*.55,box.y+box.height*.5);
    assert.ok(await page.locator('.history-reading time').getAttribute('datetime'),'A canvas tap selects a timestamp outside the canvas');
    const beforeRequests=profileRequests.length;await page.getByRole('button',{name:'1h',exact:true}).tap();assert.equal(profileRequests.length,beforeRequests,'Window changes must not fetch');
    assert.ok(Number((await page.locator('dd').allTextContents())[1])<100,'1h excludes the old narrow peak');
    await page.getByRole('button',{name:'24h',exact:true}).tap();await page.evaluate(()=>{document.querySelector('#sheet').scrollTop=0;});
    assert.ok(await page.locator('#sheet').evaluate(element=>element.scrollHeight>element.clientHeight+80),'The native scroll fixture must have usable vertical overflow');
    const visibleBox=await page.locator('canvas').boundingBox(),session=await context.newCDPSession(page);
    const x=visibleBox.x+visibleBox.width*.5,y=Math.min(profile.height-30,visibleBox.y+visibleBox.height*.6);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
    for(let step=1;step<=4;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-step*20}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(120);
    assert.ok(await page.locator('#sheet').evaluate(element=>element.scrollTop)>0,'A vertical gesture over the plot must scroll its sheet');await session.detach();
    const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,buttons:[...document.querySelectorAll('.marao-history-chart button')].filter(element=>!element.closest('[hidden]')&&!element.hidden).map(element=>{const bounds=element.getBoundingClientRect();return{width:bounds.width,height:bounds.height};}),pixels:(()=>{const canvas=document.querySelector('canvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;return painted;})()}));
    assert.equal(geometry.overflow,false);assert.ok(geometry.buttons.every(bounds=>bounds.width>=48&&bounds.height>=48));assert.ok(geometry.pixels>100,'The real Chart.js canvas draws axes and data');
    await page.evaluate(()=>renderer.update({stateClass:'total_increasing'}));assert.equal(await page.locator('dl>div').nth(2).isVisible(),false,'Counters cannot claim a sample average');
    for(const theme of profile.name==='iphone'?['light','dark']:[]){await page.evaluate(theme=>{document.body.style.setProperty('--primary-text-color',theme==='dark'?'#eff6ff':'#142e50');document.body.style.setProperty('--secondary-text-color',theme==='dark'?'#bac7d8':'#425571');document.body.style.setProperty('--ha-card-background',theme==='dark'?'#18304b':'#eef4fc');document.body.style.setProperty('--divider-color',theme==='dark'?'#a3b6cc':'#667085');renderer.update({});document.querySelector('#sheet').scrollTop=0;},theme);await capture(page,{path:path.join(output,`iphone-${theme}.png`),fullPage:true});}
    await page.evaluate(()=>{renderer.destroy();window.savedRenderer=renderer;for(let index=0;index<8;index++){renderer=module.createHistoryChart(document.querySelector('#detail'),options);renderer.destroy();}});
    assert.equal(await page.locator('canvas').count(),0,'Repeated open/close leaves no chart canvases');
    assert.deepEqual(errors,[]);report.push({profile:profile.name,mountMs,geometry,assetRequests:profileRequests.filter(url=>url.includes('MaraoHistoryChart.js')).length});
   }catch(error){await capture(page,{path:path.join(output,`${profile.name}-failure.png`),fullPage:true}).catch(()=>{});throw error;}finally{await context.close();}
  }
  await popupChecks(browser,`http://127.0.0.1:${server.address().port}/`,output,report);
  assert.ok(requests.every(url=>new URL(url).hostname==='127.0.0.1'),'Charts cannot load an external dependency');
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Real Chart.js renderer on loopback with synthetic Recorder samples; no native HA popup/transport or physical phone proof',assetBytes:fs.statSync(path.join(frontend,'MaraoHistoryChart.js')).size,report},null,2),{mode:0o600});
  console.log('Local Chart.js numeric selection, windows, native vertical scrolling, retained lifecycle and selected mobile layouts passed');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
