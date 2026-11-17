import React, { useEffect, useId, useState } from 'react';
import type { CompleteAvatar as Avatar } from '../../lib/avatar-collection';
import { avatarFrame } from '../../lib/avatar-collection';
import { adjustedFigure, changesFigure, figurePad, photoFaceFrame, type PhotoFaceFrame, type FigureLook } from './figure-image';
import styles from './avatar-preview.module.css';

/**
 * Each atlas contains six complete figures; alpha-derived frames avoid clipping.
 * A body shape or skin colour is applied in the browser (lib/avatar-figure.ts); the
 * painted figure stays hidden until then so it never flashes the wrong look.
 */
export function CompleteAvatar({ avatar, look, photoFaceUrl, small = false, portrait = false }: { avatar: Avatar; look?: FigureLook; photoFaceUrl?: string; small?: boolean; portrait?: boolean }) {
  const photoClip = useId().replace(/:/g,'');
  const [photoFrame, setPhotoFrame] = useState<{ id: string; frame: PhotoFaceFrame } | null>(null);
  useEffect(() => {
    if (!photoFaceUrl) return;
    let live = true;
    photoFaceFrame(avatar).then(frame => { if (live) setPhotoFrame({ id: avatar.id, frame }); }, () => { if (live) setPhotoFrame(null); });
    return () => { live = false; };
  }, [avatar.id, !!photoFaceUrl]);
  const face = photoFrame?.id === avatar.id ? photoFrame.frame : null;
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
    {photoFaceUrl && face && <g aria-label="Photographic face">
      <defs><clipPath id={photoClip}><ellipse {...face} /></clipPath></defs>
      <image href={photoFaceUrl} x={face.cx-face.rx} y={face.cy-face.ry} width={face.rx*2} height={face.ry*2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${photoClip})`} />
    </g>}
  </svg>;
}
