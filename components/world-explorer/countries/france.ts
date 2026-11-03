import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,standard,v3,vertexMaterial,type Placement} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps,markSurface} from '../kit/surface-maps';
import type {CountryEnvironment} from './types';

/** France — Paris: Eiffel Tower Rooftop Adventure. A fictional rooftop course;
 * the tower and Haussmann blocks are stylized studies, never destructible. */
const info={
 id:'france-paris-rooftops',title:'Paris: Eiffel Tower Rooftop Adventure',
 license:'Original procedural geometry; CC0 Poly Haven stone surface maps (see materials/LICENSES.md).',
 representation:'A fictional rooftop platform course inspired by Paris. The Eiffel Tower is a simplified lattice study; streets, river bends and buildings are not a map of the city.',
 landmarkSource:'https://www.toureiffel.paris/en/the-monument/history',
 assets:['eiffel-tower-iron-lattice','haussmann-blocks-with-mansard-roofs','wrought-iron-balconies','seine-river-and-quays','plane-trees','street-lamps','cafe-awnings','stone-arch-bridge','maintenance-lift','roof-gardens','pigeons'],
};
const parisStone:TerrainPreset={id:'paris-limestone-roof',shape:'masonry',rock:{light:'#efe4cf',dark:'#cbbb9c',crack:'#7d715d',top:'#8a9a6a',topDepth:.03,strata:.2},cap:{kind:'paving',a:'#d6cbb5',b:'#c5b89e',c:'#7f7562'},rim:{kind:'curb',color:'#d9cfba',alt:'#cbbfa7',size:.6},flowers:{colors:['#e8473b','#f6d14b','#f3f0ea','#c86bc4'],density:1.4},maps:{set:'paris-stone',tint:'#fffaf2',repeat:1}};
const roofGarden:TerrainPreset={...parisStone,id:'paris-roof-garden',cap:{kind:'grass',a:'#c8bba0',b:'#5f9a45',c:'#86b55a',path:.2},rim:{kind:'tufts',color:'#5f9a45',alt:'#7fb257',size:.9},blades:{color:'#5f9a45',alt:'#7fb257',density:1,height:.9},flowers:{colors:['#e8473b','#f6d14b','#f3f0ea','#c86bc4'],density:2.6}};
const deck:DeckPalette={wood:'#8a6444',woodAlt:'#9b7350',rope:'#c8b48a',stone:'#eadfc8',stoneAlt:'#dccfb4',metal:'#3b4148',accent:'#c9a24a'};

/** Stylized Eiffel Tower: four curved lattice legs with X-bracing, base arches,
 * two platform levels and a tapering shaft. Brown iron, not a measured model. */
