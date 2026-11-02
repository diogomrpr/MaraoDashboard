import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import redirects from './legacy-redirects.json' with {type:'json'};
const output=fileURLToPath(new URL('../dist/',import.meta.url));
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const target=path.join(dir,entry.name);if(entry.isDirectory())walk(target);else if(target.endsWith('.html'))files.push(target);}}
walk(output);
const errors=new Set();
const fileFor=url=>{const local=decodeURIComponent(url.pathname).replace(/^\/MaraoDashboard\/?/,'');const dest=path.join(output,local);return fs.existsSync(dest)&&fs.statSync(dest).isDirectory()?path.join(dest,'index.html'):dest;};
for(const file of files){
 const html=fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const page=new URL('https://diogomrpr.github.io/MaraoDashboard/'+path.relative(output,file).replace(/index\.html$/,''));
 for(const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)){
  const value=match[1];if(/^(?:data:|blob:|mailto:|tel:|#)/.test(value))continue;
  let url;try{url=new URL(value,page);}catch{errors.add(`Invalid address in ${path.relative(output,file)}: ${value}`);continue;}
  if(url.origin!==page.origin)continue;
  if(!url.pathname.startsWith('/MaraoDashboard/')){errors.add(`Missing site base in ${path.relative(output,file)}: ${value}`);continue;}
  if(!fs.existsSync(fileFor(url)))errors.add(`Missing target from ${path.relative(output,file)}: ${value}`);
 }
}
for(const [from,to] of Object.entries(redirects)){
 if(!fs.existsSync(fileFor(new URL('https://diogomrpr.github.io/MaraoDashboard'+from))))errors.add(`Missing redirect: ${from}`);
 if(!fs.existsSync(fileFor(new URL('https://diogomrpr.github.io/MaraoDashboard'+to))))errors.add(`Missing redirect destination: ${to}`);
}
if(!fs.existsSync(path.join(output,'pagefind/pagefind.js')))errors.add('Search index was not generated.');
if(errors.size)throw new Error([...errors].join('\n'));
console.log(`Checked ${files.length} pages, internal links, ${Object.keys(redirects).length} redirects and search index.`);
