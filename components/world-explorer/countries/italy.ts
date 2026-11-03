import * as T from 'three';
import {Builder,batchStatic,clamp,disposeTree,ellipsoid,matte,random,standard,v3,vertexMaterial,valueNoise} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield,gradientColor,rollingHills} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {arcadeBay,column,stuccoHouse} from '../kit/architecture';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {loadSurfaceMaps,markSurface} from '../kit/surface-maps';
import {createCreatureRig,finishCreature} from '../kit/creature';
import type {CountryEnvironment} from './types';

/** Italy — Ancient Rome: Colosseum Adventure. A fictional platform route through
 * Roman-inspired ruins, not a reconstruction of central Rome's street plan. */
const info={
 id:'italy-rome-colosseum',title:'Ancient Rome: Colosseum Adventure',
 license:'Original procedural geometry and textures created for SocialU. No external models, photographs or textures.',
 representation:'A fictional Mediterranean platform course inspired by Rome. The Colosseum is a stylized landmark study set in an imaginary valley; the aqueduct, forum columns and houses are not placed as in the real city.',
 landmarkSource:'https://colosseo.it/en/area/colosseo/',
 assets:['colosseum-with-ruined-outer-ring','roman-aqueduct','forum-colonnade','roman-arch-bridge','terracotta-houses','cypress-stone-pine-olive','valley-water-channel'],
};
const stone={light:'#e9dcc1',dark:'#bba684',crack:'#6c5c46'};
const limestone:TerrainPreset={id:'roman-limestone',shape:'rock',rock:{...stone,top:'#8d9c58',topDepth:.07,strata:.7},cap:{kind:'paving',a:'#ddd0b2',b:'#cbbb98',c:'#86795f'},rim:{kind:'tufts',color:'#7f9a45',alt:'#9aaf57'},blades:{color:'#8aa64a',alt:'#a8b75e',density:1.1,height:1},flowers:{colors:['#d8402f','#f4f0e1','#f1c84a'],density:1.6},pebbles:'#d8c9a8',maps:{set:'limestone',tint:'#e2e2e8',repeat:.7}};
const masonry:TerrainPreset={id:'roman-masonry',shape:'masonry',rock:{light:'#e6d6b6',dark:'#b49c78',crack:'#6a5843',top:'#8d9c58',topDepth:.05,strata:.3},cap:{kind:'paving',a:'#d9caa8',b:'#c6b48e',c:'#7f735a'},rim:{kind:'tufts',color:'#7f9a45',alt:'#a3b25a',size:.8},blades:{color:'#8aa64a',alt:'#a8b75e',density:.6,height:.8},maps:{set:'ashlar',tint:'#f6ecd8',repeat:1}};
const deck:DeckPalette={wood:'#8a6444',woodAlt:'#9b7350',rope:'#bfae86',stone:'#dccdae',stoneAlt:'#c7b590',metal:'#6d5a3e',accent:'#b8873e'};

/** Stylized Flavian Amphitheatre: three arcaded tiers and an attic around an
 * ellipse, the outer ring partly fallen to reveal the inner ring and seating. */
