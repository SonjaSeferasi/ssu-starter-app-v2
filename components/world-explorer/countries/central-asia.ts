import * as T from 'three';
import {centralAsiaPlaces,type CentralAsiaCode} from '../../../lib/world-explorer/central-asia';
import {Builder,random,v3,vertexMaterial,fbm,type Placement} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {mountShell,built,roundCreature} from './south-america/shell';
import {foldedMassif} from './asia-landscape-art';
import {irregularBasin,sculptRegionalBody} from './asia-enhancement-kit';
import type {CountryEnvironment} from './types';

const colors:Record<CentralAsiaCode,[string,string,string,string]>={KAZ:['#ceaa78','#ba7855','#804a37','#a55e3f'],KGZ:['#839f5c','#a5a89a','#667568','#54979b'],TJK:['#aaa99a','#90949a','#596671','#798fa2'],TKM:['#e2d6b0','#d49e7c','#ad765f','#dfb154'],UZB:['#d5c49b','#c7ae87','#93826b','#2b969d']};
function palette(code:CentralAsiaCode):LandmassPalette{const [top,face,dark]=colors[code];return{top,topAlt:new T.Color(top).multiplyScalar(.84).getStyle(),face,faceDark:dark,edge:top,band:dark,rough:code==='UZB'?.06:.24,strata:code==='KAZ'?.6:.95,...(code==='TKM'?{}:{maps:{set:code==='KAZ'?'sandstone-cliff':code==='KGZ'?'mossy-rock':code==='UZB'?'sandstone-blocks':'alpine-rock',tint:'#ece1c9',repeat:.45}})};}
const deck:DeckPalette={wood:'#90704c',woodAlt:'#b49366',rope:'#cabb92',stone:'#c8b998',stoneAlt:'#a99876',metal:'#576b70',accent:'#479b9b'};
const bandColors=['#efe4c7','#c98477','#e6bc73','#bb6e48'];
function stripeGeometry(geometry:T.BufferGeometry,offset:number,scale:number){const p=geometry.getAttribute('position'),c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const index=((Math.floor((p.getY(i)+offset)/scale)%4)+4)%4,color=new T.Color(bandColors[index]);color.multiplyScalar(.92+.08*Math.sin(p.getX(i)*.8+p.getZ(i)));c.set([color.r,color.g,color.b],i*3);}geometry.setAttribute('color',new T.BufferAttribute(c,3));}
/** Closed, flat-crowned eroded buttes with real bands, not cone mountains. */
function butte(parent:T.Object3D,x:number,z:number,radius:number,height:number,seed:number,striped:boolean,low:boolean){
 const geometry=new T.CylinderGeometry(radius*.72,radius,height,low?12:20,low?9:18),p=geometry.getAttribute('position');
 for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i)),relief=1+.055*Math.sin(a*5+seed)+.055*Math.sin(y*2.1+seed)-.09*Math.pow(Math.max(0,Math.sin(a*7+seed)),6)+.04*Math.sin(a*11+y*.7);p.setX(i,p.getX(i)*relief);p.setZ(i,p.getZ(i)*relief*.7);}
 geometry.computeVertexNormals();if(striped)stripeGeometry(geometry,height/2,1.25);
 else{const c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const band=Math.floor((p.getY(i)+height/2)/1.4)%3,color=new T.Color(['#bc7952','#d49461','#ab674b'][band]);c.set([color.r,color.g,color.b],i*3);}geometry.setAttribute('color',new T.BufferAttribute(c,3));}
 const mesh=new T.Mesh(geometry,vertexMaterial(.96));mesh.position.set(x,-8+height/2,z);mesh.name=(striped?'yangykala-banded-mesa-':'charyn-eroded-tower-')+seed;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
}
function portalGeometry(width:number,height:number,depth:number){
 const wall=new T.Shape();wall.moveTo(-width/2,0);wall.lineTo(width/2,0);wall.lineTo(width/2,height);wall.lineTo(-width/2,height);wall.closePath();
 const w=width*.23,spring=height*.52,hole=new T.Path();hole.moveTo(-w,0);hole.lineTo(w,0);hole.lineTo(w,spring);hole.quadraticCurveTo(w,height*.76,0,height*.9);hole.quadraticCurveTo(-w,height*.76,-w,spring);hole.closePath();wall.holes.push(hole);
 const g=new T.ExtrudeGeometry(wall,{depth,bevelEnabled:false,curveSegments:12});g.translate(0,0,-depth/2);return g;
}
function registanStudy(parent:T.Object3D,x:number,z:number,w:number,h:number,seed:number){
 const b=new Builder(),y=-5;
 b.add(new T.BoxGeometry(w+5,1,8),'#c4b28d',[x,y-.5,z]);b.add(new T.BoxGeometry(w, h*.65,5),'#baa47e',[x,y+h*.325,z-2]);
 b.add(portalGeometry(w*.54,h,2),'#3e8eaa',[x,y,z+1.5]);
 // Mosaic panels follow the two portal piers and leave the pointed opening clear.
 for(const side of [-1,1])for(let row=0;row<17;row++)for(let col=0;col<4;col++){
  const color=['#22698d','#e0c58b','#58a9aa','#e6dcc2'][(row+col+seed)%4];b.add(new T.BoxGeometry(w*.027,h/18,.06),color,[x+side*(w*.19+col*w*.032),y+(row+.5)*h/18,z+2.54]);
 }
 for(const side of [-1,1]){const px=x+side*w*.46;b.add(new T.CylinderGeometry(.65,.9,h*.95,16),'#bca67d',[px,y+h*.475,z+1.5]);for(let k=0;k<6;k++)b.add(new T.CylinderGeometry(.78,.78,.3,16),k%2?'#388d9e':'#d8c49a',[px,y+1+k*h*.14,z+1.5]);b.add(new T.CylinderGeometry(.92,.7,.35,16),'#49a0a5',[px,y+h*.95,z+1.5]);}
 const domeProfile=[new T.Vector2(0,0),new T.Vector2(2.4,0),new T.Vector2(3,1),new T.Vector2(3.1,2.2),new T.Vector2(2.6,3.4),new T.Vector2(1.3,4.7),new T.Vector2(.08,5.5)];
 b.add(new T.CylinderGeometry(2.4,2.4,2,24),'#4f9d9e',[x+w*.3,y+h*.65+1,z-2]);b.add(new T.LatheGeometry(domeProfile,24),'#329ba7',[x+w*.3,y+h*.65+2,z-2]);
 for(const side of [-1,1])for(let col=0;col<5;col++){const xx=x+side*(w*.31+col*w*.025);b.add(new T.BoxGeometry(w*.022,h*.55,.1),col%2?'#429ba5':'#b4ba93',[xx,y+h*.3,z+.54]);}for(let row=0;row<7;row++)b.add(new T.BoxGeometry(w*.52,.08,.09),row%2?'#d9c68d':'#267f9b',[x,y+h*.94+row*.12,z+2.55]);
 b.mesh(parent,vertexMaterial(.8),'registan-protected-facade-'+seed);
}

