// Edit only explicitly changed fields; retain unavailable references and opaque options.
export function mountLocationSettings(host,draft,hass,mountForm,schema){
 const pt=String(hass.language).startsWith('pt'),t=(en,local)=>pt?local:en;
 const invalid=new Set();
 const section=document.createElement('section');section.className='shortcuts';host.append(section);
 const heading=document.createElement('h3');heading.textContent=t('Current room shortcut','Atalho da divisão atual');section.append(heading);
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
  const list=document.createElement('div');section.append(list);
  const addRow=(id,entry)=>{
   const row=document.createElement('section');row.className='route fields';list.append(row);let currentId=id;
   const warning=document.createElement('p');warning.className='warning';warning.setAttribute('role','alert');warning.hidden=true;
   warning.textContent=t('Choose a unique person or room and its sensor or page, or remove this mapping.','Escolha uma pessoa ou divisão única e o respetivo sensor ou página, ou remova esta associação.');
   mountForm(row,{[idField]:id,[field]:entry[field]},[{...schema(idField,label,selector),required:true},{...schema(field,fieldLabel,fieldSelector),required:true}],value=>{
    const nextId=value[idField],map=ensure()[key] ||= {};
    const valid=Boolean(nextId&&value[field]&&(nextId===currentId||!Object.hasOwn(map,nextId)));
    warning.hidden=valid;if(!valid){invalid.add(row);return;}invalid.delete(row);
    const next={...entry,[field]:value[field]};if(nextId!==currentId)delete map[currentId];map[nextId]=next;currentId=nextId;
   });
   const remove=document.createElement('button');remove.type='button';remove.textContent=t('Remove','Remover');remove.onclick=()=>{delete ensure()[key][currentId];invalid.delete(row);row.remove();};row.append(warning,remove);
  };
  for(const [id,entry] of Object.entries(current?.[key]||{}))addRow(id,entry);
  const add=document.createElement('div');section.append(add);
  const form=mountForm(add,{},[schema(idField,t('Add ','Adicionar ')+label,selector),schema(field,fieldLabel,fieldSelector)],value=>{if(!value[idField]||!value[field])return;const map=ensure()[key] ||= {};if(Object.hasOwn(map,value[idField]))return;map[value[idField]]={[field]:value[field]};form.data={};addRow(value[idField],map[value[idField]]);});
 }
 return()=>{if(invalid.size)throw new Error('Invalid current room mappings.');};
}
