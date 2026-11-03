import * as T from 'three';
import {Builder,ellipsoid,matte,random,v3,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface,createShoreFoam} from '../kit/water';
import {createCascade} from '../kit/cascade';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {markSurface} from '../kit/surface-maps';
import {createRockMass,dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';
import type {CountryEnvironment} from './types';
import {built,mountShell} from './south-america/shell';
import {plantFlora,type FloraKind} from './south-america/flora';

/** Brazil — Amazon Canopy Run. A fictional route through a flooded várzea
 * forest inspired by the Central Amazon: the river runs at the level of the
 * route, giant kapok trunks stand in the flood and carry the canopy branches,
 * mossy root-wrapped banks rise from the water, and a waterfall drops from a
 * forested cliff into the river. Wildlife is scenery, never an enemy. */
const info={
 id:'brazil-amazon-canopy',title:'Amazon Canopy Run',
 license:'Original procedural geometry; CC0 Poly Haven mossy rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional rainforest course inspired by the flooded forests of the Central Amazon. Trees, river channels and the waterfall are stylized; the route is not a map of the protected area.',
 landmarkSource:'https://whc.unesco.org/en/list/998/',
 assets:['emergent-kapok-trees','flooded-varzea-forest','amazon-river-channel','animated-waterfall','canopy-branches','liana-curtains','acai-palms','heliconias','big-leaf-understory','scarlet-macaws','river-mist','light-shafts'],
};
/** Playable terrain: root-wrapped riverbank mud, buttress-root stairs, mossy
 * waterfall rock, and mossy canopy branches on bark logs. */
const mud:LandmassPalette={top:'#6f5a3c',topAlt:'#5f8f3f',edge:'#7f9a4a',face:'#7a6248',faceDark:'#3a2e22',band:'#5f4a36',maps:{set:'mossy-rock',tint:'#d8cbb8',repeat:.45},rough:.22,strata:.9};
const roots:LandmassPalette={top:'#7a5e40',topAlt:'#6a8f42',edge:'#8a6a48',face:'#6a5038',faceDark:'#3a2a1e',band:'#5a4230',rough:.14,strata:.55};
const mossCliff:LandmassPalette={top:'#4f8a35',topAlt:'#6aa443',edge:'#7cad4a',face:'#8a957a',faceDark:'#3f4a35',band:'#6f7a5f',maps:{set:'mossy-rock',tint:'#eef2e6',repeat:.5},rough:.3,strata:.7};
const branch:LandmassPalette={top:'#4f8a35',topAlt:'#77ad4c',edge:'#8a6d4e',face:'#8a6d4e',faceDark:'#634c36',band:'#755c42',rough:.05,strata:.5};
const deck:DeckPalette={wood:'#7a5636',woodAlt:'#8d6640',rope:'#b9a173',stone:'#8f9b7c',stoneAlt:'#7d896b',metal:'#4c5560',accent:'#e0a02f'};
const RIVER=-.75;

/** Original seed-pod forest creature: rounded seed, leaf crown, bright eyes. */
function createSeedPod(parent:T.Object3D){
 const rig=createCreatureRig(parent,{name:'brazil-seed-pod-creature',height:.95,feet:[-.12,.12],footColor:'#4a3020',footSize:[.07,.055,.09],stride:8,animate(rig,time,state,moving){const crown=rig.extras.crown;crown.rotation.z=Math.sin(time*(moving?9:2))*.12;crown.rotation.y=(state==='IDLE'||state==='TURN')?Math.sin(time*2.2)*.6:0;rig.body.scale.y=1+(moving?Math.sin(time*16)*.03:0);}});
 const shell=matte('#8a5a2f',.6),stripe=matte('#6b4222'),belly=matte('#c99a5c'),leaf=matte('#3f9a3c'),leafDark=matte('#2e7a2f'),white=matte('#fbf7ea'),pupil=matte('#1d1a18');
 ellipsoid(rig.body,shell,0,.42,0,.3,.36,.28,18);ellipsoid(rig.body,belly,0,.36,.17,.19,.24,.12,14);
 for(const a of [-.6,0,.6]){const band=new T.Mesh(new T.TorusGeometry(.29,.012,5,22,Math.PI),stripe);band.position.y=.42;band.rotation.set(0,a,Math.PI/2);band.scale.set(1.24,1,1);rig.body.add(band);}
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*.1,.5,.24,.08,.1,.05,12);ellipsoid(rig.head,pupil,side*.1,.49,.285,.04,.05,.02,10);}
 const crown=new T.Group();crown.position.set(0,.76,0);rig.head.add(crown);rig.extras.crown=crown;
 for(let i=0;i<4;i++){const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.12,.18,0,.42);shape.quadraticCurveTo(-.12,.18,0,0);const blade=new T.Mesh(new T.ShapeGeometry(shape),i%2?leaf:leafDark);(blade.material as T.Material).side=T.DoubleSide;blade.rotation.set(-.3,i*Math.PI/2,(i%2?.5:-.5));crown.add(blade);}
 const stem=new T.Mesh(new T.CylinderGeometry(.018,.025,.12,6),stripe);stem.position.y=-.02;crown.add(stem);
 finishCreature(rig);return rig;
}
/** One stand split across template variants, with uneven proportions and leaf
 * tints per tree, so neighbouring crowns differ in shape, size and colour. */
