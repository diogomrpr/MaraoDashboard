const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const {prepare}=require('../ha-test/prepare');
const {accessToken,setBrowserToken,assertCurrentFrontend,connect}=require('../ha-test/client');
const {artifactDirectory}=require('./verification-browser');
async function run(){
 const prepared=await prepare(),{config,version}=prepared;
 assert.equal(new URL(config.url).hostname,'192.168.10.229');
 const ws=await connect(config),digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const saved=async()=>{
  const value=await ws.call({type:'marao_dashboard/config/get'});
  const dashboard=await ws.call({type:'lovelace/config',url_path:'marao-dashboard'});
  // The management payload also contains changing entity state; compare the saved source, history and generated document.
  return {source:digest(value.config),history:digest(value.history),generated:digest(dashboard)};
 };
 const before=await saved(),browser=await chromium.launch(),context=await browser.newContext({viewport:{width:360,height:800},hasTouch:true,isMobile:true});
 const page=await context.newPage(),errors=[],services=[],output=artifactDirectory('navbar-startup-ha');
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(['warning','error'].includes(message.type()))errors.push(message.text());});
 page.on('websocket',socket=>socket.on('framesent',frame=>{try{const value=JSON.parse(frame.payload);if(value.type==='call_service')services.push(value.type);}catch{}}));
 try{
   await context.addInitScript(setBrowserToken,{hassUrl:config.url,...accessToken(config)});
   await page.goto(config.url+'/marao-dashboard/rooms');
   const bar=page.locator('[data-marao-navigation-surface]'),nav=bar.locator('.nav');await nav.waitFor({state:'visible'});await page.waitForFunction(()=>window.MaraoDashboard?.popupScrollGuardInstalled);await assertCurrentFrontend(page);
   assert.equal(await bar.count(),1);assert.equal(await nav.locator('a[href]').count(),0);
   await nav.locator('[data-overflow]').tap();assert.ok(await bar.locator('.overflow a').count());await nav.locator('[data-overflow]').tap();
   const route=nav.locator('[data-route="0"]');await route.tap();await page.waitForURL('**/marao-dashboard/overview');await nav.waitFor({state:'visible'});assert.equal(await bar.count(),1);
   const point=await nav.locator('[data-route="0"]').boundingBox(),cdp=await context.newCDPSession(page);
   const navigation=page.waitForEvent('framenavigated',frame=>frame===page.mainFrame());
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:point.x+point.width/2,y:point.y+point.height/2}]});
   await navigation;await nav.waitFor({state:'visible'});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   await page.waitForFunction(()=>window.MaraoDashboard?.popupScrollGuardInstalled);await assertCurrentFrontend(page);assert.equal(new URL(page.url()).pathname,'/marao-dashboard/overview');assert.equal(await bar.count(),1);
   assert.deepEqual(await saved(),before,'Explicit refresh changed saved source, generated configuration or history');assert.deepEqual(services,[]);assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(output,'navbar-android.png'),scale:'css'});
   const result={version:version||null,configPreserved:true,oneNavbar:true,overflow:true,routeTransition:true,touchRefresh:true,services:services.length,errors,physicalPhone:false};
   fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({output,...result}));
 }finally{await context.close();await browser.close();ws.close();}
}
if(require.main===module)run().catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={run};
