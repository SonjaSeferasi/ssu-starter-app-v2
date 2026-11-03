import * as T from 'three';
import {westAsiaPlaces,type WestAsiaCode} from '../../../lib/world-explorer/west-asia';
import {random,vertexMaterial,v3,type Placement} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {mountShell,built,roundCreature} from './south-america/shell';
import {irregularBasin,sculptRegionalBody} from './asia-enhancement-kit';
import {erodedColumn,foldedMassif,shoreIsland} from './asia-landscape-art';
import {createRockMass} from '../kit/landmass';
import {westArchitecture} from './west-asia-architecture';
import type {CountryEnvironment} from './types';

const colors:Record<WestAsiaCode,[string,string,string]>={ARM:['#9a9c7d','#6f736f','#4a5554'],AZE:['#ada393','#8b8177','#5f5c56'],BHR:['#d6c29b','#c1a884','#80765d'],CYP:['#919d66','#aaa18e','#6b7164'],GEO:['#8a9b65','#9c9d93','#646d68'],IRQ:['#b3ae75','#8b8264','#60766a'],ISR:['#d5c8a3','#b7a48a','#8f806d'],JOR:['#dba68c','#c68a70','#895f52'],KWT:['#d7d1b5','#bdb7a2','#878c86'],LBN:['#99a77b','#a8ac9a','#727b6c'],OMN:['#d8d0b2','#bcb49e','#7e897f'],QAT:['#d7d4be','#b6b3a5','#818e8c'],SAU:['#d9b07f','#bf8559','#8e6147'],SYR:['#d9c59a','#bdab88','#817b67'],TUR:['#d3c5af','#b5a28b','#7c776c'],ARE:['#d6d4c7','#b1b8b6','#7e9397'],YEM:['#b7ba9a','#a0a591','#737e72']};
const deck:DeckPalette={wood:'#947b58',woodAlt:'#b8a075',rope:'#d2c292',stone:'#c9bfa6',stoneAlt:'#a8a18e',metal:'#6c8b8d',accent:'#4b9da7'};
function palette(code:WestAsiaCode):LandmassPalette{const [top,face,dark]=colors[code];return{top,topAlt:new T.Color(top).multiplyScalar(.88).getStyle(),face,faceDark:dark,edge:top,band:dark,rough:.22,strata:.6,maps:{set:['ARM','GEO','YEM'].includes(code)?'alpine-rock':['CYP','LBN'].includes(code)?'mossy-rock':['KWT','QAT','ARE','BHR'].includes(code)?'sandstone-blocks':'sandstone-cliff',tint:'#ece4d1',repeat:.5}};}
function dragonTree(parent:T.Object3D,x:number,y:number,z:number,size:number){
 built(parent,'socotra-dragon-tree',(b)=>{
  b.add(new T.CylinderGeometry(.25,.65,4,9),'#9b9d86',[x,y+2*size,z],[0,0,0],[size,size,size]);
  for(let k=0;k<9;k++){const a=k*Math.PI*2/9,xx=x+Math.cos(a)*2.5*size,zz=z+Math.sin(a)*2.5*size,curve=new T.CatmullRomCurve3([v3(x,y+2.5*size,z),v3(x+Math.cos(a)*size,y+3.3*size,z+Math.sin(a)*size),v3(xx,y+4.1*size,zz)]);b.add(new T.TubeGeometry(curve,5,.18*size,5,false),'#9c9c82');for(let j=0;j<3;j++){const a2=a+(j-1)*.7,px=xx+Math.cos(a2)*.7*size,pz=zz+Math.sin(a2)*.7*size;b.strut(v3(xx,y+4*size,zz),v3(px,y+4.4*size,pz),.07*size,'#a7a58c');b.add(new T.SphereGeometry(1,8,5),'#758454',[px,y+4.45*size,pz],[0,a2,0],[1*size,.27*size,1.1*size]);}}
 },1);
}
/** Regional original 3D scenery. Historic sites and vegetation are not colliders. */
export function westAsiaEnvironment(code:WestAsiaCode):CountryEnvironment{
 const place=westAsiaPlaces[code],p=palette(code),coastal=['BHR','KWT','QAT','ARE'].includes(code),green=['CYP','GEO','LBN'].includes(code),wet=code==='IRQ',arid=!green&&!wet&&!coastal;
 return{id:'west-asia-'+place.iso2.toLowerCase(),info:{title:place.title,license:'Original procedural geometry; CC0 surface maps listed in materials/LICENSES.md.',landmarkSource:place.source,representation:'Stylized compressed study of '+place.landmark+'. Interactive routes are fictional; protected sites remain separate scenery.',assets:[...place.features,place.theme,place.signature]},
 lighting:{background:green?'#c2d5dc':coastal?'#b9dbe1':'#d9cebb',exposure:1.06,sun:arid?'#ffddb5':'#fff0cf',sunIntensity:2.95,sky:'#e8f0ee',ground:p.faceDark,hemisphere:1.02,rim:'#eedbb9',rimIntensity:.4,pixelRatio:1.25,reflections:{zenith:'#83b7d0',horizon:'#e6e8dc',ground:p.faceDark,intensity:.3}},mechanisms:{stone:p.face,stoneDark:p.faceDark,trim:coastal?'#6e9fa8':'#b59b76',glow:'#f4cf78',metal:'#6c8587'},hazardPalette:{column:'#999082',base:'#7d756b',warning:'#ffcd76'},ropeColor:'#d0bd91',
 mount(context){
  const {finish,low}=context,r=random(12000+code.charCodeAt(0)*31+code.charCodeAt(1)),shell=mountShell(context,{id:'west-asia-'+place.iso2.toLowerCase(),name:place.theme+'-environment',background:green?'#c2d5dc':coastal?'#b9dbe1':'#d9cebb',fog:[green?'#d2dcd5':'#e2d5bd',85,285],sky:{zenith:'#6ca6cd',horizon:'#e5e7d8',glow:'#fff0cf',sun:[-.6,.6,-.8],glowPower:30},clouds:{groups:arid?6:10,high:[26,48],lowBand:[-17,-14],opacity:.5},layers:[place.theme,'country-landmark','regional-landforms','foreground','sky']});
  const {staticRoot,features}=shell;
  const water=(name:string,y:number,z:number,w:number,d:number,a='#80b8b6',b='#4a8599')=>{const surface=createWaterSurface(features,{name,x:finish/2,y,z,width:w,depth:d,segments:low?16:32,shallow:a,deep:b,flow:[.014,.002]});shell.animate({update:t=>surface.update(t)});};
  const flat=coastal||wet||['AZE','SYR'].includes(code);
  const land=createHeightfield(features,{name:place.theme+'-ground',x:finish/2,y:code==='YEM'?2:code==='AZE'?-2:-8,z:code==='YEM'?-42:-49,width:finish+130,depth:code==='YEM'?45:90,segments:[low?36:70,low?14:28],height:(u,v)=>flat?0:.5+Math.sin(u*11)*.4+Math.pow(Math.abs(v-.5)*2,2)*2,color:()=>new T.Color(green?'#7e9468':wet?'#8f9570':p.face)});land.updateMatrixWorld(true);
  if(green||code==='YEM')createHeightfield(features,{name:place.theme+'-mountain-backdrop',x:finish/2,y:-9,z:-113,width:finish+190,depth:65,segments:[low?50:100,low?20:40],height:foldedMassif(12453+code.charCodeAt(0),code==='GEO'?54:code==='YEM'?31:34,code==='GEO'?9:11),color:mountainColor({snowLine:code==='GEO'?27:100,treeLine:code==='YEM'?0:18,rock:p.face,forest:green?'#657f5c':p.face,snow:'#e5eeec'})});
  if(coastal){water('gulf-waterfront',-7.85,-65,finish+150,105);built(staticRoot,'waterfront-seawall',b=>b.add(new T.BoxGeometry(finish+110,1.2,4),p.face,[finish/2,-7.3,-10]));}
  if(wet){water('ahwar-shallow-waterways',-7.75,-36,finish+120,71,'#97b8a1','#5f978b');built(staticRoot,'ahwar-reed-beds',b=>{for(let i=0;i<(low?120:230);i++){const x=-15+r()*(finish+30),z=-10-r()*48,h=1.5+r()*2.3;b.add(new T.CylinderGeometry(.04,.06,h,5),'#8d9c5e',[x,-7.7+h/2,z]);b.add(new T.CylinderGeometry(.12,.12,.5,6),'#8a7653',[x,-7.7+h,z]);}});}
  if(['ARM','LBN','ISR','YEM'].includes(code))water(code==='ISR'?'dead-sea-view':code==='YEM'?'socotra-coast':place.theme+'-river-pools',code==='ISR'?-9:code==='OMN'?-2:-7.3,code==='YEM'?-88:-25,finish+110,code==='ISR'||code==='YEM'?38:9);
  if(code==='OMN'){const basin=irregularBasin(features,{name:'wadi-shab-curved-limestone-pools',x:finish/2,y:-2,z:-25,width:finish+100,depth:11,seed:542,low,rim:'#bcbba3',shallow:'#77c3b9',deep:'#438d98',height:1.6});shell.animate({update:t=>basin.update(t)});}
  if(code==='AZE')for(let i=0;i<5;i++){const pool=irregularBasin(features,{name:'gobustan-mud-pool-'+i,x:10+i*18,y:-1.95,z:-23-i%2*8,width:14,depth:8,seed:23+i,low,rim:'#8c887d',shallow:'#a19c90',deep:'#77776c',height:.4});shell.animate({update:t=>pool.update(t)});}
  if(['ARM','AZE','JOR','OMN','SAU','TUR','ISR'].includes(code)){
   built(staticRoot,place.theme+'-distinct-rock-forms',b=>{
    const n=code==='ARM'?(low?100:180):low?15:26;
    for(let i=0;i<n;i++){
     const x=code==='ARM'?-20+i*(finish+65)/n:-20+r()*(finish+55),z=code==='ARM'?-22-r()*3:code==='ISR'?-68-r()*25:-23-r()*45,h=code==='ARM'?8+r()*13:code==='AZE'?1.4+r()*3.5:10+r()*20;
     if(code==='JOR'&&Math.abs(x-finish*.57)<16&&z>-54)continue;
     if(code==='ARM'){b.add(new T.CylinderGeometry(.65,.68,h,6),i%2?'#777e7c':'#89928b',[x,-8+h/2,z]);}
     else if(code==='AZE'){b.add(new T.CylinderGeometry(.55,3,h,16),p.face,[x,-2+h/2,z]);b.add(new T.CylinderGeometry(.55,.55,.12,16),'#625e56',[x,-2+h,z]);}
     else if(code==='TUR'){const points=Array.from({length:20},(_,j)=>{const t=j/19;return new T.Vector2((.3+2.2*(1-t)**1.7)*(1+.08*Math.sin(t*27+i)),t*h);});b.add(new T.LatheGeometry(points,low?12:20),p.face,[x,-8,z]);b.add(new T.DodecahedronGeometry(1,1),'#7c7365',[x,-8+h+.2,z],[0,i,0],[1.3,.75,1.1]);if(i%3===0)b.add(new T.SphereGeometry(.38,8,6),'#665f55',[x,-8+h*.23,z+1.6],[0,0,0],[1,1.5,.15]);}
     else{const radius=code==='ISR'?12:4+r()*5,geo=new T.CylinderGeometry(radius*.75,radius,h,low?11:18,10),pos=geo.getAttribute('position');for(let k=0;k<pos.count;k++){const y=pos.getY(k),a=Math.atan2(pos.getZ(k),pos.getX(k)),relief=1+.09*Math.sin(a*4+i)+.04*Math.sin(y*2);pos.setX(k,pos.getX(k)*relief);pos.setZ(k,pos.getZ(k)*relief*.75);}geo.computeVertexNormals();b.add(geo,p.face,[x,-8+h/2,z]);}
    }
   });
  }
  // Solid rear cliff walls, with an opening that keeps Petra's facade visible.
  if(code==='JOR'||code==='OMN')for(let x=-30;x<finish+35;x+=10){if(code==='JOR'&&Math.abs(x-finish*.57)<16)continue;const h=19+Math.sin(x*.23)*3;createRockMass(staticRoot,{name:place.theme+'-weathered-gorge-wall-'+x,x,y:-8+h,z:-43,width:12,depth:9,height:h,palette:p,profile:'mass',low,seed:Math.round(x+50)*37});}
  if(code==='ISR')erodedColumn(features,{name:'masada-stratified-plateau-support',x:finish*.57,y:-8,z:-42,radius:23,height:16,seed:865,color:'#bba78b',top:'#c4b28c',banded:true});
  if(green||coastal||['IRQ','SYR','OMN'].includes(code)){
   const kind=green?'conifer':wet?'reed':'date-palm',spots:Placement[]=[];
   for(let i=0;i<(low?18:36);i++){const x=-15+r()*(finish+30),z=-12-r()*50,hit=new T.Raycaster(v3(x,30,z),v3(0,-1,0)).intersectObject(land)[0];if(hit)spots.push({x,y:hit.point.y-.03,z,scale:green?.8+r():.65+r()*.5,rotation:r()*6});}
   if(code==='LBN')built(staticRoot,'qadisha-layered-cedar-study',b=>{for(const s of spots){b.add(new T.CylinderGeometry(.2,.5,7,9),'#847d66',[s.x,s.y+3.5,s.z]);for(let k=0;k<4;k++)for(let j=0;j<4;j++){const a=j*Math.PI/2+k*.6,reach=3.3-k*.55,xx=s.x+Math.cos(a)*reach*.65,zz=s.z+Math.sin(a)*reach*.65;b.strut(v3(s.x,s.y+3.6+k*1.05,s.z),v3(xx,s.y+4+k*1.1,zz),.1,'#8e8874');b.add(new T.SphereGeometry(1,9,6),'#5e7e60',[xx,s.y+4+k*1.1,zz],[0,a,0],[reach*.67,.35,reach*.5]);}}});
   else if(!wet){const grove=plantGrove(staticRoot,kind,spots,{low,name:place.theme+'-grounded-vegetation'});grove.userData.groundSurface=land.name;}
  }
  if(code==='YEM')for(let i=0;i<(low?10:18);i++){const x=-13+r()*(finish+20),z=-24-r()*36,hit=new T.Raycaster(v3(x,30,z),v3(0,-1,0)).intersectObject(land)[0];if(hit)dragonTree(staticRoot,x,hit.point.y,z,1.1+r()*.7);}
  if(code==='TUR')built(staticRoot,'cappadocia-distant-balloons',b=>{for(let i=0;i<4;i++){const x=12+i*25,y=24+i%2*5,z=-72;b.add(new T.SphereGeometry(2,14,10),i%2?'#c39767':'#a96c58',[x,y,z],[0,0,0],[1,1.3,1]);b.add(new T.BoxGeometry(.7,.6,.7),'#8c765a',[x,y-3.1,z]);}});
  westArchitecture(staticRoot,code,finish,low);return shell.finish();
 },
 dressPlatform(root,definition,context){
  const {low}=context,w=definition.width,surface=localSurface(definition),urban=coastal||definition.terrain==='mechanical';
  if(definition.type==='wooden-bridge'||definition.type==='wooden-moving'||definition.motion){dressDeck(root,definition,urban?'masonry-lift':'rope',deck);return;}
  const details=dressLandmass(root,definition,p,{low,kind:definition.steps?'stairs':code==='ARM'?'cliff':urban?'block':'cliff',profile:coastal||code==='SYR'?'wall':definition.route==='upper'?'island':definition.terrain==='cliff'?'shelf':'mass',visualDepth:Math.min(definition.thickness,coastal?3:5)});sculptRegionalBody(root,definition,code);
  if(code==='ARM')built(details,'garni-hexagonal-platform-face',b=>{for(let x=-w/2+.45;x<w/2-.2;x+=.72){const h=Math.min(4,definition.thickness)-.2;b.add(new T.CylinderGeometry(.43,.43,h,6),'#77817c',[x,surface(x)-h/2-.08,definition.depth/2-.17]);}});
  if(w>6&&definition.route!=='upper'&&!definition.climbable){const spots=rearSpots(definition,Math.floor(w/5),definition.id.length*73).map(s=>({x:s.x,y:surface(s.x),z:Math.min(-1.3,s.z),scale:.38,rotation:s.r*6}));if(!['ARM','ISR','JOR','AZE','SAU','TUR'].includes(code))plantGrove(details,green?'shrub':'golden-tuft',spots,{low,name:place.theme+'-route-plants'});}
  if(code==='SAU')built(details,'fictional-light-puzzle-markers',b=>{if(definition.id.endsWith('light-court')){b.add(new T.CylinderGeometry(.2,.3,2.8,10),'#b6a36d',[0,surface(0)+1.4,-1.7]);b.add(new T.SphereGeometry(.38,10,8),'#ffda73',[0,surface(0)+3,-1.7]);}});
 },
 createEnemy:parent=>roundCreature(parent,{name:'fictional-'+place.theme+'-creature',height:1,shell:colors[code][1],belly:'#e6dcc5',foot:'#766d5c',crest:()=>{}}),
 createDiscoveryBlock:(parent,w,h)=>createDiscoveryCrate(parent,w,h,{body:'stone',color:p.face,trim:'#b79b72',glyph:'#f1e1bf'}),
 decorateCheckpoint(marker){createBannerPost(marker,{pole:'#8f7b59',cloth:green?'#789b76':'#b9a16d',accent:'#e9d69b',height:1.6}).position.z=-.8;},
 decorateFinish(gate){built(gate,'regional-discovery-finish',b=>b.add(new T.BoxGeometry(1.8,.3,.1),'#bca576',[0,3.2,0]));},
 };
}
