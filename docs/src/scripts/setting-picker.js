import {choiceValue,filterChoices,toggleChoice} from '../../playground/settings-options.js';

const iconRequests=new Map();
export function iconChoices(url){
  if(!iconRequests.has(url))iconRequests.set(url,fetch(url).then(response=>{
    if(!response.ok)throw new Error('Icon suggestions could not load. Try opening the list again.');
    return response.json();
  }).then(({icons})=>Object.entries(icons).map(([value,path])=>({value,label:value,icon:path}))).catch(error=>{iconRequests.delete(url);throw error;}));
  return iconRequests.get(url);
}
const svg=path=>{
  const element=document.createElementNS('http://www.w3.org/2000/svg','svg'),shape=document.createElementNS(element.namespaceURI,'path');
  element.setAttribute('viewBox','0 0 24 24');element.setAttribute('aria-hidden','true');shape.setAttribute('d',path);element.append(shape);return element;
};
const node=(tag,className,text)=>{const element=document.createElement(tag);element.className=className;if(text!==undefined)element.textContent=text;return element;};

class SettingPicker extends HTMLElement{
  configure(settings){this.settings=settings;this.choices=settings.initialChoices;this.renderValue();}
  connectedCallback(){
    if(this._abort)return;
    this._abort=new AbortController();const {signal}=this._abort;
    if(!this.trigger){
      this.trigger=node('button','setting-picker-trigger');this.trigger.type='button';this.trigger.setAttribute('aria-haspopup','dialog');
      this.valueLabel=node('span','setting-picker-value');this.trigger.append(this.valueLabel,svg('M7 10l5 5 5-5z'));
      this.popup=node('div','setting-picker-popover');this.popup.setAttribute('popover','auto');this.popup.setAttribute('role','dialog');
      const header=node('div','setting-picker-search');this.search=node('input','');this.search.type='search';this.search.placeholder='Search…';this.search.autocomplete='off';this.search.setAttribute('role','combobox');this.search.setAttribute('aria-autocomplete','list');
      const close=node('button','setting-picker-close','×');close.type='button';close.setAttribute('aria-label','Close suggestions');header.append(this.search,close);
      this.list=node('div','setting-picker-options');this.list.id=`choices-${crypto.randomUUID()}`;this.list.setAttribute('role','listbox');this.search.setAttribute('aria-controls',this.list.id);
      this.status=node('p','setting-picker-status');this.status.setAttribute('role','status');
      this.custom=node('button','setting-picker-custom');this.custom.type='button';
      this.clear=node('button','setting-picker-clear');this.clear.type='button';
      this.popup.append(header,this.list,this.status,this.custom,this.clear);this.append(this.trigger,this.popup);
    }
    this.trigger.addEventListener('click',()=>this.popup.matches(':popover-open')?this.close():this.open(),{signal});
    this.popup.querySelector('.setting-picker-close').addEventListener('click',()=>this.close(),{signal});
    this.search.addEventListener('input',()=>this.renderOptions(),{signal});
    this.popup.addEventListener('keydown',event=>this.keydown(event),{signal});
    this.popup.addEventListener('toggle',()=>{
      const open=this.popup.matches(':popover-open');this.trigger.setAttribute('aria-expanded',String(open));this.search.setAttribute('aria-expanded',String(open));
    },{signal});
    this.custom.addEventListener('click',()=>this.choose(this.customValue()),{signal});
    this.clear.addEventListener('click',()=>this.commit(this.choices.multiple?[]:undefined),{signal});
    window.addEventListener('resize',()=>this.close(false),{signal});
    document.addEventListener('scroll',event=>{if(!this.popup.contains(event.target))this.close(false);},{capture:true,signal});
    this.renderValue();
  }
  disconnectedCallback(){this.close(false);this._abort?.abort();this._abort=null;}
  renderValue(){
    if(!this.trigger||!this.settings)return;
    const value=this.settings.getValue(),values=this.choices.multiple?(Array.isArray(value)?value:[]):value===undefined||value===''?[]:[value];
    const labels=values.map(value=>value?.name || this.choices.options.find(option=>option.value===choiceValue(value))?.label || String(choiceValue(value)));
    this.valueLabel.textContent=labels.join(', ') || this.choices.emptyLabel || 'Default';
    this.trigger.setAttribute('aria-label',`${this.settings.label}: ${this.valueLabel.textContent}`);
    this.trigger.setAttribute('aria-expanded',String(this.popup.matches(':popover-open')));
    this.popup.setAttribute('aria-label',`${this.settings.label} suggestions`);this.search.setAttribute('aria-label',`Search ${this.settings.label}`);
    this.list.setAttribute('aria-label',this.settings.label);this.list.setAttribute('aria-multiselectable',String(Boolean(this.choices.multiple)));
    this.clear.textContent=this.choices.multiple?'Clear selection':`Use ${this.choices.emptyLabel?.toLowerCase() || 'default'}`;
    this.clear.hidden=this.choices.clear===false;
  }
  async open(){
    const attempt=this._opening=(this._opening || 0)+1;
    this.search.value='';this.status.textContent='Loading suggestions…';this.list.replaceChildren();this.rows=[];this.active=-1;this.search.removeAttribute('aria-activedescendant');this.custom.hidden=true;
    this.popup.showPopover();this.place();this.search.focus({preventScroll:true});
    try{
      const choices=await this.settings.getChoices();
      if(attempt!==this._opening||!this.isConnected||!this.popup.matches(':popover-open'))return;
      this.choices=choices;this.renderValue();this.renderOptions();this.place();
    }catch(error){if(attempt===this._opening&&this.popup.matches(':popover-open'))this.status.textContent=error.message;}
  }
  close(focus=true){
    this._opening=(this._opening || 0)+1;
    if(!this.popup?.matches(':popover-open'))return;
    this.popup.hidePopover();if(focus)this.trigger.focus({preventScroll:true});
  }
  place(){
    const rect=this.trigger.getBoundingClientRect(),below=innerHeight-rect.bottom-12,above=rect.top-12,up=below<440&&above>below;
    const height=Math.max(120,Math.min(440,up?above:below)),width=Math.min(Math.max(rect.width,280),innerWidth-24);
    this.popup.style.width=`${width}px`;this.popup.style.maxHeight=`${height}px`;
    this.popup.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;
    this.popup.style.top=`${up?Math.max(12,rect.top-Math.min(height,this.popup.scrollHeight)-6):rect.bottom+6}px`;
  }
  customValue(){const value=this.search.value.trim();return this.choices.numeric?Number(value):this.choices.icons&&!value.includes(':')?`mdi:${value}`:value;}
  renderOptions(){
    const current=this.settings.getValue(),selected=this.choices.multiple?(Array.isArray(current)?current.map(choiceValue):[]):[current];
    const options=[...this.choices.options];
    for(const value of selected)if(value!==undefined&&value!==''&&!options.some(option=>option.value===value))options.unshift({value,label:String(value)});
    const result=filterChoices(options,this.search.value);this.list.replaceChildren();
    this.rows=result.options.map((option,index)=>{
      const row=node('button','setting-picker-option');row.type='button';row.id=`${this.list.id}-${index}`;row.setAttribute('role','option');row.setAttribute('aria-selected',String(selected.includes(option.value)));
      if(option.icon)row.append(svg(option.icon));
      const text=node('span','setting-picker-option-copy');text.append(node('span','',option.label));
      if(option.detail&&option.detail!==option.label)text.append(node('small','',option.detail));
      row.append(text);if(selected.includes(option.value))row.append(node('span','setting-picker-check','✓'));
      row.addEventListener('click',()=>this.choose(option.value));this.list.append(row);return row;
    });
    this.status.textContent=result.total>result.options.length?`${result.total} matches. Keep typing to narrow the list.`:result.total?'':'No matches.';
    const query=this.search.value.trim(),value=this.customValue();
    this.custom.hidden=!this.choices.custom||!query||this.choices.numeric&&!Number.isFinite(value)||options.some(option=>option.value===value);
    this.custom.textContent=`Use “${this.choices.icons?value:query}”`;this.active=-1;this.search.removeAttribute('aria-activedescendant');this.place();
  }
  choose(value){this.commit(this.choices.multiple?toggleChoice(this.settings.getValue(),value):value);}
  commit(value){
    const result=this.settings.commit(value);
    if(result!==true){this.status.textContent=result;return;}
    this.renderValue();if(this.choices.multiple){this.renderOptions();this.search.focus({preventScroll:true});}else this.close();
  }
  keydown(event){
    if(event.key==='Escape'){event.preventDefault();this.close();return;}
    if(['ArrowDown','ArrowUp'].includes(event.key)){
      event.preventDefault();if(!this.rows?.length)return;
      this.active=Math.max(0,Math.min(this.rows.length-1,(this.active ?? -1)+(event.key==='ArrowDown'?1:-1)));
      this.rows.forEach((row,index)=>row.classList.toggle('is-active',index===this.active));
      const row=this.rows[this.active];this.search.focus({preventScroll:true});this.search.setAttribute('aria-activedescendant',row.id);row.scrollIntoView({block:'nearest'});
    }else if(event.key==='Enter'&&event.target===this.search){
      event.preventDefault();if(this.active>=0)this.rows[this.active].click();else if(this.rows?.length)this.rows[0].click();else if(!this.custom.hidden)this.custom.click();
    }
  }
}
if(!customElements.get('marao-setting-picker'))customElements.define('marao-setting-picker',SettingPicker);
