// Additive safe examples for the disposable native dashboard. Existing edits stay intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const client=require('./client');
function addExamples(source,imageId,media) {
  const copy=structuredClone(source),owner='floor-media-examples-v1';
  const plan={id:'floor-example',template:'md_floor_plan_card',name:'Synthetic living room',variables:{image_id:imageId,lights:[
    {id:'ceiling',entity_id:'light.marao_dashboard_test_room_light',name:'Ceiling',x:70,y:55},
    {id:'strip',entity_id:'light.marao_dashboard_test_light',name:'Wall strip',x:28,y:38,strip:{width:6,points:[{x:8,y:12},{x:85,y:12},{x:85,y:85}]}}
  ]}};
  const cases=copy.pages.find(page=>page.path==='card-test');assert.ok(cases,'The disposable must retain its single Cases view');
  const mediaPage=copy.pages.find(page=>page.path==='media');assert.ok(mediaPage,'The disposable needs its existing media page');
  const section=(page,tag,value)=>{if(!(page.sections||[]).some(s=>s.example_owner===tag)){assert.ok(Array.isArray(page.sections),'Preserve the existing sectioned test page');page.sections.push({...value,example_owner:tag});}};
  const inline={...structuredClone(media),id:'inline-media-example',name:'Inline media example',variables:{...media.variables,media_display:'inline'}};
  const popup={...structuredClone(media),id:'popup-media-example',name:'Popup media example',variables:{...media.variables,media_display:'popup'}};
  // Do not copy an automatic/custom popup identity into another occurrence.
  for(const card of [inline,popup]) {delete card.variables.popup_hash;delete card.variables.mode_selector_hash;}
  section(cases,owner,{columns:1,entities:[plan,popup,inline]});section(mediaPage,owner,{columns:1,entities:[structuredClone(inline)]});
  const found=copy.pages.find(page=>page.path==='floor-plan-example');
  if(found)assert.equal(found.example_owner,owner,'Do not replace a user-created floor-plan-example page');
  else{copy.pages.push({id:'floor-plan-example',path:'floor-plan-example',name:'Room plan',icon:'mdi:floor-plan',example_owner:owner,sections:[{columns:1,entities:[{...structuredClone(plan),variables:{...structuredClone(plan.variables),full_page:true}}]}]});copy.navigation||=[];copy.navigation.push('floor-plan-example');}
  return copy;
}
async function prepareExamples(config=client.readConfig()) {
  client.assertDisposableHaTarget(config);assert.equal(new URL(config.url).hostname,'192.168.0.28');
  const connection=await client.connect(config);
  try{
    const [states,server,user]=await Promise.all([connection.call({type:'get_states'}),client.api(config,'GET','/api/config'),connection.call({type:'auth/current_user'})]);
    const hass={config:server,user,language:'en',states:Object.fromEntries(states.map(s=>[s.entity_id,s])),callWS:message=>connection.call(message)};
    for(const id of ['light.marao_dashboard_test_light','light.marao_dashboard_test_room_light','media_player.marao_dashboard_test_apple_tv'])assert.ok(hass.states[id],'Missing safe helper '+id);
    const {NativeSession}=await import('../frontend_src/native-session.js');const session=new NativeSession(hass,'marao-dashboard');
    const initial=await session.read('initial'),source=JSON.parse(initial.config);
    const media=source.pages.flatMap(page=>(page.sections||[page]).flatMap(section=>section.entities||[])).find(card=>card.template==='md_media_card'&&card.entity_id==='media_player.marao_dashboard_test_apple_tv');assert.ok(media,'Use the existing safe Apple TV example');
    const cache=path.join(__dirname,'.cache/floor-plan-examples');fs.mkdirSync(cache,{recursive:true,mode:0o700});
    const image=fs.readFileSync(path.join(__dirname,'floor-plan-room.png')),digest=crypto.createHash('sha256').update(image).digest('hex');
    const receiptPath=path.join(cache,'image.json');let receipt;
    try{receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));}catch{}
    const images=await connection.call({type:'image/list'});
    if(receipt?.target!==config.url||receipt?.digest!==digest||!images.some(image=>image.id===receipt?.id)){
      const body=new FormData();body.append('file',new Blob([image],{type:'image/png'}),'synthetic-room.png');
      const result=await fetch(config.url+'/api/image/upload',{method:'POST',headers:{Authorization:'Bearer '+config.token},body,redirect:'error',signal:AbortSignal.timeout(30000)});
      assert.ok(result.ok,'Synthetic image upload failed');const uploaded=await result.json();assert.match(uploaded.id,/^[a-f0-9]{32}$/);
      receipt={target:config.url,digest,id:uploaded.id};fs.writeFileSync(receiptPath,JSON.stringify(receipt),{mode:0o600});
    }
    const next=addExamples(source,receipt.id,media);
    if(JSON.stringify(next)!==JSON.stringify(source)){
      const backup=path.join(cache,'dashboard-before-'+Date.now()+'.json');fs.writeFileSync(backup,JSON.stringify(session.baseline),{mode:0o600});
      await session.save(JSON.stringify(next,null,2)+'\n');
      const current=await connection.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});assert.deepEqual(JSON.parse(current.strategy.source_json),next,'Example source differs after save');
    }
    return {url:config.url+'/marao-dashboard/floor-plan-example',installed:true};
  }finally{connection.close();}
}
module.exports={addExamples,prepareExamples};
if(require.main===module)prepareExamples().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
