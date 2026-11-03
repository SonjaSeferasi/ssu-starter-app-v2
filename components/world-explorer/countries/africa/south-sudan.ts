import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {rondavel} from './architecture';
import {plantAfrica} from './flora';
import {createWaterSurface} from '../../kit/water';
import {random,v3,type Builder} from '../../kit/common';

/** South Sudan — The Sudd: Floating Papyrus. One of the world's largest
 * wetlands: islands of papyrus that drift on the White Nile, open channels
 * between them, a cattle camp of long-horned Ankole-type cattle and smoke
 * on the bank, and the shoebill standing motionless in the reeds. */
const bank=earth('#6a7a3a','#7a5e3e','#4a3a26',{set:'mossy-rock',tint:'#dfe6c4',repeat:.5},{rough:.2});
const camp=earth('#a8905a','#8a6a46','#5a4630',{set:'savanna-rock',tint:'#efe0c0',repeat:.5});
/** A long-horned cattle figure: lyre horns wider than the body. Faces +x. */
function cow(b:Builder,x:number,y:number,z:number,c:string,s=1){
 b.add(new T.SphereGeometry(.5*s,10,8),c,[x,y+.95*s,z],[0,0,0],[1.6,.85,.8]);b.add(new T.SphereGeometry(.24*s,8,6),c,[x+.85*s,y+1.1*s,z],[0,0,0],[1.4,.9,.9]);
 for(const sz of [-1,1]){b.strut(v3(x+.8*s,y+1.3*s,z),v3(x+.7*s,y+2*s,z+sz*.75*s),.05*s,'#e8dcc4',5);for(const lx of [-.5,.5])b.strut(v3(x+lx*s,y+.7*s,z+sz*.22*s),v3(x+lx*s,y,z+sz*.22*s),.06*s,c,4);}
}
export const environment=africaEnvironment({
 code:'SSD',id:'africa-ss',name:'south-sudan-sudd-environment',
 representation:'A fictional crossing of floating papyrus inspired by the Sudd wetland. Mats that sink and drift are game devices; the cattle camp is a generic study.',
 lighting:{background:'#d8dcc0',exposure:1.04,sun:'#fff0c8',sunIntensity:3,sky:'#eef0dc',ground:'#4a3a26',hemisphere:1.35,rim:'#ffe2a8',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#8ab0c8',horizon:'#e8ead4',ground:'#4a3a26',intensity:.36}},
 sky:{zenith:'#88aecc',horizon:'#ecead0',band:'#dfe2c8',glow:'#fff2cc',sun:[.55,.4,-.65],glowPower:12},
 fog:['#e2e4cc',40,170],clouds:{opacity:.7,high:[22,32],groups:12},
 layers:['papyrus-mats-and-islands','the-sudd','white-nile-channel','cattle-camp','papyrus-horizon','sky'],
 backdrop:[{kind:'forest',name:'papyrus-islands',z:[-60,-14],y:-1.8,flora:['papyrus','papyrus','savanna-grass'],count:110,scale:[.9,1.4]},{kind:'hills',name:'the-sudd',z:-140,y:-2.2,height:2.5,colors:['#6a7a3a','#7a8a46','#8a9a52'],scale:3}],
 floor:{kind:'water',y:-2,shallow:'#7a8a5a',deep:'#3a4a32',name:'white-nile-channel',opacity:.94},
 palettes:{default:bank,'cattle-camp':camp,'channel-landing':camp},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#8a7a5a',stoneAlt:'#7a6a4a',metal:'#4a4a4a',accent:'#0f47af'},
 decks:{'papyrus-mat':'raft','soft-papyrus':'raft','sunken-mat':'raft'},
 capFlora:{default:'papyrus','cattle-camp':'savanna-grass','channel-landing':'savanna-grass'},
 flocks:[{count:10,y:10,z:-20,color:'#f4f4f0',wing:'#c8c8c4',size:.6,glide:true,name:'egrets'}],
 creature:{name:'marsh-monitor',height:.55,shell:'#5a6a3a',belly:'#c8c8a0',foot:'#3a3a2a',crest:'spines',accent:'#8a9a52'},
 crate:{body:'wood',color:'#7d5a38',trim:'#0f47af',glyph:'#fcdd09'},
 checkpoint:{pole:'#5a4028',cloth:'#078930',accent:'#fcdd09',cap:'#da121a'},
 finishArch:{style:'timber',stone:'#7a6a4a',trim:'#0f47af'},
 landmarks(api){
  const {finish,low,root}=api,r=random(211),c=api.platform('ss-camp');
  const water=createWaterSurface(api.features,{x:finish/2,y:-1.95,z:-6,width:finish+60,depth:24,shallow:'#7a8a5a',deep:'#3a4a32',opacity:.9,flow:[.04,0],seed:4});void water;
  const cattle=api.group('cattle-camp');built(cattle,'camp-herd',b=>{for(let i=0;i<(low?5:10);i++)cow(b,c.x+1+r()*12,0,-4-r()*6,['#f2ece0','#8a5a3a','#3a2a22','#d8c8a8'][i%4],.9+r()*.2);for(let i=0;i<3;i++)rondavel(b,[c.x+2+i*4.4,0,-12],1.1,{wall:'#9a7a52',thatch:'#c8a862'});},3);
  const smoke=new T.Group();smoke.name='camp-smoke';cattle.add(smoke);built(smoke,'smoke-puffs',b=>{for(let i=0;i<6;i++)b.add(new T.SphereGeometry(.5+i*.25,8,6),'#d8d4cc',[c.x+6+i*.3,.5+i*1.1,-8]);},4);
  api.animate({update:t=>{smoke.position.x=Math.sin(t*.3)*.4;smoke.scale.setScalar(1+Math.sin(t*.7)*.06);},motion:true});
  // The shoebill: grey, motionless, its great clog-shaped bill.
  const bird=api.group('shoebill'),reeds=api.platform('ss-reeds');built(bird,'shoebill-figure',b=>{const x=reeds.x+reeds.width+2,y=-1.9,z=-3.6;for(const s of [-.15,.15])b.strut(v3(x+s,y,z),v3(x+s,y+1.3,z),.04,'#4a4a44',4);b.add(new T.SphereGeometry(.55,10,8),'#8a949a',[x,y+1.8,z],[0,0,.3],[1,1.3,.9]);b.add(new T.SphereGeometry(.32,10,8),'#8a949a',[x+.2,y+2.65,z]);b.add(new T.ConeGeometry(.2,.7,8).rotateZ(-Math.PI/2),'#b8a888',[x+.75,y+2.55,z],[0,0,0],[1,1,1.4]);},5);
  const island=api.platform('ss-island');plantAfrica(api.features,'papyrus',Array.from({length:low?10:24},()=>({x:island.x+r()*island.width,y:0,z:-2.2-r()*1.4,scale:1+r()*.4})),{low,name:'island-papyrus'});
  void root;
 },
});