function createColosseum(parent:T.Object3D,low:boolean){
 const root=new T.Group();root.name='colosseum';root.userData.landmark='Colosseum';root.userData.source=info.landmarkSource;parent.add(root);
 const b=new Builder(.42),inner=new Builder(.42),A=21,B=17,bays=low?32:44,tiers=[3.3,3.1,3.1],attic=2.7,depth=1.3,r=random(80);
 const travertine=new T.Color('#dcc9a3'),weathered=new T.Color('#b8a27e'),dark=new T.Color('#9c8665'),shadowed=new T.Color('#7d6a52');
 const ruin=(angle:number)=>{const a=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);if(a<.22*Math.PI||a>.5*Math.PI)return 4;const t=(a-.22*Math.PI)/(.28*Math.PI);return Math.max(1,Math.floor(1+Math.abs(Math.sin(t*Math.PI*1.4))*2.6+(t>.5?1:0)));};
 const placeBay=(target:Builder,a:number,ax:number,bz:number,width:number,height:number,y:number,color:T.Color,options:{opening?:number;spring?:number}={})=>{
  const x=Math.cos(a)*ax,z=Math.sin(a)*bz,tangent=v3(-Math.sin(a)*ax,0,Math.cos(a)*bz).normalize(),heading=Math.atan2(-tangent.z,tangent.x);
  target.add(arcadeBay(width,height,depth,options),color.clone().multiplyScalar(.94+r()*.1),[x,y,z],[0,heading,0],[1,1,1],.05);
  return{x,z,heading};
 };
 const perimeter=2*Math.PI*Math.sqrt((A*A+B*B)/2);
 for(let i=0;i<bays;i++){
  const a=(i+.5)/bays*Math.PI*2,levels=ruin(a),width=perimeter/bays*1.01;let y=0;
  for(let t=0;t<3;t++){
   if(t>=levels)break;const h=tiers[t],color=t===0?weathered.clone().lerp(travertine,.4):travertine;const bay=placeBay(b,a,A,B,width,h,y,color,{opening:.6,spring:.6});
   // Engaged half columns and a cornice band articulate each storey.
   const cx=Math.cos(a+Math.PI/bays)*(A+depth*.55),cz=Math.sin(a+Math.PI/bays)*(B+depth*.55);b.add(new T.CylinderGeometry(.2,.22,h-.3,8),travertine,[cx,y+h/2,cz]);
   b.add(new T.BoxGeometry(width*1.02,.28,depth+.35),dark.clone().lerp(travertine,.6),[bay.x,y+h-.06,bay.z],[0,bay.heading,0]);y+=h;
  }
  if(levels>=4){const x=Math.cos(a)*A,z=Math.sin(a)*B,heading=Math.atan2(-(Math.cos(a)*B),-Math.sin(a)*A),shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,attic);shape.lineTo(-width/2,attic);shape.closePath();const hole=new T.Path();hole.moveTo(-.35,attic*.45);hole.lineTo(.35,attic*.45);hole.lineTo(.35,attic*.75);hole.lineTo(-.35,attic*.75);hole.closePath();if(i%2)shape.holes.push(hole);const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);b.add(g,travertine,[x,y,z],[0,heading,0],[1,1,1],.05);b.add(new T.BoxGeometry(width*1.02,.3,depth+.4),dark.clone().lerp(travertine,.7),[x,y+attic,z],[0,heading,0]);}
  // Broken masonry at the top of a fallen section.
  else{const x=Math.cos(a)*A,z=Math.sin(a)*B;for(let k=0;k<3;k++)b.add(new T.BoxGeometry(.6+r()*.8,.4+r()*.6,.8),weathered,[x+(r()-.5)*1.5,y+.2+r()*.3,z+(r()-.5)*.6],[r(),r()*3,r()],[1,1,1],.1);}
 }
 // Inner ring and the stepped seating, visible above and through the fallen arcades.
 for(let i=0;i<bays;i++){const a=(i+.5)/bays*Math.PI*2;placeBay(inner,a,A-3.4,B-3.4,2*Math.PI*Math.sqrt(((A-3.4)**2+(B-3.4)**2)/2)/bays*1.01,7.6,0,shadowed,{opening:.5,spring:.55});}
 const seats=new T.BufferGeometry(),positions:number[]=[],colors:number[]=[],steps=low?6:10,around=bays*2,index:number[]=[];
 for(let k=0;k<=steps;k++)for(let i=0;i<=around;i++){const a=i/around*Math.PI*2,t=k/steps,scale=1-t*.45,ax=(A-3.8)*scale,bz=(B-3.8)*scale,stepY=8.4*(1-t)-((k%2)*.25);positions.push(Math.cos(a)*ax,stepY,Math.sin(a)*bz);const c=(k%2?dark:shadowed).clone().multiplyScalar(.9+valueNoise(i*.3,k,5)*.2);colors.push(c.r,c.g,c.b);}
 for(let k=0;k<steps;k++)for(let i=0;i<around;i++){const a=k*(around+1)+i,b2=a+1,c=a+around+1;index.push(a,c,b2,b2,c,c+1);}
 seats.setAttribute('position',new T.Float32BufferAttribute(positions,3));seats.setAttribute('color',new T.Float32BufferAttribute(colors,3));seats.setIndex(index);seats.computeVertexNormals();
 const cavea=new T.Mesh(seats,vertexMaterial(.95,{side:T.DoubleSide}));cavea.name='colosseum-seating';root.add(cavea);
 const arena=new T.Mesh(new T.CircleGeometry(1,48),matte('#c9ae7f'));arena.rotation.x=-Math.PI/2;arena.scale.set((A-3.8)*.55,(B-3.8)*.55,1);arena.position.y=.4;root.add(arena);
 const plinth=new T.Mesh(new T.CylinderGeometry(1,1,1,48),matte('#a59273'));plinth.scale.set(A+2.2,.8,B+2.2);plinth.position.y=-.4;root.add(plinth);
 const outer=vertexMaterial(.92),ring=vertexMaterial(.95);markSurface(outer,'paris-stone','#fffaf0');markSurface(ring,'paris-stone','#e2d8c6');
 b.mesh(root,outer,'colosseum-outer-arcades');inner.mesh(root,ring,'colosseum-inner-ring');
 batchStatic(root);return root;
}

