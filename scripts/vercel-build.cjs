const { spawnSync } = require('node:child_process');

// Match lib/supabase.ts and next.config.js; never return or log secret values.
function configurationErrors(env) {
  const errors = [];
  const serverUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const publicUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!serverUrl?.trim()) errors.push('Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.');
  if (!env.SUPABASE_SERVICE_ROLE_KEY?.trim()) errors.push('Set the server-only SUPABASE_SERVICE_ROLE_KEY.');
  if (!publicKey?.trim()) errors.push('Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY for browser Realtime.');
  const origin = (value) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
      return url.origin;
    } catch { return null; }
  };
  if (serverUrl?.trim() && !origin(serverUrl)) errors.push('Supabase URL must be an HTTPS project origin.');
  if (serverUrl && publicUrl && origin(serverUrl) !== origin(publicUrl)) errors.push('SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must identify the same project.');
  if (publicKey && env.SUPABASE_SERVICE_ROLE_KEY && publicKey === env.SUPABASE_SERVICE_ROLE_KEY) errors.push('The public anon key must differ from SUPABASE_SERVICE_ROLE_KEY.');
  if (env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) errors.push('Remove NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; service credentials are server-only.');
  return errors;
}
function run() {
  // The cloud build must use its own configured environment, not a developer's file.
  if (process.env.VERCEL !== '1') require('@next/env').loadEnvConfig(process.cwd());
  const errors = configurationErrors(process.env);
  if (errors.length) {
    console.error('Deployment stopped: Supabase configuration is incomplete.');
    for (const error of errors) console.error('- ' + error);
    console.error('Configure the intended Vercel Production/Preview environment and redeploy.');
    process.exitCode = 1;
    return;
  }
  console.log('Supabase deployment configuration check passed (presence/project checks only).');
  if (process.argv.includes('--check')) return;
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { stdio: 'inherit' });
  if (result.error) console.error('Unable to start the production build.');
  process.exitCode = result.status ?? 1;
}
module.exports = { configurationErrors, run };
if (require.main === module) run();
