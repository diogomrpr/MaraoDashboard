const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const entity = (value, domain) => typeof value === 'string' && new RegExp(`^${domain}\\.[a-z0-9_]+$`).test(value);
export const PLEX_PLAY_MEDIA = 512;
export const PLEX_LAUNCH_TIMEOUT = 30000;
export const rivuletPlayback = mapping => mapping?.playback_app === 'rivulet';

export const PLEX_PT = {
  'Plex library': 'Biblioteca Plex',
  'Browse a Plex library and play on the selected Apple TV through Plex or Rivulet.': 'Explore uma biblioteca Plex e reproduza na Apple TV selecionada através do Plex ou Rivulet.', 'Open library': 'Abrir biblioteca', 'Library layout': 'Disposição da biblioteca', 'On dashboard': 'No painel', 'Popup': 'Janela', 'Choose a Plex library layout.': 'Escolha uma disposição da biblioteca Plex.', 'Movies and TV Series': 'Filmes e séries', 'Continue Watching': 'Continuar a ver', 'Browse library': 'Explorar biblioteca',
  'Movies':'Filmes', 'TV Series':'Séries de TV', 'Previous':'Anterior', 'Next':'Seguinte',
  'Recently Added': 'Adicionados recentemente', 'Apple TV': 'Apple TV', 'Back': 'Voltar', 'Refresh': 'Atualizar',
  'Retry': 'Tentar novamente', 'Load more': 'Carregar mais', 'Loading library…': 'A carregar biblioteca…',
  'Nothing to continue.': 'Nada para continuar a ver.', 'This folder is empty.': 'Esta pasta está vazia.',
  'Continue Watching is not available for this library.': 'Continuar a ver não está disponível nesta biblioteca.',
  'Starting Plex…': 'A iniciar o Plex…', 'Playback requested.': 'Reprodução pedida.',
  'Playback was not confirmed in time.': 'A reprodução não foi confirmada a tempo.',
  'Playback cancelled. Choose a TV and try again.': 'Reprodução cancelada. Escolha uma TV e tente novamente.',
  'Unavailable': 'Indisponível', 'Disconnected': 'Sem ligação', 'Unknown': 'Desconhecido',
  'Choose an Apple TV.': 'Escolha uma Apple TV.', 'Choose a Plex client.': 'Escolha um cliente Plex.',
  'Choose the Plex scan-clients button.': 'Escolha o botão de pesquisa de clientes Plex.',
  'Choose the exact Plex app source.': 'Escolha a origem exata da aplicação Plex.',
  'Choose a Plex server folder.': 'Escolha uma pasta de servidor Plex.',
  'Choose a Continue Watching folder in Apple TV options.': 'Escolha uma pasta Continuar a ver nas opções da Apple TV.',
  'Plex folders must belong to the selected server.': 'As pastas Plex têm de pertencer ao servidor selecionado.',
  'Plex options must be an object or false.': 'As opções Plex têm de ser um objeto ou false.',
  'Plex requires automatic Popup or On dashboard details.': 'O Plex requer detalhes automáticos em Popup ou No painel.',
  'Choose entities from the same Plex integration.': 'Escolha entidades da mesma integração Plex.',
  'This device does not support the requested Plex action.': 'Este dispositivo não suporta a ação Plex pedida.',
  'The selected TV is no longer available.': 'A TV selecionada já não está disponível.',
  'Unable to browse Plex.': 'Não foi possível explorar o Plex.', 'Unable to load artwork.': 'Não foi possível carregar a imagem.',
  'Plex setup': 'Configuração Plex', 'Enable Plex library': 'Ativar biblioteca Plex', 'Plex client': 'Cliente Plex',
  'Scan-clients button': 'Botão de pesquisa de clientes', 'Plex app source': 'Origem da aplicação Plex',
  'Choose library folders': 'Escolher pastas da biblioteca', 'Use this server': 'Usar este servidor',
  'Use for Continue Watching': 'Usar para Continuar a ver', 'Cancel': 'Cancelar',
  'Use automatic Continue Watching': 'Usar Continuar a ver automático',
  'Use the same Plex profile in Home Assistant and the Apple TV app. Open Plex once on the TV so Home Assistant can discover its client.': 'Use o mesmo perfil Plex no Home Assistant e na aplicação Apple TV. Abra o Plex uma vez na TV para o Home Assistant descobrir o cliente.',
  'Library configured': 'Biblioteca configurada', 'No Plex servers were returned.': 'Não foram encontrados servidores Plex.',
  'Playback app': 'Aplicação de reprodução', 'Plex browse entity (optional)': 'Entidade para explorar o Plex (opcional)',
  'Choose Plex or Rivulet for playback.': 'Escolha Plex ou Rivulet para reproduzir.',
  'Choose a Plex media player for browsing.': 'Escolha um leitor multimédia Plex para explorar.',
  'Starting Rivulet…': 'A iniciar o Rivulet…',
  'Use the same Plex server and profile in Home Assistant and Rivulet. Play a title in Rivulet once so Home Assistant can discover a session for browsing. The browse entity is optional and never receives Rivulet playback commands.': 'Use o mesmo servidor e perfil Plex no Home Assistant e no Rivulet. Reproduza um título no Rivulet uma vez para o Home Assistant descobrir uma sessão para explorar. A entidade de exploração é opcional e nunca recebe comandos de reprodução do Rivulet.',
  'No Plex browsing entity for this server. Play a title in Rivulet once, then Retry.': 'Não existe uma entidade de exploração Plex para este servidor. Reproduza um título no Rivulet uma vez e depois tente novamente.',
};
export function plexText(hass, value) { return String(hass?.language || hass?.locale?.language || '').startsWith('pt') ? PLEX_PT[value] || value : value; }
export function plexError(error) {
  const message = String(error?.message || error?.body?.message || (typeof error === 'string' ? error : '') || 'Unable to browse Plex.');
  return message.replace(/https?:\/\/[^\s<>"']+/gi, '[Plex URL]').replace(/(?:x-plex-token|token|authsig)\s*[=:]\s*[^\s&,;]+/gi, '[credential]');
}

export function plexURI(value) {
  if (typeof value !== 'string' || !/^plex:\/\/[a-zA-Z0-9_-]+\//.test(value)) return null;
  try { if (value.split('?')[0].split('/').some(part=>['.','..'].includes(decodeURIComponent(part)))) return null; } catch { return null; }
  try {
    const url = new URL(value);
    if (url.protocol !== 'plex:' || url.username || url.password || url.port || url.hash || /[\u0000-\u001f]/.test(value)
      || [...url.searchParams].some(([key, val]) => key !== 'resume' || val !== '1')
      || url.pathname.split('/').some(part => ['.', '..'].includes(decodeURIComponent(part)))) return null;
    return url;
  } catch { return null; }
}
export function plexReference(value, server) {
  const uri = plexURI(value?.media_content_id);
  return object(value) && typeof value.media_content_type === 'string' && value.media_content_type.length > 0 && uri && (!server || uri.host === server)
    ? {media_content_id: value.media_content_id, media_content_type: value.media_content_type} : null;
}
export function plexConfigError(value, parent = {}, entities = []) {
  if (value === undefined || value === false) return '';
  if (!object(value)) return 'Plex options must be an object or false.';
  if (!entity(parent.entity_id || parent.entity, 'media_player')) return 'Choose an Apple TV.';
  if (value.display !== undefined && !['inline','popup'].includes(value.display)) return 'Choose a Plex library layout.';
  if (value.playback_app !== undefined && !['plex','rivulet'].includes(value.playback_app)) return 'Choose Plex or Rivulet for playback.';
  if (value.browse_entity && !entity(value.browse_entity,'media_player')) return 'Choose a Plex media player for browsing.';
  if (!rivuletPlayback(value)) {
    if (!entity(value.client_entity, 'media_player')) return 'Choose a Plex client.';
    if (!entity(value.scan_clients_entity, 'button')) return 'Choose the Plex scan-clients button.';
    if (typeof value.app_source !== 'string' || !value.app_source.trim()) return 'Choose the exact Plex app source.';
  }
  const root = plexReference(value.library_root);
  if (!root || root.media_content_type !== 'server' || plexURI(root.media_content_id).search || plexURI(root.media_content_id).pathname !== '/server') return 'Choose a Plex server folder.';
  const server = plexURI(root.media_content_id).host;
  if (value.continue_watching !== undefined && !plexReference(value.continue_watching, server)) return 'Plex folders must belong to the selected server.';
  if (parent.variables?.media_display !== 'inline' && (parent.popup_view || parent.variables?.popup_hash || parent.tap_action?.action === 'navigate' && String(parent.tap_action.navigation_path || '').startsWith('#'))) return 'Plex requires automatic Popup or On dashboard details.';
  const ids = [value.browse_entity,...(!rivuletPlayback(value)?[value.client_entity,value.scan_clients_entity]:[])].filter(Boolean);
  const rows = entities.filter(row=>ids.includes(row.entity_id));
  if (rows.some(row=>row.platform && row.platform !== 'plex') || new Set(rows.map(row=>row.config_entry_id).filter(Boolean)).size>1) return 'Choose entities from the same Plex integration.';
  if (rows.some(row=>row.platform === 'plex' && row.entity_id.startsWith('media_player.') && row.unique_id?.includes(':') && row.unique_id.split(':')[0] !== server)) return 'Plex folders must belong to the selected server.';
  return '';
}

export function plexTarget(card, key = 'parent', label) {
  if (!object(card?.apple_tv?.plex) || plexConfigError(card.apple_tv.plex, card)) return null;
  return {key, entity_id: card.entity_id || card.entity, name: label || card.name || card.entity_id || card.entity, plex: structuredClone(card.apple_tv.plex)};
}
export function plexTargetIdentity(target) { return JSON.stringify([target?.entity_id, target?.plex && {...target.plex,display:undefined}]); }
export function plexTargets(dashboard, parent) {
  const first = plexTarget(parent), targets = first ? [first] : [], seen = new Set(targets.map(plexTargetIdentity));
  const root = first?.plex.library_root.media_content_id;
  const visit = (cards, path, viewName) => {
    if (!Array.isArray(cards)) return;
    cards.forEach((card, index) => {
      const key = `${path}/${index}`;
      if (['custom:marao-media-card','custom:marao-plex-library-card'].includes(card?.type) || ['md_media_card','md_plex_library_card'].includes(card?.template)) {
        const target = plexTarget(card, key, `${card.name || card.entity_id || card.entity} · ${viewName}`);
        if (target?.plex.library_root.media_content_id === root && !seen.has(plexTargetIdentity(target))) { seen.add(plexTargetIdentity(target)); targets.push(target); }
      }
      visit(card?.cards, key, viewName);
      if (card?.card) visit([card.card], key, viewName);
    });
  };
  for (const [index, view] of (dashboard?.views || []).entries()) {
    const name = view.title || view.path || String(index + 1);
    visit(view.cards, `views/${index}/cards`, name);
    for (const [section, row] of (view.sections || []).entries()) visit(row.cards, `views/${index}/sections/${section}`, name);
  }
  return targets;
}

export function plexImagePath(item, server) {
  const uri = plexURI(item?.media_content_id);
  return item?.thumbnail && uri?.host === server && /^\/\d+$/.test(uri.pathname)
    ? `/api/plex_image_proxy/${encodeURIComponent(server)}/${uri.pathname.slice(1)}` : null;
}
export function cleanPlexNode(node, server) {
  if (!object(node)) throw new Error('Unable to browse Plex.');
  const reference = plexReference(node, server);
  const root = node.media_content_type === 'plex_root' && node.media_content_id === '';
  if (!reference && !root) throw new Error('Plex folders must belong to the selected server.');
  const host = server || plexURI(node.media_content_id)?.host;
  return {...(reference || {media_content_id:'',media_content_type:'plex_root'}), title: String(node.title || ''),
    can_play: node.can_play === true, can_expand: node.can_expand === true,
    media_class: String(node.media_class || ''), children_media_class: String(node.children_media_class || ''), thumbnail: plexImagePath(node, host),
    ...(Array.isArray(node.children) ? {children: node.children.map(child => cleanPlexNode(child, host))} : {})};
}
export async function browsePlex(hass, client, folder, server) {
  if (!entity(client, 'media_player')) throw new Error('Choose a Plex client.');
  if (hass?.connected === false || hass?.connection?.connected === false || !hass?.callWS) throw new Error('Disconnected');
  const reference=folder ? plexReference(folder,server) : null;
  if(folder&&!reference)throw new Error('Plex folders must belong to the selected server.');
  return cleanPlexNode(await hass.callWS({type:'media_player/browse_media',entity_id:client,...(reference || {})}),server);
}
export async function plexServerRoots(hass) {
  const devices=await hass.callWS({type:'config/device_registry/list'});
  return devices.filter(device=>!device.via_device_id).flatMap(device=>(device.identifiers||[]).filter(([domain,id])=>domain==='plex'&&/^[a-zA-Z0-9_-]+$/.test(id)).map(([,id])=>({
    title:device.name_by_user||device.name||'Plex',media_content_type:'server',media_content_id:`plex://${id}/server`,can_expand:true,
  })));
}
export async function plexBrowseEntity(hass, mapping, server) {
  if (hass?.connected === false || hass?.connection?.connected === false || !hass?.callWS) throw new Error('Disconnected');
  const explicit=mapping.browse_entity || (!rivuletPlayback(mapping) ? mapping.client_entity : null);
  if (explicit) {
    if (!entity(explicit,'media_player')) throw new Error('Choose a Plex media player for browsing.');
    return explicit;
  }
  const entities=await hass.callWS({type:'config/entity_registry/list'});
  const candidates=entities.filter(row=>row.platform==='plex'&&!row.disabled_by&&entity(row.entity_id,'media_player')&&row.unique_id?.startsWith(`${server}:`)).sort((a,b)=>a.entity_id.localeCompare(b.entity_id));
  if (candidates[0]) return candidates[0].entity_id;
  throw new Error('No Plex browsing entity for this server. Play a title in Rivulet once, then Retry.');
}
export function rivuletLink(item, server) {
  const uri=plexURI(item?.media_content_id);
  return uri?.host===server && /^\/\d+$/.test(uri.pathname) && ['movie','episode'].includes(item.media_content_type)
    ? `rivulet://play/${uri.pathname.slice(1)}` : null;
}
export function plexHubKind(item) {
  if (item?.media_content_type !== 'hub') return null;
  const name = plexURI(item.media_content_id)?.pathname.split('/').at(-1) || '';
  if (/(?:^|\.)(?:continue(?:watching)?|inprogress|ondeck)(?:\.|$)/i.test(name)) return 'continue';
  return /(?:^|\.)(?:recentlyadded|recent)(?:\.|$)/i.test(name) ? 'recent' : null;
}
export async function plexHome(mapping, read) {
  let root;
  try { root = await read(mapping.library_root); }
  catch (failure) { const error=plexError(failure); return {resume:[],movies:[],shows:[],recent:[],libraries:[],error,failures:{resume:error,movies:error,shows:error}}; }
  const recommended = root.children?.find(item => item.media_content_id.endsWith('/Recommended'));
  let error='';const failures={};
  const children=async (folder,shelves=[])=>{try{return (await read(folder)).children||[];}catch(failure){const message=plexError(failure);error ||= message;for(const shelf of shelves)failures[shelf] ||= message;return[];}};
  const hubs = recommended ? await children(recommended,['resume']) : [];
  const candidates=hubs.filter(item=>plexHubKind(item)==='continue');
  const ambiguous=!mapping.continue_watching&&candidates.length>1;
  const continuing = mapping.continue_watching || (!ambiguous&&candidates[0]);
  if(ambiguous)error=failures.resume='Choose a Continue Watching folder in Apple TV options.';
  const resume = continuing ? await children(continuing,['resume']) : null;
  const recent = [];
  for (const hub of hubs.filter(item => plexHubKind(item) === 'recent')) recent.push(...await children(hub));
  const libraries=root.media_content_type==='library'?[root]:(root.children || []).filter(item=>item !== recommended);
  const movies=[],shows=[];
  const kind=item=>item.children_media_class || '';
  for(const library of libraries) {
    if(library.media_content_type!=='library' || ['music','track','album','artist','playlist','photo','image'].includes(kind(library)))continue;
    const shelves=kind(library)==='movie'?['movies']:['tvshow','tv_show','show'].includes(kind(library))?['shows']:['movies','shows'];
    for(const item of library===root?root.children||[]:await children(library,shelves)) {
      const type=item.media_class || item.media_content_type;
      if(type==='movie')movies.push(item);
      else if(['tvshow','tv_show','show'].includes(type))shows.push(item);
    }
  }
  const unique=items=>[...new Map(items.map(item=>[JSON.stringify([item.media_content_type,item.media_content_id]),item])).values()];
  return {resume,error,failures,movies:unique(movies),shows:unique(shows),recent:unique(recent),libraries};
}

const connected = hass => hass?.connected !== false && hass?.connection?.connected !== false && typeof hass?.callService === 'function';
const ready = (hass, id) => Boolean(hass?.states?.[id]) && !['unknown','unavailable'].includes(hass.states[id].state);
const supports = (hass, id, bit) => ready(hass,id) && (Number(hass.states[id].attributes?.supported_features) & bit) !== 0;
const appOpen = (hass, target) => [hass.states[target.entity_id]?.attributes?.source, hass.states[target.entity_id]?.attributes?.app_name, hass.states[target.entity_id]?.attributes?.app_id].includes(target.plex.app_source);

export function plexLaunchProblem({hass,target}) {
  if(!connected(hass))return 'Disconnected';
  if(!target)return 'Choose an Apple TV.';
  if(rivuletPlayback(target.plex)) {
    if(!ready(hass,target.entity_id))return 'Unavailable';
    return !supports(hass,target.entity_id,PLEX_PLAY_MEDIA) || ['off','standby'].includes(hass.states[target.entity_id].state)&&!supports(hass,target.entity_id,128)
      ? 'This device does not support the requested Plex action.' : '';
  }
  if(!ready(hass,target.entity_id)||!hass.states[target.plex.client_entity])return 'Unavailable';
  if(['off','standby'].includes(hass.states[target.entity_id].state)&&!supports(hass,target.entity_id,128)
    ||!appOpen(hass,target)&&!supports(hass,target.entity_id,2048)
    ||ready(hass,target.plex.client_entity)&&!supports(hass,target.plex.client_entity,PLEX_PLAY_MEDIA))return 'This device does not support the requested Plex action.';
  return '';
}

export class PlexLaunch {
  constructor({context, callService, haptic, changed, timeout = PLEX_LAUNCH_TIMEOUT}) { Object.assign(this,{context,callService,haptic,changed,timeout}); }
  update() {
    const request = this.request;
    if (!request) return;
    if (!this.current(request)) this.cancel('Playback cancelled. Choose a TV and try again.');
    else if (request.predicate?.()) { const resolve = request.resolve; request.resolve = request.predicate = null; resolve(); }
  }
  current(request) {
    const ctx = this.context();
    return this.request === request && ctx.active && !ctx.preview && connected(ctx.hass) && ready(ctx.hass,ctx.target?.entity_id)
      && ctx.hass.user?.id === request.account && ctx.hass.connection === request.connection && ctx.ownerKey === request.ownerKey
      && plexTargetIdentity(ctx.target) === request.target;
  }
  cancel(message) {
    const request = this.request;
    if (!request) return;
    this.request = null; clearTimeout(request.timer); request.stop(new Error(message || 'Playback cancelled. Choose a TV and try again.'));
    this.changed({pending:false,error:message || ''});
  }
  async start(item) {
    if (this.request) return false;
    const ctx = this.context(), target = ctx.target;
    if (!ctx.active || ctx.preview || plexLaunchProblem(ctx)) return false;
    const ref = plexReference(item,plexURI(target.plex.library_root.media_content_id).host);
    if (!item.can_play || item.can_expand || !ref) return false;
    const link=rivuletPlayback(target.plex)?rivuletLink(item,plexURI(target.plex.library_root.media_content_id).host):null;
    if(rivuletPlayback(target.plex)&&!link)return false;
    let stop;
    const stopped = new Promise((_,reject)=>{stop=reject;});
    const request = {stop,stopped,account:ctx.hass.user?.id,connection:ctx.hass.connection,ownerKey:ctx.ownerKey,target:plexTargetIdentity(target)};
    this.request = request;
    request.timer = setTimeout(()=>this.cancel('Playback was not confirmed in time.'),this.timeout);
    this.haptic('heavy'); this.changed({pending:true,error:''});
    const wait = predicate => {
      if (!this.current(request)) throw new Error('Playback cancelled. Choose a TV and try again.');
      if (predicate()) return Promise.resolve();
      request.predicate=predicate;
      return Promise.race([new Promise(resolve=>{request.resolve=resolve;}),stopped]);
    };
    const call = async (domain,service,id,data={},bit) => {
      if (!this.current(request)) throw new Error('Playback cancelled. Choose a TV and try again.');
      const hass=this.context().hass;
      if (!ready(hass,id)) throw new Error('Unavailable');
      if (bit && !supports(hass,id,bit)) throw new Error('This device does not support the requested Plex action.');
      let outcome, failure;
      await Promise.race([this.callService(hass,domain,service,{...data,entity_id:id},(status,error)=>{if(['success','error','skipped'].includes(status)){outcome=status;failure=error;}}),stopped]);
      if (outcome !== 'success') throw failure || new Error('Unavailable');
    };
    try {
      if (['off','standby'].includes(ctx.hass.states[target.entity_id].state)) {
        await call('media_player','turn_on',target.entity_id,{},128);
        await wait(()=>!['off','standby'].includes(this.context().hass.states[target.entity_id]?.state));
      }
      if (link) {
        await call('media_player','play_media',target.entity_id,{media_content_type:'url',media_content_id:link},PLEX_PLAY_MEDIA);
      } else {
        if (!appOpen(this.context().hass,target)) {
          await call('media_player','select_source',target.entity_id,{source:target.plex.app_source},2048);
          await wait(()=>appOpen(this.context().hass,target));
        }
        if (!supports(this.context().hass,target.plex.client_entity,PLEX_PLAY_MEDIA)) {
          await call('button','press',target.plex.scan_clients_entity);
          await wait(()=>supports(this.context().hass,target.plex.client_entity,PLEX_PLAY_MEDIA));
        }
        await call('media_player','play_media',target.plex.client_entity,ref,PLEX_PLAY_MEDIA);
      }
      if (this.current(request)) { this.request=null;clearTimeout(request.timer);this.changed({pending:false,error:'',accepted:true}); }
      return true;
    } catch (error) {
      if (this.request === request) { this.request=null;clearTimeout(request.timer);this.changed({pending:false,error:plexError(error)}); }
      return false;
    } finally { request.resolve=request.predicate=null; }
  }
}
