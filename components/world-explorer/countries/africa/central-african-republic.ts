import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {elephantFigure} from './shared-props';
import {plantAfrica} from './flora';
import {createWaterSurface} from '../../kit/water';
import {random,v3} from '../../kit/common';

/** Central African Republic — Dzanga Bai: The Elephant Clearing. A wide
 * opening in the rainforest floored with grey mud and sand, pocked with
 * mineral pools, ringed by a wall of giant trees, with forest elephants
 * digging and drinking and a timber viewing platform on stilts. */
const mud=earth('#8a8478','#6a6458','#3a362e',{set:'savanna-rock',tint:'#d8d4c8',repeat:.5},{rough:.1});
const forest=earth('#4f6a32','#5a4a38','#2e2620',{set:'mossy-rock',tint:'#d0d6c0',repeat:.5});
export const environment=africaEnvironment({
 code:'CAF',id:'africa-cf',name:'car-dzanga-bai-environment',
 representation:'A fictional course through a clearing inspired by Dzanga Bai. Real visitors watch from the platform and never enter the bai; the route, the mud and the patrol are game devices.',
 lighting:{background:'#bcccc0',exposure:1.03,sun:'#fff0d0',sunIntensity:2.8,sky:'#e4ecdf',ground:'#3a362e',hemisphere:1.4,rim:'#e8f0d0',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#7aa0b0',horizon:'#e0e6d8',ground:'#3a362e',intensity:.3}},
 sky:{zenith:'#6e9cc0',horizon:'#e2e6d6',band:'#d0dccc',glow:'#fff4d8',sun:[.5,.5,-.6],glowPower:13},
 fog:['#d6decf',40,170],clouds:{opacity:.85,high:[22,32],groups:14},
 layers:['boardwalk-mud-and-pools','dzanga-bai-clearing','forest-elephants','mineral-pools','sangha-rainforest','sky'],
 backdrop:[{kind:'forest',name:'sangha-rainforest',z:[-64,-40],y:-2,flora:['forest-giant','oil-palm'],count:46,scale:[1,1.4]}],
 floor:{kind:'land',y:-2.2,colors:['#6a6458','#7a7468','#8a8478'],name:'dzanga-bai-clearing',rough:.6},
 palettes:{default:mud,'forest-edge':forest,'sandbank':earth('#c8b48a','#a8946a','#6a5a42',{set:'sandstone-cliff',tint:'#f0e2c8',repeat:.4})},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#8a8478',stoneAlt:'#6a6458',metal:'#4a4a4a',accent:'#ffce00'},
 capFlora:{default:null,'forest-edge':'cocoa-shrub'},
 flora:[{kind:'forest-giant',count:12,z:[-34,-24],y:-2.2,scale:[.9,1.2]},{kind:'papyrus',count:10,z:[-8,-4],y:-2.2}],
 flocks:[{count:5,y:12,z:-22,color:'#2a2a2a',wing:'#f2f2f2',size:.9,glide:true,name:'african-grey-parrots'}],
 creature:{name:'young-forest-elephant',height:1.1,shell:'#7a7470',belly:'#8a8480',foot:'#5a5450',crest:'tusks',accent:'#f2ece0'},
 crate:{body:'wood',color:'#003082',trim:'#ffce00',glyph:'#d21034'},
 checkpoint:{pole:'#6b4b2e',cloth:'#003082',accent:'#ffce00',cap:'#d21034'},
 finishArch:{style:'jungle',stone:'#5a4a38',trim:'#3a5a2a'},
 landmarks(api){
  const {finish,low,features}=api,r=random(1380);
  const herd=api.group('forest-elephants'),walkers=new T.Group();walkers.name='bai-herd';herd.add(walkers);
  built(walkers,'elephant-herd',b=>{for(let i=0;i<(low?5:10);i++)elephantFigure(b,i*7+r()*3,-2.2,-10-r()*12,.7+r()*.4,i%3?'#7a7470':'#8a6a58');},3);
  api.animate({update:t=>{walkers.position.x=Math.sin(t*.04)*6;},motion:true,setVisible:v=>{walkers.visible=v;}});
  const pools=api.group('mineral-pools');for(let i=0;i<(low?3:6);i++){const w=createWaterSurface(pools,{x:10+i*18+r()*6,y:-2.1,z:-8-r()*10,width:5+r()*4,depth:3+r()*2,shallow:'#8a9a7a',deep:'#4a5a4a',segments:8,name:'mineral-pool-'+i,flow:[.01,0],repeat:.3});api.animate({update:t=>w.update(t)});}
  const mirador=api.group('viewing-platform'),m=api.platform('cf-mirador');
  built(mirador,'mirador-roof',b=>{for(const sx of [-1,1])for(const sz of [-1.2,-2.6])b.add(new T.CylinderGeometry(.09,.1,6,6),'#5a4028',[m.x+m.width/2+sx*(m.width/2-.2),m.y-1.2+1.6,sz]);const roof=new T.CylinderGeometry(.01,1,1,4,1);roof.rotateY(Math.PI/4);b.add(roof,'#b99a5a',[m.x+m.width/2,m.y+3.4,-1.9],[0,0,0],[m.width*.8,1.2,2.6]);b.add(new T.BoxGeometry(m.width,.06,.06),'#5a4028',[m.x+m.width/2,m.y+.95,-1.4]);},5);
  const bai=api.group('bai-tracks');built(bai,'elephant-tracks',b=>{for(let i=0;i<40;i++)b.add(new T.CylinderGeometry(.22,.22,.03,10),'#5a5448',[r()*finish,-2.18,-4-r()*12]);},6);
  void features;void v3;
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='mud-patch'){const d=api.landmass(root,definition,'default','island',.6);built(d,'mud-sheen',b=>{b.add(new T.BoxGeometry(w*.9,.02,1.6),'#5a5448',[0,.012,-.2]);for(let i=0;i<3;i++)b.add(new T.CylinderGeometry(.2,.2,.02,10),'#4a443a',[-w/2+.6+i*.8,.02,.3]);},api.seed);return true;}
  if(style==='viewing-platform'){built(root,'mirador-deck',b=>{b.add(new T.BoxGeometry(w,.3,2.8),'#7a5a38',[0,-.15,0]);for(const sx of [-1,1])b.add(new T.CylinderGeometry(.1,.12,4,6),'#5a4028',[sx*(w/2-.2),-2.3,1]);},api.seed);return true;}
  return false;
 },
});
