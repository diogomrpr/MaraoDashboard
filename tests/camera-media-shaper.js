// Test-only aggregate downstream link. Ingest pacing is measured separately.
const http = require('node:http');
const crypto = require('node:crypto');
const {performance} = require('node:perf_hooks');
const HLS = /^\/api\/hls\/[^/]+\/(?:master_playlist\.m3u8|playlist\.m3u8|init\.mp4|segment\/\d+(?:\.\d+)?\.(?:m4s|ts))$/;
const ADAPTIVE = /^\/api\/marao_dashboard\/camera\/[a-f0-9]{32}\/(?:master\.m3u8|[0-2]\/(?:playlist\.m3u8|init\.mp4|\d+\.m4s))$/;
const allowedPath = pathname => HLS.test(pathname) || ADAPTIVE.test(pathname);

class AggregateMediaBudget {
  constructor(bytesPerSecond) { this.queue=[]; this.closed=false; this.setRate(bytesPerSecond); }
  setRate(rate) {
    if(!Number.isFinite(rate) || rate<1024) throw Error('Media rate must be at least 1024 bytes/s');
    if(this.timer) {
      this.remaining=Math.max(0,this.remaining-(performance.now()-this.started)*this.rate/1000);
      clearTimeout(this.timer); this.timer=null;
    }
    this.rate=rate;
    if(this.current) this.arm();
  }
  take(bytes,signal) {
    if(this.closed || signal?.aborted) return Promise.reject(new Error('Media budget closed'));
    return new Promise((resolve,reject)=>{
      const item={bytes,resolve,reject,signal};
      item.abort=()=>{
        if(this.current===item) {clearTimeout(this.timer);this.timer=null;this.current=null;}
        else this.queue=this.queue.filter(queued=>queued!==item);
        signal?.removeEventListener('abort',item.abort);reject(new Error('Media transfer cancelled'));this.next();
      };
      signal?.addEventListener('abort',item.abort,{once:true});
      this.queue.push(item);this.next();
    });
  }
  next() {
    if(this.current || this.closed) return;
    this.current=this.queue.shift();
    if(this.current) {this.remaining=this.current.bytes;this.arm();}
  }
  arm() {
    this.started=performance.now();
    this.timer=setTimeout(()=>{
      this.timer=null;
      const item=this.current;this.current=null;
      item.signal?.removeEventListener('abort',item.abort);item.resolve();this.next();
    },this.remaining/this.rate*1000);
  }
  close() {
    this.closed=true;clearTimeout(this.timer);this.timer=null;
    for(const item of [this.current,...this.queue].filter(Boolean)) {
      item.signal?.removeEventListener('abort',item.abort);item.reject(new Error('Media budget closed'));
    }
    this.current=null;this.queue=[];
  }
}

