import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveMediaUrl } from './media';
import { shapeMentions, type Mention, type RawMention } from './posts';
import type { Reaction } from './reactions';

/** Row shape returned by socialu_list_comments/socialu_create_comment/socialu_update_comment. */
export type RawCommentRow = {
  comment_id: number;
  post_id: number;
  author_id: number;
  text_content: string;
  created_at: string;
  edited_at: string | null;
  parent_comment_id: number | null;
  deleted_at: string | null;
  author_name: string;
  author_photo_key: string | null;
  mentions?: RawMention[];
  reaction_counts: Record<Reaction, number>;
  my_reaction: Reaction | null;
};

export type Comment = {
  commentId: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorPhotoUrl: string | null;
  textContent: string;
  createdAt: string;
  editedAt: string | null;
  parentCommentId: number | null;
  deletedAt: string | null;
  mentions: Mention[];
  reactionCounts: Record<Reaction, number>;
  myReaction: Reaction | null;
};

export async function shapeComments(supabase: SupabaseClient<any, any, any>, rows: RawCommentRow[]): Promise<Comment[]> {
  return Promise.all(
    rows.map(async (row) => ({
      commentId: row.comment_id,
      postId: row.post_id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorPhotoUrl: await resolveMediaUrl(supabase, row.author_photo_key),
      textContent: row.text_content,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      parentCommentId: row.parent_comment_id,
      deletedAt: row.deleted_at,
      mentions: await shapeMentions(supabase, row.mentions),
      reactionCounts: row.reaction_counts,
      myReaction: row.my_reaction,
    }))
  );
}
