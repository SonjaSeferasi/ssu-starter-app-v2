import {CostumeDetails,type CostumeStyle} from './costume-details';
import { useId } from 'react';
import type { AvatarAppearance, Outfit } from '../../lib/game-room';
import { pantsColors, shirtColors, sampleFaceStyles } from '../../lib/game-room';
import styles from './avatar-preview.module.css';
import { FaceDetails } from './face-details';

// Runtime SVG layers preserve the original artwork; no image files are rewritten.
// Each sheet column has a different base top (navy hoodie, tan sweater, green sweater)
// and pose, so each gets its own clip offset, colour selection and brightness.
// Selections are smooth (no hard cutoff) and AND-ed together so shaded fabric is
// recoloured evenly while skin, hair and denim are left alone.
// A mask row is 'r g b offset': selection = clamp(r*R + g*G + b*B + offset).
const shirtPoints = [[95,122],[154,114],[163,129],[205,142],[246,121],[274,154],[285,221],[258,263],[145,275],[92,247],[83,189]];
const shirtTints = [
  { dx: 0, left: 8, top: 18, masks: ['-40 0 40 -1.2', '-1.28 -4.29 -0.43 2.4'], mean: 0.266 },
  { dx: -26, left: 12, top: 0, masks: ['-30 46 0 0', '0 20 -20 0', '-12 12 0 2.9'], mean: 0.89 },
  { dx: -50, left: 12, top: 18, masks: ['-20 20 0 0', '0 20 -17 0'], mean: 0.36 },
];
// Denim is bluer than skin, sweaters and shoes. On the navy hoodie the waist band
// also excludes dark pixels so the hoodie hem is never painted as trousers.
const denim = '-12 0 12 0', notGreen = '0 -15 15 0', notWhite = '-2.13 -7.15 -0.72 7';
const pantsTints = [
  [{ y: [238, 280], masks: [denim, '2.55 8.58 0.87 -2.4'] }, { y: [280, 470], masks: [denim, notWhite] }],
  [{ y: [238, 470], masks: [denim, notGreen, notWhite] }],
  [{ y: [238, 470], masks: [denim, notGreen, notWhite] }],
];
// Measured eye centres [left x, left y, right x, right y] for each sheet row in the
// first column, and the head shift [dx, dy] of the second and third columns.
const faceAnchors: Record<string, { eyes: number[][]; shifts: number[][][] }> = {
  '/avatars/student-realistic-v1.png': { eyes: [[201.4,68.6,227.9,73.6],[201.4,69.3,229.3,75],[201.4,69.3,227,73.6]], shifts: [[[-26,0],[-50,0]],[[-26,0],[-50,0]],[[-26,0],[-50,0]]] },
  '/avatars/student-hairstyles-v1.png': { eyes: [[204.3,65.7,231.4,72.1],[202.1,59.3,228.6,66.4],[200,57.1,227.9,64.3]], shifts: [[[-28,0],[-51,0]],[[-27,0],[-51,-1]],[[-23,0],[-47,0]]] },
  '/avatars/student-female-v1.png': { eyes: [[206.8,60.2,232.2,68.2],[210.7,62.1,240.7,70.7],[201.4,52.9,230,61.4]], shifts: [[[-28,0],[-51,0]],[[-27,0],[-49,0]],[[-27,0],[-51,0]]] },
};

function maskFilter(id: string, masks: string[], tint: string) {
  return <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    {masks.map((row, index) => { const [r, g, b, offset] = row.split(' '); return <feColorMatrix key={index} in="SourceGraphic" type="matrix" values={`0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${r} ${g} ${b} 0 ${offset}`} result={'selection' + index} />; })}
    {masks.slice(1).map((_, index) => <feComposite key={index} in={index ? 'combined' + (index - 1) : 'selection0'} in2={'selection' + (index + 1)} operator="in" result={'combined' + index} />)}
    <feComposite in={masks.length > 1 ? 'combined' + (masks.length - 2) : 'selection0'} in2="SourceGraphic" operator="in" result="mask" />
    <feColorMatrix in="SourceGraphic" type="matrix" values={tint} result="tinted" />
    <feComposite in="tinted" in2="mask" operator="in" />
  </filter>;
}

