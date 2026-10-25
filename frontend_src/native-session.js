import { convertDocument } from './convert-document.js';
import { compileDashboard } from './compile-dashboard.js';
import { catalog, normalizeSource } from './native-model.js';
import { createStarter, metadataSnapshot, pageTemplates, readMetadata } from './native-metadata.js';
import { createEnvelope, parseSource, STRATEGY_TYPE, unwrapDocument } from '../custom_components/marao_dashboard/frontend/MaraoSource.js';
import { describeCardYaml } from './lovelace-model.js';

export { compileDashboard, convertDocument, metadataSnapshot, readMetadata, pageTemplates, catalog };
const MESSAGES = {
  en:{version:'Marao requires stable Home Assistant 2026.10.0 or newer.',admin:'Only a Home Assistant administrator can save this dashboard.',conflict:'This dashboard changed in another session. Your draft is retained. Export it before reloading or reconciling the changes.',notNative:'Complete the native dashboard migration before using this editor.',root:'Choose a valid dashboard address.'},
  pt:{version:'O Marao requer o Home Assistant estável 2026.10.0 ou posterior.',admin:'Só um administrador do Home Assistant pode guardar este dashboard.',conflict:'Este dashboard foi alterado noutra sessão. O rascunho foi mantido. Exporte antes de recarregar ou conciliar as alterações.',notNative:'Conclua a migração do dashboard nativo antes de usar este editor.',root:'Escolha um endereço válido para o dashboard.'}
};
Object.assign(MESSAGES.en,{invalidSource:'Check this configuration before saving.',newerSource:'This configuration needs a newer Marao version.',incompleteSource:'Some information is missing. Use the standalone converter to complete the translation.',legacyDependency:'Resolve the old file or service reference before importing. The standalone converter can help with file addresses.',invalidEnvelope:'This dashboard document is incomplete or unsupported. Keep your export and use a compatible converter.'});
Object.assign(MESSAGES.pt,{invalidSource:'Verifique esta configuração antes de guardar.',newerSource:'Esta configuração precisa de uma versão mais recente do Marao.',incompleteSource:'Falta alguma informação. Use o conversor independente para concluir a tradução.',legacyDependency:'Resolva a referência ao ficheiro ou serviço antigo antes de importar. O conversor independente pode ajudar com endereços de ficheiros.',invalidEnvelope:'O documento do dashboard está incompleto ou não é suportado. Guarde a exportação e use um conversor compatível.'});
const message = (hass,key) => (MESSAGES[String(hass.language || 'en').split('-')[0]] || MESSAGES.en)[key];
export function assertNativeSupport(hass) {
  const match = /^(\d{4})\.(\d+)\.(\d+)$/.exec(hass.config?.version || '');
  if (!match || Number(match[1]) < 2026 || Number(match[1]) === 2026 && Number(match[2]) < 10) throw new Error(message(hass,'version'));
}

