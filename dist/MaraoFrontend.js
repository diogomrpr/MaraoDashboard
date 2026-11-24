const root = new URL('./', import.meta.url);
const manifestURL = new URL('MaraoFrontend.release.json', root);
const response = await fetch(manifestURL, {cache:'no-store', credentials:'same-origin'});
if (!response.ok) throw new Error('Marao frontend installation is incomplete.');
const meta = await response.json();
if (meta.compiler_contract !== 1 || !/^[a-f0-9]{64}$/.test(meta.identity || '')) throw new Error('Invalid Marao frontend identity.');
const publishedName = file => meta.identity + '--' + file;
const fileURL = file => new URL(publishedName(file), root);
window.MaraoInstalledFrontendPackage = {identity:meta.identity, package_version:meta.package_version, entryURL:import.meta.url, rootURL:root.href, baseURL:root.href, manifestURL:manifestURL.href, manifestCheckedAt:performance.now()};
window.MaraoFrontendPackage ||= window.MaraoInstalledFrontendPackage;
if (!window.MaraoDashboardRuntime && globalThis.document?.head) {
  for (const file of ['MaraoAssetURL.js', 'MaraoNavigation.js', 'MaraoNativeBootstrap.js']) {
    if (!Object.hasOwn(meta.files || {}, publishedName(file))) continue;
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = fileURL(file).href;
    document.head.append(link);
  }
}
await Promise.all(['MaraoNativeDashboard.js', 'MaraoDashboard.js'].map(file => import(fileURL(file))));
