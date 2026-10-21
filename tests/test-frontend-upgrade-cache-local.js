// Reproduce the mixed graph that a cached HA page can request after an update.
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');

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
if (require.main === module) run().catch(error => {console.error(error);process.exitCode = 1;});
module.exports = { run };
