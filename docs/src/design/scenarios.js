import {getExample} from '../../examples/manifest.js';
export function scenarios(cardId, views) {
  const card=getExample(cardId);
  if (!card) throw new Error(`Unknown design card: ${cardId}`);
  for (const scenario of card.scenarios) if (!views[scenario.id]) throw new Error(`Add design fixture: ${cardId}/${scenario.id}`);
  for (const id of Object.keys(views)) if (!card.scenarios.some(s=>s.id===id)) throw new Error(`Unknown design fixture: ${cardId}/${id}`);
  return card.scenarios.map(s=>({id:s.id,label:s.label,description:s.description,...views[s.id]}));
}