function createEiffel(parent:T.Object3D,low:boolean){
 const root=new T.Group();root.name='eiffel-tower';root.userData.landmark='Eiffel Tower';root.userData.source=info.landmarkSource;parent.add(root);
 const b=new Builder(),iron='#7b5b45',step=low?3:2;
 const half=(h:number)=>h<13?15-h*.5:h<26?8.5-(h-13)*.27:5-(h-26)*.118;
 const leg=(h:number)=>Math.max(.9,2.4-h*.058);
 const rail=(a:T.Vector3,c:T.Vector3,r=.11)=>b.strut(a,c,r,iron,5,.9);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  let previous:T.Vector3[]|null=null;
  for(let h=0;h<=26;h+=step){const w=half(h),l=leg(h),cx=sx*(w-l),cz=sz*(w-l),corners=[v3(cx-l,h,cz-l),v3(cx+l,h,cz-l),v3(cx+l,h,cz+l),v3(cx-l,h,cz+l)];
   if(previous){for(let i=0;i<4;i++){rail(previous[i],corners[i],.16);if(h%(step*1)===0){rail(previous[i],corners[(i+1)%4],.06);rail(previous[(i+1)%4],corners[i],.06);}}}
   else for(let i=0;i<4;i++)b.add(new T.BoxGeometry(1.6,1.2,1.6),'#6e6455',[corners[i].x,.6,corners[i].z]);
   previous=corners;}
 }
 let previous:T.Vector3[]|null=null;
 for(let h=26;h<=58;h+=step*1.25){const w=half(h),corners=[v3(-w,h,-w),v3(w,h,-w),v3(w,h,w),v3(-w,h,w)];if(previous)for(let i=0;i<4;i++){rail(previous[i],corners[i],.14);rail(previous[i],corners[(i+1)%4],.05);rail(previous[(i+1)%4],corners[i],.05);}previous=corners;}
 // Base arches between the legs on every face.
 for(let face=0;face<4;face++){const a=face*Math.PI/2,points:T.Vector3[]=[];for(let i=0;i<=12;i++){const t=i/12,x=(t*2-1)*9.5,y=11.5-Math.pow(Math.abs(t*2-1),2.2)*9.5;points.push(v3(x,y,0).applyAxisAngle(v3(0,1,0),a).add(v3(Math.sin(a)*10.5,0,Math.cos(a)*10.5)));}b.add(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.35,6,false),iron);}
 for(const [h,size,height] of [[13,9.6,1.6],[26,5.6,1.1],[58,1.6,2.2]] as const){b.add(new T.BoxGeometry(size*2+2,height,size*2+2),'#6f5240',[0,h+height/2,0]);b.add(new T.BoxGeometry(size*2+2.4,.25,size*2+2.4),'#8a6a52',[0,h+height+.4,0]);}
 b.strut(v3(0,60.4,0),v3(0,67,0),.25,iron,6,.5);
 const material=vertexMaterial(.6,{metalness:.35});b.mesh(root,material,'eiffel-iron-lattice');
 return root;
}
/** A Haussmann apartment block: cream stone, iron balconies and a zinc mansard roof with dormers. */
function haussmann(b:Builder,x:number,y:number,z:number,width:number,floors:number,depth=6,rotation=0){
 const h=floors*1.3,c=Math.cos(rotation),s=Math.sin(rotation),local=(lx:number,ly:number,lz:number):[number,number,number]=>[x+lx*c+lz*s,y+ly,z-lx*s+lz*c];
 b.add(new T.BoxGeometry(width,h,depth),'#eadcc3',local(0,h/2,0),[0,rotation,0],[1,1,1],.04);
 b.add(new T.BoxGeometry(width+.2,.25,depth+.2),'#d8c9ad',local(0,1.3,0),[0,rotation,0]);
 const cols=Math.max(2,Math.round(width/1.4));
 for(let f=1;f<floors;f++)for(let i=0;i<cols;i++){const lx=-width/2+(i+.5)*width/cols;b.add(new T.BoxGeometry(.55,.85,.06),'#3d4a57',local(lx,f*1.3+.6,depth/2+.02),[0,rotation,0]);b.add(new T.BoxGeometry(.75,.08,.08),'#d8c9ad',local(lx,f*1.3+1.08,depth/2+.04),[0,rotation,0]);}
 for(const f of [2,floors-1])if(f>0){b.add(new T.BoxGeometry(width,.08,.35),'#2b2f33',local(0,f*1.3+.12,depth/2+.18),[0,rotation,0]);b.add(new T.BoxGeometry(width,.05,.05),'#2b2f33',local(0,f*1.3+.55,depth/2+.34),[0,rotation,0]);for(let i=0;i<cols*3;i++)b.add(new T.BoxGeometry(.03,.42,.03),'#2b2f33',local(-width/2+(i+.5)*width/(cols*3),f*1.3+.34,depth/2+.34),[0,rotation,0]);}
 const roof=new T.Shape();roof.moveTo(-depth/2-.1,0);roof.lineTo(-depth/2+.9,1.5);roof.lineTo(depth/2-.9,1.5);roof.lineTo(depth/2+.1,0);roof.closePath();const g=new T.ExtrudeGeometry(roof,{depth:width,bevelEnabled:false});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);b.add(g,'#5b6672',local(0,h,0),[0,rotation,0],[1,1,1],.04);
 for(let i=0;i<cols;i++){const lx=-width/2+(i+.5)*width/cols;b.add(new T.BoxGeometry(.5,.6,.5),'#eadcc3',local(lx,h+.75,depth/2-.45),[0,rotation,0]);b.add(new T.BoxGeometry(.3,.38,.05),'#3d4a57',local(lx,h+.72,depth/2-.18),[0,rotation,0]);}
 for(const lx of [-width/2+.6,width/2-.6])b.add(new T.BoxGeometry(.5,.9,.5),'#c4785a',local(lx,h+1.8,0),[0,rotation,0]);
}
function streetLamp(b:Builder,x:number,y:number,z:number){b.add(new T.CylinderGeometry(.05,.08,2.6,8),'#2b3236',[x,y+1.3,z]);b.add(new T.CylinderGeometry(.16,.1,.32,8),'#fff1c4',[x,y+2.75,z]);b.add(new T.ConeGeometry(.2,.18,8),'#2b3236',[x,y+3,z]);}

