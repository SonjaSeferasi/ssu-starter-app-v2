import * as T from 'three';
import {Builder,matte,pixelTexture,random,scatter,standard,valueNoise,fbm,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {windBanners} from '../kit/wind';
import {createCascade} from '../kit/cascade';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {LevelDefinition,PlatformDefinition} from '../../../lib/world-explorer/game-types';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';
import {plantFlora} from './south-america/flora';

/** Venezuela — Angel Falls: The Auyán-tepui Descent. A fictional descent
 * inspired by Auyán-tepui in Canaima National Park. The route is a stair of
 * ledges on a tepui escarpment: the cliff falls away beneath the player into a
 * valley full of cloud and rainforest, Angel Falls pours from the rim of a
 * neighbouring spur and breaks into spray, and more tepuis stand behind. */
const info={
 id:'venezuela-auyan-tepui',title:'Angel Falls: The Auyán-tepui Descent',
 license:'Original procedural geometry; CC0 Poly Haven sandstone surface maps (see materials/LICENSES.md).',
 representation:'A fictional descent inspired by Auyán-tepui and Angel Falls (Kerepakupai Merú) in Canaima National Park. The escarpment, the falls and distances are stylized; the climb-back faces are game elements.',
 landmarkSource:'https://whc.unesco.org/en/list/701/',
 assets:['angel-falls','auyan-tepui-plateau','tepui-escarpment','canaima-rainforest','neighbouring-tepuis','tepui-bromeliads','cloud-sea','swifts','falls-spray','escarpment-banners'],
};
/** Tepui rock: weathered black quartzite skin over pink-orange sandstone. */
const quartzite:LandmassPalette={top:'#4a4a3a',topAlt:'#5f7a42',edge:'#9a7a6a',face:'#7a5652',faceDark:'#4e3c38',band:'#b07a62',maps:{set:'sandstone-cliff',tint:'#d9b8a8',repeat:.55},rough:.3,strata:.42};
const summitRock:LandmassPalette={...quartzite,top:'#5a5a42',topAlt:'#6f8a4a'};
const wetRock:LandmassPalette={...quartzite,top:'#3a3c3a',topAlt:'#4a6a4a',face:'#5a4c4c',faceDark:'#3e3434'};
const lookout:LandmassPalette={...quartzite,top:'#5f8a3f',topAlt:'#7aa04a'};

/** The height of the route at x, read from the main-route platforms. */
function routeHeight(level:LevelDefinition){
 const main=level.platforms.filter(p=>p.route!=='upper').sort((a,b)=>a.x-b.x);
 return(x:number)=>{let best=main[0];for(const p of main){if(x>=p.x-1&&x<=p.x+p.width+1)return p.y+(p.slope||0)*.5;if(Math.abs(p.x+p.width/2-x)<Math.abs(best.x+best.width/2-x))best=p;}return best.y;};
}
/** A flat-topped tepui: fluted vertical walls with orange and pink streaks and
 * green ledges, a summit plateau and a skirt of talus and forest at its foot. */
function tepui(parent:T.Object3D,name:string,o:{x:number;z:number;width:number;depth:number;top:number;bottom:number;seed:number;low:boolean}){
 const root=new T.Group();root.name=name;root.position.set(o.x,0,o.z);parent.add(root);const r=random(o.seed);
 const segments=o.low?32:96,rows=o.low?12:30,positions:number[]=[],colors:number[]=[],indices:number[]=[],height=o.top-o.bottom;
 const dark=new T.Color('#2e2826'),rust=new T.Color('#a8654a'),pink=new T.Color('#b88878'),green=new T.Color('#4f6a3a'),lichen=new T.Color('#8f8c84'),stain=new T.Color('#1c1818');
 // The rim: mostly level, with notches and a few collapsed sections.
 const rimDrop=(a:number)=>Math.max(0,fbm(Math.cos(a)*2.2+5,Math.sin(a)*2.2,o.seed+7,3)-.58)*height*.22+Math.max(0,Math.sin(a*11+o.seed)-.86)*2.4;
 // A wall ring around an irregular rounded outline, from the summit down:
 // fine flutes, deep vertical joints, recessed bedding planes and a talus skirt.
 for(let j=0;j<=rows;j++){const t=j/rows;for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;
  const flute=(Math.pow(Math.abs(Math.sin(a*19+fbm(a*2,t,o.seed,2)*2.5)),.6)-.6)*.035+fbm(a*3,t*2,o.seed,3)*.12;
  const joint=-Math.pow(Math.max(0,Math.sin(a*7+o.seed+fbm(a,t*3,o.seed+2,2)*.8)-.9)*10,2)*.05,bed=Math.abs(Math.sin(t*height*.42))<.12?-.012:0;
  const skirt=1+Math.pow(t,3)*(.3+fbm(a*2,1,o.seed+3,2)*.35),radius=(1+flute+joint+bed)*skirt,drop=rimDrop(a)*(1-Math.min(1,t*5));
  const x=Math.cos(a)*o.width/2*radius,z=Math.sin(a)*o.depth/2*radius,y=o.top-height*t-drop;positions.push(x,y,z);
  const streak=fbm(a*9,t*3,o.seed+4,3),runoff=fbm(a*26,t*.7,o.seed+6,2),ledge=bed<0||Math.abs(Math.sin(t*14+a))<.08;
  const c=dark.clone().lerp(streak>.55?rust:pink,Math.max(0,streak-.35)*1.2);if(runoff>.62)c.lerp(stain,.3);else if(runoff<.3)c.lerp(lichen,.35);
  c.multiplyScalar(1-Math.min(.22,-joint*2.2));if(ledge)c.lerp(green,.45);if(t>.82)c.lerp(green,(t-.82)*3.5);colors.push(c.r,c.g,c.b);}}
 for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+1,c=a+segments+1;indices.push(a,b,c,b,c+1,c);}
 const top=positions.length/3;positions.push(0,o.top+.4,0);colors.push(.3,.36,.24);for(let i=0;i<segments;i++)indices.push(top,i+1,i);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 const mesh=new T.Mesh(g,vertexMaterial(.95));mesh.name=name+'-walls';mesh.receiveShadow=true;root.add(mesh);
 const shrubs:Placement[]=[];for(let i=0;i<(o.low?16:48);i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*.9;shrubs.push({x:Math.cos(a)*o.width/2*d,y:o.top+.2,z:Math.sin(a)*o.depth/2*d,scale:.9+r()*.8});}
 plantFlora(root,'tepui-shrub',shrubs,{low:true,name:name+'-summit-scrub'});
 return root;
}
/** The escarpment the route descends: a fluted cliff band that falls from just
 * below each ledge to the valley floor, set back behind the lane so the sky
 * and the far landscape stay open above the player. */
