// Reproduce the mixed graph that a cached HA page can request after an update.
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

// Real released module graphs in a loopback HA host. This is cached-client
// replay, not installation of historical Home Assistant or Marao packages.
async function retirement() {
  const root=path.resolve(__dirname,'..'), assets=new Map(), report=[];
  const native=path.join(root,'ha-test/.cache/native-frontend/dist');
  assert.ok(fs.existsSync(path.join(native,'MaraoFrontend.js')),'Prepare the current native frontend first');
  let removed=false, tag='v0.14.2';
  const historical=(version,file)=>{
    const key=version+':'+file;
    if(!assets.has(key)) assets.set(key,execFileSync('git',['show',version+':custom_components/marao_dashboard/frontend/'+file],{cwd:root,maxBuffer:12*1024*1024,stdio:['ignore','pipe','ignore']}));
    return assets.get(key);
  };
  const server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://localhost');
    response.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.json')?'application/json':'text/html');
    if(url.pathname==='/service_worker.js') return response.end(`self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(caches.match('/cached-document').then(r=>r||fetch(e.request)));});`);
    if(url.pathname.startsWith('/marao_dashboard_static/')||url.pathname.startsWith('/api/marao_dashboard/')) {
      if(removed){response.writeHead(404);return response.end('Legacy Marao frontend removed');}
      if(url.pathname==='/api/marao_dashboard/frontend.js') return response.end(`await import('/api/marao_dashboard/frontend/released/MaraoDashboard.js?v=released');`);
      const prefix=url.pathname.startsWith('/marao_dashboard_static/')?'/marao_dashboard_static/':'/api/marao_dashboard/frontend/released/';
      const file=url.pathname.slice(prefix.length);
      if(!/^[a-zA-Z0-9_./-]+$/.test(file)||file.split('/').includes('..')){response.writeHead(404);return response.end();}
      try{return response.end(historical(tag,file));}catch{response.writeHead(404);return response.end();}
    }
    if(url.pathname.startsWith('/native/')) {
      const file=url.pathname.slice('/native/'.length);
      if(file!==path.basename(file)||!fs.existsSync(path.join(native,file))){response.writeHead(404);return response.end();}
      return response.end(fs.readFileSync(path.join(native,file)));
    }
    const entry=removed?'/native/MaraoFrontend.js':tag==='v0.14.2'?'/marao_dashboard_static/MaraoDashboard.js?v=released':'/api/marao_dashboard/frontend.js?v=released';
    response.end(`<!doctype html><meta name="viewport" content="width=device-width"><link rel="icon" href="data:,"><script>customElements.define('home-assistant',class extends HTMLElement{});</script><script type="module">const entry=await import(${JSON.stringify(entry)});await entry.runtimeReady;window.ready=true;</script>`);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port, browser=await chromium.launch();
  try {
    for(tag of ['v0.14.2','v0.14.3','v0.21.1']) {
      removed=false;
      const context=await browser.newContext(),page=await context.newPage(),observations=[];
      page.on('pageerror',error=>observations.push(error.message));
      page.on('response',response=>{if(response.status()>=400)observations.push('HTTP '+response.status()+' '+new URL(response.url()).pathname);});
      try {
        await page.goto(base+'/marao-dashboard/studio?external_auth=1#detail');
        await page.waitForFunction(()=>window.ready);
        const prefix=tag==='v0.14.2'?'/marao_dashboard_static/':'/api/marao_dashboard/frontend/released/';
        const draft=JSON.stringify({config_version:2,name:'Unsaved legacy work',landing_page:'home',navigation:[],pages:[{path:'home',name:'Home',entities:[]}],unknown:{keep:[]}},null,3)+'\n';
        await page.evaluate(async({prefix,draft})=>{
          await import(prefix+'MaraoDashboardPanel.js?v=released');
          window.oldPanel=document.createElement('marao-dashboard-panel');
          oldPanel._model=JSON.parse(draft);oldPanel._dirty=true;
          window.exportedDraft=draft; // The documented manual JSON copy before removal.
          localStorage.setItem('retained-preference','yes');
          await navigator.serviceWorker.register('/service_worker.js');await navigator.serviceWorker.ready;
          const html=await fetch(location.href).then(r=>r.text());await(await caches.open('legacy-page')).put('/cached-document',new Response(html,{headers:{'Content-Type':'text/html'}}));
        },{prefix,draft});
        removed=true;
        const deferred=await page.evaluate(async prefix=>{
          const failures=[];
          try{await import(prefix+'MaraoDashboardJsonEditor.js?v=deferred');}catch(error){failures.push(error.message);}
          const worker=new Worker(prefix+'MaraoDashboardJsonWorker.js?v=deferred',{type:'module'});
          failures.push(await new Promise(resolve=>{worker.onerror=()=>resolve('worker failed after retirement');}));worker.terminate();
          return {failures,dirty:oldPanel._dirty,draft:exportedDraft};
        },prefix);
        assert.equal(deferred.dirty,true);assert.equal(deferred.draft,draft);assert.equal(deferred.failures.length,2);
        await page.reload();
        await page.waitForFunction(()=>navigator.serviceWorker.controller);
        assert.ok(observations.some(value=>value.includes('404')),'Retired bootstrap failures must remain visible');
        const retiredDiagnostics=[...observations];
        // The documented full refresh/reopen removes the cached document and
        // starts a new JS registry; it does not upgrade released code in place.
        await page.evaluate(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);});
        observations.length=0;
        await page.reload();await page.waitForFunction(()=>window.ready&&window.MaraoFrontendPackage);
        await page.evaluate(()=>window.MaraoDashboardRuntime.ready);
        const identity=await page.evaluate(()=>window.MaraoFrontendPackage.identity);
        assert.match(identity,/^[a-f0-9]{64}$/);
        assert.equal(await page.evaluate(()=>localStorage.getItem('retained-preference')),'yes');
        assert.deepEqual(observations,[]);
        report.push({tag,commit:execFileSync('git',['rev-parse',tag+'^{}'],{cwd:root,encoding:'utf8'}).trim(),scope:'released cached-module replay',draftCopiedBeforeRemoval:true,deferredFailureCount:2,retiredDiagnostics,reopenedNativeIdentity:identity});
      } finally {await context.close();}
    }
    const output=require('./verification-browser').artifactDirectory('native-retirement/'+Date.now());
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2),{mode:0o600});
    console.log('Released flat/API cached clients, retained manual draft copy, retired deferred modules/workers and clean native reopen passed; '+output);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}

