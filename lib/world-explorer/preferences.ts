export type ExplorerPreferences={musicVolume:number;effectsVolume:number;reducedMotion:boolean;graphicsQuality:'standard'|'low';touchControls:boolean;debugMode:boolean;explorerAssist:boolean};
export const PREFERENCES_KEY='socialu.world-explorer.preferences.v1';
type PreferenceStorage=Pick<Storage,'getItem'|'setItem'>;
const volume=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
export function defaultExplorerPreferences():ExplorerPreferences{
 let reducedMotion=false;try{reducedMotion=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{/* Browser preference support is optional. */}
 return{musicVolume:.12,effectsVolume:.45,reducedMotion,graphicsQuality:'standard',touchControls:false,debugMode:false,explorerAssist:false};
}
export function sanitizeExplorerPreferences(raw:unknown):ExplorerPreferences{
 const defaults=defaultExplorerPreferences();if(!raw||typeof raw!=='object'||Array.isArray(raw))return defaults;
 const value=raw as Record<string,unknown>;
 return{musicVolume:volume(value.musicVolume,defaults.musicVolume),effectsVolume:volume(value.effectsVolume,defaults.effectsVolume),reducedMotion:typeof value.reducedMotion==='boolean'?value.reducedMotion:defaults.reducedMotion,graphicsQuality:value.graphicsQuality==='low'?'low':'standard',touchControls:value.touchControls===true,debugMode:value.debugMode===true,explorerAssist:value.explorerAssist===true};
}
function browserStorage(){try{return typeof localStorage==='undefined'?undefined:localStorage;}catch{return undefined;}}
export function loadExplorerPreferences(storage:PreferenceStorage|undefined=browserStorage()):ExplorerPreferences{
 try{const raw=storage?.getItem(PREFERENCES_KEY);return raw?sanitizeExplorerPreferences(JSON.parse(raw)):defaultExplorerPreferences();}catch{return defaultExplorerPreferences();}
}
export function saveExplorerPreferences(value:ExplorerPreferences,storage:PreferenceStorage|undefined=browserStorage()):boolean{
 if(!storage)return false;try{storage.setItem(PREFERENCES_KEY,JSON.stringify(sanitizeExplorerPreferences(value)));return true;}catch{return false;}
}
