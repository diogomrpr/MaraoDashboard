// Real DOM and native gestures with synthetic lights; no Home Assistant connection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const frontend = path.resolve(__dirname, '../custom_components/marao_dashboard/frontend');
const requests = [];
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  requests.push(pathname);
  if (pathname === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{font:16px Arial;--primary-font-family:Arial;--primary-text-color:#172d32;--secondary-text-color:#50676d;--ha-card-background:#e5ebe8;--secondary-background-color:#d0dbd7;--card-background-color:#e5ebe8;--font-size-primary:18px;--font-size-secondary:16px}body{margin:0;padding:8px;min-height:1800px}#cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:start}ha-card{display:block}</style><main id="cards"></main>'); return;
  }
  if (/^\/Marao[\w.-]+\.js$/.test(pathname) && fs.existsSync(path.join(frontend, path.basename(pathname)))) {
    response.setHeader('Content-Type', 'text/javascript'); response.end(fs.readFileSync(path.join(frontend, path.basename(pathname)))); return;
  }
  response.statusCode = 204; response.end();
});

async function loadingFixture(page) {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    await import('/MaraoCards.js');
    window.calls=[];
    const hass={connected:true,connection:{connected:true},language:'en',states:{'light.synthetic':{state:'off',attributes:{supported_color_modes:['hs'],hs_color:[210,65],brightness:128}}},callService:async(...args)=>{calls.push(args);}};
    window.card=document.createElement('marao-card');
    card.setConfig({type:'custom:marao-card',template:'hc_light_card',entity:'light.synthetic',name:'Safe color light'});
    card.hass=hass; document.querySelector('#cards').append(card);
  });
}

