'use client';
import {useState} from 'react';
import styles from './world-explorer.module.css';

type PreviewProps={title:string;src:string};

/** The figure for one country's in-game preview. A failed image is replaced by
 * a labelled fallback; the figure itself is never hidden. */
export function LevelPreviewView({title,src,failed,onError}:PreviewProps&{failed:boolean;onError:()=>void}){
 return <figure className={styles.landmarkPhoto}>
  {failed?<p role="status">Preview image unavailable for {title}.</p>:<img src={src} alt={`In-game view of ${title}`} loading="lazy" onError={onError}/>}
  <figcaption>In-game capture · {title}</figcaption>
 </figure>;
}

/** Render with `key={country code}` so each country starts with a fresh preview
 * and one country's image failure cannot carry over to the next. */
export function LevelPreview({title,src}:PreviewProps){
 const [failed,setFailed]=useState(false);
 return <LevelPreviewView title={title} src={src} failed={failed} onError={()=>setFailed(true)}/>;
}
