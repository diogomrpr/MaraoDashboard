import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { archiveFromBackup, detachMigrationProvenance, readMigrationArchive, restoreMigrationProvenance } from '../../frontend_src/migration-archive.js';
import { compactMigrationProvenance } from '../../frontend_src/ordinary-provenance.js';
import { classifyRecovery, createRecoveryExport, prepareArchivedConversion, validateRecoveryExport } from '../../frontend_src/ordinary-model.js';

const originalSource = '{\n "name":"café", "pages":[]\n}\r\n';
const source = {version:1, source_kind:'strategy', source_version:2, original_source:originalSource,
  original_document:{constraint:[],strategy:{source_json:originalSource}}, supplements:[], yaml:[{text:'# untouched\r\n'}],
  accounting:[{source:'$.name',disposition:'provenance'},{source:'$.pages',disposition:'provenance'},{target:'$.views[0].title',future:null}],
  future:{ ordered:['z','a'], nullable:null }};
const document = migration => ({title:'An edited dashboard', views:[{path:'a',cards:[],future:false}],
  marao:{version:1,navbar:{routes:[]},migration}, extra:{order:[4, 0], untouched:false}});
const root = 'existing-dashboard';
const wireCopy = value => JSON.parse(JSON.stringify(value));

test('v1 and v2 origins survive detach, fresh-load verification and restore to the current edited dashboard', async () => {
  for (const origin of [source, compactMigrationProvenance(source)]) {
    const native = document(origin), bytes = JSON.stringify(native);
    const detached = await detachMigrationProvenance(native), reference = detached.document.marao.migration;
    assert.deepEqual(reference, {version:3,sha256:createHash('sha256').update(JSON.stringify(origin)).digest('hex'),
      bytes:Buffer.byteLength(JSON.stringify(origin))});
    assert.equal(JSON.stringify(native), bytes);
    assert.doesNotMatch(JSON.stringify(detached.document), /original_source|provenance|untouched\\r/);
    const archive = wireCopy(detached.archive);
    assert.equal(JSON.stringify(await readMigrationArchive(reference,archive)),JSON.stringify(origin));
    const edited = {...detached.document, title:'New title', views:[{path:'two',cards:[]}]};
    assert.equal(JSON.stringify(await restoreMigrationProvenance(edited,archive)),
      JSON.stringify({...native,title:edited.title,views:edited.views}));
    const alreadyDetached = await prepareArchivedConversion(JSON.stringify(detached.document));
    assert.equal(alreadyDetached.changed,false);
    assert.equal(alreadyDetached.archive,null);
    assert.deepEqual(alreadyDetached.document,detached.document);
    const stable = await detachMigrationProvenance(detached.document);
    assert.equal(stable.archive,null);
    assert.equal(stable.document,detached.document);
    const staged = await prepareArchivedConversion(bytes, {dashboardRoot:root});
    assert.equal(JSON.stringify(staged.archive.record),JSON.stringify(origin));
    const receipt = await createRecoveryExport(staged);
    assert.equal(receipt.version,2);
    assert.equal(await validateRecoveryExport(receipt),receipt);
    for (const file of [archive,receipt,origin,native,document(source),source,{data:{config:native}},
      {kind:'marao-native-conversion',version:1,proposed_document:native}]) {
      assert.deepEqual(await archiveFromBackup(reference,file),archive);
    }
    const legacy = {original_document:{strategy:{}},proposed_document:document(source)};
    assert.equal(classifyRecovery(detached.document,legacy),'converted');
    assert.equal(classifyRecovery(edited,legacy),'divergent');
    assert.equal(classifyRecovery(native,receipt),'original');
    assert.equal(classifyRecovery(detached.document,receipt),'converted');
    const damaged=wireCopy(receipt);
    damaged.migration_archive.record.yaml[0].text='# corrupted\r\n';
    await assert.rejects(validateRecoveryExport(damaged));
    await assert.rejects(archiveFromBackup(reference,{...archive,version:2}));
    await assert.rejects(readMigrationArchive({...reference,bytes:reference.bytes+1},archive));
    await assert.rejects(readMigrationArchive({...reference,url:'https://example.invalid'},archive));
    await assert.rejects(readMigrationArchive(reference,{...archive,record:{...origin,source_kind:'unknown'}}));
  }
});

test('absent and newer origins stay untouched, malformed known origins are never detached', async () => {
  for (const origin of [undefined,{version:99,opaque:null}]) {
    const native = document(origin);
    const result = await detachMigrationProvenance(native);
    assert.equal(result.document,native);
    assert.equal(result.archive,null);
  }
  await assert.rejects(detachMigrationProvenance(document({...source,original_document:null})));
  await assert.rejects(detachMigrationProvenance(document({version:3,sha256:'x',bytes:1})));
});
