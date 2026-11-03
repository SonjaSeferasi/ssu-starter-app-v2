import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Mauritania — Iron Ore Train: Across the Sahara. A single track through
 * the sand sea, trains of rust-red ore wagons, the mine's loading gantry,
 * and on the horizon the concentric rings of the Richat Structure. */
const sand=earth('#e6b47c','#c88f58','#8f5e38',{set:'sandstone-cliff',tint:'#f8dcc0',repeat:.4},{rough:.1,strata:.9});
const ore=earth('#7a4a3a','#6a3a2a','#3e221a',{set:'savanna-rock',tint:'#d8b0a0',repeat:.5});
function oreWagon(b:Builder,x:number,y:number,z:number,w:number){
 b.add(new T.BoxGeometry(w,1.4,2.2),'#7a3a24',[x,y-.75,z],[0,0,0],[1,1,1],.05);for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.06,1.4,2.24),'#5a2a1a',[x-w/2+.3+i*(w-.6)/3,y-.75,z]);
 b.add(new T.BoxGeometry(w*.9,.3,1.9),'#3e221a',[x,y-.05,z]);for(let i=0;i<5;i++)b.add(new T.DodecahedronGeometry(.32,0),'#4a2a1e',[x-w*.35+i*w*.17,y+.05,z+(i%2?.3:-.3)]);
 for(const s of [-1,1])for(const sz of [-1,1])b.add(new T.CylinderGeometry(.32,.32,.18,12).rotateX(Math.PI/2),'#2a2a2a',[x+s*w*.32,y-1.6,z+sz*.9]);
}
export const environment=africaEnvironment({
 code:'MRT',id:'africa-mr',name:'mauritania-ore-train-environment',
 representation:'A fictional course along the Mauritania Railway. Riding on ore wagons is dangerous and is only a game device here; the Richat Structure is shown far beyond the line for scale and setting.',
 lighting:{background:'#f0dcc0',exposure:1.07,sun:'#fff0d4',sunIntensity:3.4,sky:'#f6ead8',ground:'#8f5e38',hemisphere:1.2,rim:'#ffe0b0',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#9ab8d6',horizon:'#f2dcc0',ground:'#8f5e38',intensity:.24}},
 sky:{zenith:'#8fb2d6',horizon:'#f4e0c2',band:'#eed8bc',glow:'#fff2d8',sun:[-.4,.65,-.6],glowPower:14},
 fog:['#f0dcc0',55,210],clouds:false,
 layers:['ore-trains-and-dunes','saharan-railway','ore-loader','richat-structure','sand-sea','sky'],
 backdrop:[{kind:'dunes',name:'sand-sea',z:-120,y:-6,height:16,colors:['#d8945a','#e8b076','#f4cc96'],crests:7,depth:90},{kind:'dunes',name:'near-dunes',z:-50,y:-5,height:6,colors:['#dea068','#ecba80','#f6d0a0'],crests:10,depth:30}],
 floor:{kind:'land',y:-4,colors:['#d89a60','#e6b47c','#f0c890'],name:'track-bed-sand',rough:1.2},
 palettes:{default:sand,'mine-station':ore,'depot':ore,'port-quay':earth('#b9b4a8','#8f8a80','#5a5650',{set:'coastal-rock',tint:'#e8e4dc',repeat:.5})},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#c88f58',stoneAlt:'#8f5e38',metal:'#4a4a4a',accent:'#d21034'},
 capFlora:{default:null,'dune-hump':'savanna-grass'},
 flora:[{kind:'thorn-scrub',count:12,z:[-16,-6],y:-4}],
 drift:{kind:'dust',count:36,colors:['#f6d0a0','#e8b880'],y:[0,8],z:[-4,3],fall:-.01,sway:3,size:.08,name:'blowing-sand'},
 banners:[{platform:'mr-signal',offset:6,colors:['#00a95c']},{platform:'mr-dune-3',offset:1.5,colors:['#d21034']}],
 creature:{name:'fennec-fox',height:.6,shell:'#e8c890',belly:'#f6ecd8',foot:'#c8a070',crest:'ears',accent:'#e8c890'},
 crate:{body:'metal',color:'#7a3a24',trim:'#3e221a',glyph:'#ffd890'},
 checkpoint:{pole:'#4a4a4a',cloth:'#00a95c',accent:'#ffd700',cap:'#d21034'},
 finishArch:{style:'iron',stone:'#7a3a24',trim:'#3e221a'},
 landmarks(api){
  const {finish,low,features}=api,r=random(704);
  // The Richat Structure: concentric rings of ridges far out in the desert.
  const richat=api.group('richat-structure');
  built(richat,'concentric-ridges',b=>{for(let i=0;i<5;i++){const ring=new T.TorusGeometry(26+i*12,1.6+i*.3,6,low?40:72);ring.rotateX(Math.PI/2);b.add(ring,i%2?'#a8683e':'#c88a52',[finish*.55,-6+i*.2,-230],[0,0,0],[1,.5,.42]);}},3,.98);
  // The line: rails, sleepers and a long ore train standing on a siding.
  const line=api.group('saharan-railway');
  built(line,'iron-ore-train',b=>{for(const z of [-5.6,-6.6])b.add(new T.BoxGeometry(finish+60,.12,.1),'#6a6a6a',[finish/2,-3.7,z]);for(let x=-30;x<finish+30;x+=.9)b.add(new T.BoxGeometry(.22,.12,1.6),'#5a4028',[x,-3.82,-6.1]);for(let i=0;i<(low?10:22);i++)oreWagon(b,-20+i*4.6,-1.9,-6.1,4.2);b.add(new T.BoxGeometry(6,3,2.6),'#2f5a8a',[-26,-2.2,-6.1]);b.add(new T.BoxGeometry(2,1.4,2.4),'#2f5a8a',[-24,.0,-6.1]);},5,.9);
  // The loading gantry over the first train at the mine.
  const loader=api.group('ore-loader'),l=api.platform('mr-loader');
  built(loader,'loading-gantry',b=>{for(const x of [l.x-1,l.x+l.width+8])for(const z of [-1.8,-4])b.add(new T.BoxGeometry(.3,9,.3),'#8a8a8a',[x,1,z]);b.add(new T.BoxGeometry(l.width+9.6,.6,2.8),'#7a7a7a',[l.x+l.width/2+3.5,5.6,-2.9]);b.add(new T.CylinderGeometry(.9,.4,1.6,10),'#5a5a5a',[l.x+l.width+4,4.4,-2.9]);b.add(new T.ConeGeometry(4,5,10),'#6a3a2a',[l.x-8,-1.5,-9]);},6);
  // Scattered acacias along the wadis the line crosses.
  plantAfrica(features,'umbrella-acacia',Array.from({length:low?3:7},()=>({x:r()*finish,y:-4,z:-14-r()*14,scale:.7+r()*.4})),{low,name:'wadi-acacias'});
  void v3;
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='ore-wagon'){built(root,'riding-ore-wagon',b=>{oreWagon(b,0,0,0,w);},api.seed);return true;}
  if(style==='ore-loader'||style==='signal-platform'){built(root,style,b=>{b.add(new T.BoxGeometry(w,.3,2.4),'#6a6a6a',[0,-.15,0]);for(const x of [-w/2+.3,w/2-.3])b.add(new T.BoxGeometry(.3,6,.3),'#8a8a8a',[x,-3.2,-.6]);for(let x=-w/2;x<w;x+=1.2)b.add(new T.BoxGeometry(.04,.9,.04),'#d9a23a',[x,.45,-1.1]);b.add(new T.BoxGeometry(w,.04,.04),'#d9a23a',[0,.9,-1.1]);if(style==='signal-platform'){b.add(new T.CylinderGeometry(.08,.08,3,6),'#3a3a3a',[w/2-.6,1.5,-1.3]);b.add(new T.BoxGeometry(.5,.9,.3),'#2a2a2a',[w/2-.6,3,-1.3]);b.add(new T.SphereGeometry(.12,8,6),'#e83a2a',[w/2-.6,3.2,-1.12]);}},api.seed);return true;}
  if(style==='ore-heap'){built(root,'spilled-ore',b=>{b.add(new T.ConeGeometry(w*.7,1.4,9),'#4a2a1e',[0,-.7,0]);},api.seed);return true;}
  return false;
 },
});
