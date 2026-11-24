// MaraoFrontend.release {"compiler_contract":1,"identity":"b8f985ee9459eaf5a53ac3232788b92f9ac7859d4053f4685ca839326e9ab8e6","package_version":"0.37.6","preload":["MaraoAssetURL.js","MaraoNavigation.js","MaraoNativeBootstrap.js","MaraoCards.js","MaraoCardRendering.js","MaraoNativeCards.js"]}
const root = new URL('./', import.meta.url);
const manifestURL = new URL('MaraoFrontend.release.json', root);
const preloadFiles = ["MaraoAssetURL.js","MaraoNavigation.js","MaraoNativeBootstrap.js","MaraoCards.js","MaraoCardRendering.js","MaraoNativeCards.js"];
async function readRelease() {
  const options = {cache:'no-store', credentials:'same-origin'};
  const entry = await fetch(new URL('MaraoFrontend.js', root), options);
  if (!entry.ok) throw new Error('Marao frontend installation is incomplete.');
  const firstLine = (await entry.text()).split('\n', 1)[0];
  const marker = "// MaraoFrontend.release ";
  let meta;
  if (firstLine.startsWith(marker)) {
    meta = JSON.parse(firstLine.slice(marker.length));
    if (!Array.isArray(meta.preload)) throw new Error('Invalid Marao release descriptor.');
  } else {
    // Older entries have no record. Their full manifest is authoritative.
    const response = await fetch(manifestURL, options);
    if (!response.ok) throw new Error('Marao frontend installation is incomplete.');
    meta = await response.json();
    meta.preload = preloadFiles.filter(file => Object.hasOwn(meta.files || {}, meta.identity+'--'+file));
  }
  if (meta.compiler_contract !== 1 || typeof meta.identity !== 'string' || !/^[a-f0-9]{64}$/.test(meta.identity)) throw new Error('Invalid Marao frontend identity.');
  return meta;
}
// A full network response already delivered this exact entry. Cached, worker
// and unobservable responses still discover the installed release explicitly.
const transfer = globalThis.performance?.getEntriesByName?.(import.meta.url, 'resource').at(-1);
const freshEntry = transfer?.responseStatus === 200 && transfer.transferSize > 300 &&
  transfer.encodedBodySize > 0 && !transfer.workerStart && !transfer.deliveryType;
const meta = freshEntry ? {"compiler_contract":1,"identity":"b8f985ee9459eaf5a53ac3232788b92f9ac7859d4053f4685ca839326e9ab8e6","package_version":"0.37.6","preload":["MaraoAssetURL.js","MaraoNavigation.js","MaraoNativeBootstrap.js","MaraoCards.js","MaraoCardRendering.js","MaraoNativeCards.js"]} : await readRelease();
const fileURL = file => new URL(meta.identity + '--' + file, root);
window.MaraoInstalledFrontendPackage = {identity:meta.identity, package_version:meta.package_version, preload:meta.preload, entryURL:import.meta.url, rootURL:root.href, baseURL:root.href, manifestURL:manifestURL.href, manifestCheckedAt:performance.now(), readRelease};
window.MaraoFrontendPackage ||= window.MaraoInstalledFrontendPackage;
if (!window.MaraoDashboardRuntime && globalThis.document?.head) {
  for (const file of preloadFiles) {
    if (!meta.preload.includes(file)) continue;
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = fileURL(file).href;
    document.head.append(link);
  }
}
await Promise.all(['MaraoNativeDashboard.js', 'MaraoDashboard.js'].map(file => import(fileURL(file))));
