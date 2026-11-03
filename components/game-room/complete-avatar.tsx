import React, { useEffect, useState } from 'react';
import type { CompleteAvatar as Avatar } from '../../lib/avatar-collection';
import { avatarFrame } from '../../lib/avatar-collection';
import { adjustedFigure, changesFigure, figurePad, type FigureLook } from './figure-image';
import styles from './avatar-preview.module.css';

/**
 * Each atlas contains six complete figures; alpha-derived frames avoid clipping.
 * A body shape or skin colour is applied in the browser (lib/avatar-figure.ts); the
 * painted figure stays hidden until then so it never flashes the wrong look.
 */
export function CompleteAvatar({ avatar, look, small = false, portrait = false }: { avatar: Avatar; look?: FigureLook; small?: boolean; portrait?: boolean }) {
  const frame = avatarFrame(avatar);
  const changed = changesFigure(look);
  const key = `${avatar.id}|${look?.bodyShape || ''}|${look?.skinColor || ''}`;
  const [adjusted, setAdjusted] = useState<{ key: string; href: string | null } | null>(null);
  useEffect(() => {
    if (!changed) return;
    let live = true;
    adjustedFigure(avatar, look!, small ? 0.5 : 1).then(href => { if (live) setAdjusted({ key, href }); }, () => { if (live) setAdjusted({ key, href: null }); });
    return () => { live = false; };
  }, [key, small]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = changed && adjusted?.key === key ? adjusted.href : null;
  const pending = changed && adjusted?.key !== key;
  const pad = figurePad(frame.width);
  const label = `${avatar.name}: ${avatar.description}${look?.bodyShape && look.bodyShape !== 'average' ? `, ${look.bodyShape} body` : ''}${look?.skinColor ? `, ${look.skinColor} skin` : ''}`;
  return <svg viewBox={portrait ? '60 0 310 250' : '0 0 430 760'} role="img" aria-label={label}
    className={[styles.realisticAvatar, small ? styles.thumbnail : '', portrait ? styles.portrait : ''].join(' ')} style={{ overflow: 'hidden' }}>
    {ready
      ? <image href={ready} x={(430 - frame.width) / 2 - pad} y={(760 - frame.height) / 2} width={frame.width + pad * 2} height={frame.height} />
      : <svg x={(430 - frame.width) / 2} y={(760 - frame.height) / 2} width={frame.width} height={frame.height} overflow="hidden" visibility={pending ? 'hidden' : undefined}>
        <image href={avatar.sheet} x={-frame.x} y={-frame.y} width={frame.atlasWidth} height={frame.atlasHeight} />
      </svg>}
  </svg>;
}
