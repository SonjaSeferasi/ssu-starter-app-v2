import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {cubeHouse,adobeTower} from './architecture';
import {plantAfrica} from './flora';
import {createWaterSurface} from '../../kit/water';
import {createDrift} from '../../kit/particles';
import {plantGrove} from '../../kit/vegetation';

/** Morocco — Chefchaouen: The Blue Medina. Blue-washed houses climb the
 * slope under the Rif peaks; striped awnings shade the lanes; the ochre
 * kasbah wall and the white mosque on the hill frame the end of the run. */
const blues=['#4f86c6','#6a9fd8','#3e74b8','#86b4e2','#5a93d0','#a9cbea'];
const lime=earth('#a9bccb','#6a9bd2','#3f6aa6',{set:'limestone',tint:'#c8dcf2',repeat:.6},{capMaps:{set:'paris-stone',tint:'#b9c9d6',repeat:1}});
export const environment=africaEnvironment({
 code:'MAR',id:'africa-ma',name:'morocco-chefchaouen-environment',
 representation:'A fictional rooftop course inspired by the blue medina of Chefchaouen. Houses, the kasbah wall and the hilltop mosque are simplified studies; awnings, plates and the fountain launch are game devices.',
 lighting:{background:'#a8cdf0',exposure:1.04,sun:'#fff1d8',sunIntensity:3,sky:'#e6f0fa',ground:'#55657a',hemisphere:1.35,rim:'#dbe8ff',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#4d8fd6',horizon:'#e2ecf4',ground:'#55657a',intensity:.32}},
 sky:{zenith:'#3d86d6',horizon:'#e3edf5',band:'#c9dcee',glow:'#fff4de',sun:[-.5,.55,-.7],glowPower:18},
 fog:['#d5e3ef',55,200],clouds:{opacity:.8,high:[24,34],groups:14},
 layers:['blue-rooftops-and-lanes','stacked-medina-houses','kasbah-and-mosque-hill','terraced-slopes','rif-mountains','sky'],
 backdrop:[
  {kind:'range',name:'rif-mountains',z:-150,y:-8,height:42,peaks:7,rock:'#8b8a80',forest:'#566b45',grass:'#7d8a5a',treeLine:24,depth:70},
  {kind:'hills',name:'terraced-slopes',z:-72,y:-10,height:16,colors:['#6f7d4f','#8a9460','#a5a07a']},
 ],
 floor:{kind:'land',y:-6.5,colors:['#7a8a6a','#8f9a74','#a9a284'],name:'lower-town-slope'},
 palettes:{default:lime,'plaza':earth('#b8b0a2','#6a9bd2','#3f6aa6',{set:'limestone',tint:'#c8dcf2',repeat:.6},{capMaps:{set:'paris-stone',tint:'#d2c8b8',repeat:1}}),'hill-path':earth('#9a9a6a','#a89a7c','#6f6452',{set:'savanna-rock',tint:'#e6dccb',repeat:.5})},
 deck:{wood:'#7a5a3c',woodAlt:'#8d6a45',rope:'#cdb68a',stone:'#d9cdb5',stoneAlt:'#bfb29a',metal:'#6b6f73',accent:'#c9a24a'},
 decks:{'goods-hoist':'lift'},
 capFlora:{default:null,'hill-path':'thorn-scrub'},
 flocks:[{count:7,y:18,z:-24,color:'#f2f2ee',wing:'#d8d8d2',size:.45,name:'rock-doves'}],
 creature:{name:'medina-cat',height:.7,shell:'#d08a45',belly:'#f1d2a2',foot:'#8a5a30',crest:'ears',accent:'#d08a45'},
 crate:{body:'wood',color:'#3e74b8',trim:'#c9a24a',glyph:'#ffe39a'},
 checkpoint:{pole:'#6b4b2e',cloth:'#c1272d',accent:'#006233'},
 finishArch:{style:'mughal',stone:'#f2efe8',trim:'#4f86c6',accent:'#c9a24a'},
 mechanisms:{stone:'#6a9bd2',stoneDark:'#3f6aa6',trim:'#c9a24a',glow:'#ffd27a',metal:'#8a6a3a'},
 landmarks(api){
  const {finish,r,features,staticRoot,level,low}=api;
  // Stacked blue houses climbing the slope behind the run, in rows that rise
  // with distance, each a different shade of blue or white.
  const town=api.group('blue-medina-houses');
  built(town,'medina-house-rows',b=>{for(let row=0;row<(low?4:6);row++)for(let x=-12;x<finish+14;x+=3.4+r()*1.8){const y=-4+row*2.1+Math.sin(x*.05)*1.2,z=-7-row*3.2;cubeHouse(b,[x,y,z],[2.6+r()*1.4,2.4+r()*1.4,2.4],{wall:blues[(row*3+Math.round(x))%blues.length],door:r()<.5?'#2b4f86':'#7a4a2a',trim:r()<.3?'#f4f2ec':blues[(row+2)%blues.length]},r()<.06);}},11,.9);
  // Market awnings along the square: striped canvas on poles.
  const awnings=api.group('market-awnings');
  built(awnings,'souk-awnings',b=>{for(let i=0;i<6;i++){const x=-4+i*2.4;for(const s of [-1,1])b.add(new T.CylinderGeometry(.04,.04,2.4,5),'#5a432e',[x+s*1,1.2,-2.6]);for(let k=0;k<5;k++)b.add(new T.BoxGeometry(.42,.04,1.5),k%2?'#f4efe2':['#c8323a','#e2a23a','#2f7a5a'][i%3],[x-.84+k*.42,2.35,-2.4],[.25,0,0]);b.add(new T.BoxGeometry(1.8,.5,.7),'#a8743c',[x,.25,-2.6]);}},3);
  // The kasbah: ochre crenellated walls with a square tower behind the ramparts.
  const kasbah=api.group('kasbah-walls'),r1=api.platform('ma-rampart-1');
  built(kasbah,'kasbah-masonry',b=>{b.add(new T.BoxGeometry(18,7,1.6),'#b9773f',[r1.x+5,r1.y-3.4,-3.6],[0,0,0],[1,1,1],.05);for(let i=0;i<18;i++)b.add(new T.BoxGeometry(.5,.6,.5),'#b9773f',[r1.x-3.7+i,r1.y+.4,-3]);b.add(new T.BoxGeometry(3.4,10,3.4),'#ae6d38',[r1.x+9,r1.y-2,-6],[0,0,0],[1,1,1],.05);for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.6,.7,.6),'#ae6d38',[r1.x+7.8+i*.8,r1.y+3.35,-4.4]);b.add(new T.BoxGeometry(.8,1.4,.1),'#3d2c20',[r1.x+9,r1.y+1,-4.26]);},5);
  // The white mosque on the hill east of the medina, with its square minaret.
  const hill=api.group('spanish-mosque-hill'),end=api.platform('ma-overlook');
  built(hill,'hilltop-mosque',b=>{const x=end.x+8,y=end.y+1.5,z=-16;b.add(new T.BoxGeometry(7,3,5),'#f3efe6',[x,y+1.5,z]);b.add(new T.BoxGeometry(2,7,2),'#f3efe6',[x-4,y+3.5,z+1]);b.add(new T.BoxGeometry(2.3,.4,2.3),'#d9c9a6',[x-4,y+7.2,z+1]);b.add(new T.BoxGeometry(1.2,1.4,1.2),'#f3efe6',[x-4,y+8.1,z+1]);for(const s of [-1,0,1])b.add(new T.CylinderGeometry(.5,.5,.06,10,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2),'#7a6a52',[x+s*2,y+1.6,z+2.52]);b.add(new T.BoxGeometry(9,1.6,7),'#a99a76',[x,y-.8,z]);},7);
  // The Rif around the town: olive groves and cypresses (no savanna acacias).
  plantGrove(hill,'olive',[{x:end.x+3,y:end.y,z:-11,scale:.9},{x:end.x+14,y:end.y+1,z:-13,scale:1.1}],{low,name:'hill-olives'});
  plantGrove(hill,'olive',Array.from({length:low?5:10},(_,i)=>({x:-10+i*(finish+20)/10,y:-3,z:-20-(i%3)*2,scale:.8})),{low,name:'rif-olive-groves'});
  plantGrove(hill,'cypress',Array.from({length:low?3:6},(_,i)=>({x:i*finish/6+4,y:-3,z:-17,scale:1})),{low,name:'medina-cypresses'});
  // Ras el-Maa: the stream that runs down past the medina wall.
  const spring=api.platform('ma-laundry'),stream=createWaterSurface(staticRoot.parent!,{x:spring.x+1.2,y:-3.2,z:-2,width:12,depth:6,shallow:'#8ac3d6',deep:'#3c7a9a',segments:12,name:'ras-el-maa-stream',flow:[.08,0],repeat:.3});
  api.animate({update:t=>stream.update(t)});
  // Geranium pots along the stair alleys.
  built(features,'geranium-pots',b=>{for(const p of level.platforms)if(p.style==='blue-steps'||p.style==='blue-lane')for(let i=0;i<Math.floor(p.width/1.6);i++){const x=p.x+.6+i*1.6,y=p.y+(p.slope||0)*(i*1.6+.6)/p.width;b.add(new T.CylinderGeometry(.16,.12,.3,8),'#3e74b8',[x,y+.15,-1.25]).add(new T.SphereGeometry(.2,6,4),i%2?'#d9324a':'#e86a8a',[x,y+.42,-1.25]);}},9);
  const motes=createDrift(api.foreground,{kind:'dust',count:low?10:24,colors:['#fff6dc'],x:[-6,finish],y:[0,7],z:[-3,2],fall:.02,sway:.6,size:.05,seed:4,name:'sunlit-motes'});
  api.animate({update:t=>motes.update(t),setVisible:v=>motes.setVisible(v),motion:true});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='flat-roof'||style==='roof-terrace'){
   // A whole blue house under each roof, down to the lower town.
   built(root,'blue-house-under-roof',(b,rr)=>{const drop=Math.max(5,definition.y+7),colour=blues[Math.floor(rr()*blues.length)];b.add(new T.BoxGeometry(w,drop,2.6),colour,[0,-drop/2,0],[0,0,0],[1,1,1],.04);b.add(new T.BoxGeometry(w+.15,.22,2.75),'#f2f0ea',[0,-.11,0]);for(let y=-1.6;y>-drop+1;y-=2.2)for(let x=-w/2+.8;x<w/2-.5;x+=1.6)b.add(new T.BoxGeometry(.5,.7,.06),'#2b4f86',[x,y,1.31]);b.add(new T.BoxGeometry(w,.5,.18),'#f2f0ea',[0,.25,-1.21]);if(style==='roof-terrace')for(let x=-w/2+1;x<w/2;x+=2.2)b.add(new T.CylinderGeometry(.18,.14,.36,8),'#c26a3a',[x,.18,-.95]).add(new T.SphereGeometry(.24,6,4),'#4f8a3a',[x,.5,-.95]);},api.seed,.9);
   return true;
  }
  if(style==='rampart'){built(root,'kasbah-rampart',b=>{b.add(new T.BoxGeometry(w,7,2.8),'#b9773f',[0,-3.5,0],[0,0,0],[1,1,1],.05);for(let x=-w/2+.25;x<w/2;x+=.9)b.add(new T.BoxGeometry(.45,.5,.4),'#ae6d38',[x,.25,-1.2]);},api.seed);return true;}
  if(style==='awning'){built(root,'striped-awning',b=>{for(let k=0;k<6;k++)b.add(new T.BoxGeometry(w/6,.12,2.4),k%2?'#f4efe2':'#c8323a',[-w/2+w/12+k*w/6,-.06,0],[0,0,0],[1,1,1]);for(const sx of [-1,1])for(const sz of [-1,1])b.add(new T.CylinderGeometry(.05,.05,3,5),'#5a432e',[sx*(w/2-.1),-1.55,sz*1.1]);b.add(new T.BoxGeometry(w*.9,.6,1),'#a8743c',[0,-2.7,-.4]);for(let i=0;i<5;i++)b.add(new T.SphereGeometry(.13,6,4),['#e2a23a','#c8323a','#7a9a3a'][i%3],[-w/2+.4+i*.4,-2.25,-.4]);},api.seed);return true;}
  if(style==='laundry-roof'){built(root,'laundry-roof',b=>{b.add(new T.BoxGeometry(w,5.5,2.4),'#86b4e2',[0,-2.75,0],[0,0,0],[1,1,1],.04);b.add(new T.BoxGeometry(w+.1,.16,2.5),'#f2f0ea',[0,-.08,0]);for(const x of [-w/2+.15,w/2-.15])b.add(new T.CylinderGeometry(.03,.03,1.8,5),'#6b4b2e',[x,.9,-1]);b.add(new T.CylinderGeometry(.01,.01,w-.3,4).rotateZ(Math.PI/2),'#e8e2d4',[0,1.75,-1]);for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.38,.55,.02),['#e2a23a','#f4f2ec','#c8323a','#2f7a5a'][i],[-w/2+.5+i*.48,1.45,-1]);},api.seed);return true;}
  return false;
 },
});
void adobeTower;
