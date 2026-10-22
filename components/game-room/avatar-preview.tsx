import type { AvatarAppearance, DefaultFace, Outfit } from '../../lib/game-room';
import { sampleFaceStyles } from '../../lib/game-room';
import styles from './avatar-preview.module.css';
import type {CostumeStyle} from './costume-details';
import { CustomAvatar } from './custom-avatar';
import { LayeredAvatar } from './layered-avatar';
import { hasLayeredLook, layoutAvatar } from '../../lib/avatar-layers';
import { useAvatarManifest } from '../../lib/avatar-manifest';

// Development samples use a transparent 3x3 sheet: outfits across, faces down.
// Unknown catalog keys retain the generic placeholder until approved assets exist.
export function AvatarPreview({ appearance, outfits, faces, small = false, portrait = false, costume }: { appearance: AvatarAppearance | null; outfits: Outfit[]; faces: DefaultFace[]; small?: boolean; portrait?: boolean; costume?:CostumeStyle }) {
  const manifest = useAvatarManifest();
  // Layered art (v2) is used once it is imported and this look has a piece for every layer.
  if (!costume && manifest && hasLayeredLook(appearance) && layoutAvatar(manifest, appearance)) {
    return <LayeredAvatar manifest={manifest} look={appearance} faceStyle={appearance.faceStyle} small={small} portrait={portrait} />;
  }
  const outfit = outfits.find(item => item.id === appearance?.outfitId);
  const face = faces.find(item => item.id === appearance?.faceId);
  const outfitColumn = ['sample-campus', 'sample-study', 'sample-weekend'].indexOf(outfit?.assetKey || '');
  const faceStyle = sampleFaceStyles[face?.assetKey || ''];
  if (outfitColumn !== -1 && faceStyle) {
    return <CustomAvatar appearance={appearance!} assetKey={face!.assetKey} outfit={outfit} column={costume?0:outfitColumn} costume={costume} small={small} portrait={portrait} />;
  }
  const color = outfit?.assetKey === 'sample-study' ? '#9a7554' : outfit?.assetKey === 'sample-weekend' ? '#458674' : '#23394b';
  const curls = face?.assetKey === 'sample-curls';
  const glasses = face?.assetKey === 'sample-glasses';
  return <svg viewBox="0 0 240 330" role="img" aria-label={`${outfit?.name || 'Default'} illustrated avatar${appearance?.faceId === null ? '; saved photo face preview is not connected' : ''}`} style={{ width: '100%', maxHeight: small ? 100 : 330 }}>
    <ellipse cx="120" cy="312" rx="65" ry="10" fill="#c7dccd" />
    <path d="M94 207 89 282l24 3 10-63 10 63 24-3-10-75Z" fill="#6b8fa0" stroke="#304e5e" strokeWidth="3" />
    <path d="m89 277-8 20c-3 9 6 12 31 9l1-23M133 283l1 22c24 3 33-1 27-10l-6-18" fill="#f6f4e8" stroke="#304e5e" strokeWidth="3" />
    <path d="m91 127-22 14-16 58c-4 11 17 15 22 3l12-36-2 49c23 11 49 11 73 0l-3-49 12 36c5 12 26 8 22-3l-16-58-23-14" fill={color} stroke="#172e3e" strokeWidth="3" strokeLinejoin="round" />
    <path d="m91 128 28 22 31-22-10-12h-40Z" fill="#adc3c4" stroke="#172e3e" strokeWidth="3" />
    <path d="m111 143-1 34m18-34 1 34M98 189q22 12 43 0" fill="none" stroke="#9aafaf" strokeWidth="2" />
    <text x="120" y="188" fill="#f7f4df" fontFamily="Arial, sans-serif" fontSize="23" fontWeight="bold" textAnchor="middle">SU</text>
    <rect x="106" y="103" width="29" height="30" rx="12" fill="#bd825f" />
    <ellipse cx="84" cy="83" rx="8" ry="13" fill="#d6a079" /><ellipse cx="156" cy="83" rx="8" ry="13" fill="#d6a079" />
    <path d="M85 64q0-35 35-35t35 35v31q-3 27-35 28-32-1-35-28Z" fill="#d6a079" stroke="#794c39" strokeWidth="2" />
    <path d={curls ? 'M82 76Q69 62 81 51Q71 38 91 31Q91 17 109 23Q122 10 132 23Q151 18 157 36Q175 46 159 74L151 58Q126 64 112 43Q100 59 87 60Z' : 'M82 76q-10-50 36-51 46-4 42 45l-11-14q-26 8-36-13-10 20-27 21Z'} fill="#392d29" />
    <path d="M98 77q6-4 12 0m20 0q6-4 12 0" fill="none" stroke="#53392e" strokeWidth="3" strokeLinecap="round" />
    <circle cx="105" cy="84" r="3" fill="#23303a" /><circle cx="136" cy="84" r="3" fill="#23303a" />
    <path d="m120 83-3 12h6m-17 7q14 14 28 0" fill="none" stroke="#794c39" strokeWidth="2.5" strokeLinecap="round" />
    {glasses && <g fill="none" stroke="#23303a" strokeWidth="3"><rect x="93" y="77" width="22" height="16" rx="5" /><rect x="125" y="77" width="22" height="16" rx="5" /><path d="M115 83h10" /></g>}
    <path d="m57 201 3 13q5 9 13 0l2-10m93 0 2 10q9 9 14 0l3-13" fill="#d6a079" stroke="#794c39" strokeWidth="2" />
  </svg>;
}
