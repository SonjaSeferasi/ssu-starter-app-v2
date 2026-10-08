import { createClient } from '@supabase/supabase-js';

/**
 * Client scoped to the `socialu` Postgres schema (supabase/schema.sql), where
 * posts/friendships/students live. Separate from getSupabaseClient() in
 * lib/supabase.ts, which talks to the legacy public-schema auth scaffold.
 */
export function getSocialuClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    db: { schema: 'socialu' },
  });
}

/**
 * TEMPORARY STUB — Linh owns real authentication (SRS-100/101) against the
 * `students` + `login_sessions` tables, which isn't built yet. Until then,
 * the current student is read directly from an `x-student-id` header instead
 * of a real session token, so feed/post endpoints can be built and tested
 * end-to-end. Replace this with Linh's session lookup once it lands —
 * callers only depend on the returned studentId, not on how it's resolved.
 */
export function getCurrentStudentId(request: Request): number | null {
  const header = request.headers.get('x-student-id');
  if (!header) return null;
  const studentId = Number(header);
  return Number.isInteger(studentId) && studentId > 0 ? studentId : null;
}
