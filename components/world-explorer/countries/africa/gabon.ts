import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {elephantFigure} from './shared-props';
import {plantAfrica} from './flora';
import {random} from '../../kit/common';

/** Gabon — Loango: Elephants on the Beach. A long pale beach between the
 * Atlantic surf and the rainforest edge, lagoons behind the dunes, bleached
 * driftwood, and forest elephants walking out onto the sand at sunset. */
const sand=earth('#e8d6b0','#d0b88a','#9a8058',{set:'sandstone-cliff',tint:'#fff2dc',repeat:.4},{rough:.06});
const forest=earth('#4f6a32','#5a4a38','#2e2620',{set:'mossy-rock',tint:'#d0d6c0',repeat:.5});
export const environment=africaEnvironment({
 code:'GAB',id:'africa-ga',name:'gabon-loango-environment',
 representation:'A fictional beach course inspired by Loango National Park. Wild animals must be watched from a distance; the patrol, logs and raft are game devices.',
 lighting:{background:'#f0d0b4',exposure:1.06,sun:'#ffc890',sunIntensity:2.9,sky:'#f6e2cc',ground:'#2e2620',hemisphere:1.2,rim:'#ffb070',rimIntensity:.8,pixelRatio:1.25,reflections:{zenith:'#7a9ac8',horizon:'#f6d0ac',ground:'#2e2620',intensity:.36}},
 sky:{zenith:'#6a8ec8',horizon:'#f8cfa4',band:'#f0c49c',glow:'#ffd0a0',sun:[.8,.15,-.55],glowPower:6},
 fog:['#f0d6bc',45,190],clouds:{opacity:.8,high:[22,32],groups:14,color:'#ffe6d0',shade:'#e8b898'},
 layers:['beach-driftwood-and-lagoon','loango-beach','forest-elephants-on-sand','lagoon','coastal-rainforest','sky'],
 backdrop:[{kind:'sea',name:'atlantic-surf',y:-3,z:-90,depth:170,shallow:'#5aa8b0',deep:'#1f5a80'},{kind:'forest',name:'coastal-rainforest',z:[-40,-26],y:-1.4,flora:['forest-giant','oil-palm'],count:40,scale:[.8,1.1]}],
 floor:{kind:'water',y:-2.8,shallow:'#6a9a90',deep:'#2e5a5a',name:'lagoon',opacity:.92},
 palettes:{default:sand,'coastal-forest':forest,'forest-camp':forest,'forest-roots':forest,'mangrove-roots':forest},
 deck:{wood:'#a89a88',woodAlt:'#8a7c6a',rope:'#c9b07a',stone:'#d0b88a',stoneAlt:'#9a8058',metal:'#4a4a4a',accent:'#009e60'},
 decks:{'palm-raft':'raft'},
 capFlora:{default:null,'coastal-forest':'cocoa-shrub','forest-camp':'savanna-grass','dune-trail':'savanna-grass'},
 flora:[{kind:'oil-palm',count:12,z:[-18,-12],y:-1.4,sway:.04},{kind:'mangrove',count:10,z:[-8,-4],y:-2.8}],
 flocks:[{count:6,y:10,z:-22,color:'#f4f4f0',wing:'#2a2a2a',size:.6,glide:true,name:'terns'}],
 hazardPalette:{column:'#f2fbfb',base:'#9a8f7a',warning:'#ffd27a',debris:'#f6fbfb'},
 creature:{name:'red-river-hog',height:.7,shell:'#b8603a',belly:'#e8b090',foot:'#3a2a1e',crest:'ears',accent:'#f2ece0'},
 crate:{body:'wood',color:'#009e60',trim:'#fcd116',glyph:'#3a75c4'},
 checkpoint:{pole:'#6b4b2e',cloth:'#009e60',accent:'#fcd116',cap:'#3a75c4'},
 finishArch:{style:'jungle',stone:'#5a4a38',trim:'#3a5a2a'},
 landmarks(api){
  const {finish,low}=api,r=random(1147);
  const beach=api.group('loango-beach');createShoreFoam(beach,Array.from({length:low?12:26},(_,i)=>({x:-8+i*5,y:-2.9,z:-14-r()*4,size:1.6})),low);
  built(beach,'beach-strand',b=>{b.add(new T.BoxGeometry(finish+40,.4,8),'#e8d6b0',[finish/2,-2.8,-11]);},2);
  const elephants=api.group('forest-elephants-on-sand'),walkers=new T.Group();walkers.name='beach-walkers';elephants.add(walkers);
  built(walkers,'sunset-elephants',b=>{for(let i=0;i<4;i++)elephantFigure(b,i*6,-2.6,-11-(i%2)*1.5,.75,'#6a6460');},3);
  api.animate({update:t=>{walkers.position.x=20+((t*.4)%(finish*.6));},motion:true,setVisible:v=>{walkers.visible=v;}});
  const lagoon=api.group('lagoon');built(lagoon,'hippo-heads',b=>{for(let i=0;i<3;i++){const x=40+i*14+r()*4;b.add(new T.SphereGeometry(.6,10,8),'#6a5a62',[x,-2.8,-6],[0,0,0],[1.4,.5,.9]);for(const s of [-1,1])b.add(new T.SphereGeometry(.1,6,4),'#5a4a52',[x+.3,-2.4,-6+s*.3]);}},4);
  const wood=api.group('driftwood');built(wood,'bleached-logs',b=>{for(let i=0;i<(low?6:14);i++)b.add(new T.CylinderGeometry(.25,.32,3+r()*4,8).rotateZ(Math.PI/2),'#c8bca8',[r()*finish,-2.55,-9-r()*4],[0,r()*3,0]);},5);
  plantAfrica(api.group('coastal-palms'),'oil-palm',Array.from({length:low?4:8},()=>({x:r()*finish,y:-1.6,z:-17-r()*4,scale:1})),{low,name:'palm-line'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='driftwood'){built(root,'bobbing-driftwood',b=>{b.add(new T.CylinderGeometry(.45,.5,definition.width+.4,10).rotateZ(Math.PI/2),'#c8bca8',[0,-.45,0],[0,0,0],[1,1,1.4],.06);b.add(new T.CylinderGeometry(.06,.08,1,5),'#a89a88',[definition.width/2-.3,-.1,-.6],[.6,0,0]);},api.seed);return true;}
  return false;
 },
});
