// Native HA transport proof for the disposable synthetic camera only. Controlled
// wrapper faults below are labelled explicitly; they are not a real codec,
// Protect permission, or Safari autoplay-policy failure.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function waitForCameraOutcome(page, card) {
  const observation = await page.waitForFunction(card => {
    const camera = card._camera;
    return ['live', 'blocked', 'error', 'snapshot'].includes(camera?.state)
      ? { state: camera.state, feedback: camera.feedback.textContent } : false;
  }, card, { timeout: 35000 });
  try { return await observation.jsonValue(); }
  finally { await observation.dispose(); }
}

function observeNativeCamera({ card, probe, captureBaseline = false, metadata = false, action }) {
  const camera = card._camera, surface = card.shadowRoot.querySelector('ha-card'), config = JSON.stringify(card._config);
  const currentHass = () => camera.hass === card.hass && camera.player.hass === camera.nativeHass
    && camera.nativeHass.states === card.hass.states && camera.nativeHass.connection === camera.signaling;
  const streams = globalThis.window?.__maraoCameraRequestTrace?.streamRequests ?? null;
  const rootsOf = node => {
    const roots = [node], seen = new Set(roots);
    for (let index = 0; index < roots.length; index++) for (const element of [roots[index], ...roots[index].querySelectorAll('*')])
      if (element.shadowRoot && !seen.has(element.shadowRoot)) { seen.add(element.shadowRoot); roots.push(element.shadowRoot); }
    return roots;
  };
  const ancestor = (node, tag) => { for (; node; node = node.parentNode || node.host) if (node.localName === tag) return node; };
  const visible = node => {
    if (!node?.isConnected) return false;
    for (; node && node !== camera.player; node = node.parentNode || node.host)
      if (node.nodeType === 1 && (node.hidden || getComputedStyle(node).display === 'none' || getComputedStyle(node).visibility === 'hidden')) return false;
    return node === camera.player;
  };
  const assertOwner = baseline => {
    if (!baseline || camera !== baseline.camera || camera.player !== baseline.player || camera.generation !== baseline.generation
      || surface !== baseline.surface || config !== baseline.config) throw Error('Native camera owner/configuration changed during metadata proof');
    if (!Number.isInteger(baseline.streams) || streams !== baseline.streams) throw Error('Metadata proof requires unchanged native stream requests');
    if (!currentHass() || camera.player.stateObj !== card.hass.states[card._config.entity]) throw Error('Native camera retained stale HA data');
  };
  if (probe && (camera?.player !== probe.host || camera?.generation !== probe.generation)) throw Error('Native camera owner changed during progress observation');
  if (!camera?.player) return false;
  const transports = [...new Set(rootsOf(camera.player).flatMap(root => [...root.querySelectorAll('ha-hls-player,ha-web-rtc-player')]))];
  const candidates = transports.filter(transport => transport.entityid === card._config.entity && ancestor(transport, 'ha-camera-stream') === camera.player)
    .flatMap(transport => [...new Set(rootsOf(transport).flatMap(root => [...root.querySelectorAll('video')]))]
      .filter(video => ancestor(video, transport.localName) === transport && ancestor(video, 'ha-camera-stream') === camera.player).map(video => ({ transport, video })));
  const video = camera.video, selected = candidates.find(candidate => candidate.video === video);
  if (action === 'update-metadata') {
    const initial = card.__nativeProof; assertOwner(initial);
    if (!selected || !video.isConnected || !selected.transport.isConnected) throw Error('Metadata boundary has no current owned native video');
    if (initial.metadata) throw Error('Metadata boundary inventory must not be replaced');
    const baseline = initial.metadata = { camera, player: camera.player, generation: camera.generation, surface, config, video,
      transport: selected.transport, candidates, streams };
    const source = document.querySelector('home-assistant').hass, entity = card._config.entity;
    const picture = source.states[entity].attributes.entity_picture.split('#')[0] + '#marao-poster-proof';
    for (let index = 0; index < 3; index++) card.hass = { ...source, themes: { ...source.themes }, language: index ? 'pt' : 'en',
      locale: { ...source.locale, language: index ? 'pt' : 'en' }, states: { ...source.states, [entity]: { ...source.states[entity], attributes: { ...source.states[entity].attributes,
        friendly_name: 'Safe native metadata ' + index, entity_picture: picture } } } };
    card.hass = { ...card.hass, unrelatedNativeProof: true };
    const after = card._camera;
    if (after !== camera || after.player !== baseline.player || after.generation !== baseline.generation || after.video !== video
      || ancestor(after.video, selected.transport.localName) !== selected.transport || card.shadowRoot.querySelector('ha-card') !== surface
      || JSON.stringify(card._config) !== config || globalThis.window.__maraoCameraRequestTrace.streamRequests !== streams)
      throw Error('Ordinary metadata synchronously replaced native playback');
    if (!currentHass() || after.player.stateObj !== card.hass.states[entity]) throw Error('Native camera retained stale HA data');
    return { synchronousIdentityRetained: true, candidates: candidates.map(candidate => ({ type: candidate.transport.localName, selected: candidate.video === video,
      visible: visible(candidate.video), time: candidate.video.currentTime, paused: candidate.video.paused, readyState: candidate.video.readyState })) };
  }
  const baseline = metadata || action === 'verify-metadata-owner' ? card.__nativeProof?.metadata : null;
  if (baseline) {
    assertOwner(baseline);
    if (video && !baseline.candidates.some(candidate => candidate.video === video && candidate.transport === selected?.transport))
      throw Error('Metadata selected a newly created or foreign native video/transport');
  } else if (metadata || action === 'verify-metadata-owner') throw Error('Missing immutable metadata boundary');
  if (action === 'verify-metadata-owner') return { ownerRetained: true, streamsRetained: true };
  if (!video) return false;
  if (video !== probe.video) { probe.video = video; probe.before = video.currentTime; }
  if (!selected || !selected.transport.isConnected || !visible(video) || video.paused || video.readyState < 2
    || camera.state !== 'live' || !(video.currentTime > probe.before + .15)) return false;
  if (captureBaseline) card.__nativeProof = { camera, player: camera.player, generation: camera.generation, surface, config, video,
    transport: selected.transport, candidates, streams };
  return { before: probe.before, time: video.currentTime, muted: video.muted, inline: video.playsInline, controls: video.controls,
    selectedTransport: selected.transport.localName, candidateCount: candidates.length,
    metadataIdentity: baseline ? (video === baseline.video ? 'retained-video' : 'preexisting-native-candidate') : undefined,
    posterHidden: camera.poster.hidden, hosts: camera.stage.querySelectorAll('ha-camera-stream').length,
    nativeTransports: [...new Set(transports.map(node => node.localName))],
    emptyNativePoster: transports.every(node => node.posterUrl === ''), emptyVideoPoster: video.getAttribute('poster') === '',
    currentMaraoPoster: camera.poster.getAttribute('src') === camera.picture,
    isolatedSignaling: camera.signaling?.shared === card.hass.connection && camera.signaling !== card.hass.connection
      && [...camera.signaling.sessions].every(session => !session.connection || session.connection !== card.hass.connection),
    currentHass: currentHass(), currentEntity: camera.player.stateObj === card.hass.states[card._config.entity] };
}