export class NativeSession {
  describeError(error) {
    const key=error.code==='source_version_future'?'newerSource':error.code.startsWith('native_envelope')||error.code.startsWith('native_editor_path')?'invalidEnvelope':error.code.startsWith('legacy_')?'legacyDependency':error.code.endsWith('_needed')?'incompleteSource':'invalidSource';
    return message(this.hass,key)+(error.path?` (${error.path})`:'');
  }
  constructor(hass, root, { strategy, onChange } = {}) {
    if (!/^[a-z0-9][a-z0-9_-]*-[a-z0-9_-]+$/.test(root || '')) throw new Error(message(hass,'root'));
    this.hass = hass; this.root = root; this.strategy = strategy; this.onChange = onChange;
  }
  async current() {
    assertNativeSupport(this.hass);
    if (this.strategy) {
      if (this.strategy.type !== STRATEGY_TYPE) throw new Error(message(this.hass,'notNative'));
      if (['source_json','envelope_version','compiler_contract'].some(key=>Object.hasOwn(this.strategy,key))) {
        unwrapDocument({strategy:this.strategy});return {strategy:this.strategy};
      }
      const context = await this.metadata();
      const source = normalizeSource(createStarter('Marao Dashboard',context),context);
      this.strategy = createEnvelope(JSON.stringify(source,null,2)+'\n',this.root,{strategy:this.strategy}).strategy;
      return {strategy:this.strategy};
    }
    const document = await this.hass.callWS({type:'lovelace/config',url_path:this.root,force:true});
    if (!document.strategy) throw new Error(message(this.hass,'notNative'));
    if (document.strategy.type !== STRATEGY_TYPE) throw new Error(message(this.hass,'notNative'));
    if (['source_json','envelope_version','compiler_contract'].some(key=>Object.hasOwn(document.strategy,key))) unwrapDocument(document);
    return document;
  }
  metadata(force = false) {
    if (force) this._metadata = null;
    if (!this._metadata) {
      const request = readMetadata(this.hass).catch(error => {if (this._metadata === request) this._metadata = null; throw error;});
      this._metadata = request;
    }
    return this._metadata;
  }
  async read(scope = 'initial') {
    if (scope === 'context') {
      const context = await this.metadata(true);
      const source = parseSource((this.baseline || await this.current()).strategy.source_json || this._starterText);
      return {editor:{catalog,...context},page_templates:pageTemplates(source,context.entities)};
    }
    const document = await this.current();
    if (!document.strategy.source_json && !this._starterText) this._starterText = JSON.stringify(normalizeSource(createStarter('Marao Dashboard',await this.metadata()),await this.metadata()),null,2)+'\n';
    const unwrapped = unwrapDocument(document.strategy.source_json ? document : createEnvelope(this._starterText,this.root,document));
    const context = metadataSnapshot(this.hass), source = normalizeSource(unwrapped.source,context);
    this.baseline = document;
    const visible = source.pages.find(page => page.path === source.landing_page);
    const ids = new Set();
    const visit = value => { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') { if (value.entity_id) ids.add(value.entity_id); Object.values(value).forEach(visit); } };
    visit(visible);
    const native_card_labels = {};
    for (const page of source.pages) for (const section of page.sections || [page]) for (const entry of Array.isArray(section.entities) ? section.entities : []) if (entry?.template === 'ha_card') native_card_labels[entry.yaml] = describeCardYaml(entry.yaml);
    const fields = ['id','label','entity_optional','domains','device_classes'];
    const converted = JSON.stringify(source) !== JSON.stringify(unwrapped.source);
    return {config:converted ? JSON.stringify(source,null,2)+'\n' : unwrapped.sourceText,conversion_pending:converted,dashboard_url:`/${this.root}/${source.landing_page}`,editor:{catalog:{version:catalog.version,config_version:catalog.config_version,cards:catalog.cards.map(card => Object.fromEntries(fields.filter(key => Object.hasOwn(card,key)).map(key => [key,card[key]])))},entities:context.entities.filter(entity => ids.has(entity.entity_id)),areas:context.areas,display_entity_ids:[...ids],native_card_labels}};
  }
  async preview(text) {
    const result = convertDocument(text,{...await this.metadata(),dashboardRoot:this.root,language:this.hass.language});
    return {config:result.sourceText,document:result.document,privacy:result.privacy};
  }
  save(text) {
    if (this._saving) return this._saving;
    const pending = this._save(text).finally(() => {if (this._saving === pending) this._saving = null;});
    this._saving = pending; return pending;
  }
  async _save(text) {
    assertNativeSupport(this.hass);
    if (!this.hass.user?.is_admin) throw new Error(message(this.hass,'admin'));
    if (!this.baseline) throw new Error(message(this.hass,'notNative'));
    const result = convertDocument(text,{...await this.metadata(),dashboardRoot:this.root,language:this.hass.language});
    const current = await this.current();
    if (JSON.stringify(current) !== JSON.stringify(this.baseline)) throw new Error(message(this.hass,'conflict'));
    const original = this.baseline.strategy.source_json;
    const sourceText = original && JSON.stringify(parseSource(original)) === JSON.stringify(result.source) ? original : result.sourceText;
    const document = createEnvelope(sourceText,this.root,this.baseline);
    if (this.strategy) { this.onChange?.(document.strategy); this.strategy = document.strategy; }
    else await this.hass.callWS({type:'lovelace/config/save',url_path:this.root,config:document});
    this.baseline = document;
    return {config:sourceText,dashboard_url:`/${this.root}/${result.source.landing_page}`};
  }
  async subscribe(callback) {
    if (this.strategy) return () => {};
    return this.hass.connection.subscribeEvents(event => {if (event.data?.url_path === this.root && !this._saving) callback();},'lovelace_updated');
  }
}
