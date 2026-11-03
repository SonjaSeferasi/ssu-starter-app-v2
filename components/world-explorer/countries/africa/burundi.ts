import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {rondavel} from './architecture';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Burundi — Gishora: The Royal Drums. On a hilltop sanctuary ringed by
 * banana groves and a sacred ficus, great drums of hollowed wood stand in
 * a semicircle; drummers in red, white and green carry them on their heads
 * and leap as they play. */
const hill=earth('#6a8a3a','#8a4e30','#4a2a1c',{set:'savanna-rock',tint:'#e8dcc0',repeat:.5},{rough:.15});
const yard=earth('#b08a5a','#8a5a3a','#4a2e1e',{set:'savanna-rock',tint:'#f0dcc0',repeat:.5});
/** A royal drum: a tall goblet of wood, skin-covered head pegged on. */
export function drum(b:Builder,x:number,y:number,z:number,h=1.6,skin='#e8d8b0'){
 b.add(new T.CylinderGeometry(.55*h/1.6,.3*h/1.6,h,14),'#6a3a22',[x,y+h/2,z],[0,0,0],[1,1,1],.04);b.add(new T.CylinderGeometry(.58*h/1.6,.58*h/1.6,.06,14),skin,[x,y+h+.03,z]);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;b.add(new T.CylinderGeometry(.02,.02,.24,4),'#3a2214',[x+Math.cos(a)*.57*h/1.6,y+h-.12,z+Math.sin(a)*.57*h/1.6]);}
 b.add(new T.TorusGeometry(.42*h/1.6,.03,5,16).rotateX(Math.PI/2),'#c8323a',[x,y+h*.55,z]);
}
function drummer(b:Builder,x:number,y:number,z:number,lift=0){
 for(const s of [-.12,.12])b.strut(v3(x+s,y+lift,z),v3(x+s,y+.9+lift,z),.06,'#4a2a1a',4);
 b.add(new T.CylinderGeometry(.24,.3,.8,8),'#e8e2d6',[x,y+1.3+lift,z]);b.add(new T.BoxGeometry(.5,.18,.36),'#c8323a',[x,y+1.55+lift,z]);b.add(new T.SphereGeometry(.17,8,6),'#4a2a1a',[x,y+1.9+lift,z]);
 for(const s of [-1,1])b.strut(v3(x,y+1.55+lift,z+s*.2),v3(x+.35,y+2.2+lift,z+s*.3),.04,'#4a2a1a',4);
}
export const environment=africaEnvironment({
 code:'BDI',id:'africa-bi',name:'burundi-royal-drums-environment',
 representation:'A fictional hilltop course inspired by the drum sanctuary of Gishora and the royal drum dance (UNESCO Intangible Heritage). Drums the player bounces on are game devices, never the sacred drums themselves.',
 lighting:{background:'#c8dce6',exposure:1.05,sun:'#fff0d0',sunIntensity:3.1,sky:'#eef4ee',ground:'#4a2a1c',hemisphere:1.35,rim:'#ffe6c0',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#5a96cc',horizon:'#e6eee8',ground:'#4a2a1c',intensity:.3}},
 sky:{zenith:'#5a98d0',horizon:'#e8eee6',band:'#d4e2dc',glow:'#fff4dc',sun:[.6,.45,-.6],glowPower:14},
 fog:['#dce6e2',50,190],clouds:{opacity:.75,high:[24,34],groups:12},
 layers:['drum-stages-and-paths','royal-drums','drum-sanctuary','sacred-ficus','banana-hills','sky'],
 backdrop:[{kind:'hills',name:'banana-hills',z:-120,y:-4,height:14,colors:['#4a8a32','#5a9a3a','#6aa646'],scale:3},{kind:'forest',name:'banana-groves',z:[-40,-14],y:-1,flora:['banana','banana','savanna-grass'],count:60,scale:[.9,1.2]}],
 floor:{kind:'land',y:-3,colors:['#6a4a2a','#7a5a32','#8a6a3a'],name:'red-earth',rough:.8},
 palettes:{default:hill,'drum-yard':yard,'drummers-circle':yard,'drum-stage':yard},
 deck:{wood:'#6a3a22',woodAlt:'#7a4a2a',rope:'#c9b07a',stone:'#8a6a4a',stoneAlt:'#7a5a3a',metal:'#4a4a4a',accent:'#ce1126'},
 capFlora:{default:'savanna-grass','drum-yard':null,'drummers-circle':null,'drum-stage':null,'banana-hill':'banana'},
 flocks:[{count:6,y:14,z:-22,color:'#4a5a6a',wing:'#c8c8c8',size:.7,glide:true,name:'crowned-cranes'}],
 creature:{name:'guinea-fowl',height:.6,shell:'#3a3a4a',belly:'#e8e8f0',foot:'#c8323a',crest:'crown',accent:'#2a6ab0'},
 crate:{body:'wood',color:'#7a4a2a',trim:'#1eb53a',glyph:'#ffffff'},
 checkpoint:{pole:'#5a3a22',cloth:'#ce1126',accent:'#ffffff',cap:'#1eb53a'},
 finishArch:{style:'timber',stone:'#7a5a3a',trim:'#ce1126'},
 landmarks(api){
  const {low}=api,r=random(257),circle=api.platform('bi-circle'),yardP=api.platform('bi-yard');
  const drums=api.group('royal-drums');built(drums,'drum-semicircle',b=>{const cx=circle.x+7,cz=-6;for(let i=0;i<(low?7:11);i++){const a=Math.PI*(1.1+.8*i/10);drum(b,cx+Math.cos(a)*4.6,circle.y,cz+Math.sin(a)*2.4+2,1.5,i===5?'#f2e8c8':'#e8d8b0');}drum(b,cx,circle.y,cz-3,2.2);},3);
  const players=new T.Group();players.name='drummers-circle';drums.add(players);built(players,'drummers',b=>{for(let i=0;i<6;i++)drummer(b,circle.x+3+i*1.6,circle.y,-2.6,i%2?.3:0);},4);
  api.animate({update:t=>{players.position.y=Math.abs(Math.sin(t*3.2))*.25;},motion:true,setVisible:v=>{players.visible=v;}});
  const sanct=api.group('drum-sanctuary');built(sanct,'sanctuary-huts',b=>{rondavel(b,[yardP.x+2,yardP.y,-9],1.6,{wall:'#a8865a',thatch:'#c8a862'});rondavel(b,[yardP.x+6.4,yardP.y,-11],2,{wall:'#a8865a',thatch:'#b8984e'});for(let i=0;i<16;i++)b.add(new T.CylinderGeometry(.06,.06,1.4,5),'#5a3a22',[yardP.x-2+i*.9,yardP.y+.7,-6.2]);},5);
  const ficus=api.group('sacred-ficus'),f=api.platform('bi-ficus');built(ficus,'ficus-tree',b=>{const x=f.x+f.width/2,y=f.y;b.strut(v3(x,y-6,-3.4),v3(x,y+5,-3.6),.7,'#6a5a42',10);for(let i=0;i<6;i++)b.strut(v3(x+(r()-.5)*.6,y+5,-3.6),v3(x+(r()-.5)*6,y+7+r()*2,-3.6+(r()-.5)*3),.2,'#6a5a42',6);for(let i=0;i<7;i++)b.add(new T.SphereGeometry(2+r(),10,8),'#3a6a2a',[x+(r()-.5)*7,y+8+r()*2,-3.8+(r()-.5)*3],[0,0,0],[1.2,.7,1]);for(let i=0;i<6;i++)b.add(new T.CylinderGeometry(.03,.03,4,4),'#7a6a52',[x-2+i*.8,y+3,-3]);},6,.95);
  plantAfrica(sanct,'banana',Array.from({length:low?4:9},()=>({x:yardP.x-10+r()*30,y:yardP.y-1,z:-12-r()*6,scale:1})),{low,name:'sanctuary-bananas'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='royal-drum'){built(root,'bounce-drum',b=>{drum(b,0,-1.9,0,1.9);},api.seed);return true;}
  return false;
 },
});
