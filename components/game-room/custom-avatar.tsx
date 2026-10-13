import { useId } from 'react';
import type { AvatarAppearance, Outfit } from '../../lib/game-room';
import { pantsColors, shirtColors, sampleFaceStyles } from '../../lib/game-room';
import styles from './avatar-preview.module.css';

// Runtime SVG layers preserve the original artwork; no image files are rewritten.
export function CustomAvatar({ appearance, assetKey, outfit, column, small, portrait }: {
  appearance: AvatarAppearance; assetKey: string; outfit?: Outfit; column: number; small: boolean; portrait: boolean;
}) {
  const unique = useId().replace(/:/g, '');
  const style = sampleFaceStyles[assetKey === 'sample-glasses' ? 'sample-smile' : assetKey];
  const shirt = shirtColors.find(color => color.id === appearance.shirtColor);
  const pants = pantsColors.find(color => color.id === appearance.pantsColor);
  const detail = appearance.faceStyle || (assetKey === 'sample-glasses' ? 'square-glasses' : 'natural');
  const female = style.group === 'female';
  const shirtPath = 'M95 122 L154 114 L163 129 L205 142 L246 121 L274 154 L285 221 L258 263 L145 275 L92 247 L83 189 Z';
  const pantsPath = 'M80 267 H305 V470 H80 Z';
  const tintMatrix = (hex: string, strength: number) => {
    const rgb = [1,3,5].map(offset => parseInt(hex.slice(offset,offset+2),16)/255);
    return rgb.map(channel => [0.2126,0.7152,0.0722,0,0].map(value => value*channel*strength).join(' ')).join(' ') + ' 0 0 0 1 0';
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
      {([['shirt',shirt?.hex || '#263b65',3.8],['pants',pants?.hex || '#678aae',2.1]] as const).map(([part,hex,strength]) =>
        <filter key={part} id={unique+part+'tint'} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values={'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ' + (part === 'pants' || column === 0 ? '-3 -1.5 4.5 0 0' : column === 1 ? '-16 20 0 0 0' : '-20 20 0 0 0')} result="blueSelection" />
          <feComponentTransfer in="blueSelection" result="selection"><feFuncA type="discrete" tableValues="0 0 1 1" /></feComponentTransfer>
          <feComposite in="selection" in2="SourceGraphic" operator="in" result="mask" />
          <feColorMatrix in="SourceGraphic" type="matrix" values={tintMatrix(hex,strength)} result="tinted" />
          <feComposite in="tinted" in2="mask" operator="in" />
        </filter>)}
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