/** Original clockwork pigeon: rounded metal bird with tiny legs; flaps on turning. */
function createPigeon(parent:T.Object3D){
 const rig=createCreatureRig(parent,{name:'france-clockwork-pigeon',height:.8,feet:[-.07,.07],footColor:'#c4785a',footSize:[.04,.035,.06],stride:11,animate(rig,time,state,moving){const flap=state==='TURN'||state==='ALERT'?Math.sin(time*22)*.7:moving?Math.sin(time*4)*.08:0;rig.extras.left.rotation.z=.2+flap;rig.extras.right.rotation.z=-.2-flap;rig.head.position.z=moving?Math.sin(time*11)*.03:0;}});
 const metal=standard('#8b98a8',.35,{metalness:.6}),dark=standard('#5e6b7c',.4,{metalness:.5}),sheen=standard('#7f9a8c',.3,{metalness:.6}),white=matte('#fbf7ea'),pupil=matte('#1d1a18'),beak=matte('#e1b35a');
 ellipsoid(rig.body,metal,0,.38,-.05,.22,.22,.3,16);ellipsoid(rig.body,sheen,0,.5,.12,.16,.12,.12,12);
 const tail=new T.Mesh(new T.BoxGeometry(.18,.04,.25),dark);tail.position.set(0,.36,-.34);tail.rotation.x=-.4;rig.body.add(tail);
 ellipsoid(rig.head,metal,0,.64,.2,.12,.12,.12,14);const b2=new T.Mesh(new T.ConeGeometry(.035,.12,6),beak);b2.position.set(0,.62,.34);b2.rotation.x=Math.PI/2;rig.head.add(b2);
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*.07,.68,.29,.04,.045,.025,10);ellipsoid(rig.head,pupil,side*.07,.68,.31,.02,.025,.012,8);}
 for(const side of [-1,1]){const wing=new T.Group();wing.position.set(side*.2,.45,-.02);rig.figure.add(wing);rig.extras[side<0?'left':'right']=wing;ellipsoid(wing,dark,side*.06,0,0,.06,.14,.24,10);}
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#9cb8dc',exposure:1.03,sun:'#ffcf96',sunIntensity:3.1,sky:'#ffe9d6',ground:'#6f6458',hemisphere:1.2,rim:'#ffc690',rimIntensity:.8,pixelRatio:1.25,reflections:{zenith:'#6f8fc8',horizon:'#f4c9a4',ground:'#6a5f54',intensity:.5}},
 mount(context){
  const {scene,finish,low,level}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='france-paris-environment';root.userData={environmentId:info.id,decorative:true,layers:['foreground','playable-rooftops','seine-and-quays','haussmann-blocks','eiffel-tower','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#9cb8dc');scene.fog=new T.Fog('#e9d2be',70,280);
  const sky=createSkyDome(root,{zenith:'#5b85c8',horizon:'#f6cfae',band:'#f6bf92',glow:'#ffc07a',sun:[.55,.2,-.8],glowPower:16});
  createCloudBanks(root,{finish,low,seed:77,groups:14,opacity:.8,shade:'#e7c4b4',color:'#fff1e6',high:[22,36],flat:.6});
  const staticRoot=new T.Group();staticRoot.name='france-static-scenery';root.add(staticRoot);
  // Landmarks, water and landforms stay unbatched: they keep their names and can follow the camera.
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  createHeightfield(features,{name:'paris-ground',x:finish/2,y:-7.4,z:-110,width:finish+300,depth:150,segments:[40,20],height:()=>0,color:gradientColor([[0,'#9b9384']])});
  const seine=createWaterSurface(features,{x:finish/2,y:-9.3,z:-12,width:finish+260,depth:42,shallow:'#5f8a8c',deep:'#3c6470',segments:30,name:'seine-river',repeat:.12,flow:[.025,.004]});
  const city=new Builder(.5),r=random(9);
  // Stone quays along the river, then rows of Haussmann blocks behind.
  city.add(new T.BoxGeometry(finish+260,2.2,2),'#cdbf9f',[finish/2,-8.4,-33],[0,0,0],[1,1,1],.03);
  for(let x=-30;x<finish+40;x+=9+r()*3)haussmann(city,x,-7.3,-40-r()*2,7+r()*2.5,5+Math.floor(r()*2),6);
  for(let x=-40;x<finish+50;x+=10+r()*4)haussmann(city,x,-7.3,-56-r()*6,8+r()*3,6+Math.floor(r()*2),7);
  for(let x=-50;x<finish+60;x+=12+r()*5)haussmann(city,x,-7.3,-80-r()*10,9+r()*3,7,7);
  const cityMaterial=vertexMaterial(.85);markSurface(cityMaterial,'paris-stone','#ffffff');city.mesh(features,cityMaterial,'haussmann-boulevards');
  const eiffel=createEiffel(features,low);eiffel.position.set(66,-7.3,-165);eiffel.scale.setScalar(1);
  const details=new Builder(),plane:Placement[]=[];
  for(let x=-24;x<finish+30;x+=7)streetLamp(details,x,-7.3,-33.5);
  for(let x=-20;x<finish+30;x+=6+r()*3)plane.push({x,y:-7.3,z:-35+(r()-.5),scale:1+r()*.3,rotation:r()*6});
  for(let x=-10;x<finish+20;x+=18+r()*8){details.add(new T.BoxGeometry(4,.08,1.4),'#b8322c',[x,-5.7,-36.4],[-.3,0,0]);for(let i=0;i<4;i++)details.add(new T.BoxGeometry(.5,.08,1.42),'#f3ece0',[x-1.5+i,-5.69,-36.4],[-.3,0,0]);for(let i=0;i<3;i++){details.add(new T.CylinderGeometry(.3,.3,.05,10),'#3b3f44',[x-1.2+i*1.2,-6.6,-35.3]);}}
  details.mesh(features,vertexMaterial(.75),'quay-lamps-and-cafe-awnings');
  plantGrove(staticRoot,'plane',plane,{low,name:'plane-trees-on-the-quay'});
  // Near-background rooftop terraces frame the course with gardens and chimneys.
  const sites=[{x:-8,y:-1,z:-12,w:14,t:8},{x:20,y:1.4,z:-22,w:13,t:11},{x:46,y:.4,z:-16,w:12,t:9},{x:78,y:2,z:-24,w:14,t:12},{x:104,y:.4,z:-14,w:12,t:9},{x:130,y:1.4,z:-20,w:14,t:11}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:7,thickness:site.t,preset:i%2?roofGarden:parisStone,seed:10100+i,quality:low?'low':'standard',lush:true});
  // Guide rails for the vertical maintenance lift.
  const rails=new Builder();for(const p of level.platforms.filter(p=>p.motion==='vertical'&&p.style==='lift'))for(const x of [p.x-.12,p.x+p.width+.12]){rails.add(new T.BoxGeometry(.12,p.y+p.amplitude+3.4+9,.12),'#3b4148',[x,(p.y+p.amplitude+3.4-9)/2,-.9]);rails.add(new T.BoxGeometry(.12,.12,1.2),'#c9a24a',[x,p.y+p.amplitude+3.4,-.4]);}
  rails.mesh(features,vertexMaterial(.5,{metalness:.5}),'lift-guide-rails');
  const foreground=new T.Group();foreground.name='france-low-foreground';root.add(foreground);
  for(const [x,y] of [[-6,-5.4],[60,-6.8],[122,-5.6]] as const)if(x<finish+10)createScenicTerrace(foreground,{x,y,z:5,width:8,depth:4.5,thickness:7,preset:parisStone,seed:10400+x,quality:'low'});
  batchStatic(staticRoot);batchStatic(foreground);
  const pigeons=createFlock(root,{count:low?5:10,centre:[finish*.5,10,-26],radius:[finish*.4,2.5,9],speed:.07,size:.9,color:'#8b98a8',wing:'#6f7d8f',seed:13,name:'city-pigeons'});
  const leaves=createDrift(root,{kind:'leaf',count:low?14:36,colors:['#c9a24a','#b8742e','#8fa04a'],x:[-6,finish+10],y:[-1,7],z:[-6,2.5],fall:.32,sway:.8,size:.15,seed:21,name:'drifting-plane-leaves'});leaves.setVisible(!reduced);
  let disposed=false;
  return{root,
   update(time){if(disposed)return;const motion=reduced?0:time;seine.update(motion);pigeons.update(motion);leaves.update(motion);},
   frame(cameraX){sky.follow(cameraX);eiffel.position.x=66+(cameraX-60)*.55;},
   setReducedMotion(value){reduced=value;leaves.setVisible(!value);},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?160:70;fog.far=view==='overview'?440:280;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low,surface={set:'paris-stone' as const,tint:'#ffffff',repeat:.6};
  if(definition.type==='bridge'){dressDeck(root,definition,'paris',deck,{below:7,surface});return;}
  if(definition.motion){dressDeck(root,definition,'lift',deck);return;}
  dressTerrain(root,definition,definition.style==='roof-garden'?roofGarden:parisStone,{quality:low?'low':'standard',lush:definition.id==='fr-start'||definition.style==='roof-garden'});
  const props=new Builder(),w=definition.width;
  // Iron railings and lamps stay at the back edge, behind the walking lane.
  if(definition.id==='fr-start'||definition.style==='balcony'){const n=Math.ceil(w/.18);props.add(new T.BoxGeometry(w-.4,.05,.05),'#2b2f33',[0,.95,-1.45]);for(let i=0;i<n;i++)props.add(new T.BoxGeometry(.03,.9,.03),'#2b2f33',[-w/2+.2+(i+.5)*(w-.4)/n,.47,-1.45]);}
  if(definition.id==='fr-start'){streetLamp(props,w/2-1.2,0,-1.25);plantGrove(root,'flowering-shrub',[{x:-w/2+1.6,y:0,z:-1.2,scale:.8},{x:2,y:0,z:-1.25,scale:.7}],{low});}
  if(definition.id==='fr-high-terrace'||definition.id==='fr-g-roof')for(const x of [-w/2+.8,w/2-.8])props.add(new T.BoxGeometry(.6,1,.6),'#c4785a',[x,.5,-1.2]);
  if(definition.style==='roof-garden')plantGrove(root,'plane',[{x:w/2-1.4,y:0,z:-1.35,scale:.45}],{low});
  if(definition.id==='fr-finish')streetLamp(props,-w/2+1.4,0,-1.25);
  if(props.parts.length)props.mesh(root,vertexMaterial(.6),'platform-paris-props');
 },
 createEnemy:createPigeon,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'metal',color:'#7f8b97',trim:'#c9a24a',glyph:'#ffe08a'}),
 decorateCheckpoint(marker){const b=new Builder();streetLamp(b,.6,0,-.35);b.mesh(marker,vertexMaterial(.6),'checkpoint-street-lamp');const banner=createBannerPost(marker,{pole:'#2b3236',cloth:'#2f4f8f',accent:'#c9a24a',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'iron',width:3.4,height:3.4,stone:'#5b4a3c',trim:'#3b4148'});arch.position.set(0,0,-1.55);},
};
