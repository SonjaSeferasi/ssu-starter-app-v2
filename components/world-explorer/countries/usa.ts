import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,pixelTexture,random,standard,v3,vertexMaterial,type Placement} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {createHangers,dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps} from '../kit/surface-maps';
import type {CountryEnvironment} from './types';

/** United States — New York Harbor Adventure. A fictional waterfront course; the
 * statue and skyline are stylized studies placed for a coherent harbor view. */
const info={
 id:'usa-new-york-harbor',title:'New York Harbor Adventure',
 license:'Original procedural geometry; CC0 Poly Haven brick and stone surface maps (see materials/LICENSES.md).',
 representation:'A fictional waterfront platform course inspired by New York Harbor. The Statue of Liberty and the Lower Manhattan skyline are simplified studies; distances and buildings are not to scale.',
 landmarkSource:'https://www.nps.gov/npnh/learn/news/fact-sheet-stli.htm',
 assets:['statue-of-liberty','liberty-island-star-fort','lower-manhattan-skyline','harbor-water','ferries-and-tugboats','dock-cranes','piers','brick-terraces','overhead-gantry','seagulls'],
};
const granite:TerrainPreset={id:'harbor-granite-terrace',shape:'masonry',rock:{light:'#c9c6c0',dark:'#8f8b85',crack:'#4a4744',top:'#6a8a4a',topDepth:.02,strata:.2},cap:{kind:'paving',a:'#bdb8b0',b:'#aaa49b',c:'#5f5b56'},rim:{kind:'curb',color:'#cfcac2',alt:'#bdb7ae',size:.6},maps:{set:'ashlar',tint:'#f2f2f2',repeat:1}};
const brick:TerrainPreset={id:'harbor-brick-terrace',shape:'masonry',rock:{light:'#c8705a',dark:'#9a4f3e',crack:'#4f2a22',top:'#6a8a4a',topDepth:.02,strata:.2},cap:{kind:'brick',a:'#b55f48',b:'#a4513d',c:'#d8cfc2'},rim:{kind:'curb',color:'#d8d0c4',alt:'#c9c0b2',size:.6},maps:{set:'red-brick',tint:'#ffffff',repeat:1}};
const deck:DeckPalette={wood:'#8a6a4c',woodAlt:'#9c7a58',rope:'#c8b48a',stone:'#c9c6c0',stoneAlt:'#b8b4ad',metal:'#3d4a57',accent:'#f2b233'};
const copper='#6fae9a',copperDark='#4f8f7d';

