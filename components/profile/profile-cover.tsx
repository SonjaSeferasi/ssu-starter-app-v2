'use client';
import type { ProfileTheme } from '../../lib/profile-themes';
import { ProfileThemeArtwork } from './profile-theme-artwork';
import { Leaf } from 'lucide-react';
import Image from 'next/image';
import { useId, type ReactNode } from 'react';
import { areaStickers, stickerPosition, type DecorationArea, type ProfileLook, type SpaceStickerKind } from '../../lib/profile-space';
import { STICKER_CATALOG, STICKER_SHEETS, STICKERS_BY_KIND } from '../../lib/profile-stickers';
import styles from './profile-space.module.css';

export const STICKER_LABELS = Object.fromEntries([...STICKER_CATALOG.map(sticker=>[sticker.kind,sticker.label]),['leaf','Leaf']]) as Record<SpaceStickerKind,string>;

export function StickerArt({kind}: {kind:SpaceStickerKind}) {
  const clipId=`sticker-${useId().replace(/:/g,'')}`;
  if(kind==='leaf')return <span className={styles.stickerArt} aria-hidden="true"><Leaf className={styles.legacyLeaf}/></span>;
  const sticker=STICKERS_BY_KIND[kind];const sheet=STICKER_SHEETS[sticker.sheet];
  const [x,y,width,height]=sticker.crop.split(' ').map(Number);
  const clip = 'clip' in sticker ? sticker.clip : '';
  return <span className={styles.stickerArt} aria-hidden="true"><svg viewBox={sticker.crop} preserveAspectRatio="xMidYMid meet" focusable="false"><defs><clipPath id={clipId}>{clip ? <polygon points={clip}/> : <rect x={x} y={y} width={width} height={height}/>}</clipPath></defs><image href={sheet.src} width={sheet.width} height={sheet.height} clipPath={`url(#${clipId})`}/></svg></span>;
}

export function CoverArtwork({cover,thumbnail=false,photoUrl,theme}: {cover:ProfileLook['cover'];thumbnail?:boolean;photoUrl?:string|null;theme?:ProfileTheme}) {
  if(photoUrl)return <img className={styles.artwork} src={photoUrl} alt="" draggable={false} style={{width:'100%',height:'100%',objectFit:'cover'}}/>;
  if(cover==='meadow'&&theme)return <ProfileThemeArtwork theme={theme}/>;
  if(cover==='meadow')return <Image className={styles.artwork} src="/profile-space/campus-watercolor-v1.png" alt="" draggable={false} fill sizes={thumbnail?'120px':'(max-width:800px) 100vw, calc(100vw - 430px)'} priority={!thumbnail}/>;
  return <svg className={styles.artwork} viewBox="0 0 1000 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="1000" height="240" fill="var(--space-soft)" />
    {cover==='lines' && <g fill="none" stroke="var(--space-accent)" strokeWidth="2" opacity=".22">{[0,1,2,3,4,5].map(index=><path key={index} d={`M${-100+index*80} -60C${480+index*25} 40 ${300+index*60} 250 ${1100+index*35} 300`} />)}</g>}
  </svg>;
}

export function ProfileCover({look,children,coverUrl}: {look:ProfileLook;children?:ReactNode;coverUrl?:string|null}) {
  return <div className={styles.cover}>
    <CoverArtwork cover={look.cover} theme={look.theme} photoUrl={look.coverKey?coverUrl:null} />
    <ProfileStickerLayer look={look} area="cover"/>
    {children}
  </div>;
}

export function ProfileStickerLayer({look,area}: {look:ProfileLook;area:DecorationArea}) {
  return <div className={styles.decorations} aria-hidden="true">{areaStickers(look,area).map(sticker=>{const point=stickerPosition(sticker);return <div key={sticker.id} className={styles.placedSticker} style={{left:`${point.x}%`,top:`${point.y}%`,transform:`translate(-50%,-50%) rotate(${sticker.rotation}deg)`,['--scale' as string]:sticker.scale??1}}><StickerArt kind={sticker.kind}/></div>;})}</div>;
}
export function ProfileDecoratedCard({look,area,children}: {look:ProfileLook;area:'about'|'notes';children:ReactNode}) {
  return <div className={styles.cardSurface} data-space-card={area==='about'?'about':'hello'} data-finish={look.cardFinishes?.[area]??'clean'}>{children}<ProfileStickerLayer look={look} area={area}/></div>;
}
