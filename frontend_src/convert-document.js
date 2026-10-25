import { compileDashboard } from './compile-dashboard.js';
import { normalizeSource } from './native-model.js';
import { parseCardsYaml } from './lovelace-model.js';
import {reviewDependencies,resolveDependencies} from './native-dependencies.js';
import { copy, createEnvelope, formatVersion, object, parseSource, slug, SourceError, unwrapDocument } from '../custom_components/marao_dashboard/frontend/MaraoSource.js';

export function protectedFragment(text) {
  if (typeof text !== 'string') throw new SourceError('custom_yaml_invalid', '$');
  if (!text.includes('marao:')) return text;
  const names = ['generated:start','generated:end','custom:start','custom:end','generated-footer:start','generated-footer:end'];
  const matches = names.map(name => [...text.matchAll(new RegExp(`^  # marao:${name}\\r?$`, 'gm'))]);
  if (matches.some(items => items.length !== 1) || matches.some((items,index) => index && matches[index - 1][0].index >= items[0].index)) throw new SourceError('custom_markers_invalid', '$');
  const start = text.indexOf('\n',matches[2][0].index);
  if (start < 0) throw new SourceError('custom_markers_invalid', '$');
  return text.slice(start + 1,matches[3][0].index);
}

export function appendCustomContent(source, supplements = []) {
  const result = copy(source);
  for (const item of supplements) {
    if (!object(item) || typeof item.yaml !== 'string') throw new SourceError('custom_yaml_invalid', '$');
    const page = result.pages.find(page => page.path === item.page);
    if (!page) throw new SourceError('custom_page_needed', '$', { page:item.page });
    const yaml = protectedFragment(item.yaml);
    parseCardsYaml(yaml);
    page.custom_content ||= [];
    if (!Array.isArray(page.custom_content)) throw new SourceError('custom_content_conflict', '$.pages');
    page.custom_content.push({ yaml, ...(item.popup_hash ? { popup_hash:item.popup_hash } : {}) });
  }
  return result;
}

export function convertDocument(text, context = {}) {
  const supplied = parseSource(text), unwrapped = unwrapDocument(supplied);
  const assumptions = [];
  let source = normalizeSource(unwrapped.source,context);
  let root = context.dashboardRoot || unwrapped.envelope?.strategy.dashboard_root;
  if (!root && Array.isArray(unwrapped.source.views)) {
    const paths = new Set(unwrapped.source.views.map(view => view.path)), roots = new Set();
    const visit = value => { if (Array.isArray(value)) value.forEach(visit); else if (object(value)) for (const [key,child] of Object.entries(value)) { if (['navigation_path','back_path'].includes(key) && typeof child === 'string') { const match = child.match(/^\/([a-z0-9_-]+)\/([^/]+)$/); if (match && paths.has(match[2])) roots.add(match[1]); } else visit(child); } };
    visit(unwrapped.source.views);
    if (roots.size > 1) throw new SourceError('dashboard_root_needed','$');
    root = roots.size ? [...roots][0] : 'marao-dashboard';
  }
  if (!root) { root = `marao-${source.slug || slug(source.name)}`; assumptions.push('dashboard_address'); }
  if (context.supplements?.length) source = appendCustomContent(source,context.supplements);
  if (context.fileReplacements) source = resolveDependencies(source,context.fileReplacements);
  const privacy = reviewDependencies(source);
  const compiled = compileDashboard(source,{...context,dashboardRoot:root});
  const unchanged = JSON.stringify(source) === JSON.stringify(unwrapped.source);
  const sourceText = unchanged ? unwrapped.sourceText || text : JSON.stringify(source,null,2) + '\n';
  const document = createEnvelope(sourceText,root,unwrapped.envelope || {});
  return { document, source, compiled, assumptions, privacy, fromVersion:formatVersion(unwrapped.source), sourceText };
}