export function CustomAvatar({ appearance, assetKey, outfit, column, small, portrait, costume }: {
  appearance: AvatarAppearance; assetKey: string; outfit?: Outfit; column: number; small: boolean; portrait: boolean; costume?:CostumeStyle;
}) {
  const unique = useId().replace(/:/g, '');
  const style = sampleFaceStyles[assetKey === 'sample-glasses' ? 'sample-smile' : assetKey];
  const shirt = costume?{id:'costume',name:costume.name,hex:costume.shirt}:shirtColors.find(color => color.id === appearance.shirtColor);
  const pants = costume?{id:'costume',name:costume.name,hex:costume.pants}:pantsColors.find(color => color.id === appearance.pantsColor);
  const detail = appearance.faceStyle || (assetKey === 'sample-glasses' ? 'square-glasses' : 'natural');
  const female = style.group === 'female';
  const shirtTint = shirtTints[column] || shirtTints[0];
  const shirtPath = 'M' + shirtPoints.map(([x, y]) => (x + shirtTint.dx - (x < 150 ? shirtTint.left : 0)) + ' ' + (y - (y < 145 ? shirtTint.top : 0))).join(' L') + ' Z';
  const pantsBands = pantsTints[column] || pantsTints[0];
  const tintMatrix = (hex: string, strength: number, offset = 0) => {
    const rgb = [1,3,5].map(start => parseInt(hex.slice(start,start+2),16)/255);
    return rgb.map(channel => [0.2126,0.7152,0.0722,0].map(value => value*channel*strength).join(' ') + ' ' + channel*offset).join(' ') + ' 0 0 0 1 0';
  };
  // Light colours keep less of the original fabric texture so they read as clean, not grey.
  const shirtHex = shirt?.hex || '#263b65';
  const [sr, sg, sb] = [1,3,5].map(start => parseInt(shirtHex.slice(start,start+2),16));
  const shirtContrast = column === 0 && 0.299*sr + 0.587*sg + 0.114*sb > 150 ? 0.5 : 0.85;
  const dragon=!!costume&&['goku','vegeta','piccolo'].includes(costume.id);
  // Face details follow the measured eyes of this face, shifted with the outfit column.
  const anchor = faceAnchors[style.sheet];
  const [shiftX, shiftY] = column > 0 && anchor ? anchor.shifts[style.row][column - 1] : [0, 0];
  const [lx, ly, rx, ry] = anchor ? anchor.eyes[style.row] : [197, 70, 228, 74];
  const image = <image href={style.sheet} x={-column*(1024/3)} y={-style.row*512} width="1024" height="1536" />;
  return <svg viewBox={portrait ? `${75 + shiftX} ${shiftY} 210 210` : '0 0 341.333333 512'} role="img"
    aria-label={(female ? 'Female' : 'Male') + ' avatar: ' + style.label + ', ' + detail.replaceAll('-',' ') + ', ' + (shirt?.name || outfit?.name || 'Campus hoodie') + ' shirt, ' + (pants?.name || 'Denim blue') + ' pants'}
    className={[styles.realisticAvatar, small ? styles.thumbnail : '', portrait ? styles.portrait : ''].join(' ')}>
    <defs>
      <clipPath id={unique+'head'}><rect x="0" y="0" width="341.333333" height="128"/></clipPath>
      <clipPath id={unique+'frame'}><rect x="0" y="0" width="341.333333" height="512"/></clipPath>
      <clipPath id={unique+'shirt'}><path d={shirtPath} /></clipPath>
      {pantsBands.map((band, index) => <clipPath key={index} id={unique+'pants'+index}><rect x={70 + shiftX} y={band.y[0]} width="260" height={band.y[1] - band.y[0]} /></clipPath>)}
      {maskFilter(unique+'shirttint', shirtTint.masks, tintMatrix(shirtHex, shirtContrast / shirtTint.mean, 1 - shirtContrast))}
      {pantsBands.map((band, index) => <g key={index}>{maskFilter(unique+'pantstint'+index, band.masks, tintMatrix(pants?.hex || '#678aae', 0.85 / 0.38, 0.15))}</g>)}
    </defs>
    <g clipPath={'url(#'+unique+'frame)'}>
    {dragon?<g clipPath={'url(#'+unique+'head)'}>{image}</g>:image}
    {!dragon&&shirt && shirt.id !== ['navy','cream','green'][column] && <g clipPath={'url(#'+unique+'shirt)'} filter={'url(#'+unique+'shirttint)'}>{image}</g>}
    {!dragon&&pants && pants.id !== 'denim' && pantsBands.map((_, index) => <g key={index} clipPath={'url(#'+unique+'pants'+index+')'} filter={'url(#'+unique+'pantstint'+index+')'}>{image}</g>)}
    {costume&&<CostumeDetails costume={costume} id={unique}/>}
    {anchor && <FaceDetails eyes={[lx + shiftX, ly + shiftY, rx + shiftX, ry + shiftY]} detail={detail} />}
    </g>
  </svg>;
}
