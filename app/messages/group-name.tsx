'use client';

import { type FormEvent, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import styles from './messages.module.css';

// SRS-202.5 (#836): the group's owner or administrator names or renames the group from its header.
// Escape or Cancel closes the form without saving; Save is disabled while saving, so it can't save twice.
export function GroupNameForm({ conversationId, current, onSaved, onCancel }: {
  conversationId: string;
  current: string | null;
  onSaved: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(current ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) { setError('Enter a group name.'); return; }
    setSaving(true);
    setError('');
    try {
      const token = await accessToken();
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The group name could not be saved.');
      onSaved(data.conversation.name);
    } catch (reason) {
      setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'The group name could not be saved.');
      setSaving(false);
    }
  }

  return (
    <form className={styles.nameForm} onSubmit={save} onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }}>
      <label htmlFor="group-name" className={styles.srOnly}>Group name</label>
      <input id="group-name" className={styles.pickerSearch} value={name} onChange={(event) => setName(event.target.value)}
        placeholder="Group name" maxLength={50} autoFocus autoComplete="off" disabled={saving} />
      <span className={styles.nameActions}>
        <button type="submit" className={styles.inviteAction} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className={styles.retry} onClick={onCancel}>Cancel</button>
      </span>
      {error && <p className={styles.listError} role="alert">{error}</p>}
    </form>
  );
}
