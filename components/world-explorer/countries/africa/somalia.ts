import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {dromedary} from './shared-props';
import {plantAfrica} from './flora';
import {random} from '../../kit/common';

/** Somalia — Laas Geel: The Painted Shelters. Rounded outcrops of pink
 * granite above a dry riverbed; under their overhangs, rows of painted
 * cattle with lyre horns and decorated necks in red, white and ochre;
 * camels and their herders in the valley below. */
const granite=earth('#c49a84','#a87e6a','#5e4438',{set:'gneiss',tint:'#f6e0d6',repeat:.45},{rough:.2,strata:.8});
const sand=earth('#dcc094','#c4a070','#8a6a46',{set:'sandstone-cliff',tint:'#f6e4c8',repeat:.4},{rough:.08});
export const environment=africaEnvironment({
 code:'SOM',id:'africa-so',name:'somalia-laas-geel-environment',
 representation:'A fictional route around granite outcrops inspired by Laas Geel. The painted figures are original generic studies in the style of the site, not copies; the route never touches the art.',
 lighting:{background:'#ecd8bc',exposure:1.06,sun:'#ffe0b4',sunIntensity:3.3,sky:'#f4e6d0',ground:'#5e4438',hemisphere:1.2,rim:'#ffc8a0',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#88aacc',horizon:'#f2dcbc',ground:'#5e4438',intensity:.26}},
 sky:{zenith:'#78a2cc',horizon:'#f2dcbc',band:'#ead4b6',glow:'#ffecc8',sun:[.6,.45,-.6],glowPower:11},
 fog:['#eedabe',50,190],clouds:{opacity:.4,high:[28,38],groups:6},
 layers:['bank-boulders-and-ledges','laas-geel-shelters','painted-cattle','granite-outcrops','dry-riverbed','sky'],
 backdrop:[{kind:'hills',name:'granite-outcrops',z:-90,y:-5,height:16,colors:['#a87e6a','#b88e78','#c49a84'],scale:4}],
 floor:{kind:'land',y:-4,colors:['#c4a070','#d4b080','#e2c094'],name:'dry-riverbed',rough:.6},
 palettes:{default:granite,'dry-riverbed':sand,'sliding-bank':sand},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#c49a84',stoneAlt:'#a87e6a',metal:'#4a4a4a',accent:'#4189dd'},
 capFlora:{default:null,'dry-riverbed':'savanna-grass','outcrop-summit':'aloe'},
 flora:[{kind:'umbrella-acacia',count:10,z:[-24,-10],y:-4,scale:[.8,1.1]},{kind:'thorn-scrub',count:20,z:[-10,-4],y:-4}],
 flocks:[{count:4,y:18,z:-24,color:'#2a2420',wing:'#6a5a4a',size:.9,glide:true,name:'tawny-eagles'}],
 creature:{name:'dik-dik',height:.6,shell:'#a8805a',belly:'#e8d8c0',foot:'#3a2a1e',crest:'ears',accent:'#a8805a'},
 crate:{body:'stone',color:'#c49a84',trim:'#4189dd',glyph:'#ffffff'},
 checkpoint:{pole:'#5a4028',cloth:'#4189dd',accent:'#ffffff'},
 finishArch:{style:'stone',stone:'#a87e6a',trim:'#4189dd'},
 landmarks(api){
  const {finish,low}=api,r=random(5000),sh=api.platform('so-shelter');
  const shelter=api.group('laas-geel-shelters');built(shelter,'granite-overhang',b=>{b.add(new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),'#a87e6a',[sh.x+sh.width/2,sh.y+4.4,-1.8],[Math.PI,0,0],[sh.width*.62,1.7,2.8],.06);b.add(new T.BoxGeometry(sh.width+2,5.6,1.6),'#b88e78',[sh.x+sh.width/2,sh.y+2.3,-3.2]);},3,.95);
  // Painted cattle: lyre horns, decorated necks, red and white bodies.
  const cattle=api.group('painted-cattle');built(cattle,'cattle-paintings',b=>{const wall=-2.38;for(let i=0;i<7;i++){const x=sh.x+1+i*1.15,y=sh.y+1.8+(i%2)*1.1,body=i%3?'#a8402a':'#f2ece0';b.add(new T.BoxGeometry(.8,.4,.02),body,[x,y,wall]);b.add(new T.BoxGeometry(.3,.4,.02),'#f2ece0',[x+.1,y,wall+.003]);for(const s of [-1,1])b.add(new T.TorusGeometry(.18,.025,4,8,Math.PI),'#5a2a1a',[x+.52,y+.42,wall],[0,0,s*.3]);b.add(new T.BoxGeometry(.22,.22,.02),'#5a2a1a',[x+.5,y+.18,wall]);for(let k=0;k<3;k++)b.add(new T.BoxGeometry(.18,.04,.02),'#e8c040',[x+.44,y-.02-k*.07,wall+.004]);for(const lx of [-.3,.3])b.add(new T.BoxGeometry(.05,.3,.02),body,[x+lx,y-.33,wall]);}},4);
  const outcrops=api.group('rock-domes');built(outcrops,'granite-domes',b=>{for(let i=0;i<10;i++){const s=2+r()*4;b.add(new T.SphereGeometry(s,12,8),'#b88e78',[r()*finish,-4+s*.3,-12-r()*16],[0,0,0],[1.3,.8,1]);}},5);
  const herders=api.group('camel-herders');built(herders,'camel-string',b=>{for(let i=0;i<4;i++)dromedary(b,10+i*3.4,-4,-9,i%2?'#c09060':'#a87a4a',.9);b.add(new T.CylinderGeometry(.2,.26,1.6,8),'#e8e2d6',[7,-3.2,-9]).add(new T.SphereGeometry(.18,8,6),'#3a2a1e',[7,-2.2,-9]);},6);
  plantAfrica(herders,'aloe',Array.from({length:low?3:6},()=>({x:r()*finish,y:-4,z:-5-r()*3,scale:1.1})),{low,name:'desert-aloes'});
 },
});
