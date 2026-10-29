import {clone, newEntityGroupId} from './editor-model.js';
import {floorPlanErrors, floorPageErrors, imageBounds, floorPosition, imagePoint} from '../custom_components/marao_dashboard/frontend/MaraoFloorPlan.js';
import {floorText} from '../custom_components/marao_dashboard/frontend/MaraoFloorPlanText.js';

export async function uploadFloorImage(hass, file, current = () => true) {
  if (!['image/png','image/jpeg'].includes(file?.type)) throw new Error('Upload a PNG or JPEG image.');
  const data=new FormData();data.append('file',file);
  const response=await hass.fetchWithAuth('/api/image/upload',{method:'POST',body:data});
  if(!response.ok) throw new Error('Image upload failed.');
  const image=await response.json();
  if(typeof image.id!=='string'||!/^[a-f0-9]{32}$/.test(image.id))throw new Error('Image upload failed.');
  return current() ? image.id : null;
}
export function acceptFloorTrace(light, points) {
  if (!Array.isArray(points) || points.length < 2 || new Set(points.map(point => `${point.x},${point.y}`)).size < 2) return false;
  light.strip = {...light.strip, width:light.strip?.width??6, points:clone(points)};
  return true;
}
export function floorMove(target) {
  const before = clone(target);
  return { cancel() { Object.assign(target, before); } };
}

