const menuIcon='M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z';

// Navigation, mappings and Group members share one summary, disclosure and action menu.
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

export const SETTINGS_ROW_CSS=`
.settings-rows .drag-handle{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;padding:12px;background:transparent;color:var(--secondary-text-color);touch-action:none;cursor:grab}
.settings-rows .drag-handle>*{pointer-events:none}
.settings-rows .drag-handle:active{cursor:grabbing}
.settings-rows .sortable-ghost{opacity:.4}
.settings-rows .sortable-drag{box-shadow:0 4px 16px #0003}
.settings-rows .route{border-radius:20px;background:var(--secondary-background-color);min-width:0;overflow:visible}
.settings-rows .route-heading{display:flex;align-items:center;padding:4px;gap:0}
.settings-rows .route-toggle{flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:8px;text-align:start;background:transparent}
.settings-rows .route-icon{display:grid;place-items:center;background:var(--ha-card-background);border-radius:50%;width:48px;height:48px;flex:0 0 48px;color:var(--primary-color)}
.settings-rows .route-label{flex:1;min-width:0;overflow-wrap:anywhere}
.settings-rows .name{font-weight:600}
.settings-rows .chevron{width:18px;flex-shrink:0;color:var(--secondary-text-color)}
.settings-rows .fields{padding:8px 16px 16px;display:grid;gap:12px}
.settings-rows ha-icon-button{--mdc-icon-button-size:48px;--ha-icon-button-size:48px;width:48px;height:48px;flex-shrink:0}
.settings-rows ha-dropdown-item{min-height:48px;--wa-form-control-value-font-size:1rem}
.settings-rows .route-heading>button{border:0}
.settings-rows .destination{color:var(--secondary-text-color);font-size:.875rem}
.settings-rows .fields ha-form{display:block;min-width:0;max-width:100%}
`;
