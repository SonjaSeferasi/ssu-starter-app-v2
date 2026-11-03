import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Equatorial Guinea — Bioko: The Crater Lake. A still lake in a crater
 * lined with moss-hung forest and tree ferns, cloud spilling over the rim,
 * and the high cone of Pico Basilé beyond. */
const moss=earth('#4f7a3a','#3e4a36','#1e2a1a',{set:'mossy-rock',tint:'#c8d8b8',repeat:.5},{rough:.2});
const shore=earth('#6a6a4a','#4a4a3a','#2a2a22',{set:'mossy-rock',tint:'#d0d4c0',repeat:.5});
/** A tree fern: slim scaly trunk and a crown of long arching fronds. */
function treeFern(b:Builder,x:number,y:number,z:number,h:number,r:()=>number){
 b.add(new T.CylinderGeometry(.14,.22,h,7),'#4a3a2a',[x,y+h/2,z],[0,0,0],[1,1,1],.1);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2+r()*.3,mid=v3(x+Math.cos(a)*1,y+h+.5,z+Math.sin(a)*.8),tip=v3(x+Math.cos(a)*2,y+h-.4,z+Math.sin(a)*1.6);b.strut(v3(x,y+h,z),mid,.05,'#3a6a2a',4).strut(mid,tip,.04,'#4a7a32',4);b.add(new T.BoxGeometry(1.8,.02,.5),i%2?'#3f7a2f':'#4f8a3a',[(x+tip.x)/2+Math.cos(a)*.2,y+h+.1,(z+tip.z)/2],[0,-a,-.15]);}
}
export const environment=africaEnvironment({
 code:'GNQ',id:'africa-gq',name:'equatorial-guinea-bioko-environment',
 representation:'A fictional crater course inspired by the highlands of Bioko Island. The raised logs and climbing wall are game devices.',
 lighting:{background:'#b4c4c0',exposure:1.02,sun:'#f6f0dc',sunIntensity:2.6,sky:'#dfe8e2',ground:'#1e2a1a',hemisphere:1.45,rim:'#d8f0e0',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#7a9ab0',horizon:'#dae2dc',ground:'#1e2a1a',intensity:.34}},
 sky:{zenith:'#7a9cbc',horizon:'#dce4de',band:'#c8d6d0',glow:'#f4f2e0',sun:[-.4,.5,-.7],glowPower:10},
 fog:['#cfdcd6',35,160],clouds:{opacity:.95,high:[18,28],lowBand:[-2,4],groups:20,shade:'#c0ccc8'},
 layers:['ferns-rim-logs-and-wall','crater-lake','mossy-crater-wall','tree-ferns','pico-basile','sky'],
 backdrop:[{kind:'range',name:'pico-basile',z:-160,y:-8,height:44,peaks:2,rock:'#4a4a42',forest:'#2f4a2a',grass:'#5a6a42',treeLine:34,sharpness:1.3,depth:60}],
 floor:{kind:'water',y:-3,shallow:'#4a6a62',deep:'#1a3430',name:'crater-lake',opacity:.95},
 palettes:{default:moss,'lake-shore':shore,'floating-log':shore},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#4f7a3a',stoneAlt:'#3e4a36',metal:'#4a4a4a',accent:'#3e9a00'},
 capFlora:{default:null,'forest-trail':'banana','crater-rim':'savanna-grass','basile-ridge':'savanna-grass'},
 flora:[{kind:'forest-giant',count:14,z:[-26,-14],y:-3,scale:[.7,1]}],
 flocks:[{count:4,y:14,z:-20,color:'#3a3a3a',wing:'#c8c8c8',size:.7,name:'turacos'}],
 drift:{kind:'mist',count:20,colors:['#eef4f0'],y:[-2,6],z:[-12,-2],fall:-.02,sway:2.2,size:2.4,name:'crater-cloud'},
 creature:{name:'bioko-drill',height:.75,shell:'#4a3e34',belly:'#c8b8a8',foot:'#2a221e',crest:'ears',accent:'#d8402a'},
 crate:{body:'wood',color:'#3e9a00',trim:'#e32118',glyph:'#ffffff'},
 checkpoint:{pole:'#5a4028',cloth:'#3e9a00',accent:'#ffffff',cap:'#e32118'},
 finishArch:{style:'jungle',stone:'#3e4a36',trim:'#3e9a00'},
 mechanisms:{stone:'#4f7a3a',stoneDark:'#1e2a1a',trim:'#c9b07a',glow:'#b8ff8a',metal:'#4a4a4a'},
 landmarks(api){
  const {finish,low,level}=api,r=random(3011);
  const lake=api.group('crater-lake');built(lake,'lily-pads',b=>{for(let i=0;i<20;i++)b.add(new T.CylinderGeometry(.3+r()*.3,.3,.02,10),'#4a7a3a',[30+r()*40,-2.98,-3-r()*10]);},3);
  const wall=api.group('mossy-crater-wall');
  built(wall,'crater-bowl',b=>{const g=new T.CylinderGeometry(42,46,18,low?28:48,1,true,Math.PI*.1,Math.PI*.8);g.rotateY(Math.PI);b.add(g,'#3e5a32',[finish*.55,2,-18],[0,0,0],[1,1,.45],.12);for(let i=0;i<30;i++)b.strut(v3(20+r()*60,8+r()*6,-14-r()*6),v3(20+r()*60,2+r()*4,-14-r()*6),.04,'#6a8a4a',3);},4,.95);
  const ferns=api.group('tree-ferns');built(ferns,'fern-stands',b=>{for(let i=0;i<(low?8:18);i++)treeFern(b,r()*finish,-3,-5-r()*8,3+r()*3,r);for(const p of level.platforms)if(p.style==='tree-fern')treeFern(b,p.x+p.width/2,-6,-.2,p.y+5.4,r);},5);
  const drills=api.group('drill-monkeys');built(drills,'drill-troop',b=>{for(let i=0;i<3;i++){const x=finish-14+i*2.6;b.add(new T.SphereGeometry(.4,8,6),'#3e342c',[x,3.6,-4]).add(new T.SphereGeometry(.24,8,6),'#1a1410',[x+.3,4,-4]).add(new T.BoxGeometry(.06,.18,.12),'#d8402a',[x+.5,3.9,-4]);}},6);
  plantAfrica(ferns,'banana',[{x:2,y:0,z:-3,scale:1}],{low,name:'trail-banana'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='tree-fern'){built(root,'fern-crown-perch',b=>{b.add(new T.CylinderGeometry(definition.width/2,definition.width/2-.2,.3,10),'#3f6a2f',[0,-.15,0]);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;b.add(new T.BoxGeometry(1.6,.03,.4),'#4f8a3a',[Math.cos(a)*1.4,-.25,Math.sin(a)*1.1-.3],[0,-a,-.25]);}},api.seed);return true;}
  if(definition.style==='floating-log'){built(root,'fallen-crater-log',b=>{b.add(new T.CylinderGeometry(.4,.45,definition.width+.4,10).rotateZ(Math.PI/2),'#5a4a3a',[0,-.38,0],[0,0,0],[1,1,1.6],.06);for(let i=0;i<4;i++)b.add(new T.SphereGeometry(.18,6,4),'#5f8a3a',[-definition.width/2+.4+i*.7,.02,-.6],[0,0,0],[1,.4,1]);},api.seed);return true;}
  return false;
 },
});
