import {getExample,getScenario} from '../../examples/manifest.js';
import {toYaml,fromYaml,validateDraft,editField,getPath,editorDocument,previewConfig,bindPreviewEntities} from '../../playground/editor-model.js';
import {settingsChoices,structuredKinds} from '../../playground/settings-options.js';
import {iconChoices} from './setting-picker.js';

class MaraoPlayground extends HTMLElement{
  connectedCallback(){
    if(this._abort)return;
    this._abort=new AbortController();const {signal}=this._abort;
    this.example=getExample(this.dataset.cardId);this.frame=this.querySelector('iframe');
    this.token=crypto.randomUUID();this.ready=false;this.sequence=0;
    for(const select of this.querySelectorAll('.playground-top select')){
      if(select.nextElementSibling?.localName==='marao-setting-picker')continue;
      const picker=document.createElement('marao-setting-picker'),choices={clear:false,options:[...select.options].map(option=>({value:option.value,label:option.textContent}))};
      picker.configure({label:select.getAttribute('aria-label'),initialChoices:choices,getChoices:()=>choices,getValue:()=>select.value,commit:value=>{select.value=value;select.dispatchEvent(new Event('change'));return true;}});
      select.hidden=true;select.after(picker);
    }
    this.querySelector('[data-toggle-playground]').addEventListener('click',()=>this.setEditing(!this.hasAttribute('data-editing')),{signal});
    this.querySelector('[data-scenario]').addEventListener('change',()=>this.reset(),{signal});
    for(const name of ['theme','language'])this.querySelector(`[data-${name}]`).addEventListener('change',()=>this.send(),{signal});
    this.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
      this.querySelectorAll('marao-setting-picker').forEach(picker=>picker.close(false));
      this.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));
      this.querySelector('[data-settings]').hidden=button.dataset.tab!=='settings';
      this.querySelector('[data-yaml-panel]').hidden=button.dataset.tab!=='yaml';
    },{signal}));
    this.querySelector('[data-yaml]').addEventListener('input',()=>{
      try{const document=fromYaml(this.querySelector('[data-yaml]').value);const config=validateDraft(previewConfig(document,this.example),this.example,this.scenario.states);this.config=config;this.document=document;this.querySelector('[data-copy-status]').textContent='Configuration changed. Copy YAML to use it.';this.error('');this.renderSettings();this.send();}
      catch(error){this.error(error.message);}
    },{signal});
    this.querySelector('[data-copy]').addEventListener('click',async()=>{
      try{if(this.invalid)return;await navigator.clipboard.writeText(toYaml(this.document));this.querySelector('[data-copy-status]').textContent=this.example.id==='navbar'?'Dashboard settings copied. Merge the marao block into your existing dashboard; keep your views.':'YAML copied. Paste it into Home Assistant’s manual card editor.';}
      catch{this.querySelector('[data-copy-status]').textContent='Clipboard access was unavailable. Open YAML, select the configuration, and copy it.';}
    },{signal});
    this.querySelector('[data-reset]').addEventListener('click',()=>this.reset(),{signal});
    window.addEventListener('message',event=>{
      if(event.source!==this.frame.contentWindow || event.data?.channel!=='marao-playground')return;
      const data=event.data;
      if(data.type==='ready'){this.ready=true;this.send();return;}
      if(data.token!==this.token || (data.id!==undefined&&data.id!==this.sequence))return;
      if(data.type==='resize'&&Number.isFinite(data.height))this.frame.style.height=`${Math.min(900,Math.max(280,data.height))}px`;
      else if(data.type==='error'){const status=this.querySelector('[data-preview-status]');status.textContent=data.message;status.hidden=false;}
      else if(data.type==='rendered'){const status=this.querySelector('[data-preview-status]');status.textContent='';status.hidden=true;}
    },{signal});
    this.frame.addEventListener('load',()=>{this.ready=false;this.frame.contentWindow.postMessage({channel:'marao-playground',type:'hello'},'*');},{signal});
    this.reset();
    this.frame.contentWindow?.postMessage({channel:'marao-playground',type:'hello'},'*');
  }
  disconnectedCallback(){this._abort?.abort();this._abort=null;}
  setEditing(editing){
    if(!editing)this.querySelectorAll('marao-setting-picker').forEach(picker=>picker.close(false));
    this.toggleAttribute('data-editing',editing);
    this.querySelectorAll('[data-playground-controls]').forEach(node=>{node.hidden=!editing;});
    const button=this.querySelector('[data-toggle-playground]');
    button.setAttribute('aria-expanded',String(editing));
    button.textContent=editing?'Exit playground':'Open playground';
    if(editing)this.scrollIntoView({block:'start'});
  }
  error(message){this.invalid=Boolean(message);const node=this.querySelector('[data-error]');node.hidden=!message;node.textContent=message;this.querySelector('[data-copy]').disabled=this.invalid;}
  reset(){
    this.scenario=getScenario(this.dataset.cardId,this.querySelector('[data-scenario]').value);
    this.config=structuredClone(this.scenario.config || this.example.config);
    this.querySelector('[data-copy-status]').textContent=this.example.id==='navbar'?'Merge the marao block into your dashboard configuration. Keep existing views.':'Paste into Home Assistant’s manual card editor. Replace example entity IDs with yours.';
    this.document=editorDocument(this.config,this.example);this.querySelector('[data-yaml]').value=toYaml(this.document);this.error('');this.renderSettings();this.send();
  }
  renderSettings(){
    const host=this.querySelector('[data-settings]');host.replaceChildren();
    for(const field of this.example.fields || []){
      const context=()=>({config:this.config,states:bindPreviewEntities(this.config,this.scenario.config,this.scenario.states),dashboard:this.scenario.dashboard,example:this.example});
      const choices=settingsChoices(field,context());
      const commit=value=>{
        try{const next=editField(this.config,field,value);validateDraft(next,this.example,this.scenario.states);this.config=next;this.document=editorDocument(next,this.example,this.document);this.querySelector('[data-copy-status]').textContent='Configuration changed. Copy YAML to use it.';this.querySelector('[data-yaml]').value=toYaml(this.document);this.error('');this.send();return true;}
        catch(error){this.error(error.message);return error.message;}
      };
      const label=document.createElement(choices?'div':'label');label.className='setting-field';label.dataset.kind=field.kind;
      const copy=document.createElement('span');copy.className='setting-copy';
      const title=document.createElement('span');title.className='setting-label';title.textContent=field.label;copy.append(title);
      if(field.description){const hint=document.createElement('span');hint.className='setting-description';hint.textContent=field.description;copy.append(hint);}
      label.append(copy);
      if(choices){
        const picker=document.createElement('marao-setting-picker');
        picker.configure({label:field.label,initialChoices:choices,getValue:()=>getPath(this.config,field.path),getChoices:async()=>{
          const choices=settingsChoices(field,context());return choices.icons?{...choices,options:await iconChoices(this.dataset.iconsUrl)}:choices;
        },commit});
        label.append(picker);host.append(label);continue;
      }
      const value=getPath(this.config,field.path);let input;
      if(field.kind==='boolean'){
        input=document.createElement('input');input.type='checkbox';input.setAttribute('role','switch');input.checked=value??field.default??false;
      }else if(structuredKinds.has(field.kind)){input=document.createElement('textarea');input.value=toYaml(value??field.default??(['object','json','vacuum_action'].includes(field.kind)?{}:[]));}
      else{input=document.createElement('input');input.type=field.kind==='number'?'number':'text';input.value=value??field.default??'';if(field.min!==undefined)input.min=field.min;if(field.max!==undefined)input.max=field.max;}
      input.setAttribute('aria-label',field.label);
      input.className='setting-input';
      let swatch;
      if(field.kind==='color'){
        const row=document.createElement('span');row.className='color-input';
        swatch=document.createElement('span');swatch.className='color-swatch';swatch.setAttribute('aria-hidden','true');swatch.style.backgroundColor=value||'';
        row.append(swatch,input);label.append(row);
      }else label.append(input);
      input.addEventListener('input',()=>{
        if(swatch)swatch.style.backgroundColor=input.value;
        commit(field.kind==='boolean'?input.checked:input.value);
      });
      host.append(label);
    }
    if(!host.children.length){const p=document.createElement('p');p.textContent='Use the YAML tab to configure this card.';host.append(p);}
  }
  send(){
    if(!this.ready || this.invalid)return;
    this.frame.contentWindow.postMessage({channel:'marao-playground',type:'render',token:this.token,id:++this.sequence,config:this.config,states:bindPreviewEntities(this.config,this.scenario.config,this.scenario.states),scenario:this.scenario,theme:this.querySelector('[data-theme]').value,language:this.querySelector('[data-language]').value,dashboard:this.scenario.dashboard},'*');
  }
}
if(!customElements.get('marao-playground'))customElements.define('marao-playground',MaraoPlayground);
