import React from 'react';
import type { CompleteAvatar as Avatar } from '../../lib/avatar-collection';
import { avatarFrame } from '../../lib/avatar-collection';
import styles from './avatar-preview.module.css';

/** Each atlas contains six complete figures; alpha-derived frames avoid clipping. */
export function CompleteAvatar({ avatar, small = false, portrait = false }: { avatar: Avatar; small?: boolean; portrait?: boolean }) {
  const frame = avatarFrame(avatar);
  return <svg viewBox={portrait ? '60 0 310 250' : '0 0 430 760'} role="img" aria-label={`${avatar.name}: ${avatar.description}`}
    className={[styles.realisticAvatar, small ? styles.thumbnail : '', portrait ? styles.portrait : ''].join(' ')} style={{ overflow: 'hidden' }}>
    <svg x={(430 - frame.width) / 2} y={(760 - frame.height) / 2} width={frame.width} height={frame.height} overflow="hidden">
      <image href={avatar.sheet} x={-frame.x} y={-frame.y} width={frame.atlasWidth} height={frame.atlasHeight} />
    </svg>
  </svg>;
}
