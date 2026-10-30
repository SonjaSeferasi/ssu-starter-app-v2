'use client';

import { useEffect, useRef, useState } from 'react';

// Expanded reason set vs. ReportPostModal's (which this otherwise mirrors
// exactly), per the approved plan -- anonymous content needs harassment/
// threats/doxxing called out as their own severe reasons, since
// socialu_whisper_report_confession/_comment remove on 2 distinct severe
// reports instead of the standard 5.
const REASONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'threats', label: 'Threats' },
  { value: 'private_info', label: 'Revealing private information' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
] as const;

export type WhisperReportResult = { reported: boolean; removed: boolean };

export function WhisperReportModal({
  reportUrl,
  title,
  accessToken,
  onClose,
  onReported,
}: {
  /** e.g. /api/whispers/42/report or /api/whispers/42/comments/7/report */
  reportUrl: string;
  title: string;
  accessToken: string;
  onClose: () => void;
  onReported: (result: WhisperReportResult) => void;
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
    const res = await fetch(reportUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reason }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Failed to submit this report.');
      setSubmitting(false);
      return;
    }
    onReported({ reported: body.reported, removed: body.confessionRemoved ?? body.commentRemoved ?? false });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !submitting && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whisper-report-heading"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl outline-none"
      >
        <h2 id="whisper-report-heading" className="text-lg font-semibold text-stone-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-stone-600">Why are you reporting this? Your identity will not be shared.</p>

        <div className="mt-4 space-y-2">
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
              <input
                type="radio"
                name="whisper-report-reason"
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
            {submitting ? 'Reporting…' : 'Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
