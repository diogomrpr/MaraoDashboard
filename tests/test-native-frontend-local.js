// Read-only feasibility probe: browser request overrides are not an installation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {readConfig,accessToken,setBrowserToken}=require('../ha-test/client');
const {buildFrontend}=require('../frontend_src/build-native.cjs');

(async()=>{
  const config=readConfig();assert.equal(new URL(config.url).hostname,'192.168.0.28');
  const built=await buildFrontend(), dist=path.join(built.destination,'dist');
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:320,height:850}}), page=await context.newPage();
  const errors=[], served=new Set();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await context.addInitScript(setBrowserToken,{hassUrl:config.url,...accessToken(config)});
  // Keep the legacy automatic bootstrap out of this isolated candidate document.
  await page.route('**/api/marao_dashboard/frontend.js*',route=>route.fulfill({contentType:'text/javascript',body:'export {};'}));
  await page.route('**/local/marao-native-probe/*',route=>{
    const name=new URL(route.request().url()).pathname.split('/').at(-1);
    if (!name || name.includes('..') || !fs.existsSync(path.join(dist,name))) return route.abort();
    served.add(name);
    const type=name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':name.endsWith('.ttf')?'font/ttf':'application/octet-stream';
    return route.fulfill({contentType:type,body:fs.readFileSync(path.join(dist,name))});
  });
  try {
    await page.goto(config.url+'/config/lovelace/dashboards',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('home-assistant')?.hass?.connected,{timeout:30000});
    const initial=await page.evaluate(async()=>{
      const originalURL=window.URL;
      await import('/local/marao-native-probe/MaraoFrontend.js');
      await window.MaraoDashboardRuntime.ready;
      if (window.URL !== originalURL) throw Error('The package changed the global URL constructor');
      const duplicate=await import('/local/marao-native-probe/'+window.MaraoFrontendPackage.identity+'--MaraoDashboard.js?duplicate=1');
      if (duplicate.runtimeReady !== window.MaraoDashboardRuntime.ready) throw Error('A duplicate entry mixed runtime graphs');
      const actual=document.querySelector('home-assistant').hass, calls=[];
      const allowed=new Set(['config/entity_registry/list','config/device_registry/list','config/area_registry/list','lovelace/config','lovelace/resources','lovelace/dashboards/list']);
      const hass={...actual,callWS:message=>{calls.push(message.type);if(!allowed.has(message.type))throw Error('Probe refused a write');return actual.callWS(message);},callService:()=>{throw Error('Probe refused an action');}};
      const current=await hass.callWS({type:'lovelace/config',url_path:'marao-dashboard'});
      await hass.callWS({type:'lovelace/resources'});
      const source={config_version:2,name:'Native probe',landing_page:'home',navigation:[],pages:[{name:'Home',path:'home',entities:[{template:'md_title_card',name:'Native probe'}]}],unknown:{keep:[]}};
      const strategy={type:'custom:marao-dashboard',envelope_version:1,compiler_contract:1,source_json:JSON.stringify(source,null,3)+'\n',dashboard_root:'marao-dashboard',editor_path:'marao-editor'};
      const Strategy=customElements.get('ll-strategy-dashboard-marao-dashboard');
      const output=await Strategy.generate(strategy,hass);
      const editor=await Strategy.getConfigElement();editor.hass=hass;editor.setConfig(strategy);
      const host=document.createElement('div');host.id='marao-native-probe';host.append(editor);document.body.append(host);
      window.nativeProbe={editor,calls,strategy,output,changed:[]};
      editor.addEventListener('config-changed',event=>window.nativeProbe.changed.push(event.detail.config));
      return {version:actual.config.version,admin:actual.user.is_admin,views:output.views.map(view=>view.path),currentMode:current.strategy?'strategy':'views'};
    });
    assert.equal(initial.admin,true);assert.deepEqual(initial.views,['home','marao-editor']);
    await page.waitForFunction(()=>window.nativeProbe.editor._panel?._loaded && !window.nativeProbe.editor._panel._busy,{timeout:30000});
    await page.evaluate(()=>window.nativeProbe.editor._panel._switchTab('json'));
    await page.waitForFunction(()=>Boolean(window.nativeProbe.editor._panel._monaco),{timeout:30000});
    const result=await page.evaluate(async()=>{
      const {editor,calls,strategy,changed}=window.nativeProbe,panel=editor._panel;
      const original=panel._monaco.getValue();
      await panel._save();
      return {calls,changed:changed.length,source:changed.at(-1)?.source_json,baseline:strategy.source_json,original,saved:!panel._dirty,overflow:document.querySelector('#marao-native-probe').scrollWidth>innerWidth};
    });
    assert.equal(result.changed,1);assert.equal(result.saved,true);assert.equal(result.source,result.baseline);assert.deepEqual(JSON.parse(result.source),JSON.parse(result.original));
    assert.ok(result.calls.every(type=>!type.startsWith('marao_dashboard/')));assert.equal(result.overflow,false);
    assert.ok([...served].some(name=>name.endsWith('--MaraoDashboardJsonWorker.js')));
    const beforeImport=await page.evaluate(()=>{
      const panel=window.nativeProbe.editor._panel, preview=panel.nativeSession.preview.bind(panel.nativeSession);
      window.nativeProbe.previews=0;panel.nativeSession.preview=text=>{window.nativeProbe.previews++;return preview(text);};
      return JSON.stringify(panel._model);
    });
    await page.evaluate(()=>window.nativeProbe.editor._panel._importSource());
    const dialog=page.locator('#marao-native-probe marao-dashboard-panel ha-dialog');
    const imported={config_version:2,name:'Imported',landing_page:'home',navigation:[],pages:[{name:'Home',path:'home',entities:[]}],unknown:{password:'fake-private-setting'}};
    await dialog.locator('[data-import-json]').fill(JSON.stringify(imported));await dialog.locator('[data-apply]').click();
    await dialog.locator('[data-review]').waitFor({state:'visible'});
    assert.match(await dialog.locator('[data-private]').innerText(),/\$\.unknown\.password/);
    assert.doesNotMatch(await dialog.locator('[data-private]').innerText(),/fake-private-setting/);
    assert.equal(await page.evaluate(()=>JSON.stringify(window.nativeProbe.editor._panel._model)),beforeImport);
    await dialog.locator('[data-ack]').check();imported.name='Reviewed import';await dialog.locator('[data-import-json]').fill(JSON.stringify(imported));
    assert.equal(await dialog.locator('[data-ack]').isChecked(),false);
    await dialog.locator('[data-apply]').click();await dialog.locator('[data-review]').waitFor({state:'visible'});await dialog.locator('[data-ack]').check();
    page.once('dialog',prompt=>prompt.dismiss());await dialog.locator('[data-apply]').click();
    assert.equal(await page.evaluate(()=>JSON.stringify(window.nativeProbe.editor._panel._model)),beforeImport);
    page.once('dialog',prompt=>prompt.accept());await dialog.locator('[data-apply]').click();
    await dialog.waitFor({state:'detached'});
    const afterImport=await page.evaluate(()=>({name:window.nativeProbe.editor._panel._model.name,dirty:window.nativeProbe.editor._panel._dirty,previews:window.nativeProbe.previews,changes:window.nativeProbe.changed.length}));
    assert.deepEqual(afterImport,{name:'Reviewed import',dirty:true,previews:2,changes:1});
    assert.deepEqual(errors,[]);
    console.log('Read-only native strategy/Visual/Monaco/config-changed probe passed on HA '+initial.version+'. No dashboard or server files were changed.');
  } finally {await context.close();await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
