'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { timeAgo } from './time';
import type { Comment } from './types';

export function CommentItem({
  comment,
  accessToken,
  isOwnComment,
  onUpdated,
  onDeleted,
}: {
  comment: Comment;
  accessToken: string;
  isOwnComment: boolean;
  onUpdated: (updated: Comment) => void;
  onDeleted: (commentId: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [text, setText] = useState(comment.textContent);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

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
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Failed to delete comment.');
      setDeleting(false);
      setConfirmingDelete(false);
      return;
    }
    onDeleted(comment.commentId);
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
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
        ) : (
          <div className="rounded-2xl bg-stone-50 px-3 py-2">
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
          <p className="mt-1 pl-3 text-xs text-stone-500">
            {timeAgo(comment.createdAt)}
            {comment.editedAt ? ' · Edited' : ''}
          </p>
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
      </div>
    </div>
  );
}
