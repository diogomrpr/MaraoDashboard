const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const YAML = require('yaml');
const { chromium } = require('playwright');
const { readConfig, connect, accessToken, setBrowserToken, assertCurrentFrontend } = require('../ha-test/client');
const { prepare, ssh } = require('../ha-test/prepare');
const { nativeBackup } = require('./native-backup');
const { parseArgs, selectedRuns, contextOptionsForScenario, configurePageEmulation, applyVisualPreferences } = require('./test-ha-dashboard-accessibility');
const output = path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'navbar-overflow');
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function geometry(card, open = false) {
  assert.deepEqual(await card.evaluate((element, open) => {
    const issues = [], root = element.shadowRoot, bar = root.querySelector('.nav').getBoundingClientRect();
    const controls = [...root.querySelectorAll('.nav a,.nav button')].map(control => control.getBoundingClientRect());
    for (const control of root.querySelectorAll('a,button')) {
      const box=control.getBoundingClientRect(),icon=control.querySelector('ha-icon')?.getBoundingClientRect();
      if(icon&&(Math.abs(icon.left+icon.width/2-box.left-box.width/2)>1||Math.abs(icon.top+icon.height/2-box.top-box.height/2)>1))issues.push('Icon off center');
    }
    if (bar.left < -1 || bar.right > innerWidth + 1 || bar.bottom > innerHeight + 1) issues.push('Bar outside viewport');
    if (Math.abs(bar.height - 60) > 1) issues.push('Bar changed height');
    for (const box of controls) {
      if (box.width < 48 || box.height < 48) issues.push('Control below 48px');
      if (box.left < bar.left - 1 || box.right > bar.right + 1 || box.top < bar.top || box.bottom > bar.bottom) issues.push('Control outside row');
      if (Math.abs(box.top - controls[0].top) > 1) issues.push('Wrapped row');
    }
    if (open) {
      const menu = root.querySelector('.overflow'), box = menu.getBoundingClientRect(), toggle = root.querySelector('[data-overflow]').getBoundingClientRect();
      if (Math.abs(box.left + box.width / 2 - toggle.left - toggle.width / 2) > 1) issues.push('Menu not aligned to toggle');
      if (box.top < (element._safeTop || 0) - 1 || box.bottom > toggle.top - 7 || box.left < 0 || box.right > innerWidth) issues.push('Menu outside safe bounds');
      if (menu.scrollWidth > menu.clientWidth + 1) issues.push('Horizontal menu scroll');
      const last = menu.lastElementChild; menu.scrollTop = menu.scrollHeight;
      const final = last.getBoundingClientRect();
      if (final.width < 48 || final.height < 48 || final.bottom > box.bottom || final.top < box.top) issues.push('Last destination unreachable');
      if (getComputedStyle(menu).backgroundColor !== getComputedStyle(root.querySelector('.nav')).backgroundColor) issues.push('Menu surface differs');
    }
    return issues;
  }, open), []);
}

