import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {pillar} from './architecture';
import {plantAfrica} from './flora';
import {plantGrove} from '../../kit/vegetation';
import {arcadeBay} from '../../kit/architecture';
import {random} from '../../kit/common';

/** Libya — Leptis Magna: Columns by the Sea. Pale limestone and marble on a
 * turquoise Mediterranean: the four-way Severan arch, the colonnaded
 * basilica, the harbour quays with their mooring blocks and lighthouse
 * footing, and the theatre seats looking out to sea. */
const marble=earth('#e6dcc8','#cdbf9f','#8f826a',{set:'limestone',tint:'#f6efe0',repeat:.6},{capMaps:{set:'paris-stone',tint:'#efe6d4',repeat:1},strata:.5,rough:.05});
const quay=earth('#cfc3a6','#b3a684','#776c56',{set:'ashlar',tint:'#efe4cc',repeat:.65},{strata:.45,rough:.04});
const coast=earth('#c8b58a','#b5a07a','#7a6a50',{set:'coastal-rock',tint:'#eee0c4',repeat:.5});
export const environment=africaEnvironment({
 code:'LBY',id:'africa-ly',name:'libya-leptis-magna-environment',
 representation:'A fictional course through a Roman city inspired by Leptis Magna. The Severan arch, basilica, harbour and theatre are simplified studies placed for the route; toppling drums and waves are game devices.',
 lighting:{background:'#a8d4ec',exposure:1.06,sun:'#fff3dc',sunIntensity:3.3,sky:'#eaf4f8',ground:'#776c56',hemisphere:1.35,rim:'#e8f4ff',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#3f92d6',horizon:'#e4f0f4',ground:'#776c56',intensity:.36}},
 sky:{zenith:'#2f86d4',horizon:'#e6f2f6',band:'#c9e2ef',glow:'#fff6e0',sun:[-.3,.7,-.6],glowPower:20},
 fog:['#d7e8ef',60,220],clouds:{opacity:.65,high:[28,38],groups:10},
 layers:['forum-basilica-and-quays','severan-arch-and-theatre','harbour-and-lighthouse','coastal-dunes','mediterranean-sea','sky'],
 backdrop:[
  {kind:'sea',name:'mediterranean-sea',y:-2.6,z:-90,depth:170,shallow:'#5fc0c8',deep:'#1f6a98'},
  {kind:'hills',name:'coastal-dunes',z:-46,y:-3,height:4,colors:['#d8c49a','#e4d2a8','#efe0bc'],depth:16},
 ],
 floor:{kind:'water',y:-2.6,shallow:'#6fcfd2',deep:'#2a7aa0',name:'harbour-water',opacity:.92},
 palettes:{default:marble,'harbour-quay':quay,'quay-steps':quay,'mooring-block':quay,'lighthouse-footing':coast,'mosaic-floor':marble},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#e6dcc8',stoneAlt:'#cdbf9f',metal:'#5a5a5a',accent:'#c9a24a'},
 capFlora:{default:null,'forum':'savanna-grass'},
 flocks:[{count:8,y:12,z:-18,color:'#f4f4f0',wing:'#c8c8c4',size:.6,glide:true,name:'gulls'}],
 creature:{name:'harbour-crab',height:.6,shell:'#c8582e',belly:'#f0b48a',foot:'#8a3a1e',crest:'antennae',accent:'#c8582e'},
 crate:{body:'marble',color:'#e6dcc8',trim:'#8f826a',glyph:'#c9a24a'},
 checkpoint:{pole:'#6b4b2e',cloth:'#239e46',accent:'#e70013',cap:'#000000'},
 finishArch:{style:'roman',stone:'#e6dcc8',trim:'#8f826a'},
 mechanisms:{stone:'#e6dcc8',stoneDark:'#8f826a',trim:'#c9a24a',glow:'#ffd27a',metal:'#5a5a5a'},
 hazardPalette:{column:'#e8f8fa',base:'#9a8f7a',warning:'#ffd27a',debris:'#f4fbfb'},
 landmarks(api){
  const {finish,low,features}=api,r=random(183);
  // The Severan arch: a four-way arch at the start, with an attic and
  // engaged columns on its piers.
  const arch=api.group('severan-arch'),start=api.platform('ly-arch');
  built(arch,'tetrapylon',b=>{const x=start.x+5,z=-4.2;for(const sx of [-1,1])for(const sz of [-1,1]){b.add(new T.BoxGeometry(1.8,5,1.8),'#e6dcc8',[x+sx*2.4,2.5,z+sz*2.4],[0,0,0],[1,1,1],.03);pillar(b,[x+sx*2.4,0,z+sz*2.4+(sz>0?1:-1)],4.6,.24,'#d8cdb4');}b.add(arcadeBay(6.6,6.4,6.6,{opening:.5,spring:.62}),'#e6dcc8',[x,0,z]);b.add(new T.BoxGeometry(7,1.6,7),'#d8cdb4',[x,7.2,z]);b.add(new T.BoxGeometry(6.2,.6,6.2),'#cdbf9f',[x,8.3,z]);},3,.9);
  // The basilica: a long colonnade, some shafts broken, behind the drums.
  const colonnade=api.group('basilica-colonnade'),bas=api.platform('ly-basilica');
  built(colonnade,'basilica-columns',(b,rr)=>{for(let i=0;i<14;i++){const x=10+i*2.6,broken=rr()<.35?.3+rr()*.4:0;pillar(b,[x,-1,-5.2],6.4,.32,i%3?'#e6dcc8':'#b9b0a0',broken);pillar(b,[x+1.3,-1,-8.6],6.4,.32,'#d8cdb4',rr()<.3?.5:0);}b.add(new T.BoxGeometry(37,.7,1.2),'#e6dcc8',[bas.x-9,5.7,-8.6]);for(let i=0;i<10;i++)b.add(new T.CylinderGeometry(.32,.32,1.4,12).rotateZ(Math.PI/2),'#d8cdb4',[12+rr()*30,-.6,-3.2-rr()*2],[0,rr()*3,0]);},5,.9);
  // Harbour: quay walls, mooring blocks with tie holes, the lighthouse base.
  const harbour=api.group('harbour-quays'),l=api.platform('ly-lighthouse');
  built(harbour,'harbour-masonry',b=>{b.add(new T.BoxGeometry(46,2.4,3),'#b3a684',[l.x-14,-1.4,-6.5],[0,0,0],[1,1,1],.04);for(let i=0;i<8;i++)b.add(new T.BoxGeometry(1.1,1,1.1),'#a99c7c',[l.x-34+i*5.6,.3,-5.4]);b.add(new T.CylinderGeometry(2.6,3,4,10),'#cfc3a6',[l.x+1.5,-1,-5.6]);b.add(new T.CylinderGeometry(2,2.4,2.2,10),'#c4b897',[l.x+1.5,2.1,-5.6]);},6,.9);
  createShoreFoam(features,Array.from({length:low?10:22},(_,i)=>({x:44+i*2.4,y:-2.5,z:-4.6+(i%2)*.4,size:1.2})),low);
  // The theatre: a semicircle of seats on the hill above the sea, and the
  // columned stage building at the finish.
  const theatre=api.group('roman-theatre'),stage=api.platform('ly-scaenae');
  built(theatre,'theatre-cavea',b=>{const cx=stage.x+4,cz=-14;for(let row=0;row<9;row++){const rad=6+row*1.1,steps=24;for(let i=0;i<steps;i++){const a=Math.PI*(1.05+.9*i/(steps-1));b.add(new T.BoxGeometry(rad*Math.PI/steps*1.05,.55,1.1),row%2?'#ddd2bc':'#e6dcc8',[cx+Math.cos(a)*rad,row*.55,cz+Math.sin(a)*rad*.8],[0,-a-Math.PI/2,0]);}}for(let i=0;i<8;i++)pillar(b,[stage.x+1+i*1.5,stage.y,-3.6],4.2,.22,i%2?'#cdbf9f':'#e6dcc8',i===5?.4:0);b.add(new T.BoxGeometry(11.6,.5,.7),'#e6dcc8',[stage.x+6.2,stage.y+4.8,-3.6]);},7,.9);
  // Date palms and coastal scrub along the shore.
  plantGrove(features,'date-palm',Array.from({length:low?4:9},()=>({x:-8+r()*(finish+10),y:-2.4,z:-12-r()*10,scale:.8+r()*.4})),{low,name:'shore-date-palms'});
  plantAfrica(features,'thorn-scrub',Array.from({length:low?8:18},()=>({x:-8+r()*(finish+10),y:-1.8,z:-16-r()*16,scale:.8+r()*.5})),{low,name:'coastal-scrub'});
 },
 dress(root,definition,_context,api){
  const style=definition.style;
  if(style==='column-drum'){built(root,'standing-column-drum',(b,rr)=>{b.add(new T.CylinderGeometry(definition.width/2,definition.width/2,.5,16),'#e6dcc8',[0,-.25,0]);for(let i=0;i<16;i++)b.add(new T.BoxGeometry(.05,.5,.05),'#cdbf9f',[Math.cos(i/16*Math.PI*2)*definition.width/2,-.25,Math.sin(i/16*Math.PI*2)*definition.width/2]);const h=5+definition.y;b.add(new T.CylinderGeometry(definition.width*.42,definition.width*.46,h,14),'#ddd2bc',[0,-.5-h/2,0],[0,0,0],[1,1,1],.03);b.add(new T.BoxGeometry(.1,.4,.06),'#9a8f7a',[(rr()-.5)*.6,-.7,definition.width*.44]);},api.seed);return true;}
  if(style==='mooring-block'){const d=api.landmass(root,definition,'mooring-block','island',2.4);built(d,'mooring-ring',b=>{b.add(new T.TorusGeometry(.18,.04,6,12),'#5a5a5a',[0,-.5,1.21]);},api.seed);return true;}
  return false;
 },
});
void plantAfrica;
