import { useId } from 'react';
import type { AvatarAppearance, Outfit } from '../../lib/game-room';
import { pantsColors, shirtColors, sampleFaceStyles } from '../../lib/game-room';
import styles from './avatar-preview.module.css';

// Runtime SVG layers preserve the original artwork; no image files are rewritten.
// Each sheet column has a different base top (navy hoodie, tan sweater, green sweater)
// and pose, so each gets its own clip offset, colour selection and brightness.
// Selections are smooth (no hard cutoff) and AND-ed together so shaded fabric is
// recoloured evenly while skin, hair and denim are left alone.
const shirtPoints = [[95,122],[154,114],[163,129],[205,142],[246,121],[274,154],[285,221],[258,263],[145,275],[92,247],[83,189]];
const shirtTints = [
  { dx: 0, left: 0, top: 18, masks: ['-6 -20 18 0 0'], mean: 0.266 },
  { dx: -26, left: 12, top: 0, masks: ['-30 46 0 0 0', '0 20 -20 0 0', '-12 12 0 0 2.9'], mean: 0.89 },
  { dx: -50, left: 12, top: 18, masks: ['-20 20 0 0 0', '0 20 -17 0 0'], mean: 0.36 },
];
export function CustomAvatar({ appearance, assetKey, outfit, column, small, portrait }: {
  appearance: AvatarAppearance; assetKey: string; outfit?: Outfit; column: number; small: boolean; portrait: boolean;
}) {
  const unique = useId().replace(/:/g, '');
  const style = sampleFaceStyles[assetKey === 'sample-glasses' ? 'sample-smile' : assetKey];
  const shirt = shirtColors.find(color => color.id === appearance.shirtColor);
  const pants = pantsColors.find(color => color.id === appearance.pantsColor);
  const detail = appearance.faceStyle || (assetKey === 'sample-glasses' ? 'square-glasses' : 'natural');
  const female = style.group === 'female';
  const shirtTint = shirtTints[column] || shirtTints[0];
  const shirtPath = 'M' + shirtPoints.map(([x, y]) => (x + shirtTint.dx - (x < 150 ? shirtTint.left : 0)) + ' ' + (y - (y < 145 ? shirtTint.top : 0))).join(' L') + ' Z';
  const pantsPath = 'M80 267 H305 V470 H80 Z';
  const tintMatrix = (hex: string, strength: number, offset = 0) => {
    const rgb = [1,3,5].map(start => parseInt(hex.slice(start,start+2),16)/255);
    return rgb.map(channel => [0.2126,0.7152,0.0722,0].map(value => value*channel*strength).join(' ') + ' ' + channel*offset).join(' ') + ' 0 0 0 1 0';
  };
  const glasses = ['round-glasses','square-glasses','glasses-freckles'].includes(detail);
  const freckles = ['freckles','glasses-freckles'].includes(detail);
  const image = <image href={style.sheet} x={-column*(1024/3)} y={-style.row*512} width="1024" height="1536" />;
  return <svg viewBox={portrait ? '75 0 210 210' : '0 0 341.333333 512'} role="img"
    aria-label={(female ? 'Female' : 'Male') + ' avatar: ' + style.label + ', ' + detail.replaceAll('-',' ') + ', ' + (shirt?.name || outfit?.name || 'Campus hoodie') + ' shirt, ' + (pants?.name || 'Denim blue') + ' pants'}
    className={[styles.realisticAvatar, small ? styles.thumbnail : '', portrait ? styles.portrait : ''].join(' ')}>
    <defs>
      <clipPath id={unique+'shirt'}><path d={shirtPath} /></clipPath>
      <clipPath id={unique+'pants'}><path d={pantsPath} /></clipPath>
      <filter id={unique+'shirttint'} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        {shirtTint.masks.map((row, index) => <feColorMatrix key={index} in="SourceGraphic" type="matrix" values={'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ' + row} result={'selection' + index} />)}
        {shirtTint.masks.slice(1).map((_, index) => <feComposite key={index} in={index ? 'combined' + (index - 1) : 'selection0'} in2={'selection' + (index + 1)} operator="in" result={'combined' + index} />)}
        <feComposite in={shirtTint.masks.length > 1 ? 'combined' + (shirtTint.masks.length - 2) : 'selection0'} in2="SourceGraphic" operator="in" result="mask" />
        <feColorMatrix in="SourceGraphic" type="matrix" values={tintMatrix(shirt?.hex || '#263b65', 0.85 / shirtTint.mean, 0.15)} result="tinted" />
        <feComposite in="tinted" in2="mask" operator="in" />
      </filter>
      <filter id={unique+'pantstint'} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -3 -1.5 4.5 0 0" result="blueSelection" />
        <feComponentTransfer in="blueSelection" result="selection"><feFuncA type="discrete" tableValues="0 0 1 1" /></feComponentTransfer>
        <feComposite in="selection" in2="SourceGraphic" operator="in" result="mask" />
        <feColorMatrix in="SourceGraphic" type="matrix" values={tintMatrix(pants?.hex || '#678aae', 2.1)} result="tinted" />
        <feComposite in="tinted" in2="mask" operator="in" />
      </filter>
    </defs>
    {image}
    {shirt && shirt.id !== ['navy','cream','green'][column] && <g clipPath={'url(#'+unique+'shirt)'} filter={'url(#'+unique+'shirttint)'}>{image}</g>}
    {pants && pants.id !== 'denim' && <g clipPath={'url(#'+unique+'pants)'} filter={'url(#'+unique+'pantstint)'}>{image}</g>}
    <g transform={female ? 'translate(3 -2) rotate(9 210 72)' : 'rotate(7 210 72)'}>
      {glasses && <g fill="#c5e1e914" stroke="#253443" strokeWidth="2.4">
        {detail === 'square-glasses' ? <><rect x="185" y="61" width="24" height="17" rx="4" /><rect x="216" y="61" width="24" height="17" rx="4" /></>
          : <><ellipse cx="197" cy="70" rx="12" ry="10" /><ellipse cx="228" cy="70" rx="12" ry="10" /></>}
        <path d="M209 67 Q212 64 216 67 M185 65 L179 63 M240 65 L245 64" fill="none" />
      </g>}
      {freckles && <g fill="#935a39" opacity=".75">{[[188,83],[194,80],[199,85],[221,83],[227,80],[233,84]].map(([x,y])=><circle key={x} cx={x} cy={y} r="1.3" />)}</g>}
    </g>
  </svg>;
}
