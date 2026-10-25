// Sync only the already registered native package; never create dashboards or reset fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const client = require('./client');
const quote = value => "'" + String(value).replace(/'/g,"'\\''") + "'";
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const rootGuard = base => '(test ! -L '+quote(base)+' || { test '+quote(base)+' = /config && test "$(readlink '+quote(base)+')" = /homeassistant && test ! -L /homeassistant; }) || exit 1';

async function nativeState(config,connect=client.connect) {
  const connection=await connect(config);
  try {
    assert.equal((await connection.call({type:'auth/current_user'})).is_admin,true,'Native preparation needs the disposable administrator');
    const dashboard=await connection.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});
    if (dashboard.strategy?.type !== 'custom:marao-dashboard') return null;
    const entries=await connection.call({type:'config_entries/get'});
    assert.ok(!entries.some(entry=>entry.domain==='marao_dashboard'),'Remove the legacy integration before native preparation');
    assert.ok(!entries.some(entry=>['frigate','unifiprotect','netatmo'].includes(entry.domain)),'Native preview requires safe provider fixtures');
    const resources=await connection.call({type:'lovelace/resources'});
    const owned=resources.filter(item=>/^\/hacsfiles\/[^/]+\/MaraoFrontend\.js(?:\?hacstag=\d+)?$/.test(item.url || ''));
    assert.equal(owned.length,1,'Register exactly one native Marao HACS resource before preparation');
    assert.equal(owned[0].type,'module','The native resource must be a JavaScript module');
    const folder=owned[0].url.split('/')[2];
    assert.match(folder,/^[a-zA-Z0-9_-]+$/,'Unsafe native resource folder');
    const {unwrapDocument}=await import('../custom_components/marao_dashboard/frontend/MaraoSource.js');
    const {source}=unwrapDocument(dashboard);
    assert.equal(source.pages.filter(page=>page.path==='card-test').length,1,'Keep one Cases view under the native dashboard');
    return {dashboard,folder};
  } finally {connection.close();}
}

