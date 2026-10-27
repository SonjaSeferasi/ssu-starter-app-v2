'use client';

import { useId, type ReactNode } from 'react';
import { FRAME_SHEETS, illustratedFrame, type ProfileFrame } from '../../lib/profile-frames';
import styles from './profile-space.module.css';

export function ProfilePortrait({ frame, className = '', children }: { frame: ProfileFrame; className?: string; children: ReactNode }) {
  const clipId = `frame-${useId().replace(/:/g, '')}`;
  const art = illustratedFrame(frame);
  if (!art) return <div data-profile-portrait data-photo-frame={frame} className={className}>{children}</div>;
  const sheet = FRAME_SHEETS[art.sheet];
  const [x, y, width, height] = art.crop;
  const [left, top, photoWidth, photoHeight] = art.window;
  return <div data-profile-portrait data-photo-frame={frame} data-illustrated-frame className={`${className} ${styles.illustratedPortrait}`} style={{ aspectRatio: `${width}/${height}` }}>
    <div className={styles.framePhoto} style={{ left: `${left - 2}%`, top: `${top - 2}%`, width: `${photoWidth + 4}%`, height: `${photoHeight + 4}%`, borderRadius: art.shape === 'round' ? '50%' : '5%' }}>{children}</div>
    <svg className={styles.frameOverlay} viewBox={`${x} ${y} ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs><clipPath id={clipId}><rect x={x} y={y} width={width} height={height} /></clipPath></defs>
      <image href={sheet.src} width={sheet.width} height={sheet.height} clipPath={`url(#${clipId})`} />
    </svg>
  </div>;
}
