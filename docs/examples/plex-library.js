import {scenarioStates,demoDashboard} from './fixtures.js';

const reference=(path,type,title,extra={})=>({media_content_id:`plex://demo-plex/${path}`,media_content_type:type,title,...extra});
const movie=(id,title)=>reference(id,'movie',title,{media_class:'movie',can_play:true,thumbnail:'fictional'});
const show=(id,title)=>reference(id,'show',title,{media_class:'tvshow',can_expand:true,thumbnail:'fictional'});
const episode=reference('401','episode','A new beginning',{media_class:'episode',can_play:true,thumbnail:'fictional'});
const movies=[movie('101','Beyond the mountains'),movie('102','The last lighthouse'),movie('103','A quieter world')];
const shows=[show('201','Northern skies'),show('202','City gardens')];
const folders={
  server:reference('server','server','Marao demonstration library',{children:[reference('Recommended','directory','Recommended',{can_expand:true}),reference('movies','library','Movies',{children_media_class:'movie',can_expand:true}),reference('shows','library','TV Series',{children_media_class:'tvshow',can_expand:true})]}),
  Recommended:reference('Recommended','directory','Recommended',{children:[reference('library.hub.continueWatching','hub','Continue Watching',{can_expand:true})]}),
  'library.hub.continueWatching':reference('library.hub.continueWatching','hub','Continue Watching',{children:[episode,movies[0]]}),
  movies:reference('movies','library','Movies',{children:movies}),
  shows:reference('shows','library','TV Series',{children:shows}),
  201:reference('201','show','Northern skies',{children:[reference('301','season','Season 1',{can_expand:true,thumbnail:'fictional'})]}),
  202:reference('202','show','City gardens',{children:[reference('301','season','Season 1',{can_expand:true,thumbnail:'fictional'})]}),
  301:reference('301','season','Season 1',{children:[episode]}),
};

