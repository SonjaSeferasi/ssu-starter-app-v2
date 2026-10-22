import type { AvatarAppearance } from '../../lib/game-room';

const freckleDots = [[-4,0],[0,-1.6],[3.6,0.8],[-1.2,3],[2.2,4.2]];

/** Glasses and freckles drawn on measured eye centres, following the head's tilt. */
export function FaceDetails({ eyes, detail }: { eyes: [number, number, number, number]; detail: AvatarAppearance['faceStyle'] }) {
  const glasses = detail === 'round-glasses' || detail === 'square-glasses' || detail === 'glasses-freckles';
  const freckles = detail === 'freckles' || detail === 'glasses-freckles';
  if (!glasses && !freckles) return null;
  const [lx, ly, rx, ry] = eyes;
  const eyeGap = Math.hypot(rx - lx, ry - ly);
  const tilt = Math.atan2(ry - ly, rx - lx) * 180 / Math.PI;
  const half = eyeGap / 2, lens = eyeGap * 0.38;
  return <g transform={`translate(${(lx + rx) / 2} ${(ly + ry) / 2}) rotate(${tilt})`}>
    {freckles && <g fill="#7a4a32" opacity=".5">{[-1, 1].flatMap(side => freckleDots.map(([x, y], index) =>
      <circle key={side + '-' + index} cx={side * (half - 1.5) + x * side} cy={eyeGap * 0.42 + y} r={eyeGap * 0.05} />))}</g>}
    {glasses && <g fill="none" stroke="#23262b" strokeWidth={eyeGap * 0.048} strokeLinejoin="round">
      {detail === 'square-glasses'
        ? [-1, 1].map(side => <rect key={side} x={side * half - lens} y={1 - lens * 0.78} width={lens * 2} height={lens * 1.56} rx={lens * 0.35} fill="#ffffff" fillOpacity=".08" />)
        : [-1, 1].map(side => <circle key={side} cx={side * half} cy={1} r={lens} fill="#ffffff" fillOpacity=".08" />)}
      <path d={`M${-half + lens} 0 Q0 -2.5 ${half - lens} 0`} />
      <path d={`M${-half - lens} -1 l-2.5 -0.6 M${half + lens} -1 l2.5 -0.6`} strokeLinecap="round" />
    </g>}
  </g>;
}
