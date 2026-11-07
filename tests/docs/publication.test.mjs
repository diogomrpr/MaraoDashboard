import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

test('publication rejects mismatched and prerelease package tags before preparing assets',()=>{
  const {version}=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url)));
  for(const tag of ['v999999.0.0',`v${version}-preview.1`]){
    const result=spawnSync(process.execPath,['docs/scripts/prepare-site.mjs'],{cwd:new URL('../../',import.meta.url),encoding:'utf8',env:{...process.env,MARAO_DOCS_RELEASE:tag}});
    assert.notEqual(result.status,0);assert.match(result.stderr,/matching stable package tag/);
  }
});


test('release documentation deploys from main while building the exact stable release tag',()=>{
  const workflow=parse(readFileSync(new URL('../../.github/workflows/pages.yml',import.meta.url),'utf8'));
  const dispatch=workflow.jobs['publish-release'];
  assert.equal(dispatch.if,"github.event_name == 'release' && !github.event.release.prerelease && !github.event.release.draft");
  assert.deepEqual(dispatch.permissions,{actions:'write'});
  assert.match(dispatch.steps[0].run,/--ref main/);
  assert.match(dispatch.steps[0].run,/"release_tag=\$RELEASE_TAG"/);
  assert.equal(dispatch.steps[0].env.RELEASE_TAG,'${{ github.event.release.tag_name }}');
  assert.equal(workflow.jobs.build.if,"github.event_name != 'release'");
  const guard=workflow.jobs.build.steps[0];
  assert.equal(guard.env.REQUESTED_TAG,'${{ inputs.release_tag }}');
  assert.match(guard.run,/test "\$REQUESTED_TAG" = "\$LATEST_TAG"/);
  assert.equal(workflow.jobs.build.steps[1].with.ref,'${{ steps.release.outputs.tag || github.sha }}');
  assert.equal(workflow.jobs.deploy.environment.name,'github-pages');
});
