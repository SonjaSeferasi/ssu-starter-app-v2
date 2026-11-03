import * as T from 'three';
import {dressLandmass,type LandmassPalette} from '../kit/landmass';
import {dressTerrain,type TerrainPreset} from '../kit/terrain';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';
export const islandArt={
 DMA:{sky:'#719ca8',horizon:'#becfc7',background:'#afc7c5',sun:'#e4eee2',sunIntensity:2.2,top:'#46764d',topAlt:'#628550',face:'#686c59',dark:'#354d40',water:'#85aba0',deep:'#3e716e',map:'mossy-rock',tint:'#9eb6a0',plants:true},
 LCA:{sky:'#519dce',horizon:'#d4e4d8',background:'#b6dae5',sun:'#fff0cd',sunIntensity:3.3,top:'#72a24e',topAlt:'#9bbd68',face:'#8b927c',dark:'#4d6a55',water:'#48bfc4',deep:'#247d9d',map:'coastal-rock',tint:'#b4c9b8',plants:true},
 NIC:{sky:'#8eacbf',horizon:'#e6d9bc',background:'#d4d4bd',sun:'#ffdda4',sunIntensity:3.1,top:'#858752',topAlt:'#a7a36a',face:'#666957',dark:'#424e43',water:'#778f9f',deep:'#405f78',map:'alpine-rock',tint:'#a6a18a',plants:true},
 VCT:{sky:'#8d9ea5',horizon:'#d0d2c6',background:'#c0c8c5',sun:'#eee6d5',sunIntensity:2.4,top:'#8d8e81',topAlt:'#b1ada0',face:'#5e655e',dark:'#3c4742',water:'#657f8a',deep:'#3f616b',map:'coastal-rock',tint:'#90958a',plants:false},
 TTO:{sky:'#a5b8a0',horizon:'#efd7a8',background:'#d1cdb0',sun:'#ffd398',sunIntensity:2.7,top:'#5f6c3e',topAlt:'#7c8b50',face:'#71654b',dark:'#384c39',water:'#7e9161',deep:'#405a42',map:'coastal-rock',tint:'#928b69',plants:true},
} as const;
export type IslandArtCode=keyof typeof islandArt;
/** Country-specific cap materials on the exact authored floor. The rendered
 * body depth can be shallow (a canal quay) without moving any collider. */
export function dressIslandGround(root:T.Group,p:PlatformDefinition,palette:LandmassPalette,low:boolean,code:IslandArtCode|'PAN'){
 const art=code==='PAN'?undefined:islandArt[code],canal=code==='PAN';
 const visual=canal?{...p,thickness:Math.min(p.thickness,1.4)}:p;
 dressLandmass(root,visual,palette,{low,kind:canal?'block':p.terrain==='stairs'?'stairs':'cliff',profile:canal?'wall':p.route==='bonus'?'shelf':'mass',visualDepth:canal?1.4:Math.min(p.thickness,8)});
 const preset:TerrainPreset={id:'island-'+code,shape:canal?'masonry':'rock',rock:{light:palette.face,dark:palette.faceDark,crack:palette.band,top:palette.top,topDepth:.06,strata:.8},cap:{kind:canal?'paving':code==='VCT'||code==='NIC'?'dry':code==='TTO'?'earth':'grass',a:palette.top,b:palette.topAlt,c:palette.edge,path:canal?.8:code==='VCT'?.5:.24},rim:{kind:canal?'curb':'moss',color:palette.topAlt,alt:palette.edge,size:canal?.16:.32},pebbles:palette.edge,
  ...(art?.plants?{blades:{color:art.top,alt:art.topAlt,density:code==='NIC'?.5:.9,height:code==='TTO'?.5:.3},ferns:code==='DMA'?'#356947':undefined}:{}),
 };
 const staging=new T.Group(),sample=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshStandardMaterial());sample.name='country-platform-cap';staging.add(sample);
 const detail=dressTerrain(staging,{...p,thickness:Math.min(p.thickness,4)},preset,{quality:low?'low':'standard',lush:code==='DMA',sparse:!!p.slope||code==='VCT'});
 const cap=root.getObjectByName('country-platform-cap') as T.Mesh;for(const m of Array.isArray(cap.material)?cap.material:[cap.material])m.dispose();cap.material=sample.material;sample.geometry.dispose();sample.removeFromParent();detail.name='island-trail-rim';root.add(detail);
}
