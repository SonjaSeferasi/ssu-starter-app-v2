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

/** A sculpted, closed body with limited visual depth, used instead of a wall
 * that runs straight down out of view. `island` tapers on every side into an
 * eroded, off-centre keel (a floating rock); `shelf` keeps its back face and
 * recedes from the front and below, so a ledge reads as part of a cliff behind
 * it. Rings of the shell follow the walking cap at the top; strata, moss on
 * the lip and a darker underside are baked into vertex colours. The collider
 * is untouched: this is visual depth only. */
export type BodyProfile='wall'|'island'|'shelf'|'mass';
function sculptedBodyGeometry(definition:PlatformDefinition,palette:LandmassPalette,profile:'island'|'shelf'|'mass',visualDepth:number,seed:number,low:boolean){
 const w=definition.width,d=Math.max(2,definition.depth),top=(x:number)=>platformSurfaceY({...definition,x:-w/2,y:0},x);
 const segments=clamp(Math.round((w+d)*(low?2:4)),24,low?48:110),rings=low?6:12,r=random(seed),phase=r()*6.28;
 const face=new T.Color(palette.face),dark=new T.Color(palette.faceDark),band=new T.Color(palette.band),edge=new T.Color(palette.edge),moss=new T.Color(palette.topAlt);
 // A rounded rectangle traced once around; the front edge stays straight
 // across the walking lane so the ledge reads exactly where the cap is.
 const corner=Math.min(d*.42,w*.3),perimeter=2*(w+d-4*corner)+2*Math.PI*corner;
 const point=(u:number)=>{
  let s=u*perimeter;const hw=w/2-corner,hd=d/2-corner,straight=[2*hw,2*hd,2*hw,2*hd],start:[number,number][]=[[-hw,d/2],[w/2,hd],[hw,-d/2],[-w/2,-hd]],dir:[number,number][]=[[1,0],[0,-1],[-1,0],[0,1]],centres:[number,number][]=[[hw,hd],[hw,-hd],[-hw,-hd],[-hw,hd]];
  for(let k=0;k<4;k++){if(s<=straight[k])return{x:start[k][0]+dir[k][0]*s,z:start[k][1]+dir[k][1]*s,nx:dir[k][1],nz:-dir[k][0]};s-=straight[k];const arc=Math.PI/2*corner;if(s<=arc){const a=Math.PI/2-k*Math.PI/2-s/corner;return{x:centres[k][0]+Math.cos(a)*corner,z:centres[k][1]+Math.sin(a)*corner,nx:Math.cos(a),nz:Math.sin(a)};}s-=arc;}
  return{x:start[0][0],z:start[0][1],nx:0,nz:1};
 };
 const positions:number[]=[],colors:number[]=[],indices:number[]=[];
 for(let j=0;j<=rings;j++){
  const t=j/rings;
  for(let i=0;i<=segments;i++){
   // The angle wraps with the outline, so the ring's closing vertex matches its
   // first exactly; otherwise the non-periodic noise opens a seam in the body.
   const u=i/segments,p=point(u%1),a=(u%1)*Math.PI*2,lip=smooth(0,.18,t);
   // Erosion: bulging strata bands and fissures, strongest mid-depth.
   const fracture=(Math.sin(t*19+Math.sin(a*3+phase)*.9)*.05+Math.sin(a*9+Math.floor(t*5)*1.7+phase)*.06+(fbm(a*1.3,t*3,seed,3)-.5)*.22)*Math.sin(t*Math.PI)*lip;
   let x=p.x,z=p.z,y=top(Math.max(-w/2,Math.min(w/2,p.x)))-capDepth;
   if(profile==='island'){
    const taper=1-.86*smooth(.04,1,t)+fracture;x=p.x*taper+w*.06*Math.sin(phase)*t*t;z=p.z*taper+d*.08*Math.cos(phase)*t*t;
    y-=visualDepth*t*(1+(Math.sin(a*3+phase)*.12+Math.sin(a*7-phase)*.06)*smooth(.1,.8,t));
   }else if(profile==='mass'){
    // A rock mass rising from water or ground: it widens toward its base.
    const flare=1+.24*smooth(0,1,t)+fracture;x=p.x*flare;z=p.z*flare;
    y-=visualDepth*t*(1+(fbm(a*2,t*2,seed+9,2)-.5)*.12*lip);
   }else{
    // A ledge: the back stays against the cliff, the front and sides recede.
    const recede=smooth(0,1,t)*.78-fracture*.8;z=-d/2+(p.z+d/2)*(1-recede);x=p.x*(1-recede*.35);
    y-=visualDepth*t*(1+(fbm(a*2,t,seed+5,2)-.5)*.35*lip);
   }
   if(j>0&&j<rings){const push=(fbm(x*.7,y*.7,seed+3,3)-.5)*.28*lip;x+=p.nx*push;z+=p.nz*push;}
   positions.push(x,y,z);
   const layer=(y*1.6+fbm(x*.3,y*.2,seed,2)*1.2),seam=1-smooth(.04,.18,Math.abs(layer-Math.floor(layer)-.5)),grain=fbm(x*1.5,y*1.5,seed+7,3);
   const c=face.clone().lerp(dark,t*.7+(grain-.5)*.3).lerp(band,seam*.3);
   const drip=(Math.sin(a*7+seed)+Math.sin(a*17+seed*.2))*.5,mossLine=.05+Math.max(0,drip)*.16;if(t<mossLine)c.lerp(moss,.55*(1-t/mossLine));if(t<.02)c.lerp(edge,.5);
   colors.push(c.r,c.g,c.b);
  }
 }
 for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+1,c=a+segments+1;indices.push(a,c,b,b,c,c+1);}
 // Close the underside: an off-centre point for an island, a sloped seal for a shelf.
 const keel=positions.length/3,bottom=top(0)-capDepth-visualDepth*(profile==='island'?1.12:1.02);
 positions.push(profile==='island'?w*.07*Math.sin(phase):0,bottom,profile==='island'?d*.1*Math.cos(phase):profile==='mass'?0:-d*.42);const k=dark.clone().multiplyScalar(.85);colors.push(k.r,k.g,k.b);
 for(let i=0;i<segments;i++)indices.push(rings*(segments+1)+i,keel,rings*(segments+1)+i+1);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
 const flat=geometry.toNonIndexed();geometry.dispose();flat.computeVertexNormals();boxUV(flat,.42);flat.userData={profile,visualDepth,closedUnderside:true};return flat;
}

