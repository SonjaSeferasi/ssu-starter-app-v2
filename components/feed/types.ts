import type { Reaction } from '../../lib/reactions';

export type FeedPhoto = {
  assetId: number;
  url: string;
};

/** A verified @mention: studentId is the stable identity used for the link,
 * matchedUsername is the exact "@text" the author typed (frozen historically,
 * used to find the right substring in textContent), username/name/photoUrl
 * are the mentioned student's CURRENT profile info. */
export type Mention = {
  studentId: number;
  matchedUsername: string;
  username: string;
  name: string;
  photoUrl: string | null;
};

/** Share (additional functionality): the embedded original post inside a
 * repost, re-resolved fresh against the current viewer on every read.
 * null either because this isn't a repost, or the original is no longer
 * accessible right now -- isRepost on the outer post disambiguates. */
export type RepostOf = {
  postId: number;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorPhotoUrl: string | null;
  publishedAt: string;
  textContent: string | null;
  photos: FeedPhoto[];
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
  isRepost: boolean;
  repostOf: RepostOf | null;
  likeCount: number;
  isLikedByViewer: boolean;
  reactionCounts: Record<Reaction, number>;
  myReaction: Reaction | null;
  commentCount: number;
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
