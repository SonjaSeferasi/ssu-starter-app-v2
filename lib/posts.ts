import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveMediaUrl } from './media';

/** Shared select shape for SRS-301/302/305: everything a feed post card needs. */
export const POST_CARD_SELECT = `
  post_id,
  author_id,
  text_content,
  visibility,
  published_at,
  edited_at,
  students (
    full_name,
    student_profiles ( display_name, media_assets ( storage_key ) )
  ),
  post_photos ( media_assets ( storage_key ) )
`;

type RawFeedPost = {
  post_id: number;
  author_id: number;
  text_content: string | null;
  visibility: 'public' | 'friends_only';
  published_at: string;
  edited_at: string | null;
  students: {
    full_name: string;
    student_profiles: { display_name: string | null; media_assets: { storage_key: string } | null } | null;
  } | null;
  post_photos: { media_assets: { storage_key: string } | null }[] | null;
};

export type FeedPost = {
  postId: number;
  authorId: number;
  authorName: string;
  authorPhotoUrl: string | null;
  textContent: string | null;
  visibility: 'public' | 'friends_only';
  publishedAt: string;
  editedAt: string | null;
  photos: string[];
};

export async function shapeFeedPosts(supabase: SupabaseClient<any, any, any>, rows: RawFeedPost[]): Promise<FeedPost[]> {
  return Promise.all(
    rows.map(async (row) => {
      const profile = row.students?.student_profiles ?? null;
      const authorPhotoUrl = await resolveMediaUrl(supabase, profile?.media_assets?.storage_key);
      const photoKeys = (row.post_photos ?? []).map((p) => p.media_assets?.storage_key).filter(Boolean) as string[];
      const photos = await Promise.all(photoKeys.map((key) => resolveMediaUrl(supabase, key)));

      return {
        postId: row.post_id,
        authorId: row.author_id,
        authorName: profile?.display_name || row.students?.full_name || 'Unknown student',
        authorPhotoUrl,
        textContent: row.text_content,
        visibility: row.visibility,
        publishedAt: row.published_at,
        editedAt: row.edited_at,
        photos: photos.filter((url): url is string => url !== null),
      };
    })
  );
}
