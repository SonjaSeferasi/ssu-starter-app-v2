import * as T from 'three';
import {Builder,boxUV,clamp,fbm,hash,random,smooth,vertexMaterial} from './common';
import {markSurface,type SurfaceSet} from './surface-maps';
import {platformSurfaceY} from '../../../lib/world-explorer/platform-surface';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';

/** Playable terrain that reads as part of the land rather than as a floating
 * rock: continuous ground and cliffs run straight down out of view, slopes
 * and stair treads follow the exact collision surface, and ice shelves have
 * a glassy lip. The walking cap is always at the collision height across the
 * whole lane; only the front face and side faces carry relief. */
export type LandmassPalette={
 top:string;topAlt:string;edge:string;face:string;faceDark:string;band:string;
 /** Photographic CC0 surface for the body and (optionally) for the cap. */
 maps?:{set:SurfaceSet;tint?:string;repeat?:number};capMaps?:{set:SurfaceSet;tint?:string;repeat?:number};
 /** Relief of the front face in world units, and the strata spacing. */
 rough?:number;strata?:number;
};
export type LandmassKind='ground'|'cliff'|'stairs'|'ice'|'block';

const capDepth=.12;

/** Remove the default island meshes before building a custom platform body. */
export function clearPlatformRoot(root:T.Group){
 for(const child of [...root.children]){
  child.traverse(object=>{if(object instanceof T.Mesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});
  child.removeFromParent();
 }
}

/** Front face, sides and top as one vertex-coloured mesh. Coordinates are
 * local to the platform root (centred in x, cap at y=0 at the left edge). */
function bodyGeometry(definition:PlatformDefinition,palette:LandmassPalette,kind:LandmassKind,low:boolean,seed:number){
 const w=definition.width,d=Math.max(2,definition.depth),depth=definition.thickness,top=(x:number)=>platformSurfaceY({...definition,x:-w/2,y:0},x);
 const rough=palette.rough??(kind==='cliff'?.32:kind==='ice'?.08:.16),strata=palette.strata??(kind==='cliff'?.7:1.1);
 // Standing rock flares toward its base so a pillar reads as eroded stone, not a box.
 const flare=(y:number,surface:number)=>kind==='cliff'?1+Math.min(.35,Math.max(0,surface-y-.6)*.03):1;
 const columns=clamp(Math.ceil(w*(low?1.4:2.8)),4,90),rows=clamp(Math.ceil(depth*(low?.9:1.8)),3,46);
 const face=new T.Color(palette.face),dark=new T.Color(palette.faceDark),band=new T.Color(palette.band),edge=new T.Color(palette.edge);
 const positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const colour=(x:number,y:number,surface:number)=>{
  const below=surface-y,t=clamp(below/Math.max(2,depth*.8),0,1),layer=(y+fbm(x*.3,y*.2,seed,2)*.6)/strata;
  const seam=1-smooth(.04,.16,Math.abs(layer-Math.floor(layer)-.5)),grain=fbm(x*1.7,y*1.7,seed+7,3);
  const c=face.clone().lerp(dark,t*.75+(grain-.5)*.35).lerp(band,seam*.32);if(below<.35)c.lerp(edge,1-below/.35);return c;
 };
 // Front face (z = +d/2) with outward relief that never enters the lane.
 const relief=(x:number,y:number,surface:number)=>{const lip=smooth(0,.4,surface-y);return(fbm(x*.55,y*.55,seed+3,3)-.5)*2*rough*lip+(kind==='cliff'?Math.sin(y*1.7+fbm(x*.2,0,seed,2)*4)*rough*.35*lip:0);};
 const grid=(build:(i:number,j:number)=>[number,number,number,T.Color],nx:number,ny:number,flip=false)=>{
  const start=positions.length/3;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const [x,y,z,c]=build(i,j);positions.push(x,y,z);colors.push(c.r,c.g,c.b);}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=start+j*(nx+1)+i,b=a+1,c=a+nx+1,e=c+1;if(flip)indices.push(a,c,b,b,c,e);else indices.push(a,b,c,b,e,c);}
 };
 const stepX=(i:number)=>-w/2+w*i/columns;
 grid((i,j)=>{const x=stepX(i),surface=top(x),y=surface-capDepth-(depth-capDepth)*Math.pow(j/rows,1.15);return[x*flare(y,surface),y,d/2+relief(x,y,surface),colour(x,y,surface)];},columns,rows,true);
 // Side faces show at every terrace drop; they reuse the same strata.
 for(const side of [-1,1]){
  const x=side*w/2,surface=top(x*.999),across=low?3:6;
  grid((i,j)=>{const z=-d/2+d*i/across,y=surface-capDepth-(depth-capDepth)*Math.pow(j/rows,1.15),c=colour(z+x,y,surface);return[x*flare(y,surface)+(side*(fbm(z,y,seed+11,2)-.5)*rough*.6*smooth(0,.4,surface-y)),y,z,c];},across,rows,side<0);
 }
 // Under-cap rim: a short vertical band that joins the cap to the face.
 grid((i,j)=>{const x=stepX(i),surface=top(x),y=surface-capDepth*j;return[x,y,d/2+(j?relief(x,y-capDepth,surface):0),edge];},columns,1,true);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
 const flat=geometry.toNonIndexed();geometry.dispose();flat.computeVertexNormals();boxUV(flat,.42);return flat;
}

