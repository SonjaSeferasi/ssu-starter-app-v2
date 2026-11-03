import * as T from 'three';
import {Builder,ellipsoid,matte,random,scatter,standard,valueNoise,vertexMaterial,type Placement} from '../../kit/common';
import {createHeightfield,duneHeight,gradientColor,mountainColor,ridgedRange,rollingHills} from '../../kit/landform';
import {createWaterSurface,createShoreFoam} from '../../kit/water';
import {createDrift,type DriftKind} from '../../kit/particles';
import {createFlock} from '../../kit/wildlife';
import {createHerd,type AnimalKind} from '../../kit/animals';
import {windBanners} from '../../kit/wind';
import {dressDeck,type DeckPalette,type DeckStyle} from '../../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate,type ArchStyle,type CrateStyle} from '../../kit/markers';
import {clearPlatformRoot,dressLandmass,rearSpots,type LandmassPalette} from '../../kit/landmass';
import type {HazardPalette} from '../../kit/hazards';
import {woodenDeck} from '../../kit/wooden-deck';
import type {MechanismPalette} from '../../kit/mechanisms';
import type {CreatureRig} from '../../kit/creature';
import type {LevelDefinition,PlatformDefinition} from '../../../../lib/world-explorer/game-types';
import {africaPlaces,type AfricaCode} from '../../../../lib/world-explorer/africa';
import {built,mountShell,roundCreature,type Animated} from '../south-america/shell';
import {plantAfrica,type AfricaFloraKind} from './flora';
import type {CountryEnvironment,EnvironmentContext,EnvironmentLighting} from '../types';

/** One factory for every African environment. A country describes its look
 * (sky, light, backdrop layers, palettes, plants, wildlife, creature) and
 * supplies its own landmark builder and any special platform dressing; the
 * factory does the layering, batching, animation, quality modes and disposal
 * the same way for all of them. Every country module stays its own lazily
 * loaded chunk. */

export type Backdrop=
 |{kind:'dunes';z:number;y:number;height:number;colors:[string,string,string];depth?:number;crests?:number;name?:string}
 |{kind:'range';z:number;y:number;height:number;peaks:number;rock:string;forest:string;grass?:string;snow?:string;snowLine?:number;treeLine?:number;sharpness?:number;depth?:number;name?:string}
 |{kind:'hills';z:number;y:number;height:number;colors:[string,string,string];scale?:number;depth?:number;name?:string}
 |{kind:'mesas';z:number;y:number;height:number;colors:[string,string,string];count?:number;depth?:number;name?:string}
 |{kind:'sea';y:number;z?:number;shallow:string;deep:string;depth?:number;name?:string;foam?:boolean}
 |{kind:'forest';z:[number,number];y:number;flora:AfricaFloraKind[];count:number;name?:string;scale?:[number,number]};
/** The open floor below the course: the drop a player sees past a ledge. */
export type Floor={kind:'water';y:number;shallow:string;deep:string;name?:string;opacity?:number}|{kind:'land';y:number;colors:[string,string,string];name?:string;rough?:number;/** Colours of the ground carried toward the camera, when it differs from the floor under the course. */apron?:[string,string,string]};
export type FloraBand={kind:AfricaFloraKind;count:number;z:[number,number];scale?:[number,number];sway?:number;y?:number};
export type CrestKind='horn'|'twin-horns'|'spines'|'ears'|'leaf'|'antennae'|'shell-plates'|'crown'|'frill'|'tusks';

export type LandmarkApi={
 context:EnvironmentContext;level:LevelDefinition;finish:number;low:boolean;r:()=>number;
 root:T.Group;features:T.Group;staticRoot:T.Group;foreground:T.Group;
 platform:(id:string)=>PlatformDefinition;
 /** A named group added to the scene; landmark names are checked by tests. */
 group:(name:string,parent?:T.Object3D)=>T.Group;
 animate:(item:Animated)=>void;
};
export type DressApi={low:boolean;seed:number;palette:(key:string)=>LandmassPalette;deck:DeckPalette;
 landmass:(root:T.Group,definition:PlatformDefinition,key?:string,profile?:'island'|'mass'|'shelf'|'wall',visualDepth?:number)=>T.Group;
 plants:(details:T.Object3D,definition:PlatformDefinition,kind?:AfricaFloraKind,count?:number)=>void};

