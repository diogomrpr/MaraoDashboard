const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readConfig, accessToken, setBrowserToken, connect } = require('../ha-test/client');
const { iphone } = require('./mobile-devices');

async function main() {
  const config=readConfig();assert.equal(new URL(config.url).hostname,'192.168.0.28');
  if(Object.hasOwn(process.env,'MARAO_UPGRADE_RECEIPT'))await require('../ha-test/prepare').prepare(config);
  const browser=await chromium.launch();const samples=[];
  const client=await connect(config);const saved=await client.call({type:"marao_dashboard/config/get"});
  try {
    for(let i=0;i<3;i++) {
      const context=await browser.newContext(iphone);
      await context.addInitScript(setBrowserToken,{hassUrl:config.url,...accessToken(config)});
      await context.addInitScript(()=> {
        const m=window.__editorTiming={longTasks:[]};
        new PerformanceObserver(list=>m.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
        const define=customElements.define.bind(customElements);
        customElements.define=(name,constructor,options)=>{
          if(name==='marao-dashboard-panel') {
            m.definition=performance.now();
            for(const [method,key] of [['connectedCallback','shell']]) {
              const original=constructor.prototype[method];
              constructor.prototype[method]=function(...args) { const result=original.apply(this,args);m[key]=performance.now();
                const view=this.shadowRoot.getElementById('visual-view');
                const observer=new MutationObserver(()=>{if(view.querySelector('.section-grid')){m.visual=performance.now();observer.disconnect();}});
                observer.observe(view,{childList:true});return result; };
            }
          }
          return define(name,constructor,options);
        };
      });
      const page=await context.newPage();
      for(const temperature of ['cold','warm']) {
        let requestAt;let responseAt;let requestId;
        page.on('websocket',socket=>{
          socket.on('framesent',({payload})=>{const message=JSON.parse(payload);if(message.type==='marao_dashboard/config/get'){requestId=message.id;requestAt=Date.now();}});
          socket.on('framereceived',({payload})=>{const message=JSON.parse(payload);if(message.type==='result'&&message.id===requestId)responseAt=Date.now();});
        });
        await page.goto(config.url+'/marao-dashboard-editor');
        const panel=page.locator('marao-dashboard-panel');await panel.waitFor({state:'visible'});
        await panel.evaluate(p=>new Promise((resolve,reject)=>{
          const start=performance.now();
          const inspect=root=>{for(const e of root.children){if(e.localName==='input'&&!e.disabled&&e.value===p._model?.name&&e.getBoundingClientRect().width)return true;if(e.shadowRoot&&inspect(e.shadowRoot))return true;if(inspect(e))return true;}return false;};
          const check=()=>{const general=p.shadowRoot.getElementById('general-form');if(p._loaded&&p.shadowRoot.querySelector('.entity-row')&&general&&inspect(general)){window.__editorTiming.ready=performance.now();return resolve();}if(performance.now()-start>15000)return reject(new Error('Populated native controls did not become ready'));requestAnimationFrame(check);};check();
        }));
        const data=await page.evaluate(()=>({...window.__editorTiming,resources:performance.getEntriesByType('resource').map(e=>({path:new URL(e.name).pathname,bytes:e.decodedBodySize,transfer:e.transferSize}))}));
        assert.ok(requestAt&&responseAt&&data.visual);data.management=responseAt-requestAt;data.temperature=temperature;
        data.shellToReady=data.ready-data.shell;
        assert.ok(!data.resources.some(r=>/MaraoDashboardJsonEditor|MaraoDashboard.*Worker/.test(r.path)), 'Visual requested JSON assets');
        data.large = await panel.evaluate(async p => {
          const model=p._model; const saved=p._source();
          const large=structuredClone(model);
          large.rooms=Array.from({length:5},()=>structuredClone(model.rooms)).flat();
          const start=performance.now();p._model=large;p._renderVisual();
          const render=performance.now()-start;
          const forms=[...p.shadowRoot.querySelectorAll('ha-form')];
          await Promise.all(forms.map(form=>p._containForm(form)));
          const result={render,forms:forms.length,rows:p.shadowRoot.querySelectorAll('.entity-row').length,ready:performance.now()-start};
          p._model=model;p._renderVisual();
          if(p._source()!==saved)throw new Error('Rendering changed source');return result;
        });
        data.firstJson=await panel.evaluate(async p=>{const start=performance.now();await p._switchTab('json');if(!p._monaco)throw new Error('JSON initialization failed');return performance.now()-start;});
        data.repeatJson=await panel.evaluate(async p=>{await p._switchTab('visual');const start=performance.now();await p._switchTab('json');return performance.now()-start;});
        samples.push(data);
      }
      await context.close();
    }
  } finally {assert.equal((await client.call({type:"marao_dashboard/config/get"})).config,saved.config,"Read-only startup changed saved source");client.close();await browser.close();}
  const label=process.argv[2]||'sample';assert.match(label,/^[a-z-]+$/);
  const out=path.join(__dirname,'.artifacts/editor');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'timings-'+label+'.json'),JSON.stringify(samples,null,2));
  for(const temperature of ['cold','warm']) {
    const runs=samples.filter(s=>s.temperature===temperature);
    const median=key=>runs.map(s=>Math.round(s[key])).sort((a,b)=>a-b)[1];
    console.log(`${temperature}: median native-ready ${median('ready')}ms, shell-to-ready ${median('shellToReady')}ms, management ${median('management')}ms, first JSON ${median('firstJson')}ms, repeat JSON ${median('repeatJson')}ms (3 samples)`);
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
