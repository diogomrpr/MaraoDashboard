import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {applyTheme,releaseTheme} from '../../custom_components/marao_dashboard/frontend/MaraoTheme.js';
const {buildFrontend} = createRequire(import.meta.url)('../../frontend_src/build-native.cjs');

test('native theme stays scoped, switches modes and restores prior styles without erasing another writer', () => {
  globalThis.window = {MaraoFrontendPackage:{}};
  const values = new Map([['--primary-color',['pink','important']]]);
  const root = {style:{getPropertyValue:key=>values.get(key)?.[0] || '',getPropertyPriority:key=>values.get(key)?.[1] || '',setProperty:(key,value,priority='')=>values.set(key,[value,priority]),removeProperty:key=>values.delete(key)}};
  applyTheme(root,{themes:{darkMode:false}});assert.equal(values.get('--primary-color')[0],'#506F79');
  applyTheme(root,{themes:{darkMode:true}});assert.equal(values.get('--primary-color')[0],'#A6C2CB');
  values.set('--ha-card-background',['another owner','']);releaseTheme(root);
  assert.deepEqual(values.get('--primary-color'),['pink','important']);assert.equal(values.get('--ha-card-background')[0],'another owner');
  assert.equal(values.has('--marao-chart-1'),false);
  delete globalThis.window;
});
test('HACS staging has one complete dist graph, reproducible identity and no stale releases', async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-native-package-'));
  try {
    const first=await buildFrontend(directory);
    const asset=path.join(directory,'dist',first.identity+'--MaraoNativeDashboard.js');
    assert.ok(fs.existsSync(asset));assert.ok(fs.existsSync(path.join(directory,'dist','MaraoFrontend.js')));
    const manifest=JSON.parse(fs.readFileSync(path.join(directory,'dist','MaraoFrontend.release.json')));
    assert.equal(manifest.authoring,'MaraoAuthoring.json');
    const authoring=JSON.parse(fs.readFileSync(path.join(directory,'dist',manifest.authoring)));
    assert.equal(authoring.package_version,manifest.package_version);assert.equal(authoring.identity,manifest.identity);assert.equal(authoring.authoring_contract,1);
    for(const filename of Object.values(authoring.assets))assert.ok(manifest.files[filename],'Authoring payload must be hashed: '+filename);
    const descriptions=JSON.parse(fs.readFileSync(path.join(directory,'dist',authoring.assets.metadata)));
    assert.equal(descriptions.package_version,manifest.package_version);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,'dist',authoring.assets.schema))),descriptions.schema);
    const module=await import(pathToFileURL(path.join(directory,'dist',authoring.assets.module)));
    assert.equal(module.describeAuthoring().package_version,manifest.package_version);
    const cli=spawnSync(process.execPath,[path.join(directory,'dist',authoring.assets.cli),'describe'],{input:'',encoding:'utf8'});
    assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).package_version,manifest.package_version);
    assert.doesNotMatch(fs.readFileSync(path.join(directory,'dist','MaraoFrontend.js'),'utf8'),/import\([^)]*Authoring/);
    const stableImage='MaraoAsset--brand--mark.svg';
    assert.ok(fs.readFileSync(path.join(directory,'dist',stableImage)).equals(fs.readFileSync('custom_components/marao_dashboard/frontend/brand/mark.svg')));
    for(const name of ['MaraoNativeCardMetadata.js','MaraoNativeCards.js','MaraoNativeCardEditor.js','MaraoNativeBootstrap.js','MaraoDashboardSettings.js','MaraoOrdinaryMigration.js']) assert.ok(fs.existsSync(path.join(directory,'dist',first.identity+'--'+name)),name+' must ship in the complete native graph');
    for(const name of ['YAML.LICENSE.txt','ChartJS.LICENSE.txt','KurkleColor.LICENSE.txt','MaraoHistoryChart.js']) assert.ok(fs.existsSync(path.join(directory,'dist',first.identity+'--'+name)),name+' must remain available');
    assert.ok(Object.keys(manifest.files).every(file=>!/MaraoDashboardPanel|MaraoDashboardJson|MaraoDashboardEditorWorker|MonacoEditor|codicon-/.test(file)),'Retired builder/Monaco assets must not ship');
    const legacyModel=await import(pathToFileURL(path.join(directory,'dist',first.identity+'--MaraoNativeModel.js')));
    assert.deepEqual(Object.keys(legacyModel).sort(),['convertDocument','metadataSnapshot'],'Historical source support must not expose an active builder session');
    const published=path.resolve('dist/MaraoFrontend.release.json');
    if (fs.existsSync(published)) {
      assert.deepEqual(fs.readdirSync('dist').sort(),fs.readdirSync(path.join(directory,'dist')).sort(),'Published graph contains missing or obsolete assets');
      assert.deepEqual(JSON.parse(fs.readFileSync(published)),manifest,'Rebuild build:hacs before committing a release');
      assert.equal(JSON.parse(fs.readFileSync('hacs.json')).filename,'MaraoFrontend.js');
      for (const file of [...Object.keys(manifest.files),'MaraoFrontend.release.json']) assert.ok(fs.readFileSync(path.resolve('dist',file)).equals(fs.readFileSync(path.join(directory,'dist',file))),'Published asset differs: '+file);
    }

    for (const [file,hash] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(directory,'dist',file))).digest('hex'),hash);
    assert.equal(fs.existsSync(path.join(directory,'MaraoFrontend.js')),false);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'hacs.json'))).content_in_root,undefined);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'hacs.json'))).homeassistant,'2025.12.0');
    assert.equal(JSON.parse(fs.readFileSync('hacs.json')).homeassistant,'2025.12.0');
    assert.ok(fs.readdirSync(path.join(directory,'dist'),{withFileTypes:true}).every(entry=>entry.isFile()));
    const {AssetURL}=await import(pathToFileURL(path.join(directory,'dist',first.identity+'--MaraoAssetURL.js')));
    const {mediaApps,mediaAppLogoChoices}=await import(pathToFileURL(path.join(directory,'dist',first.identity+'--MaraoMediaApps.js')));
    assert.deepEqual(mediaAppLogoChoices().slice(1).map(choice=>choice.value),['netflix','spotify','youtube','disney-plus','prime-video','apple-tv','plex','meo','hbo-max','f1-tv']);
    const mediaBase=pathToFileURL(fs.realpathSync(path.join(directory,'dist',first.identity+'--MaraoCards.js'))).href;
    for(const app of mediaApps){const image=new AssetURL('./media-apps/'+(app.file||app.id+'.png'),mediaBase);assert.ok(fs.existsSync(image),app.id+' chooser image ships in the flat package');assert.equal(image.protocol,'file:');}
    const base=pathToFileURL(fs.realpathSync(asset)).href;
    const sourceDirectory = path.resolve('custom_components/marao_dashboard/frontend');
    const owned = JSON.parse(fs.readFileSync(path.join(sourceDirectory,'marao-owned-assets.json')));
    const mediaURLs = new Map();
    for (const file of owned.filter(name => /\.(?:svg|png|jpe?g|webp|gif|ttf|woff2?|ico)$/i.test(name))) {
      const digest = createHash('sha256').update(fs.readFileSync(path.join(sourceDirectory,file))).digest('hex');
      const flat = file.replaceAll('/','--');
      const name = digest+'--'+flat;
      const url = new AssetURL('./'+file+'?v=old#detail',base);
      assert.equal(path.basename(url.pathname),name,file+' URL must change with its bytes');
      assert.equal(url.search,'?v=old');assert.equal(url.hash,'#detail');
      assert.equal(manifest.files[name],digest);
      assert.equal(manifest.files['MaraoAsset--'+flat],digest,'Saved picture/font aliases still address the same bytes');
      mediaURLs.set(file,name);
    }
    const css = fs.readFileSync(path.join(directory,'dist',first.identity+'--MaraoFonts.css'),'utf8');
    const font = mediaURLs.get('fonts/Montserrat.woff2');
    assert.ok(css.includes(`url('${font}') format('woff2')`));
    assert.equal(fs.readFileSync(path.join(directory,'dist',font)).toString('ascii',0,4),'wOF2');
    assert.ok(fs.readFileSync(path.join(directory,'dist','MaraoAsset--fonts--Montserrat.ttf')).equals(fs.readFileSync('custom_components/marao_dashboard/frontend/fonts/Montserrat.ttf')));
    for (const file of ['MaraoNativeCardEditor.js','MaraoOrdinaryMigration.js','MaraoNativeBootstrap.js','MaraoTheme.js']) {
      const url=new AssetURL('./'+file+'?v=old#detail',base);
      assert.equal(path.basename(url.pathname),first.identity+'--'+file.replaceAll('/','--'));
      assert.equal(url.search,'?v=old');assert.equal(url.hash,'#detail');
      assert.ok(fs.existsSync(url));assert.ok(url instanceof AssetURL);assert.ok(url instanceof URL);
    }
    assert.equal(new AssetURL('https://external.invalid/image.png',base).href,'https://external.invalid/image.png');
    for (const unmanaged of ['./unregistered.js','./MaraoAsset--fonts--Montserrat.ttf','../MaraoCards.js']) {
      assert.equal(new AssetURL(unmanaged, base).href, new URL(unmanaged, base).href);
    }
    assert.equal(new AssetURL(base).href,base);
    fs.writeFileSync(path.join(directory,'dist','obsolete.js'),'old');
    const second=await buildFrontend(directory);assert.equal(first.identity,second.identity);
    assert.equal(fs.existsSync(path.join(directory,'dist','obsolete.js')),false);
    assert.ok(fs.existsSync(path.join(directory,'dist',first.identity+'--fonts--OFL.txt')));
    const next=await buildFrontend(directory,'0.22.0-beta.2');assert.notEqual(next.identity,first.identity);
    const nextBase = pathToFileURL(fs.realpathSync(path.join(directory,'dist',next.identity+'--MaraoNativeDashboard.js'))).href;
    const {AssetURL: NextURL} = await import(pathToFileURL(path.join(directory,'dist',next.identity+'--MaraoAssetURL.js')));
    for (const [file,name] of mediaURLs) {
      const url = new NextURL('./'+file,nextBase);
      assert.equal(path.basename(url.pathname),name,'Unchanged media must retain its URL through an upgrade: '+file);
      assert.ok(fs.existsSync(url));
    }
    assert.ok(fs.readFileSync(path.join(directory,'dist',next.identity+'--MaraoFonts.css'),'utf8').includes(`url('${font}')`));
    assert.ok(fs.existsSync(path.join(directory,'dist',stableImage)),'Persisted ordinary image addresses survive a package identity change');
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'dist','MaraoFrontend.release.json'))).package_version,'0.22.0-beta.2');
    const nextIndex=JSON.parse(fs.readFileSync(path.join(directory,'dist','MaraoAuthoring.json')));
    const nextCli=spawnSync(process.execPath,[path.join(directory,'dist',nextIndex.assets.cli),'describe'],{input:'',encoding:'utf8'});
    assert.equal(nextCli.status,0,nextCli.stderr);assert.equal(JSON.parse(nextCli.stdout).package_version,'0.22.0-beta.2');
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
test('a cached HACS loader hints only installed modules until a runtime owns the document', async t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-loader-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const loader=path.join(directory,'MaraoFrontend.js'), identity='a'.repeat(64);
  fs.copyFileSync(path.resolve('dist/MaraoFrontend.js'),loader);
  for(const file of ['MaraoNativeDashboard.js','MaraoDashboard.js']) fs.writeFileSync(path.join(directory,identity+'--'+file),'export {};');
  const resolver=identity+'--MaraoAssetURL.js';
  const original={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch};
  t.after(()=>Object.assign(globalThis,original));
  const hints=[],requests=[];
  let entryText='// Previously installed loader without an embedded release record';
  globalThis.fetch=async(url,options)=>{
    assert.equal(options.cache,'no-store');
    const file=path.basename(new URL(url).pathname);
    requests.push(file);
    if(file==='MaraoFrontend.js')return new Response(entryText);
    assert.equal(file,'MaraoFrontend.release.json');
    return Response.json({compiler_contract:1,identity,files:{[resolver]:'checksum'}});
  };
  globalThis.window={};
  globalThis.document={createElement:()=>({}),head:{append:link=>hints.push([link.rel,path.basename(new URL(link.href).pathname)])}};
  await import(pathToFileURL(loader));
  assert.deepEqual(hints,[['modulepreload',resolver]],'An older install can omit newer bootstrap modules');
  window.MaraoDashboardRuntime={};
  await import(pathToFileURL(loader).href+'?second-registration');
  assert.equal(hints.length,1,'A second resource keeps the active graph');
  assert.deepEqual(requests,['MaraoFrontend.js','MaraoFrontend.release.json','MaraoFrontend.js','MaraoFrontend.release.json']);
  const meta=JSON.parse(fs.readFileSync(path.resolve('dist/MaraoFrontend.release.json')));
  entryText=fs.readFileSync(path.resolve('dist/MaraoFrontend.js'),'utf8');
  const readRelease=window.MaraoInstalledFrontendPackage.readRelease;
  requests.length=0;
  const current=await readRelease();
  assert.equal(current.identity,meta.identity);
  assert.equal(current.package_version,meta.package_version);
  assert.ok(current.preload.every(file=>Object.hasOwn(meta.files,meta.identity+'--'+file)));
  const different='b'.repeat(64);
  entryText=entryText.replace(meta.identity,different);
  assert.equal((await readRelease()).identity,different,'Same-length replacement is visible on the next check');
  entryText=entryText.replace(different,'invalid');
  await assert.rejects(readRelease(),/Invalid Marao frontend identity/);
  assert.deepEqual(requests,Array(3).fill('MaraoFrontend.js'),'Reads the current release record without downloading the hash inventory');
});

