if (require.main === module) throw new Error('Camera playback and transport validation is manual-only by user instruction.');
// Compare independently decoded scene counters on the same synthetic camera.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {assertCurrentFrontend,accessToken,setBrowserToken,connect}=require('../ha-test/client');
const engine=process.argv.includes('--webkit')?webkit:chromium;
const {prepareFrontend}=require('../ha-test/prepare-frontend');
const {artifactDirectory}=require('./verification-browser');
const {managedCameraLedger}=require('./camera-request-ledger');
const folder=artifactDirectory('camera-native-latency');
const redact=value=>String(value).replace(/https?:\s*\/\/?\s*[^\s]+/g,'[URL]').replace(/(?:key|token)=[^\s&]+/g,'key=[redacted]');
(async()=>{
 const {config}=(process.env.MARAO_BATCH_RECEIPT ? await require('../ha-test/prepare').prepare() : await prepareFrontend());assert.equal(new URL(config.url).hostname,'192.168.0.28');
 const api=await connect(config);
 try {
  const native=await api.call({type:'camera/capabilities',entity_id:'camera.marao_dashboard_test_camera_adaptive_low'});
  const hls=await api.call({type:'camera/capabilities',entity_id:'camera.marao_dashboard_test_camera_adaptive_hls_low'});
  assert.ok(native.frontend_stream_types.includes('web_rtc'));assert.deepEqual(hls.frontend_stream_types,['hls']);
 } finally {api.close();}
 const browser=await engine.launch(),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage(),errors=[],failures=[],services=[],adaptiveRequests=[];let result,problem;
 await managedCameraLedger(context,page,{output:folder,scenario:engine.name(),theme:'light'});
 page.on('pageerror',error=>errors.push(redact(error.stack||error)));
 page.on('response',response=>{if(response.status()>=400)errors.push('HTTP '+response.status()+' '+new URL(response.url()).pathname.replace(/[a-f0-9]{32}/g,'[session]'));});
 page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(redact(message.text()));});
 page.on('requestfailed',request=>failures.push({path:new URL(request.url()).pathname.replace(/[a-f0-9]{32}/g,'[session]'),error:request.failure()?.errorText}));
 page.on('request',request=>{const p=new URL(request.url()).pathname;if(p.startsWith('/api/marao_dashboard/camera/')||p.endsWith('/MaraoHls.js'))adaptiveRequests.push('adaptive media');});
 page.on('websocket',socket=>socket.on('framesent',frame=>{try{const m=JSON.parse(frame.payload);if(m.type==='call_service')services.push({domain:m.domain,service:m.service});}catch{}}));
 try{
  await context.addInitScript(setBrowserToken,{hassUrl:config.url,...accessToken(config)});
  await page.goto(config.url+'/marao-dashboard/rooms');
  await page.waitForFunction(()=>customElements.get('marao-card')&&document.querySelector('home-assistant')?.hass?.entities?.camera?.device_id
   || customElements.get('marao-card')&&document.querySelector('home-assistant')?.hass?.entities?.['camera.marao_dashboard_test_camera_adaptive_high']?.device_id,null,{timeout:25000});
  await assertCurrentFrontend(page);
  await page.evaluate(()=>{
   const hass=document.querySelector('home-assistant').hass;
   const roots=[document];let sibling;
   for(let i=0;i<roots.length;i++){
    sibling ||= roots[i].querySelector('marao-card');
    for(const element of roots[i].querySelectorAll('*'))if(element.shadowRoot)roots.push(element.shadowRoot);
   }
   if(!sibling?.parentElement)throw Error('Missing actual HA context ancestry');
   const container=sibling.parentElement;
   window.latencyCards={};window.latency={started:performance.now(),samples:[],first:{},transports:{},gaps:{native:[],adaptive:[]}};
   for(const [index,kind] of ['native','adaptive'].entries()){
    const card=document.createElement('marao-card');card.id='latency-'+kind;
    card.setConfig({type:'custom:marao-card',template:'md_camera_card',entity:'camera.marao_dashboard_test_camera_adaptive_'+'low',name:kind});
    card.hass=hass;Object.assign(card.style,{position:'fixed',top:(64+index*280)+'px',left:'12px',width:'360px',zIndex:'10000',display:'block'});
    window.latencyCards[kind]=card;container.append(card);
   }
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
   const ctx=canvas.getContext('2d',{willReadFrequently:true}),observed={},callbacks={},last={};
   window.latencyCleanup=()=>{cancelAnimationFrame(window.latencyRaf);for(const kind of ['native','adaptive']){if(observed[kind]&&callbacks[kind]!==undefined)observed[kind].cancelVideoFrameCallback(callbacks[kind]);window.latencyCards?.[kind]?.remove();}};
   function decode(video){
    ctx.drawImage(video,0,0,640,360);let value=0;
    for(let bit=0;bit<8;bit++)if(ctx.getImageData(54+76*bit,40,1,1).data[0]>128)value+=1<<bit;
    return value;
   }
   function watch(kind,video){
    observed[kind]=video;
    function frame(now,meta){
     latency.first[kind]??={afterMs:now-latency.started,counter:decode(video)};
     if(last[kind])latency.gaps[kind].push(now-last[kind]);last[kind]=now;
     callbacks[kind]=video.requestVideoFrameCallback(frame);
    }
    callbacks[kind]=video.requestVideoFrameCallback(frame);
   }
   function sample(now){
    const cameras=Object.fromEntries(['native','adaptive'].map(kind=>[kind,window.latencyCards?.[kind]?._camera]));
    for(const kind of ['native','adaptive']){
     const video=cameras[kind]?.video;
     if(video&&video!==observed[kind]){if(observed[kind]&&callbacks[kind]!==undefined)observed[kind].cancelVideoFrameCallback(callbacks[kind]);watch(kind,video);}
    }
    if(Object.values(cameras).every(c=>c?.state==='live'&&c.video?.readyState>=2)&&(!latency.lastSample||now-latency.lastSample>=100)){
     latency.lastSample=now;
     const native=decode(cameras.native.video),adaptive=decode(cameras.adaptive.video);
 
     // Both renditions encode the same twelve-second scene. Compare pixels at one instant.
     const ahead=((native-adaptive+360)%240-120)/20;
     let transport;
     for(let node=cameras.native.video;node;node=node.parentNode||node.host)if(['ha-web-rtc-player','ha-hls-player'].includes(node.localName))transport=node.localName;
     let candidateTransport;
     for(let node=cameras.adaptive.video;node;node=node.parentNode||node.host)if(['ha-web-rtc-player','ha-hls-player'].includes(node.localName))candidateTransport=node.localName;
     latency.samples.push({at:now,native,adaptive,nativeAheadSeconds:ahead,transport,candidateTransport,adaptiveWidth:cameras.adaptive.video.videoWidth,
      adaptiveBuffer:cameras.adaptive.video.buffered.length?cameras.adaptive.video.buffered.end(cameras.adaptive.video.buffered.length-1)-cameras.adaptive.video.currentTime:0});
     latency.transports[transport]=true;
    }
    window.latencyRaf=requestAnimationFrame(sample);
   }
   window.latencyRaf=requestAnimationFrame(sample);
  });
  await page.waitForFunction(()=>latency.samples.length>=100,null,{timeout:45000});
  result=await page.evaluate(()=>({ ...latency,adaptiveSession:Boolean(window.latencyCards.adaptive._camera.adaptive),states:Object.fromEntries(['native','adaptive'].map(kind=>[kind,window.latencyCards?.[kind]._camera.state])) }));
  assert.equal(errors.length,0);assert.equal(services.length,0);assert.deepEqual(adaptiveRequests,[]);assert.equal(result.adaptiveSession,false,'Adaptive HLS replaced native realtime playback');assert.deepEqual(result.states,{native:'live',adaptive:'live'});
  assert.ok(result.samples.every(s=>s.native<240&&s.adaptive<240));
  assert.ok(result.samples.slice(-20).every(s=>s.transport==='ha-web-rtc-player'&&s.candidateTransport==='ha-web-rtc-player'),'Both native players must settle on WebRTC; initial native HLS negotiation is allowed');
  assert.ok(result.samples.every(s=>Math.abs(s.nativeAheadSeconds)<=.25),'Configured high ceiling regressed beyond native scene time');
  if(engine===chromium)await page.screenshot({path:folder+'/native-priority.png',scale:'css'});
 }catch(error){problem=redact(error);result=await page.evaluate(()=>({latency:window.latency,states:['native','adaptive'].map(kind=>{const c=window.latencyCards?.[kind]?._camera;return{kind,state:c?.state,reason:c?.reason,feedback:c?.feedback.textContent};})})).catch(()=>null);}
 finally{
  const cleanup=[async()=>{if(!page.isClosed())await page.evaluate(()=>window.latencyCleanup?.());},()=>context.close(),()=>browser.close()];
  for(const release of cleanup)try{await release();}catch(error){problem ||= redact(error);errors.push(redact(error));}
  fs.writeFileSync(folder+'/'+engine.name()+'-'+Date.now()+'.json',JSON.stringify({problem,result,errors,failures,services},null,2),{mode:0o600});
 }
 if(problem)throw Error(problem);
 const values=result.samples.map(s=>s.nativeAheadSeconds).sort((a,b)=>a-b);
 console.log(JSON.stringify({engine:engine.name(),samples:values.length,first:result.first,nativeTransport:Object.keys(result.transports),nativeAheadSeconds:{min:values[0],median:values[Math.floor(values.length/2)],max:values.at(-1)},errors,failures,services}));
})().catch(error=>{console.error(redact(error.message));process.exitCode=1;});
