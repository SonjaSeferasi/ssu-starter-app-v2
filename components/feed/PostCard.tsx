import { PostAuthor } from './PostAuthor';
import { PostMedia } from './PostMedia';
import type { FeedPost } from './types';

export function PostCard({ post }: { post: FeedPost }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <PostAuthor
        name={post.authorName}
        photoUrl={post.authorPhotoUrl}
        publishedAt={post.publishedAt}
        editedAt={post.editedAt}
        visibility={post.visibility}
      />
      {post.textContent ? <p className="mt-3 whitespace-pre-wrap text-[15px] text-stone-800">{post.textContent}</p> : null}
      <PostMedia photos={post.photos} />
    </article>
  );
}