function escarpment(parent:T.Object3D,level:LevelDefinition,finish:number,low:boolean){
 const height=routeHeight(level),x0=-24,x1=finish+30,cols=low?110:240,rows=low?18:36,floor=-46,positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const rock=new T.Color('#3a302e'),rust=new T.Color('#9a5a44'),pink=new T.Color('#a87a6c'),moss=new T.Color('#4f6f3a'),lichen=new T.Color('#8a877e'),stain=new T.Color('#1c1818'),scree=new T.Color('#7a6a5e');
 const smoothHeight=(x:number)=>{let s=0;for(let k=-3;k<=3;k++)s+=height(x+k*1.2);return s/7;};
 for(let j=0;j<=rows;j++){const t=j/rows;for(let i=0;i<=cols;i++){
  // The rim only ever drops below the route: notches and collapsed sections.
  const x=x0+(x1-x0)*i/cols,collapse=Math.max(0,fbm(x*.06,4,13,3)-.6)*14+Math.max(0,Math.sin(x*.9+fbm(x*.3,0,6,2)*3)-.8)*3,rim=smoothHeight(x)-3.4-collapse*(1-Math.min(1,t*4)),y=rim+(floor-rim)*Math.pow(t,.85);
  const buttress=Math.max(0,fbm(x*.11,2,17,2)-.55)*5,joint=Math.max(0,Math.sin(x*.47+fbm(x*.15,0,19,2)*4)-.9)*14,bed=Math.abs(Math.sin(y*.55+fbm(x*.1,0,2,2)*2))<.1;
  const flute=Math.sin(x*2.6+fbm(x*.2,t,3,2)*4)*.35+Math.sin(x*7.3+fbm(x*.6,t*2,21,2)*3)*.12+fbm(x*.5,y*.15,9,3)*1.6,talus=Math.pow(Math.max(0,(t-.78)/.22),1.5)*7;
  const z=-6.8-flute-Math.pow(t,1.6)*6-valueNoise(x*.08,1,5)*3+buttress*Math.min(1,t*6)-joint-(bed?.45:0)+talus;
  positions.push(x,y,z);
  const streak=fbm(x*.9,y*.08,11,3),runoff=fbm(x*2.4,y*.02,23,2),c=rock.clone().lerp(streak>.52?rust:pink,Math.max(0,streak-.38)*1.1);
  if(runoff>.64)c.lerp(stain,.28);else if(runoff<.28)c.lerp(lichen,.3);
  // Joints shade in proportion to their depth, never to black, so a close
  // view (following a fall) shows clefts rather than hard dark shards.
  c.multiplyScalar(1-Math.min(.25,joint*.12));
  if(bed||t<.03)c.lerp(moss,.55);if(talus>0)c.lerp(scree,Math.min(.7,talus*.12));if(t>.88)c.lerp(moss,(t-.88)*4);colors.push(c.r,c.g,c.b);
 }}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1;indices.push(a,c,b,b,c,c+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 const mesh=new T.Mesh(g,vertexMaterial(.95));mesh.name='tepui-escarpment';mesh.receiveShadow=false;parent.add(mesh);
 // The summit plateau behind the start, so the route begins on a real tabletop.
 const summit=level.platforms.find(p=>p.id==='ve-summit')!;
 createHeightfield(parent,{name:'auyan-tepui-plateau',x:summit.x+summit.width/2-6,y:summit.y-.6,z:-16,width:summit.width+30,depth:26,segments:[low?20:44,low?10:22],height:(u,v)=>valueNoise(u*12,v*10,4)*.7*Math.min(1,v*3)+(u>.78?-(u-.78)*30:0),color:(h,s)=>new T.Color(s>.5?'#3a302e':h>.3?'#5f6a42':'#4a4a3a').multiplyScalar(.9+valueNoise(h*3,s*4,2)*.25)});
 return mesh;
}
/** Orographic cloud caught on tepui rims and wrapped around their walls:
 * soft puffs in one instanced draw, drifting slowly. */
function rimClouds(parent:T.Object3D,tepuis:{x:number;z:number;width:number;depth:number;top:number}[],seed:number,low:boolean){
 const r=random(seed),placements:Placement[]=[],count=low?5:12;
 for(const t of tepuis){const start=r()*Math.PI*2,arc=1.4+r()*1.6;
  for(let i=0;i<count;i++){const a=start+arc*i/count+(r()-.5)*.3,rad=.92+r()*.2;placements.push({x:t.x+Math.cos(a)*t.width/2*rad,y:t.top-.8+r()*1.4,z:t.z+Math.sin(a)*t.depth/2*rad,scale:[7+r()*6,.8+r()*.7,4+r()*3],rotation:r()*6});}
  for(let i=0;i<(low?2:5);i++){const a=start+arc+.4+r()*1.6;placements.push({x:t.x+Math.cos(a)*t.width/2*1.05,y:t.top*.35+r()*8,z:t.z+Math.sin(a)*t.depth/2*1.05,scale:[10+r()*8,1.1+r()*.8,5+r()*3],rotation:r()*6});}}
 const material=new T.MeshStandardMaterial({color:'#f6f7f8',emissive:'#c8d0d8',emissiveIntensity:.25,roughness:1,transparent:true,opacity:.72,depthWrite:false,flatShading:false});
 const puffs=scatter(parent,new T.IcosahedronGeometry(1,low?1:2),material,placements,'tepui-rim-clouds');puffs.castShadow=puffs.receiveShadow=false;
 return{update:(time:number)=>{puffs.position.x=Math.sin(time*.04)*2.2;puffs.position.y=Math.sin(time*.07)*.4;}};
}
/** The cloud sea filling the valley: three soft, slowly drifting layers. */
function cloudSea(parent:T.Object3D,finish:number,low:boolean){
 const n=(u:number,v:number)=>fbm(u*5,v*5,41,4),tile=(u:number,v:number)=>n(u,v)*(1-u)*(1-v)+n(u-1,v)*u*(1-v)+n(u,v-1)*(1-u)*v+n(u-1,v-1)*u*v;
 const texture=pixelTexture(low?64:128,(u,v)=>{const a=Math.min(1,Math.max(0,(tile(u,v)-.4)/.22));return[246,248,250,a*255];});
 const group=new T.Group();group.name='cloud-sea-layers';parent.add(group);
 const layers=([[-17,.5,1.6],[-25,.72,1.1],[-34,.9,.8]] as const).map(([y,opacity,repeat],i)=>{const map=texture.clone();map.repeat.set(repeat*(finish+500)/120,repeat*1.2);map.needsUpdate=true;
  const mesh=new T.Mesh(new T.PlaneGeometry(finish+500,150).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map,transparent:true,opacity,depthWrite:false,color:i?'#eef2f6':'#ffffff'}));mesh.position.set(finish/2,y,-84);mesh.name='cloud-sea-layer-'+i;group.add(mesh);return map;});
 return{group,update:(time:number)=>layers.forEach((map,i)=>{map.offset.x=time*(.004+i*.002);map.offset.y=Math.sin(time*.02+i)*.02;})};
}
/** Hand-holds, roots and moss pads on a climbable face, so it reads as climbable. */
function climbHolds(parent:T.Object3D,definition:PlatformDefinition,seed:number){
 const r=random(seed),b=new Builder(),x=-definition.width/2-.05;
 for(let y=-.4;y>-3.6;y-=.5)for(const z of [-.7,0,.7]){if(r()<.25)continue;b.add(new T.BoxGeometry(.16,.12,.36),r()<.5?'#6a5a4a':'#5f8a3f',[x,y+(r()-.5)*.2,z+(r()-.5)*.3],[0,0,(r()-.5)*.4]);}
 for(const z of [-1,.9])b.add(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(x,-.05,z),new T.Vector3(x-.1,-1.6,z+.2),new T.Vector3(x-.04,-3.4,z-.1)]),12,.04,5,false),'#4a6b34');
 b.mesh(parent,vertexMaterial(.85),'climb-holds');
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#9cbcd4',exposure:1.02,sun:'#ffe8c8',sunIntensity:3.1,sky:'#e2ecf4',ground:'#3a4a30',hemisphere:1.3,rim:'#ffd9b8',rimIntensity:.6,pixelRatio:1.25,fog:['#c8d8e2',60,260],reflections:{zenith:'#4f86bf',horizon:'#e2eaee',ground:'#2a3324',intensity:.3}},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'venezuela-tepui-environment',background:'#9cbcd4',fog:['#c6d6e0',70,300],overviewFog:[200,520],sky:{zenith:'#3f78b8',horizon:'#e6eef2',band:'#cfdde6',glow:'#fff2dc',sun:[.5,.35,-.8],glowPower:14},clouds:{opacity:.92,high:[24,40],lowBand:[-14,-4],depth:[-40,-120],groups:30,shade:'#c4d0dc'},layers:['playable-escarpment-ledges','tepui-escarpment','angel-falls','auyan-tepui-plateau','cloud-sea','canaima-rainforest','neighbouring-tepuis','sky']});
  const {root,staticRoot,features}=shell,r=random(701);
  escarpment(features,level,finish,low);
  // Angel Falls: a tall ribbon from the rim of the Auyán-tepui spur, breaking
  // into spray, landing in a pool that feeds the river in the gorge.
  const falls=new T.Group();falls.name='angel-falls';features.add(falls);
  const fx=104,fz=-66,ftop=28,fbottom=-44;
  tepui(falls,'auyan-tepui-spur',{x:fx+4,z:fz-22,width:56,depth:42,top:ftop,bottom:-46,seed:31,low});
  const cascade=createCascade(falls,{sites:[{x:fx,top:ftop,bottom:fbottom,z:fz,width:4.6,channel:18,channelDirection:-1,spray:.42,lean:1.4,intensity:1}],low,tint:'#d9ecf2',name:'angel-falls-water'});
  const pool=createWaterSurface(falls,{x:fx,y:fbottom,z:fz+6,width:30,depth:14,shallow:'#7a6a4a',deep:'#3f3524',segments:12,name:'kerep-plunge-pool',flow:[.01,.03],repeat:.15});
  // Neighbouring tepuis on the horizon, with cloud caught on their rims.
  for(const [i,[x,z,w,d,top]] of ([[-30,-150,70,40,34],[60,-190,90,50,40],[180,-160,80,45,30],[260,-210,100,60,44]] as const).entries())tepui(features,`neighbouring-tepui-${i}`,{x,z,width:w,depth:d,top,bottom:-46,seed:50+i,low});
  // The valley floor: rainforest canopy and a river far below the route.
  const forest=new T.Group();forest.name='canaima-rainforest';features.add(forest);
  createHeightfield(forest,{name:'canaima-lowland',x:finish/2,y:-47,z:-60,width:finish+420,depth:140,segments:[low?50:110,low?24:44],height:(u,v)=>valueNoise(u*60,v*40,6)*2.5+valueNoise(u*14,v*10,3)*3,color:gradientColor([[0,'#2a5a2a'],[2.5,'#3f6a35'],[5,'#4f7a3a']])});
  createWaterSurface(forest,{x:finish/2,y:-45.5,z:-30,width:finish+300,depth:7,shallow:'#8a6a45',deep:'#4a3a22',segments:24,name:'carrao-river',flow:[.04,0],repeat:.1});
  const crowns:Placement[]=[];for(let i=0;i<(low?30:80);i++)crowns.push({x:-30+r()*(finish+70),y:-47+r()*2,z:-14-r()*60,scale:.9+r()*.5,rotation:r()*6});
  plantFlora(forest,'emergent',crowns,{low:true,name:'lowland-emergents'});
  // Summit vegetation and bromeliads on the ledges, kept out of the lane.
  const shrubs:Placement[]=[],brom:Placement[]=[];
  for(const p of level.platforms){if(p.motion)continue;for(const s of rearSpots(p,Math.max(1,Math.ceil(p.width/2.5)),p.id.length*7)){const spot={x:p.x+p.width/2+s.x,y:p.y+(p.slope||0)*.5,z:Math.min(-1.1,s.z),scale:.7+s.r*.5,rotation:s.r*6};(s.r<.5?shrubs:brom).push(spot);}}
  plantFlora(staticRoot,'tepui-shrub',shrubs,{low,name:'tepui-shrubs'});
  const bromeliads=plantFlora(root,'tepui-bromeliad',brom,{low,name:'tepui-bromeliads',sway:.03});
  const curtains:Placement[]=[];for(const p of level.platforms.filter(p=>!p.motion&&p.thickness>2))curtains.push({x:p.x+p.width*(.3+r()*.4),y:p.y-.2,z:Math.max(-2.6,p.depth/2-.6),scale:.8+r()*.4,rotation:r()*.4});
  const lianas=plantFlora(root,'liana-curtain',curtains,{low,name:'hanging-roots',sway:.04});
  const zone=level.zones?.[0],pillar=level.platforms.find(p=>p.id==='ve-pillar-1')!,banners=windBanners(root,[[pillar.x-3.2,10.2,-1.7],[pillar.x+11,8.4,-1.7]],['#ffcc00','#cf142b']);
  const swifts=createFlock(root,{count:low?6:14,centre:[fx-10,0,fz+20],radius:[30,12,8],speed:.13,size:.45,color:'#222',wing:'#333',seed:9,name:'swifts'});
  const capped=rimClouds(features,[{x:fx+4,z:fz-22,width:56,depth:42,top:ftop},...([[-30,-150,70,40,34],[60,-190,90,50,40],[180,-160,80,45,30],[260,-210,100,60,44]] as const).map(([x,z,width,depth,top])=>({x,z,width,depth,top}))],88,low),sea=cloudSea(features,finish,low);
  const mist=createDrift(root,{kind:'mist',count:low?14:36,colors:['#f6f8fa'],x:[-20,finish+20],y:[-30,-4],z:[-40,-6],fall:-.02,sway:3,size:4.5,seed:5,name:'cloud-sea'});
  shell.animate({update:(t,signals)=>{cascade.update(t);pool.update(t);capped.update(t);sea.update(t);swifts.update(t);bromeliads.update(t);lianas.update(t);const wind=signals?.wind.find(w=>w.id===zone?.id);banners.update(t,wind?.phase==='gust'?wind.strength:0,wind?.phase==='warning');}});
  shell.animate({update:t=>mist.update(t),setVisible:v=>mist.setVisible(v),motion:true});
  void scatter;void standard;
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*43+Math.round(definition.x);
  // Ledges cling to the escarpment (shelves); free-standing pillars and the
  // crumbling blocks are spires and slabs with eroded undersides.
  const spire=style==='sandstone-pillar',slab=definition.thickness<2;
  const palette=style==='canaima-lookout'?lookout:style==='tepui-summit'||style==='tepui-terrace'?summitRock:definition.surface==='ice'?wetRock:quartzite;
  const profile=spire||slab||style==='spray-rock'||style==='sandstone-crag'?'island':'shelf';
  const visualDepth=spire?8.4:slab?1.6:style==='spray-rock'?2.6:definition.climbable?4.6:style==='tepui-summit'?3:3.6;
  const details=dressLandmass(root,definition,palette,{low,kind:definition.thickness<2?'block':'cliff',profile,visualDepth});
  if(definition.climbable)climbHolds(details,definition,seed);
  if(definition.collapse)built(details,'fracture-lines',(b,rr)=>{for(let i=0;i<3;i++)b.add(new T.BoxGeometry(.04,.02,1.2+rr()*.6),'#1f1a1a',[-w/2+.4+rr()*(w-.8),.012,(rr()-.5)*.8],[0,rr()*2,0]);},seed);
  if(definition.surface==='ice')built(details,'spray-sheen',(b,rr)=>{for(let i=0;i<3;i++)b.add(new T.BoxGeometry(.6,.01,.9),'#cfe2e8',[-w/2+.4+rr()*(w-.8),.02,(rr()-.5)*1]);},seed,.05);
  if(style==='tepui-summit')built(details,'summit-pools',(b,rr)=>{for(let i=0;i<4;i++)b.add(new T.CylinderGeometry(.5+rr()*.4,.5,.03,12),'#3a2a1f',[-w/2+1.5+rr()*(w-3),.005,-1.5-rr()*1.2]);},seed,.05);
 },
 createEnemy:parent=>roundCreature(parent,{name:'venezuela-tepui-toad',height:.7,shell:'#2a2424',belly:'#d9b48a',foot:'#1a1414',eye:'#e6c34a',crest:(_rig,b)=>{for(let i=0;i<5;i++){const wart=new T.Mesh(new T.SphereGeometry(.04,6,4),matte('#3a3434'));wart.position.set(-.15+i*.08,.62,-.05);b.add(wart);}}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:'#5a4a48',trim:'#ffcc00',glyph:'#ffcc00'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#3a3434',cloth:'#ffcc00',accent:'#00247d',height:2.1,cap:'#cf142b'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'jungle',width:3.4,height:3.4,stone:'#4a3a32',trim:'#5f8a3f'});arch.position.set(0,0,-1.55);},
};
