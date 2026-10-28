'use client';

import { useState } from 'react';
import { timeAgo } from '../feed/time';
import { MentionText } from '../feed/MentionText';
import { WhisperCommentComposer } from './WhisperCommentComposer';
import { WhisperReportModal, type WhisperReportResult } from './WhisperReportModal';
import { ReactionButton } from './ReactionButton';
import type { WhisperComment, WhisperReaction } from './types';

// Forked from CommentItem rather than reusing it directly -- there's no
// author identity here to compare/display (that's the point), so the
// "own comment" / "which name to show" logic this needs is structurally
// different, not just a reskin. Only one level of reply nesting, same
// server-enforced flattening as regular comments.
export function WhisperCommentItem({
  comment,
  confessionId,
  accessToken,
  allowMentions,
  isReply,
  replies,
  onReplyClick,
  onUpdated,
  onDeleted,
  onPosted,
}: {
  comment: WhisperComment;
  confessionId: number;
  accessToken: string;
  allowMentions: boolean;
  isReply?: boolean;
  replies?: WhisperComment[];
  onReplyClick?: (target: WhisperComment) => void;
  onUpdated: (updated: WhisperComment) => void;
  onDeleted: (commentId: number, tombstoned: boolean) => void;
  onPosted: (comment: WhisperComment) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.textContent);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<WhisperComment | null>(null);

  const isDeleted = comment.isDeleted;

  function startEdit() {
    setText(comment.textContent);
    setError('');
    setEditing(true);
  }

  function cancelEdit() {
    setText(comment.textContent);
    setError('');
    setEditing(false);
  }

  async function saveEdit() {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/whispers/${confessionId}/comments/${comment.commentId}`, {
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

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError('');
    const res = await fetch(`/api/whispers/${confessionId}/comments/${comment.commentId}`, {
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
    setDeleting(false);
    setConfirmingDelete(false);
    onDeleted(comment.commentId, body.tombstoned);
  }

  function handleReported(result: WhisperReportResult) {
    setReporting(false);
    setNotice(result.reported ? 'Comment reported. Thank you for helping keep the Whisper Wall safe.' : "You've already reported this comment.");
    setTimeout(() => setNotice(''), 4000);
  }

  function handlePosted(posted: WhisperComment) {
    setReplyTarget(null);
    setRepliesOpen(true);
    onPosted(posted);
  }

  function handleReactionChanged(reactionCounts: Record<WhisperReaction, number>, myReaction: WhisperReaction | null) {
    onUpdated({ ...comment, reactionCounts, myReaction });
  }

  const avatarSize = isReply ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm';

  return (
    <div className={`flex items-start gap-2 ${isReply ? 'ml-9 mt-2' : ''}`}>
      <div className={`flex ${avatarSize} shrink-0 items-center justify-center rounded-full bg-indigo-100`} aria-hidden="true">
        👻
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              autoFocus
              disabled={saving}
              maxLength={300}
              className="w-full resize-none rounded-2xl border-0 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
            />
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
            <div className="mt-1.5 flex justify-end gap-2">
              <button type="button" onClick={cancelEdit} disabled={saving} className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={saving || !text.trim()} className="rounded-full bg-indigo-700 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : isDeleted ? (
          <div className="rounded-2xl bg-stone-50 px-3 py-2">
            <p className="text-xs font-semibold text-stone-400">{comment.aliasLabel}</p>
            <p className="text-sm italic text-stone-400">This comment was removed.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-stone-50 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-xs font-semibold ${comment.isOp ? 'text-indigo-700' : 'text-stone-900'}`}>{comment.aliasLabel}</p>
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
                    <div role="menu" className="absolute right-0 top-6 z-20 w-36 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                      {comment.isOwn ? (
                        <>
                          <button role="menuitem" onClick={() => { setMenuOpen(false); startEdit(); }} className="block w-full px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-50">
                            Edit Comment
                          </button>
                          <button role="menuitem" onClick={() => { setMenuOpen(false); setConfirmingDelete(true); }} className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50">
                            Delete Comment
                          </button>
                        </>
                      ) : (
                        <button role="menuitem" onClick={() => { setMenuOpen(false); setReporting(true); }} className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50">
                          Report Comment
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-stone-800">
              <MentionText text={comment.textContent} mentions={comment.mentions} />
            </p>
          </div>
        )}

        {notice ? <p className="mt-1 pl-3 text-xs text-stone-500">{notice}</p> : null}

        {!editing ? (
          <div className="mt-1 flex flex-wrap items-center gap-3 pl-3 text-xs text-stone-500">
            <span title={new Date(comment.createdAt).toLocaleString()}>
              {timeAgo(comment.createdAt)}
              {comment.editedAt ? ' · Edited' : ''}
            </span>
            {!isDeleted ? (
              <ReactionButton
                reactUrl={`/api/whispers/${confessionId}/comments/${comment.commentId}/reactions`}
                accessToken={accessToken}
                reactionCounts={comment.reactionCounts}
                myReaction={comment.myReaction}
                onChanged={handleReactionChanged}
              />
            ) : null}
            {!isDeleted ? (
              <button
                type="button"
                onClick={() => (onReplyClick ? onReplyClick(comment) : setReplyTarget((prev) => (prev?.commentId === comment.commentId ? null : comment)))}
                className="font-medium text-stone-500 hover:text-indigo-700"
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
            <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} disabled={deleting} className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ) : null}

        {!isReply ? (
          <>
            {replies && replies.length > 0 ? (
              <button type="button" onClick={() => setRepliesOpen((v) => !v)} className="mt-2 pl-3 text-xs font-medium text-indigo-700 hover:text-indigo-800">
                {repliesOpen ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
              </button>
            ) : null}

            {repliesOpen
              ? (replies ?? []).map((reply) => (
                  <WhisperCommentItem
                    key={reply.commentId}
                    comment={reply}
                    confessionId={confessionId}
                    accessToken={accessToken}
                    allowMentions={allowMentions}
                    isReply
                    onReplyClick={(target) => setReplyTarget((prev) => (prev?.commentId === target.commentId ? null : target))}
                    onUpdated={onUpdated}
                    onDeleted={onDeleted}
                    onPosted={onPosted}
                  />
                ))
              : null}

            {replyTarget ? (
              <div className="ml-9 mt-2">
                <WhisperCommentComposer
                  confessionId={confessionId}
                  accessToken={accessToken}
                  allowMentions={allowMentions}
                  parentCommentId={replyTarget.commentId}
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

      {reporting ? (
        <WhisperReportModal
          reportUrl={`/api/whispers/${confessionId}/comments/${comment.commentId}/report`}
          title="Report comment"
          accessToken={accessToken}
          onClose={() => setReporting(false)}
          onReported={handleReported}
        />
      ) : null}
    </div>
  );
}
