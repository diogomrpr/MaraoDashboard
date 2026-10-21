// Use HA's media dependency for deterministic, aligned synthetic fixture encoding.
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const result = spawnSync(process.env.PYTHON || path.join(__dirname, '../.venv/bin/python'),
  [path.join(__dirname, 'generate-camera-live.py'), ...process.argv.slice(2)], {stdio:'inherit'});
if(result.error) throw result.error;
process.exitCode = result.status ?? 1;
