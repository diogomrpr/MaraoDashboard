import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('publication rejects mismatched and prerelease package tags before preparing assets',()=>{
  const {version}=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url)));
  for(const tag of ['v999999.0.0',`v${version}-preview.1`]){
    const result=spawnSync(process.execPath,['docs/scripts/prepare-site.mjs'],{cwd:new URL('../../',import.meta.url),encoding:'utf8',env:{...process.env,MARAO_DOCS_RELEASE:tag}});
    assert.notEqual(result.status,0);assert.match(result.stderr,/matching stable package tag/);
  }
});
