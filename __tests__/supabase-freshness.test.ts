import { afterEach, expect, it, vi } from 'vitest';
import { getSupabaseClient } from '../lib/supabase';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('rechecks provider permissions and session state after a previously allowed response', async () => {
  vi.stubEnv('SUPABASE_URL', 'https://local-provider.example');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-test-fixture-key');
  let blocked = false;
  const cache = new Map<string, string>();
  const provider = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = String(input) + String(init?.body);
    const result = init?.cache !== 'no-store' && cache.has(key)
      ? cache.get(key)!
      : JSON.stringify({ allowed: !blocked });
    if (init?.cache !== 'no-store') cache.set(key, result);
    return new Response(result, { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', provider);
  const first = await getSupabaseClient()!.rpc('permission_probe', { p_student: 1 });
  expect(first.error).toBeNull(); expect(first.data).toEqual({ allowed: true });
  blocked = true;
  // Fresh clients alone are insufficient when the framework's fetch cache is shared.
  const second = await getSupabaseClient()!.rpc('permission_probe', { p_student: 1 });
  expect(second.error).toBeNull(); expect(second.data).toEqual({ allowed: false });
  expect(provider).toHaveBeenCalledTimes(2);
});