/** Walking cap: follows the collision surface exactly, slightly overhanging
 * the front so the lip reads as a ledge. Stair treads get crisp nosings. */
function capGeometry(definition:PlatformDefinition,palette:LandmassPalette,seed:number,low:boolean){
 const w=definition.width,d=Math.max(2,definition.depth),b=new Builder(.5),r=random(seed),a=new T.Color(palette.top),alt=new T.Color(palette.topAlt);
 if(definition.steps&&definition.steps>1&&definition.slope){
  const tread=w/definition.steps;
  for(let i=0;i<definition.steps;i++){const x=-w/2+tread*(i+.5),y=platformSurfaceY({...definition,x:-w/2,y:0},x);b.add(new T.BoxGeometry(tread+.01,capDepth,d+.12),a.clone().lerp(alt,r()*.6),[x,y-capDepth/2+.015,0]);b.add(new T.BoxGeometry(tread+.01,.06,.12),palette.edge,[x,y-.03,d/2+.06]);}
  return b.geometry();
 }
 const columns=clamp(Math.ceil(w*(low?1:2)),2,60),slope=definition.slope||0,angle=Math.atan2(slope,w),length=Math.hypot(w,slope);
 const g=new T.BoxGeometry(length,capDepth,d+.14,columns,1,low?2:4),p=g.getAttribute('position'),colors=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){const n=fbm(p.getX(i)*.8,p.getZ(i)*.8,seed,3),c=a.clone().lerp(alt,clamp(n*1.4-.2,0,1));colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
 g.setAttribute('color',new T.BufferAttribute(colors,3));g.rotateZ(angle);g.translate(0,slope/2-capDepth/2+.015,0);boxUV(g,.5);return g;
}

/** Replace the default island with modeled ground. Returns the details group
 * a country can add plants and props to (keep them outside |z| < .55). */
export function dressLandmass(root:T.Group,definition:PlatformDefinition,palette:LandmassPalette,options:{low:boolean;kind?:LandmassKind;seed?:number}){
 clearPlatformRoot(root);
 const seed=options.seed??hash(definition.id),kind=options.kind??'ground';
 const bodyMaterial=vertexMaterial(kind==='ice'?.35:.94,kind==='ice'?{metalness:.05}:{});if(palette.maps&&kind!=='ice')markSurface(bodyMaterial,palette.maps.set,palette.maps.tint,palette.maps.repeat);
 const body=new T.Mesh(bodyGeometry(definition,palette,kind,options.low,seed),bodyMaterial);body.name='country-platform-cliff';body.castShadow=body.receiveShadow=true;root.add(body);
 const capMaterial=vertexMaterial(kind==='ice'?.18:.9,kind==='ice'?{metalness:.08}:{});if(palette.capMaps)markSurface(capMaterial,palette.capMaps.set,palette.capMaps.tint,palette.capMaps.repeat);
 const cap=new T.Mesh(capGeometry(definition,palette,seed,options.low),capMaterial);cap.name='country-platform-cap';cap.receiveShadow=true;root.add(cap);
 root.userData.surface=definition.terrain||kind;root.userData.landmass=kind;
 const details=new T.Group();details.name='terrain-dressing';details.userData={nonColliding:true,walkingCorridor:.55,landmass:kind};root.add(details);
 return details;
}

/** Local surface height of a dressed platform, for placing props on slopes. */
export function localSurface(definition:PlatformDefinition){return(x:number)=>platformSurfaceY({...definition,x:-definition.width/2,y:0},x);}

/** Rear placements along a platform that stay out of the walking lane. */
export function rearSpots(definition:PlatformDefinition,count:number,seed:number,front=false){
 const r=random(seed),w=definition.width,d=Math.max(2,definition.depth),surface=localSurface(definition);
 return Array.from({length:count},()=>{const x=(r()-.5)*w*.86,z=(front?1:-1)*(.75+r()*(d/2-.85));return{x,y:surface(x),z,r:r()};});
}
