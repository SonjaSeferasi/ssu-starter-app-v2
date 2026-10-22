'use client';

import { useEffect, useRef, useState } from 'react';
import { codePointLength, DP_TEXT_LIMIT, guestbookPage, guestbookPageCount } from '../../lib/dormspace-rules';
import { dormApi } from './shared';
import styles from './dormspace.module.css';

type Note = { id: string; text: string; author: string; createdAt: string; mine: boolean };
type Book = { isOwner: boolean; canWrite: boolean; welcome: string; visitCount: number; notes: Note[] };

function Counter({ text }: { text: string }) {
  const length = codePointLength(text);
  return <span className={styles.status} aria-live="polite">{length}/{DP_TEXT_LIMIT}{length > DP_TEXT_LIMIT ? ' — too long' : ''}</span>;
}

export function Guestbook({ owner, onClose, onDenied }: { owner: string; onClose: () => void; onDenied: (message: string) => void }) {
  const [book, setBook] = useState<Book | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [welcomeDraft, setWelcomeDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const query = `owner=${encodeURIComponent(owner)}`;

  useEffect(() => {
    // SRS-508.1: open on the first (welcome) page.
    void (async () => {
      const result = await dormApi<Book>(`/api/dorm/guestbook?${query}`);
      if (result.ok) setBook(result.data);
      else if (result.status === 403) onDenied(result.error);
      else setError(result.error);
    })();
    dialog.current?.focus();
  }, [query, onDenied]);

  async function send(path: string, init: RequestInit, after?: () => void) {
    setBusy(true);
    setError('');
    const result = await dormApi<Book>(path, init);
    setBusy(false);
    if (result.ok) { setBook(result.data); after?.(); return true; }
    if (result.status === 403 && !book?.isOwner) { onDenied(result.error); return false; }
    setError(result.error);
    return false;
  }

  const pages = book ? guestbookPageCount(book.notes.length) : 1;
  const current = Math.min(page, pages - 1);
  const notes = book ? guestbookPage(book.notes, current) : [];
  const tooLong = (text: string) => codePointLength(text) > DP_TEXT_LIMIT;

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} className={styles.book} role="dialog" aria-modal="true" aria-labelledby="guestbook-title" tabIndex={-1}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
        <div className={styles.toolbar}>
          <h2 id="guestbook-title">{book?.isOwner ? 'My Guestbook' : `${owner}'s Guestbook`}</h2>
          <button type="button" className={styles.button} onClick={onClose}>Close</button>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {!book ? <p className={styles.status} role="status">Opening guestbook…</p> : current === 0 ? (
          // SRS-508.2, SRS-508.3, SRS-509.6: the first page is the owner's welcome plus the visit count.
          <section aria-label="Welcome page">
            {welcomeDraft === null ? <p className={styles.welcomeText}>{book.welcome}</p> : (
              <form onSubmit={(event) => {
                event.preventDefault();
                void send('/api/dorm', { method: 'PATCH', body: JSON.stringify({ welcome: welcomeDraft }) }, () => setWelcomeDraft(null));
              }}>
                <label className={styles.hint} htmlFor="welcome-text">Welcome message</label>
                <textarea id="welcome-text" className={styles.textarea} value={welcomeDraft} onChange={(e) => setWelcomeDraft(e.target.value)} />
                <div className={styles.pager}>
                  <Counter text={welcomeDraft} />
                  <span className={styles.noteActions}>
                    <button type="button" className={styles.button} onClick={() => setWelcomeDraft(null)}>Cancel</button>
                    <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={busy || tooLong(welcomeDraft)}>Save welcome</button>
                  </span>
                </div>
              </form>
            )}
            <p style={{ marginTop: 12 }}><strong>{book.visitCount}</strong> {book.visitCount === 1 ? 'visit' : 'visits'} from friends</p>
            {book.isOwner && welcomeDraft === null ? (
              <button type="button" className={styles.button} style={{ marginTop: 12 }} onClick={() => setWelcomeDraft(book.welcome)}>Edit welcome message</button>
            ) : null}
          </section>
        ) : (
          <section aria-label={`Notes page ${current}`} style={{ display: 'grid', gap: 10 }}>
            {notes.map((note) => (
              <article key={note.id} className={styles.note}>
                <p className={styles.noteMeta}><strong>{note.author}</strong> · {new Date(note.createdAt).toLocaleString()}</p>
                {editing?.id === note.id ? (
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    void send('/api/dorm/guestbook', { method: 'PATCH', body: JSON.stringify({ owner, noteId: note.id, text: editing.text }) }, () => setEditing(null));
                  }}>
                    <textarea className={styles.textarea} aria-label="Edit your note" value={editing.text} onChange={(e) => setEditing({ id: note.id, text: e.target.value })} />
                    <div className={styles.pager}>
                      <Counter text={editing.text} />
                      <span className={styles.noteActions}>
                        <button type="button" className={styles.button} onClick={() => setEditing(null)}>Cancel</button>
                        <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={busy || tooLong(editing.text)}>Save</button>
                      </span>
                    </div>
                  </form>
                ) : <p className={styles.noteText}>{note.text}</p>}
                {editing?.id !== note.id && (note.mine || book.isOwner) ? (
                  // SRS-508.16 to SRS-508.19: authors edit their own notes; authors or the owner delete.
                  <div className={styles.noteActions}>
                    {note.mine ? <button type="button" className={styles.button} onClick={() => setEditing({ id: note.id, text: note.text })}>Edit</button> : null}
                    <button type="button" className={styles.button} disabled={busy}
                      onClick={() => void send(`/api/dorm/guestbook?${query}&noteId=${note.id}`, { method: 'DELETE' })}>Delete</button>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        )}

        {book ? (
          // SRS-508.14, SRS-508.15: three notes per page after the welcome page.
          <nav className={styles.pager} aria-label="Guestbook pages">
            <button type="button" className={styles.button} disabled={current === 0} onClick={() => setPage(current - 1)}>← Previous</button>
            <span className={styles.status}>{current === 0 ? 'Welcome' : `Page ${current} of ${pages - 1}`}</span>
            <button type="button" className={styles.button} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next →</button>
          </nav>
        ) : null}

        {book?.canWrite ? (
          // SRS-508.8 to SRS-508.10: current friends leave notes of 1 to 500 characters.
          <form onSubmit={(event) => {
            event.preventDefault();
            void send('/api/dorm/guestbook', { method: 'POST', body: JSON.stringify({ owner, text: draft }) }, () => { setDraft(''); setPage(1); });
          }}>
            <label className={styles.hint} htmlFor="note-text">Leave a note for {owner}</label>
            <textarea id="note-text" className={styles.textarea} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className={styles.pager}>
              <Counter text={draft} />
              <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={busy || !draft.trim() || tooLong(draft)}>Post note</button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
