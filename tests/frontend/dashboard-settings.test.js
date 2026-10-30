import test from 'node:test';
import assert from 'node:assert/strict';
import {readDashboardSettings,patchDashboardSettings,saveDashboardSettings} from '../../frontend_src/dashboard-settings.js';
test('native shared settings preserve explicit emptiness and opaque native fields',()=>{
  const source={title:'House',opaque:{x:1},views:[{path:'home',sections:[]}],marao:{version:1,navbar:{routes:[],unknown:'kept'},extra:true}};
  assert.deepEqual(readDashboardSettings(source).navbar.routes,[]);
  const next=patchDashboardSettings(source,{...source.marao,show_editor_button:false});
  assert.deepEqual(next.views,source.views);assert.deepEqual(next.opaque,source.opaque);assert.equal(next.marao.extra,true);assert.equal(next.marao.navbar.unknown,'kept');assert.equal(source.marao.show_editor_button,undefined);
  assert.equal(readDashboardSettings({views:[]}),undefined);
});
test('shared native settings save preserves all views and refuses stale or non-admin writes',async()=>{
  const baseline={views:[{path:'home',sections:[]}],opaque:42,marao:{version:1,navbar:{routes:[]}}};
  const calls=[],hass={user:{is_admin:true},async callWS(request){calls.push(request);return structuredClone(baseline);}};
  const updated=await saveDashboardSettings(hass,'house-dashboard',baseline,{...baseline.marao,show_editor_button:false},()=>true);
  assert.equal(updated.opaque,42);assert.deepEqual(updated.views,baseline.views);assert.equal(calls.filter(c=>c.type.endsWith('/save')).length,1);
  for(const scenario of ['not-admin','role-lost','stale','left-dashboard']){
    const writes=[];let active=true;
    const h={user:{is_admin:scenario!=='not-admin'},async callWS(request){if(request.type.endsWith('/save'))writes.push(request);if(scenario==='role-lost')h.user.is_admin=false;if(scenario==='left-dashboard')active=false;return scenario==='stale'?{...baseline,title:'Concurrent edit'}:structuredClone(baseline);}};
    await assert.rejects(saveDashboardSettings(h,'house-dashboard',baseline,baseline.marao,()=>active),/settings_stale/);assert.equal(writes.length,0,scenario);
  }
});
test('native settings refuse unsupported metadata and unsafe route destinations',()=>{
  for(const value of [{version:2,navbar:{routes:[]}},{version:true,navbar:{routes:[]}},{version:1,navbar:{routes:[{path:'javascript:bad',label:'Unsafe'}]}},{version:1,navbar:{routes:[]},show_cache_reset:'yes'}])assert.throws(()=>readDashboardSettings({marao:value}));
  assert.throws(()=>patchDashboardSettings({views:[],marao:{foreign:true}},{version:1,navbar:{routes:[]}}));
});

test('documented native opt-in uses supported settings and a real initial destination',async()=>{
  const {readFileSync}=await import('node:fs');const {parse}=await import('yaml');
  const guide=readFileSync(new URL('../../docs/docs/installation/configuration.md',import.meta.url),'utf8');
  const example=parse(guide.match(/```yaml\n([\s\S]*?)\n```/)[1]);
  const settings=readDashboardSettings(example);assert.equal(settings.version,1);
  assert.equal(settings.navbar.routes[0].path,'/marao-dashboard/'+example.views[0].path);
  assert.deepEqual(patchDashboardSettings(example,settings),example);
});
