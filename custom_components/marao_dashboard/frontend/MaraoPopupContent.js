// Embedded content is occurrence-owned; its version is independent of the package.
export const POPUP_CONTENT_VERSION = 1;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export const customPopup=config=>Object.hasOwn(config || {},'popup_content')&&config.popup_content?.mode!=='automatic';
export function popupContentError(config) {
  if(!Object.hasOwn(config || {},'popup_content'))return;
  const content=config.popup_content;
  if(!object(content)||content.version!==POPUP_CONTENT_VERSION)return 'This popup content needs a compatible Marao version.';
  if(!['custom','automatic'].includes(content.mode)||content.template!==undefined&&typeof content.template!=='string')return 'Popup content is invalid.';
  if(content.presentation!==undefined&&(!object(content.presentation)||['height','max_height','icon'].some(key=>content.presentation[key]!==undefined&&typeof content.presentation[key]!=='string')))return 'Popup content is invalid.';
  const layout=content.layout;
  if(!object(layout)||layout.type!=='sections'||layout.strategy||!Array.isArray(layout.sections))return 'Popup content must use a native Sections layout.';
  const cards=items=>Array.isArray(items)&&items.every(card=>object(card)&&typeof card.type==='string'&&card.type.length>0&&(!Object.hasOwn(card,'cards')||cards(card.cards))&&(!Object.hasOwn(card,'card')||cards([card.card])));
  if(!layout.sections.every(section=>object(section)&&cards(section.cards)))return 'Popup content contains an invalid card or section.';
}
export function validatePopupContent(config) {const error=popupContentError(config);if(error)throw new Error(error);return config;}
export function embeddedPopupContext(node) {
  for(let current=node;current;current=current.parentNode||current.host||current.getRootNode?.()?.host)if(current._maraoEmbeddedPopup)return current._maraoEmbeddedPopup;
}
