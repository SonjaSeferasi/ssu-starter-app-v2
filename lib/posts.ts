import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveMediaUrl } from './media';

/** Row shape returned by the socialu_campus_feed/socialu_friends_feed/socialu_create_post RPCs. */
export type RawFeedRow = {
  post_id: number;
  author_id: number;
  text_content: string | null;
  visibility: 'public' | 'friends_only';
  published_at: string;
  edited_at: string | null;
  author_name: string;
  author_photo_key: string | null;
  photo_keys: string[];
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

export async function shapeFeedPosts(supabase: SupabaseClient<any, any, any>, rows: RawFeedRow[]): Promise<FeedPost[]> {
  return Promise.all(
    rows.map(async (row) => {
      const authorPhotoUrl = await resolveMediaUrl(supabase, row.author_photo_key);
      const photos = await Promise.all((row.photo_keys ?? []).map((key) => resolveMediaUrl(supabase, key)));

      return {
        postId: row.post_id,
        authorId: row.author_id,
        authorName: row.author_name,
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
