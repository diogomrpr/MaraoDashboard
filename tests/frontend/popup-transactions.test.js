import test from 'node:test';
import assert from 'node:assert/strict';
import {commitPopupDocument,reconcilePopupTransaction} from '../../custom_components/marao_dashboard/frontend/MaraoPopupTransaction.js';
function fixture(){
  const original={views:[{path:'home',sections:[]}],future:{keep:[]}},proposed={...structuredClone(original),title:'New'},records=new Map(),writes=[];let saved=original,current=true;
  const journal={async read(key){return records.get(key);},async stage(key,value){if(records.has(key))throw Error('Pending');records.set(key,structuredClone(value));},async clear(key,id){if(records.get(key)?.id===id)records.delete(key);}};
  const hass={user:{id:'admin',is_admin:true},connected:true,async callWS(){return structuredClone(saved);}};
  const root={lovelace:{mode:'storage',config:original,async saveConfig(next){writes.push(next);saved=structuredClone(next);this.config=next;}}};
  const context={hass,root,path:'marao-dashboard',origin:'http://safe.test',isCurrent:()=>current,journal};
  return {original,proposed,context,records,writes,journal,set saved(value){saved=value;},set current(value){current=value;}};
}
test('popup transactions retain exact internal data until verified and no-op updates do no I/O',async()=>{
  const f=fixture();let staged;
  const save=f.context.root.lovelace.saveConfig;f.context.root.lovelace.saveConfig=async next=>{staged=structuredClone([...f.records.values()][0]);await save.call(f.context.root.lovelace,next);};
  await commitPopupDocument(f.context,f.original,f.proposed);assert.deepEqual(staged.original,f.original);assert.deepEqual(staged.proposed,f.proposed);assert.equal(f.records.size,0);assert.equal(f.writes.length,1);
  const noop=fixture();noop.journal.read=()=>assert.fail('No-op must not access journal');assert.deepEqual(await commitPopupDocument(noop.context,noop.original,noop.original),noop.original);
});
test('staging, authorization and post-staging stale checks prevent writes',async()=>{
  for(const mode of ['storage','admin','stale','dirty']) {
    const f=fixture();
    if(mode==='storage')f.journal.stage=async()=>{throw Error('Storage failed');};
    if(mode==='admin')f.context.hass.user.is_admin=false;
    if(mode==='dirty')f.context.root.lovelace.config={...f.original,title:'Draft'};
    if(mode==='stale'){const stage=f.journal.stage;f.journal.stage=async(...args)=>{await stage(...args);f.current=false;};}
    await assert.rejects(commitPopupDocument(f.context,f.original,f.proposed));assert.equal(f.writes.length,0);assert.equal(f.records.size,0);
  }
});
test('lost acknowledgements use readback once, while original and ambiguous results stay distinct',async()=>{
  const committed=fixture();committed.context.root.lovelace.saveConfig=async next=>{committed.writes.push(next);committed.saved=next;throw Error('Lost ack');};
  await commitPopupDocument(committed.context,committed.original,committed.proposed);assert.equal(committed.writes.length,1);assert.equal(committed.records.size,0);
  const failed=fixture();failed.context.root.lovelace.saveConfig=async next=>{failed.writes.push(next);throw Error('Rejected');};
  await assert.rejects(commitPopupDocument(failed.context,failed.original,failed.proposed),/not saved/);assert.equal(failed.records.size,0);assert.equal(failed.writes.length,1);
  const unknown=fixture();unknown.context.root.lovelace.saveConfig=async next=>{unknown.writes.push(next);unknown.saved={...next,future:'Concurrent'};};
  await assert.rejects(commitPopupDocument(unknown.context,unknown.original,unknown.proposed),error=>error.code==='popup_uncertain');assert.equal(unknown.records.size,1);assert.equal(unknown.writes.length,1);
  await assert.rejects(reconcilePopupTransaction(unknown.context,{views:[]}),/could not be confirmed/);assert.equal(unknown.records.size,1);assert.equal(unknown.writes.length,1);
  await reconcilePopupTransaction(unknown.context,unknown.proposed);assert.equal(unknown.records.size,0);
});
test('pending transactions are partitioned by origin, user and dashboard and an active root rejects duplicate writes',async()=>{
  const f=fixture();let release;const wait=new Promise(resolve=>{release=resolve;});
  f.context.root.lovelace.saveConfig=async next=>{f.writes.push(next);await wait;f.saved=next;};
  const first=commitPopupDocument(f.context,f.original,f.proposed);await Promise.resolve();await Promise.resolve();await Promise.resolve();
  await assert.rejects(commitPopupDocument(f.context,f.original,f.proposed),/already pending/);
  const key=[...f.records.keys()][0];assert.deepEqual(JSON.parse(key),['http://safe.test','admin','marao-dashboard']);
  release();await first;assert.equal(f.writes.length,1);
});