async function run() {
  let version = 'old';
  const requests = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost'); requests.push(url.pathname);
    response.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript' : 'text/html');
    if (url.pathname === '/service_worker.js') {
      // Same relevant routing as HA: API is network-only, other files may be stale.
      return response.end(`self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')){e.respondWith(fetch(e.request));return;}e.respondWith(caches.open('ha-file-cache').then(async c=>{const old=await c.match(e.request);const fresh=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r;});return old||fresh;}));});`);
    }
    if (url.pathname === '/legacy') return response.end(`<script type="module">import '/marao_dashboard_static/MaraoDashboard.js?v=old';</script>`);
    if (url.pathname === '/fixed') return response.end(`<script type="module">import '/api/marao_dashboard/frontend.js?v=old';</script>`);
    if (url.pathname === '/api/marao_dashboard/frontend.js') {
      response.setHeader('Cache-Control', 'no-store');
      return response.end(`await import('/api/marao_dashboard/frontend/${version}/MaraoDashboard.js?v=${version}');`);
    }
    if (url.pathname.endsWith('/MaraoDashboard.js')) {
      const legacy = url.pathname.startsWith('/marao_dashboard_static/');
      response.setHeader('Cache-Control', 'public, max-age=2678400');
      return response.end(`import { ${version}Only } from './dependency.js?v=${legacy ? 'old' : version}';window.loaded=${version}Only;`);
    }
    if (url.pathname.endsWith('/dependency.js')) {
      response.setHeader('Cache-Control', 'public, max-age=2678400');
      return response.end(`export const ${version}Only = '${version}';`);
    }
    response.writeHead(404); response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/legacy'); await page.waitForFunction(() => window.loaded === 'old');
    await page.evaluate(async () => {
      localStorage.setItem('sign-in', 'preserved'); localStorage.setItem('preferences', 'preserved');
      await navigator.serviceWorker.register('/service_worker.js'); await navigator.serviceWorker.ready;
    });
    await page.reload(); await page.waitForFunction(() => navigator.serviceWorker.controller && window.loaded === 'old');
    await page.goto(base + '/fixed'); await page.waitForFunction(() => window.loaded === 'old');
    // An evicted dependency with a retained entry is a realistic partially warm cache.
    await page.evaluate(async () => { for (const key of await caches.keys()) await (await caches.open(key)).delete('/marao_dashboard_static/dependency.js?v=old'); });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.clearBrowserCache'); await cdp.detach();
    version = 'new';
    const mixedFailure = page.waitForEvent('pageerror', {predicate: error => /oldOnly/.test(error.message)});
    await page.goto(base + '/legacy');
    await mixedFailure;
    assert.ok(errors.some(error => /oldOnly/.test(error)), 'Old flat entry must demonstrate the reported mixed-version loading risk');
    errors.length = 0;
    // This is the same cached HTML/bootstrap URL; no cache clearing on this path.
    await page.goto(base + '/fixed'); await page.waitForFunction(() => window.loaded === 'new');
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => localStorage.getItem('sign-in')), 'preserved');
    assert.equal(await page.evaluate(() => localStorage.getItem('preferences')), 'preserved');
    assert.ok(requests.includes('/api/marao_dashboard/frontend/new/dependency.js'));
    console.log('Reproduced old mixed-module failure; cached HTML selects the new API graph without clearing caches or settings.');
  } finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
if (require.main === module) (process.argv.includes('--retirement')?retirement():run()).catch(error => {console.error(error);process.exitCode = 1;});
module.exports = { run, retirement };
