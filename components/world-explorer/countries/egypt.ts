import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,standard,valueNoise,vertexMaterial} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield,duneHeight,gradientColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps,markSurface} from '../kit/surface-maps';
import {windBanners} from '../kit/wind';
import {clearPlatformRoot,dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';

/** Egypt — Giza Plateau: The Sun Gate. A fictional plateau course; the
 * pyramids and Sphinx are stylized landmark studies, not measured models. */
const info={
 id:'egypt-giza-desert',title:'Giza Plateau: The Sun Gate',
 license:'Original procedural geometry; CC0 Poly Haven sandstone surface maps (see materials/LICENSES.md).',
 representation:'A fictional desert platform course inspired by the Giza plateau. Pyramid proportions and the Sphinx are simplified studies; the route, columns and oasis are not a map of the site.',
 landmarkSource:'https://whc.unesco.org/en/list/86/',
 assets:['great-pyramid-weathered-courses','pyramid-of-khafre-with-casing-cap','pyramid-of-menkaure','queens-pyramids','great-sphinx','papyrus-columns','obelisk','date-palm-oasis','dune-field','sand-gust-streams'],
};
const sandstone:TerrainPreset={id:'giza-sandstone',shape:'rock',rock:{light:'#e8c58f',dark:'#b98955',crack:'#6e4a2c',top:'#e9cc93',topDepth:.12,strata:1,taper:.9},cap:{kind:'sand',a:'#e3c38a',b:'#d7b073',c:'#b48a57'},rim:{kind:'ridge',color:'#e6c78f',alt:'#d9b67b',size:1.2},blades:{color:'#a59b55',alt:'#8f8a4d',density:.12,height:.9},pebbles:'#c49a64',maps:{set:'sandstone-cliff',tint:'#fff1dc',repeat:.6}};
const eroded:TerrainPreset={...sandstone,id:'giza-eroded-rock',rock:{...sandstone.rock,taper:1.25,topDepth:.08},blades:undefined,rim:{kind:'ridge',color:'#e6c78f',alt:'#d9b67b',size:.8}};
const deck:DeckPalette={wood:'#8a6444',woodAlt:'#9b7350',rope:'#c8b48a',stone:'#e6c99a',stoneAlt:'#d7b47e',metal:'#6d5a3e',accent:'#d9a93c'};
const stoneSurface={set:'sandstone-blocks' as const,tint:'#fff4e2',repeat:.5};
/** Playable terrain: wind-blown sand over layered sandstone, eroded hoodoo
 * pillars in the canyon, and cut masonry for stairs, paving and the dais. */
const plateau:LandmassPalette={top:'#e6c48c',topAlt:'#d6a96a',edge:'#f4e2c0',face:'#fbe9cf',faceDark:'#d9b48a',band:'#efd2a8',maps:{set:'limestone',tint:'#f7dfba',repeat:.3},rough:.18,strata:1};
const hoodoo:LandmassPalette={...plateau,top:'#e3c088',face:'#f6dcb6',faceDark:'#c99c6c',band:'#e4c08e',rough:.32,strata:.62};
const masonry:LandmassPalette={top:'#e4cb9c',topAlt:'#cdb07c',edge:'#efdcb4',face:'#d8b47e',faceDark:'#a98353',band:'#c49a64',maps:{set:'sandstone-blocks',tint:'#fff4e2',repeat:.4},capMaps:{set:'sandstone-blocks',tint:'#fff6e8',repeat:.5},rough:.04,strata:.8};

/** A true pyramid (base:height about 1.57, as at Giza) built from slightly
 * stepped bands so the weathered courses read at a distance; `casing` keeps
 * the smooth pale limestone cap that survives on Khafre's pyramid. */
function pyramid(b:Builder,x:number,y:number,z:number,base:number,height:number,casing=0,low=false){
 const rows=low?7:Math.max(9,Math.round(height/1.4)),radius=base/Math.SQRT2;
 for(let i=0;i<rows;i++){
  const t0=i/rows,t1=(i+1)/rows,cased=casing>0&&t0>=1-casing-1e-6,g=new T.CylinderGeometry(radius*(1-t1),radius*(1-t0)*(cased?1:1.012),height/rows,4,1);g.rotateY(Math.PI/4);
  b.add(g,cased?'#ecdcb8':i%2?'#d6b07a':'#caa36c',[x,y+height*(t0+t1)/2,z],[0,0,0],[1,1,1],cased?.01:.05);
 }
}
/** Stylized Great Sphinx: a recumbent lion in side profile with forward paws
 * and a royal headdress, carved from layered rock in a quarried enclosure. */
function createSphinx(parent:T.Object3D){
 const root=new T.Group();root.name='great-sphinx';root.userData.landmark='Great Sphinx of Giza';parent.add(root);
 const b=new Builder(.3),rock='#d6b27c',dark='#b38d5c',light='#e2c38f';
 const profile=new T.Shape();profile.moveTo(-8,0);profile.lineTo(-8.2,1.4);profile.quadraticCurveTo(-8,2.6,-6.6,2.9);profile.quadraticCurveTo(-4,2.6,-1.5,2.7);profile.quadraticCurveTo(1.5,2.9,2.6,3.4);profile.lineTo(3.4,4.4);profile.lineTo(4.6,4.2);profile.quadraticCurveTo(4.8,2.6,4.6,1.4);profile.lineTo(4.4,0);profile.closePath();
 const body=new T.ExtrudeGeometry(profile,{depth:3.2,bevelEnabled:true,bevelThickness:.35,bevelSize:.3,bevelSegments:3,curveSegments:10});body.translate(0,0,-1.6);b.add(body,rock,[0,0,0],[0,0,0],[1,1,1],.04);
 for(const side of [-1,1]){b.add(new T.BoxGeometry(5.2,.95,1),dark,[6.6,.48,side*1.05],[0,0,0],[1,1,1],.05);b.add(new T.SphereGeometry(.56,12,8),dark,[9.2,.5,side*1.05],[0,0,0],[1,.85,1]);b.add(new T.BoxGeometry(1.2,2.4,1),rock,[4.4,1.2,side*1.2]);}
 b.add(new T.BoxGeometry(2.2,1.2,1.2),dark,[-7.4,.6,1.7]);
 // Head and headdress: a flared panel framing the face, lappets to the chest.
 const head=new T.BoxGeometry(1.7,2,1.7);b.add(head,light,[4.1,5.3,0]);
 const nemes=new T.Shape();nemes.moveTo(-1.6,-1.6);nemes.lineTo(1.6,-1.6);nemes.lineTo(1.05,1.2);nemes.quadraticCurveTo(0,1.7,-1.05,1.2);nemes.closePath();
 const panel=new T.ExtrudeGeometry(nemes,{depth:1.2,bevelEnabled:false});panel.translate(0,0,-.6);b.add(panel,rock,[3.4,5.4,0],[0,Math.PI/2,0]);
 for(let i=0;i<6;i++)b.add(new T.BoxGeometry(1.25,.07,3.1),dark,[3.4,4.1+i*.42,0],[0,0,0],[1,1,1-i*.08]);
 for(const side of [-1,1])b.add(new T.BoxGeometry(.5,2.2,.42),rock,[4.4,3.9,side*1.15]);
 b.add(new T.BoxGeometry(.5,.6,.35),dark,[5.05,5.1,0]);b.add(new T.BoxGeometry(.2,.9,.5),dark,[4.98,3.95,0]);
 for(const side of [-1,1])b.add(new T.BoxGeometry(.08,.12,.32),'#7a5b3a',[4.97,5.6,side*.38]);
 // Quarried enclosure walls around the monument.
 for(const [x,z,w,d] of [[0,-3.4,22,1],[0,3.6,22,.6],[-11,0,1,7.6]] as const)b.add(new T.BoxGeometry(w,1.4,d),'#c9a571',[x,.7,z],[0,0,0],[1,1,1],.08);
 const material=vertexMaterial(.95);markSurface(material,'limestone','#f4dcb4');b.mesh(root,material,'sphinx-carved-body');
 return root;
}
function papyrusColumn(b:Builder,x:number,y:number,z:number,height:number,color='#dcb784'){
 b.add(new T.CylinderGeometry(.5,.55,.35,14),color,[x,y+.17,z]);b.add(new T.CylinderGeometry(.36,.42,height,12),color,[x,y+.35+height/2,z],[0,0,0],[1,1,1],.04);
 for(let i=0;i<4;i++)b.add(new T.TorusGeometry(.38,.035,5,14),'#b8905b',[x,y+.6+i*.12,z],[Math.PI/2,0,0]);
 b.add(new T.CylinderGeometry(.68,.38,.75,12),color,[x,y+.35+height+.37,z]);b.add(new T.BoxGeometry(1.2,.22,1.2),color,[x,y+height+.85,z]);
 for(let i=0;i<3;i++)b.add(new T.TorusGeometry(.4+i*.08,.025,4,14),i%2?'#2d8f8a':'#c2533e',[x,y+.35+height+.1+i*.15,z],[Math.PI/2,0,0]);
}
function obelisk(b:Builder,x:number,y:number,z:number,height:number){b.add(new T.BoxGeometry(1.4,.5,1.4),'#c9a571',[x,y+.25,z]);const shaft=new T.CylinderGeometry(.38,.6,height,4);shaft.rotateY(Math.PI/4);b.add(shaft,'#d9b884',[x,y+.5+height/2,z]);const tip=new T.ConeGeometry(.45,.7,4);tip.rotateY(Math.PI/4);b.add(tip,'#e6c56a',[x,y+.5+height+.35,z]);}

/** Original stylized scarab: metallic gold shell, turquoise inlay, six legs. */
function createScarab(parent:T.Object3D){
 const legs:T.Group[]=[];
 const rig=createCreatureRig(parent,{name:'egypt-desert-scarab',height:.62,feet:[],footColor:'#3a2b1b',stride:9,turn:1.2,animate(rig,time,state,moving){legs.forEach((leg,i)=>{leg.rotation.x=moving?Math.sin(time*14+i*Math.PI*.66)*.45:0;});rig.body.position.y=moving?Math.abs(Math.sin(time*14))*.012:0;}});
 const gold=standard('#d7a83a',.32,{metalness:.75}),turquoise=standard('#29b3a8',.35,{metalness:.2}),dark=matte('#3a2414'),white=matte('#fbf7ea'),pupil=matte('#1d1a18');
 ellipsoid(rig.body,gold,0,.34,-.05,.32,.24,.42,20);
 const seam=new T.Mesh(new T.BoxGeometry(.025,.05,.82),dark);seam.position.set(0,.57,-.05);rig.body.add(seam);
 for(const side of [-1,1]){const stripe=new T.Mesh(new T.TorusGeometry(.22,.025,6,20,Math.PI*.9),turquoise);stripe.position.set(side*.16,.45,-.1);stripe.rotation.set(Math.PI/2,0,side>0?Math.PI*.05:Math.PI*.95);rig.body.add(stripe);}
 ellipsoid(rig.body,turquoise,0,.3,.32,.24,.16,.12,14);
 ellipsoid(rig.head,dark,0,.3,.46,.17,.13,.12,14);
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*.1,.38,.53,.075,.085,.05,12);ellipsoid(rig.head,pupil,side*.1,.38,.575,.035,.045,.02,10);const horn=new T.Mesh(new T.ConeGeometry(.025,.14,6),gold);horn.position.set(side*.07,.3,.6);horn.rotation.x=1.3;rig.head.add(horn);}
 for(const side of [-1,1])for(let i=0;i<3;i++){const leg=new T.Group();leg.position.set(side*.27,.26,.18-i*.2);rig.figure.add(leg);legs.push(leg);const seg=new T.Mesh(new T.CylinderGeometry(.02,.018,.3,6),dark);seg.position.set(side*.08,-.1,0);seg.rotation.z=side*.9;leg.add(seg);rig.extras[`leg${legs.length}`]=leg;}
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#8cc2ec',exposure:1.02,sun:'#fff0cc',sunIntensity:3.6,sky:'#f1f4ff',ground:'#a7865a',hemisphere:1.15,rim:'#ffe0b0',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#4d8fd8',horizon:'#f3dcae',ground:'#b08a5a',intensity:.3}},
 mechanisms:{stone:'#dcbb86',stoneDark:'#b88f5c',trim:'#2d8f8a',glow:'#f2c14e',metal:'#6d5a3e',maps:{set:'sandstone-blocks',tint:'#fff4e2',repeat:.5}},
 mount(context){
  const {scene,finish,low,level}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='egypt-giza-environment';root.userData={environmentId:info.id,decorative:true,layers:['playable-plateau','desert-floor','temple-ruins','landmarks','dune-field','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#8cc2ec');scene.fog=new T.Fog('#efd8ae',80,300);
  const sky=createSkyDome(root,{zenith:'#2f7fd6',horizon:'#f6e2b8',band:'#f3d29c',glow:'#fff1c8',sun:[-.35,.75,-.55],glowPower:30});
  createCloudBanks(root,{finish,low,seed:51,groups:6,opacity:.6,flat:.45,shade:'#eadfd0',high:[24,34]});
  const staticRoot=new T.Group();staticRoot.name='egypt-static-scenery';root.add(staticRoot);
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  const sand=gradientColor([[-9,'#c99b62'],[-6,'#d8b077'],[-2,'#e3c08a'],[4,'#efd29f']],.06);
  // The desert floor the plateau rises from: below the kill height, so every
  // gap reads as a real drop, rising into dunes behind the course.
  const floorY=-7.6,rippled=(u:number,v:number)=>Math.sin(u*90+Math.sin(v*9)*2)*.18+valueNoise(u*30,v*8,3)*.6+Math.pow(Math.max(0,.45-v),2)*22;
  createHeightfield(features,{name:'giza-desert-floor',x:finish/2,y:floorY,z:-14,width:finish+180,depth:56,segments:[low?70:150,low?16:30],height:rippled,color:sand});
  // Foreground dunes between camera and course hide the plateau's lower cliff;
  // their crest stays below the sight line to the player's feet.
  // Apron: the same sand carried toward the camera for the full-level overview.
  createHeightfield(features,{name:'giza-desert-apron',x:finish/2,y:floorY-.3,z:92,width:finish+300,depth:160,segments:[low?30:60,low?6:12],height:(u,v)=>Math.sin(u*140+Math.sin(v*9)*2.4)*.35+valueNoise(u*24,v*12,5)*.9,color:sand});
  createHeightfield(features,{name:'giza-foreground-dunes',x:finish/2,y:floorY,z:9.5,width:finish+120,depth:9,segments:[low?50:110,10],height:(u,v)=>Math.sin(Math.min(1,v*1.25)*Math.PI)*(4.6+valueNoise(u*24,v*3,8)*1.6),color:sand});
  createHeightfield(features,{name:'giza-near-dunes',x:finish/2,y:-9,z:-70,width:finish+240,depth:80,segments:[low?60:120,low?20:40],height:duneHeight(17,5,7),color:sand});
  createHeightfield(features,{name:'giza-far-dunes',x:finish/2,y:-8,z:-190,width:finish+360,depth:90,segments:[low?50:100,16],height:duneHeight(23,9,5),color:sand});
  createHeightfield(features,{name:'giza-plateau',x:120,y:-6.4,z:-140,width:200,depth:80,segments:[60,20],height:(u,v)=>2.6*Math.min(1,Math.min(u,1-u,v,1-v)*8)+valueNoise(u*8,v*8,4)*.6,color:gradientColor([[0,'#d1a76d'],[2.4,'#dfbc84']])});
  // Giza in its real order: Khufu, Khafre (keeping its limestone casing cap)
  // and Menkaure on a diagonal, queens' pyramids beside them, and the Sphinx
  // in front, composed to rise behind the pyramid overlook at the finish.
  const pyramids=new Builder(.18);
  pyramid(pyramids,158,-4,-122,46,29.2,0,low);pyramid(pyramids,118,-3.4,-150,43,28.4,.2,low);pyramid(pyramids,84,-4,-176,21,13.4,0,low);
  for(const [x,z,s] of [[184,-108,7],[192,-112,6.4],[198,-117,5.8],[70,-170,6],[76,-160,5.5]] as const)pyramid(pyramids,x,-4,z,s,s*.64,0,true);
  const pyramidMaterial=vertexMaterial(.95);markSurface(pyramidMaterial,'sandstone-blocks','#fff3df',.6);const pyramidMesh=pyramids.mesh(features,pyramidMaterial,'giza-pyramids');pyramidMesh.userData.landmark='Pyramids of Giza';pyramidMesh.castShadow=false;
  const pyramidGroup=new T.Group();pyramidGroup.name='pyramids-of-giza';pyramidGroup.add(pyramidMesh);features.add(pyramidGroup);
  // Seen in profile, head toward the approaching player, below the overlook.
  const sphinx=createSphinx(features);sphinx.position.set(finish+18,floorY+.1,-30);sphinx.rotation.y=Math.PI-.35;sphinx.scale.setScalar(2.1);
  // Temple ruins behind the sunken courtyard: a pylon pair framing the Sun Gate
  // and a broken colonnade, with obelisks on the plateau edge.
  const ruins=new Builder(.5),court=level.platforms.find(p=>p.id==='eg-gate-court'),gate=level.gates?.[0];
  if(court&&gate){
   for(const side of [-1,1]){const pylon=new T.CylinderGeometry(2.1,3,8.5,4,1);pylon.rotateY(Math.PI/4);ruins.add(pylon,'#d9b884',[gate.x+gate.width/2+side*4.6,court.y+4.25,-6.4],[0,0,0],[1.35,1,.55],.05);ruins.add(new T.BoxGeometry(4.4,.5,2.2),'#c9a571',[gate.x+gate.width/2+side*4.6,court.y+8.7,-6.4]);}
   ruins.add(new T.BoxGeometry(court.x+court.width+5-74.4,1.5,.8),'#cfab76',[(74.4+court.x+court.width+5)/2,court.y+.75,-3.3],[0,0,0],[1,1,1],.06);
   for(let i=0;i<6;i++)papyrusColumn(ruins,96+i*2.6,1.6,-4.4,i===2?2.2:i===4?3:4.6);
  }
  obelisk(ruins,20,0,-4.2,6.5);obelisk(ruins,128,3,-3.6,5.4);
  // Plateau remnants behind the course; none behind the canyon or the Sphinx.
  const sites=[{x:-8,y:-.4,z:-12,w:15,t:9},{x:30,y:1.8,z:-16,w:12,t:11},{x:110,y:1.2,z:-16,w:12,t:10},{x:8,y:3.4,z:-30,w:16,t:13}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:8,thickness:site.t,preset:i%3===2?eroded:sandstone,seed:2200+i,quality:low?'low':'standard'});
  const ruinMaterial=vertexMaterial(.92);markSurface(ruinMaterial,'sandstone-blocks','#fff6e8');ruins.mesh(features,ruinMaterial,'temple-ruins-and-obelisks');
  // Oases on the desert floor; palms grow in clusters around water, not in rows.
  const oasis=createWaterSurface(features,{x:16,y:floorY+.25,z:-24,width:12,depth:5,shallow:'#5cc4c0',deep:'#2b8f9e',segments:12,name:'oasis-pool',edge:'none'});
  const valleyOasis=createWaterSurface(features,{x:96,y:floorY+.25,z:-30,width:16,depth:6,shallow:'#5cc4c0',deep:'#2b8f9e',segments:16,name:'valley-oasis',edge:'none'});
  const r=random(7),palms:{x:number;y:number;z:number;scale:number;rotation:number}[]=[];
  const cluster=(x:number,y:number,z:number,count:number,spread:number,scale:number)=>{for(let i=0;i<count;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*spread;palms.push({x:x+Math.cos(a)*d,y,z:z+Math.sin(a)*d*.6,scale:scale*(.75+r()*.45),rotation:r()*6});}};
  cluster(16,floorY,-24,low?5:9,7,1.25);cluster(96,floorY,-30,low?6:11,9,1.3);cluster(46,floorY,-12,low?2:4,3,1.15);cluster(140,floorY,-18,low?3:5,4,1.2);
  for(const site of sites)if(r()>.4)cluster(site.x+site.w*.2,site.y,site.z-1,low?1:2,1.5,.9);
  plantGrove(staticRoot,'date-palm',palms,{low,name:'date-palm-grove'});
  plantGrove(staticRoot,'shrub',sites.map(site=>({x:site.x+site.w*.3,y:site.y,z:site.z+1.6,scale:.7,color:'#c9c08a'})),{low,name:'desert-shrubs'});
  const foreground=new T.Group();foreground.name='egypt-low-foreground';root.add(foreground);
  batchStatic(staticRoot);
  // The canyon gust: banners on the safe ground either side, a sand stream
  // that shows its direction, and drifting dust everywhere.
  const zone=level.zones?.[0],before=level.platforms.find(p=>p.id==='eg-terrace-b'),after=level.platforms.find(p=>p.id==='eg-canyon-far');
  const banners=zone&&before&&after?windBanners(root,[[before.x+before.width-1,before.y,-1.6],[after.x+1.4,after.y,-1.7]],['#2b6fb3','#e2b33c']):null;
  const gustSand=zone?createDrift(root,{kind:'dust',count:low?50:150,colors:['#f1d7a2','#e3c18a'],x:[zone.x-2,zone.x+zone.width+2],y:[-1,6],z:[-1.6,1.8],fall:.05,sway:.3,size:.09,seed:3,name:'gust-sand-stream'}):null;
  const dust=createDrift(root,{kind:'dust',count:low?20:60,colors:['#f4ddb0'],x:[-8,finish+10],y:[-2,8],z:[-10,3],fall:-.08,sway:1.2,size:.07,seed:9,name:'drifting-desert-dust'});dust.setVisible(!reduced);
  const birds=createFlock(root,{count:low?3:6,centre:[finish*.5,18,-50],radius:[finish*.4,2,12],speed:.03,size:1.6,color:'#3a3530',seed:41,glide:true,name:'desert-kites'});
  let disposed=false,windTime=0;
  return{root,
   update(time,dt,signals){
    if(disposed)return;const motion=reduced?0:time;oasis.update(motion);valleyOasis.update(motion);birds.update(motion);dust.update(motion);
    const wind=signals.wind[0],strength=wind?.strength??0,warning=wind?.phase==='warning';windTime+=reduced?0:dt;
    banners?.update(windTime,strength,warning);
    if(gustSand){gustSand.mesh.visible=!reduced&&(strength>0||warning);gustSand.update(windTime,(wind?.force??0)*(strength*4+(warning?.4:0)));(gustSand.mesh.material as T.MeshStandardMaterial).opacity=.2+strength*.6;}
   },
   frame(cameraX){sky.follow(cameraX);pyramidGroup.position.x=(cameraX-90)*.22;},
   setReducedMotion(value){reduced=value;dust.setVisible(!value);},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?160:80;fog.far=view==='overview'?440:300;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width;
  if(definition.type==='bridge'){dressDeck(root,definition,'sandstone',deck,{below:6,surface:stoneSurface});return;}
  if(definition.motion){dressDeck(root,definition,'sandstone-lift',deck,{surface:stoneSurface});return;}
  if(!definition.terrain){dressTerrain(root,definition,definition.route==='upper'?eroded:sandstone,{quality:low?'low':'standard',lush:false});return;}
  const props=new Builder(.5),surface=localSurface(definition);
  if(definition.terrain==='arch'){
   // A lintel on papyrus columns that stand behind the lane, down to the courtyard floor.
   clearPlatformRoot(root);const floor=.4-definition.y,b=new Builder(.5);
   b.add(new T.BoxGeometry(w,.55,2.8),'#dcbb86',[0,-.275,-.2],[0,0,0],[1,1,1],.04);b.add(new T.BoxGeometry(w+.2,.14,2.95),'#2d8f8a',[0,-.5,-.2]);
   for(const x of w>4?[-w/2+.7,0,w/2-.7]:[0])papyrusColumn(b,x,floor,-1.15,-floor-1.4);
   const material=vertexMaterial(.9);markSurface(material,'sandstone-blocks','#fff6ea');const slab=b.mesh(root,material,'country-platform-cap');slab.receiveShadow=true;root.userData.surface='arch';
   return;
  }
  const kind=definition.terrain==='cliff'?'cliff':definition.terrain==='stairs'?'stairs':definition.terrain==='mechanical'?'block':'ground';
  const palette=definition.terrain==='cliff'?hoodoo:definition.terrain==='stairs'||definition.terrain==='mechanical'||definition.style==='paving'?masonry:plateau;
  dressLandmass(root,definition,palette,{low,kind});
  // Scattered stones and dry tufts behind the lane on natural ground.
  if(kind==='ground'||kind==='cliff')for(const spot of rearSpots(definition,Math.ceil(w*(low?.3:.7)),definition.id.length*31+Math.round(definition.x))){const s=.12+spot.r*.22;props.add(new T.DodecahedronGeometry(s,0),spot.r>.5?'#c79c63':'#b48a57',[spot.x,spot.y+s*.3,spot.z],[spot.r*3,spot.r*5,0],[1.3,.6,1]);}
  if(definition.id==='eg-start'){obelisk(props,-w/2+12,0,-2.2,4.2);plantGrove(root,'date-palm',[{x:-w/2+15.4,y:0,z:-2.4,scale:.8},{x:-w/2+16.6,y:0,z:-1.9,scale:.62},{x:-w/2+15.9,y:0,z:-2.9,scale:.7},{x:-w/2+3.5,y:0,z:-2.2,scale:.66}],{low});}
  if(definition.id==='eg-dais')for(const x of [-.75,.75])props.add(new T.BoxGeometry(.18,.06,2.2),'#2d8f8a',[x,.03,-.2]);
  if(definition.id==='eg-terrace-b')papyrusColumn(props,-w/2+1.2,0,-1.9,2.6);
  if(definition.id==='eg-overlook'){for(const x of [-w/2+2,w/2-1.2])papyrusColumn(props,x,0,-2.2,4.2);plantGrove(root,'date-palm',[{x:w/2-3,y:0,z:-2.4,scale:.75},{x:w/2-4.2,y:0,z:-2,scale:.6}],{low});}
  if(definition.id==='eg-scarab-terrace')plantGrove(root,'shrub',[{x:-w/2+1,y:surface(-w/2+1),z:-1.8,scale:.7,color:'#b9b27a'},{x:w/2-1.5,y:0,z:-2,scale:.6,color:'#c9c08a'}],{low});
  if(props.parts.length){const material=vertexMaterial(.9);markSurface(material,'sandstone-blocks','#fff6ea');props.mesh(root,material,'platform-egyptian-props');}
 },
 createEnemy:createScarab,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:'#e8cc98',trim:'#2d9c9a',glyph:'#f2c14e'}),
 decorateCheckpoint(marker){const b=new Builder();obelisk(b,.6,0,-.35,1.8);b.mesh(marker,vertexMaterial(.85),'checkpoint-obelisk');const banner=createBannerPost(marker,{pole:'#6f5236',cloth:'#2b6fb3',accent:'#e2b33c',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'egyptian',width:3.4,height:3.6,stone:'#dcbb86',trim:'#c79e63',accent:'#e2b33c'});arch.position.set(0,0,-1.55);},
};