/** Two-tier arched aqueduct crossing the imaginary valley. */
function createAqueduct(parent:T.Object3D,from:number,to:number,z:number,base:number){
 const b=new Builder(.4),bay=3.4,low=6.4,high=3.4,color=new T.Color('#c9a77c');let index=0;
 for(let x=from;x<to;x+=bay){if(++index%9===0){x+=bay*2;continue;}const shade=color.clone().multiplyScalar(.9+((x*7)%5)/40);b.add(arcadeBay(bay,low,1.6,{opening:.7,spring:.6}),shade,[x,base,z]);b.add(arcadeBay(bay,high,1.3,{opening:.62,spring:.5}),shade,[x,base+low,z]);b.add(new T.BoxGeometry(bay,.5,1.5),'#b89670',[x,base+low+high+.25,z]);}
 const material=vertexMaterial(.95);markSurface(material,'paris-stone','#ecd3b2');const m=b.mesh(parent,material,'roman-aqueduct');m.userData.collidable=false;return m;
}

function forumColonnade(b:Builder,x:number,y:number,z:number,count:number,spacing:number,height:number,seed:number){
 for(let i=0;i<count;i++)column(b,[x+i*spacing,y,z],height,.32,'#e4d6b8',{seed:seed+i,capital:'#d6c5a2'});
 b.add(new T.BoxGeometry(spacing*(count-1)+1.2,.7,1),'#d8c8a6',[x+spacing*(count-1)/2,y+height+.35,z]);b.add(new T.BoxGeometry(spacing*(count-1)+1.4,.25,1.15),'#c9b794',[x+spacing*(count-1)/2,y+height+.82,z]);
}

