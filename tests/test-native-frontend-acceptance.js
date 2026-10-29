// Installed native acceptance. Only an exact, unchanged source may be saved.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {accessToken,setBrowserToken,connect,assertCurrentFrontend} = require('../ha-test/client');
const {prepareFrontend} = require('../ha-test/prepare-frontend');
const {scenarios,contextOptionsForScenario,configurePageEmulation,applyVisualPreferences,layoutIssues,inspectPopups} = require('./test-ha-dashboard-accessibility');
const {artifactDirectory} = require('./verification-browser');

async function editorChecks(page,prepared,connection,output,scenario) {
  await page.goto(prepared.config.url+prepared.editorURL,{waitUntil:'domcontentloaded'});
  const panel=page.locator('marao-dashboard-panel');
  await panel.waitFor({state:'visible'});
  await page.waitForFunction(p=>p._loaded&&p._visualReady&&!p._busy,await panel.elementHandle());
  const baseline=await panel.evaluate(p=>p._source());
  // Adapt the existing checks' response shape without calling the retired endpoint.
  const client={async call(message) {
    assert.equal(message.type,'marao_dashboard/config/get','Local editing must not write');
    const document=await connection.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});
    return {config:document.strategy.source_json};
  }};
  await applyVisualPreferences(page,scenario,'light');
  await require('./json-editor-checks').jsonEditorChecks(page,panel,{client,config:prepared.config,scenario,theme:'light',output});
  // Rendering checks assert the initial lazy landing-page state, independently of JSON's fixture pages.
  await page.reload({waitUntil:'domcontentloaded'});
  await panel.waitFor({state:'visible'});
  await page.waitForFunction(p=>p._loaded&&p._visualReady&&!p._busy,await panel.elementHandle());
  await require('./editor-rendering-checks').editorRenderingChecks(page,panel,{client,scenario,theme:'light',output});
  await require('./editor-drag-checks').editorDragChecks(page,panel,{client,config:prepared.config,scenario,theme:'light',output});
  await panel.evaluate(async(p,source)=>{await p._switchTab('json');p._monaco.setValue(source);await p._switchTab('visual');p._savedSource=p._source();p._dirty=false;p._updateHeader();},baseline);
  const input=panel.locator('#general-form input').first();
  await input.focus();
  assert.equal(await input.evaluate(element=>{
    const form=element.getRootNode();let host=form.host;while(host?.localName!=='marao-dashboard-panel')host=host?.getRootNode()?.host;
    const start=host._source(),model=host._model,original=host._hass;
    element.setSelectionRange(0,2);const scroll=window.scrollY;
    host.hass={...original,states:{...original.states}};
    const retained=element.getRootNode().activeElement===element&&element.selectionStart===0&&element.selectionEnd===2&&window.scrollY===scroll&&host._model===model&&host._source()===start;
    host.hass=original;return retained;
  }),true,'An ordinary entity update replaced input, focus, selection, scroll or source');
  const downloadPromise=page.waitForEvent('download');
  await panel.evaluate(p=>p._exportSource());
  const download=await downloadPromise;
  assert.equal(fs.readFileSync(await download.path(),'utf8'),prepared.dashboard.strategy.source_json);
  await panel.evaluate(p=>p._importSource());
  const dialog=panel.locator('ha-dialog');
  const imported=JSON.parse(baseline);imported.name='Native local import';
  await dialog.locator('[data-import-json]').fill(JSON.stringify(imported));
  await dialog.locator('[data-apply]').click();
  await dialog.locator('[data-review]').waitFor({state:'visible'});
  await dialog.locator('[data-ack]').check();
  page.once('dialog',prompt=>prompt.accept());
  await dialog.locator('[data-apply]').click();
  await dialog.waitFor({state:'detached'});
  assert.equal(await panel.evaluate(p=>p._model.name),'Native local import');
  page.once('dialog',prompt=>prompt.accept());
  await panel.evaluate(p=>p._discard());
  await page.waitForFunction(p=>!p._loading&&!p._busy&&!p._dirty,await panel.elementHandle());
  assert.deepEqual(JSON.parse(await panel.evaluate(p=>p._source())),JSON.parse(baseline));
  for(const tab of ['visual','json']) {
    await panel.evaluate(async(p,tab)=>{await p._switchTab(tab);await p._save();},tab);
    assert.equal(await panel.evaluate(p=>p._tab),tab);
    assert.equal(await panel.evaluate(p=>p._dirty||p._busy),false);
    assert.equal(new URL(page.url()).pathname,prepared.editorURL);
  }
  return {rendering:true,drag:true,monaco:true,importExport:true,saveDiscardError:true};
}

