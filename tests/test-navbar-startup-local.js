const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const { artifactDirectory } = require('./verification-browser');
const frontend = path.resolve(__dirname, '../custom_components/marao_dashboard/frontend');
const routes = Array.from({length:8}, (_, i) => ({url:'/marao-dashboard/' + (i === 0 ? 'overview' : i === 1 ? 'rooms' : 'page-' + i),label:'Route ' + i,icon:'mdi:home'}));
const navbar = {type:'custom:marao-navbar-card',routes,future:{keep:[]}};
const views = routes.map(route => ({path:route.url.split('/').at(-1),cards:[navbar]}));
views.push({path:'empty', cards:[]});
function html() {
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><style>body{margin:0;--ha-card-background:#eaf0f8;--primary-text-color:#142e50;--primary-color:#28629e;--text-primary-color:white}</style><home-assistant></home-assistant><script>
  customElements.define('home-assistant',class extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'});}});
  customElements.define('ha-icon',class extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;width:26px;height:26px}svg{width:26px;height:26px}</style><svg viewBox="0 0 24 24"><path d="M0 0H24V24H0Z" fill="currentColor"/></svg>';}});
  window.definitions={};const define=customElements.define.bind(customElements);customElements.define=(name,...args)=>{definitions[name]=performance.now();return define(name,...args);};
  window.services=0;window.compiles=0;window.hass={language:'pt',states:{},connected:false,connection:{connected:false},user:{is_admin:false},callService(){services++;},callWS(){compiles++;return new Promise(()=>{});}};
  const app=document.querySelector('home-assistant');app.hass=hass;window.root=document.createElement('hui-root');root.attachShadow({mode:'open'});app.shadowRoot.append(root);
  window.header=document.createElement('header');header.className='header';header.style.display='block';root.shadowRoot.append(header);
  root.hass=hass;root.lovelace={config:${JSON.stringify({views})},editMode:false};
  window.view=document.createElement('div');view.id='view';view.style='min-height:1200px;position:relative;z-index:1';root.shadowRoot.append(view);
  </script><script type="module">
  await import('/marao_dashboard_static/MaraoDashboard.js?v=bootstrap-test');
  window.host=document.createElement('marao-navbar-card');host.setConfig(${JSON.stringify(navbar)});host.hass=hass;view.append(host);window.ready=true;
  </script>`;
}
async function hold(page, locator, milliseconds=3100, padding=false) {
  const box=await locator.boundingBox();assert.ok(box,'Hold target must be visible');
  const x=box.x+(padding?4:box.width/2),y=box.y+box.height/2;
  if(page.context().browser().browserType().name()==='chromium'){
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
    await page.waitForTimeout(milliseconds);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(milliseconds);await page.mouse.up();}
}
async function run(){
 const output=artifactDirectory('navbar-startup-local'),results=[];
 const server=http.createServer((req,res)=>{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/marao_dashboard_static/')){const file=url.pathname.split('/').at(-1);if(!fs.existsSync(path.join(frontend,file))){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(frontend,file)));return;}
   res.setHeader('Content-Type','text/html');res.end(html());
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{for(const engine of [chromium,webkit]){
   const browser=await engine.launch();const context=await browser.newContext({viewport:{width:360,height:800},hasTouch:true,isMobile:true});const page=await context.newPage();
   const errors=[],held=[];let refreshes=0;
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/MaraoRuntime.js*',route=>held.push(route));
   await page.route('**/MaraoFrontendRefresh.js',route=>{if(route.request().method()==='HEAD'){refreshes++;return route.fulfill({status:503,body:'deliberately offline'});}return route.continue();});
   try{
     await page.goto(`http://127.0.0.1:${server.address().port}/marao-dashboard/overview`);await page.waitForFunction(()=>window.ready);
     const bar=page.locator('[data-marao-navigation-surface]'),nav=bar.locator('.nav');await nav.waitFor({state:'visible'});
     assert.equal(await bar.count(),1);assert.equal(await page.evaluate(()=>compiles),0);assert.equal(held.length,1);
     const timing=await page.evaluate(()=>({registered:definitions['marao-navbar-card'],optional:performance.getEntriesByType('resource').find(r=>r.name.includes('MaraoRuntime.js'))?.startTime}));
     assert.ok(timing.registered,'Recovery registers while runtime remains blocked');
     assert.equal(await nav.locator('a[href],[draggable=true],[title]').count(),0);
     const refresh=page.getByRole('button',{name:'Limpar cache e atualizar',exact:true});
     await refresh.waitFor({state:'visible'});
     const refreshBox=await refresh.boundingBox();assert.ok(refreshBox.width>=48&&refreshBox.height>=48);
     assert.equal(await refresh.locator('svg').count(),1,'Recovery icon needs no optional icon renderer');
     await refresh.tap();
     await page.waitForFunction(()=>document.querySelector('home-assistant').shadowRoot.querySelector('hui-root').shadowRoot.querySelector('[data-marao-navigation-surface]').shadowRoot.querySelector('.refresh-feedback').textContent.includes('Sem ligação'));
     assert.equal(refreshes,1,'A single tap runs the existing refresh preflight once with content blocked');
     await refresh.waitFor({state:'visible'});assert.equal(new URL(page.url()).pathname,'/marao-dashboard/overview');

     const dimensions=await nav.locator('button').evaluateAll(nodes=>nodes.map(node=>({w:node.getBoundingClientRect().width,h:node.getBoundingClientRect().height})));
     assert.ok(dimensions.every(rect=>rect.w>=48&&rect.h>=48));
     const targets=engine===chromium?[nav.locator('[data-route="0"] svg'),nav.locator('[data-route="1"] svg'),nav.locator('[data-overflow]'),nav]:[nav.locator('[data-route="0"] svg')];
     for(const target of targets){const before=refreshes;await hold(page,target,3100,target===nav);await page.waitForFunction(()=>document.querySelector('home-assistant').shadowRoot.querySelector('hui-root').shadowRoot.querySelector('[data-marao-navigation-surface]').shadowRoot.querySelector('.refresh-feedback').textContent.includes('Sem ligação'));assert.equal(refreshes,before+1);assert.equal(new URL(page.url()).pathname,'/marao-dashboard/overview');assert.equal(await bar.locator('.overflow').count(),0);}
     const prevented=await nav.locator('[data-route="0"] svg').evaluate(node=>{const e=new MouseEvent('contextmenu',{bubbles:true,composed:true,cancelable:true});node.dispatchEvent(e);return e.defaultPrevented;});assert.equal(prevented,true);
     await nav.locator('[data-overflow]').tap();assert.ok(await bar.locator('.overflow a').count());await nav.locator('[data-overflow]').tap();
     await nav.locator('[data-route="1"]').press('Enter');assert.equal(new URL(page.url()).pathname,'/marao-dashboard/rooms');
     assert.equal(await refresh.isVisible(),false,'Top-right cache refresh belongs only on the main page');
     await page.evaluate(()=>{window.originalSurface=root.shadowRoot.querySelector('[data-marao-navigation-surface]');view.remove();window.view=document.createElement('div');view.id='view';view.style='min-height:1200px;position:relative;z-index:1';root.shadowRoot.prepend(view);});
     assert.equal(await nav.isVisible(),true);assert.equal(await page.evaluate(()=>originalSurface===root.shadowRoot.querySelector('[data-marao-navigation-surface]')),true);
     await nav.locator('[data-route="0"]').tap();assert.equal(new URL(page.url()).pathname,'/marao-dashboard/overview');
     await refresh.waitFor({state:'visible'});
     await page.evaluate(()=>{root.lovelace.editMode=true;host.hass=hass;});await page.waitForFunction(()=>root.shadowRoot.querySelector('[data-marao-navigation-surface]').hidden && header.style.display==='block');await page.evaluate(()=>{root.lovelace.editMode=false;host.hass=hass;});await nav.waitFor({state:'visible'});await page.waitForFunction(()=>header.style.display==='none');
     await held.shift().fulfill({status:503,body:'deliberate optional module failure'});await page.getByRole('alert').waitFor();assert.ok(await nav.isVisible());
     assert.equal(await page.evaluate(()=>services),0);assert.deepEqual(errors,[]);
     await page.evaluate(()=>{history.pushState({},'','/marao-dashboard/empty');dispatchEvent(new Event('location-changed'));});await bar.waitFor({state:'detached'});
     assert.equal(await page.evaluate(()=>root.shadowRoot.querySelector('#view').style.getPropertyValue('padding-bottom')),'');
     results.push({engine:engine.name(),holds:targets.length,criticalReadyWithBlockedRuntime:true,tapRefresh:true,generatedNavigation:true,viewContinuity:true,emptyCleanup:true,errors});
   }finally{await context.close();await browser.close();}
 }}finally{await new Promise(resolve=>server.close(resolve));}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({results},null,2));console.log(JSON.stringify({output,results}));
}
if(require.main===module)run().catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={run};
