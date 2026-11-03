import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {boat} from './architecture';
import {plantAfrica} from './flora';
import {random} from '../../kit/common';

/** Republic of the Congo — Congo River: The Brazzaville Rapids. A vast
 * brown river breaking white over dark rocks, a riverside quay, a barge,
 * floating islands of water hyacinth, and the Brazzaville skyline with its
 * tall cylindrical tower and the green roofs of the basilica. */
const rock=earth('#4a4440','#3a3430','#1e1a18',{set:'gneiss',tint:'#c8c4bc',repeat:.5},{rough:.24});
const quay=earth('#a8a090','#8a8274','#5a544a',{set:'ashlar',tint:'#e8e2d6',repeat:.65},{rough:.04});
const bank=earth('#5a6a32','#6a5440','#3a2e22',{set:'mossy-rock',tint:'#d0d6c0',repeat:.5});
export const environment=africaEnvironment({
 code:'COG',id:'africa-cg',name:'congo-rapids-environment',
 representation:'A fictional river crossing inspired by the rapids of the Congo River at Brazzaville. The skyline is a simplified study; the barge, the waves and the route are game devices.',
 lighting:{background:'#c4ccc6',exposure:1.03,sun:'#fff0d2',sunIntensity:2.9,sky:'#e8ece4',ground:'#3a2e22',hemisphere:1.35,rim:'#ffe8c8',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#7a9ab8',horizon:'#e4e6dc',ground:'#3a2e22',intensity:.34}},
 sky:{zenith:'#7098c0',horizon:'#e6e6da',band:'#d2dad2',glow:'#fff2d6',sun:[-.5,.55,-.6],glowPower:13},
 fog:['#dadfd8',45,190],clouds:{opacity:.9,high:[22,34],groups:16},
 layers:['quay-rocks-barge-and-island','congo-river','standing-waves','brazzaville-skyline','far-bank-forest','sky'],
 backdrop:[{kind:'sea',name:'congo-river',y:-3.2,z:-80,depth:150,shallow:'#8a7a5a',deep:'#4a3e2e'},{kind:'forest',name:'far-bank-forest',z:[-130,-110],y:-2.6,flora:['forest-giant','oil-palm'],count:36,scale:[1,1.3]}],
 floor:{kind:'water',y:-3.2,shallow:'#8a7a58',deep:'#4a3e2c',name:'rapids-water',opacity:.95},
 palettes:{default:rock,'river-quay':quay,'quay-steps':quay,'corniche':quay,'corniche-stairs':quay,'river-island':bank,'south-bank':bank},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#4a4440',stoneAlt:'#3a3430',metal:'#5a6a6a',accent:'#009543'},
 decks:{'river-barge':'dock'},
 capFlora:{default:null,'river-island':'banana','south-bank':'savanna-grass'},
 flora:[{kind:'oil-palm',count:10,z:[-12,-6],y:-2.4,sway:.03}],
 flocks:[{count:7,y:12,z:-22,color:'#f4f4f0',wing:'#2a2a2a',size:.55,name:'pied-kingfishers'}],
 hazardPalette:{column:'#f4f0e6',base:'#5a4a3a',warning:'#ffd27a',debris:'#f6f2ea'},
 creature:{name:'river-crab',height:.5,shell:'#6a4a3a',belly:'#c8a08a',foot:'#3a2a1e',crest:'antennae',accent:'#6a4a3a'},
 crate:{body:'wood',color:'#009543',trim:'#fbde4a',glyph:'#dc241f'},
 checkpoint:{pole:'#5a4028',cloth:'#009543',accent:'#fbde4a',cap:'#dc241f'},
 finishArch:{style:'harbor',stone:'#a8a090',trim:'#009543'},
 landmarks(api){
  const {finish,low,features}=api,r=random(4700);
  const waves=api.group('standing-waves');createShoreFoam(waves,Array.from({length:low?16:36},()=>({x:r()*finish,y:-3.1,z:-3-r()*20,size:1+r()*1.6})),low);
  built(waves,'rapids-rocks',b=>{for(let i=0;i<(low?12:26);i++)b.add(new T.DodecahedronGeometry(.6+r()*1.2,0),'#2e2a28',[r()*finish,-3.2,-4-r()*18],[0,r()*3,0],[1.3,.6,1]);},3);
  const hyacinth=api.group('water-hyacinth');built(hyacinth,'floating-hyacinth',b=>{for(let i=0;i<(low?6:14);i++){const x=r()*finish,z=-8-r()*20;for(let k=0;k<6;k++)b.add(new T.SphereGeometry(.4,6,4),'#4a7a3a',[x+k*.6,-3.15,z+(k%2)*.4],[0,0,0],[1,.3,1]);b.add(new T.SphereGeometry(.12,6,4),'#b89ad8',[x+1,-2.9,z]);}},4);
  // The skyline across the river: a tall cylinder tower, blocks, and the
  // basilica's steep green roofs.
  const city=api.group('brazzaville-skyline');
  built(city,'skyline',b=>{const cx=finish*.65,z=-118;b.add(new T.CylinderGeometry(3,3,34,20),'#d8dce0',[cx,14,z]);for(let i=0;i<14;i++)b.add(new T.BoxGeometry(.06,34,.06),'#5a6a7a',[cx+Math.cos(i/14*Math.PI*2)*3.02,14,z+Math.sin(i/14*Math.PI*2)*3.02]);for(let i=0;i<12;i++){const h=4+r()*10;b.add(new T.BoxGeometry(4+r()*4,h,4),r()<.5?'#e8e2d6':'#c8c0b0',[cx-40+i*7+r()*2,-3+h/2,z+2+r()*6]);}const bx=cx-22;b.add(new T.BoxGeometry(10,6,6),'#c8b8a0',[bx,0,z+4]);const roof=new T.CylinderGeometry(.01,1,1,4,1);roof.rotateY(Math.PI/4);b.add(roof,'#3a8a5a',[bx,6,z+4],[0,0,0],[7,6,4.4]);b.add(new T.ConeGeometry(1.6,9,4),'#3a8a5a',[bx-4,10,z+4],[0,Math.PI/4,0]);},2,.9);
  const barges=api.group('river-barge');built(barges,'moored-barges',b=>{boat(b,[8,-3.4,-5],7,{hull:'#4a5a6a',trim:'#c8c0b0'});boat(b,[finish-10,-3.4,-7],8,{hull:'#6a4a3a',trim:'#c8c0b0'});},5);
  plantAfrica(features,'banana',[{x:api.platform('cg-island').x+3,y:.4,z:-3,scale:1}],{low,name:'island-bananas'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='river-barge'){built(root,'shuttle-barge',b=>{b.add(new T.BoxGeometry(definition.width+.4,.9,2.6),'#4a5a6a',[0,-.45,0],[0,0,0],[1,1,1],.04);b.add(new T.BoxGeometry(definition.width,.08,2.4),'#7a6a58',[0,0,0]);b.add(new T.BoxGeometry(1.2,1.2,1),'#c8c0b0',[-definition.width/2+.7,.6,-.9]);},api.seed);return true;}
  return false;
 },
});
