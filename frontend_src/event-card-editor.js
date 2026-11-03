import {normalizeEventSources} from '../custom_components/marao_dashboard/frontend/MaraoEventModel.js';
const providerKeys=['event_provider','provider','frigate_instance_id','frigate_camera','unifi_protect_media_source'];
function eventSourcesConfig(config,sources){
 const next=structuredClone(config);
 if(config.entity && sources.length===1 && sources[0].entity===config.entity){
  for(const key of ['entity','name',...providerKeys])if(Object.hasOwn(sources[0],key))next[key]=sources[0][key];else delete next[key];
 }else{next.cameras=structuredClone(sources);delete next.entity;for(const key of providerKeys)delete next[key];}
 return next;
}
export function patchEventSources(config,sources){
 const next=eventSourcesConfig(config,sources);normalizeEventSources(next);return next;
}
export function renderEventEditor(editor,host){
 const source=editor._config;
 let draft=structuredClone(source);
 let sources;try{sources=normalizeEventSources(source).map(item=>{const value=structuredClone(item);if(!source.cameras){for(const key of ['type','title','limit','columns','grid_options','visibility'])delete value[key];}return value;});}catch(error){editor._setStatus(editor._error(error));return;}
 const commit=next=>{draft=next;try{normalizeEventSources(draft);editor._setStatus('');editor._commitDescriptor(draft);}catch(error){editor._setStatus(editor._error(error));}};
 const schema=(name,label,selector)=>editor._schema(name,label,selector);
 const fields=document.createElement('div');host.append(fields);
 let previous={title:source.title||'',limit:source.limit??12,columns:source.columns??1};
 editor._mountForm(fields,previous,[schema('title','Title',{text:{}}),schema('limit','Event limit',{number:{min:1,max:100,step:1,mode:'box'}}),schema('columns','Event columns',{number:{min:1,step:1,mode:'box'}})],value=>{const next=structuredClone(draft);for(const key of ['title','limit','columns'])if(value[key]!==previous[key])next[key]=value[key];commit(next);previous={...value};});
 const list=document.createElement('div');host.append(list);
 const draw=()=>{list.replaceChildren();sources.forEach((item,index)=>{
  const row=document.createElement('section');row.style.cssText='display:grid;gap:8px;padding:12px;min-width:0';list.append(row);
  const data={entity:item.entity,name:item.name||'',...Object.fromEntries(providerKeys.map(key=>[key,item[key]||'']))};let before={...data};
  editor._mountForm(row,data,[schema('entity','Camera',{entity:{domain:['camera']}}),schema('name','Display name',{text:{}}),...providerKeys.map(key=>schema(key,({event_provider:'Event provider',provider:'Provider',frigate_instance_id:'Frigate instance',frigate_camera:'Frigate camera',unifi_protect_media_source:'Protect media source'})[key],{text:{}}))],value=>{
   const changed={...sources[index]};for(const key of Object.keys(data))if(value[key]!==before[key]){if(value[key])changed[key]=value[key];else delete changed[key];}
   sources=sources.map((s,i)=>i===index?changed:s);before={...value};commit(eventSourcesConfig(draft,sources));
  });
  for(const [label,offset] of [['Move up',-1],['Move down',1],['Remove',0]]){
   const button=document.createElement('button');button.type='button';button.textContent=editor._l(label);button.disabled=offset<0&&index===0||offset>0&&index===sources.length-1;
   button.onclick=()=>{editor._moveHaptic();const next=sources.slice();if(!offset)next.splice(index,1);else [next[index],next[index+offset]]=[next[index+offset],next[index]];sources=next;commit(eventSourcesConfig(draft,sources));draw();};row.append(button);
  }
 });};draw();
 const add=document.createElement('div');host.append(add);
 const form=editor._mountForm(add,{},[schema('entity','Add camera',{entity:{domain:['camera']}})],value=>{if(!value.entity)return;try{const next=[...sources,{entity:value.entity}];normalizeEventSources({cameras:next});sources=next;commit(eventSourcesConfig(draft,sources));form.data={};draw();}catch(error){editor._setStatus(editor._error(error));}});
}
