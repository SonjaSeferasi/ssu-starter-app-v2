/** Row shape returned by socialu_list_notifications (SRS-312 Like notifications + SRS-313 Comment notifications). */
export type RawNotificationRow = {
  kind: 'post_like' | 'post_comment' | 'comment_reply';
  post_id: number;
  /** Set for post_comment/comment_reply (the exact comment/reply to navigate to); null for post_like. */
  comment_id: number | null;
  latest_at: string;
  /** >1 only for post_like (grouped); always 1 for post_comment/comment_reply (SRS-313 has no grouping requirement). */
  actor_count: number;
  visibility: 'public' | 'friends_only';
  actor_names: string[];
};

export type Notification = {
  kind: 'post_like' | 'post_comment' | 'comment_reply';
  postId: number;
  commentId: number | null;
  latestAt: string;
  actorCount: number;
  visibility: 'public' | 'friends_only';
  actorNames: string[];
};

export function shapeNotifications(rows: RawNotificationRow[]): Notification[] {
  return rows.map((row) => ({
    kind: row.kind,
    postId: row.post_id,
    commentId: row.comment_id,
    latestAt: row.latest_at,
    actorCount: row.actor_count,
    visibility: row.visibility,
    actorNames: row.actor_names,
  }));
}
