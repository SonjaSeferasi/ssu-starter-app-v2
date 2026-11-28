import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const { configurationErrors } = require('../scripts/vercel-build.cjs');
const valid = { SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_ANON_KEY: 'fixture-public', SUPABASE_SERVICE_ROLE_KEY: 'fixture-private' };

it('stops a deployment with missing server integration even when public auth is configured', () => {
  expect(configurationErrors({ NEXT_PUBLIC_SUPABASE_URL: valid.SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: valid.SUPABASE_ANON_KEY })).toContain('Set the server-only SUPABASE_SERVICE_ROLE_KEY.');
});
it('accepts the existing server aliases and optional public aliases', () => {
  expect(configurationErrors(valid)).toEqual([]);
  expect(configurationErrors({ ...valid, SUPABASE_URL: undefined, SUPABASE_ANON_KEY: undefined, NEXT_PUBLIC_SUPABASE_URL: valid.SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: valid.SUPABASE_ANON_KEY })).toEqual([]);
});
it('rejects different server/browser projects while allowing trailing origin slash', () => {
  expect(configurationErrors({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' })).toContain('SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must identify the same project.');
  expect(configurationErrors({ ...valid, NEXT_PUBLIC_SUPABASE_URL: valid.SUPABASE_URL + '/' })).toEqual([]);
});
it('rejects a non-HTTPS or non-origin project URL', () => {
  for (const value of ['http://fixture.supabase.co', 'https://fixture.supabase.co/path', 'https://user:pass@fixture.supabase.co', 'bad-url']) expect(configurationErrors({ ...valid, SUPABASE_URL: value })).toContain('Supabase URL must be an HTTPS project origin.');
});
it('prevents exposing the service key through public configuration', () => {
  expect(configurationErrors({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: valid.SUPABASE_SERVICE_ROLE_KEY })).toContain('The public anon key must differ from SUPABASE_SERVICE_ROLE_KEY.');
  expect(configurationErrors({ ...valid, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: valid.SUPABASE_SERVICE_ROLE_KEY })).toContain('Remove NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; service credentials are server-only.');
});
it('exits before compilation on missing Vercel config and never prints supplied key values', () => {
  const result = spawnSync(process.execPath, [resolve('scripts/vercel-build.cjs'), '--check'], { encoding: 'utf8', env: { PATH: process.env.PATH, VERCEL: '1', SUPABASE_SERVICE_ROLE_KEY: 'private-value-must-not-appear' } });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.');
  expect(result.stderr).not.toContain('private-value-must-not-appear');
  expect(result.stdout).not.toContain('Next.js');
});
it('check-only succeeds without connecting to provider or starting compilation', () => {
  const result = spawnSync(process.execPath, [resolve('scripts/vercel-build.cjs'), '--check'], { encoding: 'utf8', env: { PATH: process.env.PATH, VERCEL: '1', ...valid } });
  expect(result.status).toBe(0); expect(result.stdout).toContain('presence/project checks only'); expect(result.stdout).not.toContain('Next.js');
});
