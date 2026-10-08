import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * PLACEHOLDER bucket name — no team decision on Supabase Storage bucket
 * naming/layout exists yet (media_assets is LN's provisionally-coordinated
 * shared table). Centralized here so it's a one-line change once the team
 * agrees. storage_key is the full private object path within this bucket.
 */
const MEDIA_BUCKET = 'media';

/** Signed URL lifetime for displaying private post photos in a feed response. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function resolveMediaUrl(
  supabase: SupabaseClient<any, any, any>,
  storageKey: string | null | undefined
): Promise<string | null> {
  if (!storageKey) return null;
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storageKey, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}