export type AfricaLook={
 code:AfricaCode;id:string;name:string;
 lighting:EnvironmentLighting;
 sky:{zenith:string;horizon:string;glow:string;sun:[number,number,number];glowPower?:number;band?:string};
 fog:[string,number,number];clouds?:{opacity?:number;high?:[number,number];lowBand?:[number,number];groups?:number;shade?:string;color?:string;flat?:number}|false;
 layers:string[];
 backdrop:Backdrop[];floor?:Floor;
 /** Landmass palettes keyed by terrain or style; `default` is required. */
 palettes:Record<string,LandmassPalette>&{default:LandmassPalette};
 deck:DeckPalette;
 /** Plants on the rear edge of platform caps, per terrain (or `default`). */
 capFlora?:Partial<Record<string,AfricaFloraKind|null>>;
 flora?:FloraBand[];
 herds?:{kind:AnimalKind;count:number;x:number;z:number;y:number;scale?:number;range?:number;speed?:number}[];
 flocks?:{count:number;y:number;z:number;color:string;wing?:string;size?:number;glide?:boolean;name?:string;spread?:number}[];
 drift?:{kind:DriftKind;count:number;colors:string[];y:[number,number];z:[number,number];fall?:number;sway?:number;size?:number;name?:string};
 banners?:{platform:string;offset:number;colors:string[]}[];
 creature:{name:string;height:number;shell:string;belly:string;foot:string;eye?:string;crest:CrestKind;accent:string};
 crate:CrateStyle;
 checkpoint:{pole:string;cloth:string;accent:string;cap?:string};
 finishArch:{style:ArchStyle;stone:string;trim:string;accent?:string};
 mechanisms?:MechanismPalette;hazardPalette?:HazardPalette;ropeColor?:string;
 /** Deck style for each moving, bridge or raft platform style. */
 decks?:Record<string,DeckStyle>;
 landmarks:(api:LandmarkApi)=>void;
 dress?:(root:T.Group,definition:PlatformDefinition,context:EnvironmentContext,api:DressApi)=>boolean;
 license?:string;representation:string;
};

const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return Math.abs(h);};
const mix=(a:string,b:string,t:number)=>new T.Color(a).lerp(new T.Color(b),t);

function crest(rig:CreatureRig,add:(o:T.Object3D)=>void,kind:CrestKind,accent:string,h:number){
 const m=matte(accent,.45),put=(g:T.BufferGeometry,x:number,y:number,z:number,rx=0,ry=0,rz=0)=>{const o=new T.Mesh(g,m);o.position.set(x*h,y*h,z*h);o.rotation.set(rx,ry,rz);add(o);};
 switch(kind){
  case'horn':put(new T.ConeGeometry(.08*h,.45*h,8),0,.8,.22,.9);break;
  case'twin-horns':for(const s of [-1,1])put(new T.ConeGeometry(.06*h,.4*h,7),s*.16,.78,.05,-.2,0,-s*.5);break;
  case'spines':for(let i=0;i<6;i++)put(new T.ConeGeometry(.045*h,.3*h,5),0,.74-i*.02,.18-i*.1,-.3-i*.25);break;
  case'ears':for(const s of [-1,1])put(new T.SphereGeometry(.13*h,10,6),s*.27,.68,0,0,0,s*.4);break;
  case'leaf':for(const s of [-1,0,1])put(new T.ConeGeometry(.09*h,.42*h,4),s*.12,.86,0,0,0,-s*.4);break;
  case'antennae':for(const s of [-1,1]){put(new T.CylinderGeometry(.012*h,.012*h,.42*h,4),s*.12,.86,.12,.4,0,-s*.35);put(new T.SphereGeometry(.05*h,6,4),s*.2,1.04,.2);}break;
  case'shell-plates':for(const s of [-1,1])put(new T.SphereGeometry(.24*h,10,6,0,Math.PI),s*.14,.5,-.1,0,s*.3,0);break;
  case'crown':for(let i=0;i<5;i++)put(new T.ConeGeometry(.05*h,.18*h,5),Math.cos(i*1.26)*.14,.8,Math.sin(i*1.26)*.12);break;
  case'frill':put(new T.CylinderGeometry(.34*h,.34*h,.03*h,14,1,false,0,Math.PI),0,.62,-.08,Math.PI/2.4,0,Math.PI/2);break;
  case'tusks':for(const s of [-1,1])put(new T.ConeGeometry(.035*h,.26*h,6),s*.1,.3,.32,Math.PI*.62);break;
 }
 void rig;
}