/** Marble-and-bronze mechanical sentry: an original automaton, not a soldier. */
function createSentry(parent:T.Object3D){
 const rig=createCreatureRig(parent,{name:'italy-marble-bronze-sentry',height:1.05,feet:[-.12,.12],footColor:'#8c6631',footSize:[.075,.06,.1],stride:6,animate(rig,time,state,moving){const eyes=rig.extras.eyes;eyes.scale.setScalar(state==='ALERT'?1.25:1);rig.head.position.y=moving?Math.sin(time*12)*.008:0;}});
 const marble=matte('#ece6da',.45),vein=matte('#cfc6b6',.5),bronze=standard('#a7743a',.35,{metalness:.7}),dark=matte('#3a2c22');
 ellipsoid(rig.body,marble,0,.46,0,.27,.32,.23,18);ellipsoid(rig.body,vein,.05,.5,.17,.16,.18,.09,12);
 const belt=new T.Mesh(new T.TorusGeometry(.265,.035,8,24),bronze);belt.rotation.x=Math.PI/2;belt.position.y=.38;belt.scale.set(1,.88,1);rig.body.add(belt);
 for(const side of [-1,1]){ellipsoid(rig.body,bronze,side*.27,.5,0,.07,.07,.07,10);ellipsoid(rig.body,marble,side*.31,.36,.02,.06,.13,.06,10);}
 for(const side of [-1,1]){const leg=new T.Mesh(new T.CylinderGeometry(.035,.04,.14,8),bronze);leg.position.set(side*.12,.17,0);rig.body.add(leg);}
 ellipsoid(rig.head,marble,0,.86,0,.2,.17,.18,16);const cap=new T.Mesh(new T.SphereGeometry(.205,16,8,0,Math.PI*2,0,Math.PI/2),bronze);cap.position.y=.88;rig.head.add(cap);
 const fin=new T.Mesh(new T.BoxGeometry(.04,.12,.26),bronze);fin.position.set(0,1.06,-.02);rig.head.add(fin);
 const eyes=new T.Group();eyes.position.set(0,.86,.165);rig.head.add(eyes);rig.extras.eyes=eyes;
 for(const side of [-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.035,10,8),new T.MeshStandardMaterial({color:'#9ff0ff',emissive:'#4fd4f0',emissiveIntensity:1.4}));eye.position.set(side*.065,0,0);eyes.add(eye);}
 ellipsoid(rig.head,dark,0,.8,.17,.06,.012,.01,8);
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#8fbfe9',exposure:1.04,sun:'#ffe1ae',sunIntensity:3.3,sky:'#eef2ff',ground:'#8f7a56',hemisphere:1.25,rim:'#ffe9cc',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#5c98dc',horizon:'#f2dfbf',ground:'#8c7b5c',intensity:.32}},
 mount(context){
  const {scene,finish,low}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='italy-rome-environment';root.userData={environmentId:info.id,decorative:true,layers:['foreground','playable-context','near-background','landmark','distant-landscape','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#8fbfe9');scene.fog=new T.Fog('#ead8b8',60,230);
  const sky=createSkyDome(root,{zenith:'#3f86d8',horizon:'#f4dfbd',band:'#f6d9ae',glow:'#ffd49a',sun:[-.55,.45,-.8]});
  createCloudBanks(root,{finish,low,seed:311,groups:14,shade:'#e6d6c4',color:'#fffaf0',opacity:.85,flat:.7});
  const staticRoot=new T.Group();staticRoot.name='italy-static-scenery';root.add(staticRoot);
  // Landmarks, water and landforms stay unbatched: they keep their names and can follow the camera.
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  // Distant countryside: low rolling hills with a warm haze.
  createHeightfield(features,{name:'roman-countryside-hills',x:finish/2,y:-12,z:-150,width:finish+260,depth:90,segments:[low?60:110,low?14:24],height:rollingHills(41,26,3.2),color:gradientColor([[0,'#9aa36a'],[8,'#7f9152'],[16,'#a89a68'],[26,'#b9ae86']])});
  // Valley floor with fields and a winding water channel below the course.
  // Field patches: wheat, olive groves, meadow and bare earth.
  const fields=[new T.Color('#c9b46a'),new T.Color('#7f9a4a'),new T.Color('#97a85a'),new T.Color('#b39a6c'),new T.Color('#6f8d45')];
  createHeightfield(features,{name:'roman-valley-floor',x:finish/2,y:-10.5,z:-48,width:finish+220,depth:120,segments:[low?50:90,low?24:40],height:(u,v)=>rollingHills(77,5,4)(u,v)*(1-Math.exp(-((v-.82)**2)*40)*.8)+v*v*2,color:(h,slope,u,v)=>{const cell=Math.floor(valueNoise(u*14,v*9,8)*fields.length*1.3)%fields.length;return fields[cell].clone().lerp(new T.Color('#8a9a5a'),.25).multiplyScalar(.9+valueNoise(u*60,v*60,3)*.2-slope*.2);}});
  const channel=createWaterSurface(features,{x:finish/2,y:-9.55,z:-9,width:finish+200,depth:5,shallow:'#7cc6c8',deep:'#3c8ea1',segments:40,name:'valley-water-channel',repeat:.2,edge:'none'});
  // Distant city: terracotta roofs and a few domes on the far hills.
  const city=new Builder(),cityRandom=random(902);
  for(let i=0;i<(low?40:90);i++){const x=-40+cityRandom()*(finish+90),z=-96-cityRandom()*26,y=-6+valueNoise(x*.05,z*.05,41)*6;stuccoHouse(city,[x,y,z],[2+cityRandom()*2,1.6+cityRandom()*1.6,2+cityRandom()*2],{wall:cityRandom()<.5?'#e2c79a':'#d8a875',roof:'#b8613d',shutter:'#5f7a4a'},cityRandom()*.6,i);}
  for(const x of [18,96,140])if(x<finish+40){city.add(new T.SphereGeometry(2.4,16,8,0,Math.PI*2,0,Math.PI/2),'#c9b99b',[x,-.2,-110]);city.add(new T.CylinderGeometry(2.5,2.5,2.6,16),'#e0cfaf',[x,-1.5,-110]);}
  city.mesh(features,vertexMaterial(.95),'distant-roman-city');
  // The Colosseum is the dominant mid-distance landmark.
  const colosseum=createColosseum(features,low);colosseum.position.set(64,-3,-62);colosseum.scale.setScalar(1.05);colosseum.rotation.y=-.08;
  createHeightfield(features,{name:'colosseum-hill',x:64,y:-10.6,z:-62,width:70,depth:52,segments:[30,24],height:(u,v)=>7.3*clamp(1-Math.hypot((u-.5)/.48,(v-.5)/.44)**3,0,1),color:gradientColor([[0,'#8b9b57'],[5,'#a59a6c'],[7.4,'#b39f78']])});
  createAqueduct(features,-30,Math.min(finish+30,150),-46,-10.4);
  // Near-background limestone terraces carrying ruins, houses and trees.
  const sites=[{x:-6,y:-1.2,z:-11,w:16,t:9},{x:22,y:1.2,z:-19,w:15,t:12},{x:44,y:-.6,z:-14,w:12,t:10},{x:84,y:1.8,z:-20,w:16,t:13},{x:104,y:-.4,z:-12,w:13,t:10},{x:126,y:1,z:-17,w:16,t:12},{x:-2,y:3.6,z:-40,w:18,t:15},{x:36,y:4.2,z:-41,w:13,t:15},{x:98,y:5.6,z:-33,w:18,t:16},{x:120,y:6.6,z:-36,w:15,t:18}].filter(site=>site.x<finish+20);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:8,thickness:site.t,preset:i%2?masonry:limestone,seed:1200+i,quality:low?'low':'standard',lush:true});
  const ruins=new Builder(.8);
  forumColonnade(ruins,17.5,1.2,-20.5,4,2.4,5.2,30);forumColonnade(ruins,80,1.8,-21.5,3,2.4,4.6,40);
  for(const [x,y,z,broken] of [[-9,-1.2,-9.5,.55],[-3,-1.2,-12.5,.8],[42,-.6,-13,.45],[47,-.6,-15.5,1],[101,-.4,-10.5,.6],[108,-.4,-13,.35],[123,1,-15,.7]] as const)if(x<finish+20)column(ruins,[x,y,z],4.2,.3,'#e2d4b5',{broken,seed:x*3});
  const houses=new Builder();
  for(const [x,y,z,w,h,rot] of [[-12,-1.2,-13.5,3,2.6,.2],[25.5,1.2,-21,3.4,3,-.1],[87,1.8,-22,3.6,2.8,.15],[129,1,-19,3.2,2.6,-.2],[132,1,-15.5,2.4,2,.3]] as const)if(x<finish+20)stuccoHouse(houses,[x,y,z],[w,h,2.8],{wall:'#e5c497',roof:'#b85e3a',shutter:'#56724a',trim:'#f1e2c5'},rot,x);
  ruins.mesh(features,vertexMaterial(.9),'forum-ruins-and-columns');houses.mesh(features,vertexMaterial(.92),'terracotta-houses');
  // Columns flanking the sliding slab rise from the valley floor.
  const slab=context.level.platforms.find(p=>p.style==='slab'),flank=new Builder(.8);
  if(slab){for(const x of [slab.x-slab.amplitude-.9,slab.x+slab.width+slab.amplitude+.9])column(flank,[x,-10.4,-1.25],slab.y+10.4+2.4,.42,'#e8dbbf',{seed:x,capital:'#dccaa6'});}
  flank.mesh(features,vertexMaterial(.85),'slab-flanking-columns');
  // Cypress, stone pines and olives grow on the terraces and valley shoulders.
  const tree=random(55),cypress:{x:number;y:number;z:number;scale:number}[]=[],pines:typeof cypress=[],olives:typeof cypress=[];
  for(const site of sites){for(let i=0;i<(low?2:4);i++)cypress.push({x:site.x+(tree()-.5)*site.w*.8,y:site.y,z:site.z-1.5-tree()*2.5,scale:.8+tree()*.5});if(tree()<.8)pines.push({x:site.x+(tree()-.5)*site.w*.6,y:site.y,z:site.z-.8,scale:.85+tree()*.3});olives.push({x:site.x+(tree()-.5)*site.w*.7,y:site.y,z:site.z+1.5,scale:.9+tree()*.4});}
  for(let i=0;i<(low?24:70);i++){const x=-30+tree()*(finish+60),z=-26-tree()*34;cypress.push({x,y:-10.4+rollingHills(77,5,4)(.5+(x-finish/2)/(finish+220),.5+(z+48)/120),z,scale:1.2+tree()*.9});}
  plantGrove(staticRoot,'cypress',cypress.map(p=>({...p,rotation:tree()*6,color:new T.Color('#ffffff').multiplyScalar(.85+tree()*.25)})),{low,name:'italian-cypress-grove'});
  plantGrove(staticRoot,'stone-pine',pines.map(p=>({...p,rotation:tree()*6})),{low,name:'stone-pine-grove'});
  for(let i=0;i<(low?12:36);i++){const x=-30+tree()*(finish+60),z=-24-tree()*40;pines.push({x,y:-10.4+rollingHills(77,5,4)(.5+(x-finish/2)/(finish+220),.5+(z+48)/120),z,scale:1.1+tree()*.6});olives.push({x:x+3,y:-10.3,z:z+4,scale:1.4+tree()*.5});}
  plantGrove(staticRoot,'olive',olives.map(p=>({...p,rotation:tree()*6})),{low,name:'olive-grove'});
  // Low foreground limestone corners stay below the walking lane.
  const foreground=new T.Group();foreground.name='italy-low-foreground';root.add(foreground);
  for(const [x,y] of [[-5,-5],[58,-6.8],[118,-5.6]] as const)if(x<finish+10)createScenicTerrace(foreground,{x,y,z:5,width:8,depth:4.5,thickness:8,preset:limestone,seed:3000+x,quality:'low'});
  batchStatic(staticRoot);batchStatic(foreground);
  const birds=createFlock(root,{count:low?6:12,centre:[finish*.45,15,-30],radius:[finish*.35,3,10],speed:.05,size:1.1,color:'#3b3a3f',seed:12,glide:true,name:'swallows'});
  const leaves=createDrift(root,{kind:'leaf',count:low?14:36,colors:['#8e9c62','#a3a06a','#7a8f55'],x:[-6,finish+10],y:[-1,7],z:[-6,2.5],fall:.35,sway:.8,size:.16,seed:5,name:'drifting-olive-leaves'});leaves.setVisible(!reduced);
  root.userData.composition={colosseum:[64,-3,-62],aqueduct:true,terraces:sites.length};
  let disposed=false;
  return{root,
   update(time){if(disposed)return;const motion=reduced?0:time;channel.update(motion);birds.update(motion);leaves.update(motion);},
   frame(cameraX){sky.follow(cameraX);colosseum.position.x=64+(cameraX-60)*.28;},
   setReducedMotion(value){reduced=value;leaves.setVisible(!value);},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?140:60;fog.far=view==='overview'?380:230;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low;
  const surface={set:'paris-stone' as const,tint:'#fff8ec',repeat:.45};
  if(definition.type==='bridge'){dressDeck(root,definition,'roman-arch',deck,{below:7,surface});return;}
  if(definition.motion){dressDeck(root,definition,definition.style==='slab'?'slab':'masonry-lift',deck,{surface});return;}
  dressTerrain(root,definition,definition.route==='upper'?masonry:limestone,{quality:low?'low':'standard',lush:definition.id==='it-start'||definition.id==='it-finish'});
  // Platform props stay behind the walking corridor (z <= -0.9).
  const props=new Builder(),w=definition.width;
  if(definition.id==='it-start'){column(props,[.6,0,-1.2],4.4,.3,'#e8dcc0',{seed:3});const arch=createArchway(root,{style:'roman',width:2.2,height:2.6,stone:'#dccdaf',trim:'#c4b190'});arch.position.set(-4.4,0,-1.2);arch.scale.setScalar(.8);plantGrove(root,'cypress',[{x:3.6,y:0,z:-1.35,scale:.62},{x:5.8,y:0,z:-1.3,scale:.5}],{low});plantGrove(root,'olive',[{x:-1.8,y:0,z:-1.25,scale:.7}],{low});}
  if(definition.id==='it-up-4')column(props,[1.8,0,-1.05],3.8,.28,'#ece2c8',{broken:.75,seed:9});
  if(definition.id==='it-f2'){const alcove=createArchway(root,{style:'roman',width:2.2,height:2.2,stone:'#d8c8a7',trim:'#c2ae8a'});alcove.position.set(3-w/2,0,-1.3);alcove.scale.setScalar(.85);}
  if(definition.id==='it-g-island'||definition.id==='it-e1')column(props,[w/2-1.2,0,-1.2],3.4,.26,'#e2d4b6',{broken:.5,seed:w});
  if(definition.id==='it-finish'){plantGrove(root,'cypress',[{x:w/2-1.5,y:0,z:-1.3,scale:.7},{x:-w/2+1.4,y:0,z:-1.35,scale:.6}],{low});plantGrove(root,'stone-pine',[{x:w/2-3.8,y:0,z:-1.4,scale:.45}],{low});}
  if(props.parts.length)props.mesh(root,vertexMaterial(.85),'platform-roman-props');
 },
 createEnemy:createSentry,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'marble',color:'#f1ebe0',trim:'#a7743a',glyph:'#f2c14e'}),
 decorateCheckpoint(marker){const b=new Builder();column(b,[.55,0,-.35],2.6,.17,'#e6d9bd',{seed:5});b.mesh(marker,vertexMaterial(.85),'checkpoint-column');const banner=createBannerPost(marker,{pole:'#7b5a39',cloth:'#a8322c',accent:'#e0b24a',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'roman',width:3.2,height:3.4,stone:'#e1d3b4',trim:'#c8b38f'});arch.position.set(0,0,-1.55);},
};
