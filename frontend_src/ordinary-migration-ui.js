import { OrdinaryConversionSession } from './ordinary-session.js';
import { classifyDashboard } from './ordinary-model.js';

const TEXT = {
  en: { title: 'Use the Home Assistant editor', intro: 'Keep your current dashboard and prepare its cards for native editing. Preparation changes nothing. Import replaces only this dashboard configuration after you keep the recovery files.', denied: 'Only administrators can convert this dashboard.', loading: 'Loading the saved configuration…', prepare: 'Prepare conversion', original: 'Download original configuration', recovery: 'Download recovery copy', proposed: 'Download proposed dashboard', backup: 'I kept the matching Marao package and a private Home Assistant backup.', privacy: 'I reviewed the complete configuration and retained origin data. Authenticated Home Assistant users may read them, even on a hidden dashboard.', apply: 'Convert this dashboard', inspect: 'Check saved state', resume: 'Open a recovery copy', ready: 'Ready to review. Keep the recovery copy and proposed dashboard before converting.', converted: 'This dashboard is already converted. Open the Home Assistant editor to continue.', unchanged: 'The original is still saved. Review and explicitly retry when ready.', divergent: 'The saved dashboard differs from both copies. Keep all copies and reconcile the changes before proceeding.', open: 'Open Home Assistant editor', failed: 'The operation failed. Your input and exports remain available.', retention: 'The recovery copy retains the exact received document, source text and original YAML. It is not an exact copy of HA’s server storage files. Native save acknowledgement does not prove disk persistence; simultaneous saves retain HA’s last-writer limit.', privatePaths: 'Review possible private settings at:', incompatible: 'This Home Assistant editor cannot yet support the conversion. Keep the original and use a supported Marao version.', invalid: 'The saved configuration needs attention before conversion.', busy: 'Preparing…', saving: 'Saving the converted dashboard…' },
  pt: { title: 'Usar o editor do Home Assistant', intro: 'Mantenha o dashboard atual e prepare os cartões para edição nativa. A preparação não altera nada. A importação substitui apenas a configuração deste dashboard depois de guardar os ficheiros de recuperação.', denied: 'Só os administradores podem converter este dashboard.', loading: 'A carregar a configuração guardada…', prepare: 'Preparar conversão', original: 'Descarregar configuração original', recovery: 'Descarregar cópia de recuperação', proposed: 'Descarregar dashboard proposto', backup: 'Guardei o pacote Marao correspondente e uma cópia privada do Home Assistant.', privacy: 'Revi toda a configuração e os dados de origem preservados. Os utilizadores autenticados do Home Assistant podem lê-los, mesmo num dashboard oculto.', apply: 'Converter este dashboard', inspect: 'Verificar estado guardado', resume: 'Abrir uma cópia de recuperação', ready: 'Pronto para rever. Guarde a cópia de recuperação e o dashboard proposto antes de converter.', converted: 'Este dashboard já foi convertido. Abra o editor do Home Assistant para continuar.', unchanged: 'O original continua guardado. Reveja e volte a tentar explicitamente quando estiver pronto.', divergent: 'O dashboard guardado difere das duas cópias. Guarde todas as cópias e concilie as alterações antes de continuar.', open: 'Abrir editor do Home Assistant', failed: 'A operação falhou. Os dados e as exportações continuam disponíveis.', retention: 'A cópia de recuperação mantém o documento recebido, o texto de origem e o YAML original. Não é uma cópia exata dos ficheiros internos do HA. A confirmação da gravação não prova a persistência em disco; gravações simultâneas mantêm o limite nativo da última gravação.', privatePaths: 'Reveja possíveis definições privadas em:', incompatible: 'Este editor do Home Assistant ainda não suporta a conversão. Guarde o original e use uma versão Marao suportada.', invalid: 'A configuração guardada precisa de atenção antes da conversão.', busy: 'A preparar…', saving: 'A guardar o dashboard convertido…' },
};
Object.assign(TEXT.en, { retry: 'Retry', stale: 'The saved dashboard changed. Keep this proposal and prepare again from the current saved configuration.', recoveryError: 'This recovery copy is incomplete or has changed. Keep it and use the original intact export.', admin: 'Administrator permission is required.', root: 'The recovery copy or source belongs to another dashboard address.', version: 'This configuration requires a compatible Marao version. Keep the original without replacing it.' });
Object.assign(TEXT.pt, { retry: 'Tentar novamente', stale: 'O dashboard guardado mudou. Guarde esta proposta e prepare novamente a configuração atual.', recoveryError: 'Esta cópia de recuperação está incompleta ou foi alterada. Guarde-a e use a exportação original intacta.', admin: 'É necessária permissão de administrador.', root: 'A cópia ou a origem pertence a outro endereço de dashboard.', version: 'Esta configuração exige uma versão Marao compatível. Guarde o original sem o substituir.' });

function ownerRoot(node) {
  while (node) { if (node.localName === 'hui-root') return node; node = node.parentElement || node.getRootNode?.().host; }
  return undefined;
}

