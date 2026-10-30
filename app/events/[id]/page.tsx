'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Shirt, UserRound } from 'lucide-react';
import { storedAccessToken } from '../../../lib/account/session';
import shellStyles from '../../../components/navigation/social-shell.module.css';
import styles from '../events.module.css';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import { SessionNotice } from '../../../components/navigation/section-page';
import { EventArt } from '../../../components/events/EventArt';
import { EventActions } from '../../../components/events/EventActions';
import { InviteStudents } from '../../../components/events/InviteStudents';
import { CoverPhotoButton } from '../../../components/events/CoverPhotoButton';
import { formatWhen, type EventDetail } from '../../../lib/events';

const commentTime = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const initials = (username: string) => username.slice(0, 2).toUpperCase();

// One event: its details, likes, everyone who is going, and comments.
export default function EventDetailPage() {
  const session = useNavigationSession();
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState('');

  async function load(signal?: AbortSignal) {
    const token = storedAccessToken();
    if (!token) return;
    try {
      const response = await fetch(`/api/events/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'This event could not be loaded.'); return; }
      setError('');
      setEvent(data.event);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError('Unable to load this event. Please try again.');
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    // Only the event's creator sees the invite panel; the server enforces this too.
    const token = storedAccessToken();
    if (token) {
      fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
        .then(async (response) => { if (response.ok) setStudentId((await response.json()).profile?.id ?? null); })
        .catch(() => {});
    }
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addComment(submit: React.FormEvent<HTMLFormElement>) {
    submit.preventDefault();
    const token = storedAccessToken();
    if (!token || !event) return;
    setPosting(true);
    setCommentError('');
    try {
      const response = await fetch(`/api/events/${event.event_id}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment }),
      });
      const data = await response.json();
      if (!response.ok) { setCommentError(data.error || 'Your comment could not be posted.'); return; }
      setComment('');
      setEvent((current) => current && { ...current, comments: [...current.comments, data.comment], comment_count: current.comment_count + 1 });
    } catch {
      setCommentError('Your comment could not be posted. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  if (session !== 'signed-in') return <SessionNotice state={session} />;

  return (
    <main className={shellStyles.page}>
      <Link href="/events" className={styles.backLink}>
        <ArrowLeft aria-hidden="true" size={16} />
        Back to Events &amp; Trending
      </Link>

      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
      {!event && !error ? <p role="status" className={styles.empty}>Loading event…</p> : null}

      {event ? (
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <article className={styles.featured} aria-labelledby="event-title">
              <EventArt id={event.event_id} title={event.title} className={styles.featuredArt} coverUrl={event.cover_url}>
                {studentId && studentId === event.creator_id ? (
                  <CoverPhotoButton eventId={event.event_id} hasCover={Boolean(event.cover_url)}
                    onChange={(url) => setEvent((current) => current && { ...current, cover_url: url })} />
                ) : null}
              </EventArt>
              <div className={styles.featuredBody}>
                <h1 id="event-title" className={styles.featuredTitle}>{event.title}</h1>
                <dl className={styles.meta}>
                  <div className={styles.metaRow}><dt><CalendarDays aria-label="Date and time" /></dt><dd>{formatWhen(event.starts_at)}</dd></div>
                  <div className={styles.metaRow}><dt><MapPin aria-label="Location" /></dt><dd>{event.location}</dd></div>
                  {event.dress_code ? <div className={styles.metaRow}><dt><Shirt aria-label="Dress code" /></dt><dd>Dress code: {event.dress_code}</dd></div> : null}
                  <div className={styles.metaRow}><dt><UserRound aria-label="Host" /></dt><dd>Hosted by @{event.creator_username}</dd></div>
                </dl>
                <p className={styles.description}>{event.description}</p>
                <EventActions event={event} commentHref="#comments"
                  onChange={(engagement) => { setEvent((current) => current && { ...current, ...engagement }); load(); }} />
              </div>
            </article>

            {studentId && studentId === event.creator_id && Date.parse(event.starts_at) > Date.now()
              ? <InviteStudents eventId={event.event_id} /> : null}

            <section id="comments" className={styles.sectionBlock} aria-labelledby="comments-title">
              <h2 id="comments-title" className={styles.sectionTitle}>Comments ({event.comment_count})</h2>
              {event.comments.length === 0 ? (
                <p className={styles.sideEmpty}>No comments yet. Start the conversation.</p>
              ) : (
                <ul className={styles.comments}>
                  {event.comments.map((item) => (
                    <li key={item.comment_id} className={styles.comment}>
                      <span className={styles.avatar} aria-hidden="true">{initials(item.author_username)}</span>
                      <div>
                        <p className={styles.commentMeta}><strong>@{item.author_username}</strong> · {commentTime.format(new Date(item.created_at))}</p>
                        <p className={styles.commentText}>{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={addComment} className={styles.commentForm}>
                <label htmlFor="event-comment" className={styles.srOnly}>Add a comment</label>
                <textarea id="event-comment" value={comment} onChange={(change) => setComment(change.target.value)}
                  required maxLength={500} rows={2} placeholder="Add a comment…" className={styles.input} />
                <div className={styles.formFooter}>
                  <span className={styles.hint}>{comment.length}/500</span>
                  <button type="submit" className={styles.primaryButton} disabled={posting || !comment.trim()}>
                    {posting ? 'Posting…' : 'Post comment'}
                  </button>
                </div>
                {commentError ? <p role="alert" className={styles.actionError}>{commentError}</p> : null}
              </form>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section id="going" className={styles.sideCard} aria-labelledby="going-title">
              <h2 id="going-title" className={styles.sideTitle}>Who’s going ({event.going_count})</h2>
              {event.attendees.length === 0 ? (
                <p className={styles.sideEmpty}>Nobody yet. Tap “I’m going” to be the first.</p>
              ) : (
                <ul className={styles.attendees}>
                  {event.attendees.map((attendee) => (
                    <li key={attendee.student_id}>
                      <Link href={`/students/${attendee.username}`} className={styles.attendee}>
                        <span className={styles.avatar} aria-hidden="true">{initials(attendee.username)}</span>
                        <span><strong>{attendee.full_name}</strong><span>@{attendee.username}</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
