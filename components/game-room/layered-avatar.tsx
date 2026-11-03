import { useId } from 'react';
import type { AvatarManifest, LayeredLook } from '../../lib/avatar-layers';
import { headStyles, layoutAvatar, skinTones, topColors, topStyles, bottomColors, bottomStyles } from '../../lib/avatar-layers';
import type { AvatarAppearance } from '../../lib/game-room';
import styles from './avatar-preview.module.css';
import { FaceDetails } from './face-details';

const nameOf = (options: readonly { id: string; name: string }[], id: string) => options.find(option => option.id === id)?.name || id;

/**
 * Stacks the painted layers inside one SVG of <image> elements. Jumpyland captures
 * this same SVG (components/jumpyland/avatar-texture.ts), so it needs no changes.
 */
export function LayeredAvatar({ manifest, look, faceStyle, small = false, portrait = false }: {
  manifest: AvatarManifest; look: LayeredLook; faceStyle?: AvatarAppearance['faceStyle']; small?: boolean; portrait?: boolean;
}) {
  const clipId = 'neck' + useId().replace(/:/g, '');
  const layout = layoutAvatar(manifest, look);
  if (!layout) return null;
  const head = headStyles.find(style => style.id === look.headStyle);
  const headName = head?.kind === 'hijab' ? nameOf(headStyles, look.headStyle).toLowerCase() + ' hijab' : nameOf(headStyles, look.headStyle).toLowerCase() + ' hair';
  const label = `Avatar: ${nameOf(skinTones, look.skinTone).toLowerCase()} skin, ${headName}, ${nameOf(topColors, look.topColor).toLowerCase()} ${nameOf(topStyles, look.topStyle).toLowerCase()}, ${nameOf(bottomColors, look.bottomColor).toLowerCase()} ${nameOf(bottomStyles, look.bottomStyle).toLowerCase()}`;
  // Portrait thumbnails frame the head and shoulders.
  const side = Math.max(layout.head.width, layout.head.height) * 1.15;
  const viewBox = portrait
    ? `${layout.head.x + layout.head.width / 2 - side / 2} ${layout.head.y - side * 0.04} ${side} ${side}`
    : '0 0 341.333333 512';
  return <svg viewBox={viewBox} role="img" aria-label={label}
    className={[styles.realisticAvatar, small ? styles.thumbnail : '', portrait ? styles.portrait : ''].join(' ')}>
    {layout.neckBehind && <defs><clipPath id={clipId}><rect x="-1000" y="-1000" width="3000" height={1000 + layout.neckBehind.frontY} /></clipPath></defs>}
    {layout.layers.map(layer => {
      const image = <image href={layer.href} x={layer.x} y={layer.y} width={layer.width} height={layer.height} preserveAspectRatio="none" />;
      if (!layout.neckBehind || layer.part === 'bottom') return <g key={layer.part}>{image}</g>;
      return null;
    })}
    {layout.neckBehind && (() => {
      const head = layout.layers[2], top = layout.layers[1], opening = layout.neckBehind.opening;
      const image = (key: string) => <image key={key} href={head.href} x={head.x} y={head.y} width={head.width} height={head.height} preserveAspectRatio="none" />;
      // Order: inside of the collar, neck behind the top, the top, then face and hair in front of the collar line.
      return <>
        {opening && <rect x={opening.x} y={opening.y} width={opening.width} height={opening.height} rx={opening.width / 3} fill={opening.color} />}
        {image('behind')}
        <image href={top.href} x={top.x} y={top.y} width={top.width} height={top.height} preserveAspectRatio="none" />
        <g clipPath={`url(#${clipId})`}>{image('front')}</g>
      </>;
    })()}
    {layout.eyes && <FaceDetails eyes={layout.eyes} detail={faceStyle} />}
  </svg>;
}