/** Stylized Statue of Liberty on its star-fort base and granite pedestal. */
function createLiberty(parent:T.Object3D){
 const root=new T.Group();root.name='statue-of-liberty';root.userData.landmark='Statue of Liberty';root.userData.source=info.landmarkSource;parent.add(root);
 const b=new Builder(),stone='#b9b2a4',stoneDark='#a39b8c';
 // Eleven-pointed star fort, then the stepped pedestal.
 const star=new T.Shape();for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=i%2?7.2:9.6;if(!i)star.moveTo(Math.cos(a)*r,Math.sin(a)*r);else star.lineTo(Math.cos(a)*r,Math.sin(a)*r);}star.closePath();const fort=new T.ExtrudeGeometry(star,{depth:2.4,bevelEnabled:false});fort.rotateX(-Math.PI/2);b.add(fort,stoneDark,[0,0,0],[0,0,0],[1,1,1],.04);
 b.add(new T.BoxGeometry(7,1.6,7),stone,[0,3.2,0]);b.add(new T.BoxGeometry(5.4,7.5,5.4),stone,[0,7.7,0],[0,0,0],[1,1,1],.03);
 for(let face=0;face<4;face++){const a=face*Math.PI/2;for(const side of [-1,1])b.add(new T.CylinderGeometry(.22,.22,3.2,8),stoneDark,[Math.sin(a)*2.75+Math.cos(a)*side*1.4,8.2,Math.cos(a)*2.75-Math.sin(a)*side*1.4]);}
 b.add(new T.BoxGeometry(5.9,.6,5.9),stoneDark,[0,11.7,0]);b.add(new T.BoxGeometry(4.6,1.4,4.6),stone,[0,12.7,0]);
 // Robed figure: a flaring lathe body, raised torch arm, tablet and crown rays.
 const robe=new T.LatheGeometry([0,.4,.8,1.2,1.6,2,2.4,2.8,3.2,3.6,4,4.4,4.8,5.2,5.6,6,6.6,7.2,7.8,8.4,9].map((y,i,a)=>new T.Vector2(1.35-.55*(y/9)+.25*Math.sin(y*.9)*(1-y/9)+(i===a.length-1?-.4:0),y)),20);
 b.add(robe,copper,[0,13.4,0],[0,0,0],[1,1,.85],.06);
 b.strut(v3(.9,20.8,0),v3(1.5,26.6,.3),.42,copper,10,.75);b.add(new T.CylinderGeometry(.32,.26,1.2,10),copperDark,[1.6,27.2,.3]);b.add(new T.ConeGeometry(.45,1.1,10),'#f6c64a',[1.62,28.3,.3]);
 b.strut(v3(-.9,20.4,.2),v3(-1.4,18.2,.9),.38,copper,10,.8);b.add(new T.BoxGeometry(.5,1.9,1.2),copperDark,[-1.55,18.6,1.1],[.25,0,.1]);
 b.add(new T.SphereGeometry(.95,16,12),copper,[0,23.1,.05]);b.add(new T.CylinderGeometry(1.05,1.05,.32,16),copperDark,[0,23.75,0]);
 for(let i=0;i<7;i++){const a=-Math.PI*.55+i/6*Math.PI*1.1,dir=v3(Math.sin(a),.55,Math.cos(a)).normalize();b.strut(v3(0,23.8,0).addScaledVector(dir,.9),v3(0,23.8,0).addScaledVector(dir,2.3),.12,copper,6,.15);}
 b.mesh(root,vertexMaterial(.7,{metalness:.15}),'liberty-statue-and-pedestal');
 return root;
}
/** Lower Manhattan skyline: glass and stone towers with lit window grids. */
function createSkyline(parent:T.Object3D,finish:number,low:boolean){
 const windows=pixelTexture(32,(u,v,x,y)=>{const col=x%8,row=y%8,frame=col<2||row<2,lit=((Math.floor(x/8)*7+Math.floor(y/8)*13)%5)===0;return frame?[90,96,104]:lit?[250,226,160]:[150,172,196];});
 const material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,map:windows,roughness:.35,metalness:.3,emissive:'#3a3424',emissiveIntensity:.25,emissiveMap:windows});
 const b=new Builder(.35),r=random(4),colors=['#7f98b2','#b3ab9b','#6f86a0','#a39a8a','#647a94','#c2b9a8'];
 for(let i=0;i<(low?26:52);i++){const x=-20+i*(finish+60)/(low?26:52)+r()*2,h=12+Math.pow(r(),1.8)*36,w=4+r()*4,z=-185-r()*18;b.add(new T.BoxGeometry(w,h,w),colors[i%colors.length],[x,-9+h/2,z]);if(r()<.35)b.add(new T.BoxGeometry(w*.6,h*.15,w*.6),colors[(i+2)%colors.length],[x,-9+h+h*.075,z]);}
 const tallest=finish*.62;b.add(new T.CylinderGeometry(3.2,5.4,68,4,1),'#8fb0cf',[tallest,-9+34,-195],[0,Math.PI/4,0]);b.strut(v3(tallest,25,-195),v3(tallest,36,-195),.25,'#d9dde2',6,.4);
 const mesh=b.mesh(parent,material,'lower-manhattan-skyline');mesh.castShadow=false;return mesh;
}
function boat(b:Builder,x:number,z:number,hull:string,cabin:string,length:number){b.add(new T.BoxGeometry(length,.9,length*.32),hull,[x,-9.1,z]);b.add(new T.BoxGeometry(length*.55,.9,length*.26),cabin,[x,-8.25,z]);b.add(new T.BoxGeometry(length*.3,.6,length*.2),'#f2f2f2',[x,-7.5,z]);}