export function centralAsiaEnvironment(code:CentralAsiaCode):CountryEnvironment{
 const place=centralAsiaPlaces[code],p=palette(code),arid=code==='KAZ'||code==='TKM';
 return{id:'central-asia-'+place.iso2.toLowerCase(),info:{title:place.title,license:'Original procedural geometry; CC0 surface maps listed in materials/LICENSES.md.',landmarkSource:place.source,representation:'A stylized, compressed study of '+place.landmark+'. Interactive paths and mechanisms are fictional; protected monuments remain separate scenery.',assets:[...place.features,place.theme,place.signature]},
 lighting:{background:arid?'#d9c3a8':'#bbd7e0',exposure:1.04,sun:arid?'#ffdab0':'#ffe8c6',sunIntensity:2.95,sky:'#e5eef1',ground:p.faceDark,hemisphere:1.03,rim:'#f1dab5',rimIntensity:.4,pixelRatio:1.25,reflections:{zenith:'#86b6cc',horizon:'#e1e6d9',ground:p.faceDark,intensity:.3}},
 mechanisms:{stone:p.face,stoneDark:p.faceDark,trim:code==='UZB'?'#348d9d':'#b99d74',glow:'#f3cf76',metal:'#5b6a6c'},hazardPalette:{column:'#c6a58a',base:'#985f47',warning:'#ffd27a'},ropeColor:'#c8b88e',
 mount(context){
  const {finish,low}=context,r=random(10300+code.charCodeAt(0)),shell=mountShell(context,{id:'central-asia-'+place.iso2.toLowerCase(),name:place.theme+'-environment',background:arid?'#d9c3a8':'#bbd7e0',fog:[arid?'#dcc7aa':'#cfdee1',80,270],sky:{zenith:arid?'#729fb7':'#559ccb',horizon:arid?'#ecd9bc':'#dae8eb',glow:'#fff0d1',sun:[-.6,.55,-.8],glowPower:30},clouds:{groups:arid?7:12,high:[25,43],lowBand:[-14,-11],opacity:.6},layers:['playable-'+place.theme,place.landmark,'regional-landforms','foreground','sky']});
  const {staticRoot,features}=shell;
  const water=(name:string,x:number,y:number,z:number,w:number,d:number,shallow:string,deep:string)=>{const s=createWaterSurface(features,{name,x,y,z,width:w,depth:d,shallow,deep,segments:low?18:36,flow:[.012,.002]});shell.animate({update:t=>s.update(t)});};
  if(arid){
   const striped=code==='TKM';built(staticRoot,'canyon-floor',b=>b.add(new T.BoxGeometry(finish+150,3,115),striped?'#c2ad8c':'#b08259',[finish/2,-8.5,-57]));
   for(let i=0;i<(low?15:25);i++){const x=-25+r()*(finish+55),z=-14-r()*74,butteHeight=12+r()*22,butteRadius=striped?6+r()*7:3+r()*4;butte(staticRoot,x,z,butteRadius,butteHeight,i+1040,striped,low);}
   const plants:Placement[]=Array.from({length:low?22:42},()=>({x:-25+r()*(finish+50),y:-7,z:-7-r()*48,scale:.45+r()*.4,rotation:r()*6}));plantGrove(staticRoot,'golden-tuft',plants,{low,name:striped?'yangykala-sparse-desert-plants':'charyn-dry-canyon-plants'});
   if(code==='KAZ'){const river=irregularBasin(features,{name:'charyn-meandering-river',x:finish/2,y:-6.9,z:-30,width:finish+100,depth:9,seed:849,low,rim:'#b9936a',shallow:'#76a6a4',deep:'#527f8c',height:1});shell.animate({update:t=>river.update(t)});}
  }else if(code==='KGZ'){
   const height=(u:number,v:number)=>Math.abs(v-.5)*11+.3*Math.sin(u*17)-.8;
   const land=createHeightfield(features,{name:'ala-archa-green-valley',x:finish/2,y:-6,z:-35,width:finish+100,depth:57,segments:[low?45:90,low?18:36],height,color:(_h,_s,u,v)=>new T.Color(Math.abs(v-.5)<.09?'#8c9c84':'#6c8b55')});land.updateMatrixWorld(true);
   createHeightfield(features,{name:'ala-too-snowy-peaks',x:finish/2,y:-7,z:-113,width:finish+200,depth:50,segments:[low?50:100,low?18:36],height:foldedMassif(1057,55,9),color:mountainColor({snowLine:27,treeLine:19,rock:'#a8b3b3',forest:'#5e7a5c',snow:'#eef3ef'})});
   water('ala-archa-mountain-stream',finish/2,-6.3,-35,finish+110,7,'#8cbabe','#5d95ab');
   const spots:Placement[]=[];for(let i=0;i<(low?32:60);i++){const u=r(),v=r()>.5?.13+r()*.13:.74+r()*.13,x=finish/2+(u-.5)*(finish+100),z=-35+(v-.5)*57,hit=new T.Raycaster(v3(x,25,z),v3(0,-1,0)).intersectObject(land)[0];if(hit)spots.push({x,y:hit.point.y-.03,z,scale:.7+r()*1.1,rotation:r()*6});}const grove=plantGrove(staticRoot,'conifer',spots,{low,name:'ala-archa-juniper-study'});grove.userData.groundSurface=land.name;
  }else if(code==='TJK'){
   for(const [z,w,h,seed]of [[-122,finish+220,67,1101],[-65,finish+100,32,1157]])createHeightfield(features,{name:'pamir-range-'+seed,x:finish/2,y:-9,z,width:w,depth:45,segments:[low?48:96,low?18:36],height:foldedMassif(seed,h,seed===1101?8:11),color:mountainColor({snowLine:seed===1101?37:100,treeLine:0,rock:'#919aa3',forest:'#8a8d7b',snow:'#edf1ed'})});
   const plateau=createHeightfield(features,{name:'pamir-rocky-high-plateau',x:finish/2,y:-9,z:-26,width:finish+110,depth:33,segments:[low?40:80,10],height:(u,v)=>.8*Math.sin(u*18+v*4)+fbm(u*28,v*12,519,3)*.4,color:()=>new T.Color('#96988c')});plateau.updateMatrixWorld(true);
   built(staticRoot,'pamir-grounded-rock-outcrops',b=>{for(let i=0;i<30;i++){const radius=1+r()*1.5,x=-25+r()*(finish+50),z=-15-r()*24,hit=new T.Raycaster(v3(x,20,z),v3(0,-1,0)).intersectObject(plateau)[0];if(hit)b.add(new T.DodecahedronGeometry(radius,0),'#a7aaa2',[x,hit.point.y+radius*.2,z],[r(),r(),r()],[1,.75,1]);}});
  }else{
   built(staticRoot,'samarkand-courtyard-ground',b=>{b.add(new T.BoxGeometry(finish+110,2,90),'#b9a986',[finish/2,-6,-49]);for(let row=0;row<5;row++)for(let col=0;col<20;col++)b.add(new T.BoxGeometry(4.2,.05,4.2),(row+col)%2?'#d6c7a6':'#c6b58f',[-10+col*5,-4.96,-12-row*5]);});
   registanStudy(staticRoot,45,-43,24,19,1);registanStudy(staticRoot,2,-35,18,14,2);registanStudy(staticRoot,88,-39,18,15,3);
   const trees:Placement[]=Array.from({length:low?10:20},(_,i)=>({x:-10+i*(finish+20)/(low?10:20),y:-5,z:-9,scale:.7,rotation:r()*6}));plantGrove(staticRoot,'cypress',trees,{low,name:'samarkand-courtyard-trees'});
  }
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const {low}=context,w=definition.width;
  if(definition.type==='wooden-bridge'||definition.style==='tiled-service-lift'){dressDeck(root,definition,definition.motion?'masonry-lift':'rope',deck);return;}
  const snowy=code==='KGZ'&&(definition.y>=5||definition.surface==='ice'),selected=snowy?{...p,top:'#e0e9e6',topAlt:'#c9d8d5'}:p;
  const details=dressLandmass(root,definition,selected,{low,kind:definition.steps?'stairs':definition.surface==='ice'?'ice':code==='UZB'?'block':'cliff',profile:code==='UZB'?'wall':definition.route==='upper'?'island':definition.terrain==='cliff'?'shelf':'mass',visualDepth:Math.min(definition.thickness,code==='UZB'?3:4.5)}),surface=localSurface(definition);sculptRegionalBody(root,definition,code);
  if(code==='TKM'){const body=root.getObjectByName('country-platform-cliff') as T.Mesh;stripeGeometry(body.geometry,definition.y,1.05);}
  if(definition.climbable)built(details,'pamir-granite-handholds',b=>{for(let y=-definition.thickness+.6;y<0;y+=.6)for(const z of [-.6,.6])b.add(new T.DodecahedronGeometry(.14,0),'#c6ccbd',[-w/2-.06,y,z],[0,0,0],[.5,1,1]);});
  if(code==='UZB')built(details,'fictional-courtyard-tile-frieze',b=>{for(let x=-w/2+.3;x<w/2;x+=.55)b.add(new T.BoxGeometry(.4,.24,.1),Math.round(x*2)%2?'#2f8eaa':'#d9c28b',[x,surface(x)-.3,definition.depth/2+.05]);if(w>7)b.add(new T.BoxGeometry(w,.25,.25),'#b6a27d',[0,surface(0)+.12,-definition.depth/2]);});
  if(w>5&&definition.route!=='upper'&&code!=='UZB'){
   const spots=rearSpots(definition,Math.floor(w/4),definition.id.length*157).map(s=>({x:s.x,y:surface(s.x),z:Math.min(-1.3,s.z),scale:.42,rotation:s.r*6}));plantGrove(details,code==='KGZ'&&!snowy?'shrub':'golden-tuft',spots,{low,name:place.theme+'-grounded-route-plants'});
  }
 },
 createEnemy:parent=>roundCreature(parent,{name:'fictional-'+place.theme+'-training-creature',height:1,shell:colors[code][3],belly:'#e4d7b4',foot:'#6b624f',crest:()=>{}}),
 createDiscoveryBlock:(parent,w,h)=>createDiscoveryCrate(parent,w,h,{body:'stone',color:colors[code][1],trim:colors[code][3],glyph:'#f3e3b6'}),
 decorateCheckpoint(marker){createBannerPost(marker,{pole:'#796849',cloth:colors[code][3],accent:'#e5ce8c',height:1.6}).position.z=-.8;},
 decorateFinish(gate){built(gate,'regional-discovery-finish',b=>b.add(new T.BoxGeometry(1.8,.35,.1),colors[code][3],[0,3.2,0]));},
 };
}
