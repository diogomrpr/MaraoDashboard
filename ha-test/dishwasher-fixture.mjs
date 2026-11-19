import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const directory = path.dirname(fileURLToPath(import.meta.url));
const iconNames = [
  'dishwasher', 'dishwasher-alert', 'autorenew', 'pot-steam', 'glass-wine',
  'leaf', 'timer-fast-outline', 'volume-off', 'water', 'shield-check',
  'timer-sand', 'chevron-up', 'chevron-down', 'minus', 'plus', 'close',
  'check', 'alert-circle-outline', 'help-circle-outline', 'power', 'play', 'stop'
];

export async function buildDishwasherFixture({folder, identity, sourceRoot = path.resolve(directory, '..')}) {
  if (!/^[\w-]+$/.test(folder) || !/^[\da-f]{64}$/.test(identity)) throw new Error('Invalid installed Marao package');
  const docs = path.resolve(sourceRoot, 'docs');
  const {getScenario} = await import(pathToFileURL(path.join(docs, 'examples/manifest.js')));
  const {config, states} = getScenario('dishwasher', 'ready');
  if (config.type !== 'custom:marao-dishwasher-card' || !config.variables?.enable_program_start)
    throw new Error('The dishwasher controls example is missing from this checkout');
  const fixtureStates = Object.fromEntries([config.entity_id, ...Object.values(config.variables)]
    .filter(id => typeof id === 'string')
    .map(id => {
      if (!states[id]) throw new Error('Missing fictional dishwasher entity ' + id);
      return [id, states[id]];
    }));
  const requireDocs = createRequire(path.join(docs, 'package.json'));
  const mdi = requireDocs('@mdi/js');
  const iconPaths = Object.fromEntries(iconNames.map(name => {
    const key = 'mdi' + name.replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase());
    return ['mdi:' + name, mdi[key] || mdi.mdiHelpCircleOutline];
  }));
  const license = await readFile(requireDocs.resolve('@mdi/js/LICENSE'), 'utf8');
  const options = {config, states:fixtureStates, iconPaths, folder};
  const compiled = await build({
    stdin:{contents:`import {createSimulation} from ${JSON.stringify(path.join(docs, 'playground/simulation.js'))};
      import {mountDishwasher} from ${JSON.stringify(path.join(directory, 'dishwasher-frame.mjs'))};
      mountDishwasher(createSimulation, ${JSON.stringify(options)}).catch(error => {
        const status = document.getElementById('status');
        status.setAttribute('role', 'alert');
        status.textContent = error.message;
      });`, resolveDir:directory},
    bundle:true, write:false, platform:'browser', format:'esm', target:'es2022', minify:true,
    banner:{js:'/*! @license @mdi/js\n' + license.replaceAll('*/', '* /') + '\n*/'}
  });
  // The HTML parser normalizes CRLF and CR before CSP hashes inline script text.
  const script = compiled.outputFiles[0].text.replace(/\r\n?/g, '\n').replace(/<\/script/gi, '<\\/script');
  const hash = createHash('sha256').update(script).digest('base64');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'sha256-${hash}'; connect-src 'self'; font-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Dishwasher controls</title><style>html,body{margin:0;min-height:100%;background:var(--primary-background-color,transparent);color:var(--primary-text-color,inherit);font-family:var(--primary-font-family,system-ui)}#status{padding:12px}#status:empty{display:none}home-assistant,hui-root{display:block}</style>
</head><body><div id="status" role="status">Loading dishwasher controls…</div><script type="module">${script}</script></body></html>`;
}
