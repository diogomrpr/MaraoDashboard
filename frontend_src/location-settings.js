import {createSettingsRow} from './settings-row.js';

// Edit only explicitly changed fields; retain unavailable references and opaque options.
export function mountLocationSettings(host,draft,hass,mountForm,schema,pageFor,haptic=()=>{}){
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
  const list=document.createElement('div');list.setAttribute('data-mappings',key);section.append(list);
  const rows=new Set();let expanded;
  const expand=item=>{expanded=item;for(const saved of rows)saved.item.setExpanded(saved.item===expanded);};
  const duplicate=(id,own)=>Object.hasOwn(current?.[key]||{},id)&&own?.currentId!==id||[...rows].some(saved=>saved!==own&&saved.selectedId===id);
  const addRow=(id,entry,isNew=false)=>{
   const saved={currentId:isNew?undefined:id,selectedId:id},values={[idField]:id,[field]:entry[field]||''};
   const item=createSettingsRow(t('Mapping options','Opções da associação'),[{value:'remove',label:t('Remove','Remover'),icon:'delete-outline'}],action=>{
    if(action!=='remove')return;haptic('heavy');
    if(saved.currentId)delete ensure()[key][saved.currentId];invalid.delete(item.row);rows.delete(saved);item.row.remove();
   });
   saved.item=item;rows.add(saved);const {row,toggle,fields}=item;list.append(row);
   toggle.onclick=()=>{haptic('heavy');expand(expanded===item?undefined:item);};
   const context=document.createElement('p');context.className='hint';if(key==='people')fields.append(context);
   const missing=document.createElement('p');missing.className='warning';missing.setAttribute('role','status');missing.textContent=t('A saved reference is unavailable or its destination no longer exists. It is retained until you change or remove it.','Uma referência guardada está indisponível ou o destino já não existe. É preservada até ser alterada ou removida.');
   const updateHeading=()=>{
    const selected=values[idField],destination=values[field],person=hass.states?.[selected],source=hass.states?.[destination],view=key==='rooms'?pageFor?.(destination):undefined;
    item.update(key==='rooms'?hass.areas?.[selected]?.name||selected||label:person?.attributes?.friendly_name||selected||label,
     key==='rooms'?view?.title||destination||t('Choose a page','Escolha uma página'):source?.attributes?.friendly_name||destination||t('Choose an Area sensor','Escolha um sensor de divisão'),
     key==='rooms'?hass.areas?.[selected]?.icon||view?.icon||'mdi:floor-plan':person?.attributes?.icon||'mdi:account');
    const device=hass.devices?.[hass.entities?.[destination]?.device_id];context.textContent=[person?.attributes?.user_id?t('Account: ','Conta: ')+person.attributes.user_id:'',device?.name_by_user||device?.name||''].filter(Boolean).join(' · ');context.hidden=!context.textContent;
    missing.hidden=isNew||!destination||(key==='rooms'?(!hass.areas||Boolean(hass.areas[selected]))&&(!pageFor||Boolean(view)):!hass.states||Boolean(person&&source));
   };
   const warning=document.createElement('p');warning.className='warning';warning.setAttribute('role','alert');warning.hidden=!isNew;
   warning.textContent=t('Choose a unique person or room and its sensor or page, or remove this mapping.','Escolha uma pessoa ou divisão única e o respetivo sensor ou página, ou remova esta associação.');
   mountForm(fields,values,[{...schema(idField,label,selector),required:true},{...schema(field,fieldLabel,fieldSelector),required:true}],value=>{
    Object.assign(values,value);saved.selectedId=value[idField];
    const valid=Boolean(value[idField]&&value[field]&&!duplicate(value[idField],saved));
    warning.hidden=valid;updateHeading();if(!valid){invalid.add(row);return;}invalid.delete(row);
    const map=ensure()[key] ||= {},next={...entry,[field]:value[field]};if(saved.currentId&&value[idField]!==saved.currentId)delete map[saved.currentId];map[value[idField]]=next;saved.currentId=value[idField];Object.assign(entry,next);isNew=false;updateHeading();
   });
   fields.append(missing,warning);updateHeading();if(isNew){invalid.add(row);expand(item);}
   return item;
  };
  for(const [id,entry] of Object.entries(current?.[key]||{}))addRow(id,entry);
  const add=document.createElement('div');section.append(add);
  const warning=document.createElement('p');warning.className='warning';warning.hidden=true;warning.setAttribute('role','alert');warning.textContent=t('This person or room already has a mapping. Choose another entry or clear the selection.','Esta pessoa ou divisão já tem uma associação. Escolha outra entrada ou limpe a seleção.');
  const form=mountForm(add,{},[schema(idField,key==='people'?t('Add person','Adicionar pessoa'):t('Add room','Adicionar divisão'),selector)],value=>{
   const id=value[idField];if(!id){invalid.delete(add);warning.hidden=true;return;}haptic('heavy');
   if(duplicate(id)){invalid.add(add);warning.hidden=false;return;}
   invalid.delete(add);warning.hidden=true;const item=addRow(id,{},true);form.data={};item.row.scrollIntoView?.({block:'nearest'});
  });add.append(warning);

 }
 const validate=()=>{if(invalid.size)throw new Error(t('Complete or remove the invalid current room mappings.','Complete ou remova as associações inválidas da divisão atual.'));};validate.section=section;return validate;
}
