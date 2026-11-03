import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {elephantFigure} from './shared-props';
import {plantAfrica} from './flora';
import {createWaterSurface} from '../../kit/water';
import {random,v3,type Builder} from '../../kit/common';

/** Botswana — the Okavango Delta. Crystal-clear channels winding through
 * papyrus and water lilies, islands crowned by palms and termite mounds,
 * dugout mokoro poled by a standing guide, elephants wading and red lechwe
 * splashing across the floodplain, and the head of a hippo in the deeps. */
const sand=earth('#e8dcc0','#c8b48e','#7a6a4e',{set:'sandstone-cliff',tint:'#fff4e0',repeat:.4},{rough:.06});
const grass=earth('#8aa04a','#8a7046','#4a3a26',{set:'savanna-rock',tint:'#eee8c0',repeat:.5});
function mokoro(b:Builder,x:number,y:number,z:number,len=4,poler=true){
 b.add(new T.CylinderGeometry(.35,.35,len,10,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI),'#5a3e26',[x,y,z],[0,0,0],[1,1,.8]);
 if(poler){b.add(new T.CylinderGeometry(.18,.22,1.2,8),'#c8323a',[x+len/2-.6,y+.7,z]).add(new T.SphereGeometry(.16,8,6),'#3a2a1e',[x+len/2-.6,y+1.45,z]);b.strut(v3(x+len/2-.4,y+3,z),v3(x+len/2+.2,y-.8,z),.03,'#8a7a5a',4);}
}
export const environment=africaEnvironment({
 code:'BWA',id:'africa-bw',name:'botswana-okavango-environment',
 representation:'A fictional channel crossing inspired by the Okavango Delta. Lily pads that hold a person, the monitor patrol and the routes are game devices; the wildlife is shown at a distance.',
 lighting:{background:'#c8e0e8',exposure:1.06,sun:'#ffe8bc',sunIntensity:3.2,sky:'#f0f4ea',ground:'#4a3a26',hemisphere:1.35,rim:'#ffd8a0',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#4a96d0',horizon:'#ece8d4',ground:'#4a3a26',intensity:.44}},
 sky:{zenith:'#4a94d4',horizon:'#f0e6cc',band:'#d8e4dc',glow:'#ffe8bc',sun:[.7,.3,-.6],glowPower:10},
 fog:['#e4e8da',55,210],clouds:{opacity:.6,high:[24,34],groups:10},
 layers:['mokoros-lilies-and-islands','delta-wildlife','papyrus-islands','okavango-channels','floodplain','sky'],
 backdrop:[{kind:'forest',name:'papyrus-islands',z:[-40,-10],y:-1.4,flora:['papyrus','papyrus','borassus-palm','savanna-grass'],count:90,scale:[.9,1.3]},{kind:'hills',name:'floodplain',z:-130,y:-2,height:2,colors:['#8aa04a','#9aae56','#aabc62'],scale:3}],
 floor:{kind:'water',y:-1.5,shallow:'#7ab8a8',deep:'#3a7a7a',name:'okavango-channels',opacity:.86},
 palettes:{default:grass,'sand':sand,'mokoro-landing':sand,'papyrus-island':sand,'sand-bank':sand},
 deck:{wood:'#5a3e26',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#8a7a5a',stoneAlt:'#7a6a4a',metal:'#4a4a4a',accent:'#75aadb'},
 decks:{mokoro:'raft','lily-pad':'raft'},
 capFlora:{default:'savanna-grass','papyrus-island':'papyrus','termite-island':null},
 flocks:[{count:10,y:10,z:-20,color:'#f4f4f0',wing:'#2a2a2a',size:.6,glide:true,name:'african-jacanas'},{count:4,y:18,z:-24,color:'#3a2a20',wing:'#f4f4f0',size:.9,glide:true,name:'fish-eagles'}],
 creature:{name:'water-monitor',height:.55,shell:'#4a5a3a',belly:'#d8c88a',foot:'#2a2a1e',crest:'spines',accent:'#d8c88a'},
 crate:{body:'wood',color:'#6b4b2e',trim:'#75aadb',glyph:'#ffffff'},
 checkpoint:{pole:'#5a3e26',cloth:'#75aadb',accent:'#ffffff',cap:'#000000'},
 finishArch:{style:'timber',stone:'#7a6a4a',trim:'#75aadb'},
 landmarks(api){
  const {finish,low,features}=api,r=random(72),island=api.platform('bw-island');
  const channels=api.group('okavango-channels-clear');const surf=createWaterSurface(channels,{x:finish/2,y:-1.45,z:-5,width:finish+60,depth:14,shallow:'#8ac8b4',deep:'#3a7a7a',opacity:.8,flow:[.05,0],seed:8});void surf;
  const lilies=api.group('water-lilies');built(lilies,'lily-pads',b=>{for(let i=0;i<(low?24:60);i++){const x=r()*finish,z=-2-r()*10;b.add(new T.CylinderGeometry(.35+r()*.25,.35+r()*.25,.03,10,1,false,0,Math.PI*1.85),'#3a7a32',[x,-1.42,z],[0,r()*6,0]);if(r()<.3)b.add(new T.ConeGeometry(.12,.18,6),r()<.5?'#e8e0f4':'#9a9ae8',[x,-1.3,z]);}},3);
  const boats=api.group('mokoro-canoes'),fleet=new T.Group();fleet.name='poled-mokoros';boats.add(fleet);built(fleet,'mokoro-fleet',b=>{for(let i=0;i<(low?2:4);i++)mokoro(b,i*14,0,-(6+i*2.4),4);},4);
  fleet.position.set(0,-1.45,0);api.animate({update:t=>{fleet.position.x=-10+((t*.7)%(finish+20));},motion:true,setVisible:v=>{fleet.visible=v;}});
  const wild=api.group('delta-wildlife');built(wild,'elephants-and-lechwe',b=>{elephantFigure(b,finish-14,-1.6,-14,1.1);elephantFigure(b,finish-8,-1.6,-16,.7);for(let i=0;i<(low?3:6);i++){const x=20+r()*30,z=-12-r()*4;b.add(new T.SphereGeometry(.4,8,6),'#b8642e',[x,-.6,z],[0,0,0],[1.5,.8,.7]);b.add(new T.SphereGeometry(.16,8,6),'#b8642e',[x+.6,-.2,z]);for(const s of [-1,1])b.strut(v3(x+.6,-.1,z+s*.06),v3(x+.4,.5,z+s*.18),.025,'#2a2420',3);}const hx=finish*.55;b.add(new T.SphereGeometry(.7,10,8),'#6a5a5a',[hx,-1.5,-9],[0,0,0],[1.4,.5,1]);for(const s of [-1,1])b.add(new T.SphereGeometry(.14,6,4),'#6a5a5a',[hx+.6,-1.15,-9+s*.3]);},5);
  plantAfrica(features,'papyrus',Array.from({length:low?8:18},()=>({x:island.x+r()*island.width,y:0,z:-2.4-r()*1.4,scale:1})),{low,name:'island-papyrus'});
  const t=api.platform('bw-termite');built(features,'termite-mound-palm',b=>{b.add(new T.ConeGeometry(1.4,4,9),'#a8643e',[t.x+t.width/2,t.y+1.6,-2.6]);},6);
  plantAfrica(features,'borassus-palm',[{x:t.x+t.width/2+1.4,y:t.y,z:-3,scale:1}],{low,name:'island-palm'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='mokoro'){built(root,'ride-mokoro',b=>{mokoro(b,0,-.25,0,definition.width+.6,false);b.add(new T.BoxGeometry(definition.width,.08,.6),'#7a5a38',[0,-.04,0]);},api.seed);return true;}
  if(definition.style==='lily-pad'){built(root,'giant-lily',b=>{b.add(new T.CylinderGeometry(definition.width/2,definition.width/2,.12,20,1,false,0,Math.PI*1.9),'#3a8a32',[0,-.06,0]);b.add(new T.TorusGeometry(definition.width/2,.06,5,24),'#2a6a26',[0,-.02,0],[Math.PI/2,0,0]);b.add(new T.ConeGeometry(.2,.3,6),'#f2e8f8',[definition.width/4,.15,-.4]);},api.seed);return true;}
  return false;
 },
});
