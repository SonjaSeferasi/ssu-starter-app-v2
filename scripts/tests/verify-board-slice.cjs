// Local-only SRS-124.1 acceptance runner. Never invokes the opt-in hosted script.
const { spawnSync } = require('node:child_process');
const { mkdirSync, readFileSync, writeFileSync, openSync, closeSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { createHash } = require('node:crypto');

const out = resolve(process.env.BOARD_VERIFICATION_DIR || 'tmp/board-1042');
mkdirSync(out, { recursive: true });
const receipt = {
  startedAt: new Date().toISOString(),
  sourceCommit: process.env.BOARD_VERIFICATION_COMMIT || null,
  environment: 'Clean local production UI/API; actual SQL in disposable PGlite; fixture Auth/PostgREST/signing',
  hostedWrites: false,
  steps: [],
};
function save() { writeFileSync(join(out, 'verification.json'), JSON.stringify(receipt, null, 2) + '\n'); }
function run(name, cmd, args, extraEnv = {}, json = false) {
  const log = join(out, name + '.log');
  const fd = openSync(log, 'w');
  const result = spawnSync(cmd, args, { env: { ...process.env, ...extraEnv }, stdio: ['ignore', fd, fd] });
  closeSync(fd);
  const step = { name, command: [cmd, ...args], status: result.status, signal: result.signal };
  if (json && result.status === 0) {
    const report = JSON.parse(readFileSync(join(out, name + '.json'), 'utf8'));
    Object.assign(step, { tests: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests });
    if (step.tests === 0 || step.passed !== step.tests || step.failed !== 0) throw new Error('Incomplete acceptance: ' + name);
  }
  receipt.steps.push(step); save();
  if (result.error || result.status !== 0) throw new Error(`${name} failed; inspect ${log}: ${result.error || result.signal || result.status}`);
  console.log(`${name}: passed${step.tests ? ` (${step.tests} tests)` : ''}`);
}
const unitFiles = [
  '__tests__/profile-board.test.ts', '__tests__/api', '__tests__/supabase-freshness.test.ts',
  '__tests__/database/profile-space.test.ts', '__tests__/database/profile-board-atomic-save.test.ts',
  '__tests__/database/board-photo-ownership.test.ts', '__tests__/database/profile-memories.test.ts',
  '__tests__/board-history-guard.test.ts',
];
const suites = [
  ['atomic-rotation-history', 'vitest.board-evidence.config.ts'],
  ['photo-ownership', 'vitest.board-photo-evidence.config.ts'],
  ['uploaded-photo-identity', 'vitest.board-upload-evidence.config.ts'],
  ['contract-owner-viewer-block', 'vitest.board-contract-evidence.config.ts'],
  ['editor-save-reload', 'vitest.board-editor-evidence.config.ts'],
];
try {
  // Browser suites launch their own isolated local app/provider processes.
  // Do not inherit opt-in fault-baseline flags intended for historical reproductions.
  for (const key of Object.keys(process.env)) if (/^BOARD_.*BASELINE$/.test(key)) delete process.env[key];
  run('focused', 'npx', ['vitest', 'run', ...unitFiles, '--maxWorkers=2', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + join(out, 'focused.json')], {}, true);
  run('build', 'npm', ['run', 'build']);
  for (const [name, config] of suites) run(name, 'npx', ['vitest', 'run', '--config', config, '--reporter=default', '--reporter=json', '--outputFile=' + join(out, name + '.json')], { BOARD_EVIDENCE_DIR: join(out, name) }, true);
  const paths = ['app/api/profiles/space/route.ts', 'components/profile/profile-board.tsx', 'lib/profile-board.ts', 'lib/profile-space.ts'];
  receipt.testedProductionSourceSha256 = Object.fromEntries(paths.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
  const hosted = JSON.parse(readFileSync('documentation/sprint3/my-board/1039-evidence/source-verification.json', 'utf8'));
  receipt.matchesApproved1039HostedSource = paths.every(p => receipt.testedProductionSourceSha256[p] === hosted.testedProductionSourceSha256[p]);
  if (!receipt.matchesApproved1039HostedSource) throw new Error('Hosted source provenance has changed; reassess evidence');
  receipt.providerTransportSha256 = createHash('sha256').update(readFileSync('lib/supabase.ts')).digest('hex');
  receipt.hostedEvidence = 'Historical approved #1039 run at a9d7160c88f2ab86f6102746972fe15445bac700 reused explicitly. Core board sources match; provider transport now disables fetch caching (#1291), verified locally, not rerun against hosted accounts.';
  receipt.finishedAt = new Date().toISOString(); receipt.result = 'passed'; save();
} catch (error) {
  receipt.result = 'failed'; receipt.error = String(error); save(); console.error(error.message); process.exitCode = 1;
}
