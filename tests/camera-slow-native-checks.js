// Actual native HA playback over the fixture's 24,000 byte/s source link.
// Synthetic Protect registry platform/device, native transport; no real NVR.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function checkSlowCamera(page, serviceCalls, {output}) {
  assert.equal(new URL(page.url()).hostname, '192.168.0.28');
  const before = serviceCalls.length;
  const card = page.locator('marao-card').filter({has:page.locator('.title',{hasText:/^Slow connection camera$/})}).first();
  await card.scrollIntoViewIfNeeded();
  const handle = await card.elementHandle();
  assert.equal(await card.evaluate(c=>c._config.entity),'camera.marao_dashboard_test_camera_slow_high');
  let evidence, initial;
  try {
    await page.waitForFunction(c=>c._camera?.attempt,handle,{timeout:10000,polling:50});
    assert.equal(await handle.evaluate(c=>c._camera.streamEntity),'camera.marao_dashboard_test_camera_slow_low','The first attempt must already use low quality');
    await page.waitForFunction(c=>c._camera?.state==='live' && c._camera.video?.videoWidth===320,handle,{timeout:35000,polling:100});
    initial=await handle.evaluate(c=>({liveObservedAfterNavigationMs:performance.now(),time:c._camera.video.currentTime,generation:c._camera.generation,configured:c._config.entity,selected:c._camera.streamEntity,tried:[...c._camera.triedStreams],width:c._camera.video.videoWidth,poster:c._camera.poster.hidden}));
    // Native HLS/WebRTC handoff can replace the video's clock. Require three
    // seconds of small advancing samples on the same current video, not a seek
    // or a comparison against the retired transport's timestamp.
    await page.waitForFunction(c=>{
      const v=c._camera.video, previous=c.__qualityProgress;
      if(!v || c._camera.state!=='live'){c.__qualityProgress=null;return false;}
      const delta=previous?.video===v?v.currentTime-previous.time:0;
      const advanced=previous?.video===v && delta>=0 && delta<1 ? previous.advanced+delta : 0;
      c.__qualityProgress={video:v,time:v.currentTime,advanced};
      return advanced>=3;
    },handle,{timeout:30000,polling:100});
    assert.deepEqual(initial.tried,['camera.marao_dashboard_test_camera_slow_low']);
    const calls=await page.evaluate(()=>window.__maraoCameraRequestTrace.streamCalls.map(call=>({entity:call.entity,afterNavigationMs:call.date-performance.timeOrigin})));
    const requests=calls.map(call=>call.entity);
    assert.ok(requests.includes('camera.marao_dashboard_test_camera_slow_low'),'Native low stream was requested');
    assert.equal(requests.includes('camera.marao_dashboard_test_camera_slow_high'),false,'Startup must not request the expensive configured stream');
    assert.equal(initial.configured,'camera.marao_dashboard_test_camera_slow_high');assert.equal(initial.poster,true);
    // A brief pause is an explicitly controlled buffering event on real media.
    await handle.evaluate(c=>{c.__qualityPlayer=c._camera.player;c._camera.video.pause();});
    assert.deepEqual(await handle.evaluate(c=>({state:c._camera.state,poster:c._camera.poster.hidden,same:c._camera.player===c.__qualityPlayer})),{state:'buffering',poster:true,same:true});
    await handle.evaluate(c=>c._camera.video.play());
    await page.waitForFunction(c=>c._camera.state==='live',handle,{timeout:5000,polling:100});
    assert.equal(await handle.evaluate(c=>c._camera.player===c.__qualityPlayer),true);
    evidence={scope:'Native HA synthetic high/low media; both sources are capped at 24000 bytes/s. Synthetic Protect registry platform/device; no real Protect device.',initial,streamRequests:calls,
      final:await handle.evaluate(c=>({time:c._camera.video.currentTime,selected:c._camera.streamEntity,width:c._camera.video.videoWidth,generation:c._camera.generation,poster:c._camera.poster.hidden})),briefBufferRetainedVideo:true};
    assert.equal(serviceCalls.length,before,'No camera/control services');
    assert.equal(await handle.evaluate(c=>c._camera.feedback.scrollWidth<=c._camera.feedback.clientWidth+1),true,'Quality feedback wraps without overflow');
    if(output){fs.mkdirSync(output,{recursive:true});await handle.asElement().screenshot({path:path.join(output,'camera-slow.png')});}
  } catch (error) {
    if(output)fs.writeFileSync(path.join(output,'camera-slow-failure.json'),JSON.stringify({error:String(error),initial,state:await handle.evaluate(c=>({state:c._camera?.state,reason:c._camera?.reason,stream:c._camera?.streamEntity,feedback:c._camera?.feedback.textContent,slowMs:c._camera?.slowMs,time:c._camera?.video?.currentTime,frames:c._camera?.video?.getVideoPlaybackQuality?.(),registry:c.hass.entities[c._config.entity],qualities:Object.values(c.hass.states).filter(s=>s.entity_id.includes('camera_slow')).map(s=>({entity:s.entity_id,state:s.state,attributes:{width:s.attributes.width,height:s.attributes.height,channel:s.attributes.channel_id}}))}))},null,2),{mode:0o600});
    throw error;
  } finally {
    await page.__cameraRequestLedger.boundary('quality fixture removal', () => handle.evaluate(c=>c.remove()), {terminal:false,entities:['camera.marao_dashboard_test_camera_slow_high','camera.marao_dashboard_test_camera_slow_low']});
    assert.equal(await handle.evaluate(c=>!c._camera?.player),true,'Removal releases the selected stream');
    await handle.dispose();
  }
  evidence.cleanup=true;
  if(output)fs.writeFileSync(path.join(output,'camera-slow.json'),JSON.stringify(evidence,null,2),{mode:0o600});
  console.log('Native low-first startup, no high-stream request and brief-buffer video retention passed');
}
module.exports={checkSlowCamera};
