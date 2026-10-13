'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { SessionNotice } from '../../components/navigation/section-page';
import { ProfileView, profileFetch, useProfileGate } from '../../components/profile/profile-view';
import styles from '../../components/profile/profile.module.css';

// A verified student without a SocialU profile row creates one first (name and username),
// then finishes the required SRS-109 setup on /profile/edit.
function CreateProfile({ defaults }: { defaults: { fullName: string; username: string } }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaults.fullName);
  const [username, setUsername] = useState(defaults.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
      const { response, data } = await profileFetch('/api/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), username: username.trim(), biography: '' }),
      });
      if (!response.ok) throw new Error(data.error || 'Unable to create your profile.');
      window.dispatchEvent(new Event('socialu-session-changed'));
      router.push('/profile/edit');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create your profile.');
      setSaving(false);
    }
  }

  return <main className={styles.page}>
    <form className={styles.form} onSubmit={submit} aria-busy={saving}>
      <div>
        <h1 className={styles.formTitle}>Create your SocialU profile</h1>
        <p className={styles.hint}>Confirm your name and username. Next you will add your photo, major, class year, and bio.</p>
      </div>
      {error && <p className={`${styles.notice} ${styles.error}`} role="alert" style={{ margin: 0 }}>{error}</p>}
      <label className={styles.field}>Full name
        <input value={fullName} onChange={event => setFullName(event.target.value)} required maxLength={100} autoComplete="name" />
      </label>
      <label className={styles.field}>Username
        <input value={username} onChange={event => setUsername(event.target.value)} required maxLength={50} autoComplete="username"
          pattern="[A-Za-z0-9_.]+" title="Use letters, numbers, periods, and underscores." />
      </label>
      <div className={styles.formActions}><button type="submit" className={styles.button} disabled={saving}>{saving ? 'Creating…' : 'Continue'}</button></div>
    </form>
  </main>;
}

function OwnProfile() {
  const [state, setState] = useState<{ ready: boolean; defaults?: { fullName: string; username: string }; error?: string; signedOut?: boolean }>({ ready: false });

  useEffect(() => {
    profileFetch('/api/profile').then(({ response, data }) => {
      if (response.status === 401) { setState({ ready: true, signedOut: true }); return; }
      if (!response.ok) throw new Error(data.error || 'Unable to load your profile.');
      setState(data.profile ? { ready: true } : { ready: true, defaults: data.defaults ?? { fullName: '', username: '' } });
    }).catch(reason => setState({ ready: true, error: reason instanceof Error ? reason.message : 'Unable to load your profile.' }));
  }, []);

  if (!state.ready) return <main className={styles.page} aria-busy="true"><div className={styles.skeleton} style={{ height: 240 }} /></main>;
  if (state.signedOut) return <SessionNotice state="signed-out" />;
  if (state.error) return <main className={styles.page}><p className={`${styles.notice} ${styles.error}`} role="alert">{state.error}</p></main>;
  if (state.defaults) return <CreateProfile defaults={state.defaults} />;
  return <ProfileView />;
}

export default function ProfilePage() {
  const gate = useProfileGate();
  return gate === 'ready' ? <OwnProfile /> : <SessionNotice state={gate} />;
}
