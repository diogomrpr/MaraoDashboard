import {normalizeConfig} from './editor-model.js';
const esc = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const words = {
  en:{visibility:'Home Assistant can expose this complete configuration to authenticated users, even if the dashboard or editor is hidden.',review:'Review these possible private settings. Only their locations are shown; this check cannot find every secret.',ack:'I reviewed the supplied content and allow it to be readable through Home Assistant’s native configuration APIs.',required:'Review the visibility information and confirm before importing.'},
  pt:{visibility:'O Home Assistant pode expor toda a configuração aos utilizadores autenticados, mesmo com o dashboard ou editor ocultos.',review:'Reveja estas possíveis definições privadas. São mostradas apenas as localizações; esta verificação não encontra todos os segredos.',ack:'Revi o conteúdo fornecido e permito a leitura através das APIs nativas de configuração do Home Assistant.',required:'Reveja a informação de visibilidade e confirme antes de importar.'}
};
export function openSourceImport(panel) {
    panel._moveHaptic();
    const dialog = panel._dialog(panel._t('importSource')), content = dialog.querySelector('.dialog-content');
    const text = String(panel._hass?.language || '').startsWith('pt') ? words.pt : words.en;
    content.innerHTML = `<p>${esc(panel._t('importHelp'))}</p><textarea data-import-json aria-label="${esc(panel._t('importSource'))}"></textarea><div data-review hidden><p>${esc(text.visibility)}</p><div data-private></div><label class="import-ack"><input type="checkbox" data-ack><span>${esc(text.ack)}</span></label></div><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-close>${panel._t('cancel')}</ha-button><ha-button data-apply>${panel._t('importSource')}</ha-button></div>`;
    const input = content.querySelector('[data-import-json]'), ack = content.querySelector('[data-ack]');
    let reviewed;
    input.addEventListener('input',()=>{reviewed=null;ack.checked=false;content.querySelector('[data-review]').hidden=true;});
    content.querySelector('[data-close]').addEventListener('click', () => panel._closeDialog(dialog));
    const apply = content.querySelector('[data-apply]');
    apply.addEventListener('click', async () => {
      if (apply.disabled) return;
      const lifecycle = panel._lifecycle, epoch = panel._documentEpoch;
      apply.disabled = true; input.disabled = true;
      try {
        const source = input.value;
        const result = reviewed?.source === source ? reviewed.result : await panel.persistence.preview(source);
        if (!panel.isConnected || lifecycle !== panel._lifecycle || epoch !== panel._documentEpoch || !dialog.open) return;
        reviewed = {source,result};
        content.querySelector('[data-review]').hidden=false;
        const privateSettings = content.querySelector('[data-private]'); privateSettings.replaceChildren();
        if (result.privacy?.length) {
          const info = document.createElement('p'); info.textContent=text.review;privateSettings.append(info);
          for (const item of result.privacy) {const path=document.createElement('p');path.textContent=item.path;privateSettings.append(path);}
        }
        if (!ack.checked) {content.querySelector('[data-error]').textContent=text.required;return;}
        if (!confirm(panel._t('replaceSource'))) return;
        panel._model = normalizeConfig(JSON.parse(result.config)); panel._documentEpoch++;
        panel._jsonDraft = result.config; panel._pageTemplates = null; panel._setEditorSource(result.config);
        panel._dirty = true; panel._revision = (panel._revision || 0) + 1;
        panel._closeDialog(dialog); panel._renderVisual(); panel._updateHeader();
      } catch (error) { content.querySelector('[data-error]').textContent = panel._t('importFailed') + panel._error(error); }
      finally { apply.disabled = false; input.disabled = false; }
    });
  }


