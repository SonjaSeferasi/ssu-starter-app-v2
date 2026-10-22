'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { prepareProfilePhoto } from '../../lib/account/profile-photo';
import type { StudentProfile } from '../../lib/profile';
import { SessionNotice } from '../navigation/section-page';
import { Avatar, profileFetch, useProfileGate } from './profile-view';
import styles from './profile.module.css';

const CLASS_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];
const BIO_LIMIT = 250;

type Values = { username: string; fullName: string; displayName: string; major: string; classYear: string; bio: string };

function valuesOf(profile: StudentProfile): Values {
  return { username: profile.username, fullName: profile.full_name, displayName: profile.display_name ?? '', major: profile.major ?? '', classYear: profile.class_year ?? '', bio: profile.bio };
}


function Editor({ profile }: { profile: StudentProfile }) {
  const router = useRouter();
  const initial = useMemo(() => valuesOf(profile), [profile]);
  const [values, setValues] = useState(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const photoSequence = useRef(0);
  const [error, setError] = useState('');
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const setup = !profile.setup_completed;
  const nameLockedUntil = profile.display_name_next_change_at && new Date(profile.display_name_next_change_at).getTime() > Date.now() ? new Date(profile.display_name_next_change_at) : null;
  const dirty = photo !== null || (Object.keys(initial) as (keyof Values)[]).some(key => values[key] !== initial[key]);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty && !saving;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // SRS-110.8: warn before leaving with unsaved changes, for both page unloads and in-app links.
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } };
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.origin !== window.location.origin || link.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveTo(link.pathname + link.search + link.hash);
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('click', onClick, true); };
  }, []);

  function update(key: keyof Values, value: string) { setValues(current => ({ ...current, [key]: value })); }

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    const sequence = ++photoSequence.current;
    setPreparingPhoto(true); setError('');
    try {
      const prepared = await prepareProfilePhoto(file);
      if (sequence !== photoSequence.current) return;
      setPhoto(prepared);
      setPreview(prepared.name.toLowerCase().endsWith('.heic') ? null : URL.createObjectURL(prepared));
    } catch (reason) {
      if (sequence === photoSequence.current) setError(reason instanceof Error ? reason.message : 'Unable to prepare your photo.');
    } finally { if (sequence === photoSequence.current) setPreparingPhoto(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || preparingPhoto) return;
    // SRS-109.9: every required profile field must be present.
    const missing = [!values.fullName.trim() && 'your full name', !photo && !profile.photo_url && 'a profile photo', !values.major.trim() && 'your major',
      !values.classYear && 'your class year'].filter(Boolean);
    if (missing.length) { setError(`Add ${missing.join(', ')} to ${setup ? 'finish your profile' : 'save your changes'}.`); return; }
    if (!/^[A-Za-z0-9_.-]{1,50}$/.test(values.username.trim())) { setError('Use 1–50 letters, numbers, periods, underscores, or hyphens for your username (without @).'); return; }
    setSaving(true); setError('');
    try {
      const form = new FormData();
      form.set('username', values.username);
      form.set('fullName', values.fullName);
      form.set('displayName', values.displayName); form.set('major', values.major); form.set('classYear', values.classYear); form.set('bio', values.bio);
      if (photo) form.set('photo', photo);
      const { response, data } = await profileFetch('/api/profile/details', { method: 'PUT', body: form });
      if (!response.ok) throw new Error(data.error || 'Unable to save your profile. Please try again.');
      dirtyRef.current = false;
      window.dispatchEvent(new Event('socialu-session-changed'));
      router.push('/profile');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your profile. Please try again.');
      setSaving(false);
    }
  }

  function leave(target: string) {
    // SRS-110.9: confirming discards the unsaved values.
    dirtyRef.current = false;
    setLeaveTo(null);
    router.push(target);
  }

  const bioLength = values.bio.length;
  return <main className={styles.page}>
    <Link href="/profile" className={`${styles.button} ${styles.secondary}`}><ArrowLeft />Back to profile</Link>
    <form className={styles.form} onSubmit={submit} aria-busy={saving || preparingPhoto} noValidate>
      <div>
        <h1 className={styles.formTitle}>{setup ? 'Set up your profile' : 'Edit profile'}</h1>
        {setup && <p className={styles.hint}>Add a photo, your major, and class year. You can add a bio if you like.</p>}
      </div>
      {error && <p className={`${styles.notice} ${styles.error}`} role="alert" style={{ margin: 0 }}>{error}</p>}

      <div className={styles.photoRow}>
        <Avatar url={preview ?? (photo ? null : profile.photo_url)} name={profile.name} />
        <div>
          <button type="button" className={styles.button} onClick={() => fileInput.current?.click()} disabled={preparingPhoto || saving}><Camera />{preparingPhoto ? 'Preparing photo…' : profile.photo_url || photo ? 'Change photo' : 'Upload photo'}</button>
          <p className={styles.hint}>{photo ? `Selected: ${photo.name}` : 'JPG, JPEG, PNG, or HEIC. Large photos are resized automatically when supported by your browser.'}</p>
          <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic" hidden
            onChange={event => { choosePhoto(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
      </div>

      <label className={styles.field}>Username
        <input value={values.username} onChange={event => update('username', event.target.value)} maxLength={50} required autoComplete="username" autoCapitalize="none" spellCheck={false} />
        <span className={styles.fieldNote}>Your unique @username. Use letters, numbers, periods, underscores, or hyphens, without @. Changing it updates your sign-in username and profile link; old profile links will stop working.</span>
      </label>
      <label className={styles.field}>Full name
        <input value={values.fullName} onChange={event => update('fullName', event.target.value)} maxLength={100} required autoComplete="name" />
        <span className={styles.fieldNote}>Your real name on your student record. This is shown on your profile when the display name below is empty.</span>
      </label>
      {/* SRS-110.5/110.6 */}
      <label className={styles.field}>Display name
        <input value={values.displayName} onChange={event => update('displayName', event.target.value)} maxLength={100}
          placeholder={values.fullName} disabled={Boolean(nameLockedUntil)} autoComplete="nickname" />
        <span className={styles.fieldNote}>{nameLockedUntil
          ? `You can change your display name again on ${nameLockedUntil.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.`
          : `Shown instead of your full name. Leave empty to use “${values.fullName}”. You can change it once every 7 days.`}</span>
      </label>
      <label className={styles.field}>Major
        <input value={values.major} onChange={event => update('major', event.target.value)} maxLength={100} required placeholder="e.g. Computer Science" />
      </label>
      <label className={styles.field}>Class year
        <select value={values.classYear} onChange={event => update('classYear', event.target.value)} required>
          <option value="" disabled>Choose your class year</option>
          {CLASS_YEARS.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>
      {/* SRS-109.7/109.8 */}
      <label className={styles.field}>Bio (optional)
        <textarea value={values.bio} onChange={event => update('bio', event.target.value)} maxLength={BIO_LIMIT}
          placeholder="Tell other students a little about yourself." />
        <span className={`${styles.counter} ${bioLength >= BIO_LIMIT ? styles.counterOver : ''}`} aria-live="polite">{bioLength}/{BIO_LIMIT}</span>
      </label>

      <div className={styles.formActions}>
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => dirty ? setLeaveTo('/profile') : router.push('/profile')} disabled={saving || preparingPhoto}>Cancel</button>
        <button type="submit" className={styles.button} disabled={saving || preparingPhoto}>{saving ? 'Saving…' : setup ? 'Finish setup' : 'Save Changes'}</button>
      </div>
    </form>

    {leaveTo && <div className={styles.backdrop}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-body">
        <h2 id="leave-title">Leave without saving?</h2>
        <p id="leave-body">You have unsaved changes to your profile. If you leave now, they will be lost.</p>
        <div className={styles.formActions}>
          {/* SRS-110.10: cancelling keeps the editor open with the unsaved values. */}
          <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => setLeaveTo(null)} autoFocus>Keep editing</button>
          <button type="button" className={styles.button} onClick={() => leave(leaveTo)}>Leave</button>
        </div>
      </div>
    </div>}
  </main>;
}

function EditorContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileFetch('/api/profiles').then(({ response, data }) => {
      // No SocialU profile yet: /profile shows the create-profile step first.
      if ([401, 403, 404].includes(response.status)) { router.replace('/profile'); return; }
      if (!response.ok) throw new Error(data.error || 'Unable to load your profile.');
      setProfile(data.profile);
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load your profile.'));
  }, [router]);

  if (error) return <main className={styles.page}><p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p></main>;
  if (!profile) return <main className={styles.page} aria-busy="true"><div className={styles.skeleton} style={{ height: 480 }} /></main>;
  return <Editor profile={profile} />;
}

export function ProfileEditor() {
  const gate = useProfileGate();
  return gate === 'ready' ? <EditorContent /> : <SessionNotice state={gate} />;
}
