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