async function exercise(page, card, run, detailed) {
  const original = await card.evaluate(element => element._config);
  for (const count of [0, 1, 5, 6, original.routes.length]) {
    await card.evaluate((element, config) => element.setConfig(config), {...original, routes:original.routes.slice(0,count)});
    await settle(page);
    if (!count) { assert.equal(await card.isVisible(), false); continue; }
    await geometry(card);
    assert.equal(await card.locator('.nav a').count(), await card.evaluate(element => element._visibleCount));
  }
  const long = Array.from({length:40}, (_,i)=>({...original.routes[i % original.routes.length],label:'Destination '+(i+1),future:{keep:[]}}));
  const capacity=await card.evaluate(element=>element._slots);
  await card.evaluate((element, config)=>element.setConfig(config),{...original,routes:long.slice(0,capacity)});await settle(page);
  assert.equal(await card.locator('[data-overflow]').count(),0,'Exact-fit routes should not overflow');
  assert.equal(await card.locator('.nav a').count(),capacity);await geometry(card);
  await card.evaluate((element, config)=>element.setConfig(config),{...original,routes:long.slice(0,capacity+1)});await settle(page);
  assert.equal(await card.locator('.nav a').count(),capacity-1,'More must reserve the last full-size slot');
  assert.equal(await card.locator('[data-overflow]').count(),1);
  await card.evaluate((element, config) => element.setConfig(config), {...original,routes:long}); await settle(page);
  await card.locator('[data-overflow]').tap(); await geometry(card,true);
  assert.deepEqual(await card.locator('a[data-route]').evaluateAll(links=>links.map(link=>Number(link.dataset.route))), long.map((_,i)=>i));
  const menu = card.locator('.overflow');
  await menu.evaluate(element=>{window.__maraoMenu=element;window.__maraoMenuScroll=element.scrollTop;});
  await card.evaluate(element=>{element.hass={...element._hass,states:{...element._hass.states}};});
  assert.equal(await menu.evaluate(element=>element===window.__maraoMenu&&element.scrollTop===window.__maraoMenuScroll),true);
  const pageTop=await page.evaluate(()=>document.scrollingElement.scrollTop);
  await menu.hover(); await page.mouse.wheel(0,700); await settle(page);
  assert.equal(await page.evaluate(()=>document.scrollingElement.scrollTop),pageTop,'Menu scroll moved background');
  await page.screenshot({path:path.join(output,run+'-overflow.png'),scale:'css'});
  await page.keyboard.press('Escape');
  assert.equal(await card.locator('.overflow').count(),0);
  assert.equal(await card.locator('[data-overflow]').evaluate(element=>element.getRootNode().activeElement===element),true);
  if (detailed) {
    await card.locator('[data-overflow]').tap();
    await page.evaluate(()=>{
      const button=document.createElement('button');button.id='overflow-dismiss-probe';button.textContent='Safe dismissal probe';
      button.style.cssText='position:fixed;left:12px;top:80px;width:160px;height:48px;z-index:1000';
      window.__maraoProbeCalls=0;button.onclick=()=>window.__maraoProbeCalls++;document.body.append(button);
    });
    await page.locator('#overflow-dismiss-probe').tap();
    assert.equal(await page.evaluate(()=>window.__maraoProbeCalls),0,'Outside dismissal actuated covered control');
    await page.locator('#overflow-dismiss-probe').tap();
    assert.equal(await page.evaluate(()=>window.__maraoProbeCalls),1,'Dismissal guard leaked into next gesture');
    await page.locator('#overflow-dismiss-probe').evaluate(element=>element.remove());
    await card.locator('[data-overflow]').tap();
    const viewport=page.viewportSize();await page.setViewportSize({width:viewport.width+40,height:viewport.height});await settle(page);
    await page.waitForFunction(element=>!element._open,await card.elementHandle());
    await page.setViewportSize(viewport);await settle(page);
    await card.locator('[data-overflow]').tap();
    await card.evaluate(element=>element.setConfig({...element._config}));assert.equal(await card.locator('.overflow').count(),0);
    await card.locator('[data-overflow]').tap();await page.keyboard.press('Tab');
    // Explicitly moving focus outside closes without stealing the destination focus.
    await page.evaluate(()=>{const b=document.createElement('button');b.id='overflow-focus-probe';document.body.append(b);b.focus();});
    assert.equal(await card.locator('.overflow').count(),0);
    assert.equal(await page.locator('#overflow-focus-probe').evaluate(b=>document.activeElement===b),true);
    await page.locator('#overflow-focus-probe').evaluate(b=>b.remove());
    await card.locator('[data-overflow]').tap();
    await page.locator('marao-popup-card').filter({hasNot:page.locator('marao-popup-card')}).first().evaluate(popup=>popup._openSheet());
    await page.locator('.marao-popup-sheet').waitFor();assert.equal(await card.locator('.overflow').count(),0);
    await page.locator('.marao-popup-close').click();await page.locator('.marao-popup-sheet').waitFor({state:'detached'});
    await card.evaluate((element,original)=>element.setConfig({...original,routes:[...original.routes,{url:'#overview-maintenance',label:'Maintenance',icon:'mdi:wrench'}]}),original);
    await settle(page);await card.locator('[data-overflow]').tap();
    await card.locator('.overflow a[href="#overview-maintenance"]').tap();await page.locator('.marao-popup-sheet').waitFor();
    assert.equal(await card.locator('[data-overflow].active').count(),1,'Hash destination not active in overflow');
    await page.locator('.marao-popup-close').click();await page.locator('.marao-popup-sheet').waitFor({state:'detached'});
    await page.waitForFunction(element=>element.shadowRoot.activeElement===element.shadowRoot.querySelector('[data-overflow]'),await card.elementHandle());
  }
  await card.evaluate((element, config)=>element.setConfig(config),original);await settle(page);
  if (detailed) {
    await page.evaluate(()=>{window.__maraoNavigations=0;window.addEventListener('location-changed',()=>window.__maraoNavigations++);});
    await card.locator('[data-overflow]').tap();
    await card.locator('.overflow a[href="/marao-dashboard/appliances"]').tap();await page.waitForURL('**/marao-dashboard/appliances');
    await page.waitForLoadState('networkidle');
    assert.equal(await page.evaluate(()=>window.__maraoNavigations),1,'A route navigated more than once');
    await card.locator('[data-overflow].active').waitFor();
    assert.ok((await card.locator('[data-overflow]').getAttribute('aria-label')).includes(original.routes.find(route=>route.url==='/marao-dashboard/appliances').label));
    await card.locator('[data-overflow]').tap();
    assert.equal(await card.locator('.overflow a[aria-current=page]').getAttribute('href'),'/marao-dashboard/appliances');
    assert.equal(await card.locator('.nav a').first().getAttribute('href'),original.routes[0].url);
    await page.keyboard.press('Escape');
    await page.goBack();await page.waitForURL('**/marao-dashboard/overview');await page.waitForLoadState('networkidle');
    await card.locator('.nav a[aria-current=page]').waitFor();
    await page.goForward();await page.waitForURL('**/marao-dashboard/appliances');await page.waitForLoadState('networkidle');await card.locator('[data-overflow].active').waitFor();
    await page.screenshot({path:path.join(output,run+'-active.png'),scale:'css'});
    await page.goto(new URL('/marao-dashboard/overview',page.url()).href);await card.locator('.nav').waitFor();
  }
}