async function loadingChecks(browser) {
  const retryContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const page=await retryContext.newPage(); let attempts=0;
    await page.route('**/MaraoLightColor.js*',route=>++attempts===1
      ? route.fulfill({status:503,contentType:'text/javascript',body:'Temporarily unavailable'}) : route.continue());
    await loadingFixture(page); await page.locator('[data-light-color]').tap();
    await page.getByRole('alert').filter({hasText:'Color controls could not load'}).waitFor();
    assert.deepEqual(await page.evaluate(()=>calls),[],'Failed picker loading must not act on the light');
    await page.getByRole('button',{name:'Retry',exact:true}).tap();
    await page.locator('.light-color-wheel').waitFor({state:'visible'});
    assert.equal(attempts,2,'An explicit retry must reload the failed module once');
    assert.deepEqual(await page.evaluate(()=>calls),[],'Retrying a picker import must not act on the light');
    await page.getByRole('button',{name:'Close popup',exact:true}).tap();
  } finally { await retryContext.close(); }

  const delayedContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  try {
    const page=await delayedContext.newPage();
    await page.route('**/MaraoLightColor.js*',async route=>{await gate; await route.continue();});
    await loadingFixture(page); await page.locator('[data-light-color]').tap();
    await page.locator('.marao-light-color-content [aria-busy=true]').waitFor({state:'visible'});
    await page.getByRole('button',{name:'Close popup',exact:true}).tap();
    await page.locator('.marao-popup-overlay').waitFor({state:'detached'});
    release();
    await page.evaluate(async()=>{await import('/MaraoLightColor.js'); await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    assert.equal(await page.locator('.marao-popup-overlay').count(),0,'A late module must not reopen the closed popup');
    assert.equal(await page.locator('.light-color-picker').count(),0,'A late module must not mount detached controls');
    assert.deepEqual(await page.evaluate(()=>calls),[],'Closing while loading must not act on the light');
    assert.equal(await page.evaluate(()=>[...document.body.children].some(element=>element.inert)),false,'Closing while loading restores the background');
  } finally { release(); await delayedContext.close(); }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => {
      await import('/MaraoCards.js');
      window.calls = [];
      const entry = modes => ({ entity_id:'light.synthetic', state:'off', attributes:{ friendly_name:'Safe color light', supported_color_modes:modes, hs_color:[210,65], brightness:128, color_temp_kelvin:3200, min_color_temp_kelvin:2200, max_color_temp_kelvin:6500 } });
      window.hass = { connected:true, connection:{ connected:true }, language:'en', locale:{ language:'en' }, states:{ 'light.synthetic':entry(['hs','color_temp']), 'light.dimmer':entry(['brightness']) },
        callService:async (domain, service, data) => { calls.push({ domain, service, data }); if (window.failService) throw Error('Synthetic light rejected the update'); } };
      window.config = { type:'custom:marao-card', template:'hc_light_card', entity:'light.synthetic', name:'Safe color light' };
      window.card = document.createElement('marao-card'); card.id='color-card'; card.setConfig(config); card.hass=hass; document.querySelector('#cards').append(card);
      window.dimmer = document.createElement('marao-card'); dimmer.id='dimmer-card'; dimmer.setConfig({...config,entity:'light.dimmer'}); dimmer.hass=hass; document.querySelector('#cards').append(dimmer);
      window.resetCard = extra => { calls.length=0; card.setConfig({...config,...extra}); card.hass=hass; window.scrollTo(0,0); };
      window.loadCardHelpers = async () => ({ createCardElement(config) {
        if (config.type === 'markdown') { const element=document.createElement('div'); element.style.height='360px'; element.textContent=config.content; return element; }
        return document.createElement(config.type.replace('custom:',''));
      } });
    });
    const icon = page.locator('#color-card [data-light-color]');
    const body = page.locator('#color-card [data-card-action]');
    const wheel = page.locator('.marao-light-color-content .light-color-wheel');
    const close = async () => { await page.getByRole('button',{name:'Close popup',exact:true}).tap(); await wheel.waitFor({state:'detached'}); };
    const services = () => page.evaluate(() => calls);
    const clearCalls = () => page.evaluate(() => { calls.length=0; });
    const measure = () => page.evaluate(() => {
      const size = element => { const rect=element.getBoundingClientRect(); return [rect.width,rect.height]; };
      return { card:size(card), colorIcon:size(card.shadowRoot.querySelector('.icon')), dimmer:size(dimmer), dimmerIcon:size(dimmer.shadowRoot.querySelector('.icon')) };
    });
    const before = await measure();
    assert.deepEqual(before.card,before.dimmer,'Color capability must not enlarge the card');
    assert.deepEqual(before.colorIcon,before.dimmerIcon,'The picker keeps the existing icon circle');
    assert.ok(before.colorIcon.every(value=>value>=48),'Existing icon is a full touch target');
    assert.equal(await page.locator('#dimmer-card [data-light-color]').count(),0);
    assert.equal(requests.includes('/MaraoLightColor.js'),false,'Picker code must remain unloaded until opened');
    await icon.tap(); await wheel.waitFor({state:'visible'});
    assert.equal(requests.filter(url=>url==='/MaraoLightColor.js').length,1);
    assert.deepEqual(await services(),[],'Opening must not toggle or update the light');
    assert.equal(await page.locator('.light-color-status').textContent(),'Off');
    await close(); assert.deepEqual(await measure(),before);

    await body.tap({position:{x:24,y:28}});
    assert.deepEqual((await services()).map(({domain,service})=>[domain,service]),[['light','toggle']]);
    await clearCalls();
    const bodyPoint = async () => { const box=await body.boundingBox(); return {x:box.x+24,y:box.y+28}; };
    let point = await bodyPoint(); await page.mouse.move(point.x,point.y); await page.mouse.down();
    await wheel.waitFor({state:'visible',timeout:1800}); await page.mouse.up();
    assert.deepEqual(await services(),[],'Default hold opens without the trailing click toggling');
    await close();

    point=await bodyPoint(); await page.mouse.move(point.x,point.y); await page.mouse.down(); await page.mouse.move(point.x+20,point.y+20);
    await page.waitForTimeout(650); await page.mouse.up();
    assert.equal(await wheel.count(),0,'Movement cancels the 600 ms hold'); assert.deepEqual(await services(),[]);
    point=await bodyPoint(); await page.mouse.move(point.x,point.y); await page.mouse.down(); await page.mouse.wheel(0,120);
    await page.waitForTimeout(650); await page.mouse.up();
    assert.ok(await page.evaluate(()=>scrollY>0),'The fixture must actually scroll');
    assert.equal(await wheel.count(),0,'Scrolling cancels the hold'); assert.deepEqual(await services(),[]);
    await page.evaluate(()=>resetCard({show_icon:false}));
    assert.equal(await icon.count(),0,'Configured hidden icon remains hidden');
    await page.evaluate(()=>resetCard({hold_action:{action:'none'}}));
    point=await bodyPoint(); await page.mouse.move(point.x,point.y); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
    assert.equal(await wheel.count(),0,'Explicit hold:none suppresses the default picker gesture');
    await page.evaluate(()=>resetCard({tap_action:{action:'call-service',service:'light.turn_on',data:{brightness_pct:35}},hold_action:{action:'call-service',service:'light.turn_on',data:{brightness_pct:15}}}));
    await body.tap({position:{x:24,y:28}});
    assert.equal((await services())[0].data.brightness_pct,35,'Configured body tap is preserved');
    await clearCalls(); point=await bodyPoint(); await page.mouse.move(point.x,point.y); await page.mouse.down();
    await page.waitForFunction(()=>calls.length===1,{},{timeout:2000}); await page.mouse.up();
    assert.equal((await services())[0].data.brightness_pct,15,'Configured hold is preserved');
    assert.equal((await services()).length,1); assert.equal(await wheel.count(),0);
    await page.evaluate(()=>resetCard({}));
    await icon.tap(); await wheel.waitFor({state:'visible'});

    const session=await context.newCDPSession(page);
    const touch=async(type,x,y)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y}]});
    const exercise = async (selector, property) => {
      const control=page.locator(selector); await control.scrollIntoViewIfNeeded(); const box=await control.boundingBox();
      const y=box.y+box.height/2, x=box.x+box.width*.3, end=box.x+box.width*.7;
      await clearCalls(); await touch('touchStart',x,y); await touch('touchMove',end,y);
      assert.deepEqual(await services(),[],`${property} previews without services while dragging`);
      await touch('touchEnd'); await page.waitForFunction(()=>calls.length===1);
      const calls=await services(); assert.equal(calls.length,1); assert.equal(calls[0].domain,'light'); assert.equal(calls[0].service,'turn_on');
      assert.ok(Object.hasOwn(calls[0].data,property),`${property} payload is sent on release`);
      assert.equal(calls[0].data.entity_id,'light.synthetic');
      await clearCalls(); await touch('touchStart',x,y); await touch('touchMove',end,y); await touch('touchCancel');
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
      assert.deepEqual(await services(),[],`${property} cancellation sends nothing`);
    };
    await exercise('.light-color-wheel','hs_color');
    await exercise('.light-temperature input','color_temp_kelvin');
    await exercise('.light-brightness input','brightness_pct');
    const retainedWheel=await wheel.elementHandle();
    await page.evaluate(()=>{ card.hass={...hass,connected:false}; });
    assert.equal(await wheel.evaluate((element,retained)=>element===retained,retainedWheel),true,'Availability changes retain the picker');
    assert.equal(await wheel.isDisabled(),true);
    assert.equal(await page.locator('.light-temperature input').isDisabled(),true);
    assert.equal(await page.locator('.light-brightness input').isDisabled(),true);
    await page.evaluate(()=>{ card.hass=hass; window.failService=true; });
    await wheel.tap({position:{x:190,y:110}});
    await page.getByRole('alert').filter({hasText:'Synthetic light rejected the update'}).waitFor();
    await page.evaluate(()=>{ window.failService=false; }); await close();

    await page.evaluate(()=>{
      resetCard({});
      window.parentPopup=document.createElement('marao-popup-card');
      parentPopup.setConfig({hash:'#lights',title:'Safe group',cards:[{type:'markdown',content:'Safe spacer'},config,{type:'markdown',content:'Safe trailing spacer'}]});
      parentPopup.hass=hass; document.body.append(parentPopup);
      history.pushState({keep:'caller state'},'', '#lights'); dispatchEvent(new Event('location-changed'));
    });
    const childIcon=page.locator('.marao-popup-content marao-card [data-light-color]');
    await childIcon.waitFor({state:'visible'}); await childIcon.scrollIntoViewIfNeeded();
    await page.evaluate(()=>{
      window.retainedList=parentPopup._overlay.querySelector('.marao-popup-content');
      window.child=retainedList.querySelector('marao-card');
      window.invoker=child.shadowRoot.querySelector('[data-light-color]'); invoker.focus({preventScroll:true});
      window.savedScroll=parentPopup._overlay.querySelector('.marao-popup-sheet').scrollTop;
    });
    await childIcon.tap(); await wheel.waitFor({state:'visible'});
    assert.equal(await page.locator('.marao-popup-overlay').count(),1,'Group detail uses one modal sheet');
    assert.equal(await page.locator('.marao-popup-head h2').textContent(),'Safe color light');
    assert.deepEqual(await page.evaluate(()=>({retained:retainedList===parentPopup._overlay.querySelector('.marao-popup-content'),connected:child.isConnected,hidden:retainedList.hidden,inert:retainedList.inert})),{retained:true,connected:true,hidden:true,inert:true});
    await page.getByRole('button',{name:'Back',exact:true}).tap(); await wheel.waitFor({state:'detached'});
    assert.deepEqual(await page.evaluate(()=>({retained:retainedList===parentPopup._overlay.querySelector('.marao-popup-content'),connected:child.isConnected,hidden:retainedList.hidden,inert:retainedList.inert,title:parentPopup._overlay.querySelector('h2').textContent,scroll:Math.abs(parentPopup._overlay.querySelector('.marao-popup-sheet').scrollTop-savedScroll)<1,focus:child.shadowRoot.activeElement===invoker})),{retained:true,connected:true,hidden:false,inert:false,title:'Safe group',scroll:true,focus:true});
    await page.getByRole('button',{name:'Close popup',exact:true}).tap();

    await page.evaluate(()=>{
      parentPopup.setConfig({hash:'#active-lights',title:'Active lights',entity_group:{entity_type:'light',entities:['light.synthetic'],popup_filter:'active'},cards:[config]});
      window.activeHass={...hass,states:{...hass.states,'light.synthetic':{...hass.states['light.synthetic'],state:'on'}}};
      parentPopup.hass=activeHass;
      history.pushState({},'', '#active-lights'); dispatchEvent(new Event('location-changed'));
    });
    await childIcon.waitFor({state:'visible'});
    await page.evaluate(()=>{window.activeChild=parentPopup._overlay.querySelector('.marao-popup-content marao-card');});
    await childIcon.tap(); await wheel.waitFor({state:'visible'});
    const activeWheel=await wheel.elementHandle();
    for (const state of ['unavailable','off']) {
      await page.evaluate(state=>{ parentPopup.hass={...activeHass,states:{...activeHass.states,'light.synthetic':{...activeHass.states['light.synthetic'],state}}}; },state);
      assert.equal(await wheel.evaluate((element,retained)=>element===retained,activeWheel),true,`Active-only group retains the picker when its member is ${state}`);
      assert.equal(await page.evaluate(()=>activeChild.isConnected && parentPopup._overlay.querySelector('.marao-popup-content marao-card')===activeChild),true,`Active-only group retains the inspected owner when ${state}`);
      assert.equal(await wheel.isDisabled(),state==='unavailable');
      assert.equal(await page.locator('.light-temperature input').isDisabled(),state==='unavailable');
      assert.equal(await page.locator('.light-brightness input').isDisabled(),state==='unavailable');
      if (state==='off') assert.equal(await page.locator('.light-color-status').textContent(),'Off');
    }
    await page.getByRole('button',{name:'Back',exact:true}).tap(); await wheel.waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>parentPopup._open && parentPopup._overlay.isConnected),true,'Back retains the active-only group popup');
    assert.equal(await page.locator('.marao-popup-content marao-card').count(),0,'Back reapplies the active filter to the now-off member');
    assert.equal(await page.locator('.marao-popup-content [role=status]').textContent(),'No active entities');
    assert.equal(await page.locator('.marao-popup-head h2').textContent(),'Active lights');
    assert.deepEqual(await services(),[],'Group state reconciliation must not dispatch services');
    await page.getByRole('button',{name:'Close popup',exact:true}).tap();
    assert.deepEqual(errors,[]);
    await context.close();
    await loadingChecks(browser);
    console.log('Light color: lazy loading/retry/close cleanup, unchanged geometry, preserved actions, native gesture dispatch/cancellation and group Back restoration passed (390px, synthetic lights).');
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