async function prepareNativeFrontend(config,state,dependencies={}) {
  const {assertTarget,localHashes,frontendHashes,sameHashes,upload,buildEditor}=require('./prepare-frontend');
  assertTarget(config);
  assert.ok(!process.env.MARAO_BATCH_RECEIPT && !process.env.MARAO_UPGRADE_RECEIPT,'Native sync cannot replace preserved-install evidence');
  const root=dependencies.root || client.repoRoot, ssh=dependencies.ssh || require('./prepare').ssh, api=dependencies.api || client.api;
  const server=await api(config,'GET','/api/config');
  assert.equal(server.config_dir,config.remoteConfigPath);
  const {assertNativeSupport,convertDocument}=await import('../frontend_src/native-session.js');
  assertNativeSupport({config:server});
  const base=config.remoteConfigPath, community=base+'/www/community', destination=community+'/'+state.folder;
  const stage=community+'/.marao-native-'+crypto.randomUUID(), receipt=base+'/.marao-test-deployment.json';
  // The SSH add-on exposes Core's configured /config through this standard alias.
  const guard=()=>ssh(config,rootGuard(base)+'\n'+[base+'/www',community,destination,receipt,base+'/custom_components',base+'/custom_components/marao_dashboard'].map(file=>'test ! -L '+quote(file)+' || exit 1').join('\n')+'\n'+
    'test ! -e '+quote(base+'/custom_components/marao_dashboard')+' && test ! -e '+quote(base+'/.marao-upgrade-active.json')+' && test ! -L '+quote(base+'/.marao-upgrade-active.json'));
  guard();
  const preview=convertDocument(JSON.stringify(state.dashboard),{dashboardRoot:'marao-dashboard'});
  const editorIdentity=client.fingerprint(path.join(root,'frontend_src'));
  (dependencies.build || buildEditor)(root);
  const {buildFrontend}=require('../frontend_src/build-native.cjs');
  const candidate=await (dependencies.buildFrontend || buildFrontend)();
  const runtimeIdentity=client.fingerprint(path.join(root,'custom_components/marao_dashboard/frontend'));
  const frontendRoot=path.join(candidate.destination,'dist'), assets=localHashes(frontendRoot), installed=frontendHashes(config,destination,ssh);
  const documentBefore=JSON.stringify(state.dashboard), version=candidate.identity;
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'marao-native-sync-'));
  let staged=false;
  try {
    if (!sameHashes(installed,assets)) {
      fs.cpSync(frontendRoot,path.join(temporary,'frontend'),{recursive:true});
      const archive=path.join(temporary,'frontend.tar.gz');
      execFileSync('tar',['--no-xattrs','-czf',archive,'-C',temporary,'frontend'],{stdio:'pipe',env:{...process.env,COPYFILE_DISABLE:'1'}});
      guard();ssh(config,'umask 077 && mkdir '+quote(stage));staged=true;
      (dependencies.upload || upload)(config,archive,stage+'/frontend.tar.gz');
      ssh(config,'tar -xzf '+quote(stage+'/frontend.tar.gz')+' -C '+quote(stage));
      assert.ok(sameHashes(frontendHashes(config,stage+'/frontend',ssh),assets),'Native staging hashes differ');
      guard();assert.ok(sameHashes(frontendHashes(config,destination,ssh),installed),'Native package changed while staging');
      const backup=stage+'/frontend-before';
      const swapped=ssh(config,`set -e
restore_missing() { if test ! -e ${quote(destination)} && test -d ${quote(backup)}; then mv ${quote(backup)} ${quote(destination)} || exit 2; fi; }
trap restore_missing 0
trap 'exit 1' 1 2 15
mv ${quote(destination)} ${quote(backup)}
mv ${quote(stage+'/frontend')} ${quote(destination)}
trap - 0 1 2 15`,{allowFailure:true});
      assert.equal(swapped.status,0,swapped.status===2?'Native swap and recovery both failed':'Native frontend swap failed');
    }
    for (const name of ['MaraoFrontend.js','MaraoFrontend.release.json',version+'--MaraoNativeDashboard.js',version+'--MaraoDashboard.js',version+'--MaraoDashboardJsonWorker.js']) {
      const text=await api(config,'GET','/hacsfiles/'+state.folder+'/'+name,undefined,{text:true});
      assert.equal(hash(text),assets[name],'Served native asset is stale: '+name);
    }
    const current=await nativeState(config,dependencies.connect || client.connect);
    assert.ok(current && current.folder===state.folder,'Native registration changed during preparation');
    assert.ok(JSON.stringify(current.dashboard)===documentBefore,'Native source changed during preparation');
    assert.ok(sameHashes(frontendHashes(config,destination,ssh),assets),'Installed native assets changed during verification');
    assert.ok(sameHashes(localHashes(frontendRoot),assets),'Local native assets changed during verification');
    assert.equal(client.fingerprint(path.join(root,'frontend_src')),editorIdentity,'Editor source changed during native preparation');
    assert.equal(client.fingerprint(path.join(root,'custom_components/marao_dashboard/frontend')),runtimeIdentity,'Runtime source changed during native preparation');
    // Native sync owns no fixture or configuration content; retain previous receipt fields.
    const previous=ssh(config,'cat '+quote(receipt),{allowFailure:true});
    let saved={};if(previous.status===0) saved=JSON.parse(previous.stdout);
    const updated={...saved,target:require('./prepare').targetKey(config),mode:'native',frontend:version};
    if(JSON.stringify(saved)!==JSON.stringify(updated)) {
      const pending=base+'/.marao-native-receipt-'+crypto.randomUUID();
      guard();ssh(config,'umask 077 && cat > '+quote(pending),{input:JSON.stringify(updated)+'\n'});ssh(config,'mv '+quote(pending)+' '+quote(receipt));
    }
    if(staged) ssh(config,'rm -rf '+quote(stage));
    return {config,version,dashboard:current.dashboard,previewDashboard:preview.compiled,editorURL:'/marao-dashboard/'+preview.document.strategy.editor_path,frontendRoot,assets,installed:true,mode:'native'};
  } catch(error) {throw new Error(error.message+(staged?'; recovery data retained at '+stage:''));}
  finally {fs.rmSync(temporary,{recursive:true,force:true});}
}
async function syncNativeFixtures(config,dependencies={}) {
  const {assertTarget,upload,localHashes}=require('./prepare-frontend');assertTarget(config);
  assert.ok(!process.env.MARAO_BATCH_RECEIPT&&!process.env.MARAO_UPGRADE_RECEIPT,'Fixture sync cannot run inside preserved-install checks');
  const {ssh:remote,restart}=require('./prepare'),ssh=dependencies.ssh||remote;
  const root=dependencies.root||client.repoRoot,base=config.remoteConfigPath;
  const source=path.join(root,'ha-test/custom_components');
  const local=localHashes(source),files=Object.keys(local).filter(file=>file.endsWith('.py')||file.endsWith('/manifest.json'));
  const domains=[...new Set(files.map(file=>file.split('/')[0]))];
  assert.ok(domains.length&&domains.every(domain=>/^[a-z_]+$/.test(domain)));
  const guard=()=>ssh(config,'set -e\n'+rootGuard(base)+'\ntest ! -L '+quote(base+'/custom_components')+'\ntest ! -e '+quote(base+'/custom_components/marao_dashboard')+'\ntest ! -e '+quote(base+'/.marao-upgrade-active.json')+'\ntest ! -L '+quote(base+'/.marao-upgrade-active.json')+'\n'+domains.map(domain=>{
    const folder=base+'/custom_components/'+domain;
    return 'test ! -L '+quote(folder)+'\ntest -z "$(find '+quote(folder)+' -type l -print)"\n'+
      'test "$(cat '+quote(folder+'/marao-fixture.json')+')" = '+quote('{"owner":"marao-dashboard-tests"}');
  }).join('\n'));
  guard();
  const digest=file=>{const result=ssh(config,'sha256sum '+quote(base+'/custom_components/'+file),{allowFailure:true});return result.status===0?result.stdout.split(' ')[0]:null;};
  const changed=files.map(file=>({file,before:digest(file),after:local[file]})).filter(item=>item.before!==item.after);
  if(!changed.length)return {changed:false};
  const before=await nativeState(config,dependencies.connect||client.connect);assert.ok(before,'Fixture sync requires the migrated dashboard');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'marao-native-fixtures-')),stage=base+'/.marao-native-fixtures-'+crypto.randomUUID();
  try {
    for(const {file} of changed){const destination=path.join(temporary,'next',file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(source,file),destination);}
    const archive=path.join(temporary,'code.tar');execFileSync('tar',['--no-xattrs','-cf',archive,'-C',temporary,'next'],{stdio:'pipe',env:{...process.env,COPYFILE_DISABLE:'1'}});
    guard();ssh(config,'umask 077\nmkdir '+quote(stage));(dependencies.upload||upload)(config,archive,stage+'/code.tar');
    ssh(config,'tar -xf '+quote(stage+'/code.tar')+' -C '+quote(stage));
    for(const item of changed){
      guard();assert.equal(digest(item.file),item.before,'Fixture changed concurrently; recovery copy retained');
      const destination=base+'/custom_components/'+item.file,staged=stage+'/next/'+item.file;
      assert.equal(ssh(config,'sha256sum '+quote(staged)).stdout.split(' ')[0],item.after);
      const mode=item.before?ssh(config,'stat -c %a '+quote(destination)).stdout.trim():'644';assert.match(mode,/^[0-7]{3,4}$/);
      const saved=stage+'/before/'+item.file;
      ssh(config,'mkdir -p '+quote(path.posix.dirname(saved))+'\n'+(item.before?'cp -p '+quote(destination)+' '+quote(saved)+'\n':'')+'chmod '+mode+' '+quote(staged)+'\nmv '+quote(staged)+' '+quote(destination));
    }
    for(const item of changed){assert.equal(digest(item.file),item.after);assert.equal(hash(fs.readFileSync(path.join(source,item.file))),item.after,'Local fixture changed during sync');}
    await (dependencies.restart||restart)(config);
    const after=await nativeState(config,dependencies.connect||client.connect);
    assert.ok(JSON.stringify(after?.dashboard)===JSON.stringify(before.dashboard),'Fixture sync changed the native source');
    ssh(config,'rm -rf '+quote(stage));return {changed:true,files:changed.map(item=>item.file)};
  } catch(error){throw new Error(error.message+'; fixture recovery copies retained at '+stage);}
  finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
module.exports={nativeState,prepareNativeFrontend,syncNativeFixtures};
