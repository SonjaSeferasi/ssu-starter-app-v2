/**
 * LN / #1432. Adapted from the course security-starter-rls-v1 rls-suite.ts.
 * REAL Supabase Auth/Data API calls, with anon-key attacker clients.
 * service_role is restricted to fixtures, metadata checks and verification.
 * Linh personally runs this suite; preparing it is not evidence of a run.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

type Fixture = { authId: string; studentId?: string; client?: SupabaseClient };
type Name = 'alice' | 'bob' | 'carol' | 'dana' | 'erin' | 'frank';
type ApiError = { code?: string; message: string };
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

function environment() {
  // Never import the app's .env.local: it may point at production.
  if (existsSync('.env.rls.local')) {
    for (const line of readFileSync('.env.rls.local', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(RLS_TEST_[A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  const required = (key: string) => {
    const value = process.env[key];
    if (!value) throw new Error(`SETUP: missing ${key} in .env.rls.local. No attack result is established.`);
    return value;
  };
  if (required('RLS_TEST_CONFIRM_DISPOSABLE') !== 'yes' || required('RLS_TEST_TEAM_NOTIFIED') !== 'yes') {
    throw new Error('SETUP: confirm a disposable project and notify teammates before running.');
  }
  const url = required('RLS_TEST_SUPABASE_URL');
  const ref = required('RLS_TEST_PROJECT_REF');
  const host = new URL(url).hostname;
  if (!((host === `${ref}.supabase.co` && new URL(url).protocol === 'https:') ||
      (ref === 'local' && ['127.0.0.1', 'localhost'].includes(host)))) {
    throw new Error('SETUP: URL does not match the explicitly selected disposable project.');
  }
  const anonKey = required('RLS_TEST_ANON_KEY');
  const serviceKey = required('RLS_TEST_SERVICE_ROLE_KEY');
  const role = (key: string) => {
    try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; }
    catch { return undefined; }
  };
  if (anonKey === serviceKey || !(role(anonKey) === 'anon' || anonKey.startsWith('sb_publishable_'))) {
    throw new Error('SETUP: attacks require an anon/publishable key, never service_role.');
  }
  if (!(role(serviceKey) === 'service_role' || serviceKey.startsWith('sb_secret_'))) {
    throw new Error('SETUP: fixture administrator requires the separate secret/service_role key.');
  }
  return { url, anonKey, serviceKey };
}

function setupError(error: ApiError | null, operation: string) {
  if (error) throw new Error(`SETUP/INFRASTRUCTURE: ${operation}: ${error.code || 'unknown'} ${error.message}. This is NOT proof of RLS.`);
}

function allowedOrRlsDenied(error: ApiError | null) {
  // A policy may reject a new row (42501), but outages/schema errors must fail.
  // The manifest separately proves all role/table DML grants exist first.
  if (error && error.code !== '42501') setupError(error, 'attack request');
}

export function describeStudentProfilesRls() {
  describe('LN #1432 — real anon-key attacks on socialu.student_profiles', () => {
    const runId = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = `Ln-Rls-${randomUUID()}!`;
    const fixtures: Partial<Record<Name, Fixture>> = {};
    let admin: SupabaseClient;
    let visitor: SupabaseClient;
    let resetReady = false;
    const adminTable = (name: string) => admin.schema('socialu').from(name);
    const id = (name: Name) => {
      const value = fixtures[name]?.studentId;
      if (!value) throw new Error(`SETUP: missing ${name} fixture.`);
      return value;
    };
    const as = (name: Name) => {
      const client = fixtures[name]?.client;
      if (!client) throw new Error(`SETUP: missing ${name} session.`);
      return client.schema('socialu').from('student_profiles');
    };
    async function stored(name: Name) {
      const result = await adminTable('student_profiles').select('student_id,bio').eq('student_id', id(name)).maybeSingle();
      setupError(result.error, 'independent fixture verification');
      return result.data;
    }
    async function read(query: PromiseLike<{ data: unknown; error: ApiError | null }>) {
      const result = await query;
      setupError(result.error, 'read request');
      if (!Array.isArray(result.data)) throw new Error('SETUP: malformed Data API response.');
      return result.data;
    }
    async function resetProfiles() {
      // Only ids created in this run; no other account rows are targeted.
      const removed = await adminTable('student_profiles').delete().eq('student_id', id('carol'));
      setupError(removed.error, 'reset Carol fixture');
      const rows = (['alice', 'bob', 'dana', 'erin', 'frank'] as Name[]).map(name => ({
        student_id: id(name), bio: `${name} original bio`, photo_id: null,
        display_name: null, major: null, class_year: null, setup_completed: false,
      }));
      const restored = await adminTable('student_profiles').upsert(rows);
      setupError(restored.error, 'reset profile fixtures');
    }

    beforeAll(async () => {
      const env = environment();
      admin = createClient(env.url, env.serviceKey, options);
      visitor = createClient(env.url, env.anonKey, options);
      // Test-only, service-role-only metadata function supplied by the isolated
      // setup script. It checks grants, exposed role attributes and the marker.
      const manifest = await admin.rpc('ln_student_profiles_rls_test_manifest');
      setupError(manifest.error, 'load disposable-project manifest');
      if (manifest.data?.fixture !== 'ln-student-profiles-v1' || manifest.data?.grants_ok !== true ||
          manifest.data?.anon_bypass !== false || manifest.data?.authenticated_bypass !== false) {
        throw new Error('SETUP: missing disposable-project marker, DML grants, or non-bypass caller roles.');
      }
      console.info(`Observed database state: RLS=${manifest.data.rls_enabled}; target=socialu.student_profiles; issue=#1432. Linh must capture the actual result.`);

      for (const name of ['alice', 'bob', 'carol', 'dana', 'erin', 'frank'] as Name[]) {
        const domain = name === 'erin' ? 'example.edu' : 'salemstate.edu';
        const email = `rls-ln-${name}-${runId}@${domain}`;
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        setupError(created.error, `create disposable ${name}`);
        if (!created.data.user) throw new Error('SETUP: Auth did not return the fixture user.');
        fixtures[name] = { authId: created.data.user.id };
        const onboard = await admin.rpc('socialu_account', {
          p_action: 'onboard', p_auth_id: created.data.user.id,
          p_full_name: `RLS LN ${name}`, p_username: `rls_ln_${name}_${runId}`, p_bio: `${name} original bio`,
        });
        setupError(onboard.error, `onboard ${name} through the real app RPC`);
        if (!onboard.data?.id) throw new Error('SETUP: app onboarding returned no student id.');
        fixtures[name]!.studentId = String(onboard.data.id);
        const signedIn = createClient(env.url, env.anonKey, options);
        const login = await signedIn.auth.signInWithPassword({ email, password });
        setupError(login.error, `sign in ${name} with anon key`);
        if (!login.data.session) throw new Error('SETUP: missing fixture login token.');
        fixtures[name]!.client = signedIn;
      }
      // Bob is at Alice's campus but explicitly blocked; Dana is an allowed
      // campus viewer; Erin is from another school. These follow the real SRS.
      const blocked = await adminTable('student_blocks').insert({ blocker_id: id('alice'), blocked_id: id('bob') });
      setupError(blocked.error, 'seed block relationship');
      const unverified = await adminTable('students').update({ email_verified_at: null }).eq('student_id', id('frank'));
      setupError(unverified.error, 'seed Frank app-level verification failure');
      await resetProfiles();
      const own = await read(as('alice').select('student_id').eq('student_id', id('alice')));
      if (own.length !== 1) throw new Error('SETUP: owner cannot read the target; denial alone cannot prove a working policy.');
      await read(visitor.schema('socialu').from('student_profiles').select('student_id').eq('student_id', id('alice')));
      resetReady = true;
    });

    beforeEach(async () => { if (!resetReady) throw new Error('SETUP incomplete: no attack result is established.'); await resetProfiles(); });

    afterAll(async () => {
      if (!admin) return;
      const errors: string[] = [];
      const ids = Object.values(fixtures).flatMap(fixture => fixture.studentId ? [fixture.studentId] : []);
      if (ids.length) {
        for (const column of ['blocker_id', 'blocked_id']) {
          const result = await adminTable('student_blocks').delete().in(column, ids);
          if (result.error) errors.push(`blocks: ${result.error.code}`);
        }
        for (const table of ['student_profiles', 'students']) {
          const result = await adminTable(table).delete().in('student_id', ids);
          if (result.error) errors.push(`${table}: ${result.error.code}`);
        }
      }
      for (const fixture of Object.values(fixtures)) {
        const result = await admin.auth.admin.deleteUser(fixture.authId);
        if (result.error) errors.push(`Auth fixture ${fixture.authId}: ${result.error.code || result.error.status}`);
      }
      if (errors.length) throw new Error(`Fixture cleanup incomplete; clean only this run's RLS LN accounts: ${errors.join('; ')}`);
    });

    it('a logged-out visitor cannot read fixture profiles', async () => {
      expect(await read(visitor.schema('socialu').from('student_profiles').select('student_id,bio').in('student_id', [id('alice'), id('bob')])),'LEAK: anonymous access to profile rows').toHaveLength(0);
    });
    it('a blocked campus student cannot read Alice', async () => {
      expect(await read(as('bob').select('student_id,bio').eq('student_id', id('alice'))),'LEAK: blocked student read Alice').toHaveLength(0);
    });
    it('a student at another school cannot read Alice', async () => {
      expect(await read(as('erin').select('student_id,bio').eq('student_id', id('alice'))),'LEAK: cross-school profile read').toHaveLength(0);
    });
    it('an app-unverified student cannot read profiles, even their own', async () => {
      expect(await read(as('frank').select('student_id,bio').in('student_id', [id('frank'), id('alice')])),'LEAK: app-unverified profile read').toHaveLength(0);
    });
    it('Bob cannot change Alice biography', async () => {
      const result = await as('bob').update({ bio: 'HACKED BY BOB' }).eq('student_id', id('alice'));
      allowedOrRlsDenied(result.error);
      expect((await stored('alice'))?.bio,'TAMPERING: Bob overwrote Alice').toBe('alice original bio');
    });
    it('Bob cannot create Carol profile', async () => {
      const result = await as('bob').insert({ student_id: id('carol'), bio: 'IMPERSONATION' });
      allowedOrRlsDenied(result.error);
      expect(await stored('carol'),'IMPERSONATION: Bob created Carol profile').toBeNull();
    });
    it('Bob cannot reassign his own row to Carol', async () => {
      const result = await as('bob').update({ student_id: id('carol') }).eq('student_id', id('bob'));
      allowedOrRlsDenied(result.error);
      expect(await stored('bob'),'OWNERSHIP TRANSFER: Bob changed the row owner').not.toBeNull();
      expect(await stored('carol')).toBeNull();
    });
    it('Bob cannot delete Alice profile', async () => {
      const result = await as('bob').delete().eq('student_id', id('alice'));
      allowedOrRlsDenied(result.error);
      expect(await stored('alice'),'DESTRUCTION: Bob deleted Alice').not.toBeNull();
    });
    it('owners cannot directly delete even their own profile', async () => {
      const result = await as('alice').delete().eq('student_id', id('alice'));
      allowedOrRlsDenied(result.error);
      expect(await stored('alice'),'DESTRUCTION: direct owner DELETE was allowed').not.toBeNull();
    });
    it('an allowed campus student can still read Alice', async () => {
      expect(await read(as('dana').select('student_id,bio').eq('student_id', id('alice')))).toHaveLength(1);
    });
    it('the owner can still update and read their own biography', async () => {
      const result = await as('alice').update({ bio: 'Alice authorized edit' }).eq('student_id', id('alice')).select('student_id');
      setupError(result.error, 'authorized owner update');
      expect(result.data).toHaveLength(1);
      expect((await stored('alice'))?.bio).toBe('Alice authorized edit');
    });
    it('Carol can still create her own profile', async () => {
      const result = await as('carol').insert({ student_id: id('carol'), bio: 'Carol authorized profile' }).select('student_id');
      setupError(result.error, 'authorized owner insert');
      expect(result.data).toHaveLength(1);
      expect((await stored('carol'))?.bio).toBe('Carol authorized profile');
    });
  });
}
