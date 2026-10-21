const assert = require('node:assert/strict');
const { checkIdentity, git, makePlan, parseArgs, readPrivate, runPlan, validateEvidence } = require('./verification');

async function verifyPublish(argv = process.argv.slice(2), { release = true } = {}) {
  const options = parseArgs(argv);
  assert.ok(!options.full, 'Use the explicitly requested test:full command for comprehensive checks');
  options.release = release;
  options.unit = true;
  const plan = makePlan(options);
  console.log('Unit-only publication (integration testing stays in development): ' + plan.checks.map(check => check.id).join(', '));
  if (options.plan) return plan;
  assert.equal(git(['status', '--porcelain', '--untracked-files=normal']), '', 'Final publication requires a clean commit');
  if (options.report) {
    const report = readPrivate(options.report);
    const identities = Object.fromEntries(plan.checks.map(check => [check.id, checkIdentity(check)]));
    const target = plan.checks.some(check => check.kind !== 'offline') ? require('../ha-test/client').readConfig().url : undefined;
    validateEvidence(report, plan, identities, { target, exactCommit: true });
    assert.equal(git(['status', '--porcelain', '--untracked-files=normal']), '', 'Final publication requires a clean commit');
    if (report.prepared_receipt) {
      await require('../ha-test/prepared-batch').verifyBatch(report.prepared_receipt);
      if (report.version === 4) {
        const environment = await require('./verification-reuse').liveEnvironment(report.prepared_receipt);
        for (const row of report.results.filter(row => row.environment)) assert.deepEqual(row.environment, environment, 'Current prepared installation or environment changed');
      }
    }
    console.log('Unchanged scoped evidence validated; applicable exact-commit CI remains required.');
    return report;
  }
  return runPlan(plan, options);
}

if (require.main === module) verifyPublish().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { verifyPublish };