/** Original maintenance robot: compact red-and-blue body, glowing visor, two legs. */
function createRobot(parent:T.Object3D){
 const visor=new T.MeshStandardMaterial({color:'#9ff0ff',emissive:'#38d4ff',emissiveIntensity:1.1});
 const rig=createCreatureRig(parent,{name:'usa-maintenance-robot',height:.95,feet:[-.12,.12],footColor:'#2b3240',footSize:[.08,.05,.11],stride:8,animate(rig,time,state){visor.emissiveIntensity=state==='ALERT'?2:1+Math.sin(time*4)*.2;rig.extras.antenna.rotation.z=Math.sin(time*6)*.15;}});
 const red=standard('#c8352e',.4,{metalness:.35}),blue=standard('#2c4f9a',.4,{metalness:.35}),grey=standard('#9aa4ae',.35,{metalness:.6}),dark=matte('#2b3240');
 const body=new T.Mesh(new T.BoxGeometry(.5,.42,.4),red);body.position.y=.38;rig.body.add(body);
 const belly=new T.Mesh(new T.BoxGeometry(.36,.2,.05),grey);belly.position.set(0,.36,.21);rig.body.add(belly);
 for(const side of [-1,1]){const arm=new T.Mesh(new T.CylinderGeometry(.04,.04,.28,8),grey);arm.position.set(side*.3,.38,0);arm.rotation.z=side*.3;rig.body.add(arm);ellipsoid(rig.body,dark,side*.34,.25,0,.05,.05,.05,8);}
 for(const side of [-1,1]){const leg=new T.Mesh(new T.CylinderGeometry(.045,.05,.18,8),dark);leg.position.set(side*.12,.12,0);rig.body.add(leg);}
 const head=new T.Mesh(new T.BoxGeometry(.42,.3,.36),blue);head.position.y=.75;rig.head.add(head);
 const glass=new T.Mesh(new T.BoxGeometry(.34,.1,.05),visor);glass.position.set(0,.77,.19);rig.head.add(glass);
 const antenna=new T.Group();antenna.position.y=.9;rig.head.add(antenna);rig.extras.antenna=antenna;const rod=new T.Mesh(new T.CylinderGeometry(.012,.012,.2,6),grey);rod.position.y=.1;antenna.add(rod);ellipsoid(antenna,new T.MeshStandardMaterial({color:'#ffd34d',emissive:'#ffb400',emissiveIntensity:.8}),0,.22,0,.035,.035,.035,8);
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#8ec2ea',exposure:1.03,sun:'#fff3dc',sunIntensity:3.3,sky:'#eef6ff',ground:'#56636a',hemisphere:1.3,rim:'#dfeeff',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#3f86d0',horizon:'#dbe9f2',ground:'#4a5a62',intensity:.55}},
 mount(context){
  const {scene,finish,low,level}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='usa-new-york-harbor-environment';root.userData={environmentId:info.id,decorative:true,layers:['foreground','playable-waterfront','harbor-water-and-boats','liberty-island','manhattan-skyline','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#8ec2ea');scene.fog=new T.Fog('#cfe0ea',70,280);
  const sky=createSkyDome(root,{zenith:'#2f7acc',horizon:'#d9e9f4',glow:'#fff6e2',sun:[-.5,.6,-.6],glowPower:30});
  createCloudBanks(root,{finish,low,seed:101,groups:14,opacity:.85,high:[24,38],flat:.7});
  const staticRoot=new T.Group();staticRoot.name='usa-static-scenery';root.add(staticRoot);
  // Landmarks, water and landforms stay unbatched: they keep their names and can follow the camera.
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  const harbor=createWaterSurface(features,{x:finish/2,y:-9.4,z:-60,width:finish+300,depth:150,shallow:'#4d8aa4',deep:'#25587a',segments:44,name:'new-york-harbor-water',repeat:.06,flow:[.012,.016]});
  createHeightfield(features,{name:'liberty-island',x:46,y:-9.6,z:-82,width:30,depth:22,segments:[24,18],height:(u,v)=>1.2*Math.max(0,1-Math.hypot((u-.5)/.48,(v-.5)/.45)**4),color:()=>new T.Color('#6c9a4c')});
  const liberty=createLiberty(features);liberty.position.set(46,-8.5,-82);liberty.rotation.y=-.35;
  plantGrove(staticRoot,'plane',Array.from({length:low?4:9},(_,i)=>({x:36+i*2.4,y:-8.5,z:-74-(i%2)*2,scale:.8})),{low,name:'liberty-island-trees'});
  createSkyline(features,finish,low);
  createHeightfield(features,{name:'manhattan-waterfront',x:finish/2,y:-9.5,z:-185,width:finish+300,depth:30,segments:[30,6],height:()=>.6,color:()=>new T.Color('#7d8288')});
  const harborDetails=new Builder(),r=random(15);
  boat(harborDetails,20,-50,'#e46b2a','#f1efe8',9);boat(harborDetails,96,-62,'#e46b2a','#f1efe8',9);boat(harborDetails,70,-38,'#2c3e5a','#c8352e',4);boat(harborDetails,124,-44,'#2c3e5a','#c8352e',4);
  for(const x of [-10,64,138])if(x<finish+30){for(let i=0;i<8;i++)harborDetails.add(new T.BoxGeometry(2.4,.25,1.6),'#8a6a4c',[x,-8.6,-24-i*1.6]);for(let i=0;i<8;i+=2)for(const dx of [-1,1])harborDetails.add(new T.CylinderGeometry(.12,.14,2.5,7),'#3d4a57',[x+dx,-9.5,-24-i*1.6]);}
  for(const x of [10,86])if(x<finish+30){harborDetails.add(new T.BoxGeometry(.6,12,.6),'#d65a2a',[x,-3,-30]);harborDetails.add(new T.BoxGeometry(.6,12,.6),'#d65a2a',[x+5,-3,-30]);harborDetails.add(new T.BoxGeometry(9,.8,.8),'#d65a2a',[x+2.5,3.4,-30]);harborDetails.add(new T.BoxGeometry(1.6,1.2,1.2),'#3d4a57',[x+2,2.4,-30]);}
  harborDetails.mesh(features,vertexMaterial(.7),'ferries-tugs-piers-and-cranes');
  const sites=[{x:-8,y:-1,z:-12,w:14,t:8},{x:20,y:1.2,z:-22,w:13,t:11},{x:48,y:.4,z:-16,w:12,t:9},{x:76,y:2,z:-24,w:14,t:12},{x:102,y:.2,z:-14,w:12,t:9},{x:128,y:1.4,z:-20,w:14,t:11}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:7,thickness:site.t,preset:i%2?brick:granite,seed:11100+i,quality:low?'low':'standard'});
  const parks:Placement[]=sites.map(site=>({x:site.x+site.w*.3,y:site.y,z:site.z-1.6,scale:.9,rotation:r()*6}));plantGrove(staticRoot,'plane',parks,{low,name:'waterfront-park-trees'});
  // Overhead gantry rails carry the moving maintenance platforms.
  const gantries=level.platforms.filter(p=>p.style==='dock-lift').map(p=>{const top=p.y+5,frame=new Builder(),left=p.x-p.amplitude-.4,right=p.x+p.width+p.amplitude+.4;for(const x of [left,right])frame.add(new T.BoxGeometry(.3,top-p.y+10,.3),'#3d4a57',[x,(top+p.y-10)/2,-1.6]);frame.add(new T.BoxGeometry(right-left+.6,.4,.4),'#f2b233',[(left+right)/2,top+.2,-1.6]);frame.mesh(features,vertexMaterial(.5,{metalness:.4}),'overhead-gantry-rail');return{id:p.id,hanger:createHangers(root,{x:p.x+p.width/2,top,bottom:p.y-.1,spread:p.width*.8,color:'#2b3240',kind:'cable'})};});
  const foreground=new T.Group();foreground.name='usa-low-foreground';root.add(foreground);
  for(const [x,y] of [[-6,-5.6],[60,-7],[120,-5.8]] as const)if(x<finish+10)createScenicTerrace(foreground,{x,y,z:5,width:8,depth:4.5,thickness:5,preset:granite,seed:11400+x,quality:'low'});
  batchStatic(staticRoot);batchStatic(foreground);
  const gulls=createFlock(root,{count:low?6:12,centre:[finish*.5,11,-26],radius:[finish*.4,3,10],speed:.06,size:1,color:'#f4f4f2',wing:'#c9ced4',seed:17,glide:true,name:'seagulls'});
  let disposed=false;
  return{root,
   update(time,_dt,signals){if(disposed)return;const motion=reduced?0:time;harbor.update(motion);gulls.update(motion);for(const {id,hanger} of gantries){const p=signals.platforms.find(item=>item.id===id);if(p)hanger.root.position.x=p.x+p.width/2;}},
   frame(cameraX){sky.follow(cameraX);liberty.position.x=46+(cameraX-60)*.3;},
   setReducedMotion(value){reduced=value;},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?160:70;fog.far=view==='overview'?440:280;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low;
  if(definition.type==='bridge'){dressDeck(root,definition,'dock',deck,{below:3});return;}
  if(definition.motion){dressDeck(root,definition,'dock-lift',deck);return;}
  dressTerrain(root,definition,definition.style==='brick'?brick:granite,{quality:low?'low':'standard'});
  const props=new Builder(),w=definition.width;
  if(definition.id==='us-start'||definition.id==='us-c-exit'||definition.id==='us-finish'){const n=Math.ceil(w/.6);props.add(new T.BoxGeometry(w-.4,.07,.07),'#3d4a57',[0,1,-1.45]);for(let i=0;i<n;i++)props.add(new T.BoxGeometry(.05,1,.05),'#3d4a57',[-w/2+.2+(i+.5)*(w-.4)/n,.5,-1.45]);}
  if(definition.id==='us-start'){for(const x of [-w/2+1.4,2.4])props.add(new T.BoxGeometry(1.2,.6,.6),'#8f8b85',[x,.3,-1.1]);plantGrove(root,'flowering-shrub',[{x:-w/2+1.4,y:.55,z:-1.1,scale:.6},{x:2.4,y:.55,z:-1.1,scale:.6}],{low});}
  if(definition.id==='us-finish')plantGrove(root,'plane',[{x:w/2-1.6,y:0,z:-1.35,scale:.5}],{low});
  if(props.parts.length)props.mesh(root,vertexMaterial(.6,{metalness:.3}),'platform-waterfront-props');
 },
 createEnemy:createRobot,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'metal',color:'#7a8693',trim:'#c8352e',glyph:'#ffd34d'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#3d4a57',cloth:'#2c4f9a',accent:'#f2b233',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'harbor',width:3.4,height:3.4,stone:'#3d4a57',trim:'#2b3240'});arch.position.set(0,0,-1.55);},
};
