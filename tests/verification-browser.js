const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function artifactDirectory(name) {
  const base = process.env.MARAO_TEST_ARTIFACT_ROOT;
  if (base) assert.ok(path.isAbsolute(base), 'Job artifacts require an absolute path');
  const directory = path.join(base || path.join(__dirname, '.artifacts'), name);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

function sampleKey(card) {
  const options = card.config?.variables || {};
  return JSON.stringify([card.config?.template || card.tag, card.state,
    Object.entries(options).filter(([, value]) => typeof value === 'boolean').sort(),
    Object.entries(options).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length]).sort(),
    String(card.config?.name || '').length > 35, !!card.config?.variables?.popup_hash,
    card.config?.entity_group?.domain, card.config?.entity_group?.popup_filter]);
}

function selectSamples(cards, families = []) {
  const seen = new Set();
  return cards.filter(card => {
    if (families.length && !families.includes(card.config?.template || card.tag)) return false;
    const key = sampleKey(card);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

async function inspectFocused(page, options, scenario, theme, output, runName) {
  const { applyVisualPreferences, emulationIssues, frontendRegistrationIssues, layoutIssues, inspectPopups } = require('./test-ha-dashboard-accessibility');
  const locator = page.locator('marao-card,marao-state-timeline-card,marao-energy-period-card,marao-camera-events-card,marao-frigate-events-card');
  const cards = await locator.evaluateAll(elements => elements.map((card, index) => ({ index, config: card._config, tag: card.localName,
    state: card._hass?.states?.[card._config?.entity]?.state })));
  const samples = selectSamples(cards, options.families);
  assert.ok(samples.length, 'Selected families have no rendered safe examples');
  const families = options.families?.length ? options.families : [...new Set(samples.map(card => card.config?.template || card.tag))];
  for (const sample of samples) {
    const card = locator.nth(sample.index);
    await card.evaluate(async element => {
      await element.shadowRoot?.querySelector('ha-card')?.updateComplete;
      element.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await applyVisualPreferences(page, scenario, theme);
    const issues = [...await emulationIssues(page, scenario, theme), ...await layoutIssues(page, families)];
    assert.deepEqual(issues, [], sample.config?.name || sample.tag);
  }
  assert.deepEqual(await frontendRegistrationIssues(page), []);
  if (options.popups) assert.deepEqual(await inspectPopups(page, scenario, theme, output, runName, options.screenshots, families, !options.geometryOnlyPopups, new Set(), options.popupHash), []);
  if (options.screenshots === 'review' || options.screenshots === 'all') {
    await locator.nth(samples[0].index).evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: path.join(output, runName + '-representative.png'), scale: 'css' });
  }
  return samples.length;
}

module.exports = { artifactDirectory, inspectFocused, sampleKey, selectSamples };
