// Edit only explicitly changed fields; retain unavailable references and opaque options.
export function mountLocationSettings(host,draft,hass,mountForm,schema,pageFor){
 const pt=String(hass.language).startsWith('pt'),t=(en,local)=>pt?local:en;
 const invalid=new Set();
 const section=document.createElement('section');section.className='shortcuts';host.append(section);
 const heading=document.createElement('h3');heading.textContent=t('Current room','Divisão atual');section.append(heading);
 const general=document.createElement('h4');general.textContent=t('General','Geral');section.append(general);
 let current=draft.navbar.current_room;
 const ensure=()=>current ||= (draft.navbar.current_room={enabled:false,people:{},rooms:{}});
 const enabled=document.createElement('div');section.append(enabled);
 mountForm(enabled,{enabled:current?.enabled===true},[schema('enabled',t('Show current room','Mostrar divisão atual'),{boolean:{}})],value=>{ensure().enabled=value.enabled;});
 const away=document.createElement('div');section.append(away);
 let previousAway=current?.away_path||'';
 mountForm(away,{away_path:previousAway},[schema('away_path',t('Optional Away page','Página Ausente opcional'),{navigation:{}})],value=>{if(value.away_path!==previousAway){ensure().away_path=value.away_path||'';previousAway=value.away_path;}});
 for(const [key,idField,label,selector,field,fieldLabel,fieldSelector] of [
  ['people','person',t('Person','Pessoa'),{entity:{domain:['person']}},'area_sensor',t('Bermuda Area sensor','Sensor de divisão Bermuda'),{entity:{domain:['sensor']}}],
  ['rooms','area',t('Room','Divisão'),{area:{}},'path',t('Room page','Página da divisão'),{navigation:{}}]
 ]){
  const heading=document.createElement('h4');heading.textContent=key==='people'?t('People and location sources','Pessoas e fontes de localização'):t('Rooms and pages','Divisões e páginas');section.append(heading);
  const list=document.createElement('div');section.append(list);
  const addRow=(id,entry)=>{
   const row=document.createElement('section');row.className='route fields';list.append(row);let currentId=id;
   let fields=row;
   if(key==='people'){const context=document.createElement('p');const state=hass.states?.[id];const source=hass.states?.[entry.area_sensor];context.textContent=[state?.attributes?.friendly_name||id,state?.attributes?.user_id? t('Account: ','Conta: ')+state.attributes.user_id:'',source?.attributes?.friendly_name||entry.area_sensor,(()=>{const device=hass.devices?.[hass.entities?.[entry.area_sensor]?.device_id];return device?.name_by_user||device?.name||'';})()].filter(Boolean).join(' · ');row.append(context);}
   if(key==='rooms'){const toggle=document.createElement('button');toggle.type='button';const title=()=>{toggle.textContent=(hass.areas?.[currentId]?.name||currentId)+' · '+entry.path+' ▾';};title();toggle.setAttribute('aria-expanded','false');row.append(toggle);fields=document.createElement('div');fields.hidden=true;row.append(fields);toggle.onclick=()=>{fields.hidden=!fields.hidden;toggle.setAttribute('aria-expanded',String(!fields.hidden));};row.updateHeading=title;}

   const missing=document.createElement('p');missing.className='warning';missing.setAttribute('role','status');missing.hidden=key==='rooms'?(!hass.areas||Boolean(hass.areas[id]))&&(!pageFor||Boolean(pageFor(entry.path))):!hass.states||Boolean(hass.states[id]&&hass.states[entry.area_sensor]);missing.textContent=t('A saved reference is unavailable or its destination no longer exists. It is retained until you change or remove it.','Uma referência guardada está indisponível ou o destino já não existe. É preservada até ser alterada ou removida.');fields.append(missing);
   const warning=document.createElement('p');warning.className='warning';warning.setAttribute('role','alert');warning.hidden=true;
   warning.textContent=t('Choose a unique person or room and its sensor or page, or remove this mapping.','Escolha uma pessoa ou divisão única e o respetivo sensor ou página, ou remova esta associação.');
   mountForm(fields,{[idField]:id,[field]:entry[field]},[{...schema(idField,label,selector),required:true},{...schema(field,fieldLabel,fieldSelector),required:true}],value=>{
    const nextId=value[idField],map=ensure()[key] ||= {};
    const valid=Boolean(nextId&&value[field]&&(nextId===currentId||!Object.hasOwn(map,nextId)));
    warning.hidden=valid;if(!valid){invalid.add(row);return;}invalid.delete(row);
    const next={...entry,[field]:value[field]};if(nextId!==currentId)delete map[currentId];map[nextId]=next;currentId=nextId;Object.assign(entry,next);row.updateHeading?.();
   });
   const remove=document.createElement('button');remove.type='button';remove.textContent=t('Remove','Remover');remove.onclick=()=>{delete ensure()[key][currentId];invalid.delete(row);row.remove();};row.append(warning,remove);
  };
  for(const [id,entry] of Object.entries(current?.[key]||{}))addRow(id,entry);
  const add=document.createElement('div');section.append(add);
  const warning=document.createElement('p');warning.className='warning';warning.hidden=true;warning.setAttribute('role','alert');warning.textContent=t('Complete both fields with a unique mapping and choose Add, or clear them.','Preencha ambos os campos com uma associação única e escolha Adicionar, ou limpe-os.');
  let pending={};
  const form=mountForm(add,{},[schema(idField,t('Add ','Adicionar ')+label,selector),schema(field,fieldLabel,fieldSelector)],value=>{pending={...value};const attempted=Boolean(value[idField]||value[field]);warning.hidden=!attempted;if(attempted)invalid.add(add);else invalid.delete(add);});
  const button=document.createElement('button');button.type='button';button.textContent=t('Add','Adicionar');button.onclick=()=>{const id=pending[idField],value=pending[field];if(!id||!value||Object.hasOwn(current?.[key]||{},id)){invalid.add(add);warning.hidden=false;return;}const target=ensure()[key] ||= {};target[id]={[field]:value};form.data={};pending={};invalid.delete(add);warning.hidden=true;addRow(id,target[id]);};add.append(warning,button);

 }
 const validate=()=>{if(invalid.size)throw new Error(t('Complete or remove the invalid current room mappings.','Complete ou remova as associações inválidas da divisão atual.'));};validate.section=section;return validate;
}
