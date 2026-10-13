import "./panel.css";

import {
  cardForEntity,
  addPageSection,
  clone,
  createPage,
  deletePage,
  duplicatePage,
  configuredEntityIds,
  entityCandidates,
  entityGroupMemberCompatible,
  entityMeta,
  flattenEntities,
  importAreaRoom,
  mergeEntityValues,
  moveItem,
  newEntityGroupId,
  normalizeConfig,
  pageContainers,
  roomPageTemplate,
  pageReferences,
  pinPage,
  preserveEntityValue,
  renamePage,
  serializeConfig,
  slugify,
  validateConfig,
} from "./editor-model.js";

const PANEL_ASSET_VERSION = new URL(import.meta.url).search;
const PANEL_CSS = new URL(`./MaraoDashboardPanel.css${PANEL_ASSET_VERSION}`, import.meta.url).href;
const BRAND_MARK = new URL(`./brand/mark.svg${PANEL_ASSET_VERSION}`, import.meta.url).href;
const BRAND_MARK_DARK = new URL(`./brand/mark-dark.svg${PANEL_ASSET_VERSION}`, import.meta.url).href;

const TEXT = {
  en: {
    editorTitle: "Marao Dashboard Editor", loading: "Loading your dashboard…", loadingJson: "Loading JSON editor…", retry: "Retry", loadFailed: "Could not load your dashboard: ", jsonFailed: "Could not load the JSON editor: ", jsonStylesFailed: "JSON styles could not load.", jsonWorkerFailed: "JSON worker could not load.",
    subtitle: "Configure pages and cards.", visual: "Visual", json: "JSON",
    save: "Save & Generate", discard: "Discard changes", history: "History", open: "Open dashboard",
    navigation: "Navigation bar", addNavPage: "Add page", general: "General", overview: "Overview", rooms: "Rooms", pages: "Pages", addRoom: "Add room", addCustomPage: "Add custom page",
    addCard: "Add card", noCards: "No cards yet.", dirty: "Unsaved changes", clean: "Saved",
    format: "Format JSON", collapse: "Collapse region", expand: "Expand region", advanced: "Advanced options", restore: "Restore", cancel: "Cancel", more: "More actions",
    create: "Create", update: "Update", delete: "Delete", duplicate: "Duplicate",
    edit: "Edit", add: "Add", chooseCard: "Choose a Marao card",
    byType: "By card type", byEntity: "By entity", searchEntities: "Search by name or entity ID",
    suggestions: "Suggested for this room", metadataLoading: "Loading current entities…", metadataFailed: "Could not load current entities. ",
    unknown: "Unknown", unavailable: "Unavailable",
    noArea: "Choose a suggestion area in Edit page, or search all entities.", missingArea: "This suggestion area is no longer available. Search all entities or choose another area.",
    noSuggestions: "No new compatible entities in this area.", noResults: "No compatible entities match your search.", globalSearch: "Search entities from any room.", alreadyAdded: "Already added",
    pendingConversion: "The saved dashboard is ready to convert. Save & Generate keeps the prior version in History.",
  },
  pt: {
    editorTitle: "Editor do Marao Dashboard", loading: "A carregar o seu dashboard…", loadingJson: "A carregar o editor JSON…", retry: "Tentar novamente", loadFailed: "Não foi possível carregar o dashboard: ", jsonFailed: "Não foi possível carregar o editor JSON: ", jsonStylesFailed: "Não foi possível carregar os estilos do editor JSON.", jsonWorkerFailed: "Não foi possível carregar o processo do editor JSON.",
    subtitle: "Configure páginas e cartões.", visual: "Visual", json: "JSON",
    save: "Guardar e gerar", discard: "Descartar alterações", history: "Histórico", open: "Abrir dashboard",
    navigation: "Barra de navegação", addNavPage: "Adicionar página", general: "Geral", overview: "Resumo", rooms: "Divisões", pages: "Páginas", addRoom: "Adicionar divisão", addCustomPage: "Adicionar página personalizada",
    addCard: "Adicionar cartão", noCards: "Ainda não existem cartões.", dirty: "Alterações por guardar", clean: "Guardado",
    format: "Formatar JSON", collapse: "Recolher região", expand: "Expandir região", advanced: "Opções avançadas", restore: "Restaurar", cancel: "Cancelar", more: "Mais ações",
    create: "Criar", update: "Atualizar", delete: "Eliminar", duplicate: "Duplicar",
    edit: "Editar", add: "Adicionar", chooseCard: "Escolha um cartão Marao",
    byType: "Por tipo de cartão", byEntity: "Por entidade", searchEntities: "Pesquisar por nome ou ID da entidade",
    suggestions: "Sugestões para esta divisão", metadataLoading: "A carregar as entidades atuais…", metadataFailed: "Não foi possível carregar as entidades atuais. ",
    unknown: "Desconhecida", unavailable: "Indisponível",
    noArea: "Escolha uma área para sugestões em Editar página ou pesquise todas as entidades.", missingArea: "Esta área para sugestões já não está disponível. Pesquise todas as entidades ou escolha outra área.",
    noSuggestions: "Não existem novas entidades compatíveis nesta área.", noResults: "Nenhuma entidade compatível corresponde à pesquisa.", globalSearch: "Pesquise entidades de qualquer divisão.", alreadyAdded: "Já adicionada",
    pendingConversion: "O dashboard guardado está pronto para conversão. Guardar e gerar mantém a versão anterior no Histórico.",
  },
};

