import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {createCascade} from '../../kit/cascade';
import {createDrift} from '../../kit/particles';
import {random,v3} from '../../kit/common';

/** Zambia — Victoria Falls: Mosi-oa-Tunya. The Zambezi, nearly two
 * kilometres wide, drops into a single basalt slot; the spray rises like
 * smoke ("the smoke that thunders"), feeds a rainforest on the facing cliff
 * and throws rainbows. The Knife-Edge footbridge crosses into the spray,
 * and the Batoka Gorge zigzags away downstream. */
const basalt=earth('#4a4440','#3a3632','#1a1816',{set:'alpine-rock',tint:'#c8c0b8',repeat:.5},{rough:.18,strata:.4});
const wet=earth('#3a5a32','#3a3632','#1a1816',{set:'mossy-rock',tint:'#d0dcc0',repeat:.5});
const lip=earth('#6a6252','#4a4440','#24201e',{set:'alpine-rock',tint:'#d4ccc0',repeat:.5});
export const environment=africaEnvironment({
 code:'ZMB',id:'africa-zm',name:'zambia-victoria-falls-environment',
 representation:'A fictional route inspired by Victoria Falls from the Zambian side. Rocks on the lip and the gusting bridge are game devices; never walk the real lip of the falls.',
 lighting:{background:'#c4d8e0',exposure:1.05,sun:'#fff2d8',sunIntensity:3.1,sky:'#eef4f4',ground:'#1a1816',hemisphere:1.4,rim:'#e8f4ff',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#5a96cc',horizon:'#e6eeee',ground:'#1a1816',intensity:.4}},
 sky:{zenith:'#5a96cc',horizon:'#e8eeec',band:'#d4e2e4',glow:'#fff6e0',sun:[.6,.45,-.6],glowPower:15},
 fog:['#dfe8ea',35,170],clouds:{opacity:.7,high:[24,34],groups:12},
 layers:['lip-rocks-and-bridge','victoria-falls-curtain','rainbow-spray','batoka-gorge','zambezi-upstream','sky'],
 backdrop:[{kind:'sea',name:'zambezi-upstream',y:-.6,z:-60,depth:120,shallow:'#5a8a8a',deep:'#2a5a6a'},{kind:'forest',name:'spray-rainforest',z:[-14,-6],y:-2,flora:['forest-giant','oil-palm','ravenala'],count:30,scale:[.8,1.1]}],
 floor:{kind:'land',y:-14,colors:['#1a1816','#2a2622','#3a3430'],name:'gorge-depths',rough:1.4},
 palettes:{default:basalt,'spray-rainforest':wet,'falls-viewpoint':wet,'zambezi-lip':lip,'lip-shelf':lip,'devils-pool-rim':lip},
 deck:{wood:'#4a4440',woodAlt:'#3a3632',rope:'#c9b07a',stone:'#4a4440',stoneAlt:'#3a3632',metal:'#5a6a6a',accent:'#198a00'},
 decks:{'knife-edge-bridge':'suspended'},
 capFlora:{default:null,'spray-rainforest':'savanna-grass','falls-viewpoint':'savanna-grass'},
 flocks:[{count:6,y:14,z:-22,color:'#2a2a2a',wing:'#4a4a4a',size:.6,name:'trumpeter-hornbills'}],
 creature:{name:'rock-hyrax',height:.55,shell:'#6a5a4a',belly:'#c8b8a0',foot:'#2a2a22',crest:'ears',accent:'#6a5a4a'},
 crate:{body:'stone',color:'#4a4440',trim:'#198a00',glyph:'#ef7d00'},
 checkpoint:{pole:'#3a3632',cloth:'#198a00',accent:'#ef7d00',cap:'#de2010'},
 finishArch:{style:'stone',stone:'#3a3632',trim:'#198a00'},
 landmarks(api){
  const {finish,low,root}=api,r=random(260),bridge=api.platform('zm-knife-edge');
  // The curtain: a long line of falls behind the course, dropping out of sight.
  const curtain=api.group('victoria-falls-curtain');
  const falls=createCascade(curtain,{sites:Array.from({length:low?5:9},(_,i)=>({x:-10+i*(finish+20)/(low?5:9),top:-.5,bottom:-16,z:-24,width:(finish+20)/(low?5:9)*.92,spray:1.2,intensity:1})),low,name:'falls-curtain'});
  api.animate({update:t=>falls.update(t)});
  const lipG=api.group('zambezi-lip');built(lipG,'lip-rocks',b=>{for(let i=0;i<24;i++)b.add(new T.DodecahedronGeometry(.6+r()*.8,0),'#4a4440',[r()*finish,-.6,-22-r()*2]);b.add(new T.BoxGeometry(finish+40,16,6),'#2a2622',[finish/2,-9,-28]);b.add(new T.BoxGeometry(finish+40,16,4),'#2e2a26',[finish/2,-9,-10]);},3);
  const spray=api.group('rainbow-spray'),mist=createDrift(spray,{kind:'mist',count:low?20:50,colors:['#f6fbff','#eaf2f6'],x:[-10,finish+10],y:[-6,14],z:[-26,-8],fall:-.7,sway:1.6,size:2,seed:2,name:'smoke-that-thunders'});
  api.animate({update:t=>mist.update(t),setVisible:v=>mist.setVisible(v),motion:true});
  built(spray,'rainbow',b=>{const cols=['#ff4a4a','#ffa040','#fff060','#60e060','#4aa0ff','#8a5aff'];cols.forEach((c,i)=>b.add(new T.TorusGeometry(12-i*.35,.16,4,40,Math.PI),c,[bridge.x+6,-4,-18]));},4);
  const gorge=api.group('batoka-gorge');built(gorge,'zigzag-gorge',b=>{for(let i=0;i<4;i++){const x=finish-10+i*12;b.add(new T.BoxGeometry(14,18,3),'#3a3632',[x,-6,-40-i*10],[0,(i%2?.6:-.6),0]);}},5);
  const kb=api.group('knife-edge-bridge');built(kb,'bridge-railings',b=>{for(let i=0;i<=Math.round(bridge.width);i++){const x=bridge.x+i;for(const s of [-1,1])b.add(new T.CylinderGeometry(.03,.03,1.1,5),'#5a6a6a',[x,bridge.y+.55,s*.9]);}for(const s of [-1,1])b.strut(v3(bridge.x,bridge.y+1.1,s*.9),v3(bridge.x+bridge.width,bridge.y+1.1,s*.9),.03,'#5a6a6a',6);for(let i=0;i<3;i++)b.add(new T.BoxGeometry(.2,6,.2),'#3a3632',[bridge.x+2+i*4,bridge.y-3.4,0]);},6);
  void root;
 },
});