export function browsePlexFixture(id,flags={}) {
  const key=String(id).replace(/^plex:\/\/demo-plex\//,'');
  if(!String(id).startsWith('plex://demo-plex/')||!Object.hasOwn(folders,key))throw new Error('Choose a fictional Plex folder.');
  if(flags.partialFailure&&key==='movies')throw new Error('The fictional movie library could not load.');
  const folder=structuredClone(folders[key]);
  if(flags.empty&&!['server','Recommended'].includes(key))folder.children=[];
  return folder;
}

export function plexPoster(path) {
  const match=/^\/api\/plex_image_proxy\/demo-plex\/(\d+)\?docs=1$/.exec(path);
  if(!match)throw new Error('Choose fictional Plex artwork.');
  const hue=Number(match[1])*47%360;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 240"><rect width="160" height="240" fill="hsl(${hue} 35% 22%)"/><circle cx="115" cy="65" r="32" fill="hsl(${hue} 55% 76%)"/><path d="M0 200 65 90 160 210V240H0" fill="hsl(${hue} 40% 38%)"/><path d="M0 225 100 140 160 200V240H0" fill="hsl(${hue} 35% 55%)"/></svg>`;
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
}

const config={type:'custom:marao-plex-library-card',entity_id:'media_player.living_room',name:'Living room Apple TV',apple_tv:{plex:{display:'popup',client_entity:'media_player.plex',scan_clients_entity:'button.plex_scan',app_source:'Plex',library_root:reference('server','server','Marao demonstration library')}}};
const states={
  'media_player.living_room':{attributes:{friendly_name:'Living room Apple TV',source:'Plex',source_list:['Plex','Rivulet']}},
  'media_player.plex':{entity_id:'media_player.plex',state:'idle',attributes:{friendly_name:'Fictional Plex client',supported_features:512}},
  'button.plex_scan':{entity_id:'button.plex_scan',state:'2026-11-08T10:00:00Z',attributes:{friendly_name:'Fictional client discovery'}},
};
const examples=[
  {id:'default',label:'Compact library and popup',description:'A compact poster-stack card opens the complete library in a popup.',libraryMode:'popup'},
  {id:'inline',label:'Full library on dashboard',description:'All three shelves stay visible directly on the dashboard.'},
  {id:'popup-partial-failure',label:'Compact card with one shelf failing',description:'Open the popup to inspect and retry the failing Movies shelf.',libraryMode:'popup',simulation:{partialFailure:true}},
  {id:'popup-failure',label:'Compact card with all shelves failing',description:'The opening card remains neutral; its popup shows each shelf’s error separately.',libraryMode:'popup',simulation:{failure:true}},
  {id:'rivulet',label:'Rivulet playback',description:'Use the same library with Rivulet as the selected Apple TV playback app.',patch:{apple_tv:{...config.apple_tv,plex:{playback_app:'rivulet',browse_entity:'media_player.plex',library_root:config.apple_tv.plex.library_root}}}},
  {id:'multiple-tvs',label:'Choose a television',description:'Switch between the named Living room and Bedroom Apple TV mappings.',multiple:true},
  {id:'empty',label:'Empty library',description:'The three shelves explain when there are no titles to show.',simulation:{empty:true}},
  {id:'partial-failure',label:'One shelf fails',description:'Movies show a readable error while Continue Watching and TV Series remain usable.',simulation:{partialFailure:true}},
  {id:'failure',label:'Library request fails',description:'A failed fictional request retains an explicit Retry action.',simulation:{failure:true}},
  {id:'loading',label:'Loading library',description:'Keep loading feedback visible while the fictional request is pending.',simulation:{loading:true}},
  {id:'unavailable',label:'Unavailable television',description:'Library browsing remains read-only and playback is disabled for an unavailable TV.',states:{'media_player.living_room':'unavailable'}},
  {id:'disconnected',label:'Disconnected',description:'Show a neutral connection problem without issuing playback commands.',simulation:{disconnected:true}},
];
const bedroom={...config,entity_id:'media_player.bedroom',name:'Bedroom Apple TV',apple_tv:structuredClone(config.apple_tv)};

export const plexLibraryReference={
  id:'md_plex_library_card',slug:'plex-library',title:'Plex library',description:'Browse Continue Watching, Movies and TV Series, then play a title on your selected Apple TV through Plex or Rivulet.',config,domains:['media_player'],
  fields:[
    {path:'apple_tv.plex.display',label:'Library layout',kind:'select',options:['inline','popup'],default:'inline',description:'Full shelves (inline) or a compact poster card opening the full library (popup). Omission preserves full shelves.'},
    {path:'entity_id',label:'Apple TV',kind:'entity',description:'The Apple TV used for playback.'},
    ...['playback_app','client_entity','browse_entity','scan_clients_entity','app_source','library_root','continue_watching'].map(key=>({path:'apple_tv.plex.'+key,label:key.replaceAll('_',' '),kind:['library_root','continue_watching'].includes(key)?'json':'text',description:({playback_app:'Plex (default) or Rivulet.',client_entity:'Plex playback client; required for Plex playback.',browse_entity:'Optional Plex metadata entity, including for Rivulet.',scan_clients_entity:'Plex scan-clients button; required for Plex playback.',app_source:'Exact Plex source supported by the Apple TV; required for Plex playback.',library_root:'Server reference selected through Choose library folders.',continue_watching:'Optional same-server folder when automatic discovery is ambiguous.'})[key]})),
  ],
  notes:['Add the Plex library card directly in Home Assistant and configure its Apple TV and Plex setup.'],
  previewLimitations:['The gallery shows the real Plex library renderer with fictional titles, generated artwork and in-memory browse responses. Playback requests affect only fictional state; they do not play a video or connect to Home Assistant or Plex. Copy YAML exports the standalone Plex library card configuration.'],
  scenarios:examples.map(item=>{
    const current={...structuredClone(config),...structuredClone(item.patch||{})};
    current.apple_tv.plex.display=item.libraryMode==='popup'?'popup':'inline';
    return {...item,behavior:item.id,presentation:'plex-library',config:current,
      states:scenarioStates({...states,...item.states,...(item.multiple?{'media_player.bedroom':{entity_id:'media_player.bedroom',state:'on',attributes:{friendly_name:'Bedroom Apple TV',source:'Plex',source_list:['Plex'],supported_features:2688}},'remote.bedroom':{entity_id:'remote.bedroom',state:'on',attributes:{}}}:{})}),
      dashboard:{...structuredClone(demoDashboard),views:[{path:'home',cards:item.multiple?[current,bedroom]:[current]}]}};
  }),
};
