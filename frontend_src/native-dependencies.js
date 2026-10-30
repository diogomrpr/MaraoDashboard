import assets from '../custom_components/marao_dashboard/frontend/marao-owned-assets.json' with {type:'json'};
import {object, SourceError} from '../custom_components/marao_dashboard/frontend/MaraoSource.js';

const owned = new Set(assets);
const references = /(?:(?:https?:)?\/\/[^/\s"'<>),\]}]+)?\/(?:marao_dashboard_static|api\/marao_dashboard\/frontend\/[a-f0-9]+)\/[^\s"'<>),\]}]+/g;
const persistentAsset = /\.(?:svg|png|jpe?g|webp|gif|ttf|woff2?|ico)$/i;
function ordinaryAssetBase(value, path) {
  let url;
  try { url = new globalThis.URL(value); } catch { throw new SourceError('native_asset_base_invalid',path); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || /\/(?:marao_dashboard_static|api\/marao_dashboard)(?:\/|$)/.test(url.pathname)) throw new SourceError('native_asset_base_invalid',path);
  if (url.pathname.endsWith('/MaraoFrontend.js')) url.pathname=url.pathname.slice(0,-'MaraoFrontend.js'.length);
  else if (!url.pathname.endsWith('/')) url.pathname+='/';
  url.search='';url.hash='';return url.href;
}
export function rewriteOwnedAssets(text, path, baseURL, replacements, {stable = false} = {}) {
  if (/^\s*marao_dashboard(?:\.generate_dashboard|\/(?:config\/(?:get|generate)|history\/restore|camera\/netatmo_events|frontend\/subscribe))\s*$/.test(text)) throw new SourceError('legacy_service_dependency',path);
  let index = 0;
  const rewritten = text.replace(references, (url, offset) => {
    const key = `${path}#${index++}`;
    const relative = url.replace(/^(?:https?:)?\/\/[^/]+/,'').replace(/^\/(?:marao_dashboard_static|api\/marao_dashboard\/frontend\/[a-f0-9]+)\//,'').split(/[?#]/)[0];
    if (!owned.has(relative) || offset && /[\w/:.-]/.test(text[offset-1])) {
      const replacement = replacements?.[key];
      if (!replacement) throw new SourceError('legacy_asset_unresolved',path,{key});
      if (!/^(?:https?:\/\/|\/(?!\/))[^\s"'<>]+$/.test(replacement) || new RegExp(references.source).test(replacement)) {
        throw new SourceError('legacy_asset_replacement_invalid',path);
      }
      try { new URL(replacement,'https://ha.invalid'); } catch { throw new SourceError('legacy_asset_replacement_invalid',path); }
      return replacement;
    }
    // Ordinary documents outlive a release graph. The public image/font alias
    // intentionally bypasses the injected resolver for versioned runtime files.
    if (stable && !baseURL) throw new SourceError('native_asset_base_needed',path,{relative,alias:'MaraoAsset--'+relative.replaceAll('/','--')});
    const targetBase=stable?ordinaryAssetBase(baseURL,path):baseURL;
    if (stable && persistentAsset.test(relative)) return new globalThis.URL('MaraoAsset--'+relative.replaceAll('/','--'),targetBase).href;
    return targetBase ? new URL(relative,targetBase).href : url;
  });
  if (/\/api\/marao_dashboard\//.test(rewritten) && !baseURL) {
    const rest = rewritten.replace(references,'');
    if (/\/api\/marao_dashboard\//.test(rest)) throw new SourceError('legacy_service_dependency',path);
  } else if (/\/api\/marao_dashboard\//.test(rewritten)) throw new SourceError('legacy_service_dependency',path);
  return rewritten;
}

export function resolveDependencies(source,replacements) {
  const visit = (value,path) => typeof value === 'string' ? rewriteOwnedAssets(value,path,undefined,replacements)
    : Array.isArray(value) ? value.map((item,index)=>visit(item,`${path}[${index}]`))
    : object(value) ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key,visit(item,`${path}.${key}`)])) : value;
  return visit(source,'$');
}

export function reviewDependencies(source) {
  const privacy = new Set();
  const visit = (value,path) => {
    if (typeof value === 'string') {
      rewriteOwnedAssets(value,path);
      if (/\bhttps?:\/\/[^/\s]+@|[?&](?:token|auth|key|code|password|secret)=[^&\s]+/i.test(value)) privacy.add(path);
    }
    else if (Array.isArray(value)) value.forEach((item,index)=>visit(item,`${path}[${index}]`));
    else if (object(value)) for (const [key,item] of Object.entries(value)) {
      const child = `${path}.${key}`;
      if (/(?:token|password|secret|(?:access|pin|alarm|security)[_-]?code|api[_-]?key|credential|authorization)|^code$/i.test(key) && item !== null && item !== '' && item !== false) privacy.add(child);
      visit(item,child);
    }
  };
  visit(source,'$');
  return [...privacy].map(path=>({path,reason:'private_setting'}));
}
