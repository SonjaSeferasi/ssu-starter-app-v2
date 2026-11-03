import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {rondavel} from './architecture';
import {plantAfrica} from './flora';
import {createWaterfall} from '../../kit/water';
import {createDrift} from '../../kit/particles';
import {random} from '../../kit/common';

/** Guinea — Fouta Djallon: The Bridal Veil Falls. Dark wet sandstone, a
 * long veil of water fanning down a cliff into a plunge pool, cascade
 * shelves above, gallery forest of ferns and bananas, and the green table
 * highlands of the Fouta Djallon beyond. */
const wet=earth('#5a6a4a','#4a4a42','#2a2a28',{set:'mossy-rock',tint:'#c8d0c0',repeat:.5},{rough:.2,strata:.5});
const highland=earth('#6f8a45','#7a6a52','#4a4030',{set:'mossy-rock',tint:'#d8dcc8',repeat:.5});
export const environment=africaEnvironment({
 code:'GIN',id:'africa-gn',name:'guinea-fouta-djallon-environment',
 representation:'A fictional climbing course beside a waterfall, inspired by the Voile de la Mariée in the Fouta Djallon. Climbing beside a real waterfall is dangerous; the route is a game device.',
 lighting:{background:'#b8ccc8',exposure:1.02,sun:'#f6f0dc',sunIntensity:2.7,sky:'#e2ece6',ground:'#2a2a28',hemisphere:1.45,rim:'#d8f0e8',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#7aa0b8',horizon:'#dce6e0',ground:'#2a2a28',intensity:.34}},
 sky:{zenith:'#7aa4c4',horizon:'#e2eae2',band:'#cfdcd6',glow:'#f6f4e2',sun:[-.4,.55,-.7],glowPower:12},
 fog:['#d6e2dc',40,170],clouds:{opacity:.9,high:[20,30],lowBand:[-6,0],groups:18,shade:'#c8d4d0'},
 layers:['wet-ledges-and-cascade-shelves','bridal-veil-falls','plunge-pool','gallery-forest','fouta-djallon-highlands','sky'],
 backdrop:[{kind:'mesas',name:'fouta-djallon-highlands',z:-120,y:-8,height:24,colors:['#4f6a3a','#6a5a48','#6f8a45'],count:6,depth:70},{kind:'range',name:'far-highlands',z:-190,y:-8,height:26,peaks:6,rock:'#6a6a5a',forest:'#3f5a32',grass:'#6a7a4a',treeLine:20}],
 floor:{kind:'water',y:-2.4,shallow:'#5a8a7a',deep:'#24463f',name:'plunge-pool',opacity:.92},
 palettes:{default:wet,'highland-plateau':highland,'fula-village':highland,'pool-rim':highland},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#5a6a4a',stoneAlt:'#4a4a42',metal:'#4a4a4a',accent:'#009460'},
 capFlora:{default:'savanna-grass','wet-ledge':null,'cascade-shelf':null,'falls-cliff':null,'fern-grotto':null},
 flora:[{kind:'banana',count:16,z:[-10,-5],y:-2.4,scale:[.9,1.3],sway:.04},{kind:'forest-giant',count:12,z:[-30,-18],y:-2.4,scale:[.6,.9]},{kind:'oil-palm',count:8,z:[-18,-12],y:-2.4,scale:[.8,1.1]}],
 flocks:[{count:4,y:16,z:-20,color:'#2a2a2a',wing:'#e8e8e0',size:.9,glide:true,name:'palm-nut-vultures'}],
 hazardPalette:{column:'#f2fbfd',base:'#5a6a5a',warning:'#ffe08a'},
 creature:{name:'river-frog',height:.5,shell:'#4a7a3a',belly:'#d8e0a0',foot:'#3a5a2a',crest:'frill',accent:'#e8c040'},
 crate:{body:'stone',color:'#5a6a4a',trim:'#009460',glyph:'#fcd116'},
 checkpoint:{pole:'#4a3a2a',cloth:'#ce1126',accent:'#fcd116',cap:'#009460'},
 finishArch:{style:'jungle',stone:'#4a4a42',trim:'#3a5a2a'},
 landmarks(api){
  const {finish,low,features,root}=api,r=random(1610),cliff=api.platform('gn-cliff');
  // The veil: a wide sheet of water fanning down the rock face beside the
  // climb, with a second strand further back.
  const falls=api.group('bridal-veil-falls');
  const main=createWaterfall(falls,{x:cliff.x-4,top:cliff.y+9,z:-5,width:6,height:12,seed:3,low,tint:'#e8f4f4'});
  const back=createWaterfall(falls,{x:cliff.x+16,top:cliff.y+12,z:-14,width:3.5,height:15,seed:5,low});
  built(falls,'falls-rock-face',b=>{b.add(new T.BoxGeometry(34,22,4),'#3a3a36',[cliff.x+4,3,-8.5],[0,0,0],[1,1,1],.08);for(let i=0;i<20;i++)b.add(new T.DodecahedronGeometry(1+r()*1.4,0),'#4a4a42',[cliff.x-12+r()*32,-2+r()*20,-6.4],[0,r()*3,0],[1,1,.5]);},4,.95);
  api.animate({update:t=>{main.update(t);back.update(t);}});
  const spray=createDrift(root,{kind:'mist',count:low?10:24,colors:['#f4fafa'],x:[cliff.x-10,cliff.x+6],y:[-2,4],z:[-6,0],fall:-.05,sway:1.6,size:1.6,seed:9,name:'falls-mist'});
  api.animate({update:t=>spray.update(t),setVisible:v=>spray.setVisible(v),motion:true});
  // Plunge pool rocks, cascade shelves upstream, gallery forest.
  const pool=api.group('plunge-pool');built(pool,'pool-boulders',b=>{for(let i=0;i<10;i++)b.add(new T.DodecahedronGeometry(.7+r()*.8,0),'#3e3e3a',[cliff.x-14+r()*20,-2.6,-3.6-r()*3],[0,r()*3,0],[1.2,.6,1]);},6);
  const shelves=api.group('cascade-shelves'),s1=api.platform('gn-shelf-1');
  const upper=createWaterfall(shelves,{x:s1.x+10,top:s1.y+6,z:-7,width:2.4,height:6,seed:7,low});api.animate({update:t=>upper.update(t)});
  const forest=api.group('gallery-forest');plantAfrica(forest,'ravenala',Array.from({length:low?3:7},()=>({x:r()*finish,y:-2.4,z:-6-r()*4,scale:.9})),{low,name:'gallery-palms'});
  const village=api.group('fula-village');built(village,'fula-huts',b=>{for(let i=0;i<4;i++)rondavel(b,[-4+i*3,0,-4.4-(i%2)*2],1.2,{wall:'#c8b090',thatch:'#9a8a5a'});},8);
  void features;
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='wet-ledge'){const d=api.landmass(root,definition,'default','island',1.8);built(d,'wet-sheen',b=>{b.add(new T.BoxGeometry(w*.9,.02,1.8),'#9ab8c0',[0,.012,-.2]);for(let i=0;i<4;i++)b.add(new T.CylinderGeometry(.02,.02,1.6,4),'#c8e0e8',[-w/2+.3+i*(w-.6)/3,-.9,1.1]);},api.seed);return true;}
  if(style==='cascade-shelf'){const d=api.landmass(root,definition,'default','shelf',1.4);built(d,'shelf-water',b=>{b.add(new T.BoxGeometry(w,.05,2.2),'#8ac0c8',[0,.03,0]);for(let i=0;i<5;i++)b.add(new T.BoxGeometry(.5,.02,.3),'#f4fafa',[-w/2+.4+i*.8,.06,(i%2?.5:-.5)]);},api.seed);return true;}
  return false;
 },
});
