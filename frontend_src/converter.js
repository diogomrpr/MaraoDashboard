import { convertDocument } from './convert-document.js';

const TEXT = {
  en:{title:'Translate an old Marao configuration',intro:'Paste your configuration JSON. Translate it, then copy or download the dashboard JSON. Only missing information will need an answer.',paste:'Your configuration JSON',advanced:'Optional extra information',advancedHelp:'Use this only when your configuration needs entity metadata or custom cards stored outside its JSON. Conversion covers the content you supply; keep your original files.',metadata:'Entity metadata JSON (optional)',custom:'Custom cards YAML or a generated file with protected custom cards (optional)',page:'Page for those custom cards',popup:'Popup for those cards (optional; leave empty for the page)',translate:'Translate',reset:'Start over',ready:'Translated dashboard',output:'Native dashboard JSON',copy:'Copy JSON',download:'Download JSON',privacy:'Everything stays in this page’s memory. No login, server, upload or automatic browser storage. Close or reset the page to clear it.',visibility:'When installed, Home Assistant’s native configuration APIs can expose this complete source to authenticated HA users. A hidden or admin-only dashboard does not make it private.',install:'This JSON configures a native dashboard after the Marao frontend resource is installed. It does not install the resource or migrate server files. Back up the existing installation first.',room:'Which entities belong in “{name}”?',roomHelp:'Enter entity IDs separated by commas or new lines. Leave empty if this room should be empty. We will not guess its contents.',address:'Dashboard address',addressHelp:'Use the existing dashboard address without the leading slash, for example marao-dashboard.',continue:'Continue',copied:'Copied.',selectCopy:'Clipboard access is unavailable. The JSON is selected; copy it using your device’s Copy action.',summary:'Source format {from} → 2. {pages} pages. Address: /{root}.',assumption:'The address was inferred from the saved name.',invalid:'Check the JSON and correct the highlighted information.',json_invalid:'This is not valid JSON. Paste the complete configuration object.',source_object:'Paste a configuration object, not a list or another value.',source_version_future:'This configuration is from a newer source format. Use a newer converter.',number_precision:'A number cannot be preserved safely. Keep the original and review that value before converting.',number_invalid:'A number is outside the supported range.',custom_markers_invalid:'The custom-card markers are damaged. Restore the original file or paste only its custom-card list.',custom_page_needed:'Enter the saved page path for the custom cards.',custom_content_conflict:'The configuration already uses the custom-content field in an incompatible form.',metadataInvalid:'Optional metadata must contain entities and areas lists.',questionNeeded:'One detail is needed to continue.',failed:'Could not translate: ',details:'Details',extraPage:'Enter the page path for the custom cards before translating.'},
  pt:{title:'Traduzir uma configuração antiga do Marao',intro:'Cole o JSON da configuração. Traduza e copie ou descarregue o JSON do dashboard. Só precisa de responder à informação em falta.',paste:'JSON da sua configuração',advanced:'Informação adicional opcional',advancedHelp:'Use apenas se precisar de metadados de entidades ou cartões personalizados guardados fora do JSON. A conversão abrange o conteúdo fornecido; guarde os ficheiros originais.',metadata:'JSON de metadados de entidades (opcional)',custom:'YAML de cartões personalizados ou ficheiro gerado com cartões protegidos (opcional)',page:'Página para esses cartões',popup:'Popup para esses cartões (opcional; vazio para a página)',translate:'Traduzir',reset:'Recomeçar',ready:'Dashboard traduzido',output:'JSON do dashboard nativo',copy:'Copiar JSON',download:'Descarregar JSON',privacy:'Tudo fica na memória desta página. Sem sessão, servidor, envio ou armazenamento automático no navegador. Feche ou limpe a página para apagar os dados.',visibility:'Após instalar, as APIs nativas de configuração do Home Assistant podem expor todo o conteúdo aos utilizadores autenticados. Um dashboard oculto ou só para administradores não torna os dados privados.',install:'Este JSON configura um dashboard nativo depois de instalar o recurso frontend do Marao. Não instala o recurso nem migra ficheiros do servidor. Faça primeiro uma cópia da instalação existente.',room:'Que entidades pertencem a “{name}”?',roomHelp:'Indique os IDs separados por vírgulas ou linhas. Deixe vazio para uma divisão vazia. Não iremos adivinhar o conteúdo.',address:'Endereço do dashboard',addressHelp:'Use o endereço existente sem a barra inicial, por exemplo marao-dashboard.',continue:'Continuar',copied:'Copiado.',selectCopy:'A área de transferência não está disponível. O JSON está selecionado; use a ação Copiar do dispositivo.',summary:'Formato {from} → 2. {pages} páginas. Endereço: /{root}.',assumption:'O endereço foi deduzido do nome guardado.',invalid:'Verifique o JSON e corrija a informação indicada.',json_invalid:'O JSON é inválido. Cole o objeto de configuração completo.',source_object:'Cole um objeto de configuração, não uma lista ou outro valor.',source_version_future:'Esta configuração usa um formato mais recente. Use um conversor atualizado.',number_precision:'Um número não pode ser preservado com segurança. Guarde o original e reveja esse valor antes de converter.',number_invalid:'Um número está fora do intervalo suportado.',custom_markers_invalid:'Os marcadores dos cartões estão danificados. Restaure o ficheiro original ou cole apenas a lista de cartões personalizados.',custom_page_needed:'Indique o caminho da página guardada para os cartões personalizados.',custom_content_conflict:'A configuração já usa o campo de conteúdo personalizado num formato incompatível.',metadataInvalid:'Os metadados opcionais devem conter listas de entidades e áreas.',questionNeeded:'Falta um detalhe para continuar.',failed:'Não foi possível traduzir: ',details:'Detalhes',extraPage:'Indique o caminho da página dos cartões personalizados antes de traduzir.'}
};
Object.assign(TEXT.en, {
  source_version_invalid:'The source format must be a supported whole number. Keep the original and check its version.', native_envelope_invalid:'This native dashboard document is incomplete or uses an unsupported format. Keep the original and use a compatible converter.', native_destination_invalid:'An old navigation link does not match the saved dashboard pages. Check its dashboard address and destination before translating.', native_binding_invalid:'That entity does not match the old card. Choose an entity of the correct kind before translating.', custom_yaml_invalid:'The custom cards must be a valid YAML list. Check them before translating.',
  energy:'Which power sensor belongs to “{name}”?', energyHelp:'Enter the sensor entity ID used by this saved energy load.', binding:'Which entity belongs to “{name}”?', bindingHelp:'Enter its Home Assistant entity ID. Existing choices are kept; missing bindings are not guessed.',
  addressOptional:'Existing dashboard address (optional)',
  file:'Where should this card’s file load from?', fileHelp:'Copy the original file to Home Assistant’s www folder, then enter its new /local/ address, or use an existing web address. The file itself stays outside this JSON.', legacy_asset_replacement_invalid:'Enter a valid /local/ or http(s) file address outside the retired Marao server paths.',
  legacy_asset_unresolved:'A card refers to an old server file that is not part of Marao. Replace that reference with an accessible file address, then translate again.',
  legacy_service_dependency:'A card or setting calls a retired Marao service. Replace that action before translating. Native dashboards cannot run the old dashboard-generation service.',
  privateReview:'Review possible private settings at: {paths}. Values are not shown here; this check cannot find every secret.',
});
Object.assign(TEXT.pt, {
  source_version_invalid:'O formato de origem deve ser um número inteiro suportado. Guarde o original e confirme a versão.', native_envelope_invalid:'O documento nativo está incompleto ou usa um formato não suportado. Guarde o original e use um conversor compatível.', native_destination_invalid:'Uma ligação antiga não corresponde às páginas guardadas. Confirme o endereço do dashboard e o destino antes de traduzir.', native_binding_invalid:'A entidade não corresponde ao cartão antigo. Escolha uma entidade do tipo correto antes de traduzir.', custom_yaml_invalid:'Os cartões personalizados devem ser uma lista YAML válida. Verifique-os antes de traduzir.',
  energy:'Que sensor de potência pertence a “{name}”?', energyHelp:'Indique o ID da entidade do sensor usado por esta carga guardada.', binding:'Que entidade pertence a “{name}”?', bindingHelp:'Indique o ID da entidade no Home Assistant. As escolhas existentes são mantidas; não adivinhamos associações em falta.',
  addressOptional:'Endereço do dashboard existente (opcional)',
  file:'De onde deve ser carregado o ficheiro deste cartão?', fileHelp:'Copie o ficheiro original para a pasta www do Home Assistant e indique o novo endereço /local/, ou use um endereço web existente. O ficheiro fica fora deste JSON.', legacy_asset_replacement_invalid:'Indique um endereço /local/ ou http(s) válido fora dos caminhos antigos do servidor Marao.',
  legacy_asset_unresolved:'Um cartão usa um ficheiro antigo do servidor que não faz parte do Marao. Substitua a referência por um endereço acessível e volte a traduzir.',
  legacy_service_dependency:'Um cartão ou definição chama um serviço Marao descontinuado. Substitua essa ação antes de traduzir. Os dashboards nativos não executam o serviço antigo de geração.',
  privateReview:'Reveja possíveis definições privadas em: {paths}. Os valores não são mostrados; esta verificação não encontra todos os segredos.',
});
const $ = id => document.getElementById(id);
let language = 'en', result, answers = {}, fields = new Map();
const t = (key,values = {}) => (TEXT[language][key] || TEXT.en[key] || key).replace(/\{(\w+)\}/g,(_,key) => String(values[key] ?? ''));
function clearResult() { result = null; $('output').value = ''; $('result').hidden = true; for (const id of ['summary','private-review','error-detail-text']) $(id).textContent = ''; $('error-details').hidden = true; }
function resetAnswers() { answers = {}; fields.clear(); $('questions').replaceChildren(); $('questions').hidden = true; }
function localize() { document.documentElement.lang = language; document.querySelectorAll('[data-text]').forEach(node => { node.textContent = t(node.dataset.text); }); }
function question(error) {
  const room = error.code === 'room_members_needed', energy = error.code === 'energy_source_needed', binding = error.code === 'native_binding_needed', file = error.code === 'legacy_asset_unresolved';
  const key = room ? `room-${error.details.index}` : energy ? `energy-${error.details.index}` : binding ? `binding-${error.details.page}-${error.details.index}` : file ? `file-${error.details.key}` : 'address';
  if (fields.has(key)) {fields.get(key).input.focus();return;}
  const host = document.createElement('div'); host.className = 'question';
  const label = document.createElement('label'), input = document.createElement(room ? 'textarea' : 'input'), help = document.createElement('p'), button = document.createElement('button');
  input.id = 'answer-' + key; label.htmlFor = input.id;
  label.textContent = t(room ? 'room' : energy ? 'energy' : binding ? 'binding' : file ? 'file' : 'address',{name:error.details.name || error.details.area || Number(error.details.index)+1});
  help.textContent = t(room ? 'roomHelp' : energy ? 'energyHelp' : binding ? 'bindingHelp' : file ? 'fileHelp' : 'addressHelp'); help.className = 'helper';
  input.placeholder = room ? 'light.office, sensor.temperature' : energy ? 'sensor.power' : binding ? 'light.office' : file ? '/local/my-image.jpg' : 'marao-dashboard';
  input.value = room ? (answers.roomEntities?.[error.details.index] || []).join('\n') : energy ? answers.energySources?.[error.details.index] || '' : binding ? answers.nativeBindings?.[error.details.page]?.[error.details.index] || '' : file ? answers.fileReplacements?.[error.details.key] || '' : answers.dashboardRoot || '';
  input.addEventListener('input',clearResult);
  button.textContent = t('continue'); button.addEventListener('click',translate);
  host.append(label,input,help,button); $('questions').append(host); $('questions').hidden = false;
  if (file) {
    const details=document.createElement('details'), summary=document.createElement('summary'), path=document.createElement('p');
    summary.textContent=t('details');path.textContent=error.path;details.append(summary,path);host.append(details);
  }
  fields.set(key,{input,error}); input.focus();
}
function translate() {
  clearResult(); $('status').textContent = '';
  try {
    const context = {...answers,language};
    for (const {input,error} of fields.values()) {
      if (error.code === 'room_members_needed') (context.roomEntities ||= {})[error.details.index] = input.value.split(/[,\n]/).map(value => value.trim()).filter(Boolean);
      else if (error.code === 'energy_source_needed') (context.energySources ||= {})[error.details.index] = input.value.trim();
      else if (error.code === 'native_binding_needed') ((context.nativeBindings ||= Object.create(null))[error.details.page] ||= Object.create(null))[error.details.index] = input.value.trim();
      else if (error.code === 'legacy_asset_unresolved') (context.fileReplacements ||= Object.create(null))[error.details.key] = input.value.trim();
      else if (input.value.trim()) context.dashboardRoot = input.value.trim().replace(/^\//,'');
    }
    answers = {roomEntities:context.roomEntities,energySources:context.energySources,nativeBindings:context.nativeBindings,fileReplacements:context.fileReplacements,dashboardRoot:context.dashboardRoot};
    if ($('dashboard-address').value.trim()) context.dashboardRoot = $('dashboard-address').value.trim().replace(/^\//,'');
    if ($('metadata').value.trim()) {
      let metadata; try { metadata = JSON.parse($('metadata').value); } catch { throw new Error(t('metadataInvalid')); }
      if (!Array.isArray(metadata.entities) || !Array.isArray(metadata.areas)) throw new Error(t('metadataInvalid'));
      context.entities = metadata.entities; context.areas = metadata.areas;
    }
    if ($('custom').value.trim()) {
      if (!$('custom-page').value.trim()) throw new Error(t('extraPage'));
      context.supplements = [{page:$('custom-page').value.trim(),yaml:$('custom').value,...($('custom-popup').value.trim() ? {popup_hash:$('custom-popup').value.trim()} : {})}];
    }
    result = convertDocument($('source').value,context);
    $('output').value = JSON.stringify(result.document,null,2)+'\n';
    $('summary').textContent = t('summary',{from:result.fromVersion,pages:result.source.pages.length,root:result.document.strategy.dashboard_root}) + (result.assumptions.length ? ' '+t('assumption') : '');
    $('private-review').textContent = result.privacy.length ? t('privateReview',{paths:result.privacy.map(item=>item.path).join(', ')}) : '';
    $('result').hidden = false;
  } catch (error) {
    if (['room_members_needed','energy_source_needed','native_binding_needed','dashboard_root_needed','legacy_asset_unresolved'].includes(error.code)) { question(error); $('status').textContent = t('questionNeeded'); }
    else {
      const known = TEXT[language][error.code] || [t('metadataInvalid'),t('extraPage')].find(message=>message===error.message);
      $('status').textContent = t('failed') + (known || t('invalid'));
      if (!known || error.path) { $('error-detail-text').textContent = known ? error.path : String(error.message || error.code); $('error-details').hidden = false; }
    }
  }
}
$('translate').addEventListener('click',translate);
$('source').addEventListener('input',() => { clearResult(); resetAnswers(); for (const id of ['dashboard-address','metadata','custom','custom-page','custom-popup']) $(id).value = ''; $('status').textContent = ''; });
for (const id of ['dashboard-address','metadata','custom','custom-page','custom-popup']) $(id).addEventListener('input',clearResult);
$('reset').addEventListener('click',() => { for (const id of ['source','dashboard-address','metadata','custom','custom-page','custom-popup']) $(id).value = ''; clearResult(); resetAnswers(); $('status').textContent = ''; $('source').focus(); });
$('language').addEventListener('change',() => {
  const existing = [...fields.values()].map(({input,error})=>({value:input.value,error}));
  language = $('language').value; localize(); fields.clear(); $('questions').replaceChildren();
  for (const {value,error} of existing) {question(error); [...fields.values()].at(-1).input.value=value;}
  clearResult(); $('language').focus();
});
$('copy').addEventListener('click',async () => { if (!result) return; try { await navigator.clipboard.writeText($('output').value); $('status').textContent = t('copied'); } catch { $('output').focus(); $('output').select(); $('status').textContent = t('selectCopy'); } });
$('download').addEventListener('click',() => { if (!result) return; const url = URL.createObjectURL(new Blob([$('output').value],{type:'application/json'})); const link = document.createElement('a'); link.href = url; link.download = 'marao-dashboard.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),0); });
localize();
