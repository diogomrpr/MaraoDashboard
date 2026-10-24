import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
test('supported runtime keeps generated elements without loading or advertising standalone authoring', async () => {
  for (const file of ['MaraoDashboard.js','MaraoRuntime.js','MaraoCards.js','MaraoFrigateEventsCard.js']) {
    const source = await fs.readFile(new URL('custom_components/marao_dashboard/frontend/'+file, root), 'utf8');
    assert.doesNotMatch(source, /import\([^\n]*MaraoNative|window\.customCards/);
  }
  const cards = await fs.readFile(new URL('custom_components/marao_dashboard/frontend/MaraoCards.js', root), 'utf8');
  assert.match(cards, /\["marao-card", MaraoCard\]/);
  for (const file of ['MaraoNativeCards.js','MaraoNativeCardEditor.js','MaraoNativeNavbar.js','MaraoNativeCatalog.js']) {
    await assert.rejects(fs.access(new URL('custom_components/marao_dashboard/frontend/'+file, root)), {code:'ENOENT'});
  }
});
