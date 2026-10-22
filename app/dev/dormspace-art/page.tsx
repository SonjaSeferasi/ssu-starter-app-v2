'use client';
import Link from 'next/link';
import { useState } from 'react';
import { defaultPixelLook, pixelHairstyles, pixelOutfits, type PixelAvatarLook } from '../../../lib/dormspace-avatar';
import { faceDetails, sampleFaceStyles, shirtColors, pantsColors } from '../../../lib/game-room';
import { PixelArt, furnitureSprites, itemArt } from '../../../components/dormspace/campus-art';
import { campusAvatarArt } from '../../../components/dormspace/campus-avatar';
const rotations = [0, 90, 180, 270] as const;
const directions = ['down', 'left', 'up', 'right'] as const;
export default function DormSpaceArtStudio() {
    const [tab, setTab] = useState<'furniture' | 'avatars' | 'actions'>('furniture');
    const looks: {
        label: string;
        look: PixelAvatarLook;
    }[] = [
        ...pixelHairstyles.map(hair => ({ label: sampleFaceStyles[hair].label, look: { ...defaultPixelLook, hair, body: sampleFaceStyles[hair].group } })),
        ...pixelOutfits.map(outfit => ({ label: outfit.replace('sample-', ''), look: { ...defaultPixelLook, outfit } })),
        ...faceDetails.map(face => ({ label: face.name, look: { ...defaultPixelLook, face: face.id } })),
        ...shirtColors.map(shirt => ({ label: shirt.name + ' shirt', look: { ...defaultPixelLook, shirt: shirt.id } })),
        ...pantsColors.map(pants => ({ label: pants.name + ' pants', look: { ...defaultPixelLook, pants: pants.id } }))
    ];
    const actionLook: PixelAvatarLook = { ...defaultPixelLook, body: 'female', hair: 'sample-ponytail', face: 'glasses-freckles', shirt: 'purple', pants: 'olive' };
    return <main style={{ padding: 24, background: '#edf2eb', minHeight: '100vh', color: '#2c4d56', fontFamily: 'system-ui' }}><Link href="/game-room/dormspace">← DormSpace</Link><h1 style={{ fontSize: 28, margin: '20px 0' }}>Campus art studio</h1>
  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>{(['furniture', 'avatars', 'actions'] as const).map(t => <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} style={{ padding: 10, background: tab === t ? '#376d65' : 'white', color: tab === t ? 'white' : '#376d65', border: '1px solid #bdcfc2', borderRadius: 8 }}>{t}</button>)}</div>
  {tab === 'avatars' ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 10 }}>{looks.map(({ label, look }, i) => <div key={i} style={{ background: '#e3e9db', padding: 12, borderRadius: 10 }}><strong>{label}</strong><div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>{directions.map(facing => <PixelArt key={facing} art={campusAvatarArt(look, facing)} label={label + ' ' + facing} style={{ width: 58, height: 78, imageRendering: 'pixelated' }}/>)}</div></div>)}</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>{Object.keys(itemArt).filter(key => tab !== 'actions' || ['bed', 'chair', 'dorm-sofa', 'dorm-armchair'].includes(key)).flatMap(key => rotations.map(rotation => { const sprites = furnitureSprites(key, rotation, actionLook)!; const art = tab === 'actions' ? sprites.action!.frames[0] : sprites.idle; return <div key={key + rotation} style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'column', padding: 12, background: '#e2e8dc', borderRadius: 10 }}><strong style={{ fontSize: 12 }}>{key.replace('dorm-', '')} · {rotation}°</strong><PixelArt art={art} label={`${key} ${rotation}`} style={{ maxWidth: '100%', height: 180, width: 'auto', objectFit: 'contain', imageRendering: 'pixelated' }}/></div>; }))}</div>}
 </main>;
}
