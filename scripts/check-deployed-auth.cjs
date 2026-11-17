// Read-only readiness probe: no login attempt, account creation or database write.
async function main() {
  const base = new URL(process.argv[2]);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Provide the HTTPS deployment origin only.');
  const checks = [];
  for (const path of ['/api/profiles/space', '/api/account/login-activity']) {
    const response = await fetch(new URL(path, base), {
      headers: { Authorization: 'Bearer deployment-readiness-invalid-token' },
      redirect: 'error', signal: AbortSignal.timeout(20000), cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    checks.push({ path, status: response.status, error: typeof data.error === 'string' ? data.error.slice(0, 250) : null, passed: response.status === 401 });
  }
  const passed = checks.every(check => check.passed);
  console.log(JSON.stringify({ observedAt: new Date().toISOString(), origin: base.origin, test: 'Explicitly invalid token; expect rejection after configured auth is reached', checks, result: passed ? 'passed' : 'failed', limitation: 'A 401 proves invalid-token rejection only. Verified login and My Board save/reload require separate authenticated acceptance.' }, null, 2));
  if (!passed) process.exitCode = 1;
}
main().catch(() => { console.error('Deployment probe failed; verify the origin and network access.'); process.exitCode = 1; });