async function builderEditor(page, config) {
  await page.goto(config.url+'/marao-dashboard-editor');
  let panel=page.locator('marao-dashboard-panel');await panel.waitFor();
  await page.waitForFunction(element=>element._loaded,await panel.elementHandle());
  const before=await panel.evaluate(element=>element._model.navigation);
  const index=await panel.evaluate(element=>element._model.pages.findIndex(page=>page.path==='studio'));
  await panel.locator('[data-action="page-pin"][data-room="'+index+'"]').click();
  assert.equal(await panel.evaluate(element=>element._model.navigation.length),before.length+1);
  await panel.evaluate(async element=>element._switchTab('json'));
  await page.waitForFunction(element=>Boolean(element._monaco),await panel.elementHandle());
  const expected=await panel.evaluate(element=>JSON.parse(element._monaco.getValue()));
  assert.deepEqual(expected.navigation,[...before,'studio']);
  expected.navigation[0]={page:'overview',label:'Saved Home',future:{keep:[]}};
  await panel.evaluate((element,source)=>element._monaco.setValue(source),JSON.stringify(expected,null,2));
  await panel.evaluate(async element=>element._switchTab('visual'));
  assert.deepEqual(await panel.evaluate(element=>element._model.navigation),expected.navigation);
  await panel.locator('#save').click();
  await page.waitForFunction(element=>!element._busy&&!element._dirty,await panel.elementHandle());
  await page.reload();panel=page.locator('marao-dashboard-panel');await panel.waitFor();
  await page.waitForFunction(element=>element._loaded,await panel.elementHandle());
  assert.deepEqual(await panel.evaluate(element=>element._model.navigation),expected.navigation);
}