async function cameraMediaShaper(config,{bytesPerSecond}) {
  const origin=new URL(config.url).origin;
  if(new URL(origin).hostname!=='192.168.10.229') throw Error('Camera shaping is disposable-only');
  const secret=crypto.randomBytes(24).toString('hex'),budget=new AggregateMediaBudget(bytesPerSecond);
  const active=new Set(),sockets=new Set(),records=[];
  const server=http.createServer(async(req,res)=>{
    const target=new URL(req.url,origin);
    if(req.method==='OPTIONS' && req.headers.origin===origin && target.origin===origin && allowedPath(target.pathname)) {
      res.writeHead(204,{'access-control-allow-origin':origin,'access-control-allow-methods':'GET',
        'access-control-allow-headers':'x-marao-media-shaper, range','access-control-allow-private-network':'true'});res.end();return;
    }
    if(req.method!=='GET' || req.headers['x-marao-media-shaper']!==secret || target.origin!==origin || !allowedPath(target.pathname)) {
      res.writeHead(403);res.end();return;
    }
    if(active.size>=16) {res.writeHead(503);res.end();return;}
    const abort=new AbortController();active.add(abort);
    res.on('close',()=>{if(!res.writableFinished)abort.abort();});
    const started=performance.now(),media=!target.pathname.endsWith('.m3u8');
    // Hash identities: never persist a signed path/query or HA access material.
    const record={identity:crypto.createHash('sha256').update(target.href).digest('hex'),media,started,bytes:0,deliveries:[]};records.push(record);
    try {
      const headers={};
      for(const key of ['range','if-none-match','if-modified-since']) if(req.headers[key]) headers[key]=req.headers[key];
      const upstream=await fetch(target,{headers,signal:abort.signal,redirect:'error'});
      record.upstreamHeadersMs=performance.now()-started;record.status=upstream.status;
      const responseHeaders={'access-control-allow-origin':origin,'access-control-allow-credentials':'true','timing-allow-origin':origin};
      for(const key of ['content-type','content-range','cache-control','etag','last-modified'])
        if(upstream.headers.has(key)) responseHeaders[key]=upstream.headers.get(key);
      if(media && !upstream.headers.has('content-encoding') && upstream.headers.has('content-length'))
        responseHeaders['content-length']=upstream.headers.get('content-length');
      res.writeHead(upstream.status,responseHeaders);
      if(!media) {
        const playlist=await upstream.text();
        if(Buffer.byteLength(playlist)>128*1024) throw Error('Synthetic playlist exceeded 128 KiB');
        // WebKit resolves relative media against the rewritten response URL.
        const body=playlist.replace(/(^|["\n])(\/api\/(?:hls|marao_dashboard\/camera)\/)/g,(_,prefix,pathname)=>prefix+origin+pathname);
        record.bytes=Buffer.byteLength(body);res.end(body);record.completed=true;return;
      }
      let received=0;
      if(upstream.body) for await(const chunk of upstream.body) {
        received+=chunk.length;
        if(received>8*1024*1024) throw Error('Synthetic media response exceeded 8 MiB');
        record.firstUpstreamByteMs??=performance.now()-started;
        for(let offset=0;offset<chunk.length;offset+=4096) {
          const part=chunk.subarray(offset,offset+4096);
          if(media) await budget.take(part.length,abort.signal);
          if(!res.write(part)) await new Promise((resolve,reject)=>{
            const cleanup=()=>{res.off('drain',drain);res.off('close',close);};
            const drain=()=>{cleanup();resolve();},close=()=>{cleanup();reject(new Error('Media reader closed'));};
            res.once('drain',drain);res.once('close',close);
          });
          record.bytes+=part.length;record.deliveries.push({at:performance.now(),bytes:part.length});
        }
      }
      res.end();record.completed=true;
    } catch(error) {
      record.cancelled=abort.signal.aborted;
      if(!record.cancelled)record.error=error.name+': '+error.message.replace(/https?:\/\/\S+/g,'[media URL]');
      res.destroy();
    } finally {active.delete(abort);record.durationMs=performance.now()-started;}
  });
  server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const proxyOrigin='http://127.0.0.1:'+server.address().port;
  const installed=[];
  return {
    records,
    setRate:rate=>budget.setRate(rate),
    async install(context) {
      const handler=route=>{
        const url=new URL(route.request().url());
        if(!allowedPath(url.pathname))return route.continue();
        return route.continue({url:proxyOrigin+url.pathname+url.search,
          headers:{...route.request().headers(),'x-marao-media-shaper':secret}});
      };
      for(const pattern of [origin+'/api/hls/**',origin+'/api/marao_dashboard/camera/**']) {
        await context.route(pattern,handler);installed.push({context,pattern,handler});
      }
    },
    async close() {
      for(const {context,pattern,handler} of installed) await context.unroute(pattern,handler);
      for(const abort of active)abort.abort();budget.close();
      for(const socket of sockets)socket.destroy();
      await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    },
  };
}
module.exports={AggregateMediaBudget,cameraMediaShaper};
