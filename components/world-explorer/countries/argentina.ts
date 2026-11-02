import * as T from 'three';
import {Builder,matte,random,scatter,standard,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {windBanners} from '../kit/wind';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Argentina — Los Glaciares: Perito Moreno Valley. A fictional route inspired
 * by Lago Argentino: grey moraine, milky turquoise meltwater, the glacier's
 * fractured blue front, and the granite spires of the Fitz Roy range. */
const info={
 id:'argentina-los-glaciares',title:'Los Glaciares: Perito Moreno Valley',
 license:'Original procedural geometry; CC0 Poly Haven alpine rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional valley course inspired by the Perito Moreno Glacier and Lago Argentino. The glacier front, floes and the Fitz Roy skyline are stylized; distances are compressed.',
 landmarkSource:'https://whc.unesco.org/en/list/145/',
 assets:['perito-moreno-glacier-front','lago-argentino-water','fitz-roy-skyline','ice-floes','lenga-beech-forest','moraine-boulders','andean-condors','katabatic-banners','snow-flurries'],
};
const moraine:LandmassPalette={top:'#8f8a72',topAlt:'#7a8a5a',edge:'#a59f8a',face:'#a7a299',faceDark:'#6b675f',band:'#8c877d',maps:{set:'alpine-rock',tint:'#f0ece4',repeat:.5},rough:.26,strata:.8};
const granite:LandmassPalette={...moraine,top:'#9a958a',topAlt:'#8a857a',rough:.34};
const blueIce:LandmassPalette={top:'#eef7fb',topAlt:'#d8ecf5',edge:'#ffffff',face:'#a9d6ea',faceDark:'#5aa3c9',band:'#cfe9f4',rough:.18,strata:.5};

/** The glacier front: a wall of fractured blue seracs rising from the lake. */
function glacierFront(parent:T.Object3D,x:number,width:number,low:boolean){
 const root=new T.Group();root.name='perito-moreno-glacier-front';parent.add(root);
 createHeightfield(root,{name:'glacier-surface',x:x+width/2,y:-1,z:-42,width:width+10,depth:40,segments:[low?40:90,low?16:30],height:(u,v)=>(6+v*14+valueNoise(u*40,v*30,7)*2.5)*Math.min(1,Math.min(u,1-u)*6),color:(h,s)=>new T.Color(s>.5?'#7fc1e0':'#eef6fa').lerp(new T.Color('#bfe2f2'),valueNoise(h,s*5,2)*.5)});
 const b=new Builder(),r=random(145);
 for(let i=0;i<(low?40:90);i++){const sx=x-20+r()*(width+40),h=6+r()*12;b.add(new T.BoxGeometry(1.4+r()*2.4,h,1.6+r()*2),r()<.5?'#9fd3ea':'#cdeaf6',[sx,h/2-1.5,-9-r()*4],[r()*.2,r(),r()*.2],[1,1,1],.12);}
 b.mesh(root,vertexMaterial(.25,{metalness:.05}),'glacier-seracs');
 return root;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#a9c6dd',exposure:.98,sun:'#fff3e2',sunIntensity:2.9,sky:'#e6f0f8',ground:'#56604c',hemisphere:1.35,rim:'#d6ecff',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#5d8fbf',horizon:'#e2ecf2',ground:'#4f5a4a',intensity:.4}},
 hazardPalette:{column:'#d8eef7',base:'#6f8fa3',warning:'#ffd04a',debris:'#bfe3f3'},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'argentina-patagonia-environment',background:'#a9c6dd',fog:['#cfdde8',60,230],sky:{zenith:'#3f77b4',horizon:'#e6eef4',band:'#c9dbe9',glow:'#fff6e8',sun:[-.4,.45,-.8],glowPower:18},clouds:{opacity:.9,high:[22,36],groups:24,shade:'#b9c8d6',flat:.7},layers:['playable-moraine-and-floes','glacier-front','lago-argentino','lenga-forest-slopes','fitz-roy-skyline','sky']});
  const {root,staticRoot,features}=shell,r=random(205);
  const lake=createWaterSurface(features,{x:finish/2,y:-.75,z:6,width:finish+240,depth:70,shallow:'#8fd0d4',deep:'#4f9fae',roughness:.15,segments:40,name:'lago-argentino-water',flow:[.008,.003],repeat:.06});
  createHeightfield(features,{name:'fitz-roy-skyline',x:finish/2,y:-2,z:-150,width:finish+500,depth:50,segments:[low?70:150,low?16:28],height:ridgedRange(77,{peaks:9,height:46,sharpness:2.2,width:.55}),color:mountainColor({snowLine:26,rock:'#6f6a66',forest:'#3f5a3a',snow:'#f6f8fa',treeLine:8,grass:'#7d8a5a'})});
  createHeightfield(features,{name:'lenga-forest-slopes',x:finish/2,y:-1.5,z:-75,width:finish+300,depth:40,segments:[low?50:110,10],height:(u,v)=>v*16+valueNoise(u*30,v*10,4)*4,color:(h)=>new T.Color(h>12?'#7d7a6c':'#4a6b3a').multiplyScalar(.85+valueNoise(h,2,3)*.2)});
  const ice=level.platforms.find(p=>p.id==='ar-ice-walk')!;glacierFront(features,ice.x-6,ice.width+30,low);
  // Small bergs adrift in the lake behind the floes.
  const bergs:Placement[]=[];for(let i=0;i<(low?8:20);i++)bergs.push({x:30+r()*50,y:-.7,z:-4-r()*20,scale:[.6+r()*1.6,.4+r()*.9,.6+r()*1.2],rotation:r()*6});
  scatter(staticRoot,new T.DodecahedronGeometry(1,0),standard('#d6eef8',.2),bergs,'drifting-bergs');
  const lenga:Placement[]=[];for(let i=0;i<(low?20:48);i++){const x=-10+r()*(finish+20);if(x>34&&x<92)continue;lenga.push({x,y:x<30?2:1.4,z:-6-r()*16,scale:.8+r()*.5,rotation:r()*6,color:r()<.3?'#d9a35a':'#ffffff'});}
  plantGrove(staticRoot,'conifer',lenga,{low,name:'lenga-beech-forest'});
  const zone=level.zones?.[0],step=level.platforms.find(p=>p.id==='ar-ice-step-1')!;
  const banners=windBanners(root,[[step.x-1.4,.4,-1.7],[step.x+12,3,-1.6]],['#75aadb','#f6b40e']);
  const condors=createFlock(root,{count:low?2:4,centre:[finish*.5,18,-30],radius:[finish*.35,3,10],speed:.03,size:2.2,color:'#26221f',wing:'#f2efe8',seed:5,glide:true,name:'andean-condors'});
  const snow=createDrift(root,{kind:'snow',count:low?20:60,colors:['#ffffff'],x:[60,finish+10],y:[-1,9],z:[-8,3],fall:.6,sway:1.6,size:.06,seed:3,name:'snow-flurries'});
  shell.animate({update:(t,signals)=>{lake.update(t);condors.update(t);const wind=signals?.wind.find(w=>w.id===zone?.id);banners.update(t,wind?.phase==='gust'?wind.strength:0,wind?.phase==='warning');}});
  shell.animate({update:t=>snow.update(t),setVisible:v=>snow.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*17+Math.round(definition.x);
  if(style==='ice-floe'){const details=dressLandmass(root,definition,blueIce,{low,kind:'ice'});built(details,'floe-underwater',b=>{b.add(new T.CylinderGeometry(w*.55,w*.4,1.4,9),'#7cc2e0',[0,-.9,0],[0,0,0],[1,1,.8],.1);},seed,.3);return;}
  const icy=definition.terrain==='ice-shelf';
  const details=dressLandmass(root,definition,icy?blueIce:style==='erratic'||style==='ridge-slab'?granite:moraine,{low,kind:icy?'ice':definition.terrain==='rock'?'cliff':'ground'});
  if(!icy)plantGrove(details,style==='lenga-meadow'?'conifer':'golden-tuft',rearSpots(definition,Math.max(1,Math.floor(w/3)),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-1.1,s.z),scale:style==='lenga-meadow'?.45+s.r*.2:.8+s.r*.4,color:style==='lenga-meadow'&&s.r<.4?'#d9a35a':'#ffffff'})),{low});
  if(style==='lake-shore')built(details,'shore-cairn',b=>{for(let i=0;i<4;i++)b.add(new T.DodecahedronGeometry(.3-i*.05,0),'#8c877d',[w/2-1.2,.25+i*.4,-1.6]);},seed);
 },
 createEnemy:parent=>roundCreature(parent,{name:'argentina-moraine-mite',height:.8,shell:'#7f7a70',belly:'#c9d6dc',foot:'#3d3a35',crest:(_rig,b)=>{for(const s of [-1,1]){const tuft=new T.Mesh(new T.ConeGeometry(.09,.32,6),matte('#e6eef2'));tuft.position.set(s*.12,.74,0);tuft.rotation.z=-s*.4;b.add(tuft);}}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#9b7a55',trim:'#75aadb',glyph:'#f6b40e'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#5d4a38',cloth:'#75aadb',accent:'#f6b40e',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'timber',width:3.4,height:3.2,stone:'#6f5034',trim:'#75aadb'});arch.position.set(0,0,-1.55);},
};