async function waitForCameraAdvance(page, card, { captureBaseline = false, metadata = false } = {}) {
  const probe = await page.evaluateHandle(card => ({ host: card._camera.player, generation: card._camera.generation,
    video: card._camera.video, before: card._camera.video?.currentTime }), card);
  let observation;
  try {
    observation = await page.waitForFunction(observeNativeCamera, { card, probe, captureBaseline, metadata }, { timeout: 5000 });
    return await observation.jsonValue();
  } finally {
    try { await observation?.dispose(); }
    finally { await probe.dispose(); }
  }
}

function removeNativeDuplicates(card) {
  const retained = { camera: card._camera, player: card._camera.player, generation: card._camera.generation };
  card.__duplicate.remove(); card.__preview.remove();
  if (card._camera !== retained.camera || card._camera.player !== retained.player || card._camera.generation !== retained.generation)
    throw Error('Removing another occurrence replaced the main native session');
  return retained;
}

async function checkNativeCameraPlayback(page, serviceCalls, { output, scenario = 'iphone-normal', theme = 'light', geometryOnly = false, observeFailureMs = 0 } = {}) {
  assert.equal(new URL(page.url()).hostname, '192.168.0.28', 'Disposable native camera proof only');
  const entity = 'camera.marao_dashboard_test_camera';
  const card = page.locator('marao-card').filter({ has: page.locator('.title', { hasText: /^Camera · automatic live video \+ events$/ }) }).first();
  assert.equal(await card.evaluate(card => card._config.entity), entity, 'Only safe synthetic camera media may be inspected');
  const handle = await card.elementHandle(), servicesBefore = serviceCalls.length;
  const began = Date.now(), phases = []; let phase = 'initial camera readiness';
  const mark = label => { phase = label; phases.push({ label, elapsedMs: Date.now() - began }); };
  const release = (label, action, options) => { mark(label); return page.__cameraRequestLedger ? page.__cameraRequestLedger.boundary(label, action, options) : action(); };
  const resume = () => page.__cameraRequestLedger?.resume();
  const evidence = { target: 'disposable synthetic camera', scenario, theme, engine: page.context().browser().browserType().name(), emulation: page.__maraoEmulationEvidence, phases, faults: [], readings: [] };
  const snapshot = () => card.evaluate(card => {
    const ids = window.__maraoCameraDiagnosticIds ||= { map: new WeakMap(), next: 0 };
    const id = node => { if (!node) return null; if (!ids.map.has(node)) ids.map.set(node, ++ids.next); return ids.map.get(node); };
    const camera = card._camera, roots = camera?.player ? [camera.player] : [], seen = new Set(roots);
    for (let index = 0; index < roots.length; index++) for (const node of [roots[index], ...roots[index].querySelectorAll('*')]) if (node.shadowRoot && !seen.has(node.shadowRoot)) { seen.add(node.shadowRoot); roots.push(node.shadowRoot); }
    const nativeVideos = roots.flatMap(root => [...root.querySelectorAll('video')]).map(video => {
      let visible = true, transport;
      for (let node = video; node && node !== camera.player; node = node.parentNode || node.host) if (node.nodeType === 1) {
        if (node.localName === 'ha-hls-player' || node.localName === 'ha-web-rtc-player') transport = node;
        const style = getComputedStyle(node); if (node.hidden || style.display === 'none' || style.visibility === 'hidden') visible = false;
      }
      return { id: id(video), transport: transport?.localName, transportId: id(transport), visible, width: video.getBoundingClientRect().width, height: video.getBoundingClientRect().height,
        time: video.currentTime, paused: video.paused, readyState: video.readyState, networkState: video.networkState, ended: video.ended, seeking: video.seeking, errorCode: video.error?.code || null,
        tracks: [...(video.srcObject?.getTracks?.() || [])].map(track => ({ kind: track.kind, enabled: track.enabled, muted: track.muted, readyState: track.readyState })) };
    });
    return { state: camera?.state, generation: camera?.generation, lastTime: camera?.lastTime, advanced: camera?.advanced, documentHidden: document.hidden,
      connected: card.isConnected, eligible: camera?.eligible(), wrapperId: id(card), hostId: id(camera?.player), videoId: id(camera?.video),
      baselineHostId: id(card.__nativeProof?.player), baselineVideoId: id(card.__nativeProof?.video), streamRequests: window.__maraoCameraRequestTrace?.streamRequests, nativeVideos };
  });
  const waitStill = () => page.waitForFunction(card => card._camera?.poster.complete && card._camera.poster.naturalWidth > 0
    && card._camera.poster.getAttribute('src') === card._camera.picture, handle, { timeout: 5000 });
  const waitLive = async () => {
    const { state, feedback } = await waitForCameraOutcome(page, handle);
    if (state === 'blocked') {
      evidence.faults.push('Actual browser autoplay rejection; native video resumed through its standard user-gesture play()');
      await card.locator('.camera-feedback button').tap();
    } else assert.equal(state, 'live', feedback);
    await page.waitForFunction(card => card._camera?.state === 'live', handle, { timeout: 35000 });
  };
  const moving = async (label, options) => {
    mark(label);
    const reading = await waitForCameraAdvance(page, handle, options);
    assert.equal(reading.muted, true); assert.equal(reading.inline, true); assert.equal(reading.controls, false);
    assert.equal(reading.posterHidden, true); assert.equal(reading.hosts, 1); assert.ok(reading.nativeTransports.length, 'Use actual HA transport elements rather than contract doubles');
    assert.equal(reading.currentHass, true); assert.equal(reading.currentEntity, true);
    assert.equal(reading.isolatedSignaling, true, 'Camera offers must never use the shared dashboard connection');
    assert.equal(reading.emptyNativePoster, true); assert.equal(reading.emptyVideoPoster, true, 'Marao owns the single still; native video must not fetch a duplicate poster');
    assert.equal(reading.currentMaraoPoster, true);
    evidence.readings.push({ label, ...reading });
  };
  const layout = async () => {
    const result = await card.evaluate(card => {
      const stage = card._camera.stage.getBoundingClientRect(), bounds = card.getBoundingClientRect();
      return { width: bounds.width, stage: { width: stage.width, height: stage.height, left: stage.left - bounds.left, right: stage.right - bounds.left },
        controls: [...card._camera.feedback.querySelectorAll('button')].map(button => { const rect = button.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }),
        contained: stage.left >= bounds.left - .5 && stage.right <= bounds.right + .5, pageOverflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(result.contained, true); assert.equal(result.pageOverflow, false);
    for (const control of result.controls) assert.ok(control.width >= 48 && control.height >= 48, 'Native playback recovery has visible 48px controls');
    evidence.geometry = result;
  };
  let originalDisplay;
  try {
    await card.scrollIntoViewIfNeeded();
    await waitStill();
    await release('initial visibility release', async () => {
      originalDisplay = await card.evaluate(card => {
        card.__retiredSignaling = card._camera.signaling;
        card.__retiredConnections = [...card._camera.signaling.sessions].map(session => session.connection).filter(Boolean);
        const value = card.style.display; card.style.display = 'none'; return value;
      });
      await page.waitForFunction(card => !card._camera?.player, handle);
      assert.equal(await card.evaluate(card => card.__retiredSignaling.closed && card.__retiredSignaling.sessions.size === 0
        && card.__retiredConnections.every(connection => connection.closeRequested)
        && card.hass.connection.connected), true, 'Hiding a camera closes owned signaling and preserves the main connection');
    });
    await resume();
    await card.evaluate((card, display) => { card.style.display = display; }, originalDisplay);
    // Capture the stable poster before the native transport initializes.
    await page.waitForFunction(card => card._camera?.state === 'loading' && !card._camera.poster.hidden, handle);
    const initial = await card.evaluate(card => ({ height: card.getBoundingClientRect().height, stage: card._camera.stage.getBoundingClientRect().height,
      hasPoster: Boolean(card._camera.poster.getAttribute('src')), visiblePoster: !card._camera.poster.hidden,
      currentPoster: card._camera.poster.getAttribute('src') === card._camera.picture, ownPosters: card._camera.stage.querySelectorAll('.camera-poster').length }));
    assert.equal(initial.hasPoster, true); assert.equal(initial.visiblePoster, true); assert.equal(initial.currentPoster, true); assert.equal(initial.ownPosters, 1);
    await waitLive(); await moving('initial native startup', { captureBaseline: true });
    await page.__cameraRequestLedger?.settleHandoffs();
    const handoff = await card.evaluate(card => ({ height: card.getBoundingClientRect().height, stage: card._camera.stage.getBoundingClientRect().height }));
    assert.ok(Math.abs(handoff.height - initial.height) <= 1, 'Native still-to-live handoff preserves card height');
    assert.ok(Math.abs(handoff.stage - initial.stage) <= 1, 'Native media slot keeps its geometry');
    await waitStill();
    mark('ordinary metadata/theme/locale update');
    evidence.metadataBoundary = await page.evaluate(observeNativeCamera, { card: handle, action: 'update-metadata' });
    assert.equal(evidence.metadataBoundary.synchronousIdentityRetained, true);
    await waitStill();
    await moving('native poster metadata update without remount', { metadata: true });
    await page.__cameraRequestLedger?.settleHandoffs();
    assert.deepEqual(await page.evaluate(observeNativeCamera, { card: handle, action: 'verify-metadata-owner' }),
      { ownerRetained: true, streamsRetained: true }, 'Ordinary metadata retains native ownership and stream requests');
    // Real native video, with a controlled recognized wrapper rejection. The
    // standard video play() runs synchronously in the actual button gesture.
    mark('controlled pause and autoplay rejection');
    await card.evaluate(card => { const camera = card._camera; camera.video.pause(); camera.playRejected({ name: 'NotAllowedError' }, camera.generation); });
    await card.locator('.camera-feedback button').waitFor({ state: 'visible' }); await layout();
    const hash = new URL(page.url()).hash;
    await card.locator('.camera-feedback button').tap(); await waitLive();
    assert.equal(new URL(page.url()).hash, hash, 'Playback must not open the event sheet');
    assert.equal(await card.evaluate(card => card._camera.player === card.__nativeProof.player), true, 'User gesture keeps the same native host');
    evidence.faults.push('Controlled wrapper autoplay-rejection injection on actual native media; does not prove browser policy rejection');
    if (!geometryOnly) {
      await release('explicit retry releases failed session', () => card.evaluate(card => { card.__retiredVideo = card._camera.video; card.__retiredPlayer = card._camera.player; card._camera.fail('timeout'); }));
      await card.locator('.camera-feedback button').waitFor({ state: 'visible' });
      assert.match(await card.locator('.camera-feedback').textContent(), /Snapshot|Imagem estática/); await layout();
      await resume(); await card.locator('.camera-feedback button').tap(); await waitLive(); await moving('explicit retry after controlled wrapper timeout');
      assert.equal(await card.evaluate(card => card._camera.player !== card.__retiredPlayer && !card.__retiredPlayer.isConnected), true);
      evidence.faults.push('Controlled wrapper timeout injection; actual native transport restarted through explicit Retry');
      await release('hidden card releases native session', async () => {
        await card.evaluate(card => { card.__retiredVideo = card._camera.video; card.__retiredPlayer = card._camera.player; card.style.display = 'none'; });
        await page.waitForFunction(card => !card._camera.player && !card.__retiredPlayer.isConnected && !card.__retiredVideo.getAttribute('src') && [...(card.__retiredVideo.srcObject?.getTracks?.() || [])].every(track => track.readyState === 'ended'), handle);
      });
      await resume(); await card.evaluate((card, display) => { card.style.display = display; }, originalDisplay); await waitLive(); await moving('visibility recovery');
      await release('unavailable entity releases native session', async () => {
        await card.evaluate(card => { const source = document.querySelector('home-assistant').hass, entity = card._config.entity; card.hass = { ...source, states: { ...source.states, [entity]: { ...source.states[entity], state: 'unavailable' } } }; });
        await page.waitForFunction(card => !card._camera.player && !card._camera.poster.hasAttribute('src'), handle);
      });
      await resume(); await card.evaluate(card => { card.hass = document.querySelector('home-assistant').hass; }); await waitLive(); await moving('frontend availability recovery');
      evidence.faults.push('Frontend-only unavailable-state injection for the safe synthetic entity; no backend/device state changed');
      await card.evaluate(card => {
        const duplicate = document.createElement('marao-card'); duplicate.setConfig({ ...card._config, name: 'Native proof duplicate' }); duplicate.hass = document.querySelector('home-assistant').hass; card.after(duplicate); card.__duplicate = duplicate;
        const preview = document.createElement('marao-card'); preview.preview = true; preview.setConfig({ ...card._config, name: 'Native proof inert preview' }); preview.hass = document.querySelector('home-assistant').hass; duplicate.after(preview); card.__preview = preview;
        card.scrollIntoView({ block: 'start', behavior: 'instant' });
        if (duplicate.getBoundingClientRect().bottom > innerHeight) duplicate.scrollIntoView({ block: 'end', behavior: 'instant' });
      });
      await page.waitForFunction(card => [card, card.__duplicate].every(element => { const rect = element.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight; }), handle);
      await page.waitForFunction(card => card._camera.state === 'live' && card.__duplicate._camera?.state === 'live', handle, { timeout: 35000 });
      assert.equal(await card.evaluate(card => !card.__preview._camera && !card.__preview.shadowRoot.querySelector('ha-camera-stream')), true);
      let retained;
      try {
        await release('remove owned duplicate occurrence', async () => { retained = await page.evaluateHandle(removeNativeDuplicates, handle); }, { terminal: false });
        const retainedOwner = () => page.evaluate(({ card, retained }) => card._camera === retained.camera && card._camera.player === retained.player
          && card._camera.generation === retained.generation, { card: handle, retained });
        assert.equal(await retainedOwner(), true, 'Removing another occurrence retains the main native host and generation');
        await moving('native playback after duplicate removal');
        assert.equal(await retainedOwner(), true, 'The main native session survives duplicate removal and continued playback');
      } finally { await retained?.dispose(); }
    }
    await layout(); assert.equal(serviceCalls.length, servicesBefore, 'Playback/retry/lifecycle never dispatch camera or device services');
    if (output) {
      fs.mkdirSync(output, { recursive: true });
      fs.writeFileSync(path.join(output, `native-camera-${evidence.engine}-${scenario}-${theme}.json`), JSON.stringify({ scope: 'Actual native HA synthetic-media transport. WebKit is not actual Safari; controlled faults are labelled and no real Protect interoperability is claimed.', ...evidence }, null, 2), { mode: 0o600 });
      if (!geometryOnly) await card.screenshot({ path: path.join(output, `native-camera-${evidence.engine}-${scenario}-${theme}.png`) });
      else await require('./verification-browser').capture(card, { path: path.join(output, `native-camera-${evidence.engine}-${scenario}-${theme}.png`) });
    }
  } catch (error) {
    const phaseElapsedMs = Date.now() - began - (phases.at(-1)?.elapsedMs || 0);
    const observationBudgetMs = Math.min(Math.max(0, 30000 - phaseElapsedMs), Math.max(0, observeFailureMs));
    const failure = { phase, elapsedMs: Date.now() - began, phaseElapsedMs, observationBudgetMs, error: { name: error.name, summary: error.name === 'TimeoutError' ? error.message.split('\n')[0] : 'Native camera assertion failed; original failure retained by runner' }, phases, observations: [] };
    const save = () => { if (output) { fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, `native-camera-${evidence.engine}-${scenario}-${theme}-failure.json`), JSON.stringify(failure, null, 2), { mode: 0o600 }); } };
    try {
      failure.initial = await snapshot(); save();
      const deadline = Date.now() + observationBudgetMs;
      while (Date.now() < deadline) { await page.waitForTimeout(Math.min(1000, deadline - Date.now())); failure.observations.push({ elapsedMs: Date.now() - began, ...await snapshot() }); save(); }
    } catch (captureError) { failure.captureError = captureError.name; save(); }
    throw error; // Diagnostic observation never turns the original failure into a pass.
  } finally {
    await resume();
    await release('native proof removes temporary occurrences', () => card.evaluate((card, display) => { card.__duplicate?.remove(); card.__preview?.remove(); card.style.display = display || ''; card.hass = document.querySelector('home-assistant').hass; delete card.__nativeProof; delete card.__retiredVideo; delete card.__retiredPlayer; delete card.__duplicate; delete card.__preview; delete card.__retiredSignaling; delete card.__retiredConnections; }, originalDisplay), { terminal: false });
    await waitStill();
  }
}
module.exports = { checkNativeCameraPlayback, waitForCameraOutcome, waitForCameraAdvance, observeNativeCamera, removeNativeDuplicates };
