import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import redirects from './legacy-redirects.json' with {type:'json'};
const output=fileURLToPath(new URL('../dist/',import.meta.url));
for(const [from,to] of Object.entries(redirects)){
  const target=path.join(output,from.endsWith('/')?from+'index.html':from);
  const href='/MaraoDashboard'+to;
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${href}"><link rel="canonical" href="${href}"><meta name="robots" content="noindex"><title>Documentation moved</title></head><body><a href="${href}">Open the current Marao documentation</a></body></html>`);
}

fs.copyFileSync(path.join(output,'404/index.html'),path.join(output,'404.html'));
