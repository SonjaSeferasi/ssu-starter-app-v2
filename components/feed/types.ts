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