export class MaraoMigrationCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._epoch = 0; }
  _resetIdentity() {
    this._epoch++; this._session?.invalidate(); this._session = null;
    this._busy = this._loaded = this._loadFailed = this._converted = this._exported = this._proposedExported = false;
    this._originalText = null; this.shadowRoot.replaceChildren();
  }
  setConfig(config) { if (this._config?.dashboard_root !== config.dashboard_root) this._resetIdentity(); this._config = { ...config }; this._mount(); }
  set hass(hass) {
    const identity = { user: hass.user?.id, connection: hass.connection, admin: Boolean(hass.user?.is_admin) };
    if (!this._identity || this._identity.user !== identity.user || this._identity.connection !== identity.connection || this._identity.admin !== identity.admin) this._resetIdentity();
    this._identity = identity;
    this._hass = hass; if (this._session) this._session.hass = hass; this._mount();
  }
  connectedCallback() { this._mount(); }
  disconnectedCallback() { this._epoch++; this._busy = false; }
  getCardSize() { return 8; }
  _t(key) { return (TEXT[String(this._hass?.language || 'en').startsWith('pt') ? 'pt' : 'en'])[key] || key; }
  _q(name) { return this.shadowRoot.querySelector(`[data-${name}]`); }
  _status(key, error = false) { this._q('status').textContent = this._t(key); this._q('status').setAttribute('role', error ? 'alert' : 'status'); }
  _error(error) {
    const code = String(error?.code || '');
    const key = code === 'native_host_unsupported' ? 'incompatible' : /stale/.test(code) ? 'stale' : /recovery/.test(code) ? 'recoveryError' : /root/.test(code) ? 'root' : /admin/.test(code) ? 'admin' : /version|envelope/.test(code) ? 'version' : 'failed';
    this._status(key, true);
    if (!code && error?.message) this._q('status').textContent += ' ' + String(error.message);
    else if (error?.path && error.path !== '$') this._q('status').textContent += ' ' + error.path;
  }
  _mount() {
    if (!this.isConnected || !this._config || !this._hass) return;
    if (!this._hass.user?.is_admin) { this.shadowRoot.textContent = this._t('denied'); return; }
    if (!this._q('status')) {
      this.shadowRoot.innerHTML = `<style>:host{display:block;font-family:Montserrat,system-ui,sans-serif;color:var(--primary-text-color);padding:16px;box-sizing:border-box}*{box-sizing:border-box}.body{max-width:800px;margin:auto}h2,p,label{overflow-wrap:anywhere}p{line-height:1.5}.actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}button,input{font:inherit;min-height:48px}button{min-width:48px;padding:12px;border:1px solid var(--divider-color,#888);border-radius:12px;background:var(--card-background-color,#eee);color:inherit;cursor:pointer}button:disabled{opacity:.55;cursor:default}label{display:flex;align-items:center;gap:10px;min-height:48px;margin:12px 0}input[type=checkbox]{width:48px;min-width:48px;margin:0}input[type=file]{width:100%}button:focus,input:focus{outline:none}[hidden]{display:none!important}</style><div class="body"><h2 data-text="title"></h2><p data-text="intro"></p><p data-status role="status"></p><div class="actions"><button data-original data-text="original"></button><button data-prepare data-text="prepare"></button><button data-open data-text="open" hidden></button></div><div data-staged hidden><p data-private></p><p data-text="retention"></p><div class="actions"><button data-recovery data-text="recovery"></button><button data-proposed data-text="proposed"></button></div><label><input data-backup type="checkbox"><span data-text="backup"></span></label><label><input data-privacy type="checkbox"><span data-text="privacy"></span></label><div class="actions"><button data-apply data-text="apply" disabled></button><button data-inspect data-text="inspect"></button></div></div><label><span data-text="resume"></span><input data-resume type="file" accept="application/json,.json"></label></div>`;
      this._q('prepare').onclick = () => this._prepare();
      this._q('original').onclick = () => this._download(this._originalText, 'marao-original.json');
      this._q('recovery').onclick = () => { this._download(JSON.stringify(this._session.recovery, null, 2) + '\n', 'marao-recovery.json'); this._exported = true; this._controls(); };
      this._q('proposed').onclick = () => { this._download(JSON.stringify(this._session.recovery.proposed_document, null, 2) + '\n', 'marao-dashboard.json'); this._proposedExported = true; this._controls(); };
      this._q('backup').onchange = this._q('privacy').onchange = () => this._controls();
      this._q('apply').onclick = () => this._apply(); this._q('inspect').onclick = () => this._inspect();
      this._q('resume').onchange = () => this._resume();
      this._q('open').onclick = () => { if (this._hass.user?.is_admin) ownerRoot(this)?.lovelace?.setEditMode(true); };
      const retry = document.createElement('button'); retry.dataset.retry = ''; retry.dataset.text = 'retry'; retry.hidden = true;
      retry.onclick = () => { this._loadFailed = false; this._load(); }; this._q('status').after(retry);
    }
    this.shadowRoot.querySelectorAll('[data-text]').forEach(node => { node.textContent = this._t(node.dataset.text); });
    if (!this._session) this._session = new OrdinaryConversionSession(this._hass, this._config.dashboard_root, {
      compatibility: () => window.MaraoNativeBootstrap?.compatible(ownerRoot(this)) === true,
      packageVersion: window.MaraoFrontendPackage?.package_version || '',
    });
    if (!this._loaded && !this._busy && !this._loadFailed) this._load();
  }
  async _load() {
    this._busy = true; const epoch = this._epoch; this._status('loading'); this._controls();
    try {
      const document = await this._session.current(); if (!this.isConnected || epoch !== this._epoch) return;
      this._originalText = JSON.stringify(document, null, 2) + '\n'; this._loaded = true;
      this._converted = classifyDashboard(document).kind === 'ordinary'; this._status(this._converted ? 'converted' : 'intro');
    } catch (error) { if (this.isConnected && epoch === this._epoch) { this._loadFailed = true; this._error(error); } }
    finally { if (epoch === this._epoch) { this._busy = false; this._controls(); } }
  }
  async _prepare() {
    if (this._busy || !this._hass.user?.is_admin) return;
    this._busy = true; const epoch = this._epoch; this._status('busy'); this._controls();
    try {
      const { result } = await this._session.stage(undefined, { assetBaseURL: new URL('./', import.meta.url).href });
      if (!this.isConnected || epoch !== this._epoch) return;
      this._exported = this._proposedExported = false; this._q('backup').checked = this._q('privacy').checked = false;
      this._q('private').textContent = result.privacy.length ? this._t('privatePaths') + ' ' + result.privacy.map(item => item.path).join(', ') : '';
      this._status('ready');
    } catch (error) { if (this.isConnected && epoch === this._epoch) this._error(error); }
    finally { if (epoch === this._epoch) { this._busy = false; this._controls(); } }
  }
  async _apply() {
    if (this._busy || !this._hass.user?.is_admin || this._q('apply').disabled) return;
    this._busy = true; const epoch = this._epoch; this._status('saving'); this._controls();
    try {
      await this._session.acknowledge({ recovery: this._session.recovery, exported: this._exported && this._proposedExported, backupConfirmed: this._q('backup').checked, visibilityReviewed: this._q('privacy').checked });
      const result = await this._session.save(); if (!this.isConnected || epoch !== this._epoch) return;
      this._converted = true; this._status('converted');
      const path = result.document.views[0]?.path ?? '0';
      history.replaceState(null, '', `/${this._config.dashboard_root}/${encodeURIComponent(path)}`);
      window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: true } }));
    } catch (error) { if (this.isConnected && epoch === this._epoch) this._error(error); }
    finally { if (epoch === this._epoch) { this._busy = false; this._controls(); } }
  }
  async _inspect() {
    if (this._busy) return;
    this._busy = true; const epoch = this._epoch; this._controls();
    try {
      const state = await this._session.inspectRecovery(); if (!this.isConnected || epoch !== this._epoch) return;
      this._converted = state === 'converted'; this._status(state === 'original' ? 'unchanged' : state, state === 'divergent');
    } catch (error) { if (this.isConnected && epoch === this._epoch) this._error(error); }
    finally { if (epoch === this._epoch) { this._busy = false; this._controls(); } }
  }
  async _resume() {
    const file = this._q('resume').files[0]; if (!file || this._busy || !this._hass.user?.is_admin) return;
    this._busy = true; const epoch = this._epoch; this._controls();
    try {
      const recovery = JSON.parse(await file.text()); const state = await this._session.resume(recovery);
      if (!this.isConnected || epoch !== this._epoch) return;
      this._originalText = recovery.original_text; this._exported = this._proposedExported = false;
      this._q('backup').checked = this._q('privacy').checked = false; this._converted = state === 'converted';
      this._status(state === 'original' ? 'unchanged' : state, state === 'divergent');
    } catch (error) { if (this.isConnected && epoch === this._epoch) this._error(error); }
    finally { if (epoch === this._epoch) { this._busy = false; this._controls(); } }
  }
  _controls() {
    if (!this._q('status')) return;
    this._q('original').disabled = this._busy || !this._originalText;
    this._q('retry').hidden = !this._loadFailed; this._q('retry').disabled = this._busy;
    this._q('prepare').disabled = this._busy || !this._loaded || this._converted;
    this._q('staged').hidden = !this._session?.recovery;
    this._q('open').hidden = !this._converted; this._q('open').disabled = this._busy;
    for (const name of ['recovery', 'proposed', 'inspect', 'resume']) this._q(name).disabled = this._busy;
    this._q('apply').disabled = this._busy || this._converted || !this._exported || !this._proposedExported || !this._q('backup').checked || !this._q('privacy').checked || this._session?._uncertain;
  }
  _download(text, filename) {
    if (typeof text !== 'string' || !this._hass.user?.is_admin) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

if (!customElements.get('marao-migration-card')) customElements.define('marao-migration-card', MaraoMigrationCard);
