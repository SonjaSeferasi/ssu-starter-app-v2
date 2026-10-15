import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveMediaUrl } from './media';

/** Row shape returned by the socialu_campus_feed/socialu_friends_feed/socialu_create_post/socialu_update_post RPCs. */
export type RawFeedRow = {
  post_id: number;
  author_id: number;
  text_content: string | null;
  visibility: 'public' | 'friends_only';
  published_at: string;
  edited_at: string | null;
  author_name: string;
  author_photo_key: string | null;
  photos: { asset_id: number; storage_key: string }[];
  like_count: number;
  is_liked_by_viewer: boolean;
};

export type FeedPhoto = {
  assetId: number;
  url: string;
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
  photos: FeedPhoto[];
  likeCount: number;
  isLikedByViewer: boolean;
};

export async function shapeFeedPosts(supabase: SupabaseClient<any, any, any>, rows: RawFeedRow[]): Promise<FeedPost[]> {
  return Promise.all(
    rows.map(async (row) => {
      const authorPhotoUrl = await resolveMediaUrl(supabase, row.author_photo_key);
      const photosWithNulls = await Promise.all(
        (row.photos ?? []).map(async (p) => {
          const url = await resolveMediaUrl(supabase, p.storage_key);
          return url ? { assetId: p.asset_id, url } : null;
        })
      );

      return {
        postId: row.post_id,
        authorId: row.author_id,
        authorName: row.author_name,
        authorPhotoUrl,
        textContent: row.text_content,
        visibility: row.visibility,
        publishedAt: row.published_at,
        editedAt: row.edited_at,
        photos: photosWithNulls.filter((p): p is FeedPhoto => p !== null),
        likeCount: row.like_count,
        isLikedByViewer: row.is_liked_by_viewer,
      };
    })
  );
}
