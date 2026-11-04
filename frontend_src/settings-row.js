const menuIcon='M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z';

// Navigation and current-room mappings share one summary, disclosure and action menu.
export function createSettingsRow(menuLabel,actions,onAction){
 const make=(tag,className,parent)=>{const node=document.createElement(tag);if(className)node.className=className;parent?.append(node);return node;};
 const row=make('section','route'),heading=make('div','route-heading',row),toggle=make('button','route-toggle',heading);toggle.type='button';
 const badge=make('span','route-icon',toggle),icon=make('ha-icon','',badge);badge.setAttribute('aria-hidden','true');
 const label=make('span','route-label',toggle),name=make('span','name',label);make('br','',label);const description=make('span','destination',label),chevron=make('ha-icon','chevron',toggle);chevron.setAttribute('aria-hidden','true');
 const fields=make('div','fields',row),menu=make('ha-dropdown','',heading);menu.placement='bottom-end';
 const trigger=make('ha-icon-button','',menu);trigger.slot='trigger';trigger.path=menuIcon;
 for(const action of actions){const item=make('ha-dropdown-item','',menu);item.value=action.value;item.disabled=Boolean(action.disabled);item.textContent=action.label;const glyph=make('ha-icon');glyph.icon=`mdi:${action.icon}`;glyph.slot='icon';item.prepend(glyph);}
 menu.addEventListener('wa-select',event=>{event.stopPropagation();onAction(event.detail.item.value);});
 const setExpanded=open=>{fields.hidden=!open;toggle.setAttribute('aria-expanded',String(open));chevron.icon=open?'mdi:chevron-up':'mdi:chevron-down';};
 setExpanded(false);
 return {row,heading,toggle,fields,setExpanded,update(title,subtitle,symbol){name.textContent=title;description.textContent=subtitle;icon.icon=symbol;toggle.setAttribute('aria-label',title);trigger.label=`${menuLabel}: ${title}`;}};
}
