'use client';

import { useCallback, useEffect, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import styles from './messages.module.css';

export type GroupMember = {
  student_id: string;
  username: string;
  name: string;
  role: 'owner' | 'administrator' | 'member';
};

const roleLabels: Record<GroupMember['role'], string> = { owner: 'Owner', administrator: 'Admin', member: '' };

// SRS-204.1 (#883): the group's current members, so the owner can select one for administrator assignment.
// SRS-204.2: choosing Make admin gives that member the administrator role. Only the owner sees the buttons, and
// only one member can hold the role, so they disappear once the group has an administrator.
// SRS-204.6 (#884): Remove admin beside that administrator takes the role back, returning them to a regular
// member, which frees the position for someone else.
export function GroupMemberList({ conversationId, canManage, onClose }: {
  conversationId: string;
  canManage: boolean;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    try {
      const token = await accessToken();
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/members`, {
        headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Members could not be loaded.');
      setMembers(data.members ?? []);
      setError('');
    } catch (reason) {
      setMembers((current) => current ?? []);
      setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'Members could not be loaded.');
    }
  }, [conversationId]);

  useEffect(() => { void load(); }, [load]);

  // SRS-204.2 / SRS-204.6: give or take back the administrator role. Only one request runs at a time, so a
  // double-click cannot assign twice before the disabled state shows, and the list is reloaded either way.
  async function setRole(member: GroupMember, role: 'administrator' | 'member') {
    if (saving) return;
    const trouble = role === 'administrator'
      ? 'That member could not be made an administrator.'
      : 'That administrator could not be changed back to a member.';
    setSaving(member.username);
    setError('');
    try {
      const token = await accessToken();
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ username: member.username, role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || trouble);
    } catch (reason) {
      setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : trouble);
    } finally {
      setSaving('');
      await load();
    }
  }

  const hasAdmin = (members ?? []).some((member) => member.role === 'administrator');

  return (
    <div className={styles.memberPanel} role="dialog" aria-labelledby="group-members-title"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <div className={styles.invitePanelTop}>
        <h3 id="group-members-title" className={styles.stepTitle}>Members</h3>
        <button type="button" className={styles.retry} onClick={onClose}>Close</button>
      </div>
      {error && <p className={styles.listError} role="alert">{error}</p>}
      {!members ? <p className={styles.pickerHint}>Loading members…</p> : (
        <ul className={styles.memberList}>
          {members.map((member) => (
            <li key={member.student_id} className={styles.memberItem}>
              <span className={styles.itemText}>
                <span className={styles.itemName}>{member.name}</span>
                <span className={styles.itemPreview}>@{member.username}</span>
              </span>
              {roleLabels[member.role] && <span className={styles.roleBadge}>{roleLabels[member.role]}</span>}
              {canManage && !hasAdmin && member.role === 'member' && (
                <button type="button" className={styles.inviteAction} onClick={() => void setRole(member, 'administrator')} disabled={Boolean(saving)}>
                  {saving === member.username ? 'Saving…' : 'Make admin'}
                </button>
              )}
              {canManage && member.role === 'administrator' && (
                <button type="button" className={styles.retry} onClick={() => void setRole(member, 'member')} disabled={Boolean(saving)}>
                  {saving === member.username ? 'Saving…' : 'Remove admin'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && hasAdmin && <p className={styles.pickerHint}>A group can have one administrator at a time. Remove this one to choose someone else.</p>}
    </div>
  );
}