async function persistence(config,page) {
  const ws=await connect(config), operation=crypto.randomUUID();
  const dashboards=await ws.call({type:'lovelace/dashboards/list'});
  const paths=['configuration.yaml','dashboard/MaraoDashboard',...dashboards.filter(row=>row.mode==='storage').map(row=>'.storage/lovelace.'+row.id)];
  const remote=nativeBackup(config,operation,paths);const baseline=remote({mode:'backup'});
  try {
    const before=await ws.call({type:'marao_dashboard/config/get'}), draft=JSON.parse(before.config);
    assert.match(draft.slug,/^[a-z0-9][a-z0-9_-]*$/);
    // An exact backup retains old protected YAML; generate a clean fixture for supported history restoration.
    ssh(config,'mv '+quote(config.remoteConfigPath+'/dashboard/MaraoDashboard/'+draft.slug)+' '+quote(config.remoteConfigPath+'/.marao-native-backups/'+operation+'/original-output'));
    await ws.call({type:'marao_dashboard/config/generate',config:before.config});
    await builderEditor(page,config);
    assert.ok(draft.navigation.length>6);
    draft.navigation=[...draft.navigation].reverse().map(entry=>typeof entry==='string'?{page:entry,label:'Saved '+entry,future:{keep:[]}}:{...entry,future:{keep:[]}});
    const exact=JSON.stringify(draft);
    await ws.call({type:'marao_dashboard/config/generate',config:exact});
    assert.deepEqual(JSON.parse((await ws.call({type:'marao_dashboard/config/get'})).config).navigation,draft.navigation);
    await ws.call({type:'marao_dashboard/config/generate',config:exact});
    const generated=await ws.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});
    const bars=[];const walk=value=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object'){if(value.type==='custom:marao-navbar-card')bars.push(value);Object.values(value).forEach(walk);}};walk(generated);
    assert.ok(bars.length&&bars.every(bar=>bar.routes.length===draft.navigation.length));
    const saved=await ws.call({type:'marao_dashboard/config/generate',config:before.config});
    let version;
    for (const row of saved.history) {
      assert.match(row.version,/^\d{8}T\d{12}Z$/);
      const archived=JSON.parse(ssh(config,'cat '+quote(config.remoteConfigPath+'/dashboard/MaraoDashboard/.history/'+row.version+'/dashboard.json')).stdout);
      if (JSON.stringify(archived.navigation)===JSON.stringify(draft.navigation)) { version=row.version; break; }
    }
    assert.ok(version,'Missing archived long navigation source');
    await ws.call({type:'marao_dashboard/history/restore',version});
    assert.deepEqual(JSON.parse((await ws.call({type:'marao_dashboard/config/get'})).config).navigation,draft.navigation);
    const stable=remote({mode:'snapshot',paths}).files;
    await assert.rejects(ws.call({type:'marao_dashboard/config/generate',config:JSON.stringify({...draft,navigation:[{label:'Missing destination'}]})}));
    assert.deepEqual(remote({mode:'snapshot',paths}).files,stable,'Invalid route wrote dashboard state');
    for(const file of paths.filter(file=>file.startsWith('.storage/')))assert.deepEqual(stable[file],baseline[file],'Builder changed native dashboard');
  } finally {
    ws.close();remote({mode:'restore',expected:remote({mode:'snapshot',paths}).files});remote({mode:'finish'});
    const next=await connect(config);try{await next.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});}finally{next.close();}
  }
  console.log('Long navigation save, repeated generation, history restore, invalid preflight and native ownership passed; exact baseline restored.');
}

async function nativeEditor(page,calls,theme) {
  const navbar=page.locator('marao-native-navbar-card marao-navbar-card').first();
  await navbar.locator('[data-overflow]').tap();await geometry(navbar,true);await page.keyboard.press('Escape');
  await page.locator('.native-edit').click();
  await page.getByRole('button',{name:/Done|Concluído|Concluir/i,exact:true}).waitFor();
  await page.locator('hui-card-edit-mode').filter({has:page.locator('marao-native-navbar-card')}).first().click();
  const editor=page.locator('marao-native-card-editor');await editor.waitFor();
  const before=await editor.evaluate(element=>element._draft);
  assert.ok(before.routes.length>6);
  const preview=page.locator('hui-dialog-edit-card marao-navbar-card');
  assert.equal(await preview.evaluate(card=>card.preview),true);
  assert.equal(await preview.locator('[data-overflow]').isDisabled(),true);
  assert.equal(await editor.getByRole('button',{name:/^Add$|^Adicionar$/}).isEnabled(),true);
  await editor.getByRole('textbox',{name:'Label',exact:true}).first().fill('Saved Home '+theme);
  await page.waitForFunction(editor=>editor._draft.routes[0].label.startsWith('Saved Home'),await editor.elementHandle());
  await page.getByRole('button',{name:/Show code editor|Mostrar editor de código/i}).click();
  const yaml=page.locator('ha-yaml-editor').filter({visible:true});await yaml.waitFor();
  const config=YAML.parse(await yaml.evaluate(element=>element.yaml));
  assert.deepEqual(config.routes.slice(1),before.routes.slice(1));assert.deepEqual(config.routes[0].future,{keep:[]});
  await page.getByRole('button',{name:/Show visual editor|Mostrar editor visual/i}).click();await editor.waitFor();
  assert.deepEqual(await editor.evaluate(element=>element._draft.routes),config.routes);
  await page.getByRole('button',{name:/Save|Guardar|Salvar/i,exact:true}).click();
  await page.getByRole('button',{name:/Done|Concluído|Concluir/i,exact:true}).click();
  await navbar.waitFor();await settle(page);await geometry(navbar);
  assert.equal(calls.length,0,'Native navigation/editor dispatched an entity service');
}

