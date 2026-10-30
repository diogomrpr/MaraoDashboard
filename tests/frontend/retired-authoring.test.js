import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
test('native authoring has one catalog owner while shared renderers and legacy conversion remain available', async () => {
  for (const file of ['MaraoDashboard.js','MaraoCards.js','MaraoFrigateEventsCard.js']) {
    const source = await fs.readFile(new URL('custom_components/marao_dashboard/frontend/'+file, root), 'utf8');
    assert.doesNotMatch(source, /window\.customCards/,'Named native picker entries belong to the shared catalog adapter');
  }
  const cards = await fs.readFile(new URL('custom_components/marao_dashboard/frontend/MaraoCards.js', root), 'utf8');
  assert.match(cards, /\["marao-card", MaraoCard\]/);
  const runtime=await fs.readFile(new URL('custom_components/marao_dashboard/frontend/MaraoRuntime.js',root),'utf8');
  assert.match(runtime,/MaraoNativeCards\.js/);
  const native=await fs.readFile(new URL('frontend_src/native-cards.js',root),'utf8');
  assert.match(native,/window\.customCards/);assert.match(native,/if \(picker && !entry\.hidden/);
  const legacy=await fs.readFile(new URL('frontend_src/legacy-model.js',root),'utf8');
  assert.match(legacy,/convertDocument/);assert.doesNotMatch(legacy,/NativeSession|MaraoDashboardPanel|json-editor/);
  for (const file of ['MaraoNativeNavbar.js','MaraoNativeCatalog.js','MaraoDashboardPanel.js','MaraoDashboardPanel.css',
    'MaraoDashboardJsonEditor.js','MaraoDashboardJsonPreparation.js','MaraoDashboardEditorWorker.js','MaraoDashboardJsonWorker.js','MonacoEditor.LICENSE.txt']) {
    await assert.rejects(fs.access(new URL('custom_components/marao_dashboard/frontend/'+file, root)), {code:'ENOENT'});
  }
  for (const file of ['MaraoNativeCards.js','MaraoNativeCardEditor.js','MaraoNativeBootstrap.js','MaraoOrdinaryMigration.js']) {
    await fs.access(new URL('custom_components/marao_dashboard/frontend/'+file,root));
  }
});
