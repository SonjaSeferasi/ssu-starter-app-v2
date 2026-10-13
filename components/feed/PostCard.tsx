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

      {/* Visual prep only — liking/commenting/sharing (SRS-308+) isn't built yet. */}
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-stone-400">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-sm">♡ Like</span>
          <span className="flex items-center gap-1.5 text-sm">💬 Comment</span>
          <span className="flex items-center gap-1.5 text-sm">↗ Share</span>
        </div>
        <span className="text-sm">🔖</span>
      </div>
    </article>
  );
}