async function main() {
  const config=readConfig();assert.equal(new URL(config.url).hostname,'192.168.0.28');await prepare(config);
  const options=parseArgs();options.scenario||='iphone-normal';fs.mkdirSync(output,{recursive:true});
  const ws=await connect(config),before=(await ws.call({type:'marao_dashboard/config/get'})).config;
  try {
    for(const {scenario,theme} of selectedRuns(options)){
      const browser=await chromium.launch(),context=await browser.newContext(contextOptionsForScenario(scenario,theme));
      await context.addInitScript(setBrowserToken,{hassUrl:config.url,...accessToken(config)});
      const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
      const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))errors.push(m.text());});
      page.on('requestfailed',r=>errors.push('Failed '+new URL(r.url()).pathname));page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status());});
      page.on('websocket',socket=>socket.on('framesent',({payload})=>{let m;try{m=JSON.parse(String(payload));}catch{return;}if(m.type==='call_service')calls.push(m.service);}));
      try {
        await configurePageEmulation(context,page,scenario);
        if(scenario.name==='iphone-normal'&&!process.argv.includes('--alignment'))await persistence(config,page);
        await page.goto(config.url+'/marao-dashboard/overview');
        const card=page.locator('marao-navbar-card');await card.locator('.nav').waitFor();await assertCurrentFrontend(page);await applyVisualPreferences(page,scenario,theme);
        await exercise(page,card,scenario.name+'-'+theme,['iphone-normal','android-normal'].includes(scenario.name)&&!process.argv.includes('--alignment'));
        await page.evaluate(routes=>{
          const card=document.createElement('marao-navbar-card');card.id='bounded-navbar-preview';card.preview=true;
          card.setConfig({routes});card.hass=document.querySelector('home-assistant').hass;
          card.style.cssText='position:fixed;left:12px;top:80px;width:100px;z-index:1003';document.body.append(card);
        },await card.evaluate(element=>element._config.routes));
        const preview=page.locator('#bounded-navbar-preview');
        await page.waitForFunction(element=>element._slots===1,await preview.elementHandle());
        assert.equal(await preview.locator('.nav a').count(),0);assert.equal(await preview.locator('[data-overflow]').isDisabled(),true);
        await preview.evaluate(element=>element._openOverflow());assert.equal(await preview.locator('.overflow').count(),0);
        await preview.evaluate(element=>{element.style.width='280px';});
        await page.waitForFunction(element=>element._slots>=2,await preview.elementHandle());
        await geometry(preview);await preview.evaluate(element=>element.remove());
        assert.deepEqual(calls,[]);assert.deepEqual(errors,[]);
        console.log(scenario.name+' '+theme+': single row, overflow alignment/scroll, source retention and dismissal passed.');
      }catch(error){await page.screenshot({path:path.join(output,scenario.name+'-'+theme+'-failure.png'),scale:'css'}).catch(()=>{});throw error;}
      finally{await context.close();await browser.close();}
    }
    assert.equal((await ws.call({type:'marao_dashboard/config/get'})).config,before,'Read-only navigation changed saved source');
  }finally{ws.close();}
}
if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={geometry,nativeEditor};
