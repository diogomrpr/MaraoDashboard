import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildPreview} from './build-preview.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export default function designPreview(){
 return {name:'marao-design-preview',apply:'serve',async configureServer(server){
   let timer,busy=false,queued=false,closed=false,html,etag;
   async function build(){
     const result=await buildPreview({design:true});html=await fs.readFile(result.output);
     etag='"'+createHash('sha256').update(html).digest('hex')+'"';
   }
   server.middlewares.use((req,res,next)=>{
     const pathname=new URL(req.url,'http://local').pathname;
     if(!['/design/frame.html',server.config.base.replace(/\/$/,'')+'/design/frame.html'].includes(pathname))return next();
     res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-cache');res.setHeader('ETag',etag);
     if(req.headers['if-none-match']===etag){res.statusCode=304;return res.end();}
     res.end(html);
   });
   const inputs=['custom_components/marao_dashboard/frontend','frontend_src','docs/playground'].map(p=>path.join(root,p));
   async function rebuild(){
     if(closed)return;
     if(busy){queued=true;return;}
     busy=true;
     try{await build();server.ws.send({type:'full-reload'});server.config.logger.info('Marao design preview rebuilt');}
     catch(error){server.config.logger.error(error.stack||error.message);server.ws.send({type:'error',err:{message:error.message,stack:error.stack}});}
     finally{busy=false;if(queued){queued=false;rebuild();}}
   }
   await build();
   server.watcher.add(inputs);
   const changed=file=>{if(inputs.some(dir=>file.startsWith(dir+path.sep))){clearTimeout(timer);timer=setTimeout(rebuild,80);}};
   server.watcher.on('all',(_,file)=>changed(file));
   server.httpServer?.once('close',()=>{closed=true;clearTimeout(timer);});
 }};
}
