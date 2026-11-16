'use client';

import { useId, useRef } from 'react';
import { useDormVoice } from '../use-dorm-voice';
import styles from '../dormspace-3d.module.css';

export function VoicePanel({ channel, connectionId, eligible }: { channel: string; connectionId: string; eligible: boolean }) {
  const heading = useId();
  const audio = useRef<HTMLDivElement>(null);
  const voice = useDormVoice(connectionId, eligible, audio);
  const connected = voice.phase === 'connected';
  const joining = voice.phase === 'joining';
  return (
    <section className={styles.voicePanel} aria-labelledby={heading}>
      <h3 id={heading}>Voice chat · {channel}</h3>
      <div className={styles.controls}>
        {connected || joining ? <button type="button" className={styles.button} onClick={voice.leave}>
          {joining ? 'Cancel joining' : 'Leave voice'}
        </button> : <button type="button" className={styles.button} disabled={!eligible} onClick={() => void voice.join()}>
          {voice.phase === 'ended' ? 'Retry voice' : 'Join voice'}
        </button>}
        {connected && <button type="button" className={styles.button} disabled={voice.micPending}
          onClick={() => { if (voice.mic) voice.muteMic(); else void voice.enableMic(); }}>
          {voice.micPending ? 'Waiting for microphone…' : voice.mic ? 'Mute microphone' : 'Enable microphone'}
        </button>}
        {connected && !voice.canPlay && <button type="button" className={styles.button} onClick={() => void voice.playAudio()}>Play voice audio</button>}
      </div>
      <p className={styles.hint} role="status">{voice.message || (joining ? 'Joining voice…' : connected ?
        voice.mic ? 'Microphone on.' : 'Listening only. Your microphone is off.' :
        eligible ? 'Join to listen. Your microphone starts off.' : 'Connect to DormSpace to join voice.')}</p>
      {connected && <ul className={styles.voicePeople} aria-label="Voice participants">
        <li><span>You{voice.speaking ? ' · Speaking' : ''}</span></li>
        {voice.peers.map(peer => <li key={peer.id}>
          <span>{peer.name}{peer.speaking && !peer.muted ? ' · Speaking' : ''}{peer.muted ? ' · Muted for you' : ''}</span>
          <button type="button" className={styles.button} onClick={() => voice.mutePeer(peer.id)}>{peer.muted ? 'Unmute' : 'Mute'} {peer.name}</button>
        </li>)}
      </ul>}
      <div ref={audio} hidden />
    </section>
  );
}
