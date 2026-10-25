import { appleTVOptions, copy, defaultTemplate, DOMAIN_TEMPLATES, entries, friendly, isAccess, sections, slug } from '../custom_components/marao_dashboard/frontend/MaraoSource.js';
import labels from '../custom_components/marao_dashboard/frontend/marao-generator-labels.json' with { type: 'json' };
import { roomPageTemplate } from './editor-model.js';

export function metadataSnapshot(hass, registry = Object.entries(hass.entities || {}).map(([entity_id, value]) => ({ entity_id, ...value })), devices = Object.values(hass.devices || {}), areas = Object.values(hass.areas || {})) {
  const deviceMap = new Map(devices.map(item => [item.id, item]));
  const areaMap = new Map(areas.map(item => [item.area_id, item]));
  const registered = new Map(registry.map(item => [item.entity_id, item]));
  const entities = [...new Set([...registered.keys(), ...Object.keys(hass.states || {})])].sort().map(entity_id => {
    const entry = registered.get(entity_id) || {}, state = hass.states?.[entity_id], attrs = state?.attributes || {}, device = deviceMap.get(entry.device_id);
    const area = areaMap.get(entry.area_id), deviceArea = areaMap.get(device?.area_id);
    return { entity_id, domain: entity_id.split('.')[0], has_state: Boolean(state), state: state?.state ?? null,
      name: entry.name || entry.original_name || attrs.friendly_name || friendly(entity_id), icon: entry.icon || attrs.icon || null,
      device_class: attrs.device_class ?? null, unit_of_measurement: attrs.unit_of_measurement ?? null, supported_features: attrs.supported_features ?? null,
      device_model: device?.model ?? null, manufacturer: device?.manufacturer ?? null,
      area_id: entry.area_id ?? null, area_name: area?.name ?? null, device_area_id: device?.area_id ?? null, device_area_name: deviceArea?.name ?? null,
      disabled_by: entry.disabled_by ?? null, hidden_by: entry.hidden_by ?? null };
  });
  return { entities, areas: copy(areas) };
}

export async function readMetadata(hass) {
  const values = await Promise.all(['entity', 'device', 'area'].map(kind => hass.callWS({ type: `config/${kind}_registry/list` })));
  if (values.some(value => !Array.isArray(value))) throw new Error('Could not load Home Assistant entity metadata.');
  return metadataSnapshot(hass, ...values);
}

