import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {AggregateMediaBudget,cameraMediaShaper} from '../camera-media-shaper.js';
test('one media budget serializes concurrent viewers and does not bank idle bandwidth',async()=>{
 const budget=new AggregateMediaBudget(10000),started=performance.now();
 try {
  const deliveries=[];
  await Promise.all([0,1,2].map(async viewer=>{await budget.take(1000);deliveries.push({viewer,at:performance.now()-started});}));
  assert.deepEqual(deliveries.map(item=>item.viewer),[0,1,2]);
  deliveries.forEach((item,index)=>assert.ok(item.at>=(index+1)*100-10,JSON.stringify(deliveries)));
  const resumed=performance.now();await budget.take(1000);
  assert.ok(performance.now()-resumed>=90,'A new response still pays its byte budget');
 } finally {budget.close();}
});
test('rate collapse, cancellation and close release queued media without admitting it',async()=>{
 const budget=new AggregateMediaBudget(100000),abort=new AbortController(),started=performance.now();
 const first=budget.take(2000),cancelled=budget.take(1000,abort.signal);
 const cancelledProof=assert.rejects(cancelled,/cancelled/);
 abort.abort();budget.setRate(10000);
 await first;await cancelledProof;
 assert.ok(performance.now()-started>=170,'The in-flight reservation follows the slower aggregate rate');
 const queued=budget.take(1000);const closedProof=assert.rejects(queued,/closed/);budget.close();await closedProof;
 await assert.rejects(budget.take(1000),/closed/);
 assert.throws(()=>budget.setRate(0),/at least/);
});
test('the downstream proxy refuses non-disposable targets before opening a listener',async()=>{
 await assert.rejects(cameraMediaShaper({url:'https://example.com'},{bytesPerSecond:10000}),/disposable-only/);
});
test('loopback proxy shapes actual response bytes across sources and excludes playlist wait from the link',async()=>{
 const {default:http}=await import('node:http');
 const originalFetch=globalThis.fetch;
 let fetches=0;
 globalThis.fetch=async url=>{
  assert.equal(new URL(url).hostname,'192.168.10.229');fetches++;
  const body=url.pathname.endsWith('playlist.m3u8')?'#EXTM3U\n#EXT-X-MAP:URI="/api/hls/synthetic/init.mp4"\n/api/hls/synthetic/segment/1.0.m4s\n':Buffer.alloc(2048);
  return new Response(body,{headers:{'content-type':'video/mp4','content-length':String(Buffer.byteLength(body))}});
 };
 let routeHandler;
 const context={route:async(_pattern,handler)=>{routeHandler=handler;},unroute:async()=>{}};
 const shaper=await cameraMediaShaper({url:'http://192.168.10.229:8123'},{bytesPerSecond:10000});
 const request=options=>new Promise((resolve,reject)=>{
  http.get(options.url,{headers:options.headers},response=>{
   if(response.statusCode===200 && !options.url.includes('playlist.m3u8'))assert.equal(response.headers['content-length'],'2048');
   let bytes=0,body='';response.on('data',chunk=>{bytes+=chunk.length;body+=chunk.toString();});response.on('error',reject);
   response.on('end',()=>resolve({bytes,status:response.statusCode,body}));
  }).on('error',reject);
 });
 try {
  await shaper.install(context);
  const options=[];
  for(const name of ['segment/1.0.m4s','segment/1.1.m4s','playlist.m3u8'])
   await routeHandler({request:()=>({url:()=>`http://192.168.10.229:8123/api/hls/synthetic/${name}`,headers:()=>({})}),continue:async value=>options.push(value)});
  const started=performance.now();
  const results=await Promise.all(options.map(request));
  assert.deepEqual(results.slice(0,2).map(({bytes,status})=>({bytes,status})),[{bytes:2048,status:200},{bytes:2048,status:200}]);
  assert.equal(results[2].status,200);
  assert.equal(results[2].body,'#EXTM3U\n#EXT-X-MAP:URI="http://192.168.10.229:8123/api/hls/synthetic/init.mp4"\nhttp://192.168.10.229:8123/api/hls/synthetic/segment/1.0.m4s\n');
  const media=shaper.records.filter(item=>item.media).flatMap(item=>item.deliveries).sort((a,b)=>a.at-b.at);
  let bytes=0;for(const delivery of media){bytes+=delivery.bytes;assert.ok(bytes<=(delivery.at-started)*10+50);}
  assert.equal(bytes,4096);
  assert.ok(shaper.records.find(item=>!item.media).durationMs<150,'Playlists are forwarded without a media byte reservation');
  assert.equal(fetches,3);
  assert.equal((await request({...options[0],headers:{}})).status,403);
  assert.equal(fetches,3,'Unauthenticated proxy access never contacts HA');
  assert.ok(shaper.records.every(item=>item.completed && !item.error && !JSON.stringify(item).includes('/api/hls/')));
 } finally {await shaper.close();globalThis.fetch=originalFetch;}
});
