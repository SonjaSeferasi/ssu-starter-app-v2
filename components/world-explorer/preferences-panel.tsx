'use client';
import {defaultExplorerPreferences,type ExplorerPreferences} from '../../lib/world-explorer/preferences';
import styles from './world-explorer.module.css';

export function PreferencesControls({value,onChange,inGame=false}:{value:ExplorerPreferences;onChange:(value:ExplorerPreferences)=>void;inGame?:boolean}){
 return <div className={styles.preferences}>
  <label>Music <output>{Math.round(value.musicVolume*100)}%</output><input type="range" min="0" max="1" step="0.05" value={value.musicVolume} onChange={event=>onChange({...value,musicVolume:Number(event.target.value)})}/></label>
  <label>Sound effects <output>{Math.round(value.effectsVolume*100)}%</output><input type="range" min="0" max="1" step="0.05" value={value.effectsVolume} onChange={event=>onChange({...value,effectsVolume:Number(event.target.value)})}/></label>
  <label className={styles.preferenceToggle}><input type="checkbox" checked={value.reducedMotion} onChange={event=>onChange({...value,reducedMotion:event.target.checked})}/><span>Reduced motion<small>Gentler scenery and fewer moving particles</small></span></label>
  <label>Graphics<select value={value.graphicsQuality} onChange={event=>onChange({...value,graphicsQuality:event.target.value==='low'?'low':'standard'})}><option value="standard">Standard</option><option value="low">Lightweight</option></select><small>{inGame?'Graphics quality applies when you restart or enter a level.':'Lightweight reduces shadows, particles and drawing resolution.'}</small></label>
  <button className={styles.quietButton} onClick={()=>onChange(defaultExplorerPreferences())}>Restore defaults</button>
 </div>;
}
