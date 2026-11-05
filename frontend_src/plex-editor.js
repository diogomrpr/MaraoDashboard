import {browsePlex, plexBrowseEntity, plexServerRoots, rivuletPlayback, plexConfigError, plexError, plexReference, plexText, plexURI} from '../custom_components/marao_dashboard/frontend/MaraoPlexModel.js';

export function mountPlexOptions(editor, host, player, original) {
  const t = value => plexText(editor._hass,value), initial = original && typeof original === 'object' ? structuredClone(original) : {};
  const candidates = (player.apple_tv?.apps || []).map(app=>app.source).filter(source=>/^(plex|com\.plexapp\.plex)$/i.test(source || ''));
  const data = {enabled:Boolean(original && typeof original === 'object'),playback_app:initial.playback_app || 'plex',browse_entity:initial.browse_entity || '',client_entity:initial.client_entity || '',scan_clients_entity:initial.scan_clients_entity || '',app_source:initial.app_source || (candidates.length === 1 ? candidates[0] : 'Plex')};
  const initialData={...data};
  let changed = false, folders = {...initial}, registry = [];
  const heading = document.createElement('h3'); heading.textContent=t('Plex setup');
  const hint = document.createElement('p'); hint.textContent=t('Use the same Plex profile in Home Assistant and the Apple TV app. Open Plex once on the TV so Home Assistant can discover its client.');
  const form = document.createElement('div'), state = document.createElement('p'), choose = document.createElement('button');
  choose.type='button';choose.textContent=t('Choose library folders');choose.style.minHeight='48px';
  host.append(heading,hint,form,state,choose);
  const sync = () => { choose.disabled=!data.enabled;state.textContent=folders.library_root?t('Library configured'):t('Choose a Plex server folder.');hint.textContent=t(rivuletPlayback(data)?'Use the same Plex server and profile in Home Assistant and Rivulet. Play a title in Rivulet once so Home Assistant can discover a session for browsing. The browse entity is optional and never receives Rivulet playback commands.':'Use the same Plex profile in Home Assistant and the Apple TV app. Open Plex once on the TV so Home Assistant can discover its client.'); };
  const renderForm=()=>{form.replaceChildren();editor._mountForm(form,data,[
    editor._schema('enabled','Enable Plex library',{boolean:{}}),
    editor._schema('playback_app','Playback app',{select:{mode:'dropdown',options:[{value:'plex',label:'Plex'},{value:'rivulet',label:'Rivulet'}]}}),
    editor._schema('browse_entity','Plex browse entity (optional)',{entity:{domain:['media_player'],integration:'plex'}}),
    ...(!rivuletPlayback(data)?[
    editor._schema('client_entity','Plex client',{entity:{domain:['media_player']}}),
    editor._schema('scan_clients_entity','Scan-clients button',{entity:{domain:['button']}}),
    editor._schema('app_source','Plex app source',{text:{}}),
    ]:[]),
  ],value=>{const previous=data.playback_app;if(JSON.stringify(value)!==JSON.stringify(data))changed=true;Object.assign(data,value);sync();if(previous!==data.playback_app)renderForm();});};
  renderForm();
  choose.onclick=()=>{
    editor._moveHaptic();
    const dialog=editor._dialog(t('Choose library folders')), content=dialog.querySelector('.dialog-content');
    let live=true, request=0, history=[];
    dialog.addEventListener?.('closed',()=>{live=false;request++;},{once:true});
    const button=(label,action)=>{const control=document.createElement('button');control.type='button';control.textContent=label;control.style.cssText='min-height:48px;min-width:48px;white-space:normal;overflow-wrap:anywhere';control.onclick=()=>{editor._moveHaptic();action();};return control;};
    const load=async(folder,back=false)=>{
      const token=++request, account=editor._hass?.user?.id, connection=editor._hass?.connection, source=JSON.stringify(data);
      content.replaceChildren();const status=document.createElement('p');status.setAttribute('role','status');status.textContent=t('Loading library…');content.append(status);
      const current=()=>live&&dialog.open!==false&&token===request&&source===JSON.stringify(data)&&account===editor._hass?.user?.id&&connection===editor._hass?.connection;
      try {
        const server=plexURI(folder?.media_content_id)?.host;
        const read=async()=>{
          if(rivuletPlayback(data)&&!folder)return{title:'Plex',children:await plexServerRoots(editor._hass)};
          const client=await plexBrowseEntity(editor._hass,data,server);
          if(!current())return null;
          return browsePlex(editor._hass,client,folder,server);
        };
        const [node, entities]=await Promise.all([read(),editor._hass.callWS({type:'config/entity_registry/list'})]);
        if(!current())return;
        registry=entities;
        if(!folder&&rivuletPlayback(data)&&!node.children?.length)throw new Error('No Plex servers were returned.');
        if(!back)history.push(folder);
        content.replaceChildren();
        if(history.length>1)content.append(button(t('Back'),()=>{history.pop();load(history.at(-1),true);}));
        const title=document.createElement('h3');title.textContent=node.title;content.append(title);
        if(node.media_content_type==='server'&&plexURI(node.media_content_id)?.pathname==='/server')content.append(button(t('Use this server'),()=>{folders.library_root={...(folders.library_root || {}),...plexReference(node)};changed=true;sync();}));
        if(node.media_content_type==='hub')content.append(button(t('Use for Continue Watching'),()=>{folders.continue_watching={...(folders.continue_watching || {}),...plexReference(node)};changed=true;sync();live=false;editor._closeDialog(dialog);}));
        const children=(node.children || []).filter(item=>item.can_expand && ['server','library','hub'].includes(item.media_content_type));
        if(!children.length){const empty=document.createElement('p');empty.textContent=t('This folder is empty.');content.append(empty);}
        for(const child of children){
          content.append(button(child.title,()=>load(child)));
          if(rivuletPlayback(data)&&!folder&&child.media_content_type==='server')content.append(button(`${t('Use this server')}: ${child.title}`,()=>{folders.library_root={...(folders.library_root || {}),...plexReference(child)};if(folders.continue_watching&&!plexReference(folders.continue_watching,plexURI(child.media_content_id).host))delete folders.continue_watching;changed=true;sync();live=false;editor._closeDialog(dialog);}));
        }
        content.append(button(t('Use automatic Continue Watching'),()=>{delete folders.continue_watching;changed=true;sync();live=false;editor._closeDialog(dialog);}));
      }catch(error){if(!current())return;status.textContent=t(plexError(error));status.setAttribute('role','alert');content.append(button(t('Retry'),()=>load(folder,true)));}
      if(current())content.append(button(t('Cancel'),()=>{live=false;request++;editor._closeDialog(dialog);}));
    };
    load(null);
  };
  sync();
  return {value(){
    if(!changed)return original;
    if(!data.enabled)return false;
    const value={...folders};
    for(const key of ['playback_app','browse_entity','client_entity','scan_clients_entity','app_source']){
      if(data[key]!==initialData[key]||!rivuletPlayback(data)&&['client_entity','scan_clients_entity','app_source'].includes(key)&&!Object.hasOwn(value,key)){
        if(data[key])value[key]=data[key];else delete value[key];
      }
    }
    const error=plexConfigError(value,player,registry.length?registry:Object.values(editor._hass?.entities || {}));
    if(error)throw new Error(t(error));
    return value;
  }};
}
