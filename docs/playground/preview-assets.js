const svg = content => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(content);
export const cameraImage = svg('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#cbdad9"/><path d="M0 230L140 80L270 235L410 130L620 275L800 160V450H0Z" fill="#809e9e"/><path d="M200 450V240L390 110L580 240V450" fill="#f0eee3"/><path d="M165 250L390 90L610 250" fill="none" stroke="#506f79" stroke-width="28"/><path d="M340 450V300H440V450" fill="#506f79"/><rect x="250" y="280" width="60" height="70" rx="6" fill="#9bb9bd"/><rect x="475" y="280" width="60" height="70" rx="6" fill="#9bb9bd"/><text x="400" y="420" text-anchor="middle" font-family="sans-serif" font-size="25" fill="#263338">Fictional camera image</text></svg>');
export const floorImage = svg('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" rx="20" fill="#e7ecea"/><g fill="#fefefa" stroke="#506f79" stroke-width="10"><path d="M35 35H765V565H35Z"/><path d="M460 35V330H765M35 330H460V565"/></g><g fill="#adcbd8"><rect x="95" y="80" width="250" height="70" rx="20"/><rect x="75" y="100" width="65" height="170" rx="20"/><rect x="550" y="90" width="140" height="150" rx="12"/><rect x="130" y="400" width="190" height="95" rx="16"/></g><g font-family="sans-serif" font-size="30" fill="#263338" text-anchor="middle"><text x="260" y="290">Living room</text><text x="610" y="290">Kitchen</text><text x="245" y="540">Bedroom</text><text x="620" y="470">Hall</text></g></svg>');

export const memoryStorage = () => {
  const items = new Map();
  return {getItem:key=>items.get(String(key)) ?? null,setItem:(key,value)=>items.set(String(key),String(value)),removeItem:key=>items.delete(String(key)),clear:()=>items.clear()};
};

/** Navigation is simulated independently from the iframe and its parent URL. */
export function browserEnvironment(onUnsupported = () => {}) {
  let url = new URL('https://marao.example/marao-dashboard/home');
  const installedPackage={identity:'0'.repeat(64),manifestURL:'https://marao.example/MaraoFrontend.release.json'};
  const entries = [{url:url.href,state:null}]; let index=0;
  const location = {
    get href(){return url.href;},get origin(){return url.origin;},get pathname(){return url.pathname;},get search(){return url.search;},get hash(){return url.hash;},
    assign(){onUnsupported('External links are not available in this preview.');},reload(){onUnsupported('Page refresh is available in Home Assistant.');},
  };
  const move = (destination,state,replace) => {
    const next = new URL(destination || url.href,url);
    if(next.origin !== url.origin){onUnsupported('External links are not available in this preview.');return;}
    url=next;
    if(replace)entries[index]={url:url.href,state};else{entries.splice(++index);entries.push({url:url.href,state});}
  };
  const history = {get state(){return entries[index].state;},get length(){return entries.length;},pushState:(state,_,path)=>move(path,state,false),replaceState:(state,_,path)=>move(path,state,true),back(){if(index){url=new URL(entries[--index].url);globalThis.dispatchEvent?.(new Event('popstate'));globalThis.dispatchEvent?.(new Event('hashchange'));}}};
  const fetch=async(input,options={})=>{
    if(String(input)!==installedPackage.manifestURL||!['GET','HEAD'].includes(options.method||'GET'))throw new Error('Not available in the website preview: external request');
    return new Response(options.method==='HEAD'?null:JSON.stringify(installedPackage),{status:200,headers:{'Content-Type':'application/json'}});
  };
  return {location,history,installedPackage,fetch,storage:memoryStorage(),asset:kind=>kind==='floorplan'?floorImage:cameraImage,reset(){url=new URL('https://marao.example/marao-dashboard/home');entries.splice(0,entries.length,{url:url.href,state:null});index=0;}};
}

// Preview-only projection: preserve exported config while refusing network assets.
export function safePreviewData(value,key='') {
  if(Array.isArray(value))return value.map(item=>safePreviewData(item,key));
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,safePreviewData(item,name)]));
  if(typeof value==='string' && /^(entity_picture|image|image_url|picture|poster|thumbnail|background_image|media_url)$/.test(key))return cameraImage;
  return value;
}
