'use client';

import { useEffect, useRef, useState } from 'react';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
] as const;

export type ReportResult = { reported: boolean; postRemoved: boolean };

// Additional functionality beyond SRS-314's literal text (which never
// mentions a reason) -- reusing the same confirmation-modal shape as
// DeletePostModal for visual consistency.
export function ReportPostModal({
  postId,
  accessToken,
  onClose,
  onReported,
}: {
  postId: number;
  accessToken: string;
  onClose: () => void;
  onReported: (result: ReportResult) => void;
}) {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, submitting]);

  async function handleSubmit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/posts/${postId}/report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reason }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Failed to report post.');
      setSubmitting(false);
      return;
    }
    onReported({ reported: body.reported, postRemoved: body.postRemoved });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !submitting && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-post-heading"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl outline-none"
      >
        <h2 id="report-post-heading" className="text-lg font-semibold text-stone-900">
          Report post
        </h2>
        <p className="mt-2 text-sm text-stone-600">Why are you reporting this post? Your identity will not be shared.</p>

        <div className="mt-4 space-y-2">
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                disabled={submitting}
                className="h-4 w-4"
              />
              {r.label}
            </label>
          ))}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? 'Reporting…' : 'Report Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
