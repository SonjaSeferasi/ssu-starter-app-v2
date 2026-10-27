import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveMediaUrl } from './media';

/** Row shape of one verified mention (socialu.post_mentions/comment_mentions,
 * joined fresh against the current student row every read -- username/name/
 * photo_key always reflect the mentioned student's CURRENT profile, even
 * though matched_username is frozen to whatever text was actually typed. */
export type RawMention = {
  student_id: number;
  matched_username: string;
  username: string;
  name: string;
  photo_key: string | null;
};

export type Mention = {
  studentId: number;
  matchedUsername: string;
  username: string;
  name: string;
  photoUrl: string | null;
};

/** Row shape returned by the socialu_campus_feed/socialu_friends_feed/socialu_create_post/socialu_update_post RPCs. */
export type RawFeedRow = {
  post_id: number;
  author_id: number;
  text_content: string | null;
  visibility: 'public' | 'friends_only';
  published_at: string;
  edited_at: string | null;
  author_name: string;
  author_username?: string | null;
  author_photo_key: string | null;
  photos: { asset_id: number; storage_key: string }[];
  mentions?: RawMention[];
  like_count: number;
  is_liked_by_viewer: boolean;
  comment_count: number;
};

export type FeedPhoto = {
  assetId: number;
  url: string;
};

export type FeedPost = {
  postId: number;
  authorId: number;
  authorName: string;
  authorUsername?: string | null;
  authorPhotoUrl: string | null;
  textContent: string | null;
  visibility: 'public' | 'friends_only';
  publishedAt: string;
  editedAt: string | null;
  photos: FeedPhoto[];
  mentions: Mention[];
  likeCount: number;
  isLikedByViewer: boolean;
  commentCount: number;
};

export async function shapeMentions(supabase: SupabaseClient<any, any, any>, rows: RawMention[] | undefined): Promise<Mention[]> {
  return Promise.all(
    (rows ?? []).map(async (row) => ({
      studentId: row.student_id,
      matchedUsername: row.matched_username,
      username: row.username,
      name: row.name,
      photoUrl: await resolveMediaUrl(supabase, row.photo_key),
    }))
  );
}

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
        authorUsername: row.author_username ?? null,
        authorPhotoUrl,
        textContent: row.text_content,
        visibility: row.visibility,
        publishedAt: row.published_at,
        editedAt: row.edited_at,
        photos: photosWithNulls.filter((p): p is FeedPhoto => p !== null),
        mentions: await shapeMentions(supabase, row.mentions),
        likeCount: row.like_count,
        isLikedByViewer: row.is_liked_by_viewer,
        commentCount: row.comment_count,
      };
    })
  );
}
