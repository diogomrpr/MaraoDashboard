// Disposable gallery navigation; the combined page remains available to existing checks.
const { families } = require('./cases.json');
const labels = {
  md_access_card:'Access', md_access_slide_action_card:'Access opener', md_access_action_card:'Access close / lock', md_access_hold_action_card:'Security action',
  md_sensor_card:'Sensor', md_base_card:'Status', md_bubble_popup_card:'Popup shortcut', md_navigation_card:'Navigation',
  md_light_card:'Light', md_fan_card:'Fan / exhaust valve', md_cover_card:'Cover', md_climate_card:'Climate',
  md_graph_card:'Graph', md_toggle_graph_card:'Toggle graph', md_energy_period_card:'Energy period', md_timeline_card:'Timeline',
  md_title_card:'Title', md_header_card:'Header', md_glance_card:'Glance', md_room_card:'Room', md_scene_card:'Scene',
  md_entity_group_card:'Entity group', md_scene_collection_card:'Scene collection', md_alarm_controls_card:'Alarm controls',
  md_media_app_card:'Media app', md_wallbox_current_card:'Wallbox current',
  'custom:marao-camera-events-card':'Camera events', 'custom:marao-frigate-events-card':'Camera events',
  'custom:marao-popup-card':'Popup', 'custom:marao-control-grid':'Control grid',
};
const wrapperTypes = new Set(['vertical-stack','horizontal-stack','grid']);
const canonical = key => key?.replace(/^hc_/, 'md_');
function cardKind(card) {
  if (card.template) return canonical(card.template);
  if (card.type === 'custom:marao-card') return 'md_base_card';
  return ({'custom:marao-energy-period-card':'md_energy_period_card','custom:marao-state-timeline-card':'md_timeline_card','custom:marao-power-history-card':'md_graph_card'})[card.type]
    || card.type || ({light:'md_light_card',sensor:'md_sensor_card',binary_sensor:'md_sensor_card',switch:'md_switch_card',input_boolean:'md_switch_card',climate:'md_climate_card',cover:'md_cover_card',fan:'md_fan_card',lock:'md_access_card'})[(card.entity_id || '').split('.')[0]] || 'md_base_card';
}
function galleryPages(view) {
  const buckets = new Map(), popups = new Map();
  const nameFor = key => labels[key] || families.find(family => family.template === key || family.type === key)?.name || key.replace(/^custom:|^md_|_card$/g,'').replace(/[-_]/g,' ').replace(/^./,letter=>letter.toUpperCase());
  const bucket = key => {
    if (!buckets.has(key)) buckets.set(key,{key,name:nameFor(key),sections:[],seen:new Set()});
    return buckets.get(key);
  };
  const add = (key, value, editable=false) => {
    const page=bucket(key), identity=JSON.stringify([editable,value]);
    if (!page.seen.has(identity)) {page.seen.add(identity);page.sections.push(editable?{entities:[structuredClone(value)]}:{cards:[structuredClone(value)]});}
  };
  const kinds = card => {
    if (!card || typeof card !== 'object') return [];
    if (card.type === 'custom:marao-control-grid') return [card.type, ...new Set((card.cards || []).flatMap(kinds))];
    if (wrapperTypes.has(card.type) || card.type === 'conditional') return [...new Set((card.cards || [card.card]).flatMap(kinds))];
    return [cardKind(card)];
  };
  const collect = card => {
    if (!card || typeof card !== 'object') return;
    if (card.type === 'custom:marao-popup-card') {popups.set(card.hash,card);return;}
    if (wrapperTypes.has(card.type)) {
      const familyKinds=kinds(card);
      // Keep homogeneous narrow/grid variants together; split mixed introductory stacks.
      if (card.type !== 'vertical-stack' && familyKinds.length === 1) add(familyKinds[0],card);
      else (card.cards || []).forEach(collect);
      return;
    }
    if (card.type === 'custom:marao-control-grid') {
      add(card.type,card); (card.cards || []).forEach(collect); return;
    }
    if (card.type === 'conditional') {for(const key of kinds(card))add(key,card);return;}
    add(cardKind(card),card);
  };
  for(const entity of view.entities || [])add(cardKind(entity),entity,true);
  for(const card of view.cards || [])collect(card);
  const opener = popup => ({type:'custom:marao-card',template:'md_navigation_card',name:popup.name || 'Popup',icon:'mdi:open-in-new',show_state:false,tap_action:{action:'navigate',navigation_path:popup.hash}});
  for(const popup of popups.values()) {
    add('custom:marao-popup-card',opener(popup));add('custom:marao-popup-card',popup);
    for(const key of new Set((popup.cards || []).flatMap(kinds))) {add(key,opener(popup));add(key,popup);}
  }
  // Copy each referenced popup into the view containing its trigger, including chained sheets.
  const references = value => {
    if(typeof value === 'string')return popups.has(value)?[value]:[];
    return value && typeof value === 'object'?Object.values(value).flatMap(references):[];
  };
  for(const page of buckets.values()) {
    const visited=new Set();
    for(let index=0;index<page.sections.length;index++)for(const hash of references(page.sections[index])) {
      if(visited.has(hash))continue;visited.add(hash);add(page.key,popups.get(hash));
    }
  }
  const back={type:'custom:marao-card',template:'md_navigation_card',name:'Back to cards',icon:'mdi:arrow-left',show_state:false,tap_action:{action:'navigate',navigation_path:'/marao-dashboard/card-test'}};
  const pages=[...buckets.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(page=>{
    const suffix=page.key.replace(/^custom:/,'').replace(/[^a-z0-9]+/g,'-');
    const path='card-test-'+suffix;
    return {id:path,path,name:page.name,icon:'mdi:test-tube',subview:true,output_path:`views/custom/${path}.yaml`,sections:[{cards:[back]},...page.sections]};
  });
  const links=pages.map(page=>({type:'custom:marao-card',template:'md_navigation_card',name:page.name,icon:page.icon,show_state:false,tap_action:{action:'navigate',navigation_path:'/marao-dashboard/'+page.path}}));
  return [{id:'card-test',path:'card-test',name:'Cards',icon:'mdi:test-tube',output_path:'views/custom/01-cases.yaml',sections:[{columns:2,cards:links}]},...pages];
}
module.exports={galleryPages,cardKind};
