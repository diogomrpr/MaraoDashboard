import { isMap, isScalar, parseDocument, stringify, visit } from 'yaml';
import { flattenEntities, pageContainers } from './editor-model.js';

// Match HA's SafeLoader scalar rules, including its narrower YAML 1.1 booleans/floats.
const yamlOptions = { version: '1.1', customTags: tags => tags.map(tag => {
  if (tag.tag === 'tag:yaml.org,2002:bool') return { ...tag,
    test: tag.identify(true) ? /^(?:yes|Yes|YES|true|True|TRUE|on|On|ON)$/ : /^(?:no|No|NO|false|False|FALSE|off|Off|OFF)$/ };
  if (['tag:yaml.org,2002:int', 'tag:yaml.org,2002:float'].includes(tag.tag)) {
    const numeric = { ...tag, stringify: node => tag.stringify(node).replace(/^(-?\d+)(e[-+]\d+)$/, '$1.0$2') };
    if (tag.format === 'EXP') numeric.test = /^(?:[-+]?[0-9][0-9_]*\.[0-9_]*|\.[0-9_]+)[eE][-+][0-9]+$/;
    else if (!tag.format && tag.test.test('-.5')) numeric.test = /^(?:[-+]?[0-9][0-9_]*\.[0-9_]*|\.[0-9_]+)$/;
    return numeric;
  }
  return tag;
}) };

export function parseCardYaml(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Home Assistant card YAML must be nonempty text.');
  const doc = parseDocument(source, { ...yamlOptions, uniqueKeys: true, intAsBigInt:true });
  if (doc.warnings.length) throw new Error('Card YAML uses an unsupported tag. Inline the configuration instead of using !include or !secret.');
  if (doc.errors.length) throw new Error('Invalid Home Assistant card YAML.');
  visit(doc, { Map(_, map) {
    if (map.items.some(({ key }) => !isScalar(key) || typeof key.value !== 'string' && !(key.type === 'PLAIN' && key.source === '<<'))) throw new Error('Card YAML requires unique string keys.');
  }, Scalar(_,node) {
    if (typeof node.value !== 'bigint') return;
    const number = Number(node.value), serialized = String(number);
    if (!Number.isFinite(number) || !/^-?\d+$/.test(serialized) || BigInt(serialized) !== node.value) throw new Error('Card YAML contains an integer that cannot be preserved safely.');
    node.value = number;
  } });
  let config;
  try { config = doc.toJS({ maxAliasCount: 100 }); }
  catch { throw new Error('Card YAML is too complex.'); }
  let count = 0;
  const active = new Set();
  const check = value => {
    if (++count > 100000) throw new Error('Card YAML is too complex.');
    if (value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype || active.has(value)) throw new Error('Card YAML must contain finite JSON-compatible values without recursive aliases.');
    active.add(value); Object.values(value).forEach(check); active.delete(value);
  };
  check(config);
  if (!isMap(doc.contents) || typeof config?.type !== 'string' || !config.type.trim()) throw new Error('Card YAML must be an object with a nonempty type.');
  return config;
}

export function parseCardsYaml(source) {
  if (typeof source !== 'string') throw new Error('Custom cards must be inline YAML.');
  // One wrapper keeps safe aliases between sibling cards inside the same document.
  const { cards } = parseCardYaml('type: vertical-stack\ncards:\n' + source.split('\n').map(line => '  ' + line).join('\n'));
  if (cards == null) return [];
  if (!Array.isArray(cards) || cards.some(card => !card || Array.isArray(card) || typeof card.type !== 'string' || !card.type.trim())) throw new Error('Custom cards must be a list of card objects with a type.');
  return cards;
}

export function cardYaml(config) {
  return stringify(config, { ...yamlOptions, lineWidth: 0, aliasDuplicateObjects: false });
}

export function validateCardYaml(config) {
  for (const page of Array.isArray(config.pages) ? config.pages : []) {
    for (const fragment of page.custom_content || []) parseCardsYaml(fragment.yaml);
    for (const section of pageContainers(page)) for (const entry of flattenEntities(section.entities)) {
      if (entry.template === 'ha_card') parseCardYaml(entry.yaml);
    }
  }
}

export function describeCardYaml(source) {
  try { const card = parseCardYaml(source); return { name: card.name || card.title || card.type, type: card.type }; }
  catch { return { name: 'Home Assistant card', type: 'YAML' }; }
}