export function openFloorPlanEditor(panel, roomIndex, cardIndex, kind) {
  const container=panel._editableContainer(kind,roomIndex),existing=cardIndex==null?null:container.entities[cardIndex];
  const model=panel._model,epoch=panel._documentEpoch,revision=panel._revision,lifecycle=panel._lifecycle;
  const draft=clone(existing||{template:'md_floor_plan_card',id:newEntityGroupId().replace('group-','card-'),name:'',variables:{lights:[]}});
  const options=draft.variables ||= {lights:[]};options.lights ||= [];
  const t=label=>floorText(panel._hass,label),dialog=panel._dialog(t('Floor Plan'));
  const active=()=>panel.isConnected&&dialog.isConnected&&dialog.open&&model===panel._model&&epoch===panel._documentEpoch&&revision===panel._revision&&lifecycle===panel._lifecycle;
  const host=dialog.querySelector('.dialog-content');
  host.innerHTML=`<style>
    .floor-editor{display:grid;gap:12px;min-width:0}.floor-editor *{box-sizing:border-box}.floor-editor button,.floor-editor select,.floor-editor input{font:inherit;min-height:48px;min-width:48px;max-width:100%;color:var(--primary-text-color);background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:16px;padding:8px}.floor-editor button:focus,.floor-editor select:focus,.floor-editor input:focus{outline:none}
    .floor-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.floor-tools>*{flex:0 1 auto}.floor-tools select{flex:1;min-width:48px}.floor-workspace{display:grid;gap:8px;min-width:0}
    .floor-canvas{position:relative;height:360px;min-height:240px;max-height:55dvh;background:var(--secondary-background-color);border-radius:16px;overflow:hidden}
    .floor-canvas img,.floor-canvas svg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}.floor-canvas svg{overflow:visible}
    .floor-marker{position:absolute;transform:translate(-50%,-50%);width:48px;height:48px;padding:0!important;touch-action:none;display:grid;place-items:center;background:var(--ha-card-background)!important}
    .floor-marker[aria-pressed=true]{border:3px solid var(--primary-color)}.floor-point{border-radius:8px!important;font-size:.8rem}.floor-editor [hidden]{display:none!important}.floor-status{overflow-wrap:anywhere;min-height:1.5em}
  </style><div class="floor-editor"><div data-general></div><p data-help></p><label data-upload-label><input type="file" accept="image/png,image/jpeg" data-upload></label><button type="button" data-upload-retry hidden></button><div class="floor-workspace"><div class="floor-canvas"><img alt=""><svg aria-hidden="true"></svg><div data-markers></div></div><div class="floor-tools"><button type="button" data-add></button><select data-lights></select><div class="floor-tools" data-strip-tools></div></div><p class="floor-status" data-status role="status"></p></div><div class="dialog-actions"><ha-button data-close></ha-button><ha-button data-save appearance="filled"></ha-button></div></div>`;
  const q=selector=>dialog.querySelector(selector),canvas=q('.floor-canvas'),img=q('img'),svg=q('svg'),markers=q('[data-markers]'),status=q('[data-status]');
  let selected=-1,pointIndex=-1,trace=null,placing=false,drag=null,lightDialog=null,suppressClick=false,uploadAttempt=0,uploading=false,lastFile=null,localURL=null,retryUpload=false;
  const general={name:draft.name||'',full_page:options.full_page===true};
  panel._mountForm(q('[data-general]'),general,[panel._schema('name',t('Name'),{text:{}}),panel._schema('full_page',t('Full page'),{boolean:{}})],value=>{
    draft.name=value.name; if(value.full_page!==general.full_page||Object.hasOwn(options,'full_page'))options.full_page=value.full_page; draw();
  });
  q('[data-help]').textContent=t('Images are stored in Home Assistant immediately. Save applies the arrangement.');
  q('[data-upload-label]').prepend(document.createTextNode(t(existing?'Replace image':'Upload image')+' '));
  q('[data-lights]').setAttribute('aria-label',t('Lights'));
  function message(text,error=false){status.textContent=text;status.setAttribute('role',error?'alert':'status');}
  function releasePreview(){if(localURL){URL.revokeObjectURL(localURL);localURL=null;}}
  async function upload(file) {
    lastFile=file;const attempt=++uploadAttempt;uploading=true;q('[data-save]').disabled=true;q('[data-upload-retry]').hidden=true;
    message(t('Loading image…'));draw();
    try {
      if(!['image/png','image/jpeg'].includes(file?.type))throw new Error('Upload a PNG or JPEG image.');
      releasePreview();localURL=URL.createObjectURL(file);img.src=localURL;
      const id=await uploadFloorImage(panel._hass,file,()=>active()&&attempt===uploadAttempt);
      if(!active()||attempt!==uploadAttempt)return;
      options.image_id=id;releasePreview();img.src=`/api/image/serve/${id}/original`;message('');
    }catch(error){if(active()&&attempt===uploadAttempt){releasePreview();if(options.image_id)img.src=`/api/image/serve/${options.image_id}/original`;else img.removeAttribute('src');message(t(error.message),true);retryUpload=true;q('[data-upload-retry]').hidden=false;}}
    finally{if(active()&&attempt===uploadAttempt){uploading=false;q('[data-save]').disabled=false;draw();}}
  }
  q('[data-upload]').addEventListener('change',event=>{if(event.target.files[0])upload(event.target.files[0]);});
  q('[data-upload-retry]').textContent=t('Retry');q('[data-upload-retry]').onclick=()=>{if(retryUpload&&lastFile)upload(lastFile);else if(options.image_id){message(t('Loading image…'));q('[data-upload-retry]').hidden=true;img.src=`/api/image/serve/${options.image_id}/original`;}};
  img.onload=()=>{if(active())draw();};img.onerror=()=>{if(active()&&options.image_id&&!uploading){retryUpload=false;message(t('Image could not load.'),true);q('[data-upload-retry]').hidden=false;}};
  if(options.image_id)img.src=`/api/image/serve/${options.image_id}/original`;
  const light=()=>options.lights[selected];
  function button(label,run){const b=document.createElement('button');b.type='button';b.textContent=t(label);b.onclick=()=>{panel._moveHaptic();run();};return b;}
  function choose(index) { cancelDrag();selected=index;pointIndex=-1;trace=null;placing=false;message('');draw(); }
  function editLight(index,point) {
    if(!active()||lightDialog||uploading)return;
    if(index!=null)choose(index);
    const item=index==null?{id:newEntityGroupId(),entity_id:'',...point}:light();
    const edited=clone(item),child=panel._dialog(t(index==null?'Add light':'Light'));
    lightDialog=child;dialog.inert=true;
    const content=child.querySelector('.dialog-content');
    content.innerHTML='<div data-form></div><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-remove></ha-button><ha-button data-close></ha-button><ha-button data-save appearance="filled"></ha-button></div>';
    const data={entity_id:item.entity_id,name:item.name||'',icon:item.icon||'',...(item.strip?{width:item.strip.width??6}:{})};
    const schema=[panel._schema('entity_id',t('Light'),{entity:{domain:['light']}},true),panel._schema('name',t('Name'),{text:{}}),panel._schema('icon',t('Icon'),{icon:{}})];
    if(item.strip)schema.push(panel._schema('width',t('Strip thickness'),{number:{min:1,max:32,step:1,mode:'box'}}));
    panel._mountForm(content.querySelector('[data-form]'),data,schema,value=>{
      edited.entity_id=value.entity_id;
      for(const key of ['name','icon'])if(value[key]||Object.hasOwn(item,key))edited[key]=value[key]??'';else delete edited[key];
      if(edited.strip&&(Object.hasOwn(item.strip,'width')||value.width!==data.width))edited.strip.width=value.width;
    });
    const close=()=>panel._closeDialog(child);
    const remove=content.querySelector('[data-remove]');remove.textContent=t('Remove light');remove.hidden=index==null;
    remove.onclick=()=>{if(!active()||!child.open||index==null)return;options.lights.splice(index,1);choose(Math.min(index,options.lights.length-1));close();};
    content.querySelector('[data-close]').textContent=t('Cancel');content.querySelector('[data-close]').onclick=close;
    content.querySelector('[data-save]').textContent=t(index==null?'Create':'Update');
    content.querySelector('[data-save]').onclick=()=>{
      if(!active()||!child.open)return;
      const errors=floorPlanErrors({...options,lights:[edited]});
      if(errors.length){content.querySelector('[data-error]').textContent=errors.map(t).join('\n');return;}
      if(index==null){options.lights.push(edited);selected=options.lights.length-1;}else options.lights[index]=edited;
      placing=false;message('');close();
    };
    child.addEventListener('closed',()=>{
      if(lightDialog!==child)return;lightDialog=null;dialog.inert=false;
      if(active()){draw();panel._focusWithoutScroll(markers.querySelector(`[data-light-index="${selected}"]`)||q('[data-add]'));}
    },{once:true});
  }
  function drawTools(){
    const tools=q('[data-strip-tools]');tools.replaceChildren();q('[data-add]').hidden=trace!==null;
    q('[data-add]').disabled=!img.naturalWidth||uploading;
    q('[data-lights]').hidden=!options.lights.length||trace!==null;
    const item=light();if(!item)return;
    if(trace!==null){
      tools.append(button('Finish',()=>{if(!acceptFloorTrace(item,trace)){message(t('A strip needs at least two distinct image points.'),true);return;}trace=null;message('');draw();}),
        button('Undo point',()=>{trace.pop();draw();}),button('Cancel trace',()=>{trace=null;message('');draw();}));return;
    }
    tools.append(button('Edit light',()=>editLight(selected)),button('Draw strip',()=>{placing=false;trace=[];pointIndex=-1;message(t('Tap points on the image, then Finish.'));draw();}));
    if(item.strip)tools.append(button('Remove strip',()=>{delete item.strip;pointIndex=-1;draw();}));
    if(pointIndex>=0)tools.append(button('Remove point',()=>{
      const next=item.strip.points.filter((_p,i)=>i!==pointIndex);
      if(next.length<2){message(t('A strip needs at least two distinct image points.'),true);return;}
      item.strip.points=next;pointIndex=-1;message('');draw();
    }));
  }
  function bounds(){const box=canvas.getBoundingClientRect();return imageBounds(box.width,box.height,img.naturalWidth||1,img.naturalHeight||1);}
  function locate(event){const box=canvas.getBoundingClientRect();return imagePoint(event.clientX-box.left,event.clientY-box.top,bounds());}
  function cancelDrag(){if(drag){const current=drag;drag=null;current.move.cancel();try{current.button.releasePointerCapture(current.pointer);}catch{}}}
  function marker(point,label,onSelect,target) {
    const b=button(label,onSelect);b.className='floor-marker'+(typeof label==='number'?' floor-point':'');
    const box=canvas.getBoundingClientRect(),p=floorPosition(point,bounds());b.style.left=Math.min(box.width-24,Math.max(24,p.x))+'px';b.style.top=Math.min(box.height-24,Math.max(24,p.y))+'px';
    b.setAttribute('aria-label',typeof label==='number'?`${t('Point')} ${label}`:label);b.onclick=event=>{event.stopPropagation();if(!suppressClick||event.detail===0){panel._moveHaptic();onSelect();}};
    b.addEventListener('pointerdown',event=>{if(event.button!==0||!active()||lightDialog||trace!==null)return;event.stopPropagation();event.preventDefault();cancelDrag();drag={target,move:floorMove(target),pointer:event.pointerId,button:b,startX:event.clientX,startY:event.clientY,moved:false};b.setPointerCapture(event.pointerId);});
    b.addEventListener('pointermove',event=>{
      if(!drag||drag.button!==b||drag.pointer!==event.pointerId)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<4)return;
      const p=locate(event);if(p){Object.assign(target,p);drag.moved=true;const screen=floorPosition(p,bounds());b.style.left=screen.x+'px';b.style.top=screen.y+'px';drawPaths();}
    });
    b.addEventListener('pointerup',event=>{
      if(!drag||drag.button!==b||drag.pointer!==event.pointerId)return;
      const moved=drag.moved;drag=null;suppressClick=true;b.releasePointerCapture(event.pointerId);panel._moveHaptic();
      if(moved)draw();else onSelect();
    });
    const cancel=()=>{if(drag?.button===b){cancelDrag();suppressClick=true;draw();}};
    b.addEventListener('pointercancel',cancel);b.addEventListener('lostpointercapture',cancel);markers.append(b);return b;
  }
  function drawPaths(){svg.replaceChildren();const box=canvas.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    for(const [i,item] of options.lights.entries()) {const points=i===selected&&trace!==null?trace:item.strip?.points;if(!points?.length)continue;const path=document.createElementNS('http://www.w3.org/2000/svg','polyline');path.setAttribute('points',points.map(point=>{const p=floorPosition(point,bounds());return `${p.x},${p.y}`;}).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',i===selected?'var(--primary-color)':'var(--secondary-text-color)');path.setAttribute('stroke-width',String(item.strip?.width??6));path.setAttribute('stroke-linejoin','round');svg.append(path);}
  }
  function draw(){
    if(!active())return;drawPaths();markers.replaceChildren();
    for(const [i,item] of options.lights.entries()) {const b=marker(item,item.name||item.entity_id,()=>{if(trace===null)editLight(i);},item);b.textContent=String(i+1);b.dataset.lightIndex=String(i);b.setAttribute('aria-pressed',String(i===selected));}
    if(light()?.strip&&trace===null)light().strip.points.forEach((point,index)=>{const b=marker(point,index+1,()=>{pointIndex=index;draw();},point);b.setAttribute('aria-pressed',String(index===pointIndex));});
    const list=q('[data-lights]');list.replaceChildren();for(const [i,item]of options.lights.entries()){const o=document.createElement('option');o.value=String(i);o.textContent=item.name||item.entity_id;list.append(o);}list.value=String(selected);list.hidden=!options.lights.length;
    drawTools();
    const positions=options.lights.map(p=>floorPosition(p,bounds()));if(!placing&&trace===null&&positions.some((p,i)=>positions.slice(i+1).some(q=>Math.abs(p.x-q.x)<48&&Math.abs(p.y-q.y)<48)))message(t('Buttons overlap. Use Lights to reach every control.'));
  }
  canvas.addEventListener('pointerdown',()=>{suppressClick=false;},{capture:true});
  canvas.addEventListener('click',event=>{if(suppressClick||event.target.closest('button')||!active()||lightDialog||!img.naturalWidth)return;const point=locate(event);if(!point)return;if(trace!==null){trace.push(point);draw();}else if(placing)editLight(null,point);});
  q('[data-add]').textContent=t('Add light');q('[data-add]').onclick=()=>{panel._moveHaptic();cancelDrag();trace=null;pointIndex=-1;placing=true;message(t('Tap the image to place a light.'));draw();};
  q('[data-lights]').onchange=event=>editLight(Number(event.target.value));
  q('[data-close]').textContent=t('Cancel');q('[data-close]').onclick=()=>panel._closeDialog(dialog);
  q('[data-save]').textContent=t(existing?'Update':'Create');q('[data-save]').onclick=()=>{
    if(!active()||uploading||lightDialog)return;cancelDrag();if(trace!==null){message(t('A strip needs at least two distinct image points.'),true);return;}
    const errors=floorPlanErrors(options);const pages=Array.isArray(model.pages)?model.pages:[];
    const page=kind==='page'?pages[Number(String(roomIndex).split(':')[0])]:null;
    if(page){const index=cardIndex??container.entities.length;const containers=(page.sections||[page]).map(section=>section===container?{...section,entities:section.entities.map((card,i)=>i===index?draft:card).concat(cardIndex==null?[draft]:[])}:section);errors.push(...floorPageErrors(page,containers));}
    if(errors.length){message(errors.map(t).join('\n'),true);return;}
    if(existing&&container.entities[cardIndex]!==existing)return;
    if(existing)container.entities[cardIndex]=draft;else container.entities.push(draft);
    panel._setDirty();panel._refreshCards(kind,roomIndex);panel._closeDialog(dialog);
  };
  const observer=new ResizeObserver(()=>{if(!drag)draw();});observer.observe(canvas);
  const cleanup=()=>{cancelDrag();if(lightDialog)panel._closeDialog(lightDialog);uploadAttempt++;releasePreview();observer.disconnect();};dialog.addEventListener('closed',cleanup,{once:true});
  dialog.addEventListener('close',cleanup,{once:true});
  panel._activityEvents?.signal.addEventListener('abort',()=>{cleanup();panel._closeDialog(dialog);detach.disconnect();},{once:true});
  const detach=new MutationObserver(()=>{if(!active()){cleanup();detach.disconnect();}});detach.observe(panel.shadowRoot,{childList:true,subtree:true});
  choose(options.lights.length?0:-1);return dialog;
}
