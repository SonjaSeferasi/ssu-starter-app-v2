'use client';

import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { timeAgo } from './time';
import { CommentComposer } from './CommentComposer';
import type { Comment } from './types';

// Replying to Comments is a separate feature (no SRS number -- see the
// implementation report), reusing CommentItem for both top-level comments
// and replies via `isReply`. Only a top-level CommentItem renders a replies
// list/composer -- a reply can never have its own nested replies list,
// since socialu_create_comment always flattens "reply to a reply" to the
// top-level comment's id (one level of visual nesting, enforced server-side).
export function CommentItem({
  comment,
  postId,
  accessToken,
  authorInitial,
  isOwnComment,
  isReply,
  replies,
  isReplyOwn,
  onReplyClick,
  targetCommentId,
  onUpdated,
  onDeleted,
  onPosted,
}: {
  comment: Comment;
  postId: number;
  accessToken: string;
  authorInitial: string;
  isOwnComment: boolean;
  isReply?: boolean;
  /** Only meaningful when !isReply -- this comment's replies, already filtered/ordered by the parent. */
  replies?: Comment[];
  /** Only meaningful when !isReply -- resolves ownership for each reply in `replies`. */
  isReplyOwn?: (reply: Comment) => boolean;
  /** Only set when isReply -- the reply's own "Reply" button can't render a
   * composer itself (only a top-level CommentItem does), so it bubbles the
   * click up to the top-level instance that owns that state instead. */
  onReplyClick?: (target: Comment) => void;
  /** SRS-313/312.10: a clicked notification links here with ?comment=<id>.
   * If this instance IS that comment, it scrolls to and highlights itself;
   * if it's a top-level comment whose OWN replies contain it, it
   * auto-expands so the target reply is actually in the DOM to scroll to. */
  targetCommentId?: number;
  onUpdated: (updated: Comment) => void;
  onDeleted: (commentId: number, tombstoned: boolean) => void;
  onPosted: (comment: Comment) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [text, setText] = useState(comment.textContent);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [justNavigatedHere, setJustNavigatedHere] = useState(false);

  const isDeleted = comment.deletedAt !== null;
  const isTarget = targetCommentId !== undefined && targetCommentId === comment.commentId;

  // Auto-expand replies if the target is this top-level comment itself or
  // one of its replies -- otherwise the target reply never mounts, and the
  // scroll-to-self effect below has nothing to find.
  useEffect(() => {
    if (!isReply && targetCommentId !== undefined) {
      if (comment.commentId === targetCommentId || (replies ?? []).some((r) => r.commentId === targetCommentId)) {
        setRepliesOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCommentId, replies]);

  // Scrolls to and briefly highlights this exact comment once it's actually
  // in the DOM -- for a reply, that's only after the effect above expanded
  // its parent, which happens in an earlier commit (a fresh mount here),
  // so this always runs after the element already exists.
  useEffect(() => {
    if (!isTarget) return;
    const el = document.getElementById(`comment-${comment.commentId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setJustNavigatedHere(true);
    const timer = setTimeout(() => setJustNavigatedHere(false), 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTarget]);

  function startEdit() {
    setText(comment.textContent);
    setError('');
    setEditing(true);
  }

  function cancelEdit() {
    // SRS-310 DoD: Cancel discards unsaved changes and makes no network request.
    setText(comment.textContent);
    setError('');
    setEditing(false);
  }

  async function saveEdit() {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/comments/${comment.commentId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ textContent: text }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error || 'Failed to save changes.');
      return;
    }
    setEditing(false);
    onUpdated(body.comment);
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  async function confirmDelete() {
    if (deleting) return; // prevent duplicate submissions on repeated clicks
    setDeleting(true);
    setError('');
    const res = await fetch(`/api/comments/${comment.commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Failed to delete comment.');
      setDeleting(false);
      setConfirmingDelete(false);
      return;
    }
    // tombstoned: this comment had replies, so it stays in the list as
    // "[deleted]" (onDeleted updates it in place) rather than being removed
    // -- which means, unlike a hard delete, this component instance does
    // NOT unmount, so its own local state (confirmingDelete/deleting) has
    // to be reset explicitly here or the confirmation box would be stuck
    // open forever underneath the now-tombstoned comment.
    setDeleting(false);
    setConfirmingDelete(false);
    onDeleted(comment.commentId, body.tombstoned);
  }

  function handlePosted(posted: Comment) {
    setReplyTarget(null);
    setRepliesOpen(true);
    onPosted(posted);
  }

  const avatarSize = isReply ? 'h-6 w-6' : 'h-8 w-8';

  return (
    <div className={`flex items-start gap-2 ${isReply ? 'ml-9 mt-2' : ''}`}>
      <div className={`flex ${avatarSize} shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800`}>
        {comment.authorPhotoUrl ? (
          <img src={comment.authorPhotoUrl} alt={comment.authorName} className="h-full w-full object-cover" />
        ) : (
          comment.authorName[0]?.toUpperCase()
        )}
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={1}
              autoFocus
              disabled={saving}
              className="w-full resize-none rounded-2xl border-0 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
            />
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || !text.trim()}
                className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : isDeleted ? (
          <div id={`comment-${comment.commentId}`} className="rounded-2xl bg-stone-50 px-3 py-2">
            <p className="text-xs font-semibold text-stone-400">{comment.authorName}</p>
            <p className="text-sm italic text-stone-400">This comment was deleted.</p>
          </div>
        ) : (
          <div
            id={`comment-${comment.commentId}`}
            className={`rounded-2xl bg-stone-50 px-3 py-2 transition ${justNavigatedHere ? 'ring-2 ring-emerald-400' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-stone-900">{comment.authorName}</p>
              {isOwnComment ? (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Comment options"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200"
                  >
                    ⋮
                  </button>
                  {menuOpen ? (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div role="menu" className="absolute right-0 top-6 z-20 w-32 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                        <button
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            startEdit();
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-50"
                        >
                          Edit Comment
                        </button>
                        <button
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            setConfirmingDelete(true);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete Comment
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-sm text-stone-800">{comment.textContent}</p>
          </div>
        )}

        {!editing ? (
          <div className="mt-1 flex items-center gap-3 pl-3 text-xs text-stone-500">
            <span title={new Date(comment.createdAt).toLocaleString()}>
              {timeAgo(comment.createdAt)}
              {comment.editedAt ? ' · Edited' : ''}
            </span>
            {!isDeleted ? (
              <button
                type="button"
                onClick={() =>
                  onReplyClick
                    ? onReplyClick(comment)
                    : setReplyTarget((prev) => (prev?.commentId === comment.commentId ? null : comment))
                }
                className="font-medium text-stone-500 hover:text-emerald-700"
              >
                Reply
              </button>
            ) : null}
          </div>
        ) : null}

        {confirmingDelete ? (
          <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
            <p className="flex-1 text-xs text-red-700">Delete this comment?</p>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ) : null}

        {/* Only a top-level comment renders its own replies -- a reply's
            own "Reply" button (above) still works, it just sets replyTarget
            up here at the top level instead of opening a second composer. */}
        {!isReply ? (
          <>
            {replies && replies.length > 0 ? (
              <button
                type="button"
                onClick={() => setRepliesOpen((v) => !v)}
                className="mt-2 pl-3 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                {repliesOpen ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
              </button>
            ) : null}

            {repliesOpen
              ? (replies ?? []).map((reply) => (
                  <CommentItem
                    key={reply.commentId}
                    comment={reply}
                    postId={postId}
                    accessToken={accessToken}
                    authorInitial={authorInitial}
                    isOwnComment={isReplyOwn ? isReplyOwn(reply) : false}
                    isReply
                    onReplyClick={(target) => setReplyTarget((prev) => (prev?.commentId === target.commentId ? null : target))}
                    targetCommentId={targetCommentId}
                    onUpdated={onUpdated}
                    onDeleted={onDeleted}
                    onPosted={onPosted}
                  />
                ))
              : null}

            {replyTarget ? (
              <div className="ml-9 mt-2">
                <CommentComposer
                  postId={postId}
                  accessToken={accessToken}
                  authorInitial={authorInitial}
                  parentCommentId={replyTarget.commentId}
                  initialText={replyTarget.commentId === comment.commentId ? '' : `@${replyTarget.authorName} `}
                  placeholder="Write a reply…"
                  autoFocus
                  onPosted={handlePosted}
                  onCancel={() => setReplyTarget(null)}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
