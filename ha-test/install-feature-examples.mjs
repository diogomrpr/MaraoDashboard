// Add only explicitly owned examples; preserve the user's ordinary dashboard.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ScheduleSession,stable} from '../frontend_src/schedule-api.js';
const require=createRequire(import.meta.url),client=require('./client.js'),config=client.readConfig();assert.equal(new URL(config.url).hostname,'192.168.0.28');
const connection=await client.connect(config),directory=path.resolve('ha-test/.cache/feature-install-'+Date.now());fs.mkdirSync(directory,{recursive:true,mode:0o700});
const api=async(method,p,body)=>{const r=await fetch(config.url+'/api/'+p,{method,headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Object.assign(new Error('Native API '+r.status),{status_code:r.status});const text=await r.text();return text?JSON.parse(text):null;};
const hass={user:{is_admin:true},callWS:data=>connection.call(data),callApi:api,callService:(d,s,data)=>api('POST','services/'+d+'/'+s,data)},session=new ScheduleSession(hass,'marao_dashboard_test_seasonal');
try{
  await session.read();
  if(!session.manifest){const targets=[];for(const label of ['One','Two']){const target=await session.helper('input_boolean','Marao Dashboard Test Seasonal '+label,{});targets.push(target.entity_id);fs.writeFileSync(path.join(directory,'schedule-recovery.json'),JSON.stringify(session.receipt,null,2),{mode:0o600});await hass.callService('input_boolean','turn_off',{entity_id:target.entity_id});}
    await session.setup('Seasonal schedules',targets);const summer=await session.group('Summer'),winter=await session.group('Winter');
    await session.timer({name:'Summer · turn on only',timer_group_id:summer,days:['mon','wed','fri'],time:'07:00',targets,stop_mode:'none',enabled:true});
    await session.timer({name:'Winter · 15 minutes',timer_group_id:winter,days:['mon','fri'],time:'07:00',targets,stop_mode:'after_duration',duration_minutes:15,enabled:true});
    await session.select('paused');
  }
  fs.writeFileSync(path.join(directory,'schedule-recovery.json'),JSON.stringify(session.receipt,null,2),{mode:0o600});
  const before=await connection.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});assert.ok(!before.strategy&&before.marao,'Require the existing ordinary Marao dashboard');
  fs.writeFileSync(path.join(directory,'dashboard-before.json'),JSON.stringify(before,null,2),{mode:0o600});
  const next=structuredClone(before),examples=JSON.parse(fs.readFileSync('ha-test/feature-examples.json'));
  examples.find(card=>card.type==='custom:marao-schedules-card').targets=session.manifest.targets.map(t=>t.entity_id);
  const marker='marao_feature_examples_v1';
  for(const view of [next.views.find(v=>v.path==='overview') || next.views[0],next.views.find(v=>v.path==='card-test')]) {
    assert.ok(view,'Require existing Home and Cases views');const cards=examples.map((card,index)=>({...card,id:card.id || marker+'_'+index}));
    const containers=view.type==='sections'?(view.sections ||= []):(view.cards ||= []);
    let owned=containers.find(item=>item.marao_example_id===marker);
    if(!owned){owned={type:view.type==='sections'?'grid':'vertical-stack',marao_example_id:marker,cards:[]};containers.push(owned);}
    for(const card of cards)if(!owned.cards.some(existing=>existing.id===card.id))owned.cards.push(card);
    const people=owned.cards.find(card=>card.type==='custom:marao-people-card');if(people&&!Object.hasOwn(people,'columns'))people.columns=2;
  }
  for(const [path,title,icon] of [['location-test-room','Living room','mdi:sofa'],['location-test-away','Away','mdi:home-export-outline']])if(!next.views.some(view=>view.path===path))next.views.push({path,title,icon,subview:true,cards:[{type:'markdown',content:'Disposable location shortcut example.'}]});
  if(!Object.hasOwn(next.marao.navbar,'current_room'))next.marao.navbar.current_room={enabled:true,people:{'person.marao_dashboard_test_alex':{area_sensor:'sensor.marao_dashboard_test_current_area'}},rooms:{test_living_room:{path:'/marao-dashboard/location-test-room'}},away_path:'/marao-dashboard/location-test-away'};
  const current=await connection.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});assert.equal(stable(current),stable(before),'Dashboard changed concurrently; exact backup retained');
  if(stable(next)!==stable(before))await connection.call({type:'lovelace/config/save',url_path:'marao-dashboard',config:next});
  const installed=await connection.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});assert.equal(stable(installed),stable(next));
  console.log('People columns, camera events and location examples are installed on Home and Cases.');
}finally{connection.close();}