export function pageTemplates(source, entities) {
  const available = entities.filter(entity => entity.has_state === true && !entity.disabled_by && !entity.hidden_by);
  const first = (domain, suffix, deviceClass) => available.find(entity => entity.entity_id.startsWith(domain + '.') && (!suffix || entity.entity_id.endsWith(suffix)) && (!deviceClass || entity.device_class === deviceClass))?.entity_id;
  const bound = (template, name, entity_id, extra = {}) => ({ template, name, ...(entity_id ? { entity_id } : {}), ...extra });
  const container = (icon, entities, columns = 1) => ({ icon, columns, entities });
  const weather = first('weather'), home = weather ? [{ columns: 1, entities: [{ template: 'md_weather_card', entity_id: weather, variables: { show_forecast: true } }] }] : [];
  const groups = [];
  for (const [kind, domain, key, icon] of [['light','light','overview.lights','mdi:lightbulb-group-outline'],['cover','cover','overview.blinds','mdi:window-shutter'],['climate','climate','overview.climate','mdi:thermostat'],['battery','sensor','overview.maintenance','mdi:wrench']]) {
    const members = available.filter(entity => entity.entity_id.startsWith(domain + '.') && (kind !== 'battery' || entity.device_class === 'battery') && (kind !== 'cover' || (entity.template || defaultTemplate(entity)) !== 'md_fan_card')).map(entity => entity.entity_id);
    if (members.length) groups.push({ template: 'md_entity_group_card', id: 'starter-' + kind, name: labels.en[key], name_key: key, icon, entity_type: kind, popup_filter: kind === 'light' ? 'active' : 'all', entities: members });
  }
  const scenes = available.filter(entity => entity.entity_id.startsWith('scene.')).map(entity => entity.entity_id);
  if (scenes.length) groups.push({ template: 'md_scene_collection_card', name: 'Scenes', name_key: 'overview.scenes', icon: 'mdi:palette-outline', entities: scenes });
  if (groups.length) home.push({ columns: 2, entities: groups });
  const energy = [bound('md_graph_card','House Power',first('sensor',null,'power'),{name_key:'energy.house_power',icon:'mdi:flash',variables:{history_popup:true,show_icon:true}})];
  for (const [suffix,name,key,period,icon] of [['month_energy','Month Power','energy.month_power','month','mdi:flash'],['today_energy','Today Power','energy.today_power','day','mdi:flash-outline'],['month_cost','Month Cost','energy.month_cost','month','mdi:currency-eur'],['today_cost','Today Cost','energy.today_cost','day','mdi:cash-clock']]) {
    const entity = first('sensor',suffix); if (entity) energy.push(bound('md_energy_period_card',name,entity,{name_key:key,icon,variables:{period}}));
  }
  const wallbox = [];
  for (const [suffix,role,name,key,icon] of [['wallbox_status','md_base_card','Wallbox Status','wallbox.status','mdi:ev-station'],['wallbox_power','md_graph_card','Charging Power','wallbox.charging_power','mdi:flash'],['wallbox_maximum_current','md_graph_card','Charging Current','wallbox.current','mdi:current-ac']]) {
    const entity = first('sensor',suffix); if (entity) wallbox.push(bound(role,name,entity,{name_key:key,icon}));
  }
  wallbox.push(bound('md_wallbox_current_card','Charging Current',first('number','wallbox_current') || first('input_number','wallbox_current'),{name_key:'wallbox.current',variables:{shortcuts:[6,12,16]}}));
  const pause = first('switch','wallbox_pause') || first('input_boolean','wallbox_pause');
  if (pause) wallbox.push(bound('md_switch_card','Pause / Resume',pause,{name_key:'wallbox.pause_resume',icon:'mdi:pause-circle'}));
  const selected = new Map();
  for (const page of source.pages || []) for (const section of sections(page)) for (const entry of entries(section.entities)) if (entry.entity_id?.startsWith('media_player.') && (!entry.template || entry.template === 'md_media_card') && !selected.has(entry.entity_id)) selected.set(entry.entity_id,entry);
  const players = [];
  for (const entity of available.filter(entity => entity.entity_id.startsWith('media_player.'))) {
    const saved = copy(selected.get(entity.entity_id) || {}), player = {...bound('md_media_card',entity.name || friendly(entity.entity_id),entity.entity_id),...saved}; players.push(player);
    const options = appleTVOptions({...entity,...saved});
    if (options) { player.apple_tv = {...saved.apple_tv,...copy(options)}; for (const app of options.apps) { const card = {...copy(app),template:'md_media_app_card',entity_id:entity.entity_id,name:app.name || app.source,variables:{app_source:app.source}}; delete card.source; players.push(card); } }
  }
  const security = [bound('md_security_card','Alarm',first('alarm_control_panel'),{name_key:'security.alarm',variables:{alarm_layout:'dropdown'}}),...available.filter(isAccess).map(entity => bound('md_access_card',entity.name || friendly(entity.entity_id),entity.entity_id)),...available.filter(entity => entity.entity_id.startsWith('button.')).map(entity => bound('md_access_hold_action_card',entity.name || friendly(entity.entity_id),entity.entity_id))];
  return copy({ empty:container('mdi:file-outline',[]), home:{icon:'mdi:home-variant',sections:home}, rooms:roomPageTemplate(source), room:{icon:'mdi:sofa-outline',subview:true,sections:[{columns:1,entities:[bound('md_title_card','Room',null,{id:'page-title'})]},{entities:[]}]}, security:container('mdi:shield-home',security),energy:container('mdi:lightning-bolt',energy),wallbox:container('mdi:ev-station',wallbox),media:container('mdi:television-play',players.length ? players : [bound('md_media_card','Media player',null,{name_key:'media.player'})]) });
}

export function createStarter(name, { entities, areas }) {
  const supported = entities.filter(entity => entity.has_state && !entity.disabled_by && !entity.hidden_by && Object.hasOwn(DOMAIN_TEMPLATES, entity.domain));
  const rooms = areas.map(area => ({ name:area.name, area:area.area_id, entities:supported.filter(entity => (entity.area_id || entity.device_area_id) === area.area_id).map(entity => entity.entity_id) })).filter(room => room.entities.length);
  const knownAreas = new Set(areas.map(area => area.area_id));
  const unassigned = supported.filter(entity => !knownAreas.has(entity.area_id || entity.device_area_id)).map(entity => entity.entity_id);
  if (unassigned.length) rooms.push({ name:'Home',entities:unassigned });
  const paths = new Set();
  for (const room of rooms) {
    const base = 'room-' + slug(room.name); let index = 2, route = base;
    while (paths.has(route)) route = base + '-' + index++;
    room.path = route; paths.add(route);
  }
  return { name, rooms };
}