/** A decorative sculpted rock mass (cliff, outcrop, island) built with the
 * same shell as the platform bodies. Its top sits at y; it is not a collider. */
export function createRockMass(parent:T.Object3D,options:{name:string;x:number;y:number;z:number;width:number;depth:number;height:number;palette:LandmassPalette;profile?:'island'|'mass'|'shelf';seed?:number;low:boolean}){
 const definition={id:options.name,x:-options.width/2,y:0,width:options.width,depth:options.depth,thickness:options.height,type:'stone',motion:null,amplitude:0,phase:0,period:7} as PlatformDefinition;
 const seed=options.seed??hash(options.name),material=vertexMaterial(.94);if(options.palette.maps)markSurface(material,options.palette.maps.set,options.palette.maps.tint,options.palette.maps.repeat);
 const body=new T.Mesh(sculptedBodyGeometry(definition,options.palette,options.profile??'mass',options.height,seed,options.low),material);body.name=options.name;body.castShadow=body.receiveShadow=true;
 const cap=new T.Mesh(capGeometry({...definition,depth:options.depth*.92},options.palette,seed,options.low),vertexMaterial(.9));cap.name=options.name+'-top';cap.receiveShadow=true;
 const root=new T.Group();root.name=options.name+'-mass';root.position.set(options.x,options.y,options.z);root.add(body,cap);root.userData.nonColliding=true;parent.add(root);return root;
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
export function dressLandmass(root:T.Group,definition:PlatformDefinition,palette:LandmassPalette,options:{low:boolean;kind?:LandmassKind;seed?:number;profile?:BodyProfile;visualDepth?:number}){
 clearPlatformRoot(root);
 const seed=options.seed??hash(definition.id),kind=options.kind??'ground',profile=options.profile??'wall';
 const bodyMaterial=vertexMaterial(kind==='ice'?.35:.94,kind==='ice'?{metalness:.05}:{});if(palette.maps&&kind!=='ice')markSurface(bodyMaterial,palette.maps.set,palette.maps.tint,palette.maps.repeat);
 const visualDepth=Math.min(definition.thickness,options.visualDepth??Math.max(1.6,Math.min(5,definition.width*.45)));
 const body=new T.Mesh(profile==='wall'?bodyGeometry(definition,palette,kind,options.low,seed):sculptedBodyGeometry(definition,palette,profile,visualDepth,seed,options.low),bodyMaterial);body.name='country-platform-cliff';body.castShadow=body.receiveShadow=true;root.add(body);
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
