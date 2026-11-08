import fs from 'node:fs';
import {cards} from '../examples/manifest.js';
import owners from '../../.agents/skills/marao-card-design/references/owners.json' with {type:'json'};
export function context(name,intent='style'){
 if(!['style','behavior','config','new-card'].includes(intent))throw Error('Intent: style, behavior, config, new-card');
 const key=(name||'').toLowerCase();
 if(intent==='new-card')return {requestedName:name,nearestFamilies:cards.map(c=>({id:c.id,name:c.title})),reference:'.agents/skills/marao-card-design/references/new-card.md',next:'Choose an existing neighbor for source context before defining a new native family.'};
 const exact=cards.filter(c=>[c.id,c.slug,c.title.toLowerCase()].includes(key));
 const matches=exact.length?exact:cards.filter(c=>!c.relatedTo&&c.config.type===key);
 if(matches.length!==1)throw Error(`Choose one card: ${cards.map(c=>c.slug).join(', ')}`);
 const c=matches[0];
 const relevant=owners.filter(o=>o.consumers.includes(c.relatedTo||c.id)&& (intent!=='style'||!['strict-slide','collections'].includes(o.behavior)));
 if(intent==='config')return {card:c.id,type:c.config.type,intent,fields:c.fields,source:'frontend_src/card-composition.js',anchors:['validateNativeCardConfig'],authoring:'node frontend_src/authoring-cli.js describe',rule:'Use existing authoring validation; no new renderer for existing-card configuration.'};
 for(const o of relevant)for(const anchor of o.anchors)if(!fs.readFileSync(new URL('../../'+o.file,import.meta.url),'utf8').includes(anchor))throw Error(`Update owner map: ${o.file}: ${anchor}`);
 return {card:c.id,type:c.config.type,intent,url:`/MaraoDashboard/cards/${c.slug}/`,owners:relevant.map(o=>({...o,consumers:o.consumers.length>15?'All inheritors; inspect the changed selector/token to determine exact consumers.':o.consumers})),rule:'Read bounded anchor sections. Shared file does not imply shared behavior. Recompute consumers from the final diff; confirm shared scope before apply.',verificationComponents:[...new Set(relevant.flatMap(o=>o.verificationComponents))],checks:[...new Set(relevant.flatMap(o=>o.focusedTests))],verificationRule:'Choose one relevant check for nontrivial logic; visual-only edits use diff review and a manual watch list. Do not run every candidate test.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 try{const args=process.argv.slice(2),i=args.indexOf('--intent');console.log(JSON.stringify(context(args[0],i<0?'style':args[i+1]),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
