const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const coordinate = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
export const floorPoint = point => object(point) && coordinate(point.x) && coordinate(point.y);
export function floorPlanErrors(options) {
  const errors = [];
  if (!object(options)) return ['Invalid floor-plan settings.'];
  if (typeof options.image_id !== 'string' || !/^[a-f0-9]{32}$/.test(options.image_id)) errors.push('Upload a floor-plan image.');
  if (Object.hasOwn(options, 'full_page') && typeof options.full_page !== 'boolean') errors.push('Full page must be a boolean.');
  if (!Array.isArray(options.lights)) return [...errors, 'Floor-plan lights must be a list.'];
  const ids = new Set();
  for (const light of options.lights) {
    if (!object(light)) { errors.push('Invalid floor-plan light.'); continue; }
    if (typeof light.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(light.id) || ids.has(light.id)) errors.push('Floor-plan light IDs must be unique.');
    ids.add(light.id);
    if (typeof light.entity_id !== 'string' || !/^light\.[a-z0-9_]+$/.test(light.entity_id)) errors.push('Choose a light entity.');
    if (!floorPoint(light)) errors.push('Floor-plan coordinates must be between 0 and 100.');
    if (['name', 'icon'].some(key => Object.hasOwn(light, key) && typeof light[key] !== 'string')) errors.push('Light name and icon must be text.');
    if (light.strip !== undefined) {
      const strip = light.strip;
      if (!object(strip) || !Array.isArray(strip.points) || strip.points.length < 2 || !strip.points.every(floorPoint)
        || new Set(strip.points?.map(point => `${point.x},${point.y}`)).size < 2) errors.push('A strip needs at least two distinct image points.');
      if (object(strip) && Object.hasOwn(strip, 'width') && (typeof strip.width !== 'number' || !Number.isFinite(strip.width) || strip.width < 1 || strip.width > 32)) errors.push('Strip thickness must be between 1 and 32.');
    }
  }
  return errors;
}
export function imageBounds(width, height, imageWidth, imageHeight) {
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const w = imageWidth * scale, h = imageHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
export const floorPosition = (point, bounds) => ({ x: bounds.x + bounds.width * point.x / 100, y: bounds.y + bounds.height * point.y / 100 });
export function imagePoint(x, y, bounds) {
  const point = { x: (x - bounds.x) / bounds.width * 100, y: (y - bounds.y) / bounds.height * 100 };
  return floorPoint(point) ? point : null;
}
export function floorPageErrors(page, containers) {
  const cards = containers.flatMap(section => section.entities || []);
  if (!cards.some(card => card.template === 'md_floor_plan_card' && card.variables?.full_page === true)) return [];
  const structural = card => card.type === 'custom:marao-popup-card';
  if (cards.length !== 1 || cards[0].template !== 'md_floor_plan_card'
    || containers.some(section => (section.cards || []).some(card => !structural(card)))
    || (page.custom_content || []).some(fragment => !fragment.popup_hash)) return ['Full-page floor plans require a page with no other content cards.'];
  return [];
}
