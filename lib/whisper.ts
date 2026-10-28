import type { SupabaseClient } from '@supabase/supabase-js';
import { shapeMentions, type RawMention, type Mention } from './posts';

// The Whisper Wall, additional functionality not in the official SRS (see
// the approved plan). Deliberately NOT reusing lib/posts.ts's FeedPost/
// shapeFeedPosts -- confessions have no author identity to shape (that's
// the point) and no photos -- except shapeMentions/RawMention/Mention,
// which are pure, generic, identity-free shaping utilities already
// reusable as-is.

export type WhisperCategory = 'funny' | 'campus_crush' | 'embarrassing' | 'rant' | 'advice' | 'unpopular_opinion';
export type WhisperReaction = 'funny' | 'support' | 'shocked' | 'love' | 'sad' | 'fire';
export type WhisperSort = 'latest' | 'trending' | 'most_discussed';

export type RawConfessionRow = {
  confession_id: number;
  category: WhisperCategory;
  text_content: string;
  created_at: string;
  is_own: boolean;
  reaction_counts: Record<WhisperReaction, number>;
  my_reaction: WhisperReaction | null;
  comment_count: number;
};

export type Confession = {
  confessionId: number;
  category: WhisperCategory;
  textContent: string;
  createdAt: string;
  isOwn: boolean;
  reactionCounts: Record<WhisperReaction, number>;
  myReaction: WhisperReaction | null;
  commentCount: number;
};

export function shapeConfession(row: RawConfessionRow): Confession {
  return {
    confessionId: row.confession_id,
    category: row.category,
    textContent: row.text_content,
    createdAt: row.created_at,
    isOwn: row.is_own,
    reactionCounts: row.reaction_counts,
    myReaction: row.my_reaction,
    commentCount: row.comment_count,
  };
}

export function shapeConfessions(rows: RawConfessionRow[]): Confession[] {
  return rows.map(shapeConfession);
}

export type RawWhisperCommentRow = {
  comment_id: number;
  confession_id: number;
  parent_comment_id: number | null;
  text_content: string;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  is_own: boolean;
  is_op: boolean;
  alias_label: string;
  mentions?: RawMention[];
  reaction_counts: Record<WhisperReaction, number>;
  my_reaction: WhisperReaction | null;
};

export type WhisperComment = {
  commentId: number;
  confessionId: number;
  parentCommentId: number | null;
  textContent: string;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  isOwn: boolean;
  isOp: boolean;
  aliasLabel: string;
  mentions: Mention[];
  reactionCounts: Record<WhisperReaction, number>;
  myReaction: WhisperReaction | null;
};

export async function shapeWhisperComment(supabase: SupabaseClient<any, any, any>, row: RawWhisperCommentRow): Promise<WhisperComment> {
  return {
    commentId: row.comment_id,
    confessionId: row.confession_id,
    parentCommentId: row.parent_comment_id,
    textContent: row.text_content,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    isDeleted: row.is_deleted,
    isOwn: row.is_own,
    isOp: row.is_op,
    aliasLabel: row.alias_label,
    mentions: await shapeMentions(supabase, row.mentions),
    reactionCounts: row.reaction_counts,
    myReaction: row.my_reaction,
  };
}

export async function shapeWhisperComments(supabase: SupabaseClient<any, any, any>, rows: RawWhisperCommentRow[]): Promise<WhisperComment[]> {
  return Promise.all(rows.map((row) => shapeWhisperComment(supabase, row)));
}
