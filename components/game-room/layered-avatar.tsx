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
    {layout.layers.map(layer => <image key={layer.part} href={layer.href} x={layer.x} y={layer.y} width={layer.width} height={layer.height} preserveAspectRatio="none" />)}
    {layout.eyes && <FaceDetails eyes={layout.eyes} detail={faceStyle} />}
  </svg>;
}