const PT_LABELS = {
  "House Power": "Potência da casa", "Month Power": "Energia do mês", "Today Power": "Energia de hoje", "Month Cost": "Custo do mês", "Today Cost": "Custo de hoje",
  "Wallbox Status": "Estado do carregador", "Charging Power": "Potência de carregamento", "Charging Current": "Corrente de carregamento", "Pause / Resume": "Pausar / Retomar",
  "Landing page": "Página inicial", "Page template": "Modelo de página", "Empty": "Vazia", "Room": "Divisão", "Rooms": "Divisões",
  "Pin to navbar": "Fixar na barra", "Unpin": "Desafixar", "Delete page": "Eliminar página", "Section": "Secção", "Add section": "Adicionar secção", "Delete section": "Eliminar secção", "Edit layout": "Editar disposição", "copy": "cópia",
  "Replace existing links with": "Substituir ligações existentes por", "Confirm the named page deletion.": "Confirme a eliminação da página indicada.",
  "Page created unpinned. Add a shortcut or unpin another navbar entry.": "Página criada sem fixar na barra. Adicione um atalho ou desafixe outra entrada.",
  "Unpin another page before adding a sixth navbar entry.": "Desafixe outra página antes de adicionar uma sexta entrada na barra.",
  "Keep at least one page.": "Mantenha pelo menos uma página.", "Select an existing page.": "Escolha uma página existente.",
  "Choose a replacement page for the landing view and existing links.": "Escolha uma página para substituir a página inicial e as ligações existentes.",
  "Remove or retarget popup links before deleting this page.": "Remova ou altere o destino das ligações a popups antes de eliminar esta página.",
  "Raw cards are retained and editable in JSON.": "Os cartões livres são preservados e podem ser editados em JSON.",
  "Choose an existing suggestion area.": "Escolha uma área de sugestões existente.", "Choose a supported page template.": "Escolha um modelo de página suportado.",
  "Title": "Título", "Weather": "Meteorologia", "Forecast": "Previsão", "Room shortcut": "Atalho de divisão", "Room lights": "Luzes da divisão", "Primary source": "Entidade principal",
  "Scene collection": "Coleção de cenários", "Security action": "Ação de segurança", "Energy period": "Período de energia", "Period": "Período", "Day": "Dia", "Month": "Mês", "History popup": "Popup de histórico",
  "Media app": "Aplicação multimédia", "App source": "Origem da aplicação", "Apps": "Aplicações", "Add app": "Adicionar aplicação", "Edit app": "Editar aplicação", "Apple TV controls": "Controlos Apple TV",
  "Mixed legacy and canonical page configuration.": "A configuração mistura páginas antigas e páginas do formato atual.",
  "Each page requires a name.": "Cada página precisa de um nome.", "Each page must be an object.": "Cada página tem de ser um objeto.",
  "Each page requires a unique safe path.": "Cada página precisa de um caminho válido e único.", "Each page identity must be safe and unique.": "Cada página precisa de um identificador válido e único.",
  "Page output paths must be safe unique view files.": "Os ficheiros das páginas têm de ter caminhos válidos e únicos.",
  "Page subview must be a boolean.": "A opção de subpágina tem de ser verdadeira ou falsa.", "Page icon and area must be strings.": "O ícone e a área da página têm de ser textos.",
  "A page cannot mix sections with flat entities, cards or columns.": "Uma página não pode misturar secções com entidades, cartões ou colunas fora das secções.",
  "Page sections must be a list of objects.": "As secções têm de ser uma lista de objetos.", "Page sections cannot contain nested sections.": "Uma secção não pode conter outras secções.",
  "Columns must be an integer between 1 and 6.": "O número de colunas tem de ser um inteiro de 1 a 6.",
  "Raw cards must be a list of Lovelace card objects.": "Os cartões livres têm de ser uma lista de objetos Lovelace.",
  "Page entities must be strings, descriptors, lists or grouped objects.": "Os cartões da página têm de ser identificadores, descritores, listas ou objetos agrupados.",
  "Each local card identity must be safe and unique within its page.": "Cada cartão precisa de um identificador válido e único na sua página.",
  "Choose a supported page card template.": "Escolha um tipo de cartão suportado.", "Page card entity_id must be a valid entity.": "O cartão precisa de um identificador de entidade válido.",
  "Bind or remove the draft card before generation.": "Associe uma entidade ao cartão em rascunho ou remova-o antes de gerar.",
  "Page card binding is incompatible with its template.": "A entidade não é compatível com este tipo de cartão.", "Card name and icon must be strings.": "O nome e o ícone do cartão têm de ser textos.", "Card options must be an object.": "As opções do cartão têm de ser um objeto.",
  "Choose a destination for the page shortcut.": "Escolha um destino para o atalho de página.", "Scene collection entities must be an explicit list.": "Os cenários têm de ser uma lista explícita.",
  "Scene collection members must be native scenes or toggle entities.": "Os membros têm de ser cenários nativos ou entidades com ação de alternar.",
  "Select an existing landing page.": "Escolha uma página inicial existente.", "Navigation must be a list of at most five entries.": "A navegação tem de ser uma lista com até cinco entradas.",
  "Navigation entries require a page or a labeled URL.": "Cada entrada precisa de uma página ou de um URL com nome.", "Retarget or remove references to missing pages.": "Altere ou remova as referências a páginas em falta.",
  "Energy period must be day or month.": "O período de energia tem de ser dia ou mês.", "Charging shortcuts require at most three finite numbers.": "Os atalhos de corrente aceitam até três números finitos.",
  "Room lights must be an explicit list of light entities.": "As luzes da divisão têm de ser uma lista explícita de entidades de iluminação.", "Media app requires an explicit source.": "A aplicação multimédia precisa de uma origem explícita.",
  "Security action must control its selected entity with the native service.": "A ação de segurança tem de usar o serviço nativo da entidade selecionada.",
  "Apple TV options must be an object or false.": "As opções Apple TV têm de ser um objeto ou falso.", "Choose a compatible media remote entity.": "Escolha uma entidade de comando multimédia compatível.", "Media apps require an explicit ordered list of sources.": "As aplicações precisam de uma lista explícita e ordenada de origens.",
  "An editable heading inside any page or section.": "Um título editável em qualquer página ou secção.", "Current weather with an optional native forecast.": "Meteorologia atual com previsão nativa opcional.",
  "Open a page and switch off its explicitly selected lights.": "Abrir uma página e desligar as luzes escolhidas explicitamente.", "Open an ordered collection of native scenes and toggle helpers.": "Abrir uma coleção ordenada de cenários nativos e auxiliares de alternância.",
  "The authoritative alarm state and native alarm controls.": "Estado atual do alarme e controlos nativos.", "A deliberate security service action with a 1.2-second hold.": "Uma ação de segurança que exige manter a pressão durante 1,2 segundos.",
  "A compact entity reading or status.": "Uma leitura ou estado compacto de uma entidade.", "A day or month reading and its independently named history popup.": "Uma leitura diária ou mensal e o seu popup de histórico com nome próprio.", "Open a configured source on the selected media player.": "Abrir uma origem configurada no leitor multimédia selecionado.",
  "Entity Group": "Grupo de entidades", "Entity Groups": "Grupos de entidades", "Add Entity Group": "Adicionar grupo de entidades",
  "Summarize selected lights, covers, batteries or thermostats and open their controls.": "Resumir luzes, estores, baterias ou termóstatos escolhidos e abrir os respetivos controlos.",
  "Group name": "Nome do grupo", "Entity type": "Tipo de entidade", "Popup filter": "Filtro do popup",
  "All entities": "Todas as entidades", "Active only": "Só as ativas", Members: "Membros", members: "membros",
  "Missing entity": "Entidade em falta", "Incompatible member": "Membro incompatível", "Move up": "Mover para cima", "Move down": "Mover para baixo",
  "Entity Group must be an hc_entity_group_card object.": "O grupo tem de ser um objeto hc_entity_group_card.",
  "Entity Group requires a stable safe id.": "O grupo precisa de um identificador estável válido.",
  "Duplicate Entity Group id.": "Identificador de grupo repetido.", "Entity Group id is reserved.": "Este identificador de grupo está reservado.",
  "Choose a supported Entity Group type.": "Escolha um tipo de grupo suportado.", "Entity Group requires a name.": "O grupo precisa de um nome.",
  "Entity Group icon must be a string.": "O ícone do grupo tem de ser um texto.",
  "Entity Group cannot have a primary entity or page.": "Um grupo não pode ter uma entidade principal nem uma página de destino.",
  "Choose All entities or Active only.": "Escolha Todas as entidades ou Só as ativas.", "Entity Group entities must be a list.": "Os membros do grupo têm de ser uma lista.",
  "Entity Group requires All entities or Active only.": "O grupo precisa do filtro Todas as entidades ou Só as ativas.",
  "Entity Group members must be entity strings or objects, without nesting.": "Os membros têm de ser identificadores ou objetos de entidades, sem grupos dentro de grupos.",
  "Entity Group member options must be an object.": "As opções de um membro têm de ser um objeto.",
  "Entity Group member name and icon must be strings.": "O nome e o ícone de um membro têm de ser textos.",
  "Entity Group has an incompatible member.": "O grupo tem um membro incompatível.", "Overview Entity Groups must be a list.": "Os grupos da página inicial têm de ser uma lista.",
  "Entity Group has an invalid member.": "O grupo tem um membro inválido.",
  "Entity Group has an invalid or conflicting popup hash.": "O grupo tem uma referência de popup inválida ou repetida.",
  "Entity Group popup hash conflicts with another popup.": "A referência do popup do grupo já é usada por outro popup.",
  "Choose a target page": "Escolha uma página de destino", "The shortcut will navigate to another generated page.": "O atalho abre outra página gerada.",
  "This page is not currently generated.": "Esta página não está atualmente gerada.", "Already linked from this page": "Já existe um atalho nesta página",
  "Choose a compatible entity": "Escolha uma entidade compatível", "Search by friendly name or entity ID.": "Pesquise por nome ou ID da entidade.",
  "This entity is not currently available in Home Assistant.": "Esta entidade não está atualmente disponível no Home Assistant.",
  "Already added to this page": "Já adicionada a esta página", "No area": "Sem área", "Select a page first.": "Selecione primeiro uma página.", "Select an entity first.": "Selecione primeiro uma entidade.",
  on: "Ligado", off: "Desligado", unknown: "Desconhecido", unavailable: "Indisponível", idle: "Em espera", paused: "Em pausa", cleaning: "A limpar", docked: "Na base", charging: "A carregar", locked: "Trancado", unlocked: "Destrancado", open: "Aberto", closed: "Fechado", playing: "A reproduzir", heat: "Aquecimento", cool: "Arrefecimento", auto: "Automático",
  "Edit room": "Editar divisão", "Add room": "Adicionar divisão",
  "Live camera feed with a generated Frigate or UniFi Protect events popup.": "Imagem da câmara em direto com uma janela de eventos Frigate ou UniFi Protect.",
  "Control a light and optionally show its brightness slider.": "Controle uma luz e mostre, se desejar, o controlo de luminosidade.",
  "Open, close, and position a cover or blind.": "Abra, feche e ajuste a posição de uma persiana ou cobertura.",
  "Control temperature, modes, and an optional history graph.": "Controle a temperatura e os modos, com um gráfico de histórico opcional.",
  "Control a fan and optionally show its percentage slider.": "Controle uma ventoinha e mostre, se desejar, o controlo de velocidade.",
  "Media controls with artwork and generated popup controls.": "Controlos multimédia com imagem e uma janela de comandos.",
  "Guided lock, door, garage, or gate controls with a popup.": "Controlos guiados para fechadura, porta, garagem ou portão numa janela.",
  "Show sensor state, last change, and state-aware colors.": "Mostre o estado do sensor, a última alteração e cores conforme o estado.",
  "Toggle a switch with optional power usage and graph.": "Ligue ou desligue um interruptor, com consumo e gráfico opcionais.",
  "Increase or decrease a Home Assistant number entity.": "Aumente ou diminua uma entidade numérica do Home Assistant.",
  "Large charging-current value with up/down controls and optional shortcuts.": "Valor da corrente de carregamento com controlos de ajuste e atalhos opcionais.",
  "Vacuum controls with up to three room or segment actions.": "Controlos do aspirador com até três ações para divisões ou zonas.",
  "Battery percentage with green, yellow, and red states.": "Percentagem da bateria com estados verde, amarelo e vermelho.",
  "Operation state, progress, remaining time, and refill warnings.": "Estado de funcionamento, progresso, tempo restante e avisos de reposição.",
  "A focused running-state card for a washing machine.": "Cartão com o estado de funcionamento da máquina de lavar roupa.",
  "A large live metric with a project-owned 24-hour background graph.": "Leitura atual em destaque com um gráfico de 24 horas em fundo.",
  "A live metric graph that also controls a related toggle.": "Gráfico de uma leitura atual que também controla um interruptor associado.",
  "Show recent state transitions for any supported entity.": "Mostre as alterações recentes de estado de uma entidade compatível.",
  "Open another generated dashboard page.": "Abra outra página gerada do dashboard.",
  "Suggestion area": "Área para sugestões",
  "Current room selections use explicit entities; import legacy include/exclude/overrides before editing.": "As divisões atuais usam entidades explícitas; importe as instruções antigas include/exclude/overrides antes de editar.",
  "Binary state is shown by the card and icon. Prefix-only labels are omitted; useful labels and readings remain.": "O estado binário é apresentado pelo cartão e pelo ícone. As legendas que só têm um prefixo são omitidas; as legendas úteis e as leituras mantêm-se.",
  "config_version must be a nonnegative integer.": "config_version tem de ser um número inteiro não negativo.",
  "Unsupported dashboard format. Update Marao before editing this configuration.": "Formato do dashboard não suportado. Atualize o Marao antes de editar esta configuração.",
  "Resources changed during dashboard preflight": "Os recursos foram alterados durante a preparação do dashboard.",
  "Native dashboard requires its saved title and nonempty views": "O dashboard nativo precisa do título guardado e de páginas não vazias.",
  "Native dashboard cannot contain generator configuration": "O dashboard nativo não pode misturar a configuração do gerador.",
  "Native dashboard has missing or ambiguous view paths": "O dashboard nativo tem caminhos de páginas em falta ou ambíguos.",
  "Native dashboard has ambiguous view content": "O dashboard nativo tem conteúdo de páginas ambíguo.",
  "Native dashboard sections must contain saved card lists": "As secções do dashboard nativo precisam de listas de cartões guardadas.",
  "Native navigation requires its saved Marao dashboard destination": "A navegação nativa precisa do destino guardado no dashboard Marao.",
  "Native navigation has a missing destination": "A navegação nativa tem um destino em falta.",
  "Native dashboard cards must be objects": "Os cartões do dashboard nativo têm de ser objetos.",
  "Native entity card has a missing binding": "O cartão nativo tem uma entidade em falta.",
  "Native entity card has an unsupported binding": "O cartão nativo tem uma entidade não suportada.",
  "Native header subtitle must be text": "O subtítulo do cabeçalho nativo tem de ser texto.",
  "The saved Marao configuration is missing; restore it before generation": "A configuração guardada do Marao está em falta; restaure-a antes de gerar.",
  "The saved native Marao dashboard registration is missing": "O registo guardado do dashboard nativo Marao está em falta.",
  "The native Marao dashboard data is missing": "Os dados do dashboard nativo Marao estão em falta.",
  "Cannot safely import the existing native Marao dashboard": "Não é possível importar com segurança o dashboard nativo Marao existente.",
  "Unsupported native dashboard storage": "O armazenamento do dashboard nativo não é suportado.",
  "Unsupported native storage envelope metadata; the saved data was left unchanged": "Os metadados do armazenamento nativo não são suportados; os dados guardados não foram alterados.",
  "Native dashboard storage is invalid; restore its exact backup": "O armazenamento do dashboard nativo é inválido; restaure a cópia de segurança exata.",
  "Native dashboard changed before migration": "O dashboard nativo foi alterado antes da migração.",
  "Native dashboard changed independently before migration": "O dashboard nativo foi alterado por outra operação antes da migração.",
  "Native dashboard changed during preflight": "O dashboard nativo foi alterado durante a preparação.",
  "Native dashboard persistence failed": "Não foi possível guardar o dashboard nativo.",
  "Native dashboard storage cannot be a symlink": "O armazenamento do dashboard nativo não pode ser uma ligação simbólica.",
  "The released native Marao dashboard requires its saved dashboard route": "O dashboard nativo Marao requer o seu endereço guardado.",
  "Multiple native Marao dashboards require explicit recovery; no starter was created": "Existem vários dashboards nativos Marao; é necessária uma recuperação explícita e não foi criado um dashboard inicial.",
  "Native dashboard recovery copy changed": "A cópia de recuperação do dashboard nativo foi alterada.",
  "Native dashboard recovery identity changed": "A identificação da recuperação do dashboard nativo foi alterada.",
  "Native owned state changed during backup": "Os dados pertencentes ao dashboard nativo foram alterados durante a cópia de segurança.",
  "Native migration requires an owned generated include": "A migração nativa requer uma inclusão gerada pertencente ao dashboard.",
  "Unsafe generated include": "A inclusão gerada não é segura.",
  "Native migration produced invalid dashboard output": "A migração nativa produziu uma configuração inválida do dashboard.",
  "Resources changed during dashboard cleanup": "Os recursos foram alterados durante a limpeza do dashboard.",
  "Legacy resource persistence failed": "Não foi possível guardar os recursos antigos.",
  "A legacy resource changed independently during recovery": "Um recurso antigo foi alterado por outra operação durante a recuperação.",
  "A legacy resource has no recoverable identity": "Um recurso antigo não tem uma identificação que permita recuperá-lo.",
  "Cannot retain the existing resource baseline": "Não foi possível guardar a versão anterior dos recursos.",
  "Invalid dashboard operation targets": "Os destinos da operação do dashboard são inválidos.",
  "Dashboard files changed during preflight": "Os ficheiros do dashboard foram alterados durante a preparação.",
  "Dashboard recovery failed; exact private copies remain in .history/.operation. Resolve the reported file conflict before retrying.": "A recuperação do dashboard falhou. As cópias privadas exatas permanecem em .history/.operation. Resolva o conflito indicado antes de tentar novamente.",
  Home: "Início", "Dashboard name": "Nome do dashboard", "URL slug": "Identificador do URL", Theme: "Tema", Icon: "Ícone",
  "Weather entity": "Entidade meteorológica", Scenes: "Cenários", "Scene order": "Ordem dos cenários",
  Security: "Segurança", Energy: "Energia", Wallbox: "Carregador", Media: "Multimédia",
  Alarm: "Alarme", "Access entities": "Entidades de acesso", Actions: "Ações",
  "House power": "Potência da casa", "Month energy": "Energia do mês", "Month cost": "Custo do mês",
  "Today energy": "Energia de hoje", "Today cost": "Custo de hoje", Appliances: "Eletrodomésticos",
  Status: "Estado", "Charging power": "Potência de carregamento", "Maximum current": "Corrente máxima",
  "Current control": "Controlo de corrente", "Current presets": "Valores de corrente", "Pause / resume": "Pausar / retomar",
  "Media players": "Leitores multimédia", Entity: "Entidade", "Display name": "Nome apresentado",
  Light: "Luz", Cover: "Estores", Climate: "Climatização", Fan: "Ventoinha", "Media player": "Leitor multimédia",
  Access: "Acesso", Sensor: "Sensor", Switch: "Interruptor", "Number control": "Controlo numérico",
  Vacuum: "Aspirador", Battery: "Bateria", Dishwasher: "Máquina de lavar loiça",
  "Washing machine": "Máquina de lavar roupa", Graph: "Gráfico", "Toggle graph": "Gráfico com interruptor", Timeline: "Cronologia",
  "Brightness slider": "Controlo de luminosidade", "Card color": "Cor do cartão", "Label prefix": "Prefixo da legenda",
  "Temperature graph": "Gráfico de temperatura", "Graph entity": "Entidade do gráfico", "Mode buttons": "Botões de modo",
  "Graph color": "Cor do gráfico", "Setpoint label": "Legenda da temperatura", "Mode popup hash": "Endereço do popup de modo",
  "Speed slider": "Controlo de velocidade", "Background artwork": "Imagem de fundo", "Background color": "Cor de fundo",
  "Popup hash": "Endereço do popup", "Active color": "Cor ativa", "On icon": "Ícone ligado", "Off icon": "Ícone desligado",
  "Power entity": "Entidade de potência", "Power graph": "Gráfico de potência", "Power unit": "Unidade de potência",
  "Graph line": "Linha do gráfico", "Graph fill": "Preenchimento do gráfico", "Vacuum icon": "Ícone do aspirador",
  Progress: "Progresso", "Remaining time": "Tempo restante", "Salt warning": "Aviso de sal",
  "Rinse-aid warning": "Aviso de abrilhantador", "Active program": "Programa ativo", "Show icon": "Mostrar ícone",
  Background: "Fundo", "Toggle entity": "Entidade do interruptor", "Active content color": "Cor do conteúdo ativo",
  "Active icon background": "Fundo do ícone ativo", "Inactive background": "Fundo inativo",
  "Inactive name color": "Cor do nome inativo", "Inactive state color": "Cor do estado inativo",
  "Inactive icon color": "Cor do ícone inativo", "Inactive icon background": "Fundo do ícone inativo",
  "Timeline title": "Título da cronologia", "Room name": "Nome da divisão", Path: "Caminho",
  "Import Home Assistant area": "Importar área do Home Assistant", Loads: "Consumos", "Add load": "Adicionar consumo",
  "Related toggle": "Interruptor associado", Name: "Nome", Card: "Cartão", "Remote entity": "Entidade de comando",
  "Volume remote": "Comando de volume", "Apps — Name | Source | Icon": "Aplicações — Nome | Fonte | Ícone",
  "Page name": "Nome da página", "Target page": "Página de destino", "Page shortcut": "Atalho para página", "Icon color": "Cor do ícone",
  "Display unit": "Unidade apresentada", "Decimal places": "Casas decimais", "Reading format": "Formato da leitura",
  "Auto keeps the source unit. Selecting a compatible unit converts the reading.": "Auto mantém a unidade de origem. Escolher uma unidade compatível converte a leitura.",
  "Auto trims trailing zeros. Choose 0–6 fixed decimal places.": "Auto remove os zeros finais. Escolha 0–6 casas decimais fixas.",
  "Decimal places must be an integer from 0 to 6.": "As casas decimais têm de ser um número inteiro de 0 a 6.",
  "Choose a supported power or energy display unit.": "Escolha uma unidade de potência ou energia suportada.",
  "A supported source unit is required for conversion.": "A conversão requer uma unidade de origem suportada.",
  "Display unit is incompatible with the source reading.": "A unidade apresentada é incompatível com a leitura de origem.",
  Columns: "Colunas", Automatic: "Automático",
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

class MaraoDashboardPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._loaded = false;
    this._loadAttempted = false;
    this._lifecycle = 0;
    this._requestedTab = "visual";
    this._jsonAttempt = 0;
    this._busy = false;
    this._dirty = false;
    this._tab = "visual";
    this._expandedSections = { rooms: true, pages: true };
    this._collapsedRooms = new Set();
  }

  set hass(value) {
    this._hass = value;
    const mark = this.shadowRoot.querySelector(".brand-mark");
    if (mark) mark.src = value?.themes?.darkMode ? BRAND_MARK_DARK : BRAND_MARK;
    if (this._monaco) this._setMonacoTheme();
    if (this.isConnected && !this._loaded && !this._loadAttempted) this._load();
  }

  set panel(value) { this._panel = value; }

  connectedCallback() {
    this._renderShell();
    this._headerResize = new ResizeObserver(([entry]) => {
      this.style.setProperty("--editor-header-height", `${entry.target.getBoundingClientRect().height}px`);
    });
    this._headerResize.observe(this.shadowRoot.querySelector(".editor-header"));
    if (this._hass && !this._loaded && !this._loadAttempted) this._load();
    if (this._loaded && this._requestedTab === "json") this._switchTab("json");
  }

  disconnectedCallback() {
    this._headerResize?.disconnect();
    this._lifecycle += 1;
    this._jsonCancel?.();
    if (this._monaco) this._jsonDraft = this._monaco.getValue();
    this._monaco?.getModel()?.dispose(); this._monaco?.dispose(); this._monaco = null;
    this._busy = false;
    if (!this._loaded) this._loadAttempted = false;
  }

  _t(key) {
    const language = String(this._hass?.language || "en").toLowerCase().split("-")[0];
    return (TEXT[language] || TEXT.en)[key] || TEXT.en[key] || key;
  }

  _l(label) {
    const language = String(this._hass?.language || "en").toLowerCase().split("-")[0];
    return language === "pt" ? PT_LABELS[label] || PT_LABELS[label + '.']?.replace(/\.$/, '') || label : label;
  }

  _renderShell() {
    if (this.shadowRoot.innerHTML) return;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${PANEL_CSS}">
      <main class="page">
        <header class="editor-header">
        <div class="toolbar">
          <div class="title"><img class="brand-mark" src="${this._hass?.themes?.darkMode ? BRAND_MARK_DARK : BRAND_MARK}" alt="" aria-hidden="true" width="32" height="32"><h1>${this._t("editorTitle")}</h1></div>
          <span id="dirty" class="dirty"></span>
          <div class="actions">
            <ha-button id="save" appearance="filled">${this._t("save")}</ha-button>
            <details class="secondary-actions">
              <summary aria-label="${this._t("more")}"><ha-icon icon="mdi:dots-vertical"></ha-icon></summary>
              <div class="secondary-menu">
            <ha-button id="history">${this._t("history")}</ha-button>
            <ha-button id="discard">${this._t("discard")}</ha-button>
            <a id="open-dashboard" href="#" target="_blank" rel="noopener">${this._t("open")}</a>
              </div>
            </details>
          </div>
        </div>
        <div class="tabs" role="tablist">
          <button class="tab" data-tab="visual" role="tab" aria-selected="true">${this._t("visual")}</button>
          <button class="tab" data-tab="json" role="tab" aria-selected="false">${this._t("json")}</button>
        </div>
        <div id="load-feedback" class="load-feedback" hidden><span role="status"></span></div>
        </header>
        <section id="visual-view" class="view"></section>
        <section id="json-view" class="view" hidden>
          <div class="actions" style="margin-bottom:10px"><ha-button id="format-json">${this._t("format")}</ha-button><ha-button id="collapse-json">${this._t("collapse")}</ha-button><ha-button id="expand-json">${this._t("expand")}</ha-button></div>
          <div class="json-shell"><div id="monaco"></div></div>
        </section>
        <div id="status" class="status" role="status">${this._t("loading")}</div>
        <ha-button id="retry" hidden>${this._t("retry")}</ha-button>
      </main>`;
    this.shadowRoot.addEventListener("focusin", (event) => {
      const path = event.composedPath(); const target = path[0];
      const pressed = this._pressedPath?.includes(target); this._pressedPath = null;
      if (!path.includes(this.shadowRoot.getElementById("visual-view"))) return;
      // Moving a pressed button before pointerup cancels its native click.
      if (pressed && target.localName === "button") return;
      // Native field reveal otherwise considers content behind the sticky header visible.
      target.style.scrollMarginTop = "calc(var(--editor-header-height,150px) + 12px)";
      const bounds = target.getBoundingClientRect();
      if (bounds.top < this.shadowRoot.querySelector(".editor-header").getBoundingClientRect().bottom + 8 || bounds.bottom > innerHeight) target.scrollIntoView({ block: "start", behavior: "instant" });
    });
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((tab) =>
      tab.addEventListener("click", () => this._switchTab(tab.dataset.tab)));
    this.shadowRoot.getElementById("retry").addEventListener("click", () => {
      if (this._retryKind === "json") this._switchTab("json"); else this._load(true);
    });
    this.shadowRoot.getElementById("open-dashboard").addEventListener("click", (event) => {
      if (!this._loaded || this._busy) event.preventDefault();
    });
    this._updateHeader();
    this.shadowRoot.getElementById("save").addEventListener("click", () => this._save());
    this.shadowRoot.getElementById("discard").addEventListener("click", () => this._discard());
    this.shadowRoot.getElementById("history").addEventListener("click", () => this._openHistory());
    this.shadowRoot.getElementById("format-json").addEventListener("click", () =>
      this._monaco?.getAction("editor.action.formatDocument")?.run());
    for (const [id, action] of [["collapse-json", "editor.fold"], ["expand-json", "editor.unfold"]]) {
      this.shadowRoot.getElementById(id).addEventListener("click", () => {
        if (!this._monaco || this._busy || this._jsonLoading) return;
        this._monaco.focus(); this._monaco.getAction(action)?.run();
      });
    }
    this.shadowRoot.querySelector(".secondary-menu").addEventListener("click", () => {
      this.shadowRoot.querySelector(".secondary-actions").open = false;
      this.shadowRoot.querySelector(".secondary-actions summary").focus();
    });
    this.shadowRoot.addEventListener("pointerdown", (event) => {
      this._pressedPath = event.composedPath();
      const menu = this.shadowRoot.querySelector(".secondary-actions");
      if (!event.composedPath().includes(menu)) menu.open = false;
    });
    this.shadowRoot.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.shadowRoot.querySelector(".secondary-actions").open = false;
    });
  }

  _load(force = false) {
    if (this._loading) return this._loading;
    if (!this._hass || this._busy || !this.isConnected) return;
    const lifecycle = this._lifecycle;
    const previousModel = this._model;
    const previouslyLoaded = this._loaded;
    this._loadAttempted = true;
    this._retryKind = null;
    this._setBusy(true); this._setStatus(this._t("loading"), "");
    this._loading = Promise.resolve().then(async () => {
      try {
        const payload = await this._hass.callWS({ type: "marao_dashboard/config/get" });
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        const model = normalizeConfig(JSON.parse(payload.config));
        this._catalog = payload.editor.catalog; this._entities = payload.editor.entities;
        this._areas = payload.editor.areas; this._history = payload.history;
        this._model = model; this._loaded = true;
        this._renderVisual();
        this._savedSource = this._source(); this._jsonDraft = null; this._dirty = false;
        this.shadowRoot.getElementById("open-dashboard").href = payload.dashboard_url;
        this._dashboardUrl = payload.dashboard_url;
        this._pageTemplates = payload.page_templates;
        if (this._monaco) this._setEditorSource(this._savedSource);
        this._setStatus(payload.conversion_pending ? this._t("pendingConversion") : force ? this._t("clean") : "", "success");
      } catch (error) {
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        this._model = previousModel; this._loaded = previouslyLoaded;
        this._retryKind = "config";
        this._setStatus(this._t("loadFailed") + this._error(error), "error");
      } finally {
        this._loading = null;
        if (this.isConnected && lifecycle === this._lifecycle) this._setBusy(false);
        else if (this.isConnected && !this._loaded && !this._loadAttempted) this._load();
      }
    });
    return this._loading;
  }

  _source() { return `${JSON.stringify(serializeConfig(this._model), null, 2)}\n`; }

  _setDirty() {
    if (this._tab === "visual") this._jsonDraft = null;
    this._dirty = this._source() !== this._savedSource;
    this._updateHeader();
  }

  _updateHeader() {
    const root = this.shadowRoot;
    const feedback = root.getElementById("load-feedback");
    const message = this._jsonLoading ? this._t("loadingJson") : this._retryKind === "json" ? this._t("jsonFailed") : this._loaded && this._retryKind === "config" ? this._t("loadFailed") : "";
    feedback.hidden = !message;
    feedback.querySelector("span").textContent = message.replace(/:\s*$/, "");
    const retry = root.getElementById("retry");
    const parent = message ? feedback : root.querySelector(".page");
    if (retry.parentElement !== parent) parent.append(retry);
    root.getElementById("dirty").textContent = this._dirty ? this._t("dirty") : "";
    root.querySelector(".title h1").textContent = this._t("editorTitle");
    root.querySelector(".secondary-actions summary").setAttribute("aria-label", this._t("more"));
    for (const [id, key] of [["save", "save"], ["discard", "discard"], ["history", "history"], ["open-dashboard", "open"], ["retry", "retry"], ["format-json", "format"], ["collapse-json", "collapse"], ["expand-json", "expand"]]) root.getElementById(id).textContent = this._t(key);
    root.getElementById("save").disabled = this._busy || !this._loaded || Boolean(this._jsonLoading);
    root.getElementById("discard").disabled = this._busy || !this._dirty || Boolean(this._jsonLoading);
    root.getElementById("history").disabled = this._busy || !this._loaded || Boolean(this._jsonLoading);
    for (const id of ["format-json", "collapse-json", "expand-json"]) root.getElementById(id).disabled = this._busy || !this._monaco || Boolean(this._jsonLoading);
    root.getElementById("open-dashboard").setAttribute("aria-disabled", String(this._busy || !this._loaded));
    root.querySelectorAll("[data-tab]").forEach(button => { button.disabled = this._busy || !this._loaded; });
  }

  _renderVisual() {
    if (!this._loaded) return;
    const root = this.shadowRoot.getElementById("visual-view");
    if (this._model.config_version === 2) {
      root.innerHTML = `<div class="section-grid"><ha-card class="span-two"><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:view-dashboard-outline"></ha-icon><h2>${this._t('pages')}</h2><span class="grow"></span><ha-button id="add-page">${this._t('addNavPage')}</ha-button></div><div id="page-manager"></div></div></ha-card><ha-card><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:tune"></ha-icon><h2>${this._t('general')}</h2></div><div id="general-form"></div></div></ha-card><ha-card><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:navigation-variant-outline"></ha-icon><h2>${this._t('navigation')}</h2></div><div id="navbar-list"></div></div></ha-card></div>`;
      this._renderPageManager(root.querySelector('#page-manager'));
      this._mountGeneralForm(root.querySelector('#general-form'));
      this._renderNavigation(root.querySelector('#navbar-list'));
      root.querySelector('#add-page').addEventListener('click', () => this._openPageDialog());
      return;
    }
    root.innerHTML = `
      <div class="section-grid">
        <ha-card class="span-two"><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:navigation-variant-outline"></ha-icon><h2>${this._t("navigation")}</h2><span class="grow"></span><ha-button id="add-nav-page">${this._t("addNavPage")}</ha-button></div><div id="navbar-list"></div></div></ha-card>
        <ha-card><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:tune"></ha-icon><h2>${this._t("general")}</h2></div><div id="general-form"></div></div></ha-card>
        <ha-card><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:home-outline"></ha-icon><h2>${this._t("overview")}</h2></div><div id="overview-form"></div></div></ha-card>
        <ha-card class="span-two"><ha-expansion-panel id="rooms-section"><div class="expansion-heading" slot="header"><ha-icon icon="mdi:sofa-outline"></ha-icon><h2>${this._t("rooms")}</h2><span class="grow"></span><ha-button id="add-room">${this._t("addRoom")}</ha-button></div><div class="expansion-body"><div id="room-list"></div></div></ha-expansion-panel></ha-card>
        <ha-card class="span-two"><ha-expansion-panel id="pages-section"><div class="expansion-heading" slot="header"><ha-icon icon="mdi:view-dashboard-outline"></ha-icon><h2>${this._t("pages")}</h2><span class="grow"></span><ha-button id="add-custom-page">${this._t("addCustomPage")}</ha-button></div><div class="expansion-body"><p class="helper">Enable a guided page or create a custom page with its own cards.</p><div id="page-list"></div></div></ha-expansion-panel></ha-card>
      </div>`;
    for (const key of ["rooms", "pages"]) {
      const panel = root.querySelector(`#${key}-section`);
      panel.expanded = this._expandedSections[key];
      panel.addEventListener("expanded-changed", (event) => {
        this._expandedSections[key] = event.target.expanded;
      });
    }
    this._renderNavigation(root.querySelector("#navbar-list"));
    this._mountGeneralForm(root.querySelector("#general-form"));
    this._mountOverviewForm(root.querySelector("#overview-form"));
    this._renderRooms(root.querySelector("#room-list"));
    this._renderPages(root.querySelector("#page-list"));
    root.querySelector("#add-room").addEventListener("click", (event) => {
      event.stopPropagation();
      this._openRoomDialog();
    });
    root.querySelector("#add-nav-page").addEventListener("click", () => this._openNavigationDialog());
    root.querySelector("#add-custom-page").addEventListener("click", (event) => {
      event.stopPropagation();
      this._openCustomPageDialog();
    });
  }

  _availablePages() {
    if (this._model.config_version === 2) return this._model.pages.map(page => ({ path: page.path, name: page.name, icon: page.icon || 'mdi:file-outline' }));
    const pages = [
      { path: "overview", name: this._l("Home"), icon: "mdi:home-variant" },
      { path: "rooms", name: this._t("rooms"), icon: "mdi:sofa" },
    ];
    for (const [path, page] of Object.entries(this._catalog.pages)) {
      if (Object.hasOwn(this._model.pages, path)) pages.push({ path, name: this._l(page.label), icon: page.icon });
    }
    for (const page of this._model.pages.custom || []) {
      pages.push({ path: page.path, name: page.name, icon: page.icon || "mdi:file-outline" });
    }
    return pages;
  }

  _dashboardRoot() {
    return (this._dashboardUrl || '/marao-dashboard/overview').replace(/\/[a-z0-9_-]+$/, '');
  }

  _renderPageManager(host) {
    const pages = this._model.pages;
    host.innerHTML = pages.map((page, index) => {
      const pinned = this._navigationEntries().some(entry => entry === page.path || entry?.page === page.path);
      return `<article class="room"><ha-expansion-panel data-page-panel="${index}"><div class="room-header" slot="header"><ha-icon icon="${esc(page.icon || 'mdi:file-outline')}"></ha-icon><div class="room-title"><strong>${esc(page.name)}</strong><span>${esc(page.path)}${page.path === this._model.landing_page ? ' · ' + this._l('Landing page') : ''}</span></div><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'page-up', index, index === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'page-down', index, index === pages.length - 1)}${this._iconButton('mdi:pencil', 'Edit page', 'page-edit', index)}${this._iconButton('mdi:content-copy', this._t('duplicate'), 'page-duplicate', index)}${this._iconButton(pinned ? 'mdi:pin-off' : 'mdi:pin', pinned ? 'Unpin' : 'Pin to navbar', 'page-pin', index)}${this._iconButton('mdi:delete-outline', 'Delete page', 'page-delete', index, pages.length === 1)}</div></div><div class="room-body">${pageContainers(page).map((section, sectionIndex) => {
        const position = `${index}:${sectionIndex}`;
        return `<section class="page-section"><div class="card-heading"><h3>${this._l('Section')} ${sectionIndex + 1}</h3><span class="grow"></span><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'section-up', position, !page.sections || sectionIndex === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'section-down', position, !page.sections || sectionIndex === pageContainers(page).length - 1)}${this._iconButton('mdi:view-grid-outline', 'Edit layout', 'section-edit', position)}${this._iconButton('mdi:delete-outline', 'Delete section', 'section-delete', position, !page.sections)}</div></div>${this._entityList(section, position, 'page')}${section.entities?.length ? '' : `<div class="empty">${this._t('noCards')}</div>`}${section.cards?.length ? `<p class="helper">${this._l('Raw cards are retained and editable in JSON.')} (${section.cards.length})</p>` : ''}<ha-button data-action="card-add" data-kind="page" data-room="${position}">${this._t('addCard')}</ha-button></section>`;
      }).join('')}<ha-button data-action="section-add" data-room="${index}">${this._l('Add section')}</ha-button></div></ha-expansion-panel></article>`;
    }).join('');
    host.querySelectorAll('[data-page-panel]').forEach(panel => {
      const page = pages[Number(panel.dataset.pagePanel)], key = page.id || page.path;
      panel.expanded = !this._collapsedRooms.has(key);
      panel.addEventListener('expanded-changed', event => { if (event.target.expanded) this._collapsedRooms.delete(key); else this._collapsedRooms.add(key); });
    });
    host.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      if (button.dataset.action.startsWith('card-')) this._roomAction(button); else this._pageAction(button);
    }));
    this._bindDrag(host);
  }

  _pageAction(button) {
    const action = button.dataset.action;
    const [index, sectionIndex = 0] = button.dataset.room.split(':').map(Number);
    const page = this._model.pages[index];
    try {
      if (action === 'page-edit') return this._openPageDialog(index);
      if (action === 'page-delete') return this._openPageDeleteDialog(index);
      if (action === 'page-up' || action === 'page-down') this._model.pages = moveItem(this._model.pages, index, index + (action === 'page-up' ? -1 : 1));
      if (action === 'page-duplicate') duplicatePage(this._model, index, `${page.name} ${this._l('copy')}`, this._dashboardRoot());
      if (action === 'page-pin') pinPage(this._model, page.path, !this._navigationEntries().some(entry => entry === page.path || entry?.page === page.path));
      if (action === 'section-add') addPageSection(page);
      if (action === 'section-up' || action === 'section-down') page.sections = moveItem(page.sections, sectionIndex, sectionIndex + (action === 'section-up' ? -1 : 1));
      if (action === 'section-delete') page.sections.splice(sectionIndex, 1);
      if (action === 'section-edit') {
        const section = pageContainers(page)[sectionIndex];
        return this._openFormDialog('Edit layout', { columns: section.columns ? String(section.columns) : 'auto' }, [this._columnsSchema()], value => {
          const columns = Number(value.columns);
          if (Number.isInteger(columns) && columns >= 1 && columns <= 6) section.columns = columns; else delete section.columns;
          this._setDirty(); this._renderVisual();
        });
      }
      this._setDirty(); this._renderVisual();
    } catch (error) { this._setStatus(this._error(error), 'error'); }
  }

  async _openPageDialog(index = null) {
    if (index == null) {
      try { await this._refreshEditorMetadata(); }
      catch (error) { this._setStatus(this._error(error), 'error'); return; }
      if (!this.isConnected) return;
    }
    const existing = index == null ? null : this._model.pages[index];
    const templates = this._pageTemplates || this._catalog.page_templates || { empty: { entities: [] } };
    this._openFormDialog(existing ? 'Edit page' : this._t('addNavPage'), {
      template: 'empty', name: existing?.name || '', path: existing?.path || '', icon: existing?.icon || '', area: existing?.area || '',
    }, [
      ...(!existing ? [this._schema('template', 'Page template', { select: { mode: 'dropdown', options: Object.keys(templates).map(value => ({ value, label: this._l(({ empty: 'Empty', home: 'Home', rooms: 'Rooms', room: 'Room', security: 'Security', energy: 'Energy', wallbox: 'Wallbox', media: 'Media' })[value] || value) })) } }, true)] : []),
      this._schema('name', 'Page name', { text: {} }, true), this._schema('path', 'Path', { text: {} }),
      this._schema('icon', 'Icon', { icon: {} }), this._schema('area', 'Suggestion area', { area: {} }),
    ], value => {
      if (!String(value.name || '').trim()) throw new Error('Each page requires a name.');
      if (existing) {
        renamePage(this._model, index, value.path || slugify(value.name), this._dashboardRoot());
        existing.name = value.name.trim(); existing.icon = value.icon || 'mdi:file-outline';
        if (value.area) existing.area = value.area; else delete existing.area;
      } else {
        const atCapacity = this._navigationEntries().length >= 5;
        const selectedTemplates = clone(templates);
        if (value.template === 'rooms') selectedTemplates.rooms = roomPageTemplate(this._model);
        if (value.template === 'room' && value.area) {
          const area = this._areas.find(item => item.area_id === value.area);
          if (!area) throw new Error('Choose an existing suggestion area.');
          const imported = importAreaRoom(area, this._entities, this._catalog.supported_domains);
          const template = selectedTemplates.room;
          if (Array.isArray(template.sections)) template.sections.at(-1).entities = imported.entities;
          else template.entities = imported.entities;
        }
        createPage(this._model, value, selectedTemplates);
        if (atCapacity) this._setStatus(this._l('Page created unpinned. Add a shortcut or unpin another navbar entry.'), 'success');
      }
      this._setDirty(); this._renderVisual();
    }, existing ? this._t('update') : this._t('create'));
  }

  _openPageDeleteDialog(index) {
    const page = this._model.pages[index];
    if (this._model.pages.length === 1) { this._setStatus(this._l('Keep at least one page.'), 'error'); return; }
    const references = pageReferences(this._model, page.path, this._dashboardRoot());
    this._openFormDialog(`${this._l('Delete page')}: ${page.name}`, { confirm_delete: false, replacement: '' }, [
      this._schema('confirm_delete', `${this._l('Delete page')}: ${page.name}`, { boolean: {} }, true),
      ...(references.length ? [this._schema('replacement', 'Replace existing links with', { select: { mode: 'dropdown', options: this._availablePages().filter(item => item.path !== page.path).map(item => ({ value: item.path, label: item.name })) } }, true)] : []),
    ], value => {
      if (!value.confirm_delete) throw new Error('Confirm the named page deletion.');
      deletePage(this._model, index, value.replacement, this._dashboardRoot());
      this._setDirty(); this._renderVisual();
    }, this._t('delete'));
  }

  _navigationEntries() {
    if (this._model.config_version === 2) return this._model.navigation || [];
    return Array.isArray(this._model.navigation)
      ? this._model.navigation
      : this._availablePages().map((page) => page.path);
  }

  _editableNavigation() {
    if (!Array.isArray(this._model.navigation)) this._model.navigation = clone(this._navigationEntries());
    return this._model.navigation;
  }

  _renderNavigation(host) {
    const available = new Map(this._availablePages().map((page) => [page.path, page]));
    const entries = this._navigationEntries();
    host.innerHTML = entries.length ? `<div class="navigation-list">${entries.map((entry, index) => {
      const path = typeof entry === "string" ? entry : entry?.page;
      const page = available.get(path);
      const label = entry?.label || page?.name || path || entry?.url || "Unknown page";
      const detail = page ? page.path : entry?.url || "Page is not currently generated";
      return `<div class="navigation-row"><ha-icon icon="${esc(entry?.icon || page?.icon || "mdi:link-variant")}"></ha-icon><div class="entity-main"><div class="entity-name">${esc(label)}</div><div class="entity-meta">${esc(detail)}</div></div><div class="row-actions">${this._iconButton("mdi:arrow-up", "Move up", "nav-up", index, index === 0)}${this._iconButton("mdi:arrow-down", "Move down", "nav-down", index, index === entries.length - 1)}${this._iconButton("mdi:pin-off", "Unpin", "nav-delete", index)}</div></div>`;
    }).join("")}</div>` : `<div class="empty">No pages in the navigation bar.</div>`;
    host.querySelectorAll("[data-action^='nav-']").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.room);
      const navigation = this._editableNavigation();
      if (button.dataset.action === "nav-delete") navigation.splice(index, 1);
      else this._model.navigation = moveItem(navigation, index, index + (button.dataset.action === "nav-up" ? -1 : 1));
      this._setDirty(); this._renderVisual();
    }));
  }

  _openNavigationDialog() {
    if (this._navigationEntries().length >= 5) {
      this._setStatus("The Marao navbar supports at most five entries.", "error");
      return;
    }
    const used = new Set(this._navigationEntries().map((entry) => typeof entry === "string" ? entry : entry?.page).filter(Boolean));
    const options = this._availablePages().filter((page) => !used.has(page.path)).map((page) => ({ value: page.path, label: page.name }));
    if (!options.length) { this._setStatus("Every generated page is already in the navigation bar.", "success"); return; }
    this._openFormDialog(this._t("addNavPage"), { page: options[0].value }, [
      this._schema("page", "Target page", { select: { mode: "dropdown", options } }, true),
    ], (value) => {
      this._editableNavigation().push(value.page);
      this._setDirty(); this._renderVisual();
    });
  }

  _mountGeneralForm(host) {
    const data = { name: this._model.name || "", slug: this._model.slug || "", theme: this._model.theme || "", icon: this._model.icon || "", ...(this._model.config_version === 2 ? { landing_page: this._model.landing_page } : {}) };
    const themes = Object.keys(this._hass?.themes?.themes || {}).sort().map((theme) => ({ value: theme, label: theme }));
    this._mountForm(host, data, [
      this._schema("name", "Dashboard name", { text: {} }, true),
      this._schema("slug", "URL slug", { text: {} }),
      this._schema("theme", "Theme", { select: { mode: "dropdown", custom_value: true, options: themes } }),
      this._schema("icon", "Icon", { icon: {} }),
      ...(this._model.config_version === 2 ? [this._schema('landing_page', 'Landing page', { select: { mode: 'dropdown', options: this._availablePages().map(page => ({ value: page.path, label: page.name })) } }, true)] : []),
    ], (value) => {
      Object.assign(this._model, value);
      this._setDirty();
    });
  }

  _mountOverviewForm(host) {
    const scenes = this._entityIds(this._model.overview.scenes);
    const data = { weather_entity: this._entityId(this._model.overview.weather_entity), scenes };
    host.innerHTML = `<div id="overview-fields"></div><div id="scene-order"></div><div id="overview-groups"></div>`;
    const orderHost = host.querySelector("#scene-order");
    this._mountForm(host.querySelector("#overview-fields"), data, [
      this._schema("weather_entity", "Weather entity", { entity: { domain: ["weather"] } }),
      this._schema("scenes", "Scenes", { entity: { domain: ["scene", "input_boolean", "input_select"], multiple: true } }),
    ], (value) => {
      this._model.overview = {
        ...this._model.overview,
        weather_entity: preserveEntityValue(this._model.overview.weather_entity, value.weather_entity),
        scenes: mergeEntityValues(this._model.overview.scenes, value.scenes || []),
      };
      this._renderSceneOrder(orderHost);
      this._setDirty();
    });
    this._renderSceneOrder(orderHost);
    const groups = host.querySelector('#overview-groups');
    groups.innerHTML = `<h3>${this._l('Entity Groups')}</h3>${this._entityList(this._container('overview', 0), 0, 'overview')}<ha-button data-add-group>${this._l('Add Entity Group')}</ha-button>`;
    groups.querySelector('[data-add-group]').addEventListener('click', () => this._openEntityGroupEditor(0, null, 'overview'));
    groups.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => this._roomAction(button)));
  }

  _renderSceneOrder(host, entries = null, changed = null, edit = null) {
    const scenes = entries || (Array.isArray(this._model.overview.scenes)
      ? this._model.overview.scenes
      : (this._model.overview.scenes ? [this._model.overview.scenes] : []));
    host.innerHTML = scenes.length ? `<div class="advanced"><strong>${this._l("Scene order")}</strong><ha-sortable>${scenes.map((scene, index) => `<div class="load-row"><span>${esc(scene.name || entityMeta(this._entities, this._entityId(scene))?.name || this._entityId(scene))}</span>${this._iconButton("mdi:arrow-up", "Move up", "scene-up", index, index === 0)}${this._iconButton("mdi:arrow-down", "Move down", "scene-down", index, index === scenes.length - 1)}${edit ? this._iconButton('mdi:pencil', 'Edit card', 'scene-edit', index) : ''}</div>`).join("")}</ha-sortable></div>` : "";
    host.querySelectorAll("[data-action^='scene-']").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.room);
      if (button.dataset.action === 'scene-edit') { edit(index); return; }
      if (changed) { changed(moveItem(scenes, index, index + (button.dataset.action === 'scene-up' ? -1 : 1))); return; }
      this._model.overview.scenes = moveItem(scenes, index, index + (button.dataset.action === "scene-up" ? -1 : 1));
      this._mountOverviewForm(host.parentElement); this._setDirty();
    }));
  }

  _renderRooms(host) {
    if (!this._model.rooms.length) {
      host.innerHTML = `<div class="empty">No rooms yet. Import a Home Assistant area or create one manually.</div>`;
      return;
    }
    host.innerHTML = `<ha-sortable handle-selector=".room-header">${this._model.rooms.map((room, roomIndex) => `
      <article class="room" draggable="true" data-room-drag="${roomIndex}">
        <ha-expansion-panel data-room-panel="${roomIndex}">
        <div class="room-header" slot="header">
          <ha-icon icon="${esc(room.icon || "mdi:sofa-outline")}"></ha-icon>
          <div class="room-title"><strong>${esc(room.name || `Room ${roomIndex + 1}`)}</strong><span>${esc(room.path || "Generated path")} · ${(room.entities || []).length} cards${room.columns ? ` · ${this._l("Columns")}: ${room.columns}` : ""}</span></div>
          <div class="row-actions">
            ${this._iconButton("mdi:arrow-up", "Move up", "room-up", roomIndex, roomIndex === 0)}
            ${this._iconButton("mdi:arrow-down", "Move down", "room-down", roomIndex, roomIndex === this._model.rooms.length - 1)}
            ${this._iconButton("mdi:pencil", "Edit room", "room-edit", roomIndex)}
            ${this._iconButton("mdi:content-copy", this._t("duplicate"), "room-duplicate", roomIndex)}
            ${this._iconButton("mdi:delete-outline", this._t("delete"), "room-delete", roomIndex)}
          </div>
        </div>
        <div class="room-body">
          <ha-sortable handle-selector=".entity-row">${this._entityList(room, roomIndex)}</ha-sortable>
          ${room.entities?.length ? "" : `<div class="empty">${this._t("noCards")}</div>`}
          <ha-button data-action="card-add" data-room="${roomIndex}">${this._t("addCard")}</ha-button>
        </div>
        </ha-expansion-panel>
      </article>`).join("")}</ha-sortable>`;
    host.querySelectorAll("[data-room-panel]").forEach((panel) => {
      const room = this._model.rooms[Number(panel.dataset.roomPanel)];
      const key = room.path || room.name;
      panel.expanded = !this._collapsedRooms.has(key);
      panel.addEventListener("expanded-changed", (event) => {
        if (event.target.expanded) this._collapsedRooms.delete(key); else this._collapsedRooms.add(key);
      });
    });
    host.querySelectorAll("[data-action]").forEach((element) =>
      element.addEventListener("click", (event) => { event.stopPropagation(); this._roomAction(element); }));
    this._bindDrag(host);
  }

  _entityRow(entity, roomIndex, cardIndex, kind = "room") {
    const container = this._container(kind, roomIndex);
    const metadata = entityMeta(this._entities, entity.entity_id);
    const card = this._catalog.cards.find((item) => item.id === entity.template) || cardForEntity(this._catalog, metadata || entity);
    const shortcutPage = entity.page && this._availablePages().find((page) => page.path === entity.page);
    const group = entity.template === 'hc_entity_group_card';
    const warning = group || card?.entity_optional ? '' : entity.page ? (shortcutPage ? "" : " · Missing page") : !metadata ? " · Missing" : metadata.state === "unavailable" ? " · Unavailable" : "";
    const title = (entity.name_key ? this._l(entity.name) : entity.name) || shortcutPage?.name || metadata?.name || entity.entity_id || entity.page || this._l(card?.label || 'Card');
    const detail = group ? `${this._l('Entity Group')} · ${this._l(({light:'Light', cover:'Cover', battery:'Battery', climate:'Climate'})[entity.entity_type] || entity.entity_type)} · ${new Set((entity.entities || []).map(member => this._entityId(member))).size} ${this._l('members')}` : entity.page ? `${entity.page} · ${this._l("Page shortcut")}` : `${entity.entity_id ? entity.entity_id + ' · ' : ''}${this._l(card?.label || entity.template || "Automatic")}`;
    return `<div class="entity-row" draggable="true" data-card-drag="${cardIndex}" data-room="${roomIndex}" data-kind="${kind}">
      <div class="entity-icon"><ha-icon icon="${esc(entity.icon || card?.icon || "mdi:help-circle-outline")}"></ha-icon></div>
      <div class="entity-main"><div class="entity-name">${esc(title)}</div><div class="entity-meta">${esc(detail)}${esc(warning)}</div></div>
      <div class="row-actions">
        ${this._iconButton("mdi:arrow-up", "Move up", "card-up", roomIndex, cardIndex === 0, cardIndex, kind)}
        ${this._iconButton("mdi:arrow-down", "Move down", "card-down", roomIndex, cardIndex === container.entities.length - 1, cardIndex, kind)}
        ${this._iconButton("mdi:pencil", "Edit card", "card-edit", roomIndex, false, cardIndex, kind)}
        ${this._iconButton("mdi:delete-outline", this._t("delete"), "card-delete", roomIndex, false, cardIndex, kind)}
      </div>
    </div>`;
  }

  _entityList(container, index, kind = "room") {
    const columns = Number.isInteger(container.columns) ? Math.min(6, Math.max(1, container.columns)) : null;
    const layout = columns ? ` data-columns="${columns}" style="--editor-columns:${columns}"` : "";
    return `<div class="entity-list"${layout}>${(container.entities || []).map((entity, cardIndex) => this._entityRow(entity, index, cardIndex, kind)).join("")}</div>`;
  }

  _iconButton(icon, label, action, room, disabled = false, card = null, kind = "room") {
    return `<ha-icon-button data-action="${action}" data-room="${room}" data-kind="${kind}" ${card == null ? "" : `data-card="${card}"`} label="${esc(this._l(label))}" ${disabled ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon></ha-icon-button>`;
  }

  _roomAction(element) {
    const action = element.dataset.action;
    const kind = element.dataset.kind || "room";
    const roomIndex = kind === 'page' ? element.dataset.room : Number(element.dataset.room);
    const cardIndex = element.dataset.card == null ? null : Number(element.dataset.card);
    if (action === "custom-edit") return this._openCustomPageDialog(roomIndex);
    if (action === "custom-delete" && confirm(`Delete ${this._container(kind, roomIndex).name}?`)) this._model.pages.custom.splice(roomIndex, 1);
    if (action === "custom-duplicate") {
      const copy = clone(this._container(kind, roomIndex));
      for (const item of copy.entities) if (item.template === 'hc_entity_group_card') item.id = newEntityGroupId();
      copy.name = `${copy.name} copy`; copy.path = slugify(copy.name);
      this._model.pages.custom.splice(roomIndex + 1, 0, copy);
    }
    if (action === "custom-up") this._model.pages.custom = moveItem(this._model.pages.custom, roomIndex, roomIndex - 1);
    if (action === "custom-down") this._model.pages.custom = moveItem(this._model.pages.custom, roomIndex, roomIndex + 1);
    if (action === "room-edit") return this._openRoomDialog(roomIndex);
    if (action === "room-delete" && confirm(`Delete ${this._model.rooms[roomIndex].name}?`)) this._model.rooms.splice(roomIndex, 1);
    if (action === "room-duplicate") {
      const copy = clone(this._model.rooms[roomIndex]);
      for (const item of copy.entities) if (item.template === 'hc_entity_group_card') item.id = newEntityGroupId();
      copy.name = `${copy.name} copy`; copy.path = `room-${slugify(copy.name)}`;
      this._model.rooms.splice(roomIndex + 1, 0, copy);
    }
    if (action === "room-up") this._model.rooms = moveItem(this._model.rooms, roomIndex, roomIndex - 1);
    if (action === "room-down") this._model.rooms = moveItem(this._model.rooms, roomIndex, roomIndex + 1);
    if (action === "card-add") return this._openCardGallery(roomIndex, kind);
    if (action === "card-edit") return this._openCardEditor(roomIndex, cardIndex, null, kind);
    if (action === "card-delete") this._editableContainer(kind, roomIndex).entities.splice(cardIndex, 1);
    if (action === "card-up") this._editableContainer(kind, roomIndex).entities = moveItem(this._editableContainer(kind, roomIndex).entities, cardIndex, cardIndex - 1);
    if (action === "card-down") this._editableContainer(kind, roomIndex).entities = moveItem(this._editableContainer(kind, roomIndex).entities, cardIndex, cardIndex + 1);
    this._setDirty(); this._renderVisual();
  }

  _container(kind, index) {
    if (kind === 'page') {
      const [pageIndex, sectionIndex = 0] = String(index).split(':').map(Number);
      return pageContainers(this._model.pages[pageIndex])[sectionIndex];
    }
    if (kind === 'overview') {
      const overview = this._model.overview;
      return { get entities() { return overview.entity_groups || []; }, set entities(value) { overview.entity_groups = value; } };
    }
    return kind === "custom" ? this._model.pages.custom[index] : this._model.rooms[index];
  }

  _editableContainer(kind, index) {
    return this._container(kind, index);
  }

  _editableRoom(index) { return this._editableContainer("room", index); }

  _bindDrag(host) {
    let dragged;
    host.addEventListener("dragstart", (event) => {
      const card = event.target.closest("[data-card-drag]");
      const room = event.target.closest("[data-room-drag]");
      dragged = card ? { type: "card", kind: card.dataset.kind || 'room', room: card.dataset.room, index: Number(card.dataset.cardDrag) } : room ? { type: "room", index: Number(room.dataset.roomDrag) } : null;
    });
    host.addEventListener("dragover", (event) => event.preventDefault());
    host.addEventListener("drop", (event) => {
      event.preventDefault();
      if (!dragged) return;
      const targetCard = event.target.closest("[data-card-drag]");
      const targetRoom = event.target.closest("[data-room-drag]");
      if (dragged.type === "room" && targetRoom) this._model.rooms = moveItem(this._model.rooms, dragged.index, Number(targetRoom.dataset.roomDrag));
      if (dragged.type === "card" && targetCard && targetCard.dataset.room === dragged.room && (targetCard.dataset.kind || 'room') === dragged.kind) {
        const room = this._editableContainer(dragged.kind, dragged.room);
        room.entities = moveItem(room.entities, dragged.index, Number(targetCard.dataset.cardDrag));
      }
      this._setDirty(); this._renderVisual();
    });
  }

  _renderPages(host) {
    host.innerHTML = `<div id="custom-pages"></div><h3 class="subsection-title">Guided pages</h3>${Object.entries(this._catalog.pages).map(([key, page]) => {
      const enabled = Object.hasOwn(this._model.pages, key);
      return `<ha-card class="page-card"><button class="page-toggle" data-page-toggle="${key}"><ha-icon icon="${page.icon}"></ha-icon><strong>${esc(this._l(page.label))}</strong><ha-icon icon="mdi:toggle-switch${enabled ? "" : "-off-outline"}"></ha-icon></button>${enabled ? `<div class="page-form" id="page-${key}"></div>` : ""}</ha-card>`;
    }).join("")}`;
    this._renderCustomPages(host.querySelector("#custom-pages"));
    host.querySelectorAll("[data-page-toggle]").forEach((button) => button.addEventListener("click", () => {
      const key = button.dataset.pageToggle;
      if (Object.hasOwn(this._model.pages, key)) delete this._model.pages[key]; else this._model.pages[key] = {};
      this._setDirty(); this._renderVisual();
    }));
    for (const key of Object.keys(this._catalog.pages)) {
      const pageHost = host.querySelector(`#page-${key}`);
      if (pageHost) this._mountPageForm(key, pageHost);
    }
  }

  _renderCustomPages(host) {
    const pages = this._model.pages.custom || [];
    host.innerHTML = `<h3 class="subsection-title">Custom pages</h3>${pages.length ? pages.map((page, index) => `
      <article class="room custom-page">
        <ha-expansion-panel data-custom-panel="${index}">
          <div class="room-header" slot="header">
            <ha-icon icon="${esc(page.icon || "mdi:file-outline")}"></ha-icon>
            <div class="room-title"><strong>${esc(page.name || `Page ${index + 1}`)}</strong><span>${esc(page.path)} · ${(page.entities || []).length} cards${page.columns ? ` · ${this._l("Columns")}: ${page.columns}` : ""}</span></div>
            <div class="row-actions">
              ${this._iconButton("mdi:arrow-up", "Move up", "custom-up", index, index === 0, null, "custom")}
              ${this._iconButton("mdi:arrow-down", "Move down", "custom-down", index, index === pages.length - 1, null, "custom")}
              ${this._iconButton("mdi:pencil", "Edit page", "custom-edit", index, false, null, "custom")}
              ${this._iconButton("mdi:content-copy", this._t("duplicate"), "custom-duplicate", index, false, null, "custom")}
              ${this._iconButton("mdi:delete-outline", this._t("delete"), "custom-delete", index, false, null, "custom")}
            </div>
          </div>
          <div class="room-body">
            ${this._entityList(page, index, "custom")}
            ${page.entities?.length ? "" : `<div class="empty">${this._t("noCards")}</div>`}
            <ha-button data-action="card-add" data-room="${index}" data-kind="custom">${this._t("addCard")}</ha-button>
          </div>
        </ha-expansion-panel>
      </article>`).join("") : `<div class="empty">No custom pages yet.</div>`}`;
    host.querySelectorAll("[data-custom-panel]").forEach((panel) => {
      const page = pages[Number(panel.dataset.customPanel)];
      const key = page.path || page.name;
      panel.expanded = !this._collapsedRooms.has(key);
      panel.addEventListener("expanded-changed", (event) => {
        if (event.target.expanded) this._collapsedRooms.delete(key); else this._collapsedRooms.add(key);
      });
    });
    host.querySelectorAll("[data-action]").forEach((element) =>
      element.addEventListener("click", (event) => { event.stopPropagation(); this._roomAction(element); }));
  }

  _mountPageForm(key, host) {
    const page = this._model.pages[key];
    const fields = this._catalog.pages[key]?.fields || [];
    const schema = fields.map((field) => field.kind === "entity"
      ? this._schema(field.key, this._l(field.label), { entity: { domain: field.domains || [], multiple: Boolean(field.multiple) } })
      : this._schema(field.key, this._l(field.label), { text: {} }));
    const data = Object.fromEntries(fields.map((field) => [field.key,
      field.kind === "entity"
        ? (field.multiple ? this._entityIds(page[field.key]) : this._entityId(page[field.key]))
        : field.kind === "number_list"
          ? (Array.isArray(page[field.key]) ? page[field.key].join(", ") : (field.default || []).join(", "))
          : page[field.key] ?? field.default ?? "",
    ]));
    this._mountForm(host, data, schema, (value) => {
      const current = this._model.pages[key];
      const next = { ...current };
      for (const field of fields) {
        if (field.kind === "entity") {
          next[field.key] = field.multiple
            ? mergeEntityValues(current[field.key], value[field.key] || [])
            : preserveEntityValue(current[field.key], value[field.key]);
        } else if (field.kind === "number_list") {
          next[field.key] = String(value[field.key] || "").split(",").map(Number).filter(Number.isFinite);
        } else {
          next[field.key] = value[field.key];
        }
      }
      this._model.pages[key] = next; this._setDirty();
      const formatKeys = key === "energy" ? ["house_power", "month_energy", "today_energy", "month_cost", "today_cost"] : key === "wallbox" ? ["charging_power_entity"] : [];
      if (key === "media" || formatKeys.some(field => this._entityId(current[field]) !== this._entityId(next[field]))) this._renderVisual();
    });
    if (key === "energy") { this._renderEnergyFormats(host, page); this._renderEnergyLoads(host, page); }
    if (key === "wallbox") this._renderEnergyFormats(host, page, ["charging_power_entity"]);
    if (key === "media") this._renderMediaPlayers(host, page);
  }

  _renderEnergyFormats(host, page, keys = ["house_power", "month_energy", "today_energy", "month_cost", "today_cost"]) {
    const fields = this._catalog.energy_fields || [];
    const box = document.createElement("div"); box.className = "advanced";
    box.innerHTML = keys.filter(key => this._entityId(page[key])).map(key => `<div class="load-row"><span>${esc(this._entityId(page[key]))}</span><ha-button data-format="${key}">${this._l("Reading format")}</ha-button></div>`).join("");
    box.querySelectorAll("[data-format]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.format;
      const original = typeof page[key] === "string" ? {entity_id: page[key]} : clone(page[key]);
      const data = Object.fromEntries(fields.map(field => [`var__${field.key}`, this._readVariable(original.variables, field)]));
      this._openFormDialog(this._l("Reading format"), data, fields.map(field => this._variableSchema(field, original.entity_id)), value => {
        const variables = {...(original.variables || {})};
        for (const field of fields) this._writeVariable(variables, field, value[`var__${field.key}`]);
        if (Object.keys(variables).length) original.variables = variables; else delete original.variables;
        page[key] = original; this._setDirty(); this._renderVisual();
      });
    }));
    host.append(box);
  }

  _renderEnergyLoads(host, page) {
    const box = document.createElement("div"); box.className = "advanced";
    box.innerHTML = `<div class="card-heading"><h3>Loads</h3><span class="grow"></span><ha-button>Add load</ha-button></div>${(page.loads || []).map((load, index) => `<div class="load-row"><span>${esc(load.name || this._entityId(load.power_entity) || `Load ${index + 1}`)}</span><ha-icon-button data-edit="${index}" label="Edit"><ha-icon icon="mdi:pencil"></ha-icon></ha-icon-button><ha-icon-button data-delete="${index}" label="Delete"><ha-icon icon="mdi:delete-outline"></ha-icon></ha-icon-button></div>`).join("")}`;
    box.querySelector("ha-button").addEventListener("click", () => this._openLoadDialog());
    box.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => this._openLoadDialog(Number(button.dataset.edit))));
    box.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => { page.loads.splice(Number(button.dataset.delete), 1); this._setDirty(); this._renderVisual(); }));
    host.append(box);
  }

  _renderMediaPlayers(host, page) {
    if (!Array.isArray(page.players)) return;
    const box = document.createElement("div"); box.className = "advanced";
    box.innerHTML = `<h3>Player options</h3>${page.players.map((player, index) => `<div class="load-row"><span>${esc(this._entityId(player))}</span><ha-button data-player="${index}">Apple TV options</ha-button></div>`).join("")}`;
    box.querySelectorAll("[data-player]").forEach((button) => button.addEventListener("click", () => this._openMediaDialog(Number(button.dataset.player))));
    host.append(box);
  }

  async _switchTab(tab) {
    if (!this._loaded || this._busy) return;
    this._requestedTab = tab;
    if (tab === this._tab && (tab === "visual" || this._monaco)) return;
    if (tab === "visual") {
      try {
        let parsed = JSON.parse(this._monaco.getValue());
        const legacy = parsed && this._catalog.config_version >= 2 && [undefined, 0, 1].includes(parsed.config_version);
        if (legacy) {
          const lifecycle = this._lifecycle;
          const payload = await this._hass.callWS({ type: 'marao_dashboard/config/get', config: this._monaco.getValue() });
          if (!this.isConnected || lifecycle !== this._lifecycle || this._requestedTab !== 'visual') return;
          parsed = JSON.parse(payload.config);
        }
        const errors = validateConfig(parsed, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog);
        if (errors.length) throw new Error(errors.map((error) => this._l(error)).join(" "));
        this._model = normalizeConfig(parsed);
        if (legacy) this._jsonDraft = null;
        this._renderVisual(); this._setDirty();
      } catch (error) {
        this._setStatus(`JSON: ${this._error(error)}`, "error"); return;
      }
    } else {
      try { await this._ensureMonaco(); }
      catch { return; }
      if (!this.isConnected || !this._monaco || this._requestedTab !== "json") return;
      this._setEditorSource(this._jsonDraft ?? this._source());
    }
    this._tab = tab;
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === tab)));
    this.shadowRoot.getElementById("visual-view").hidden = tab !== "visual";
    this.shadowRoot.getElementById("json-view").hidden = tab !== "json";
    if (tab === "json") requestAnimationFrame(() => this._monaco?.layout());
    this._setStatus("", "");
  }

  _ensureMonaco() {
    if (this._monaco) return Promise.resolve();
    if (this._jsonLoading) return this._jsonLoading;
    if (!this._loaded || !this.isConnected) return Promise.resolve();
    const lifecycle = this._lifecycle;
    const attempt = ++this._jsonAttempt;
    this._retryKind = null; this._setStatus(this._t("loadingJson"), "");
    const url = new URL(`./MaraoDashboardJsonEditor.js${PANEL_ASSET_VERSION}`, import.meta.url);
    if (attempt > 1) url.searchParams.set("retry", String(attempt));
    this._jsonLoading = Promise.resolve().then(async () => {
      try {
        const module = this._jsonModule ? Promise.resolve(this._jsonModule) : import(url.href).then(value => (this._jsonModule = value));
        if (!this._jsonStyled) {
          const css = new URL(`./MaraoDashboardJsonEditor.css${PANEL_ASSET_VERSION}`, import.meta.url);
          const style = document.createElement("link"); style.rel = "stylesheet"; style.href = css.href;
          const styled = new Promise((resolve, reject) => {
            style.onload = () => { this._jsonStyled = true; this._jsonCancel = null; resolve(); };
            style.onerror = () => { style.remove(); reject(new Error(this._t("jsonStylesFailed"))); };
            this._jsonCancel = () => { style.remove(); reject(new Error(this._t("jsonStylesFailed"))); };
          });
          this.shadowRoot.append(style);
          await Promise.all([module, styled]);
        }
        else await module;
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        const editor = await this._jsonModule.createEditor(this.shadowRoot.getElementById("monaco"), this._jsonDraft ?? this._source(), this._catalog, this._entities, this._t("jsonWorkerFailed"));
        if (!this.isConnected || lifecycle !== this._lifecycle) { editor.getModel()?.dispose(); editor.dispose(); return; }
        this._monaco = editor;
        this._setMonacoTheme();
        this._monaco.onDidChangeModelContent(() => {
          if (this._settingEditor) return;
          this._jsonDraft = this._monaco.getValue();
          this._dirty = this._jsonDraft.trim() !== this._savedSource.trim(); this._updateHeader();
        });
        this._setStatus("", "");
      } catch (error) {
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        this._retryKind = "json"; this._setStatus(this._t("jsonFailed") + this._error(error), "error");
        throw error;
      } finally {
        this._jsonCancel = null;
        this._jsonLoading = null;
        if (this.isConnected) this._updateHeader();
        if (lifecycle !== this._lifecycle && this.isConnected && this._requestedTab === "json") this._switchTab("json");
      }
    });
    this._updateHeader();
    return this._jsonLoading;
  }

  _setMonacoTheme() {
    if (!this._monaco) return;
    this._jsonModule.setTheme(this._hass?.themes?.darkMode);
    const typography = getComputedStyle(this.shadowRoot.getElementById("monaco"));
    this._monaco.updateOptions({ fontFamily: typography.fontFamily, fontSize: parseFloat(typography.fontSize), fontWeight: typography.fontWeight });
  }

  _setEditorSource(source) { if (!this._monaco || this._monaco.getValue() === source) return; this._settingEditor = true; this._monaco.setValue(source); this._settingEditor = false; }

  async _save() {
    if (this._busy || !this._loaded || this._jsonLoading) return;
    let source;
    try {
      source = this._tab === "json" ? this._monaco.getValue() : this._source();
      let parsed = JSON.parse(source);
      if (parsed && !Object.hasOwn(parsed, 'name') && Object.hasOwn(parsed, 'title') && Object.hasOwn(parsed, 'views')) {
        const preview = await this._hass.callWS({ type: 'marao_dashboard/config/get', config: source });
        parsed = JSON.parse(preview.config);
      }
      const errors = validateConfig(parsed, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog);
      if (errors.length) throw new Error(errors.map((error) => this._l(error)).join(" "));
      this._model = normalizeConfig(parsed);
    } catch (error) { this._setStatus(this._error(error), "error"); return; }
    this._setBusy(true); this._setStatus("Generating dashboard…", "");
    try {
      const result = await this._hass.callWS({ type: "marao_dashboard/config/generate", config: source });
      if (result.config) this._model = normalizeConfig(JSON.parse(result.config));
      this._jsonDraft = null;
      this._history = result.history; this._savedSource = this._source(); this._dirty = false;
      this.shadowRoot.getElementById("open-dashboard").href = result.dashboard_url;
      this._dashboardUrl = result.dashboard_url;
      this._setEditorSource(this._savedSource); this._renderVisual(); this._updateHeader();
      this._setStatus(result.config_changed ? "Generated. Restart Home Assistant once to load the changed dashboard registration." : "Dashboard generated successfully.", "success");
    } catch (error) { this._setStatus(this._error(error), "error"); }
    finally { this._setBusy(false); }
  }

  _discard() {
    if (this._dirty && !confirm("Discard all unsaved changes?")) return;
    this._load(true);
  }

  _openRoomDialog(index = null) {
    const existing = index == null ? null : this._model.rooms[index];
    const data = existing ? { name: existing.name, path: existing.path || "", icon: existing.icon || "", area: existing.area || "", columns: existing.columns ? String(existing.columns) : "auto" } : { area_import: "", area: "", name: "", path: "", icon: "mdi:sofa-outline", columns: "auto" };
    const schema = [];
    if (!existing) schema.push(this._schema("area_import", "Import Home Assistant area", { area: {} }));
    schema.push(this._schema("area", "Suggestion area", { area: {} }));
    schema.push(this._schema("name", "Room name", { text: {} }, true), this._schema("path", "Path", { text: {} }), this._schema("icon", "Icon", { icon: {} }), this._columnsSchema());
    this._openFormDialog(existing ? "Edit room" : "Add room", data, schema, (value) => {
      let room = existing ? { ...existing } : null;
      if (!existing && value.area_import) {
        const area = this._areas.find((item) => item.area_id === value.area_import);
        if (area) room = importAreaRoom(area, this._entities, this._catalog.supported_domains);
      }
      room ||= { entities: [] };
      if (value.area || !existing && value.area_import) room.area = value.area || value.area_import; else delete room.area;
      room.name = value.name || room.name || "Room";
      room.path = value.path || room.path || `room-${slugify(room.name)}`;
      room.icon = value.icon || room.icon || "mdi:sofa-outline";
      const columns = Number(value.columns);
      if (Number.isInteger(columns) && columns >= 1 && columns <= 6) room.columns = columns; else delete room.columns;
      if (index == null) this._model.rooms.push(room); else this._model.rooms[index] = room;
      this._setDirty(); this._renderVisual();
    });
  }

  _openCustomPageDialog(index = null) {
    const pages = this._model.pages.custom ||= [];
    const existing = index == null ? null : pages[index];
    const data = existing
      ? { name: existing.name, path: existing.path || "", icon: existing.icon || "", columns: existing.columns ? String(existing.columns) : "auto" }
      : { name: "", path: "", icon: "mdi:file-outline", columns: "auto" };
    this._openFormDialog(existing ? "Edit custom page" : this._t("addCustomPage"), data, [
      this._schema("name", "Page name", { text: {} }, true),
      this._schema("path", "Path", { text: {} }, true),
      this._schema("icon", "Icon", { icon: {} }),
      this._columnsSchema(),
    ], (value) => {
      const page = existing ? { ...existing } : { entities: [], __hadEntities: true };
      const oldPath = page.path;
      page.name = value.name || "Page";
      page.path = slugify(value.path || page.name);
      page.icon = value.icon || "mdi:file-outline";
      const columns = Number(value.columns);
      if (Number.isInteger(columns) && columns >= 1 && columns <= 6) page.columns = columns; else delete page.columns;
      if (index == null) pages.push(page); else pages[index] = page;
      if (oldPath && oldPath !== page.path) this._replacePagePath(oldPath, page.path);
      this._setDirty(); this._renderVisual();
    });
  }

  _replacePagePath(oldPath, newPath) {
    if (Array.isArray(this._model.navigation)) {
      this._model.navigation = this._model.navigation.map((entry) => {
        if (entry === oldPath) return newPath;
        if (entry?.page === oldPath) return { ...entry, page: newPath };
        return entry;
      });
    }
    for (const container of [...this._model.rooms, ...(this._model.pages.custom || [])]) {
      container.entities = (container.entities || []).map((item) => item.page === oldPath ? { ...item, page: newPath } : item);
    }
  }

  _columnsSchema() {
    return this._schema("columns", "Columns", { select: { mode: "dropdown", options: [
      { value: "auto", label: this._l("Automatic") },
      ...Array.from({ length: 6 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })),
    ] } });
  }

  _openCardGallery(roomIndex, kind = "room") {
    if (this._galleryDialog?.open) return;
    const dialog = this._dialog(this._t('chooseCard'));
    this._galleryDialog = dialog;
    const content = dialog.querySelector(".dialog-content");
    content.innerHTML = `<div class="add-tabs" role="tablist" aria-label="${esc(this._t('addCard'))}"><button type="button" role="tab" id="by-type" aria-controls="type-cards" aria-selected="true" tabindex="0">${this._t('byType')}</button><button type="button" role="tab" id="by-entity" aria-controls="entity-cards" aria-selected="false" tabindex="-1">${this._t('byEntity')}</button></div><section id="type-cards" role="tabpanel" aria-labelledby="by-type"><div class="gallery">${this._catalog.cards.map((card) => `<button type="button" class="gallery-card" data-card="${card.id}"><ha-icon icon="${card.icon}"></ha-icon><span><strong>${esc(this._l(card.label))}</strong><small>${esc(this._l(card.description))}</small></span></button>`).join("")}</div></section><section id="entity-cards" role="tabpanel" aria-labelledby="by-entity" hidden><label for="entity-search">${this._t('searchEntities')}</label><input type="search" id="entity-search" autocomplete="off"><div class="entity-results" aria-live="polite"></div></section><div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button></div>`;
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelectorAll("[data-card]").forEach((button) => button.addEventListener("click", () => { const cardId = button.dataset.card; this._closeDialog(dialog); this._openCardEditor(roomIndex, null, cardId, kind); }));
    const search = content.querySelector('#entity-search'), results = content.querySelector('.entity-results');
    let loading = true, failure = '';
    const renderResults = () => {
      if (loading) { results.textContent = this._t('metadataLoading'); return; }
      if (failure) {
        results.innerHTML = `<p role="alert">${esc(this._t('metadataFailed') + failure)}</p><ha-button data-retry>${this._t('retry')}</ha-button>`;
        results.querySelector('[data-retry]').addEventListener('click', refresh);
        return;
      }
      const container = { ...this._container(kind, roomIndex), ...(kind === 'page' ? { area: this._model.pages[Number(String(roomIndex).split(':')[0])].area } : {}) }, query = search.value.trim();
      const areaSuggestions = kind === 'room' || kind === 'page' && Boolean(container.area);
      const candidates = !query && areaSuggestions && !this._areas.some(area => area.area_id === container.area) ? [] : entityCandidates(this._catalog, this._entities, areaSuggestions ? container : { ...container, area: undefined }, query);
      const empty = query ? 'noResults' : !areaSuggestions ? 'globalSearch' : !container.area ? 'noArea' : !this._areas.some(area => area.area_id === container.area) ? 'missingArea' : 'noSuggestions';
      results.innerHTML = `${!query && areaSuggestions ? `<h3>${this._t('suggestions')}</h3>` : ''}${candidates.length ? candidates.map(entity => `<button type="button" class="gallery-card" data-entity="${esc(entity.entity_id)}" ${entity.added ? 'disabled' : ''}><ha-icon icon="${esc(entity.card.icon)}"></ha-icon><span><strong>${esc(entity.name || entity.entity_id)}</strong><small>${esc(entity.entity_id)}</small><small>${esc(this._l(entity.card.label))}${entity.added ? ' · ' + this._t('alreadyAdded') : ''}</small>${['unknown', 'unavailable'].includes(entity.state) ? `<small>${this._t(entity.state)}</small>` : ''}</span></button>`).join('') : `<p>${this._t(empty)}</p>`}`;
      results.querySelectorAll('[data-entity]').forEach(button => button.addEventListener('click', () => {
        const entity = candidates.find(item => item.entity_id === button.dataset.entity);
        if (configuredEntityIds(this._container(kind, roomIndex)).has(entity.entity_id)) { renderResults(); return; }
        this._closeDialog(dialog); this._openCardEditor(roomIndex, null, entity.card.id, kind, entity.entity_id);
      }));
    };
    const refresh = async () => {
      loading = true; failure = ''; renderResults();
      try { await this._refreshEditorMetadata(); }
      catch (error) { failure = this._error(error); }
      if (!dialog.isConnected || !dialog.open) return;
      loading = false; renderResults();
    };
    search.addEventListener('input', renderResults);
    for (const [index, tab] of [...content.querySelectorAll('[role="tab"]')].entries()) {
      const select = () => {
        content.querySelectorAll('[role="tab"]').forEach(button => { button.setAttribute('aria-selected', String(button === tab)); button.tabIndex = button === tab ? 0 : -1; });
        content.querySelector('#type-cards').hidden = index !== 0; content.querySelector('#entity-cards').hidden = index !== 1;
      };
      tab.addEventListener('click', select);
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = content.querySelectorAll('[role="tab"]')[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index]; next.click(); next.focus();
      });
    }
    refresh();
  }

  _refreshEditorMetadata() {
    if (this._metadataLoading) return this._metadataLoading;
    const lifecycle = this._lifecycle;
    this._metadataLoading = Promise.resolve().then(async () => {
      try {
        const { editor, page_templates } = await this._hass.callWS({ type: 'marao_dashboard/config/get' });
        if (!Array.isArray(editor?.entities) || !Array.isArray(editor?.areas) || !Array.isArray(editor?.catalog?.cards)) throw new Error(this._t('metadataFailed'));
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        this._entities = editor.entities; this._areas = editor.areas; this._catalog = editor.catalog;
        if (page_templates) this._pageTemplates = page_templates;
      } finally { this._metadataLoading = null; }
    });
    return this._metadataLoading;
  }

  _openCardEditor(roomIndex, cardIndex = null, selectedCardId = null, kind = "room", prefilledEntity = null, memberOptions = null) {
    const existing = memberOptions ? memberOptions.entity : cardIndex == null ? null : this._editableContainer(kind, roomIndex).entities[cardIndex];
    if (selectedCardId === 'hc_entity_group_card' || existing?.template === 'hc_entity_group_card') return this._openEntityGroupEditor(roomIndex, cardIndex, kind);
    const metadata = entityMeta(this._entities, existing?.entity_id);
    const selected = this._catalog.cards.find((card) => card.id === (selectedCardId || existing?.template || (existing?.page ? "hc_navigation_card" : ""))) || cardForEntity(this._catalog, metadata || existing) || this._catalog.cards[0];
    const shortcut = Boolean(selected.page_shortcut);
    const dialog = this._dialog(`${this._t(existing ? 'edit' : 'add')} ${this._l(selected.label)}`);
    const data = shortcut
      ? { page: existing?.page || "", entity_id: existing?.entity_id || '', name: existing?.name || "", icon: existing?.icon || selected.icon }
      : { entity_id: existing?.entity_id || prefilledEntity || "", name: existing?.name || "", icon: existing?.icon || "" };
    let collection = clone(existing?.entities || []);
    if (selected.scene_collection) data.scene_entities = this._entityIds(collection);
    for (const field of this._expandedFields(selected.variables)) data[`var__${field.key}`] = this._readVariable(existing?.variables, field);
    const content = dialog.querySelector(".dialog-content");
    const variables = this._expandedFields(selected.variables);
    const basic = variables.filter((field) => !field.advanced);
    const advanced = variables.filter((field) => field.advanced);
    content.innerHTML = `<div id="card-form"></div><div id="summary" class="summary"></div>${selected.scene_collection ? '<div id="scene-order"></div>' : ''}${selected.id === 'hc_media_card' ? `<ha-button data-media-options>${this._l('Apple TV options')}</ha-button>` : ''}${advanced.length ? `<ha-expansion-panel id="advanced-panel" outlined><div slot="header">${this._t("advanced")}</div><div id="advanced-form" class="advanced-form"></div></ha-expansion-panel>` : ""}<div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button><ha-button data-save appearance="filled">${existing ? this._t("update") : this._t("create")}</ha-button></div>`;
    const renderCollection = () => {
      if (!selected.scene_collection) return;
      this._renderSceneOrder(content.querySelector('#scene-order'), collection, next => {
        collection = next; data.scene_entities = this._entityIds(next); content.querySelector('#card-form ha-form').data = { ...data }; renderCollection();
      }, index => {
        const member = typeof collection[index] === 'string' ? { entity_id: collection[index] } : collection[index];
        this._openFormDialog('Edit card', { name: member.name || '', icon: member.icon || '' }, [this._schema('name', 'Display name', { text: {} }), this._schema('icon', 'Icon', { icon: {} })], value => {
          const next = { ...member };
          for (const key of ['name', 'icon']) if (value[key]) next[key] = value[key]; else delete next[key];
          collection[index] = next; renderCollection();
        });
      });
    };
    let appleTV = clone(existing?.apple_tv);
    if (selected.id === 'hc_media_card') content.querySelector('[data-media-options]').addEventListener('click', () => this._openMediaOptions({ entity_id: data.entity_id, apple_tv: appleTV }, value => { appleTV = value; }));
    const changed = (value) => {
      Object.assign(data, value);
      if (selected.scene_collection) { collection = mergeEntityValues(collection, data.scene_entities || []); renderCollection(); }
      this._renderSummary(content.querySelector("#summary"), shortcut ? data.page : data.entity_id, selected, roomIndex, cardIndex, kind); this._refreshEnergyFields(content, selected.id === "hc_switch_card" ? data.var__power_entity : data.entity_id);
    };
    const pageOptions = this._availablePages().filter((page) => kind !== "custom" || page.path !== this._container(kind, roomIndex).path).map((page) => ({ value: page.path, label: page.name }));
    const schema = [
      ...(shortcut ? [this._schema("page", "Target page", { select: { mode: "dropdown", options: pageOptions } }, true)] : []),
      ...(!selected.entity_optional && !shortcut || selected.id === 'hc_room_card' ? [this._schema("entity_id", selected.id === 'hc_room_card' ? 'Primary source' : 'Entity', { entity: { domain: selected.domains } }, !selected.entity_optional)] : []),
      this._schema("name", "Display name", { text: {} }),
      this._schema("icon", "Icon", { icon: {} }),
      ...(selected.scene_collection ? [this._schema('scene_entities', 'Scenes', { entity: { domain: ['scene', 'switch', 'input_boolean'], multiple: true } })] : []),
      ...basic.map((field) => this._variableSchema(field, selected.id === "hc_switch_card" ? data.var__power_entity : data.entity_id)),
    ];
    this._mountForm(content.querySelector("#card-form"), data, schema, changed);
    if (advanced.length) this._mountForm(content.querySelector("#advanced-form"), data, advanced.map((field) => this._variableSchema(field)), changed);
    this._renderSummary(content.querySelector("#summary"), shortcut ? data.page : data.entity_id, selected, roomIndex, cardIndex, kind);
    renderCollection();
    content.querySelector("[data-close]").addEventListener("click", () => { this._closeDialog(dialog); memberOptions?.cancel(); });
    content.querySelector("[data-save]").addEventListener("click", () => {
        const target = shortcut ? data.page : data.entity_id;
        if (!target && (shortcut || !selected.entity_optional)) { this._renderSummary(content.querySelector("#summary"), "", selected, roomIndex, cardIndex, kind, shortcut ? "Select a page first." : "Select an entity first."); return; }
        if (prefilledEntity && configuredEntityIds(this._container(kind, roomIndex)).has(target)) {
          this._renderSummary(content.querySelector("#summary"), target, selected, roomIndex, cardIndex, kind, this._t('alreadyAdded')); return;
        }
        const entity = existing ? { ...existing } : { __simple: false };
        entity.template = selected.id; entity.__simple = false;
        if (shortcut) { entity.page = data.page; if (selected.id === 'hc_room_card' && data.entity_id) entity.entity_id = data.entity_id; else delete entity.entity_id; }
        else { if (data.entity_id) entity.entity_id = data.entity_id; else delete entity.entity_id; delete entity.page; }
        if (kind === 'page' && !entity.id) entity.id = newEntityGroupId().replace('group-', 'card-');
        if (data.name !== existing?.name) delete entity.name_key;
        if (selected.scene_collection) entity.entities = collection;
        if (selected.id === 'hc_media_card' && appleTV !== undefined) entity.apple_tv = appleTV;
        if (data.name) entity.name = data.name; else delete entity.name;
        if (data.icon) entity.icon = data.icon; else delete entity.icon;
        const variablesObject = { ...(existing?.variables || {}) };
        try { for (const field of this._expandedFields(selected.variables)) this._writeVariable(variablesObject, field, data[`var__${field.key}`]); }
        catch (error) { this._renderSummary(content.querySelector('#summary'), target, selected, roomIndex, cardIndex, kind, this._error(error)); return; }
        if (Object.keys(variablesObject).length) entity.variables = variablesObject; else delete entity.variables;
        if (memberOptions) { delete entity.__simple; this._closeDialog(dialog); memberOptions.save(entity); return; }
        const container = this._editableContainer(kind, roomIndex);
        if (cardIndex == null) container.entities.push(entity); else container.entities[cardIndex] = entity;
        this._closeDialog(dialog); this._setDirty(); this._renderVisual();
    });
  }

  _openEntityGroupEditor(roomIndex, cardIndex = null, kind = 'room', draft = null) {
    const existing = draft || (cardIndex == null ? null : this._container(kind, roomIndex).entities[cardIndex]);
    const group = clone(existing || { template: 'hc_entity_group_card', id: newEntityGroupId(), entities: [] });
    const data = { name: group.name || this._l('Entity Group'), icon: group.icon || '', entity_type: group.entity_type || 'light',
      popup_filter: group.popup_filter || (group.entity_type && group.entity_type !== 'light' ? 'all' : 'active') };
    let members = clone(group.entities), loading = !draft, failure = '', filterEdited = Boolean(existing);
    const dialog = this._dialog(this._l('Entity Group')), content = dialog.querySelector('.dialog-content');
    content.innerHTML = `<div id="group-form"></div><h3>${this._l('Members')}</h3><div id="group-members"></div><label for="entity-search">${this._t('searchEntities')}</label><input type="search" id="entity-search" autocomplete="off"><div id="group-results" class="entity-results" aria-live="polite"></div><p id="group-error" role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t('cancel')}</ha-button><ha-button data-save appearance="filled">${this._t(cardIndex == null ? 'create' : 'update')}</ha-button></div>`;
    const search = content.querySelector('#entity-search'), results = content.querySelector('#group-results');
    const current = () => ({ ...group, ...data, entities: members });
    const render = () => {
      const host = content.querySelector('#group-members');
      host.innerHTML = members.map((member, index) => {
        const entity_id = this._entityId(member), metadata = entityMeta(this._entities, entity_id);
        const source = typeof member === 'string' ? { entity_id } : member;
        const compatible = entityGroupMemberCompatible(data.entity_type, source, metadata, ['overview', 'page'].includes(kind) && group.id === 'overview-maintenance' && entity_id.includes('battery'));
        const warning = !compatible ? this._l('Incompatible member') : !metadata ? this._l('Missing entity') : ['unknown', 'unavailable'].includes(metadata.state) ? this._t(metadata.state) : '';
        return `<div class="entity-row"><div class="entity-icon"><ha-icon icon="${esc(source.icon || metadata?.icon || 'mdi:view-list')}"></ha-icon></div><div class="entity-main"><div class="entity-name">${esc(source.name || metadata?.name || entity_id)}</div><div class="entity-meta">${esc(entity_id)}${warning ? ' · ' + esc(warning) : ''}</div></div><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'member-up', index, index === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'member-down', index, index === members.length - 1)}${this._iconButton('mdi:pencil', this._t('edit'), 'member-edit', index)}${this._iconButton('mdi:delete-outline', this._t('delete'), 'member-delete', index)}</div></div>`;
      }).join('');
      host.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
        const index = Number(button.dataset.room), action = button.dataset.action;
        if (action === 'member-edit') {
          const retained = current();
          this._closeDialog(dialog);
          this._openCardEditor(roomIndex, null, null, kind, null, {
            entity: flattenEntities([members[index]])[0],
            save: value => { retained.entities[index] = value; this._openEntityGroupEditor(roomIndex, cardIndex, kind, retained); },
            cancel: () => this._openEntityGroupEditor(roomIndex, cardIndex, kind, retained),
          });
          return;
        }
        if (action === 'member-delete') members.splice(index, 1);
        else members = moveItem(members, index, index + (action === 'member-up' ? -1 : 1));
        render();
      }));
      if (loading) { results.textContent = this._t('metadataLoading'); return; }
      if (failure) {
        results.innerHTML = `<p role="alert">${esc(this._t('metadataFailed') + failure)}</p><ha-button data-retry>${this._t('retry')}</ha-button>`;
        results.querySelector('[data-retry]').addEventListener('click', refresh); return;
      }
      const candidates = entityCandidates(this._catalog, this._entities, current(), search.value);
      results.innerHTML = candidates.length ? candidates.map(entity => `<button type="button" class="gallery-card" data-entity="${esc(entity.entity_id)}" ${entity.added ? 'disabled' : ''}><ha-icon icon="${esc(entity.card.icon)}"></ha-icon><span><strong>${esc(entity.name || entity.entity_id)}</strong><small>${esc(entity.entity_id)}${entity.added ? ' · ' + this._t('alreadyAdded') : ''}${['unknown','unavailable'].includes(entity.state) ? ' · ' + this._t(entity.state) : ''}</small></span></button>`).join('') : `<p>${this._t('noResults')}</p>`;
      results.querySelectorAll('[data-entity]').forEach(button => button.addEventListener('click', () => {
        if (!members.some(member => this._entityId(member) === button.dataset.entity)) members.push(button.dataset.entity);
        render();
      }));
    };
    const refresh = async () => {
      loading = true; failure = ''; render();
      try { await this._refreshEditorMetadata(); } catch (error) { failure = this._error(error); }
      if (!dialog.isConnected || !dialog.open) return;
      loading = false; render();
    };
    this._mountForm(content.querySelector('#group-form'), data, [
      this._schema('name', 'Group name', { text: {} }, true), this._schema('icon', 'Icon', { icon: {} }),
      this._schema('entity_type', 'Entity type', { select: { mode: 'dropdown', options: [['light','Light'],['cover','Cover'],['battery','Battery'],['climate','Climate']].map(([value,label]) => ({ value, label: this._l(label) })) } }, true),
      this._schema('popup_filter', 'Popup filter', { select: { mode: 'dropdown', options: [['all','All entities'],['active','Active only']].map(([value,label]) => ({ value, label: this._l(label) })) } }, true),
    ], value => {
      filterEdited ||= value.popup_filter !== data.popup_filter;
      if (value.entity_type !== data.entity_type && !filterEdited) value.popup_filter = value.entity_type === 'light' ? 'active' : 'all';
      Object.assign(data, value); content.querySelector('#group-form ha-form').data = { ...data }; render();
    });
    search.addEventListener('input', render);
    content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog));
    content.querySelector('[data-save]').addEventListener('click', () => {
      const value = current();
      const validation = kind === 'page' ? { config_version: 2, name: this._model.name, landing_page: 'group', pages: [{ name: 'Group', path: 'group', entities: [value] }] } : kind === 'overview' ? { name: this._model.name, rooms: [], overview: { entity_groups: [value] } }
        : { name: this._model.name, rooms: [{ name: 'Group', entities: [value] }] };
      const errors = validateConfig(validation, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog);
      if (errors.length) { content.querySelector('#group-error').textContent = errors.map(error => this._l(error)).join(' '); return; }
      const container = this._editableContainer(kind, roomIndex);
      if (cardIndex == null) container.entities = [...container.entities, value]; else container.entities[cardIndex] = value;
      this._closeDialog(dialog); this._setDirty(); this._renderVisual();
    });
    if (draft) render(); else refresh();
  }

  _renderSummary(host, target, card, roomIndex, cardIndex, kind = "room", error = "") {
    const container = this._container(kind, roomIndex);
    if (card.entity_optional && !card.page_shortcut) {
      host.innerHTML = error ? `<strong style="color:var(--error-color)">${esc(this._l(error))}</strong>` : `<strong>${esc(this._l(card.label))}</strong><span>${esc(this._l(card.description))}</span>`;
      return;
    }
    if (card.page_shortcut) {
      const page = this._availablePages().find((item) => item.path === target);
      const duplicate = container.entities.some((item, index) => item.page === target && index !== cardIndex);
      host.innerHTML = error ? `<strong style="color:var(--error-color)">${esc(this._l(error))}</strong>` : !target ? `<strong>${esc(this._l("Choose a target page"))}</strong><span>${esc(this._l("The shortcut will navigate to another generated page."))}</span>` : !page ? `<strong>${esc(target)}</strong><span style="color:var(--warning-color)">${esc(this._l("This page is not currently generated."))}</span>` : `<strong>${esc(page.name)}</strong><span>${esc(page.path)}${duplicate ? " · " + this._l("Already linked from this page") : ""}</span>`;
      return;
    }
    const metadata = entityMeta(this._entities, target);
    const duplicate = configuredEntityIds({ ...container, entities: container.entities.filter((_item, index) => index !== cardIndex) }).has(target);
    const area = metadata?.area_id ? metadata.area_name : metadata?.device_area_name;
    host.innerHTML = error ? `<strong style="color:var(--error-color)">${esc(this._l(error))}</strong>` : !target ? `<strong>${esc(this._l("Choose a compatible entity"))} · ${esc(this._l(card.label))}</strong><span>${esc(this._l("Search by friendly name or entity ID."))}</span>` : !metadata ? `<strong>${esc(target)}</strong><span style="color:var(--warning-color)">${esc(this._l("This entity is not currently available in Home Assistant."))}</span>` : `<strong>${esc(metadata.name || metadata.entity_id)}</strong><span>${esc(this._l(metadata.state || "unknown"))} · ${esc(area || this._l("No area"))} · ${esc(this._l(card.label))}${duplicate ? " · " + this._l("Already added to this page") : ""}</span>`;
  }

  _openLoadDialog(index = null) {
    const page = this._model.pages.energy;
    const load = index == null ? {} : page.loads[index];
    const data = { power_entity: this._entityId(load.power_entity), toggle_entity: load.toggle_entity || "", name: load.name || "", icon: load.icon || "", template: load.template || (load.toggle_entity ? "hc_toggle_graph_card" : "hc_graph_card") };
    const fields = this._catalog.energy_fields || [];
    const options = {...(load.power_entity?.variables || {}), ...(load.variables || {})};
    for (const field of fields) data[`var__${field.key}`] = this._readVariable(options, field);
    this._openFormDialog(index == null ? "Add energy load" : "Edit energy load", data, [
      this._schema("power_entity", "Power entity", { entity: { domain: ["sensor"] } }, true),
      this._schema("toggle_entity", "Related toggle", { entity: { domain: ["switch", "input_boolean"] } }),
      this._schema("name", "Name", { text: {} }), this._schema("icon", "Icon", { icon: {} }),
      this._schema("template", "Card", { select: { mode: "dropdown", options: [{ value: "hc_graph_card", label: "Graph" }, { value: "hc_toggle_graph_card", label: "Toggle graph" }] } }),
      ...fields.map(field => this._variableSchema(field, data.power_entity)),
    ], (value) => {
      const next = { ...load };
      for (const key of ["toggle_entity", "name", "icon", "template"]) next[key] = value[key];
      next.power_entity = preserveEntityValue(load.power_entity, value.power_entity);
      const variables = {...(load.variables || {})};
      for (const field of fields) this._writeVariable(variables, field, value[`var__${field.key}`]);
      // The load owns formatting; remove only these overrides from a nested source.
      if (next.power_entity?.variables) {
        next.power_entity = clone(next.power_entity);
        for (const field of fields) delete next.power_entity.variables[field.key];
        if (!Object.keys(next.power_entity.variables).length) delete next.power_entity.variables;
      }
      if (Object.keys(variables).length) next.variables = variables; else delete next.variables;
      if (!next.toggle_entity) delete next.toggle_entity;
      page.loads ||= []; if (index == null) page.loads.push(next); else page.loads[index] = next;
      this._setDirty(); this._renderVisual();
    });
  }

  _openMediaDialog(index) {
    const page = this._model.pages.media;
    const values = Array.isArray(page.players) ? page.players : (page.players ? [page.players] : []);
    page.players = values;
    const player = typeof values[index] === "string" ? { entity_id: values[index] } : clone(values[index]);
    const options = player.apple_tv && typeof player.apple_tv === "object" ? player.apple_tv : {};
    const data = { remote_entity: options.remote_entity || "", volume_remote_entity: options.volume_remote_entity || "", apps: (options.apps || []).map((app) => `${app.name || app.source}|${app.source}|${app.icon || ""}`).join("\n") };
    this._openFormDialog("Apple TV options", data, [
      this._schema("remote_entity", "Remote entity", { entity: { domain: ["remote"] } }),
      this._schema("volume_remote_entity", "Volume remote", { entity: { domain: ["remote", "media_player"] } }),
      this._schema("apps", "Apps — Name | Source | Icon", { text: { multiline: true } }),
    ], (value) => {
      player.apple_tv = { remote_entity: value.remote_entity || undefined, volume_remote_entity: value.volume_remote_entity || undefined, apps: String(value.apps || "").split("\n").map((line) => line.split("|").map((part) => part.trim())).filter((parts) => parts[1]).map(([name, source, icon]) => ({ name: name || source, source, ...(icon ? { icon } : {}) })) };
      values[index] = player; this._setDirty(); this._renderVisual();
    });
  }

  _openMediaOptions(player, save) {
    const original = player.apple_tv && typeof player.apple_tv === 'object' ? clone(player.apple_tv) : {};
    const data = { enabled: player.apple_tv !== false && (Boolean(player.apple_tv) || /apple[_ ]?tv/i.test(player.entity_id || '')),
      remote_entity: original.remote_entity || '', volume_remote_entity: original.volume_remote_entity || '' };
    let apps = clone(original.apps || []);
    const dialog = this._dialog(this._l('Apple TV options')), content = dialog.querySelector('.dialog-content');
    content.innerHTML = `<div id="media-form"></div><h3>${this._l('Apps')}</h3><div id="app-list"></div><ha-button data-add-app>${this._l('Add app')}</ha-button><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t('cancel')}</ha-button><ha-button data-save appearance="filled">${this._t('update')}</ha-button></div>`;
    const editApp = index => {
      const existing = index == null ? {} : apps[index];
      this._openFormDialog(index == null ? 'Add app' : 'Edit app', { name: existing.name || '', source: existing.source || '', icon: existing.icon || '' }, [
        this._schema('name', 'Display name', { text: {} }), this._schema('source', 'App source', { text: {} }, true), this._schema('icon', 'Icon', { icon: {} }),
      ], value => {
        if (!String(value.source || '').trim()) throw new Error('Media app requires an explicit source.');
        const next = { ...existing, source: value.source };
        for (const key of ['name', 'icon']) if (value[key]) next[key] = value[key]; else delete next[key];
        if (index == null) apps.push(next); else apps[index] = next;
        render();
      });
    };
    const render = () => {
      const list = content.querySelector('#app-list');
      list.innerHTML = apps.map((app, index) => `<div class="entity-row"><div class="entity-icon"><ha-icon icon="${esc(app.icon || 'mdi:play-box-outline')}"></ha-icon></div><div class="entity-main"><div class="entity-name">${esc(app.name || app.source)}</div><div class="entity-meta">${esc(app.source)}</div></div><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'app-up', index, index === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'app-down', index, index === apps.length - 1)}${this._iconButton('mdi:pencil', 'Edit app', 'app-edit', index)}${this._iconButton('mdi:delete-outline', this._t('delete'), 'app-delete', index)}</div></div>`).join('');
      list.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
        const index = Number(button.dataset.room), action = button.dataset.action;
        if (action === 'app-edit') { editApp(index); return; }
        if (action === 'app-delete') apps.splice(index, 1); else apps = moveItem(apps, index, index + (action === 'app-up' ? -1 : 1));
        render();
      }));
    };
    this._mountForm(content.querySelector('#media-form'), data, [this._schema('enabled', 'Apple TV controls', { boolean: {} }),
      this._schema('remote_entity', 'Remote entity', { entity: { domain: ['remote'] } }),
      this._schema('volume_remote_entity', 'Volume remote', { entity: { domain: ['remote', 'media_player'] } })], value => Object.assign(data, value));
    content.querySelector('[data-add-app]').addEventListener('click', () => editApp(null));
    content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog));
    content.querySelector('[data-save]').addEventListener('click', () => {
      try {
        const value = { ...original, apps };
        for (const key of ['remote_entity', 'volume_remote_entity']) if (data[key]) value[key] = data[key]; else delete value[key];
        save(data.enabled ? value : false); this._closeDialog(dialog);
      } catch (error) { content.querySelector('[data-error]').textContent = this._error(error); }
    });
    render();
  }

  _openHistory() {
    const dialog = this._dialog(this._t("history")); const content = dialog.querySelector(".dialog-content");
    content.innerHTML = `${this._history?.length ? this._history.map((item) => `<div class="history-row"><div><strong>${esc(item.name || item.slug)}</strong><br><small>${new Date(item.created_at).toLocaleString()} · ${esc(item.reason)}</small></div><ha-button data-version="${item.version}">${this._t("restore")}</ha-button></div>`).join("") : `<div class="empty">No generated versions yet.</div>`}<div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button></div>`;
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelectorAll("[data-version]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("Restore this version? The current version will be saved first.")) return;
      try { this._setBusy(true); await this._hass.callWS({ type: "marao_dashboard/history/restore", version: button.dataset.version }); this._closeDialog(dialog); this._setBusy(false); await this._load(true); }
      catch (error) { this._setStatus(this._error(error), "error"); }
      finally { this._setBusy(false); }
    }));
  }

  _openFormDialog(title, initial, schema, save, action = this._t('update')) {
    const dialog = this._dialog(title); const content = dialog.querySelector(".dialog-content"); const data = clone(initial);
    content.innerHTML = `<div id="form"></div><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button><ha-button data-save appearance="filled">${esc(action)}</ha-button></div>`;
    this._mountForm(content.querySelector("#form"), data, schema, (value) => { Object.assign(data, value); if (Object.hasOwn(data, "power_entity")) this._refreshEnergyFields(content, data.power_entity); });
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelector("[data-save]").addEventListener("click", () => {
      try { save(data); this._closeDialog(dialog); }
      catch (error) { content.querySelector('[data-error]').textContent = this._error(error); }
    });
  }

  _dialog(title) {
    const dialog = document.createElement("ha-dialog"); dialog.open = true; dialog.heading = this._l(title); dialog.headerTitle = this._l(title);
    dialog.innerHTML = `<div class="dialog-content"></div>`; dialog.addEventListener("closed", () => dialog.remove());
    this.shadowRoot.append(dialog);
    this._containForm(dialog).catch((error) => this._setStatus(this._error(error), "error"));
    return dialog;
  }
  _closeDialog(dialog) { dialog.open = false; }

  _schema(name, label, selector, required = false) { return { name, label: this._l(label), required, selector }; }
  _mountForm(host, data, schema, changed) {
    const form = document.createElement("ha-form"); form.hass = this._hass; form.data = data; form.schema = schema;
    form.computeLabel = (item) => item.label || item.name; form.computeHelper = (item) => item.helper || "";
    const fit = () => this._containForm(form).catch((error) => this._setStatus(this._error(error), "error"));
    form.addEventListener("value-changed", (event) => { changed(event.detail.value); fit(); });
    host.replaceChildren(form); fit();
  }

  async _containForm(element) {
    if (element.localName.startsWith("ha-")) {
      await customElements.whenDefined(element.localName);
      await element.updateComplete;
    }
    if (!element.isConnected) return;
    if (element.localName === 'ha-selector-boolean' && !element.shadowRoot.querySelector('style[data-marao-boolean]')) {
      const style = document.createElement('style'); style.dataset.maraoBoolean = '';
      style.textContent = '.primary,.secondary{line-height:1.35;overflow-wrap:anywhere}[slot="label"]{min-width:0}ha-switch::part(base){min-width:48px;min-height:48px}';
      element.shadowRoot.append(style);
    }
    if (element.localName === 'ha-formfield' && !element.shadowRoot.querySelector('style[data-marao-formfield]')) {
      const style = document.createElement('style'); style.dataset.maraoFormfield = '';
      style.textContent = '.mdc-form-field{min-height:48px;gap:12px}.mdc-label{min-width:0;flex:1;line-height:1.35}';
      element.shadowRoot.append(style);
    }
    if (element.localName === "ha-dialog-header" && !element.shadowRoot.querySelector('style[data-marao-dialog]')) {
      const style = document.createElement('style'); style.dataset.maraoDialog = '';
      style.textContent = ':host .header-content{white-space:normal;overflow-wrap:anywhere}:host .header-title{height:auto}';
      element.shadowRoot.append(style);
    }
    if (element.localName === "ha-dropdown-item") element.style.minHeight = "48px";
    // Native multiple-entity pickers otherwise retain the selected name's minimum width.
    if (element.localName === "ha-entity-picker") { element.style.minWidth = "0"; element.style.maxWidth = "100%"; }
    if (element.localName === "ha-icon-button") element.style.setProperty("--ha-icon-button-size", "48px");
    if (element.localName === 'ha-switch') { element.style.minWidth = '48px'; element.style.minHeight = '48px'; }
    if (element.localName === "ha-picker-field") { element.style.display = "block"; element.style.container = "marao-picker / inline-size"; }
    if (element.localName === "ha-combo-box-item" && element.getRootNode().host?.localName === "ha-picker-field") {
      // Native selected rows have zero padding and a fixed height that clips enlarged labels.
      element.style.setProperty("--md-list-item-two-line-container-height", "calc(var(--font-size-primary,1rem) * 1.5 + var(--font-size-caption,.8rem) * 1.2 + 24px)");
      element.style.setProperty("--md-list-item-top-space", "12px");
      element.style.setProperty("--md-list-item-bottom-space", "12px");
      for (const label of element.querySelectorAll('[slot="overline"]')) label.style.lineHeight = "1.2";
      const item = element.shadowRoot.querySelector('md-item');
      await item?.updateComplete;
      if (item?.shadowRoot && !item.shadowRoot.querySelector('style[data-marao-picker]')) {
        // Trailing native controls move below the text when they would consume its width.
        const style = document.createElement('style'); style.dataset.maraoPicker = '';
        style.textContent = '@container marao-picker (max-width:240px){:host{display:grid!important;grid-template-columns:minmax(0,1fr) auto;column-gap:8px}.text{grid-column:1/-1;grid-row:1;min-width:0}[name="start"],[name="end"]{display:flex;align-items:center;grid-row:2}[name="start"]{grid-column:1}[name="end"]{grid-column:2;justify-self:end}}';
        item.shadowRoot.append(style);
      }
    }
    if (element.localName === "ha-input") {
      const root = element.getRootNode();
      if (!root.querySelector('style[data-marao-fields]')) {
        // HA's exported input parts otherwise retain a 56px field at enlarged text sizes.
        const style = document.createElement('style'); style.dataset.maraoFields = '';
        style.textContent = 'ha-input::part(wa-base){height:auto;min-height:calc(var(--font-size-primary,1rem) * 1.5 + var(--font-size-caption,.8rem) * 1.2 + 24px)}ha-input::part(wa-input){padding-top:calc(var(--font-size-caption,.8rem) * 1.2 + 8px)}';
        root.append(style);
      }
    }
    await Promise.all([...element.children, ...(element.shadowRoot?.children || [])].map((child) => this._containForm(child)));
  }

  _variableSchema(field, sourceId) {
    let selector = { text: {} };
    if (field.kind === "boolean") selector = { boolean: {} };
    if (field.kind === "entity") selector = { entity: { domain: field.domains || [], multiple: Boolean(field.multiple) } };
    if (field.kind === "energy_period") selector = { select: { mode: 'dropdown', options: [{ value: 'day', label: this._l('Day') }, { value: 'month', label: this._l('Month') }] } };
    if (field.kind === "icon") selector = { icon: {} };
    if (field.kind === "number") selector = { number: {} };
    if (field.kind === "color") selector = { text: { type: "color" } };
    if (field.kind === "energy_precision") selector = { select: { mode: "dropdown", options: [
      { value: "auto", label: this._l("Automatic") }, ...Array.from({length: 7}, (_, value) => ({value: String(value), label: String(value)})),
    ] } };
    if (field.kind === "energy_unit") {
      const units = this._catalog.energy_units || {};
      const source = entityMeta(this._entities, sourceId)?.unit_of_measurement;
      selector = { select: { mode: "dropdown", options: [
        { value: "auto", label: this._l("Automatic") },
        ...Object.keys(units).filter(unit => units[unit][0] === units[source]?.[0]).map(unit => ({value: unit, label: unit})),
      ] } };
    }
    return { ...this._schema(`var__${field.key}`, this._l(field.label), selector), helper: this._l(field.description || "") };
  }

  _refreshEnergyFields(content, sourceId) {
    const field = this._catalog.energy_fields?.find(item => item.kind === "energy_unit");
    if (!field) return;
    for (const form of content.querySelectorAll("ha-form")) {
      if (form._energySource === sourceId) continue;
      form._energySource = sourceId;
      form.schema = form.schema.map(item => item.name === `var__${field.key}` ? this._variableSchema(field, sourceId) : item);
    }
  }

  _expandedFields(fields) {
    return fields.flatMap((field) => field.kind !== "vacuum_action" ? [field] : [
      { key: `${field.key}.icon`, label: `${field.label} icon`, kind: "icon", advanced: true },
      { key: `${field.key}.on_action`, label: `${field.label} service`, kind: "text", advanced: true },
      { key: `${field.key}.segment`, label: `${field.label} segment`, kind: "number", advanced: true },
    ]);
  }

  _readVariable(variables, field) {
    if (field.kind === 'number_list') return (variables?.[field.key] ?? field.default ?? []).join(', ');
    if (["energy_unit", "energy_precision"].includes(field.kind)) return variables?.[field.key] == null ? "auto" : String(variables[field.key]);
    const [parent, child] = field.key.split("."); return child ? variables?.[parent]?.[child] ?? "" : variables?.[parent] ?? field.default ?? "";
  }
  _writeVariable(variables, field, value) {
    if (field.kind === 'number_list') {
      const numbers = Array.isArray(value) ? value : String(value || '').split(',').map(item => item.trim()).filter(Boolean).map(Number);
      if (numbers.length > 3 || numbers.some(number => typeof number !== 'number' || !Number.isFinite(number))) throw new Error('Charging shortcuts require at most three finite numbers.');
      value = numbers;
    }
    if (["energy_unit", "energy_precision"].includes(field.kind) && value === "auto") value = "";
    if (field.kind === "energy_precision" && /^[0-6]$/.test(value)) value = Number(value);
    const empty = value === "" || value == null; const [parent, child] = field.key.split(".");
    if (child) { variables[parent] ||= {}; if (empty) delete variables[parent][child]; else variables[parent][child] = value; if (!Object.keys(variables[parent]).length) delete variables[parent]; }
    else if (empty) delete variables[parent]; else variables[parent] = value;
  }

  _entityId(value) { return typeof value === "string" ? value : value?.entity_id || ""; }
  _entityIds(values) { if (values == null) return []; return (Array.isArray(values) ? values : [values]).map((value) => this._entityId(value)).filter(Boolean); }
  _setBusy(busy) { this._busy = busy; this.shadowRoot.getElementById("visual-view").inert = busy; this.shadowRoot.querySelectorAll("ha-button,ha-icon-button").forEach((button) => { button.disabled = busy; }); this._updateHeader(); }
  _setStatus(message, kind) { const status = this.shadowRoot.getElementById("status"); status.textContent = message; status.className = `status ${kind || ""}`; this.shadowRoot.getElementById("retry").hidden = !this._retryKind; }
  _error(error) {
    const message = String(error?.message || error?.body?.message || error), split = message.indexOf(': ');
    return split < 0 ? this._l(message) : this._l(message.slice(0, split)) + message.slice(split);
  }
}

if (!customElements.get("marao-dashboard-panel")) customElements.define("marao-dashboard-panel", MaraoDashboardPanel);
