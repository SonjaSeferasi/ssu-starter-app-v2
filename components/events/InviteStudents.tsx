'use client';

import React, { useEffect, useState } from 'react';
import { Check, Search, Send } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import styles from '../../app/events/events.module.css';

type Candidate = { student_id: string; username: string; full_name: string; invited: boolean };
type Invited = { student_id: string; username: string; full_name: string; rsvp?: string };

const RSVP_LABEL: Record<string, string> = { pending: 'Invited', attending: 'Attending', not_attending: 'Not attending' };
const initials = (username: string) => username.slice(0, 2).toUpperCase();

export function inviteSummary(invited: number, already: number) {
  const sent = invited === 1 ? 'Invitation sent to 1 student.' : `Invitations sent to ${invited} students.`;
  if (already === 0) return sent;
  const skipped = already === 1 ? '1 student was already invited' : `${already} students were already invited`;
  return invited === 0 ? `No new invitations: ${skipped}.` : `${sent} ${skipped}, so they were not invited again.`;
}

// UR-402, for the event's creator: find registered students (SRS-402.1), select several (402.2),
// send an invitation to each (402.3, never twice), and see everyone invited (402.5).
export function InviteStudents({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Map<string, Candidate>>(new Map());
  const [invited, setInvited] = useState<Invited[]>([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function request(path: string, init: RequestInit = {}, signal?: AbortSignal) {
    const token = storedAccessToken();
    if (!token) throw new Error('Please sign in again.');
    const response = await fetch(path, { ...init, signal, cache: 'no-store', headers: { ...init.headers, Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'That did not work. Please try again.');
    return data;
  }

  async function loadInvited() {
    try { setInvited((await request(`/api/events/${eventId}/invitations`)).invitations); } catch { /* the list just stays as it is */ }
  }

  useEffect(() => { loadInvited(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search as the creator types; earlier selections are kept (SRS-402.2).
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      request(`/api/events/${eventId}/invite-candidates?q=${encodeURIComponent(query)}`, {}, controller.signal)
        .then((data) => setCandidates(data.students))
        .catch((err) => { if (err.name !== 'AbortError') setError(err.message); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [eventId, query]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(student: Candidate) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(student.student_id)) next.delete(student.student_id); else next.set(student.student_id, student);
      return next;
    });
  }

  async function send() {
    setSending(true);
    setMessage('');
    setError('');
    try {
      const result = await request(`/api/events/${eventId}/invitations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: [...selected.keys()] }),
      });
      setMessage(inviteSummary(result.invited.length, result.already_invited.length));
      setSelected(new Map());
      const nowInvited = new Set([...result.invited, ...result.already_invited].map((s: Invited) => s.student_id));
      setCandidates((current) => current.map((c) => nowInvited.has(c.student_id) ? { ...c, invited: true } : c));
      await loadInvited();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.sectionBlock} aria-labelledby="invite-title">
      <h2 id="invite-title" className={styles.sectionTitle}>Invite students</h2>
      <p className={styles.sideBody}>Invite anyone at your university, friends or not. Each student is only ever invited once.</p>

      <label className={styles.searchField}>
        <Search aria-hidden="true" />
        <span className={styles.srOnly}>Search students by name or username</span>
        <input type="search" value={query} onChange={(change) => setQuery(change.target.value)} maxLength={100}
          placeholder="Search students by name or username" className={styles.searchInput} />
      </label>

      <ul className={styles.candidates} aria-label="Students you can invite">
        {candidates.length === 0 ? <li className={styles.sideEmpty}>No matching students.</li> : candidates.map((student) => {
          const isSelected = selected.has(student.student_id);
          return (
            <li key={student.student_id}>
              <label className={`${styles.candidate} ${student.invited ? styles.candidateInvited : ''}`}>
                <input type="checkbox" checked={student.invited || isSelected} disabled={student.invited}
                  onChange={() => toggle(student)} className={styles.checkbox} />
                <span className={styles.avatar} aria-hidden="true">{initials(student.username)}</span>
                <span className={styles.candidateName}><strong>{student.full_name}</strong><span>@{student.username}</span></span>
                {student.invited ? <span className={styles.invitedTag}><Check aria-hidden="true" /> Invited</span> : null}
              </label>
            </li>
          );
        })}
      </ul>

      <div className={styles.formFooter}>
        <span className={styles.hint}>{selected.size === 0 ? 'No students selected' : `${selected.size} selected: ${[...selected.values()].map((s) => '@' + s.username).join(', ')}`}</span>
        <button type="button" className={styles.primaryButton} disabled={sending || selected.size === 0} onClick={send}>
          <Send aria-hidden="true" />
          {sending ? 'Sending…' : selected.size > 1 ? `Send ${selected.size} invitations` : 'Send invitation'}
        </button>
      </div>
      {message ? <p role="status" className={styles.notice}>{message}</p> : null}
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}

      <h3 className={styles.subheading}>Invited ({invited.length})</h3>
      {invited.length === 0 ? <p className={styles.sideEmpty}>No one has been invited yet.</p> : (
        <ul className={styles.attendees}>
          {invited.map((student) => (
            <li key={student.student_id} className={styles.attendee}>
              <span className={styles.avatar} aria-hidden="true">{initials(student.username)}</span>
              <span className={styles.candidateName}><strong>{student.full_name}</strong><span>@{student.username}</span></span>
              <span className={styles.rsvpTag}>{RSVP_LABEL[student.rsvp ?? 'pending']}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
