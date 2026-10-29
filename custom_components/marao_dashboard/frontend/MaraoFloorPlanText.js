const pt = {
  'Floor Plan':'Planta', 'Upload image':'Carregar imagem', 'Replace image':'Substituir imagem',
  'Images are stored in Home Assistant immediately. Save applies the arrangement.':'As imagens são guardadas imediatamente no Home Assistant. Guardar aplica a disposição.',
  'Full page':'Página inteira', 'Name':'Nome', 'Icon':'Ícone', 'Light':'Luz', 'Lights':'Luzes', 'Add light':'Adicionar luz', 'Edit light':'Editar luz',
  'Choose a light entity.':'Escolha uma entidade de luz.', 'Tap the image to place a light.':'Toque na imagem para colocar uma luz.',
  'Draw strip':'Desenhar fita', 'Finish':'Concluir', 'Undo point':'Desfazer ponto', 'Cancel trace':'Cancelar traçado',
  'Remove strip':'Remover fita', 'Remove light':'Remover luz', 'Remove point':'Remover ponto', 'Strip thickness':'Espessura da fita',
  'Update':'Atualizar', 'Create':'Criar', 'Cancel':'Cancelar', 'Retry':'Tentar novamente', 'Loading image…':'A carregar imagem…',
  'Image could not load.':'Não foi possível carregar a imagem.', 'Upload a PNG or JPEG image.':'Carregue uma imagem PNG ou JPEG.',
  'Image upload failed.':'Falha ao carregar a imagem.', 'Upload a floor-plan image.':'Carregue uma imagem da planta.',
  'On':'Ligada', 'Off':'Desligada', 'Unavailable':'Indisponível', 'Point':'Ponto',
  'Buttons overlap. Use Lights to reach every control.':'Os botões sobrepõem-se. Use Luzes para aceder a todos os controlos.',
  'Tap points on the image, then Finish.':'Toque nos pontos da imagem e depois em Concluir.',
  'A strip needs at least two distinct image points.':'Uma fita precisa de pelo menos dois pontos distintos na imagem.',
  'Floor-plan coordinates must be between 0 and 100.':'As coordenadas devem estar entre 0 e 100.',
  'Strip thickness must be between 1 and 32.':'A espessura deve estar entre 1 e 32.',
  'Full-page floor plans require a page with no other content cards.':'Uma planta de página inteira precisa de uma página sem outros cartões de conteúdo.',
  'Floor-plan lights must be a list.':'As luzes da planta devem ser uma lista.', 'Floor-plan light IDs must be unique.':'Os identificadores das luzes devem ser únicos.',
  'Invalid floor-plan light.':'Luz da planta inválida.', 'Invalid floor-plan settings.':'Definições da planta inválidas.',
  'Full page must be a boolean.':'Página inteira deve ser um booleano.', 'Light name and icon must be text.':'Nome e ícone da luz devem ser texto.'
};
export const FLOOR_PT_LABELS = pt;
export const floorText = (hass, label) => String(hass?.language || '').toLowerCase().startsWith('pt') ? pt[label] || label : label;