async function runtimeChecks(page,prepared) {
  await page.goto(prepared.config.url+'/marao-dashboard/card-test-all',{waitUntil:'domcontentloaded'});
  await page.locator('marao-navbar-card nav').first().waitFor({state:'visible'});
  await assertCurrentFrontend(page,prepared.version);
  await page.locator('marao-card .title').filter({hasText:/^Light · off$/}).first().waitFor({state:'visible'});
  await require('./test-ha-dashboard-e2e').checkStateCases(page,[]);
  const catalog=require('../custom_components/marao_dashboard/frontend/marao-catalog.json');
  const rendered=await page.locator('marao-card,marao-energy-period-card,marao-state-timeline-card').evaluateAll(cards=>cards.map(card=>card._config?.template||({'marao-energy-period-card':'md_energy_period_card','marao-state-timeline-card':'md_timeline_card'})[card.localName]));
  const families=new Set(rendered);
  for(const card of catalog.cards.filter(card=>card.id!=='ha_card'&&card.id!=='md_floor_plan_card')) {
    const compiledRole=card.id==='md_scene_collection_card'?'md_navigation_card':card.id;
    assert.ok(families.has(compiledRole),'Missing retained gallery role: '+card.id);
  }
  assert.ok(await page.locator('hui-markdown-card').count(),'Raw HA markdown is absent');
  assert.ok(await page.locator('hui-entities-card').count(),'Embedded HA entities card is absent');
  const labels=await page.locator('marao-card').evaluateAll(cards=>cards.filter(card=>card._config.variables?.custom_label).map(card=>({label:card._config.variables.custom_label,text:card.shadowRoot.textContent})));
  assert.ok(labels.some(card=>card.text.includes(card.label)),'Explicit labels are missing');
  return {families:[...families].sort(),stateCases:require('../ha-test/cases').concreteCases().length,rawCards:true,explicitLabels:true};
}

async function nativeCardChecks(page,prepared,output) {
  await page.goto(prepared.config.url+prepared.editorURL,{waitUntil:'domcontentloaded'});
  const panel=page.locator('marao-dashboard-panel');await panel.waitFor({state:'visible'});
  await page.waitForFunction(p=>p._loaded&&p._visualReady&&!p._busy,await panel.elementHandle());
  const baseline=await panel.evaluate(p=>p._source());
  await panel.evaluate(async p=>{
    const module=await p._loadHaCardModule();
    module.openEditor(p,'0:0',null,'page',{type:'button',entity:'light.marao_dashboard_test_light',name:'Native acceptance',show_name:true,show_icon:true});
  });
  const dialog=panel.locator('ha-dialog');
  await dialog.waitFor({state:'attached'});
  let title;
  try {title=(await page.waitForFunction(element=>{
    const find=root=>{for(const node of root.querySelectorAll('*')){if(node.localName==='input'&&node.value==='Native acceptance'&&node.getClientRects().length)return node;const nested=node.shadowRoot&&find(node.shadowRoot);if(nested)return nested;}};
    return find(element);
  },await dialog.elementHandle())).asElement();} catch(error) {
    fs.writeFileSync(path.join(output,'native-card-dialog.json'),JSON.stringify(await dialog.evaluate(element=>{
      const fields=[];const visit=root=>{for(const node of root.querySelectorAll('*')){if(node.matches('input,textarea,ha-textfield,ha-form,[data-loading]'))fields.push({tag:node.localName,label:node.getAttribute('aria-label')||node.label,type:node.type,text:node.matches('[data-loading]')?node.textContent:undefined});if(node.shadowRoot)visit(node.shadowRoot);}};visit(element);return fields;
    }),null,2),{mode:0o600});
    await page.screenshot({path:path.join(output,'native-card-failure.png'),scale:'css'});throw error;
  }
  await title.click();await title.fill('Edited native card');
  await dialog.getByRole('button',{name:'Create',exact:true}).click();
  await dialog.waitFor({state:'detached'});
  const source=JSON.parse(await panel.evaluate(p=>p._source()));
  const card=source.pages[0].sections[0].entities.pop();
  assert.equal(card.template,'ha_card');
  assert.deepEqual(require('yaml').parse(card.yaml),{type:'button',entity:'light.marao_dashboard_test_light',name:'Edited native card',show_name:true,show_icon:true});
  assert.deepEqual(source,JSON.parse(baseline),'Native editing changed unrelated source');
  page.once('dialog',prompt=>prompt.accept());await panel.evaluate(p=>p._discard());
  await page.waitForFunction(p=>!p._loading&&!p._busy&&!p._dirty,await panel.elementHandle());
  return {nativeVisualForm:true,unrelatedSourcePreserved:true,localOnly:true};
}

