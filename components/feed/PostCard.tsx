'use client';

import { useState } from 'react';
import { PostAuthor } from './PostAuthor';
import { PostMedia } from './PostMedia';
import { EditPostModal } from './EditPostModal';
import { DeletePostModal } from './DeletePostModal';
import { LikeButton } from './LikeButton';
import { CommentSection } from './CommentSection';
import type { FeedPost } from './types';

export function PostCard({
  post,
  accessToken,
  isOwnPost,
  authorInitial,
  currentStudentId,
  onUpdated,
  onDeleted,
}: {
  post: FeedPost;
  accessToken: string;
  isOwnPost: boolean;
  authorInitial: string;
  currentStudentId: number | null;
  onUpdated: (updated: FeedPost) => void;
  onDeleted: (postId: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <article className="relative rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <PostAuthor
          name={post.authorName}
          photoUrl={post.authorPhotoUrl}
          publishedAt={post.publishedAt}
          editedAt={post.editedAt}
          visibility={post.visibility}
        />

        {/* SRS-306.1/307.1: Edit Post and Delete Post are only ever shown to the post's own author. */}
        {isOwnPost ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Post options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
            >
              ⋮
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                  >
                    Edit Post
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleting(true);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete Post
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {post.textContent ? <p className="mt-3 whitespace-pre-wrap text-[15px] text-stone-800">{post.textContent}</p> : null}
      <PostMedia photos={post.photos} />

      {/* Share/Save are still visual prep only — not built yet. */}
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-stone-400">
        <div className="flex items-center gap-5">
          <LikeButton post={post} accessToken={accessToken} onUpdated={onUpdated} />
          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            aria-expanded={commentsOpen}
            className="flex items-center gap-1.5 text-sm text-stone-400 transition hover:text-stone-600"
          >
            <span aria-hidden="true">💬</span>
            <span>{post.commentCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm">↗ Share</span>
        </div>
        <span className="text-sm">🔖</span>
      </div>

      {commentsOpen ? (
        <CommentSection
          postId={post.postId}
          accessToken={accessToken}
          authorInitial={authorInitial}
          currentStudentId={currentStudentId}
          onCountChange={(count) => onUpdated({ ...post, commentCount: count })}
        />
      ) : null}

      {editing ? (
        <EditPostModal
          post={post}
          accessToken={accessToken}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onUpdated(updated);
          }}
        />
      ) : null}

      {deleting ? (
        <DeletePostModal
          postId={post.postId}
          accessToken={accessToken}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false);
            onDeleted(post.postId);
          }}
        />
      ) : null}
    </article>
  );
}
