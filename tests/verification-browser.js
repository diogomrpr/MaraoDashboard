const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { captureSelected } = require('./verification-policy');

const captured = new WeakMap();
async function capture(subject, options) {
  // Pixel comparisons without a file remain assertions under every capture policy.
  if (!options.path) return subject.screenshot(options);
  const argv = process.argv.slice(2), value = key => argv.find(arg => arg.startsWith(key + '='))?.slice(key.length + 1) || (argv.includes(key) ? argv[argv.indexOf(key) + 1] : undefined);
  const policy = value('--screenshots') || 'failure', profile = value('--scenario') || 'iphone-normal';
  const owner = subject.page?.() || subject;
  const count = captured.get(owner) || 0, failure = /failure|failed/.test(path.basename(options.path));
  if (!captureSelected(policy, profile, { failure, representative: count < 2 })) return;
  const result = await subject.screenshot(options);
  if (!failure) captured.set(owner, count + 1);
  return result;
}

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
  const { readySubtree, emulationIssues, frontendRegistrationIssues, layoutIssues, inspectPopups } = require('./test-ha-dashboard-accessibility');
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
    await readySubtree(page, card, scenario, theme);
    const issues = await layoutIssues(page, families, await card.elementHandle());
    assert.deepEqual(issues, [], sample.config?.name || sample.tag);
  }
  assert.deepEqual(await emulationIssues(page, scenario, theme), []);
  assert.deepEqual(await frontendRegistrationIssues(page), []);
  if (options.popups) assert.deepEqual(await inspectPopups(page, scenario, theme, output, runName, options.screenshots, families, !options.geometryOnlyPopups, new Set(), options.popupHash), []);
  if (options.screenshots === 'review' || options.screenshots === 'all') {
    await locator.nth(samples[0].index).evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: path.join(output, runName + '-representative.png'), scale: 'css' });
  }
  return samples.length;
}

module.exports = { capture, artifactDirectory, inspectFocused, sampleKey, selectSamples };