async function appearanceChecks(browser,prepared,output,observe) {
  const result=[];
  for(const [name,theme] of [['narrow-320','light'],['iphone-normal','dark'],['iphone-bold-text-200','light'],['iphone-page-zoom-200','light'],['iphone-landscape','light']]) {
    const scenario=scenarios.find(item=>item.name===name);
    const context=await browser.newContext(contextOptionsForScenario(scenario,theme));
    try {
      await context.addInitScript(setBrowserToken,{hassUrl:prepared.config.url,...accessToken(prepared.config)});
      const page=await context.newPage();observe(page);
      await configurePageEmulation(context,page,scenario);
      await page.goto(prepared.config.url+'/marao-dashboard/card-test-all',{waitUntil:'domcontentloaded'});
      await page.locator('marao-navbar-card nav').first().waitFor({state:'visible'});
      await assertCurrentFrontend(page,prepared.version);
      await page.evaluate(()=>window.MaraoDashboardRuntime.ready);
      await page.locator('marao-card .body.slider-header').first().waitFor({state:'visible'});
      await applyVisualPreferences(page,scenario,theme);
      await require('./test-ha-card-alignment').sliderHeaderChecks(page,output,scenario,theme);
      assert.deepEqual(await layoutIssues(page,['md_access_card','md_access_action_card','md_access_slide_action_card']),[]);
      assert.deepEqual(await inspectPopups(page,scenario,theme,output,name+'-'+theme,'failure',[],false,new Set(),'#marao-dashboard-test-case-lock_locked'),[]);
      if(name==='narrow-320'||theme==='dark') await page.screenshot({path:path.join(output,name+'-'+theme+'.png'),scale:'css'});
      result.push({scenario:name,theme,emulated:true});
      fs.writeFileSync(path.join(output,'appearance-progress.json'),JSON.stringify({identity:prepared.version,passed:result}),{mode:0o600});
      console.log('Native appearance passed: '+name+'/'+theme);
    } finally {await context.close();}
  }
  return result;
}

async function run(args=process.argv.slice(2)) {
  assert.ok(args.length&&args.every(arg=>['--editor','--runtime','--appearance','--native-card'].includes(arg)),'Select --editor, --native-card, --runtime and/or --appearance');
  const prepared=await prepareFrontend();
  assert.equal(new URL(prepared.config.url).hostname,'192.168.0.28');
  assert.equal(prepared.mode,'native');
  const output=artifactDirectory('native-frontend/'+Date.now());
  const connection=await connect(prepared.config),browser=await chromium.launch();
  const diagnostics=[],manualCameraDiagnostics=[],legacy=[],actions=[];
  const report={identity:prepared.version,scopes:args,output};
  const baseline=await connection.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});
  const observe=page=>{
    page.on('pageerror',error=>diagnostics.push(error.message));
    page.on('console',message=>{if(['warning','error'].includes(message.type()))(require('./camera-request-ledger').isManualCameraConsoleMessage(message)?manualCameraDiagnostics:diagnostics).push(message.text());});
    page.on('response',response=>{if(response.status()>=400)(require('./camera-request-ledger').isManualCameraTransport(response.url())?manualCameraDiagnostics:diagnostics).push('HTTP '+response.status()+' '+new URL(response.url()).pathname);});
    page.on('websocket',socket=>socket.on('framesent',({payload})=>{
      let messages;try{messages=JSON.parse(String(payload));}catch{return;}
      for(const message of Array.isArray(messages)?messages:[messages]) {
        if(message.type?.startsWith('marao_dashboard/'))legacy.push(message.type);
        if(message.type==='call_service')actions.push({domain:message.domain,service:message.service});
      }
    }));
  };
  const scenario=scenarios.find(row=>row.name==='iphone-normal');
  const context=await browser.newContext(contextOptionsForScenario(scenario));
  try {
    await context.addInitScript(setBrowserToken,{hassUrl:prepared.config.url,...accessToken(prepared.config)});
    const page=await context.newPage();observe(page);
    await configurePageEmulation(context,page,scenario);
    if(args.includes('--runtime'))report.runtime=await runtimeChecks(page,prepared);
    if(args.includes('--editor'))report.editor=await editorChecks(page,prepared,connection,output,scenario);
    if(args.includes('--native-card'))report.nativeCard=await nativeCardChecks(page,prepared,output);
    if(args.includes('--appearance'))report.appearance=await appearanceChecks(browser,prepared,output,observe);
    assert.deepEqual(diagnostics,[],'Installed native browser diagnostics');
    assert.deepEqual(legacy,[],'A retired management endpoint was requested');
    assert.deepEqual(actions,[],'Read-only acceptance dispatched an entity action');
    report.passed=true;
  } catch(error) {report.error=error.message;throw error;}
  finally {
    try {assert.deepEqual(await connection.call({type:'lovelace/config',url_path:'marao-dashboard',force:true}),baseline,'Native acceptance changed saved source');report.sourceUnchanged=true;}
    finally {await browser.close();connection.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({...report,diagnostics,manualCameraDiagnostics,legacy,actions},null,2),{mode:0o600});}
  }
  console.log('Installed native acceptance passed: '+args.join(', ')+'; evidence '+output);
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
module.exports={run};