test('Duplicate frontend entry points share one document runtime without mixing graph ownership', async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-runtime-owner-'));
  const previousWindow=globalThis.window, previousRegistry=globalThis.customElements, previousDocument=globalThis.document;
  const preloads=[];
  const runtimeGate=Promise.withResolvers(),runtimeStarted=Promise.withResolvers();
  try {
    const entry=fs.readFileSync(new URL('../../custom_components/marao_dashboard/frontend/MaraoDashboard.js',import.meta.url),'utf8');
    fs.writeFileSync(path.join(directory,'MaraoNavigation.js'),'globalThis.nativeNavigationLoads=(globalThis.nativeNavigationLoads||0)+1;export const navigationLocalize=()=>"Error";export const findElements=()=>[];');
    fs.writeFileSync(path.join(directory,'MaraoCards.js'),'export function registerMaraoCards(){globalThis.nativeBasicRegistrations=(globalThis.nativeBasicRegistrations||0)+1;}');
    for(const name of ['MaraoFloorPlanCard.js','MaraoSchedules.js','MaraoFrigateEventsCard.js']) {
      fs.writeFileSync(path.join(directory,name),'globalThis.firstSpecialtyRegistration ??= globalThis.nativeCardLoads || 0;');
    }
    fs.writeFileSync(path.join(directory,'MaraoNativeCards.js'),'globalThis.nativeCardLoads=(globalThis.nativeCardLoads||0)+1;');
    fs.writeFileSync(path.join(directory,'MaraoRuntime.js'),'globalThis.nativeRuntimeLoads=(globalThis.nativeRuntimeLoads||0)+1;globalThis.nativeRuntimeStarted.resolve();await globalThis.nativeRuntimeGate;');
    globalThis.nativeRuntimeGate=runtimeGate.promise;globalThis.nativeRuntimeStarted=runtimeStarted;
    globalThis.customElements={get:()=>true};globalThis.window={};
    globalThis.document={createElement:()=>({}),head:{append:link=>preloads.push([link.rel,path.basename(new URL(link.href).pathname)])}};
    const names=['a'.repeat(64)+'--MaraoDashboard.js','MaraoDashboard.js'];
    for (const name of names) fs.writeFileSync(path.join(directory,name),entry);
    const native=await import(pathToFileURL(path.join(directory,names[0])));
    const active=window.MaraoFrontendPackage;
    const legacy=await import(pathToFileURL(path.join(directory,names[1])));
    assert.equal(native.runtimeReady,legacy.runtimeReady);
    await runtimeStarted.promise;
    assert.deepEqual(preloads,[['modulepreload','MaraoCardRendering.js'],['modulepreload','MaraoNativeCards.js']],
      'One owner hints the two unconditional dependencies before specialty registration');
    assert.equal(globalThis.nativeBasicRegistrations,1,'Basic cards register before a delayed runtime download completes');
    assert.equal(globalThis.nativeCardLoads,1);
    runtimeGate.resolve();await native.runtimeReady;
    assert.equal(globalThis.firstSpecialtyRegistration,1,'Ordinary card adapters can render before specialty modules begin evaluating');
    assert.equal(globalThis.nativeNavigationLoads,1);assert.equal(globalThis.nativeRuntimeLoads,1);
    assert.equal(window.MaraoFrontendPackage,active);assert.equal(active.identity,'a'.repeat(64));
  } finally {
    globalThis.window=previousWindow;globalThis.customElements=previousRegistry;globalThis.document=previousDocument;
    runtimeGate.resolve();
    for(const key of ['firstSpecialtyRegistration','nativeNavigationLoads','nativeRuntimeLoads','nativeBasicRegistrations','nativeCardLoads','nativeRuntimeGate','nativeRuntimeStarted'])delete globalThis[key];
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
