const query = new URL(import.meta.url).search;
if (!window.MaraoDashboardRuntime) {
  // The bridge and HACS resource can coexist; one document must keep one runtime graph.
  const state = window.MaraoDashboardRuntime = {};
  const identity = new URL(import.meta.url).pathname.match(/\/([a-f0-9]{64})--MaraoDashboard\.js$/)?.[1];
  const root = new URL('./',import.meta.url);
  const demand = new AbortController();
  let waitingForPaint = false;
  const features = {
    'custom:marao-schedules-runtime': 'MaraoSchedules.js',
    'custom:marao-floor-plan-card': 'MaraoFloorPlanCard.js',
    'custom:marao-camera-events-card': 'MaraoFrigateEventsCard.js',
    'custom:marao-frigate-events-card': 'MaraoFrigateEventsCard.js',
    'custom:marao-energy-period-card': 'MaraoRuntime.js',
    'custom:marao-state-timeline-card': 'MaraoRuntime.js',
    'custom:marao-slide-to-open': 'MaraoRuntime.js',
  };
  const load = file => import(new URL(`./${file}${query}`, import.meta.url));
  state.requestContent = (types, placeholder) => {
    if (!Array.isArray(types)) { demand.abort(); return state.ready; }
    const files = new Set(types.filter(type => Object.hasOwn(features, type)).map(type => features[type]));
    if (files.has('MaraoFrigateEventsCard.js')) files.add('MaraoRuntime.js');
    if (files.size) {
      const start = () => Promise.all([...files].map(load));
      // HA mounts whole sections, including cards below the fold. A pending
      // wrapper needs its renderer immediately only when its placeholder is
      // on screen. A card-only direct view can therefore start independently.
      if (!placeholder || !waitingForPaint) return start();
      let observer;
      const visible = new Promise(resolve => {
        observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) resolve();
        });
        observer.observe(placeholder);
      });
      return Promise.race([visible, state.firstCardPaint]).finally(() => observer.disconnect()).then(start);
    }
    demand.abort();
    return state.ready;
  };
  state.loadViewContent = view => {
    const needed = new Set();
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'custom:marao-popup-card' || node.type === 'custom:marao-native-popup-card') return;
      if (Object.hasOwn(features, node.type) && !customElements.get(node.type.slice(7))) needed.add(node.type);
      for (const nested of [node.sections, node.cards, node.badges]) {
        if (Array.isArray(nested)) nested.forEach(visit);
      }
      if (node.card) visit(node.card);
    };
    visit(view);
    if (needed.size) return state.requestContent([...needed]);
  };
  // A section can mount before any of its cards have rendered. Observe actual
  // card surfaces once, until the browser has presented one in the viewport.
  if (identity && typeof IntersectionObserver === 'function') {
    waitingForPaint = true;
    state.firstCardPaint = new Promise(resolve => {
      const surfaces = new Set();
      let checking = false, timer;
      const controls = 'button,a[href],input:not([type="hidden"]),select,[role="button"],[role="switch"],[role="slider"],[role="link"],[tabindex="0"]';
      const unavailable = '[disabled],[aria-disabled="true"],[aria-hidden="true"],[inert]';
      const parent = element => element.assignedSlot || element.parentElement || element.getRootNode?.().host;
      const acceptsInput = control => {
        const box = control.getBoundingClientRect();
        const left = Math.max(0, box.left), right = Math.min(innerWidth, box.right);
        const top = Math.max(0, box.top), bottom = Math.min(innerHeight, box.bottom);
        if (left >= right || top >= bottom) return false;
        const x = (left + right) / 2, y = (top + bottom) / 2;
        let hit = document.elementFromPoint(x, y);
        while (hit?.shadowRoot) {
          const next = hit.shadowRoot.elementFromPoint?.(x, y);
          if (!next || next === hit) break;
          hit = next;
        }
        let inside = false;
        for (let element = hit; element; element = parent(element)) {
          if (element === control) inside = true;
          if (inside && element.matches?.(unavailable)) return false;
        }
        return inside;
      };
      const finish = () => {
        waitingForPaint = false;
        clearTimeout(timer);
        observer.disconnect();
        surfaces.clear();
        delete state.observeCard;
        resolve();
      };
      const check = () => {
        if (!waitingForPaint) return;
        let hasControl = false;
        for (const surface of surfaces) {
          if (!surface.isConnected) continue;
          const candidates = surface.matches?.(controls) ? [surface] : surface.querySelectorAll?.(controls) || [];
          for (const control of candidates) {
            if (control.matches(unavailable)) continue;
            hasControl = true;
            if (acceptsInput(control)) return finish();
          }
        }
        // Read-only views can finish after paint. HA can briefly cover live
        // controls while its shell settles; keep the link free during that time.
        if (!hasControl) return finish();
        timer = setTimeout(check, 32);
      };
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.isConnected) surfaces.add(entry.target);
          else surfaces.delete(entry.target);
        }
        if (surfaces.size && !checking) {
          state.hasVisibleCard = true;
          checking = true;
          requestAnimationFrame(() => requestAnimationFrame(check));
        }
      });
      state.observeCard = surface => { if (surface) observer.observe(surface); };
      state.stopObservingCards = finish;
    });
  }
  window.MaraoFrontendPackage = identity ? {identity,package_version:window.MaraoInstalledFrontendPackage?.package_version,entryURL:window.MaraoInstalledFrontendPackage?.entryURL,rootURL:root.href,baseURL:root.href,manifestURL:new URL('MaraoFrontend.release.json',root).href} : undefined;
  state.navigation = (async () => {
    while (!globalThis.customElements?.get('home-assistant')) await new Promise(resolve => setTimeout(resolve,16));
    return import(new URL(`./MaraoNavigation.js${query}`,import.meta.url));
  })();
  state.ready = state.navigation.then(navigation => (async () => {
    // These are unconditional imports. The browser can fetch them together while
    // the renderer keeps ownership of registration order.
    if (identity && globalThis.document?.head) {
      for (const file of ['MaraoCardRendering.js', 'MaraoNativeCards.js']) {
        if (window.MaraoInstalledFrontendPackage?.preload?.includes(file)) continue;
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = new URL(`./${file}${query}`, import.meta.url).href;
        document.head.append(link);
      }
    }
    const cards = await import(new URL(`./MaraoCards.js${query}`,import.meta.url));
    cards.registerMaraoCards();
    await import(new URL(`./MaraoNativeCards.js${query}`,import.meta.url));
    if (identity) {
      await window.MaraoNativeBootstrap?.waitForInitialViewPaint?.(demand.signal, state.firstCardPaint);
      state.stopObservingCards?.();
      delete state.stopObservingCards;
      // Already mounted specialty cards request their own module immediately.
      // Give input and paint priority over background registration.
      if (!demand.signal.aborted && typeof requestIdleCallback === 'function') {
        await new Promise(resolve => requestIdleCallback(resolve, {timeout: 500}));
      }
    }
    const [runtime] = await Promise.all(['MaraoRuntime.js','MaraoFloorPlanCard.js','MaraoSchedules.js','MaraoFrigateEventsCard.js'].map(load));
    await runtime.startCameraPreloading?.();
  })().catch(error => {
    console.error('Marao dashboard content failed to initialize',error);
    const message=document.createElement('p');message.setAttribute('role','alert');
    message.textContent=navigation.navigationLocalize('navigation.loading_error',document.querySelector('home-assistant')?.hass);
    (navigation.findElements('hui-root')[0]?.shadowRoot?.querySelector('#view') || document.body).append(message);
  }));
}
await window.MaraoDashboardRuntime.navigation;
export const runtimeReady = window.MaraoDashboardRuntime.ready;
