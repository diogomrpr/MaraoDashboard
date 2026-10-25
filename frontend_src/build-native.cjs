const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const root = path.resolve(__dirname,'..');
const hash = value => crypto.createHash('sha256').update(value).digest('base64');

async function buildConverter(destination = path.join(root,'ha-test/.cache/native-converter/marao-converter.html')) {
  const bundle = await esbuild.build({entryPoints:[path.join(__dirname,'converter.js')],bundle:true,write:false,minify:true,format:'iife',platform:'browser',target:'es2022',legalComments:'inline'});
  const script = bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
  const fontRoot = path.join(root,'custom_components/marao_dashboard/frontend/fonts');
  const font = `@font-face{font-family:Montserrat;font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(fontRoot,'Montserrat.ttf')).toString('base64')}) format('truetype')}`;
  const license = fs.readFileSync(path.join(fontRoot,'OFL.txt'),'utf8').replaceAll('&','&amp;').replaceAll('<','&lt;');
  let html = fs.readFileSync(path.join(__dirname,'converter.html'),'utf8').replace('__MARAO_FONT__',font).replace('__MARAO_LICENSE__',license).replace('__MARAO_SCRIPT__',() => script);
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const csp = `default-src 'none'; script-src 'sha256-${hash(script)}'; style-src 'sha256-${hash(style)}'; font-src data:; connect-src 'none'; img-src data:; base-uri 'none'; form-action 'none'`;
  html = html.replace('__MARAO_CSP__',csp);
  fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.writeFileSync(destination,html);
  return destination;
}

async function buildFrontend(destination = path.join(root,'ha-test/.cache/native-frontend'), version = JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version) {
  const {assertPackageBoundary} = require('./build-hacs-dist.cjs');
  const frontend = path.join(root,'custom_components/marao_dashboard/frontend');
  assertPackageBoundary(frontend,{allowLocalCache:true});
  const files = [];
  const visit = (directory,prefix = '') => {for (const item of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b) => a.name.localeCompare(b.name))) {
    if (item.name === '.DS_Store' || item.name === '__pycache__' || /\.py[co]$/.test(item.name)) continue;
    const relative = path.posix.join(prefix,item.name);
    if (item.isDirectory()) visit(path.join(directory,item.name),relative);
    else if (item.isFile()) files.push(relative);
  }};
  visit(frontend);
  const digest = crypto.createHash('sha256');
  digest.update('package_version\0'+version+'\0');
  digest.update(fs.readFileSync(__filename));
  for (const file of files) digest.update(file+'\0').update(fs.readFileSync(path.join(frontend,file)));
  const identity = digest.digest('hex');
  fs.rmSync(destination,{recursive:true,force:true});
  // HACS downloads all of dist from the tag; a matching release JS asset would select only that file.
  const dist = path.join(destination,'dist');
  fs.mkdirSync(dist,{recursive:true});
  const names = Object.fromEntries(files.map(file=>[file,`${identity}--${file.replaceAll('/','--')}`]));
  if (new Set(Object.values(names)).size !== files.length) throw new Error('Ambiguous flat asset names.');
  const resolver = `${identity}--MaraoAssetURL.js`;
  fs.writeFileSync(path.join(dist,resolver),`const files=${JSON.stringify(names)},root=new globalThis.URL('./',import.meta.url);export function AssetURL(input,base){const url=new globalThis.URL(input,base);if(url.origin===root.origin&&url.pathname.startsWith(root.pathname)){const mapped=files[url.pathname.slice(root.pathname.length)];if(mapped)url.pathname=root.pathname+mapped;}return url;}AssetURL.prototype=globalThis.URL.prototype;Object.setPrototypeOf(AssetURL,globalThis.URL);\n`);
  const temporary = fs.mkdtempSync(path.join(require('node:os').tmpdir(),'marao-flat-build-'));
  try {
    const inject = path.join(temporary,'url.js');
    fs.writeFileSync(inject,`export {AssetURL as URL} from './${resolver}';`);
    const compiled = await esbuild.build({entryPoints:Object.fromEntries(files.filter(file=>file.endsWith('.js')).map(file=>[names[file].slice(0,-3),path.join(frontend,file)])),outdir:dist,bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof',inject:[inject],external:[`./${resolver}`],logLevel:'silent'});
    for (const output of compiled.outputFiles) fs.writeFileSync(output.path,output.contents);
  } finally {fs.rmSync(temporary,{recursive:true,force:true});}
  for (const file of files.filter(file=>!file.endsWith('.js'))) {
    if (file.endsWith('.css')) {
      const css=fs.readFileSync(path.join(frontend,file),'utf8').replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(whole,quote,relative)=>{
        const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),relative));
        return names[target] ? `url('${names[target]}')` : whole;
      });
      fs.writeFileSync(path.join(dist,names[file]),css);
    } else fs.copyFileSync(path.join(frontend,file),path.join(dist,names[file]));
  }
  const loader = `const root=new URL('./',import.meta.url);const manifestURL=new URL('MaraoFrontend.release.json',root);const response=await fetch(manifestURL,{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error('Marao frontend installation is incomplete.');const meta=await response.json();if(meta.compiler_contract!==1||!/^[a-f0-9]{64}$/.test(meta.identity||''))throw new Error('Invalid Marao frontend identity.');window.MaraoInstalledFrontendPackage={identity:meta.identity,rootURL:root.href,baseURL:root.href,manifestURL:manifestURL.href};await import(new URL(meta.identity+'--MaraoNativeDashboard.js',root));await import(new URL(meta.identity+'--MaraoDashboard.js',root));\n`;
  fs.writeFileSync(path.join(dist,'MaraoFrontend.js'),loader);
  const hashes = Object.fromEntries(fs.readdirSync(dist).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(dist,file))).digest('hex')]));
  fs.writeFileSync(path.join(dist,'MaraoFrontend.release.json'),JSON.stringify({identity,package_version:version,compiler_contract:1,files:hashes})+'\n');
  fs.writeFileSync(path.join(destination,'hacs.json'),JSON.stringify({name:'Marao Dashboard',filename:'MaraoFrontend.js',render_readme:true})+'\n');
  fs.copyFileSync(path.join(root,'LICENSE'),path.join(destination,'LICENSE'));
  fs.writeFileSync(path.join(destination,'README.md'),'# Marao Dashboard\n\nInstall this repository as a HACS Dashboard repository. The resource is `MaraoFrontend.js`. Requires Home Assistant 2026.10.0 or newer.\n\nAll runtime assets are in `dist/`. Releases must use tagged repository content; do not attach a single JavaScript download or a ZIP release.\n\nExisting integration installations require the guided [migration procedure](MIGRATION.md) before removal. Export drafts, back up exact package/data, convert offline and retain the original dashboard address. No new legacy Integration release is required.\n');
  fs.copyFileSync(path.join(root,'docs/docs/installation/native-migration.md'),path.join(destination,'MIGRATION.md'));
  const attribution = fs.readFileSync(path.join(root,'README.md'),'utf8').split('\n').find(line=>line.startsWith('Inspired by '));
  if(attribution) fs.appendFileSync(path.join(destination,'README.md'),'\n'+attribution+'\n');
  assertPackageBoundary(destination);
  return {destination,identity,files:files.length};
}
if (require.main === module) (process.argv.includes('--frontend') ? buildFrontend() : buildConverter()).then(result => console.log(result)).catch(error => {console.error(error.message);process.exitCode=1;});
module.exports = {buildConverter,buildFrontend};
