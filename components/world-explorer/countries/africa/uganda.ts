import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {createWaterfall,createWaterSurface} from '../../kit/water';
import {createDrift} from '../../kit/particles';
import {random} from '../../kit/common';

/** Uganda — Murchison Falls: The Nile Squeeze. The whole Victoria Nile
 * forces itself through a seven-metre cleft in the rock and explodes
 * downward in a plume of spray; below, the river widens through borassus
 * palm savanna where crocodiles bask on the sandbanks. */
const gorge=earth('#6a5a4a','#5a4a3c','#2e2620',{set:'gneiss',tint:'#d8ccbc',repeat:.45},{rough:.2,strata:.6});
const wet=earth('#4a5a3a','#4a3e32','#2a241e',{set:'mossy-rock',tint:'#d0dcc0',repeat:.5});
const savanna=earth('#9a9a52','#8a6a46','#5a4630',{set:'savanna-rock',tint:'#efe0c0',repeat:.5});
export const environment=africaEnvironment({
 code:'UGA',id:'africa-ug',name:'uganda-murchison-environment',
 representation:'A fictional route along the gorge inspired by Murchison Falls. Wet rock, spray and squeeze stones are game devices; the falls are a simplified study.',
 lighting:{background:'#c8dce0',exposure:1.04,sun:'#fff2d4',sunIntensity:3,sky:'#eef4f0',ground:'#2e2620',hemisphere:1.35,rim:'#e0f4ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#5a96c8',horizon:'#e6eee8',ground:'#2e2620',intensity:.38}},
 sky:{zenith:'#5a96cc',horizon:'#e8eee6',band:'#d4e2dc',glow:'#fff4dc',sun:[-.5,.55,-.6],glowPower:15},
 fog:['#dce6e2',45,180],clouds:{opacity:.75,high:[24,34],groups:12},
 layers:['gorge-rocks-and-terraces','murchison-gorge','spray-plume','victoria-nile','borassus-savanna','sky'],
 backdrop:[{kind:'forest',name:'borassus-savanna',z:[-70,-24],y:-2,flora:['borassus-palm','savanna-grass','umbrella-acacia'],count:60,scale:[.9,1.3]},{kind:'hills',name:'albertine-hills',z:-150,y:-3,height:10,colors:['#5a7a42','#6a8a4a','#7a9a56'],scale:2}],
 floor:{kind:'water',y:-3,shallow:'#5a7a6a',deep:'#2a4a4a',name:'victoria-nile',opacity:.95},
 palettes:{default:gorge,'wet-ledge':wet,'spray-hollow':wet,'borassus-savanna':savanna,'falls-trail':savanna,'gorge-terrace':savanna},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#6a5a4a',stoneAlt:'#5a4a3c',metal:'#4a4a4a',accent:'#fcdc04'},
 capFlora:{default:null,'borassus-savanna':'savanna-grass','falls-trail':'savanna-grass','gorge-terrace':'thorn-scrub','wet-ledge':null},
 flocks:[{count:8,y:12,z:-18,color:'#2a2a2a',wing:'#f4f4f0',size:.8,glide:true,name:'fish-eagles'}],
 hazardPalette:{column:'#eef6f8',base:'#5a4a3c',warning:'#ffe28a',debris:'#f4fbff'},
 creature:{name:'nile-monitor',height:.55,shell:'#4a5a3a',belly:'#d8c88a',foot:'#2a2a1e',crest:'spines',accent:'#d8c88a'},
 crate:{body:'stone',color:'#6a5a4a',trim:'#fcdc04',glyph:'#d90000'},
 checkpoint:{pole:'#5a4028',cloth:'#000000',accent:'#fcdc04',cap:'#d90000'},
 finishArch:{style:'stone',stone:'#5a4a3c',trim:'#fcdc04'},
 landmarks(api){
  const {finish,low,root}=api,r=random(256),top=api.platform('ug-top'),sq=api.platform('ug-squeeze-1');
  // The gorge: two dark walls almost touching, the river forced between them.
  const g=api.group('murchison-gorge');built(g,'gorge-walls',b=>{for(const s of [-1,1])b.add(new T.BoxGeometry(5,16,10),'#4a3e32',[top.x+top.width/2+s*3.6,-4,-12],[0,s*.08,0],[1,1,1],.08);b.add(new T.BoxGeometry(finish+40,10,4),'#5a4a3c',[finish/2,-6,-22],[0,0,0],[1,1,1],.06);for(let i=0;i<16;i++)b.add(new T.DodecahedronGeometry(.6+r(),0),'#4a3e32',[sq.x-6+r()*30,-2.6,-3-r()*3]);},3,.95);
  const falls=createWaterfall(g,{x:top.x+top.width/2,top:top.y+4,z:-11,width:2.4,height:13,seed:9,low,tint:'#eaf4f0'});
  const side=createWaterfall(g,{x:top.x+top.width/2+9,top:top.y+2,z:-14,width:5,height:11,seed:4,low});
  api.animate({update:t=>{falls.update(t);side.update(t);}});
  const nile=api.group('victoria-nile');const surf=createWaterSurface(nile,{x:finish/2,y:-2.9,z:-8,width:finish+60,depth:18,shallow:'#5a7a6a',deep:'#2a4a4a',opacity:.92,flow:[.14,0],seed:6});void surf;
  const spray=api.group('spray-plume');const mist=createDrift(spray,{kind:'mist',count:low?16:40,colors:['#f4fbff','#e6f2f4'],x:[top.x-6,top.x+top.width+10],y:[-2,10],z:[-14,-2],fall:-.4,sway:1.2,size:1.6,seed:3,name:'falls-spray'});
  api.animate({update:t=>mist.update(t),setVisible:v=>mist.setVisible(v),motion:true});
  const crocs=api.group('nile-crocodiles');built(crocs,'basking-crocodiles',b=>{for(let i=0;i<(low?3:6);i++){const x=10+r()*(finish-20),z=-6-r()*4;b.add(new T.BoxGeometry(2.4,.3,.6),'#4a5236',[x,-2.85,z],[0,r()*.6,0]);b.add(new T.ConeGeometry(.3,1.4,6).rotateZ(Math.PI/2),'#4a5236',[x+1.8,-2.85,z]);b.add(new T.ConeGeometry(.22,1.6,6).rotateZ(-Math.PI/2),'#4a5236',[x-2,-2.85,z]);}b.add(new T.BoxGeometry(finish,.2,3),'#c8b88a',[finish/2,-2.98,-6]);},5);
  plantAfrica(root,'borassus-palm',Array.from({length:low?3:6},()=>({x:finish-20+r()*24,y:2,z:-6-r()*6,scale:1})),{low,name:'trail-palms'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='squeeze-rock'||definition.style==='wet-ledge'){const d=api.landmass(root,definition,definition.style==='wet-ledge'?'wet-ledge':'default','island',2.6);built(d,'wet-sheen',b=>{b.add(new T.BoxGeometry(definition.width*.9,.02,1.6),'#6a8a8a',[0,.012,0]);},api.seed);return true;}
  return false;
 },
});
