const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {historyFixtures}=require('../ha-test/history-fixture');
const {capture,artifactDirectory}=require('./verification-browser');

// Saved configuration is read-only; synthetic dense history replaces only this browser's cache.
async function checkHistoryDetails(page,serviceCalls,{scenario,theme,geometryOnly=false,coldAssets=0}){
 const output=artifactDirectory('history-details'),report={profile:scenario.name,theme,geometryOnly,coldAssets,series:[],scope:'Disposable native HA host with loaded Recorder data; additional dense/gap series are isolated browser cache fixtures.'};
 const graph=page.locator('marao-card').filter({has:page.locator('.title').filter({hasText:/^Graph$/})}).first();
 const sheet=page.locator('.marao-popup-sheet'),content=sheet.locator('.marao-history-content'),canvas=content.locator('canvas');
 const startedCalls=serviceCalls.length;
 await graph.waitFor({state:'visible'});
 assert.equal(await graph.evaluate(card=>card._config.entity),'sensor.marao_dashboard_test_graph_history','Chart inspection must use the safe gallery graph');
 await page.waitForFunction(card=>card._graphHistory.has(card._graphEntity())&&!card._graphRequests.size,await graph.elementHandle());
 await page.evaluate(async()=>{
  const hass=document.querySelector('home-assistant').hass;
  window.__chartSavedSource=(await hass.callWS({type:'marao_dashboard/config/get'})).config;
  const NativeResizeObserver=window.ResizeObserver,active=new Set(),listeners=new Map(),add=HTMLCanvasElement.prototype.addEventListener,remove=HTMLCanvasElement.prototype.removeEventListener;
  window.ResizeObserver=class extends NativeResizeObserver{observe(target,...args){if(target.closest?.('.marao-history-content'))active.add(this);return super.observe(target,...args);}disconnect(){active.delete(this);return super.disconnect();}};
  HTMLCanvasElement.prototype.addEventListener=function(type,callback,options){if(this.closest('.marao-history-content')){let own=listeners.get(this);if(!own)listeners.set(this,own=new Set());own.add(callback);}return add.call(this,type,callback,options);};
  HTMLCanvasElement.prototype.removeEventListener=function(type,callback,options){listeners.get(this)?.delete(callback);return remove.call(this,type,callback,options);};
  window.__chartResources=()=>({observers:active.size,listeners:[...listeners.values()].reduce((count,set)=>count+set.size,0)});
  window.__restoreChartResources=()=>{window.ResizeObserver=NativeResizeObserver;HTMLCanvasElement.prototype.addEventListener=add;HTMLCanvasElement.prototype.removeEventListener=remove;delete window.__chartResources;delete window.__restoreChartResources;};
 });
 await graph.evaluate(card=>{card.__chartRawBackup=card._graphHistory.get(card._graphEntity());card.__chartConfigBackup=card._config;card.__chartErrorBackup=card._graphErrors.has(card._graphEntity());});
 const close=async()=>{await sheet.locator('.marao-popup-close').tap();await sheet.waitFor({state:'detached'});assert.deepEqual(await page.evaluate(()=>__chartResources()),{observers:0,listeners:0},'Closing chart must release canvas listeners and chart-owned resize observers');};
 const open=async()=>{
  const button=graph.locator('[data-history-open]');await graph.scrollIntoViewIfNeeded();
  await page.evaluate(()=>{window.__chartOpenStarted=performance.now();});await button.tap();await canvas.waitFor({state:'visible'});
  await sheet.evaluate(async node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  return page.evaluate(()=>performance.now()-window.__chartOpenStarted);
 };
 const geometry=async()=>{
  const issues=await content.evaluate(element=>{
   const issues=[],sheet=element.closest('.marao-popup-sheet'),bounds=sheet.getBoundingClientRect(),heading=sheet.querySelector('.marao-popup-head').getBoundingClientRect();
   if(bounds.left<-.75||bounds.right>innerWidth+.75||bounds.top<-.75||bounds.bottom>innerHeight+.75)issues.push('Sheet outside usable viewport');
   if(element.scrollWidth>element.clientWidth+1||sheet.scrollWidth>sheet.clientWidth+1)issues.push('History horizontal overflow');
   for(const button of element.querySelectorAll('button')){
    if(button.hidden||button.closest('[hidden]'))continue;
    const b=button.getBoundingClientRect();if(b.width<48||b.height<48)issues.push('History control below48px');
   }
   const close=sheet.querySelector('.marao-popup-close').getBoundingClientRect();
   if(close.width<48||close.height<48||close.top<bounds.top-.75||close.bottom>bounds.bottom+.75)issues.push('Close control clipped');
   if(heading.left<bounds.left-.75||heading.right>bounds.right+.75)issues.push('Heading clipped');
   const root=element.querySelector('.marao-history-chart');if(!getComputedStyle(root).fontFamily.includes('Montserrat'))issues.push('History lost Marao typography');
   return issues;
  });assert.deepEqual(issues,[]);
 };
 const inspect=async label=>{
  await sheet.evaluate(async node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
  await geometry();
  const details=await canvas.evaluate(element=>({source:Number(element.dataset.historySourcePoints),drawn:Number(element.dataset.historyRenderedPoints),width:element.getBoundingClientRect().width,backingWidth:element.width}));
  assert.ok(details.source>0&&details.drawn>0);assert.ok(details.drawn<=Math.max(32,Math.floor(details.width*2)),'Rendered points exceed the width-based drawing budget');
  report.series.push({label,...details});
 };
 try{
  report.recorderOpenMs=await open();await inspect('native-recorder');
  const baselineRequests=await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/api/history/')).length);
  const samples=await graph.evaluate(card=>card._historyOptions().samples.filter(sample=>Number.isFinite(sample.value)));
  assert.ok(samples.length>=2,'Safe Recorder fixture needs distinct readings for inspection');
  const selected=await content.locator('time').getAttribute('datetime');
  await content.getByRole('button',{name:/^(Previous reading|Leitura anterior)$/}).tap();
  const previous=await content.locator('time').getAttribute('datetime');assert.notEqual(previous,selected);
  assert.ok(samples.some(sample=>new Date(sample.time).toISOString()===previous),'Previous must select an original Recorder timestamp');
  await canvas.scrollIntoViewIfNeeded();const tapBox=await canvas.boundingBox();await page.touchscreen.tap(tapBox.x+tapBox.width*.55,tapBox.y+tapBox.height*.5);
  const tapped=await content.locator('time').getAttribute('datetime');assert.ok(samples.some(sample=>new Date(sample.time).toISOString()===tapped),'Plot tap must select an original timestamp');
  for(const window of ['1h','6h','24h']){await content.getByRole('button',{name:window,exact:true}).tap();assert.equal(await content.getByRole('button',{name:window,exact:true}).getAttribute('aria-pressed'),'true');}
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/api/history/')).length),baselineRequests,'Window/reading changes must not fetch Recorder history');
  const originalCanvas=await canvas.elementHandle(),beforeUpdate=await content.locator('time').getAttribute('datetime');
  report.updateMs=await graph.evaluate(card=>{const start=performance.now();card._render();return performance.now()-start;});
  assert.equal(await canvas.evaluate((element,before)=>element===before,originalCanvas),true,'A card update recreated the chart canvas');assert.equal(await content.locator('time').getAttribute('datetime'),beforeUpdate,'A card update reset selection');
  await content.locator('.history-reading').scrollIntoViewIfNeeded();await capture(page,{path:path.join(output,`${scenario.name}-${theme}-history.png`),scale:'css'});
  if(!geometryOnly){
   // A native vertical gesture starts on the canvas, leaving the background fixed.
   await sheet.evaluate(element=>{element.scrollTop=0;});const bounds=await canvas.boundingBox(),hostBefore=await page.evaluate(()=>document.scrollingElement.scrollTop),session=await page.context().newCDPSession(page);
   const y=Math.min(bounds.y+bounds.height*.7,(await page.evaluate(()=>innerHeight))-36),x=bounds.x+bounds.width/2;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
   for(let step=1;step<=5;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-step*18}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);await session.detach();
   assert.equal(await page.evaluate(()=>document.scrollingElement.scrollTop),hostBefore,'Chart scrolling moved the background');
   if(await sheet.evaluate(element=>element.scrollHeight>element.clientHeight+1))assert.ok(await sheet.evaluate(element=>element.scrollTop)>0,'Chart captured a native vertical scroll');
  }
  await close();
  if(!geometryOnly){
   const toggle=page.locator('marao-card').filter({has:page.locator('.title').filter({hasText:/^Toggle graph$/})}).first();
   await toggle.scrollIntoViewIfNeeded();await toggle.locator('[data-history-open]').tap();await canvas.waitFor({state:'visible'});await inspect('native-toggle-source');
   assert.equal(serviceCalls.length,startedCalls,'Numeric history dispatched the independent safe toggle');await close();
   const fixtures=historyFixtures(Date.now()-1000);
   for(const [label,records] of [['dense',fixtures.dense],['known-gap',fixtures.gap],['single',fixtures.single]]){
    await graph.evaluate((card,records)=>{card._graphHistory.set(card._graphEntity(),records);card._render();},records);
    const openMs=await open();await inspect(label);report.series.at(-1).openMs=openMs;
    const options=await graph.evaluate(card=>card._historyOptions().samples);
    if(label==='dense'){const max=Math.max(...options.filter(sample=>Number.isFinite(sample.value)).map(sample=>sample.value));assert.equal(max,9876.54321);assert.ok((await content.locator('dd').allTextContents()).includes(await graph.evaluate(card=>card._historyOptions().format(9876.54321))),'Dense peak was lost from the full-resolution summary');}
    if(label==='known-gap')assert.ok(options.some(sample=>sample.value===null),'Known unavailable intervals must remain gaps');
    if(label==='single'){assert.equal(records.length,1,'Single-reading fixture was expanded');report.series.at(-1).note='One Recorder observation plus the actual authoritative live sample.';}
    await close();
   }
   // Repeated opens use one module and release each instance before the next open.
   for(let index=0;index<3;index++){await open();assert.equal(await page.locator('.marao-popup-overlay').count(),1);await close();}
   await checkDrillIn(page,graph,sheet,serviceCalls,startedCalls);
  }
  const assets=await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/MaraoHistoryChart.js')).map(entry=>({bytes:entry.decodedBodySize,transfer:entry.transferSize,durationMs:entry.duration})));
  assert.ok(assets.length<=1,'Detail module loaded repeatedly');report.assets=assets;
  assert.equal(serviceCalls.length,startedCalls,'History inspection dispatched an entity service');
 }catch(error){fs.writeFileSync(path.join(output,`${scenario.name}-${theme}-failure-report.json`),JSON.stringify({...report,failure:error.message},null,2),{mode:0o600});await capture(page,{path:path.join(output,`${scenario.name}-${theme}-history-failure.png`),scale:'css'}).catch(()=>{});throw error;}
 finally{
  if(await page.locator('.marao-popup-close').count())await page.locator('.marao-popup-close').first().click();
  await graph.evaluate(card=>{card._historyPopup?._close(true);card._graphHistory.set(card._graphEntity(),card.__chartRawBackup);card._config=card.__chartConfigBackup;if(card.__chartErrorBackup)card._graphErrors.add(card._graphEntity());else card._graphErrors.delete(card._graphEntity());card._render();delete card.__chartRawBackup;delete card.__chartConfigBackup;delete card.__chartErrorBackup;});
  await page.evaluate(()=>{window.__chartTemporaryPopup?._close(true);window.__chartTemporaryPopup?.remove();window.__restoreChartResources?.();});
  assert.equal(await page.evaluate(async()=>{const hass=document.querySelector('home-assistant').hass;const unchanged=(await hass.callWS({type:'marao_dashboard/config/get'})).config===window.__chartSavedSource;delete window.__chartSavedSource;return unchanged;}),true,'Chart inspection changed the saved source');
 }
 fs.writeFileSync(path.join(output,`${scenario.name}-${theme}-report.json`),JSON.stringify(report,null,2),{mode:0o600});
 return report;
}

async function checkDrillIn(page,graph,sheet,serviceCalls,startedCalls){
 await graph.evaluate(card=>{
  const popup=document.createElement('marao-popup-card');popup.setConfig({title:'Safe chart drill-in',hash:'#marao-history-inspection',cards:[{type:'markdown',content:'Safe retained parent\n\n'+('Read-only history inspection.\n\n'.repeat(10))},{...card._config,name:'Safe retained graph'},{type:'custom:marao-card',template:'hc_climate_card',entity:'climate.marao_dashboard_test_climate',name:'Safe climate history',variables:{graph_entity:'sensor.marao_dashboard_test_temperature',show_graph:true}}, {type:'markdown',content:'Safe parent content after graph'}]});popup.hass=card.hass;
  const application=document.querySelector('home-assistant').shadowRoot;application.append(popup);window.__chartTemporaryPopup=popup;
  history.replaceState({...history.state,maraoInspection:'preserved unrelated state'},'',location.href);
  history.pushState({...history.state},'',location.pathname+location.search+'#marao-history-inspection');dispatchEvent(new Event('location-changed'));
 });
 const parentGraph=sheet.locator('marao-card').filter({has:page.locator('[data-history-open]')}).first();
 const button=parentGraph.locator('[data-history-open]');await button.waitFor({state:'visible'});
 await sheet.evaluate(async node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
 await page.waitForFunction(element=>[...element.querySelectorAll('marao-card')].filter(card=>card._graphEntity?.()).every(card=>card._graphHistory.has(card._graphEntity())&&!card._graphRequests.size),await sheet.elementHandle());
 await parentGraph.scrollIntoViewIfNeeded();
 await sheet.evaluate(element=>{const popup=window.__chartTemporaryPopup;window.__chartParent=element.querySelector('.marao-popup-content');window.__chartChild=window.__chartParent.querySelector('marao-card');window.__chartInvoker=__chartChild.shadowRoot.querySelector('[data-history-open]');window.__chartParentScroll=element.scrollTop;__chartInvoker.focus({preventScroll:true});});
 await button.tap();await sheet.locator('.marao-history-content canvas').waitFor({state:'visible'});
 assert.equal(await page.locator('.marao-popup-overlay').count(),1);
 assert.equal(await page.evaluate(()=>__chartParent.hidden&&__chartParent.inert&&__chartChild.isConnected),true,'Drill-in detached the retained parent');
 await page.evaluate(()=>{
  __chartInvoker.replaceWith(__chartInvoker.cloneNode(true));
  if(__chartInvoker.isConnected)throw Error('The focus regression must replace the original opener');
 });
 await sheet.getByRole('button',{name:/^(Back|Voltar)$/,exact:true}).tap();await sheet.locator('.marao-history-content').waitFor({state:'detached'});
 await page.waitForFunction(()=>__chartChild.shadowRoot.activeElement===__chartChild.shadowRoot.querySelector('[data-history-open]'));
 assert.deepEqual(await page.evaluate(()=>({connected:__chartChild.isConnected,inert:__chartParent.inert,hidden:__chartParent.hidden,focus:__chartChild.shadowRoot.activeElement===__chartChild.shadowRoot.querySelector('[data-history-open]'),scroll:Math.abs(window.__chartTemporaryPopup._overlay.querySelector('.marao-popup-sheet').scrollTop-__chartParentScroll)<=.75})),{connected:true,inert:false,hidden:false,focus:true,scroll:true});
 await page.goForward();await sheet.locator('.marao-history-content canvas').waitFor({state:'visible'});
 await page.goBack();await sheet.locator('.marao-history-content').waitFor({state:'detached'});
 const climate=sheet.locator('marao-card').filter({has:page.locator('.title').filter({hasText:/^Safe climate history$/})});
 await climate.scrollIntoViewIfNeeded();await climate.locator('[data-history-open]').tap();await sheet.locator('.marao-history-content canvas').waitFor({state:'visible'});
 assert.doesNotMatch(await sheet.locator('.history-reading strong').textContent(),/°|celsius|fahrenheit/i);
 assert.doesNotMatch(await sheet.locator('.history-reading strong').getAttribute('aria-label'),/°|celsius|fahrenheit/i);
 await sheet.locator('.marao-popup-close').tap();await sheet.waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>history.state.maraoInspection),'preserved unrelated state');
 assert.equal(serviceCalls.length,startedCalls,'Drill-in dispatched a service');
 await page.evaluate(()=>{const state={...history.state};delete state.maraoInspection;history.replaceState(state,'',location.href);window.__chartTemporaryPopup.remove();delete window.__chartTemporaryPopup;delete window.__chartParent;delete window.__chartChild;delete window.__chartInvoker;delete window.__chartParentScroll;});
}
module.exports={checkHistoryDetails};
