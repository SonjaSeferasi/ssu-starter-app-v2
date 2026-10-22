import React from 'react';
import type { CompleteAvatar as Avatar } from '../../lib/avatar-collection';
import styles from './avatar-preview.module.css';

/** The source is a 1086 x 1448 atlas of six complete figures, not clothing pieces. */
export function CompleteAvatar({ avatar, small = false }: { avatar: Avatar; small?: boolean }) {
  const column = avatar.cell % 3, row = Math.floor(avatar.cell / 3);
  return <svg viewBox="0 0 362 724" role="img" aria-label={`${avatar.name}: ${avatar.description}`}
    className={[styles.realisticAvatar, small ? styles.thumbnail : ''].join(' ')} style={{ overflow: 'hidden' }}>
    <svg width="362" height="724" overflow="hidden">
      <image href={avatar.sheet} x={-column * 362} y={-row * 724} width="1086" height="1448" />
    </svg>
  </svg>;
}
