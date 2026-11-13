import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveMediaUrl } from './media';

// UR-405: one Trending entry, as returned by socialu_trending_posts (20261113150000_trending_posts.sql).
export type RawTrendingRow = {
  post_id: number;
  author_id: number;
  author_name: string;
  author_username: string | null;
  author_photo_key: string | null;
  published_at: string;
  is_repost: boolean;
  text_content: string | null;
  photo_key: string | null;
  recent_like_count: number;
};

// SRS-405.5: the author, a text or photo preview, and the recent-like count.
export type TrendingPost = {
  postId: number;
  authorName: string;
  authorUsername: string | null;
  authorPhotoUrl: string | null;
  publishedAt: string;
  isRepost: boolean;
  textPreview: string | null;
  photoUrl: string | null;
  recentLikeCount: number;
};

export const TRENDING_PREVIEW_LENGTH = 120;

// The post's text on one line, cut at a word boundary when it is long.
export function previewText(text: string | null | undefined, max = TRENDING_PREVIEW_LENGTH) {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export async function shapeTrendingPosts(supabase: SupabaseClient<any, any, any>, rows: RawTrendingRow[]): Promise<TrendingPost[]> {
  return Promise.all(rows.map(async (row) => ({
    postId: row.post_id,
    authorName: row.author_name,
    authorUsername: row.author_username ?? null,
    authorPhotoUrl: await resolveMediaUrl(supabase, row.author_photo_key),
    publishedAt: row.published_at,
    isRepost: Boolean(row.is_repost),
    textPreview: previewText(row.text_content),
    photoUrl: await resolveMediaUrl(supabase, row.photo_key),
    recentLikeCount: Number(row.recent_like_count),
  })));
}
