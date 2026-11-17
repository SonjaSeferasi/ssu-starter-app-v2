import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    // Auth, session guards and owner/viewer permissions must read current state.
    // Next's server fetch cache can otherwise reuse an earlier RPC permission.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    auth: {
      persistSession: false,
    },
  });
}
