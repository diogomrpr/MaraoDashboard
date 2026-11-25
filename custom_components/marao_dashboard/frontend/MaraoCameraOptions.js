export const CAMERA_QUALITIES = ['auto', 'low', 'high'];
const cameraEntity = /^camera\.[a-z0-9_]+$/;
export const validFrigateStream = value => typeof value === 'string' && /^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/.test(value);

export const cameraOptionLabels = {
  'Choose Auto, Low or High for camera quality.': 'Escolha Automática, Baixa ou Alta para a qualidade do vídeo.',
  'Choose a camera entity for the low-quality stream.': 'Escolha uma entidade de câmara para o vídeo de qualidade baixa.',
  'Enter a Frigate stream name.': 'Introduza apenas o nome do fluxo Frigate.',
  'Choose one low-quality source for this camera.': 'Escolha uma única fonte de qualidade baixa para esta câmara.',
};

export function cameraOptionsError(options = {}, language) {
  const { stream_quality: quality, low_stream_entity: entity, frigate_low_stream: stream } = options || {};
  let error = '';
  if (quality != null && !CAMERA_QUALITIES.includes(quality)) error = 'Choose Auto, Low or High for camera quality.';
  else if (entity != null && entity !== '' && (typeof entity !== 'string' || !cameraEntity.test(entity))) error = 'Choose a camera entity for the low-quality stream.';
  else if (stream != null && stream !== '' && !validFrigateStream(stream)) error = 'Enter a Frigate stream name.';
  else if (entity && stream) error = 'Choose one low-quality source for this camera.';
  return language === 'pt' && error ? cameraOptionLabels[error] : error;
}

export function cameraOptions(options = {}) {
  return {
    quality: options?.stream_quality || 'auto',
    lowEntity: options?.low_stream_entity || '',
    lowFrigate: options?.frigate_low_stream || '',
  };
}

export function cameraPlaybackKey(entity, options) {
  const { quality, lowEntity, lowFrigate } = cameraOptions(options);
  return quality === 'auto' && !lowEntity && !lowFrigate ? entity : JSON.stringify([entity, quality, lowEntity, lowFrigate]);
}

export function cameraPoster(state, entity, compact) {
  const picture = state?.attributes?.entity_picture || '';
  if (!compact || !picture.startsWith('/api/camera_proxy/' + entity + '?')) return picture;
  const [path, query] = picture.split('?', 2);
  const params = new URLSearchParams(query);
  params.set('width', '640');
  return path + '?' + params.toString();
}
