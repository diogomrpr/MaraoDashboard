import referenceOverrides from '../../examples/card-reference-overrides.json' with {type:'json'};
import {getExample} from '../../examples/manifest.js';
import {lightScenarios} from './light.js';
import {climateScenarios} from './climate.js';
export function designCard(id){
 const card=getExample(id);
 if(!card)throw new Error(`Unknown design card: ${id}`);
 const labels=id==='md_light_card'?lightScenarios:id==='md_climate_card'?climateScenarios:[];
 return {...card,scenarios:card.scenarios.map(original=>{const s={...original,...referenceOverrides[id]?.scenarios?.[original.id]};const label=labels.find(l=>l.id===s.id);return {...s,pt:label?.pt||s.label,descriptionPt:label?.descriptionPt||s.description};})};
}