const leafTints=['#ffffff','#e8f2c6','#cfe6d4','#f4f6e0','#d6e8b2','#c4dcc0'];
function variedStand(parent:T.Object3D,kind:FloraKind,placements:Placement[],variants:number,options:{low?:boolean;name:string;sway?:number},r:()=>number){
 const tinted=placements.map(p=>{const s=typeof p.scale==='number'?p.scale:1;return{...p,scale:[s*(.85+r()*.3),s*(.8+r()*.45),s*(.85+r()*.3)] as [number,number,number],color:leafTints[Math.floor(r()*leafTints.length)]};});
 const stands=Array.from({length:variants},(_,v)=>plantFlora(parent,kind,tinted.filter((_,i)=>i%variants===v),{...options,variant:v,name:v?`${options.name}-${v}`:options.name}));
 return{update:(t:number)=>{for(const stand of stands)stand.update(t);}};
}
/** Rounded, mossy volume along a bank's edges: moss cushions roll over the
 * front lip, mounds round off the ends and stones sit at the waterline, so no
 * bank reads as a cut sheet. All of it stays below the walking cap. */
function bankEdges(parent:T.Object3D,definition:PlatformDefinition,seed:number,low:boolean,waterline:boolean){
 const w=definition.width,d=Math.max(2,definition.depth)/2,surface=localSurface(definition),r=random(seed),b=new Builder(.4),moss=['#46702f','#55803a','#3b6629','#5f7f3d','#6b8a45'],shade=['#2f5224','#3a5f2a','#34552a'];
 const under=(x:number,span:number)=>Math.min(surface(Math.max(-w/2,x-span)),surface(x),surface(Math.min(w/2,x+span)));
 // An upper roll of moss hugging the lip, a darker roll below it, and strands hanging from both.
 for(let x=-w/2+.3;x<w/2-.2;x+=(low?1:.55)*(.7+r()*.8)){const s=.2+r()*.32,y=under(x,s*1.7)-.05-s*.5;if(r()<.12)continue;
  b.add(new T.IcosahedronGeometry(1,low?0:1),moss[Math.floor(r()*moss.length)],[x,y,d+.02+r()*.16],[r()*.4,r()*3,(r()-.5)*.3],[s*(1.3+r()*.7),s*.5,s*.9],.14);
  if(r()<.7)b.add(new T.IcosahedronGeometry(1,0),shade[Math.floor(r()*shade.length)],[x+(r()-.5)*.4,y-.28-r()*.15,d-.04+r()*.1],[r(),r()*3,0],[s*1.4,s*.6,s*.8],.12);
  if(!low&&r()<.35)b.add(new T.ConeGeometry(.05+r()*.04,.4+r()*.6,4),'#4a6f2c',[x+(r()-.5)*.3,y-.55-r()*.2,d+.08],[Math.PI,0,0]);}
 // Rounded ends: a moss mound over each corner and stones tucked into the body's front corners.
 for(const side of [-1,1]){const x=side*(w/2-.05),top=under(x,.6);
  b.add(new T.IcosahedronGeometry(1,low?0:1),moss[(seed+side+5)%moss.length],[x+side*.08,top-.5,0],[0,r()*3,0],[.55,.42,d*.95],.12);
  if(waterline)for(let i=0;i<(low?1:2);i++)b.add(new T.DodecahedronGeometry(.24+r()*.2,0),r()<.5?'#7a7262':'#8a8170',[x-side*(.25+r()*.6),top-.75-r()*.45,d*(.75+r()*.25)],[r()*3,r()*3,r()*3],[1.25,.7,1],.1);}
 if(waterline)for(let i=0;i<Math.max(1,Math.round(w/2.2));i++){const s=.3+r()*.35;b.add(new T.DodecahedronGeometry(s,low?0:1),r()<.4?'#6f6a5a':'#837a66',[-w/2+.4+r()*(w-.8),RIVER-definition.y+s*.25,d+.25+r()*.6],[r()*3,r()*3,r()*3],[1.35,.6,1.1],.1);}
 const material=vertexMaterial(.9);markSurface(material,'mossy-rock','#e2dccb',.4);return b.mesh(parent,material,'mossy-bank-edges');
}
/** Shafts of light slanting through the canopy: soft additive planes. */
function lightShafts(parent:T.Object3D,finish:number,low:boolean){
 const canvas=new Uint8Array(4*16*64);for(let y=0;y<64;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4,a=Math.sin(x/15*Math.PI)*(1-y/64)*190;canvas[i]=255;canvas[i+1]=246;canvas[i+2]=214;canvas[i+3]=a;}
 const texture=new T.DataTexture(canvas,16,64,T.RGBAFormat);texture.needsUpdate=true;
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.22,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false});
 const r=random(77),placements:Placement[]=[];for(let i=0;i<(low?5:12);i++)placements.push({x:-6+r()*(finish+12),y:9,z:-6-r()*14,scale:[1.4+r()*1.6,16,1],rotation:[0,0,.35]});
 const geometry=new T.PlaneGeometry(1,1);geometry.translate(0,-.5,0);
 const shafts=new T.InstancedMesh(geometry,material,placements.length),dummy=new T.Object3D();shafts.name='light-shafts';shafts.castShadow=false;
 placements.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,.35);dummy.scale.set(...(p.scale as [number,number,number]));dummy.updateMatrix();shafts.setMatrixAt(i,dummy.matrix);});parent.add(shafts);
 return shafts;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#a7cdd2',exposure:1.02,sun:'#fff0c8',sunIntensity:2.8,sky:'#e2f4e8',ground:'#3b5a30',hemisphere:1.5,rim:'#d9ffe0',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#5aa6d6',horizon:'#cfe8dc',ground:'#2f4a28',intensity:.35}},
 ropeColor:'#3e6b2c',
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'brazil-amazon-environment',background:'#a7cdd2',fog:['#b6d2c4',38,170],sky:{zenith:'#4e9fd3',horizon:'#d6ece0',band:'#c3e0d0',glow:'#fff4d6',sun:[-.4,.6,-.7],glowPower:24},clouds:{opacity:.8,high:[22,34],groups:16,shade:'#d6e2dc'},layers:['foreground-understory','playable-banks-and-canopy','flooded-varzea-forest','amazon-river-channel','far-forest-horizon','sky']});
  const {root,staticRoot,features,foreground}=shell,r=random(998);
  // The river fills the whole valley floor at the level of the raft crossing.
  const river=createWaterSurface(features,{x:finish/2,y:RIVER,z:-10,width:finish+260,depth:110,shallow:'#5f9f86',deep:'#2c5e52',roughness:.12,segments:44,name:'amazon-river-channel',flow:[.025,.006],repeat:.07});
  createHeightfield(features,{name:'far-forest-horizon',x:finish/2,y:-2,z:-118,width:finish+380,depth:40,segments:[low?80:170,low?10:18],height:(u,v)=>(valueNoise(u*90,v*12,5)*2.4+valueNoise(u*22,v*6,9)*4)*Math.min(1,v*3)+v*6,color:gradientColor([[0,'#2f5f2d'],[5,'#3f7a37'],[9,'#5a8a4a'],[12,'#7aa08a']])});
  // Flooded forest in three depth layers, simplified with distance.
  const forest=new T.Group();forest.name='flooded-varzea-forest';features.add(forest);
  const far:Placement[]=[],mid:Placement[]=[],near:Placement[]=[],palms:Placement[]=[];
  for(let i=0;i<(low?26:60);i++)far.push({x:-30+r()*(finish+60),y:RIVER-1,z:-48-r()*40,scale:1+r()*.5,rotation:r()*6});
  for(let i=0;i<(low?14:34);i++)mid.push({x:-20+r()*(finish+40),y:RIVER-.5,z:-20-r()*24,scale:.9+r()*.5,rotation:r()*6});
  for(let i=0;i<(low?10:24);i++)near.push({x:-10+r()*(finish+20),y:RIVER-.2,z:-9-r()*10,scale:.9+r()*.4,rotation:r()*6});
  for(let i=0;i<(low?8:22);i++)palms.push({x:-10+r()*(finish+20),y:RIVER,z:-6-r()*14,scale:.8+r()*.4,rotation:r()*6});
  variedStand(forest,'emergent',far,3,{low:true,name:'far-canopy'},r);variedStand(forest,'mid-canopy',mid,3,{low:true,name:'mid-canopy'},r);
  // A few smaller emergents mixed into the mid layer break up the even crown line.
  variedStand(forest,'emergent',mid.filter((_,i)=>i%4===1).map(p=>({...p,x:p.x+3,z:p.z-4,scale:.55+r()*.25})),2,{low:true,name:'mid-emergents'},r);
  const nearTrees=variedStand(forest,'mid-canopy',near,2,{low,name:'near-canopy',sway:.012},r),acai=variedStand(forest,'acai-palm',palms,2,{low,name:'acai-palms',sway:.02},r);
  // Emergent kapoks stand in the flood and carry the canopy branches.
  const kapok=new T.Group();kapok.name='emergent-kapok-trees';features.add(kapok);const trunks=new Builder(.4),crowns:Placement[]=[];
  for(const p of level.platforms.filter(p=>p.terrain==='canopy'&&!p.motion)){
   const x=p.x+(p.id.endsWith('1')||p.id.endsWith('3')?p.width*.8:p.width*.2),z=-2.8,h=p.y-RIVER+3;
   trunks.add(new T.CylinderGeometry(.55,.95,h,12,6),'#8a7f6c',[x,RIVER+h/2,z],[0,0,0],[1,1,1],.06);
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.3;trunks.add(new T.BoxGeometry(1.8,2.6,.12),'#7d725f',[x+Math.cos(a)*.8,RIVER+1,z+Math.sin(a)*.6],[0,-a,0]);}
   crowns.push({x,y:p.y+1.4,z:z-.4,scale:.75,rotation:r()*6});
  }
  const trunkMaterial=vertexMaterial(.92);markSurface(trunkMaterial,'mossy-rock','#d8d2c2',.6);trunks.mesh(kapok,trunkMaterial,'kapok-trunks');
  variedStand(kapok,'emergent',crowns,2,{low,name:'kapok-crowns'},r);
  // Lianas hang from every canopy branch and from the vine anchors.
  const curtains:Placement[]=[];for(const p of level.platforms.filter(p=>p.terrain==='canopy'&&!p.motion))for(let i=0;i<Math.max(1,Math.round(p.width/3.5));i++)curtains.push({x:p.x+p.width*(i+.5)/Math.max(1,Math.round(p.width/3.5)),y:p.y-.7,z:-2.4,scale:.8+r()*.4,rotation:r()*.5});
  const anchors=new Builder();
  for(const p of level.platforms.filter(p=>p.motion==='pendulum')){const x=p.x+p.width/2,top=p.y+(p.length||4);anchors.add(new T.TubeGeometry(new T.CatmullRomCurve3([v3(x-5,top+.9,-3),v3(x,top+.25,0),v3(x+5,top+1.1,-3.2)]),20,.38,7,false),'#5e4a35');for(let i=0;i<8;i++)anchors.add(new T.IcosahedronGeometry(1.2,1),i%2?'#3f7f33':'#2f6b2c',[x-4.5+i*1.3,top+1+r()*.6,-1.6-r()*1.4],[0,r()*3,0],[1.3,.7,1]);}
  anchors.mesh(features,vertexMaterial(.9),'vine-anchor-branches');
  const lianas=plantFlora(root,'liana-curtain',curtains,{low,name:'liana-curtains',sway:.035});
  // The waterfall pours from a forested cliff behind the lookout into the river.
  const ledge=level.platforms.find(p=>p.id==='br-falls-ledge')!,cliffX=ledge.x+ledge.width/2+1.5,cliffTop=ledge.y+7;
  createRockMass(features,{name:'waterfall-cliff',x:cliffX,y:cliffTop,z:-9,width:12,depth:9,height:cliffTop-RIVER+1.5,palette:mossCliff,profile:'mass',seed:51,low});
  createRockMass(features,{name:'waterfall-cliff-shoulder',x:cliffX-9,y:cliffTop-2.5,z:-15,width:9,depth:8,height:cliffTop-RIVER-1,palette:mossCliff,profile:'mass',seed:52,low});
  const cascade=createCascade(features,{sites:[{x:cliffX,top:cliffTop,bottom:RIVER,z:-4.4,width:2.6,channel:6,channelDirection:-1,lean:.6},{x:cliffX-9,top:cliffTop-2.5,bottom:RIVER,z:-10.9,width:1.6,channel:4,channelDirection:-1,lean:.3,intensity:.8}],low,tint:'#cfeae2',name:'animated-waterfall'});
  plantFlora(staticRoot,'emergent',[{x:cliffX-3,y:cliffTop,z:-10,scale:.6},{x:cliffX+4,y:cliffTop,z:-11,scale:.55}],{low,name:'cliff-top-trees'});
  // Foreground: big leaves and heliconias low in front of the banks, never above the route.
  const leaves:Placement[]=[],helic:Placement[]=[];for(let x=-8;x<finish+8;x+=2.8+r()*3){const front=4.8+r()*2.4;(r()<.6?leaves:helic).push({x,y:RIVER-1.05,z:front,scale:.8+r()*.35,rotation:r()*6});}
  const big=plantFlora(foreground,'big-leaf',leaves,{low,name:'big-leaf-understory',sway:.05}),heli=plantFlora(foreground,'heliconia',helic,{low,name:'heliconias',sway:.05});
  const foam=createShoreFoam(root,level.platforms.filter(p=>p.terrain==='ground'||p.terrain==='cliff'||p.terrain==='stairs').flatMap(p=>Array.from({length:Math.max(1,Math.round(p.width/2.6))},(_,i)=>({x:p.x+.8+i*2.6,y:RIVER+.03,z:p.depth/2+.2,size:.7}))),low,'#e9f7f1');
  lightShafts(root,finish,low);
  // Giant Amazon water lilies (Victoria amazonica) float on the open river in front.
  // Clusters of adults with upturned rims, smaller reddish juveniles, and
  // flowers that open white and turn pink, with a few closed buds.
  const lilies=new Builder(),clear=(x:number,z:number)=>!level.platforms.some(p=>!p.route&&x>p.x-1&&x<p.x+p.width+1&&z<p.depth/2+1.5);
  for(let c=0;c<(low?6:14);c++){const cx=-8+r()*(finish+16),cz=4.2+r()*7,count=2+Math.floor(r()*(low?2:4));
   for(let i=0;i<count;i++){const juvenile=i>0&&r()<.4,s=juvenile?.35+r()*.3:.85+r()*1.05,a=r()*Math.PI*2,x=cx+Math.cos(a)*(i?s+.9+r()*.8:0),z=cz+Math.sin(a)*(i?s*.7+.5:0);if(!clear(x,z))continue;
    const leaf=juvenile?(r()<.5?'#7a4a36':'#6a5a32'):['#4f7f35','#5f8a3a','#47752f','#5a8f45'][Math.floor(r()*4)];
    lilies.add(new T.CylinderGeometry(s,s,.05,juvenile?14:24),leaf,[x,RIVER+.03,z]);
    if(!juvenile){const rim=.6+r()*.9;lilies.add(new T.TorusGeometry(s,.06,5,28),r()<.5?'#a8403a':'#8f4a34',[x,RIVER+.05+.03*rim,z],[Math.PI/2,0,0],[1,1,rim]);lilies.add(new T.CylinderGeometry(s*.2,s*.2,.052,10),'#3f6a2c',[x,RIVER+.035,z]);}
    if(!juvenile&&r()<.35){const pink=r()<.4;lilies.add(new T.SphereGeometry(.24,10,8),pink?'#e8a6c0':'#f4f0f2',[x+s*.35,RIVER+.2,z+s*.1],[0,0,0],[1,.7,1]);lilies.add(new T.SphereGeometry(.12,8,6),'#f2d06a',[x+s*.35,RIVER+.3,z+s*.1]);}
    else if(!juvenile&&r()<.25)lilies.add(new T.ConeGeometry(.12,.38,6),'#8a5a3a',[x-s*.4,RIVER+.2,z]);}}
  lilies.mesh(features,vertexMaterial(.6),'victoria-water-lilies');
  const macaws=createFlock(root,{count:low?4:8,centre:[finish*.45,12,-24],radius:[finish*.35,2.5,8],speed:.06,size:1.2,color:'#d42a2a',wing:'#2b62c8',seed:5,name:'scarlet-macaws'});
  const mist=createDrift(root,{kind:'mist',count:low?14:34,colors:['#f2faf5'],x:[-10,finish+10],y:[RIVER,RIVER+3],z:[-30,-3],fall:-.03,sway:2.4,size:3,seed:8,name:'river-mist'});
  const fireflies=createDrift(root,{kind:'spark',count:low?14:36,colors:['#f6f19a','#c8f582'],x:[-6,finish+6],y:[0,6],z:[-5,2.2],fall:-.12,sway:.9,size:.07,seed:12,name:'floating-pollen-and-fireflies'});
  shell.animate({update:t=>{river.update(t);cascade.update(t);foam.update(t);macaws.update(t);for(const f of [nearTrees,acai,lianas,big,heli])f.update(t);}});
  shell.animate({update:t=>mist.update(t),setVisible:v=>mist.setVisible(v),motion:true});
  shell.animate({update:t=>fireflies.update(t),setVisible:v=>fireflies.setVisible(v),motion:true});

  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,seed=definition.id.length*13+Math.round(definition.x);
  if(definition.type==='bridge'){dressDeck(root,definition,'rope',deck,{below:4});return;}
  if(definition.style==='raft'){dressDeck(root,definition,'raft',deck);return;}
  if(definition.motion){dressDeck(root,definition,'log',deck);return;}
  if(definition.terrain==='canopy'){
   // A mossy branch: a flat walkable top on a thick bark log, epiphytes behind.
   const details=dressLandmass(root,definition,branch,{low,kind:'block',profile:'island',visualDepth:.8}),log=new Builder(.4);
   log.add(new T.CylinderGeometry(.55,.62,w+.6,12,1),'#5e4a35',[0,-.55,-.2],[0,0,Math.PI/2],[1,1,1],.05);
   for(let i=0;i<Math.ceil(w/1.4);i++)log.add(new T.IcosahedronGeometry(.42,0),i%2?'#4f8a35':'#6aa443',[-w/2+.6+i*1.4,.18,-1.15],[0,i,0],[1.2,.55,.9]);
   for(let i=0;i<Math.ceil(w/1.1);i++)log.add(new T.ConeGeometry(.12,.5+((i*7)%5)*.12,4),'#557a35',[-w/2+.5+i*1.1,-1.05,.35],[Math.PI,0,0]);
   const material=vertexMaterial(.9);markSurface(material,'mossy-rock','#c9b49a',.5);log.mesh(details,material,'canopy-branch-log');
   plantFlora(details,'heliconia',[{x:w/2-.6,y:0,z:-1.1,scale:.45}],{low});
   bankEdges(details,definition,seed,low,false);
   return;
  }
  // Banks rise from the flood (their eroded bases dip into the river); the
  // waterfall rock and lookout are mossy outcrops reaching down to the water.
  const cliff=definition.terrain==='cliff'||definition.id==='br-lookout',depth=definition.y-RIVER+(cliff?1.4:1.6);
  const details=dressLandmass(root,definition,cliff?mossCliff:definition.terrain==='stairs'?roots:mud,{low,kind:definition.terrain==='stairs'?'stairs':cliff?'cliff':'ground',profile:'island',visualDepth:Math.max(1.6,depth)});
  if(definition.style==='bromeliad'){
   // A giant bromeliad rosette: the springy centre is the pad; leaves fan out of the lane.
   const b=new Builder();for(let i=0;i<14;i++){const a=i/14*Math.PI*2;if(Math.abs(Math.cos(a))>.7)continue;const leaf=new T.ConeGeometry(.26,2.2,4,1);leaf.rotateZ(-Math.PI/2);leaf.translate(1.1,0,0);b.add(leaf,i%3?'#b8322b':'#d9552e',[0,.18,0],[0,a,.35],[1,.25,1]);}
   const rosette=b.mesh(root,vertexMaterial(.7),'bromeliad-rosette');rosette.position.y=-.45;rosette.scale.set(.75,1,1.2);rosette.userData.nonColliding=true;
   const cup=new T.Mesh(new T.CylinderGeometry(.62,.7,.06,16),matte('#e0a02f'));cup.position.y=-.01;cup.name='bromeliad-cup';root.add(cup);
   return;
  }
  bankEdges(details,definition,seed,low,true);
  // Buttress roots spill over the front and sides of each bank.
  if(w>=4)built(details,'buttress-roots',(b,rr)=>{for(let i=0;i<Math.round(w/1.6);i++){const x=-w/2+.6+rr()*(w-1.2),z=Math.max(2,definition.depth)/2-.1;b.add(new T.TubeGeometry(new T.CatmullRomCurve3([v3(x,-.05,z-.5),v3(x+(rr()-.5)*.6,-.6,z+.15),v3(x+(rr()-.5),-1.6,z+.1)]),8,.07+rr()*.06,5,false),'#6a5238');}},seed,.85);
  const spots=rearSpots(definition,Math.max(2,Math.round(w/2.2)),seed);
  // Kept well behind the lane: leaves reach about one unit from their stem.
  const back=(z:number)=>Math.min(-2.1,z);
  plantFlora(details,'big-leaf',spots.filter((_,i)=>i%3===0).map(s=>({x:s.x,y:s.y,z:back(s.z),scale:.65+s.r*.25,rotation:s.r*6})),{low});
  plantFlora(details,'ground-fern',spots.filter((_,i)=>i%3===1).map(s=>({x:s.x,y:s.y,z:back(s.z),scale:.7,rotation:s.r*6})),{low});
  plantFlora(details,'heliconia',spots.filter((_,i)=>i%3===2).map(s=>({x:s.x,y:s.y,z:back(s.z),scale:.75,rotation:s.r*6})),{low});
 },
 createEnemy:createSeedPod,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#b8834c',trim:'#3f7f33',glyph:'#ffd45a'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#6b4a2e',cloth:'#2f8f46',accent:'#f2c230',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'jungle',width:3.4,height:3.4,stone:'#6f5034',trim:'#3f7f33'});arch.position.set(0,0,-1.55);plantFlora(gate,'heliconia',[{x:-2.4,y:0,z:-1.4,scale:.9},{x:2.5,y:0,z:-1.3,scale:.8}]);},
};
