import * as T from 'three';
import {dressLandmass,type LandmassPalette} from '../kit/landmass';
import {dressTerrain,type TerrainPreset} from '../kit/terrain';
import {localSurface} from '../kit/landmass';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';
import type {NorthAmericaCode} from '../../../lib/world-explorer/north-america';

/** Sculpted geology and painted surface detail, following the same separation
 * of a precise cap and decorative shoulders that makes Japan readable. */
export function dressNorthAmericanGround(root:T.Group,p:PlatformDefinition,code:NorthAmericaCode,palette:LandmassPalette,low:boolean){
 const city=code==='USA',snow=code==='CAN'&&(p.surface==='ice'||p.y>1.1),wet=code==='JAM'&&(!!p.current||p.surface==='ice'),maya=code==='MEX'||code==='GTM';
 const colors={...palette,rough:city?.07:.24};
 if(city&&p.terrain==='rooftop')colors.maps={set:'red-brick',tint:'#dfd1bb',repeat:.8};
 if(code==='MEX')Object.assign(colors,{face:'#b4b4a5',faceDark:'#737b6c',edge:'#cbcaba',band:'#92988a',top:'#a7b976',topAlt:'#91a467'});
 if(code==='GTM')Object.assign(colors,{face:'#a2aaa0',faceDark:'#4e6654',edge:'#b7c0aa',band:'#7b8c76',top:'#8ca75e',topAlt:'#b7c681'});
 if(code==='JAM')Object.assign(colors,{face:'#c6c4ad',faceDark:'#7f9180',edge:'#d9dac6',band:'#a6b5a0',top:wet?'#b6d9d0':'#97bb75',topAlt:'#c5d9a4'});
 if(code==='CAN')Object.assign(colors,{face:'#b4b6b0',faceDark:'#718087',edge:'#d4d9d4',band:'#919e9e',top:snow?'#eaf0ef':'#a7b58b',topAlt:'#b6c7a0'});
 const capKind=city?'paving':snow?'snow':wet?'moss':code==='MEX'?'grass':'moss';
 const visualDefinition=city?{...p,thickness:Math.max(10,p.thickness)}:p;
 dressLandmass(root,visualDefinition,colors,{low,kind:p.terrain==='stairs'?'stairs':city?'block':wet?'ice':'cliff',profile:city||p.terrain==='stairs'?'wall':p.route==='bonus'?'shelf':'mass',visualDepth:p.route==='bonus'?1.2:Math.min(visualDefinition.thickness,city?13:9)});
 const preset:TerrainPreset={id:'north-america-'+code.toLowerCase(),shape:city||maya?'masonry':'rock',rock:{light:colors.face,dark:colors.faceDark,crack:colors.band,top:colors.top,topDepth:.06,strata:.8},cap:{kind:capKind,a:city?'#c6c6ba':colors.top,b:colors.topAlt,c:city?'#a3aca6':colors.edge,path:city?.7:code==='MEX'?.4:.24},rim:{kind:snow?'drift':city?'curb':'moss',color:snow?'#f7fbfc':city?'#dedbd1':colors.topAlt,alt:colors.edge,size:city?.25:.5},
  ...(!city&&!snow?{blades:{color:code==='JAM'?'#60954d':'#659548',alt:'#acc266',density:1.1,height:.45},ferns:code==='GTM'||code==='CRI'?'#4d8b56':undefined,flowers:{colors:code==='CAN'?['#b4a7dc','#f6f2ce']:code==='JAM'?['#f2b990','#f0df8b']:['#e4d592','#e2e8c4'],density:.5},vines:{color:'#648b4d',leaf:'#8eae60',density:.7,length:Math.min(2.6,p.thickness*.6)}}:{}),pebbles:colors.edge};
 // Reuse the detailed grass/moss/paving material and vegetation builders,
 // while retaining the sculpted cap's exact authored slope and endpoints.
 const staging=new T.Group(),sample=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshStandardMaterial());sample.name='country-platform-cap';staging.add(sample);
 const dressing=dressTerrain(staging,{...p,thickness:Math.min(p.thickness,4)},preset,{quality:low?'low':'standard',lush:p.width>9,sparse:!!p.slope});
 const cap=root.getObjectByName('country-platform-cap') as T.Mesh;for(const m of Array.isArray(cap.material)?cap.material:[cap.material])m.dispose();cap.material=sample.material;sample.geometry.dispose();sample.removeFromParent();
 if(wet){const material=cap.material as T.MeshStandardMaterial;material.roughness=.24;material.metalness=.03;material.color.set('#d3eeeb');}
 // Full-width platform caps remain untouched; all vegetation is outside the
 // standing lane. The source decorator guarantees |z| > .55.
 dressing.name='north-america-planted-rim';root.add(dressing);
 root.userData.surfaceHint=wet?'wet-rock':p.surface==='ice'?'slippery-ice':city?'harbor-paving':'natural-trail';
 return colors;
}
