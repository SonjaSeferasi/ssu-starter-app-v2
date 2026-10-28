'use client';

import { useState } from 'react';
import { timeAgo } from '../feed/time';
import { ConfessionReactions } from './ConfessionReactions';
import { WhisperCommentSection } from './WhisperCommentSection';
import { WhisperReportModal, type WhisperReportResult } from './WhisperReportModal';
import { CATEGORIES } from './types';
import type { Confession, WhisperReaction } from './types';

export function ConfessionCard({
  confession,
  accessToken,
  onUpdated,
  onDeleted,
}: {
  confession: Confession;
  accessToken: string;
  onUpdated: (updated: Confession) => void;
  onDeleted: (confessionId: number) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(confession.commentCount);

  const category = CATEGORIES.find((c) => c.id === confession.category);

  function handleReactionChanged(reactionCounts: Record<WhisperReaction, number>, myReaction: WhisperReaction | null) {
    onUpdated({ ...confession, reactionCounts, myReaction });
  }

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError('');
    const res = await fetch(`/api/whispers/${confession.confessionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Failed to delete confession.');
      setDeleting(false);
      setConfirmingDelete(false);
      return;
    }
    onDeleted(confession.confessionId);
  }

  function handleReported(result: WhisperReportResult) {
    setReporting(false);
    if (result.removed) {
      onDeleted(confession.confessionId);
      return;
    }
    setNotice(result.reported ? 'Confession reported. Thank you for helping keep the Whisper Wall safe.' : "You've already reported this confession.");
    setTimeout(() => setNotice(''), 4000);
  }

  return (
    <article className="relative rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${category ? category.bg : 'bg-stone-100'}`}
            aria-hidden="true"
          >
            👻
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900">Anonymous Student</p>
            <p className="text-xs text-stone-500">
              Confession #{String(confession.confessionId).padStart(4, '0')} · {timeAgo(confession.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {category ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${category.bg} ${category.text}`}>
              <span aria-hidden="true">{category.emoji}</span> {category.label}
            </span>
          ) : null}
          {confession.isOwn ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete confession"
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
            >
              ⋮
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[15px] text-stone-800">{confession.textContent}</p>

      {notice ? <p className="mt-2 text-xs text-stone-500">{notice}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {confirmingDelete ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
          <p className="flex-1 text-xs text-red-700">Delete this confession? This also removes its comments and reactions.</p>
          <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={confirmDelete} disabled={deleting} className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
        <div className="flex items-center gap-4">
          <ConfessionReactions
            confessionId={confession.confessionId}
            accessToken={accessToken}
            reactionCounts={confession.reactionCounts}
            myReaction={confession.myReaction}
            onChanged={handleReactionChanged}
          />
          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            aria-expanded={commentsOpen}
            className="flex items-center gap-1.5 text-sm text-stone-400 transition hover:text-stone-600"
          >
            <span aria-hidden="true">💬</span>
            <span>{commentCount} comments</span>
          </button>
        </div>

        {!confession.isOwn ? (
          <button
            type="button"
            onClick={() => setReporting(true)}
            className="flex items-center gap-1 text-xs font-medium text-red-500 transition hover:text-red-700"
          >
            <span aria-hidden="true">🚩</span> Report
          </button>
        ) : null}
      </div>

      {commentsOpen ? (
        <WhisperCommentSection
          confessionId={confession.confessionId}
          accessToken={accessToken}
          allowMentions={confession.category === 'campus_crush'}
          onCountChange={setCommentCount}
        />
      ) : null}

      {reporting ? (
        <WhisperReportModal
          reportUrl={`/api/whispers/${confession.confessionId}/report`}
          title="Report confession"
          accessToken={accessToken}
          onClose={() => setReporting(false)}
          onReported={handleReported}
        />
      ) : null}
    </article>
  );
}
