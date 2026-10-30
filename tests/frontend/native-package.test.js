import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
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
    const stableImage='MaraoAsset--brand--mark.svg';
    assert.ok(fs.readFileSync(path.join(directory,'dist',stableImage)).equals(fs.readFileSync('custom_components/marao_dashboard/frontend/brand/mark.svg')));
    for(const name of ['MaraoNativeCards.js','MaraoNativeCardEditor.js','MaraoNativeBootstrap.js','MaraoDashboardSettings.js','MaraoOrdinaryMigration.js']) assert.ok(fs.existsSync(path.join(directory,'dist',first.identity+'--'+name)),name+' must ship in the complete native graph');
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
    assert.ok(fs.readdirSync(path.join(directory,'dist'),{withFileTypes:true}).every(entry=>entry.isFile()));
    const {AssetURL}=await import(pathToFileURL(path.join(directory,'dist',first.identity+'--MaraoAssetURL.js')));
    const base=pathToFileURL(fs.realpathSync(asset)).href;
    for (const file of ['MaraoNativeCardEditor.js','MaraoOrdinaryMigration.js','MaraoNativeBootstrap.js','brand/mark.svg','fonts/Montserrat.ttf','MaraoTheme.js']) {
      const url=new AssetURL('./'+file+'?v=old',base);
      assert.equal(path.basename(url.pathname),first.identity+'--'+file.replaceAll('/','--'));
      assert.ok(fs.existsSync(url));assert.ok(url instanceof AssetURL);assert.ok(url instanceof URL);
    }
    assert.equal(new AssetURL('https://external.invalid/image.png',base).href,'https://external.invalid/image.png');
    assert.equal(new AssetURL(base).href,base);
    fs.writeFileSync(path.join(directory,'dist','obsolete.js'),'old');
    const second=await buildFrontend(directory);assert.equal(first.identity,second.identity);
    assert.equal(fs.existsSync(path.join(directory,'dist','obsolete.js')),false);
    assert.ok(fs.existsSync(path.join(directory,'dist',first.identity+'--fonts--OFL.txt')));
    const next=await buildFrontend(directory,'0.22.0-beta.2');assert.notEqual(next.identity,first.identity);
    assert.ok(fs.existsSync(path.join(directory,'dist',stableImage)),'Persisted ordinary image addresses survive a package identity change');
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'dist','MaraoFrontend.release.json'))).package_version,'0.22.0-beta.2');
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
test('Duplicate frontend entry points share one document runtime without mixing graph ownership', async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-runtime-owner-'));
  const previousWindow=globalThis.window, previousRegistry=globalThis.customElements;
  try {
    const entry=fs.readFileSync(new URL('../../custom_components/marao_dashboard/frontend/MaraoDashboard.js',import.meta.url),'utf8');
    fs.writeFileSync(path.join(directory,'MaraoNavigation.js'),'globalThis.nativeNavigationLoads=(globalThis.nativeNavigationLoads||0)+1;export const navigationLocalize=()=>"Error";export const findElements=()=>[];');
    fs.writeFileSync(path.join(directory,'MaraoRuntime.js'),'globalThis.nativeRuntimeLoads=(globalThis.nativeRuntimeLoads||0)+1;');
    globalThis.customElements={get:()=>true};globalThis.window={};
    const names=['a'.repeat(64)+'--MaraoDashboard.js','MaraoDashboard.js'];
    for (const name of names) fs.writeFileSync(path.join(directory,name),entry);
    const native=await import(pathToFileURL(path.join(directory,names[0])));
    const active=window.MaraoFrontendPackage;
    const legacy=await import(pathToFileURL(path.join(directory,names[1])));
    assert.equal(native.runtimeReady,legacy.runtimeReady);await native.runtimeReady;
    assert.equal(globalThis.nativeNavigationLoads,1);assert.equal(globalThis.nativeRuntimeLoads,1);
    assert.equal(window.MaraoFrontendPackage,active);assert.equal(active.identity,'a'.repeat(64));
  } finally {
    globalThis.window=previousWindow;globalThis.customElements=previousRegistry;
    delete globalThis.nativeNavigationLoads;delete globalThis.nativeRuntimeLoads;
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
