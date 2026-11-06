import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
await import('./prepare-site.mjs');
if(!existsSync(new URL('../public/playground/frame.html',import.meta.url))){const {buildPreview}=await import('./build-preview.mjs');await buildPreview();}
const result=spawnSync(process.execPath,['scripts/astro.mjs','dev','--background','--host','127.0.0.1','--port',process.argv[2]],{stdio:'inherit'});process.exitCode=result.status||0;
