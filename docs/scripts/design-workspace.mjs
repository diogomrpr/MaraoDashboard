import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import net from 'node:net';
import {context} from './card-context.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
const card=context(value('--card')||'climate');const id=value('--task')||randomUUID();
if(!/^[a-zA-Z0-9-]+$/.test(id))throw Error('Task ID must use letters, digits and hyphens.');
const workspace=path.join(root,'.card-design',id),manifest=path.join(workspace,'proposal.json');
let proposal;
try{proposal=JSON.parse(await fs.readFile(manifest,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const hash=data=>createHash('sha256').update(data).digest('hex');
if(!proposal){
 await fs.mkdir(workspace,{recursive:true});
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','docs','frontend_src','custom_components/marao_dashboard/frontend','custom_components/package.json','.agents/skills','tests','openspec','package.json','package-lock.json','AGENTS.md','.gitignore'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const tracked=new Set(execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).trim().split('\n'));
 const owned=file=>file.startsWith('docs/src/design/')||file.startsWith('.agents/skills/marao-card-design/')||['docs/examples/card-reference-overrides.json','docs/scripts/card-context.mjs','docs/scripts/design-workspace.mjs','docs/scripts/apply-card-design.mjs','docs/scripts/build-gallery.mjs','docs/scripts/prepare-preview.mjs','docs/scripts/design-preview-plugin.mjs','tests/docs/design-workflow.test.mjs','tests/docs/apply-card-design.test.mjs'].includes(file);
 const hashes={};
 for(const file of files){
  if(!tracked.has(file)&&!owned(file))continue;
  if(/(^|\/)(?:\.env[^/]*|local\.json|credentials[^/]*|secrets[^/]*)$/i.test(file))continue;
  const source=path.join(root,file);let stat;try{stat=await fs.lstat(source);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  if(!stat.isFile())continue;
  const data=await fs.readFile(source);hashes[file]=hash(data);
  const target=path.join(workspace,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);
 }
 execFileSync('git',['init','-q'],{cwd:workspace});
 execFileSync('git',['add','--',...Object.keys(hashes)],{cwd:workspace});
 execFileSync('git',['-c','core.hooksPath=/dev/null','-c','user.name=Marao Preview','-c','user.email=preview@localhost','commit','-qm','Preview baseline'],{cwd:workspace});
 proposal={task:id,source:root,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baseline:execFileSync('git',['rev-parse','HEAD'],{cwd:workspace,encoding:'utf8'}).trim(),card:card.card,revision:0,changeKind:null,affectedConsumers:[],scopeDecision:null,designApproved:false,applyAuthorized:false,hashes};
 await fs.writeFile(manifest,JSON.stringify(proposal,null,2));
 for(const dependency of ['node_modules','docs/node_modules']){
  const source=path.join(root,dependency),target=path.join(workspace,dependency);
  await fs.mkdir(target,{recursive:true});
  // Packages are reused; tool caches and generated config stay in this task.
  for(const entry of await fs.readdir(source)){
   if(entry.startsWith('.')&&entry!=='.bin')continue;
   await fs.symlink(path.join(source,entry),path.join(target,entry),'dir');
  }
 }
 // Preserve a known implemented baseline independently of future proposal edits.
 await fs.mkdir(path.join(workspace,'docs/public/playground'),{recursive:true});
 for(const file of ['frame.html','icons.json'])try{await fs.copyFile(path.join(root,'docs/public/playground',file),path.join(workspace,'docs/public/playground',file));}catch(e){if(e.code!=='ENOENT')throw e;}
}
if(proposal.card!==card.card)throw Error('Task belongs to another card. Reuse its card or choose a new task.');
const drift=[];for(const [file,before] of Object.entries(proposal.hashes)){try{if(hash(await fs.readFile(path.join(root,file)))!==before)drift.push(file);}catch{drift.push(file);}}
console.log(JSON.stringify({workspace,task:id,card:card.card,sourceDrift:drift,proposalPreserved:true},null,2));
if(!args.includes('--no-start')){
 const lock=path.join(workspace,'docs/.astro/dev.json');
 let running;
 try{
  const candidate=JSON.parse(await fs.readFile(lock,'utf8'));
  if(candidate.url===`http://127.0.0.1:${candidate.port}`){
   const response=await fetch(candidate.url+card.url,{signal:AbortSignal.timeout(2000)});
   if(response.ok)running=candidate;
  }
 }catch{}
 if(!running){
  const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
  const result=spawnSync(process.execPath,['scripts/prepare-preview.mjs',String(port)],{cwd:path.join(workspace,'docs'),stdio:'inherit'});
  if(result.status!==0)throw Error('Preview startup failed. Inspect the workspace docs/.astro/dev.log.');
  running=JSON.parse(await fs.readFile(lock,'utf8'));
 }
 proposal.previewUrl=`http://localhost:${running.port}${card.url}`;
 await fs.writeFile(manifest,JSON.stringify(proposal,null,2));
 console.log(`Preview: ${proposal.previewUrl}`);
}
