import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
const docs=fileURLToPath(new URL('../',import.meta.url)), root=path.dirname(docs.slice(0,-1));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const release=process.env.MARAO_DOCS_RELEASE;
if(release){
  if(release!==`v${pkg.version}` || !/^v\d+\.\d+\.\d+$/.test(release))throw new Error('Documentation publication requires the matching stable package tag.');
  if(git('rev-parse','HEAD')!==git('rev-parse',`${release}^{commit}`))throw new Error('Documentation source does not match its released tag.');
  if(git('status','--porcelain','--untracked-files=no'))throw new Error('Released documentation must be built from unchanged tracked sources.');
}
const meta={version:pkg.version,revision:git('rev-parse','HEAD'),released:Boolean(release),tag:release || null};
fs.writeFileSync(path.join(docs,'build-meta.json'),JSON.stringify(meta,null,2)+'\n');
const {modes,...base}=parse(fs.readFileSync(path.join(root,'custom_components/marao_dashboard/frontend/themes/MaraoDashboard/marao-dashboard.yaml'),'utf8'))['Marao Dashboard'];
const variables=mode=>Object.entries({...base,...modes[mode]}).map(([name,value])=>`${name.startsWith('--')?name:'--'+name}:${value};`).join('\n');
fs.writeFileSync(path.join(docs,'src/styles/marao-theme.css'),`/* Generated from the shipped Marao theme. */\n:root{${variables('dark')}}\n:root[data-theme='light']{${variables('light')}}\n`);
for(const item of ['brand','fonts']){
 const source=path.join(root,'custom_components/marao_dashboard/frontend',item),target=path.join(docs,'public',item);
 fs.mkdirSync(target,{recursive:true});
 fs.cpSync(source,target,{recursive:true});
}
console.log(`Documentation ${meta.version} (${meta.released?'released':'local preview'})`);