/** Build a complete CountryEnvironment from an African look. */
export function africaEnvironment(look:AfricaLook):CountryEnvironment{
 const place=africaPlaces[look.code];
 const palette=(key:string)=>look.palettes[key]??look.palettes.default;
 return{
  id:look.id,
  info:{title:place.title,license:look.license??'Original procedural geometry and plant studies; CC0 surface maps listed in materials/LICENSES.md.',representation:look.representation,landmarkSource:place.source,assets:[...place.features,...look.layers]},
  lighting:look.lighting,ropeColor:look.ropeColor??look.deck.rope,mechanisms:look.mechanisms,hazardPalette:look.hazardPalette,
  mount(context){
   const {finish,low,level}=context,shell=mountShell(context,{id:look.id,name:look.name,background:look.lighting.background,fog:look.fog,sky:look.sky,clouds:look.clouds===false?false:{opacity:.85,groups:16,...look.clouds},layers:look.layers});
   const {root,staticRoot,features,foreground}=shell,r=random(hash(look.code)%100000),width=finish+320,cx=finish/2;
   // Backdrop layers, far to near.
   for(const [i,layer] of look.backdrop.entries()){
    const seed=hash(look.code)%997+i*13;
    if(layer.kind==='dunes'){const h=duneHeight(seed,layer.height,layer.crests??5);createHeightfield(features,{name:layer.name??`dune-field-${i}`,x:cx,y:layer.y,z:layer.z,width,depth:layer.depth??70,segments:[low?70:160,low?16:34],height:(u,v)=>h(u,v)*Math.min(1,v*3),color:gradientColor([[0,layer.colors[0]],[layer.height*.5,layer.colors[1]],[layer.height,layer.colors[2]]],.05)});}
    else if(layer.kind==='range')createHeightfield(features,{name:layer.name??`mountain-range-${i}`,x:cx,y:layer.y,z:layer.z,width:width+120,depth:layer.depth??60,segments:[low?70:150,low?16:30],height:ridgedRange(seed,{peaks:layer.peaks,height:layer.height,sharpness:layer.sharpness??1.4,width:.9}),color:mountainColor({snowLine:layer.snowLine??layer.height*2,rock:layer.rock,forest:layer.forest,snow:layer.snow??'#f4f6f8',treeLine:layer.treeLine??layer.height*.45,grass:layer.grass})});
    else if(layer.kind==='hills'){const h=rollingHills(seed,layer.height,layer.scale??3);createHeightfield(features,{name:layer.name??`hills-${i}`,x:cx,y:layer.y,z:layer.z,width,depth:layer.depth??60,segments:[low?60:130,low?14:28],height:(u,v)=>h(u,v)*Math.min(1,v*2.5),color:gradientColor([[0,layer.colors[0]],[layer.height*.5,layer.colors[1]],[layer.height,layer.colors[2]]],.07)});}
    else if(layer.kind==='mesas'){const n=layer.count??7,mesas=Array.from({length:n},(_,k)=>({u:(k+.3+r()*.4)/n,v:.3+r()*.4,w:.025+r()*.035,h:.6+r()*.4}));createHeightfield(features,{name:layer.name??`mesa-country-${i}`,x:cx,y:layer.y,z:layer.z,width,depth:layer.depth??70,segments:[low?90:200,low?20:40],height:(u,v)=>{let h=0;for(const m of mesas){const d=Math.hypot((u-m.u)/m.w,(v-m.v)/(m.w*3));h=Math.max(h,m.h*(d<1?1:Math.max(0,1-(d-1)*2.4)));}return(Math.round(h*5)/5*.25+h*.75)*layer.height+valueNoise(u*60,v*20,seed)*1.2;},color:(h,slope)=>new T.Color(slope>.55?layer.colors[1]:h>layer.height*.55?layer.colors[2]:layer.colors[0]).multiplyScalar(.92+valueNoise(h*3,slope*7,seed)*.16)});}
    else if(layer.kind==='sea'){const sea=createWaterSurface(features,{x:cx,y:layer.y,z:layer.z??-60,width:width+200,depth:layer.depth??140,shallow:layer.shallow,deep:layer.deep,segments:low?20:40,name:layer.name??'open-sea',flow:[.02,.01],repeat:.06});shell.animate({update:t=>sea.update(t)});}
    else if(layer.kind==='forest'){const kinds=layer.flora,count=low?Math.ceil(layer.count/2):layer.count,band=new T.Group();band.name=layer.name??`forest-band-${i}`;features.add(band);for(const [k,kind] of kinds.entries()){const spots:Placement[]=[];for(let j=k;j<count;j+=kinds.length){const s=layer.scale??[.8,1.3];spots.push({x:-30+r()*(finish+60),y:layer.y,z:layer.z[0]+r()*(layer.z[1]-layer.z[0]),scale:s[0]+r()*(s[1]-s[0]),rotation:r()*6});}plantAfrica(band,kind,spots,{low,variant:k,name:`${band.name}-${kind}`});}}
   }
   // The floor under the course, so every gap reads as a real drop.
   if(look.floor?.kind==='water'){const water=createWaterSurface(features,{x:cx,y:look.floor.y,z:-6,width:width,depth:40,shallow:look.floor.shallow,deep:look.floor.deep,opacity:look.floor.opacity,segments:low?24:60,name:look.floor.name??'course-water',flow:[.04,0],repeat:.12});shell.animate({update:t=>water.update(t)});}
   else if(look.floor?.kind==='land'){const f=look.floor,rough=f.rough??1.2;createHeightfield(features,{name:f.name??'course-floor',x:cx,y:f.y,z:-8,width,depth:46,segments:[low?60:140,low?10:20],height:(u,v)=>valueNoise(u*70,v*9,7)*rough+valueNoise(u*300,v*40,3)*rough*.3+Math.max(0,.5-v)*rough*3,color:gradientColor([[0,f.colors[0]],[rough*.8,f.colors[1]],[rough*2,f.colors[2]]],.08)});}
   // The apron: the same floor carried forward toward the camera, so the
   // full-level overview (camera far out in front) never looks into an empty,
   // fog-coloured void below the course.
   if(look.floor?.kind==='water'){const apron=createWaterSurface(features,{x:cx,y:look.floor.y-.02,z:92,width:width+120,depth:160,shallow:look.floor.shallow,deep:look.floor.deep,opacity:Math.min(1,(look.floor.opacity??.9)+.05),segments:low?12:24,name:(look.floor.name??'course-water')+'-apron',flow:[.02,0],repeat:.05});shell.animate({update:t=>apron.update(t)});}
   else if(look.floor?.kind==='land'){const f=look.floor,rough=Math.min(.6,(f.rough??1.2)*.4);createHeightfield(features,{name:(f.name??'course-floor')+'-apron',x:cx,y:f.y-.25,z:91,width:width+120,depth:160,segments:[low?30:60,low?6:12],height:(u,v)=>valueNoise(u*40,v*12,11)*rough,color:gradientColor([[0,(f.apron??f.colors)[0]],[rough*.6,(f.apron??f.colors)[1]],[rough,(f.apron??f.colors)[2]]],.06)});}
   // Plant bands across the mid-ground and the near rear of the course.
   const updates:((t:number)=>void)[]=[];
   for(const [i,band] of (look.flora||[]).entries()){const count=low?Math.ceil(band.count/2):band.count,spots:Placement[]=[];for(let j=0;j<count;j++){const x=-20+r()*(finish+40),s=band.scale??[.8,1.2];spots.push({x,y:band.y??(look.floor?.y??-2),z:band.z[0]+r()*(band.z[1]-band.z[0]),scale:s[0]+r()*(s[1]-s[0]),rotation:r()*6});}const stand=plantAfrica(staticRoot.parent===root?features:features,band.kind,spots,{low,variant:i,name:`flora-${band.kind}-${i}`,sway:band.sway});if(band.sway)updates.push(stand.update);}
   for(const [i,herd] of (look.herds||[]).entries()){const h=createHerd(features,herd.kind,{count:low?Math.max(1,Math.ceil(herd.count/2)):herd.count,x:herd.x,y:herd.y,z:herd.z,spread:2.6,scale:herd.scale??1,range:herd.range??6,speed:herd.speed??.6,seed:i*7+3});shell.animate({update:t=>h.update(t),motion:true,setVisible:v=>{for(const a of h.animals)a.root.visible=v;}});}
   for(const [i,flock] of (look.flocks||[]).entries()){const f=createFlock(root,{count:low?Math.ceil(flock.count/2):flock.count,centre:[finish*.5,flock.y,flock.z],radius:[flock.spread??finish*.35,3,8],speed:.04,size:flock.size??.6,color:flock.color,wing:flock.wing,seed:i*11+5,glide:flock.glide,name:flock.name??`flock-${i}`});shell.animate({update:t=>f.update(t)});}
   if(look.drift){const d=look.drift,drift=createDrift(foreground,{kind:d.kind,count:low?Math.ceil(d.count/2):d.count,colors:d.colors,x:[-10,finish+10],y:d.y,z:d.z,fall:d.fall??.1,sway:d.sway??1.2,size:d.size??.12,seed:31,name:d.name??'drift-'+d.kind});shell.animate({update:t=>drift.update(t),setVisible:v=>drift.setVisible(v),motion:true});}
   if(look.banners?.length){const spots=look.banners.map(b=>{const p=level.platforms.find(q=>q.id===b.platform);return[(p?.x??0)+b.offset,(p?.y??0),-1.5] as [number,number,number];});const banners=windBanners(root,spots,look.banners.flatMap(b=>b.colors));shell.animate({update:(t,s)=>{const wind=s?.wind[0];banners.update(t,wind?.phase==='gust'?wind.strength:0,wind?.phase==='warning');}});}
   if(updates.length)shell.animate({update:t=>{for(const u of updates)u(t);}});
   // The country's own landmarks and set pieces.
   const byId=new Map(level.platforms.map(p=>[p.id,p]));
   look.landmarks({context,level,finish,low,r,root,features,staticRoot,foreground,
    platform:id=>{const p=byId.get(id);if(!p)throw new Error(`${look.code}: no platform ${id}`);return p;},
    group:(name,parent=features)=>{const g=new T.Group();g.name=name;parent.add(g);return g;},
    animate:item=>{shell.animate(item);}});
   return shell.finish();
  },
  dressPlatform(root,definition,context){
   const low=context.low,seed=hash(definition.id)%9973;
   const api:DressApi={low,seed,palette,deck:look.deck,
    landmass:(target,def,key,profile,visualDepth)=>{const t=def.terrain||'ground',kind=t==='stairs'?'stairs':t==='ice-shelf'?'ice':['cliff','rock','tepui','climb-wall','lava'].includes(t)?'cliff':'ground';const p=palette(key??def.style??t);const small=def.width<4;return dressLandmass(target,def,p,{low,kind,seed,profile:profile??(small?'island':t==='terrace'||t==='stairs'?'shelf':'mass'),visualDepth:visualDepth??(small?2.4:kind==='stairs'?2.6:Math.min(def.thickness,3.4))});},
    plants:(details,def,kind,count)=>{const k=kind===undefined?(look.capFlora?.[def.style??'']??look.capFlora?.[def.terrain??'ground']??look.capFlora?.default):kind;if(!k||def.width<2.2)return;plantAfrica(details,k,rearSpots(def,count??Math.max(1,Math.floor(def.width/3)),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-.9,s.z),scale:.55+s.r*.45,rotation:s.r*6})),{low,name:'cap-'+k});}};
   if(look.dress){const probe=new T.Group();if(look.dress(probe,definition,context,api)){clearPlatformRoot(root);for(const child of [...probe.children])root.add(child);Object.assign(root.userData,probe.userData);return;}}
   const style=definition.style??'',terrain=definition.terrain??'ground',deckStyle=look.decks?.[style]??look.decks?.[terrain];
   // Sagging bridges share one curved surface for feet and planks.
   if(definition.type==='wooden-bridge'){clearPlatformRoot(root);woodenDeck(root,definition);return;}
   if(deckStyle||terrain==='mechanical'||terrain==='bridge'||terrain==='water-raft'||definition.thickness<.6){
    dressDeck(root,definition,deckStyle??(terrain==='water-raft'?'raft':terrain==='bridge'?'timber':definition.motion==='vertical'?'lift':definition.motion?'suspended':'slab'),look.deck,terrain==='bridge'?{below:1.6}:{});return;
   }
   const details=api.landmass(root,definition);api.plants(details,definition);
  },
  createEnemy:parent=>{const c=look.creature;return roundCreature(parent,{name:c.name,height:c.height,shell:c.shell,belly:c.belly,foot:c.foot,eye:c.eye,crest:(rig,b)=>crest(rig,b.add,c.crest,c.accent,c.height)});},
  createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,look.crate),
  decorateCheckpoint(marker){const banner=createBannerPost(marker,{...look.checkpoint,height:2.1});banner.position.set(-.45,0,-.2);ellipsoid(marker,matte(look.palettes.default.face),.4,.15,-.4,.35,.2,.3,8);},
  decorateFinish(gate){const arch=createArchway(gate,{style:look.finishArch.style,width:3.2,height:3.3,stone:look.finishArch.stone,trim:look.finishArch.trim,accent:look.finishArch.accent});arch.position.set(0,0,-1.55);},
 };
}

/** Shared helpers for landmark builders. */
export {built,Builder,matte,standard,vertexMaterial,scatter,ellipsoid,createShoreFoam,mix};
/** A simple palette maker: cap, face and dark face, with an optional map. */
export function earth(top:string,face:string,dark:string,maps?:LandmassPalette['maps'],extra:Partial<LandmassPalette>={}):LandmassPalette{
 return{top,topAlt:new T.Color(top).multiplyScalar(.9).getStyle(),edge:top,face,faceDark:dark,band:new T.Color(face).lerp(new T.Color(dark),.5).getStyle(),rough:.22,strata:.6,maps,...extra};
}
