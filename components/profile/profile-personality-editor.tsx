'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Music2, X } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import { ASK_ME_TOPICS, MAX_PROMPT_ANSWERS, PROFILE_INTERESTS, PROFILE_PROMPTS, personalityInput, spotifyMusic, type ProfileInterest, type ProfilePersonality, type ProfilePrompt } from '../../lib/profile-personality';
import { AboutDetails, interestIcons, promptIcons } from './profile-about-details';
import { profileFetch } from './profile-view';
import styles from './profile-personality-editor.module.css';

export function ProfilePersonalityEditor({ profile, initial, status, onClose, onSaved }: {
  profile: StudentProfile; initial: ProfilePersonality; status: 'loading' | 'ready' | 'preview' | 'error';
  onClose: () => void; onSaved: (value: ProfilePersonality) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const musicSelected = values.interests.includes('Music');
  const music = spotifyMusic(values.spotifyUrl);
  const spotifyInvalid = Boolean(values.spotifyUrl.trim() && !music);
  const preview = { ...values, spotifyUrl: music?.url || '' };
  useEffect(() => { setValues(initial); }, [initial]);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal(); document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  function togglePrompt(prompt: ProfilePrompt) {
    setError('');
    setValues(current => current.answers.some(item => item.prompt === prompt)
      ? { ...current, answers: current.answers.filter(item => item.prompt !== prompt) }
      : current.answers.length < MAX_PROMPT_ANSWERS ? { ...current, answers: [...current.answers, { prompt, answer: '' }] } : current);
  }
  function setAnswer(prompt: ProfilePrompt, answer: string) {
    setValues(current => ({ ...current, answers: current.answers.map(item => item.prompt === prompt ? { ...item, answer } : item) }));
  }
  function toggleInterest(interest: ProfileInterest) {
    setError('');
    setValues(current => current.interests.includes(interest)
      ? { ...current, interests: current.interests.filter(item => item !== interest), spotifyUrl: interest === 'Music' ? '' : current.spotifyUrl }
      : current.interests.length < 5 ? { ...current, interests: [...current.interests, interest] } : current);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving || status !== 'ready') return;
    let input;
    try { input = personalityInput(values); } catch (reason) { setError((reason as Error).message); return; }
    setSaving(true); setError('');
    try {
      const { response, data } = await profileFetch('/api/profiles/personality', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error(data.error || 'Unable to save. Please try again.');
      onSaved(data.personality);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save. Please try again.'); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="personality-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={save} aria-busy={saving}>
      <header className={styles.header}><div><p>YOUR PROFILE</p><h2 id="personality-title">A little more you.</h2><span>Pick up to three prompts. Add icons for what you’re into.</span></div><button type="button" aria-label="Close profile customization" onClick={onClose} disabled={saving}><X size={22} /></button></header>
      <div className={styles.body}>
        <div className={styles.controls}>
          <fieldset disabled={saving}><legend>Choose your prompts <span>{values.answers.length}/{MAX_PROMPT_ANSWERS}</span></legend><div className={styles.prompts}>{PROFILE_PROMPTS.map(prompt => {
            const Icon = promptIcons[prompt.id]; const selected = values.answers.some(item => item.prompt === prompt.id);
            return <button key={prompt.id} type="button" aria-pressed={selected} disabled={!selected && values.answers.length >= MAX_PROMPT_ANSWERS} onClick={() => togglePrompt(prompt.id)} className={selected ? styles.selectedPrompt : ''}><Icon size={24} aria-hidden="true" /><span>{prompt.label}</span>{selected && <Check className={styles.check} size={14} aria-hidden="true" />}</button>;
          })}</div></fieldset>
          {values.answers.map(item => {
            const prompt = PROFILE_PROMPTS.find(entry => entry.id === item.prompt)!;
            return <div key={item.prompt}><label className={styles.field} htmlFor={`personality-${item.prompt}`}>{prompt.label}<textarea id={`personality-${item.prompt}`} maxLength={100} rows={2} required value={item.answer} disabled={saving} placeholder={prompt.placeholder} onChange={event => setAnswer(item.prompt, event.target.value)} /><span className={styles.counter}>{item.answer.length}/100</span></label>{item.prompt==='ask_me'&&<div className={styles.suggestions}><p>Need an idea? Pick a topic, then make it yours.</p><div role="group" aria-label="Suggested ask me about topics">{ASK_ME_TOPICS.map(topic=><button key={topic} type="button" disabled={saving} aria-pressed={item.answer===topic} onClick={()=>setAnswer('ask_me',topic)}>{topic}</button>)}</div></div>}</div>;
          })}
          <fieldset disabled={saving}><legend>Add a few interests <span>{values.interests.length}/5</span></legend><div className={styles.interests}>{PROFILE_INTERESTS.map(interest => {
            const Icon = interestIcons[interest]; const selected = values.interests.includes(interest);
            return <button key={interest} type="button" aria-pressed={selected} disabled={!selected && values.interests.length >= 5} onClick={() => toggleInterest(interest)} className={selected ? styles.selectedInterest : ''}><Icon size={16} aria-hidden="true" />{interest}{selected && <Check size={13} aria-hidden="true" />}</button>;
          })}</div></fieldset>
          {musicSelected && <label className={styles.field} htmlFor="personality-spotify"><span className={styles.spotifyLabel}><Music2 size={16} />Add music from Spotify <small>Optional</small></span><input id="personality-spotify" type="url" value={values.spotifyUrl} disabled={saving} maxLength={500} placeholder="https://open.spotify.com/track/…" aria-invalid={spotifyInvalid} aria-describedby="spotify-help" onChange={event => setValues(current => ({ ...current, spotifyUrl: event.target.value }))} /><span id="spotify-help" className={spotifyInvalid ? styles.invalid : styles.help}>{spotifyInvalid ? 'Use a Spotify song, album, or playlist link.' : 'In Spotify, choose Share → Copy link. Paste it here.'}</span></label>}
        </div>
        <aside className={styles.preview} aria-label="Live profile preview"><p className={styles.previewLabel}>LIVE PREVIEW</p><section className={styles.previewCard}><h3>A little about me</h3><AboutDetails profile={profile} personality={{ ...preview, answers: preview.answers.filter(item => item.answer.trim()) }} /></section><p className={styles.caption}>How it will look on your profile.</p></aside>
      </div>
      <footer className={styles.footer}><div aria-live="polite">{error ? <p className={styles.invalid} role="alert">{error}</p> : <p>{status === 'preview' ? 'Preview only · Saving isn’t available yet.' : status === 'error' ? 'Customization couldn’t load. Close and retry.' : status === 'loading' ? 'Loading your customization…' : 'Visible to people who can view your profile.'}</p>}</div><div className={styles.actions}><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" disabled={saving || status !== 'ready' || spotifyInvalid}>{saving ? 'Saving…' : 'Save to profile'}</button></div></footer>
    </form>
  </dialog>;
}
