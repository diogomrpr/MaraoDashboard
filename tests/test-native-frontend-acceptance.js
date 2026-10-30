// Installed native runtime acceptance. Historical builder modes are explicitly retired.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {accessToken,setBrowserToken,connect,assertCurrentFrontend} = require('../ha-test/client');
const {prepareFrontend} = require('../ha-test/prepare-frontend');
const {scenarios,contextOptionsForScenario,configurePageEmulation,applyVisualPreferences,layoutIssues,inspectPopups} = require('./test-ha-dashboard-accessibility');
const {artifactDirectory} = require('./verification-browser');

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
  if(args.some(arg=>['--editor','--native-card'].includes(arg))) throw new Error('The --editor and --native-card modes targeted the retired Marao builder and are no longer supported. Use the ordinary Home Assistant dashboard editor; native card configuration is covered by targeted unit tests and manual visual checks. No installation or browser check was started.');
  assert.ok(args.length&&args.every(arg=>['--runtime','--appearance'].includes(arg)),'Select --runtime and/or --appearance');
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
