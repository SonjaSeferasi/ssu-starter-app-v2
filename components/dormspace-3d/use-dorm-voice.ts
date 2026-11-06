'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { accessToken, storedAccessToken } from '../../lib/account/session';
import type { VoiceMedia, VoiceMediaState } from './voice-media';

const CHECK_MS = 5_000;
const REQUEST_MS = 8_000;
const emptyMedia: VoiceMediaState = { peers: [], mic: false, canPlay: true, speaking: false };
type Phase = 'idle' | 'joining' | 'connected' | 'ended';
type JoinReply = { url: string; token: string; ticket: string };
type Run = { session: string; access: string; ticket?: string; media?: VoiceMedia; timer?: ReturnType<typeof setTimeout> };

function sessionOf(token: string | null) {
  try {
    if (!token) return '';
    const { sub, session_id: id } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof sub === 'string' && typeof id === 'string' ? `${sub}:${id}` : '';
  } catch { return ''; }
}

function voiceRequest(token: string, body: object, keepalive = false) {
  return fetch('/api/dorm/voice', {
    method: 'POST', cache: 'no-store', keepalive,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(REQUEST_MS),
  });
}

async function checked(response: Response) {
  if (response.ok) return response;
  const body = await response.json().catch(() => null);
  throw new Error(typeof body?.error === 'string' ? body.error : 'Voice chat is unavailable. Please try again.');
}

function release(run: Run) {
  clearTimeout(run.timer);
  run.media?.close();
  const ticket = run.ticket;
  run.ticket = undefined;
  if (ticket) void voiceRequest(run.access, { action: 'leave', ticket }, true).catch(() => {});
}

export function useDormVoice(connectionId: string, eligible: boolean, audioHost: RefObject<HTMLDivElement>) {
  const active = useRef<Run | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [mediaState, setMediaState] = useState(emptyMedia);
  const [micPending, setMicPending] = useState(false);

  const finish = useCallback((run: Run, problem = '') => {
    if (active.current !== run) return;
    active.current = null;
    release(run);
    setPhase(problem ? 'ended' : 'idle');
    setMediaState(emptyMedia);
    setMicPending(false);
    setMessage(problem);
  }, []);

  const leave = useCallback(() => {
    if (active.current) finish(active.current);
  }, [finish]);

  useEffect(() => {
    if (!eligible && active.current) finish(active.current, 'Your DormSpace connection ended. Join voice again when you are back.');
    const sessionChanged = () => {
      const run = active.current;
      if (run && sessionOf(storedAccessToken()) !== run.session) finish(run, 'Your sign-in changed. Join voice again after signing in.');
    };
    window.addEventListener('storage', sessionChanged);
    window.addEventListener('socialu-session-changed', sessionChanged);
    window.addEventListener('pagehide', leave);
    window.addEventListener('offline', leave);
    return () => {
      window.removeEventListener('storage', sessionChanged);
      window.removeEventListener('socialu-session-changed', sessionChanged);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('offline', leave);
    };
  }, [eligible, finish, leave]);

  useEffect(() => () => {
    const run = active.current;
    active.current = null;
    if (run) release(run);
  }, []);

  async function join() {
    if (active.current || !eligible || !connectionId || !audioHost.current) return;
    const token = storedAccessToken();
    const session = sessionOf(token);
    if (!token || !session) { setMessage('Sign in to join voice.'); return; }
    const run: Run = { session, access: token };
    active.current = run;
    setPhase('joining');
    setMessage('');
    const current = () => active.current === run;
    const scheduleCheck = () => {
      run.timer = setTimeout(async () => {
        try {
          const refreshed = await accessToken();
          if (!current()) return;
          if (!refreshed || sessionOf(refreshed) !== run.session) throw new Error('Your sign-in ended.');
          run.access = refreshed;
          await checked(await voiceRequest(refreshed, { action: 'check', ticket: run.ticket }));
          if (current()) scheduleCheck();
        } catch (error) {
          finish(run, error instanceof Error && error.name === 'Error' ? error.message : 'Voice connection interrupted. Join again to listen.');
        }
      }, CHECK_MS);
    };

    try {
      const refreshed = await accessToken();
      if (!current()) return;
      if (!refreshed || sessionOf(refreshed) !== run.session) throw new Error('Your sign-in ended.');
      run.access = refreshed;
      const response = await checked(await voiceRequest(refreshed, { action: 'join', connectionId, attempt: crypto.randomUUID() }));
      const { url, token: mediaToken, ticket } = await response.json() as JoinReply;
      run.ticket = ticket;
      if (!current()) { release(run); return; }
      const { createVoiceMedia } = await import('./voice-media');
      if (!current() || !audioHost.current) return;
      run.media = createVoiceMedia(audioHost.current, state => { if (current()) setMediaState(state); },
        () => finish(run, 'Voice connection interrupted. Join again to listen.'));
      await run.media.connect(url, mediaToken);
      if (!current()) return;
      await checked(await voiceRequest(refreshed, { action: 'check', ticket }));
      if (!current()) return;
      setPhase('connected');
      scheduleCheck();
    } catch (error) {
      finish(run, error instanceof Error && error.name === 'Error' ? error.message : 'Voice could not connect. Try again.');
    }
  }

  async function enableMic() {
    const run = active.current;
    if (!run?.media || phase !== 'connected' || micPending) return;
    setMicPending(true);
    setMessage('');
    try {
      await run.media.enableMicrophone();
    } catch {
      if (active.current === run) setMessage('Microphone unavailable or denied. You can still listen and use nearby text chat.');
    } finally {
      if (active.current === run) setMicPending(false);
    }
  }

  async function playAudio() {
    const run = active.current;
    try { await run?.media?.startAudio(); }
    catch { if (active.current === run) setMessage('Audio playback was blocked. Check your browser settings and try again.'); }
  }

  return {
    phase, message, ...mediaState, micPending, join, leave, enableMic, playAudio,
    muteMic: () => active.current?.media?.muteMicrophone(),
    mutePeer: (id: string) => active.current?.media?.mutePeer(id),
  };
}
