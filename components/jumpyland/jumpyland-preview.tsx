'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AvatarPreview } from '../game-room/avatar-preview';
import { gameRoomSamples } from '../../lib/game-room';
import { completeAvatar } from '../../lib/avatar-collection';
import { avatarTexture } from './avatar-texture';
import { courses } from './levels';
import type { InputState } from './engine';

/**
 * Development preview of the 3D worlds (/dev/jumpyland?world=1|2|3).
 * Opens a world straight away with the sample avatar: no sign-in, no saved attempt.
 * `&x=CM` starts the hero further along a course; `&run=MS` holds "right" (hopping) for that long.
 */
export function JumpylandPreview() {
  const params = useSearchParams();
  const world = Math.min(3, Math.max(1, Number(params.get('world')) || 1));
  const run = Math.max(0, Number(params.get('run')) || 0), startX = Math.max(30, Number(params.get('x')) || 90);
  const avatarId = completeAvatar(params.get('avatar'))?.id || 'campus-v4-male-1-1-natural';
  const avatar = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Preparing the world…');
  useEffect(() => {
    let cleanup: (() => void) | undefined, cancelled = false, timer: number | undefined, hops: number | undefined;
    const input: InputState = { left: false, right: false, jump: false, power: false, down: false, defend: false };
    (async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const svg = avatar.current?.querySelector('svg');
      if (!svg || !stage.current) throw new Error('The sample avatar did not render.');
      const [sheet, { mountGame }] = await Promise.all([avatarTexture(svg), import('./engine')]);
      if (cancelled || !stage.current) return;
      cleanup = mountGame(stage.current, courses[world - 1], sheet, input, () => {}, cause => setStatus('Run ended: ' + cause), () => {}, () => {
        setStatus('');
        if (run) {
          // Hold right and keep hopping so the hero crosses the gaps.
          input.right = true; hops = window.setInterval(() => { input.jumpQueued = true; }, 520);
          timer = window.setTimeout(() => { input.right = false; window.clearInterval(hops); stage.current?.setAttribute('data-settled', 'true'); }, run);
        }
        else stage.current?.setAttribute('data-settled', 'true');
      }, () => {}, () => {}, undefined, undefined, startX, { ...gameRoomSamples.appearance!, avatarId });
    })().catch(error => setStatus(error instanceof Error ? error.message : 'The preview could not start.'));
    return () => { cancelled = true; window.clearTimeout(timer); window.clearInterval(hops); cleanup?.(); };
  }, [world, run, startX, avatarId]);
  return <main style={{ position: 'fixed', inset: 0, background: '#9dc9e3' }}>
    <div ref={avatar} aria-hidden="true" style={{ position: 'absolute', width: 256, height: 384, left: -9999, top: 0 }}>
      <AvatarPreview appearance={{ ...gameRoomSamples.appearance!, avatarId }} outfits={gameRoomSamples.outfits} faces={gameRoomSamples.faces} />
    </div>
    <div ref={stage} style={{ position: 'absolute', inset: 0 }} />
    {status && <p role="status" style={{ position: 'absolute', left: 16, top: 16, margin: 0, padding: '8px 12px', background: '#fffd', borderRadius: 8 }}>{status}</p>}
  </main>;
}
