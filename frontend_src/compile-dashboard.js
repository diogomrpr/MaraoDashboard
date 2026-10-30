import { MAIN_PAGE_BUTTONS } from './editor-model.js';
import { copy, domain, object } from '../custom_components/marao_dashboard/frontend/MaraoSource.js';
import { catalog, normalizeSource, validateSource } from './native-model.js';
import { parseCardsYaml } from './lovelace-model.js';
import {rewriteOwnedAssets} from './native-dependencies.js';

import { createCardComposition, resolveSource } from './card-composition.js';

export { catalog, validateSource, resolveSource };
const own = (value, key) => Object.hasOwn(value, key);
const pick = (value, keys) => Object.fromEntries(keys.filter(key => own(value, key)).map(key => [key, copy(value[key])]));

export function compileDashboard(input, { entities = [], areas = [], roomEntities, dashboardRoot, language = 'en', assetBaseURL } = {}) {
  const source = normalizeSource(input, { entities, areas, roomEntities });
  const config = resolveSource(source, entities);
  const root = dashboardRoot || `marao-${config.slug}`;
  if (!/^[a-z0-9][a-z0-9_-]*-[a-z0-9_-]+$/.test(root)) throw new Error('Choose a valid dashboard address.');
  const { name, rawCards, pageCard, popups, grid, owned, structural } = createCardComposition({ root, language });
  const available = new Map(config.pages.map(page => [page.path, page]));
  const routes = (config.navigation || []).map(entry => {
    const path = typeof entry === 'string' ? entry : entry.page;
    if (!available.has(path)) return copy(entry);
    const page = available.get(path), overrides = object(entry) ? entry : {};
    const route = { icon: page.icon || 'mdi:file-outline', icon_selected: page.icon || 'mdi:file-outline', label: name(page), ...copy(overrides), url: `/${root}/${path}` };
    if (overrides.label_key) route.label = name({ name: overrides.label, name_key: overrides.label_key });
    if (overrides.url && !overrides.label_key && ![`/${root}/${path}`, `/marao-${config.slug}/${path}`].includes(overrides.url)) route.url = overrides.url;
    return route;
  });
  const navbar = { type: 'vertical-stack', cards: [{ type: 'custom:marao-navbar-card', routes, ...Object.fromEntries(MAIN_PAGE_BUTTONS.filter(([key]) => own(config, key)).map(([key]) => [key, config[key]])) }] };
  const domains = ['sensor', 'binary_sensor', 'camera', 'lock', 'cover', 'climate', 'fan', 'switch', 'input_boolean', 'media_player', 'vacuum', 'number', 'input_number', 'light', 'navigation', 'entity_group'];
  const compact = new Set(['sensor', 'binary_sensor', 'switch', 'input_boolean', 'number', 'input_number', 'light', 'navigation', 'entity_group']);
  const views = [...config.pages.filter(page => page.path === config.landing_page), ...config.pages.filter(page => page.path !== config.landing_page)].map(page => {
    const cards = [], sheets = [];
    for (const section of page._sections) {
      const rendered = section.ordered_cards.map(pageCard), sourceRaw = (section.cards || []).map(copy);
      sheets.push(...sourceRaw.filter(structural));
      const ordinary = sourceRaw.filter(card => !structural(card));
      if (section.columns) {
        const content = [...rendered, ...ordinary];
        if (content.length) cards.push(...(section.columns === 1 && content.length === 1 && !owned(content[0]) ? content : [grid(content, section.columns)]));
      } else {
        const buckets = new Map();
        section.ordered_cards.forEach((entity, index) => {
          const kind = entity.template === 'ha_card' ? 'ha_card' : entity.page ? 'navigation' : entity.template === 'md_entity_group_card' ? 'entity_group' : domain(entity.entity_id);
          if (!buckets.has(kind)) buckets.set(kind, []);
          buckets.get(kind).push(rendered[index]);
        });
        const content = [], groups = [];
        for (const kind of [...domains, ...[...buckets.keys()].filter(key => !domains.includes(key))]) if (buckets.has(kind)) {
          const values = buckets.get(kind); content.push(...values); groups.push({ count: values.length, columns: compact.has(kind) ? 2 : 1 });
        }
        for (const card of ordinary) { content.push(card); groups.push({ count: 1, columns: 1 }); }
        if (content.length) cards.push(...(content.some(owned) ? [grid(content, Math.max(...groups.map(group => group.columns)), groups)] : content));
      }
      sheets.push(...section.ordered_cards.flatMap(popups));
    }
    for (const fragment of page.custom_content || []) {
      const content = parseCardsYaml(fragment.yaml);
      if (fragment.popup_hash) {
        const popup = sheets.find(sheet => sheet.type === 'custom:marao-popup-card' && sheet.hash === fragment.popup_hash);
        if (!popup) throw new Error('Choose an existing popup for the custom cards.');
        popup.cards ||= []; popup.cards.push(...content);
      } else cards.push(...content);
    }
    validatePopupLinks(page, [...cards, ...sheets]);
    cards.push(...sheets, copy(navbar));
    const full = page._sections.flatMap(section => section.ordered_cards).find(card => card.template === 'md_floor_plan_card' && card.variables.full_page);
    return { title: name(page), path: page.path, ...(full ? {type:'panel',cards:[{type:'vertical-stack',cards:[pageCard(full), ...sheets, copy(navbar)]}]} : {cards}), ...pick(page, ['icon', 'subview']), theme: page.theme || config.theme };
  });
  const rewrite = value => {
    if (rawCards.has(value)) return copy(value);
    if (Array.isArray(value)) return value.map(rewrite);
    if (!object(value)) return value;
    const aliases = {'custom:button-card':'custom:marao-card','custom:bubble-card':'custom:marao-popup-card','custom:navbar-card':'custom:marao-navbar-card','custom:my-slider':'custom:marao-card','custom:my-slider-v2':'custom:marao-card','custom:mini-graph-card':'sensor'};
    return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,key === 'type' && typeof item === 'string' ? aliases[item] || item : rewrite(item)]));
  };
  const result = rewrite({ title: config.name, views });
  for (const view of result.views) validatePopupLinks(config.pages.find(page => page.path === view.path),view.cards);
  const assets = (value,path = '$') => {
    if (typeof value === 'string') return rewriteOwnedAssets(value,path,assetBaseURL);
    if (Array.isArray(value)) return value.map((item,index)=>assets(item,`${path}[${index}]`));
    if (object(value)) return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,assets(item,`${path}.${key}`)]));
    return value;
  };
  return assets(result);
}

function validatePopupLinks(page, cards) {
  const hashes = new Set();
  function visit(value, callback) {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (object(value)) { callback(value); Object.values(value).forEach(child => visit(child, callback)); }
  }
  visit(cards, card => {
    if (card.type !== 'custom:marao-popup-card') return;
    if (typeof card.hash !== 'string' || !/^#[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(card.hash) || hashes.has(card.hash)) throw new Error(`Page ${page.name}: invalid or conflicting popup hash.`);
    hashes.add(card.hash);
  });
  visit(cards, card => {
    const links = [card.navigation_path];
    if (!(card.template === 'md_media_card' && card.variables?.media_display === 'inline') && ['md_media_card', 'md_camera_card', 'md_access_card', 'md_entity_group_card', 'md_climate_card'].includes(card.template)) links.push(card.variables?.popup_hash, card.variables?.mode_selector_hash);
    for (const link of links) if (typeof link === 'string' && /^#(?:page-|entity-group-|overview-|energy-|climate-mode-|access-|media-|camera-)/.test(link) && !hashes.has(link)) throw new Error(`Page ${page.name}: retarget or remove missing popup link.`);
  });
}
