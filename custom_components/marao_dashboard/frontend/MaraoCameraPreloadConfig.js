const { canonicalCard } = await import(new URL(`./MaraoNames.js${new URL(import.meta.url).search}`, import.meta.url));
const { cameraPlaybackKey } = await import(new URL(`./MaraoCameraOptions.js${new URL(import.meta.url).search}`, import.meta.url));

export function preloadCameras(config) {
  const cameras = new Map();
  const visit = card => {
    card = canonicalCard(card);
    if (!card || typeof card !== 'object' || ['custom:marao-popup-card', 'custom:marao-native-popup-card'].includes(card.type) || card.template === 'md_popup_card') return;
    if ((card.template === 'md_camera_card' || card.type === 'custom:marao-native-camera-card') && card.tap_action?.action !== 'fullscreen' && card.variables?.preload_stream === true && /^camera\.[a-z0-9_]+$/.test(card.entity)) cameras.set(cameraPlaybackKey(card.entity, card.variables), card);
    for (const child of [...(card.cards || []), ...(card.sections || []), ...(card.card ? [card.card] : [])]) visit(child);
  };
  for (const view of config?.views || []) visit(view);
  return cameras;
}
