import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {createDrift} from '../../kit/particles';
import {random,v3,type Builder} from '../../kit/common';

/** Rwanda — Volcanoes: The Gorilla Trail. Terraced hills give way to a
 * wall of bamboo and then to hagenia woodland draped with moss and lichen
 * on the saddle between the Virunga cones, where mountain gorilla families
 * feed in the mist. */
const soil=earth('#5a7a3a','#7a4e30','#3e2a1c',{set:'mossy-rock',tint:'#d8e6c0',repeat:.5},{rough:.18});
const terrace=earth('#7a9a42','#8a5a36','#4a3220',{set:'savanna-rock',tint:'#e4e8c4',repeat:.5});
/** A gorilla: great dome head, broad shoulders, knuckle-walking stance. */
function gorilla(b:Builder,x:number,y:number,z:number,s=1,silver=false){
 const fur='#2a2624';b.add(new T.SphereGeometry(.7*s,12,8),fur,[x,y+1*s,z],[0,0,.2],[1.3,1,1]);if(silver)b.add(new T.SphereGeometry(.62*s,10,6),'#8a8a88',[x-.15*s,y+1.15*s,z],[0,0,.2],[1.2,.6,1.02]);
 b.add(new T.SphereGeometry(.36*s,10,8),fur,[x+.75*s,y+1.45*s,z],[0,0,0],[1,1.15,1]);b.add(new T.SphereGeometry(.18*s,8,6),'#3a3634',[x+1.02*s,y+1.38*s,z]);
 for(const sz of [-1,1]){b.strut(v3(x+.5*s,y+1.2*s,z+sz*.45*s),v3(x+.75*s,y,z+sz*.5*s),.16*s,fur,6);b.strut(v3(x-.5*s,y+.8*s,z+sz*.35*s),v3(x-.55*s,y,z+sz*.35*s),.15*s,fur,6);}
}
export const environment=africaEnvironment({
 code:'RWA',id:'africa-rw',name:'rwanda-volcanoes-environment',
 representation:'A fictional trail inspired by Volcanoes National Park. Gorillas are shown at a respectful distance; the silverback\'s patrol and the springy bamboo are game devices, not behaviour advice.',
 lighting:{background:'#c4d2c8',exposure:1.02,sun:'#fff0d4',sunIntensity:2.6,sky:'#e6eee6',ground:'#3e2a1c',hemisphere:1.45,rim:'#e8f0d8',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#7a9ab8',horizon:'#dfe8e0',ground:'#3e2a1c',intensity:.3}},
 sky:{zenith:'#7a9ec0',horizon:'#e2eae2',band:'#d0dcd2',glow:'#fff4dc',sun:[.4,.5,-.7],glowPower:10},
 fog:['#d8e2da',30,150],clouds:{opacity:.85,high:[18,28],lowBand:[6,10],groups:14},
 layers:['bamboo-boughs-and-saddle','mountain-gorillas','hagenia-woodland','bamboo-forest','virunga-cones','sky'],
 backdrop:[{kind:'range',name:'virunga-cones',z:-160,y:-6,height:34,peaks:3,rock:'#4a4a42',forest:'#3a5a32',grass:'#5a7a42',treeLine:24,sharpness:1.3,depth:60},{kind:'forest',name:'bamboo-forest',z:[-40,-10],y:-1,flora:['bamboo-clump','bamboo-clump','giant-groundsel'],count:70,scale:[.9,1.3]},{kind:'hills',name:'hillside-terraces',z:-90,y:-4,height:12,colors:['#6a9a3a','#7aa646','#8ab252'],scale:3}],
 floor:{kind:'land',y:-4,colors:['#3a4a26','#4a5a2e','#5a6a36'],name:'forest-floor',rough:1},
 palettes:{default:soil,'hillside-terraces':terrace,'potato-terrace':terrace},
 deck:{wood:'#4a3a22',woodAlt:'#5a4a2a',rope:'#a8b07a',stone:'#5a5a4a',stoneAlt:'#4a4a3a',metal:'#4a4a4a',accent:'#00a1de'},
 capFlora:{default:'savanna-grass','hagenia-bough':null,'mossy-trunk':null,'bamboo-crown':null,'potato-terrace':'savanna-grass'},
 drift:{kind:'mist',count:22,colors:['#eef2ee'],y:[2,10],z:[-12,-2],fall:-.02,sway:1.4,size:1.2,name:'saddle-mist'},
 flocks:[{count:6,y:14,z:-20,color:'#2a3a2a',wing:'#6a8a5a',size:.5,name:'turacos'}],
 creature:{name:'golden-monkey',height:.6,shell:'#c88a3a',belly:'#3a3a3a',foot:'#2a2a2a',crest:'ears',accent:'#c88a3a'},
 crate:{body:'wood',color:'#5a4a2a',trim:'#00a1de',glyph:'#fad201'},
 checkpoint:{pole:'#4a3a22',cloth:'#00a1de',accent:'#fad201',cap:'#20603d'},
 finishArch:{style:'jungle',stone:'#4a4a3a',trim:'#20603d'},
 landmarks(api){
  const {finish,low}=api,r=random(250),glade=api.platform('rw-glade');
  const family=api.group('mountain-gorillas');built(family,'gorilla-family',b=>{gorilla(b,glade.x+2,glade.y,-4.6,1.2,true);gorilla(b,glade.x+6,glade.y,-5.4,.8);gorilla(b,glade.x+8.4,glade.y,-4.4,.5);for(let i=0;i<8;i++)b.add(new T.ConeGeometry(.3,1.2,5),'#5a8a3a',[glade.x+r()*glade.width,glade.y+.5,-3.6-r()*2.4]);},3);
  const wood=api.group('hagenia-woodland'),h=api.platform('rw-hagenia');built(wood,'hagenia-trees',b=>{for(let i=0;i<(low?5:10);i++){const x=h.x-6+i*5.4,y=-4,ht=9+r()*4;b.strut(v3(x,y,-7-r()*4),v3(x+(r()-.5)*3,y+ht,-8),.5,'#5a4632',8);for(let k=0;k<3;k++)b.add(new T.SphereGeometry(1.8+r(),10,6),'#4a6a32',[x+(r()-.5)*4,y+ht+r()*1.5,-8+(r()-.5)*2],[0,0,0],[1.3,.6,1]);for(let k=0;k<4;k++)b.add(new T.ConeGeometry(.16,1.2,5).rotateX(Math.PI),'#a8b88a',[x+(r()-.5)*3,y+ht-1-r()*2,-7.4]);}},4,.95);
  const mist=createDrift(wood,{kind:'mist',count:low?8:20,colors:['#e8eee8'],x:[h.x,finish],y:[4,12],z:[-16,-6],fall:-.03,sway:1,size:2,seed:5,name:'hagenia-mist'});
  api.animate({update:t=>mist.update(t),setVisible:v=>mist.setVisible(v),motion:true});
  plantAfrica(wood,'giant-groundsel',Array.from({length:low?4:8},()=>({x:glade.x+r()*(finish-glade.x),y:glade.y,z:-3-r()*3,scale:.8})),{low,name:'saddle-groundsels'});
 },
 dress(root,definition,_context,api){
  const s=definition.style,w=definition.width;
  if(s==='bent-bamboo'){built(root,'bent-bamboo-culms',b=>{for(let i=0;i<5;i++)b.strut(v3(-w/2+.2+i*w/5,-3.4,(i%2-.5)*.4),v3(-w/2+.4+i*w/5,0,0),.07,i%2?'#7a9a3a':'#8aa846',5);b.add(new T.BoxGeometry(w,.16,1.2),'#8aa846',[0,-.08,0]);},api.seed);return true;}
  if(s==='hagenia-bough'||s==='mossy-trunk'||s==='bamboo-crown'){built(root,s,b=>{b.add(new T.CylinderGeometry(.5,.6,w,10).rotateZ(Math.PI/2),s==='bamboo-crown'?'#7a9a3a':'#5a4632',[0,-.5,0]);for(let i=0;i<Math.ceil(w);i++)b.add(new T.SphereGeometry(.42,8,6),'#5a7a32',[-w/2+.5+i,-.1,(i%2-.5)*.5],[0,0,0],[1,.45,1]);for(let i=0;i<3;i++)b.add(new T.ConeGeometry(.12,1,5).rotateX(Math.PI),'#a8b88a',[-w/2+.6+i*w/3,-1.3,.4]);if(s==='mossy-trunk')b.add(new T.CylinderGeometry(.7,.9,8,10),'#5a4632',[0,-5,-.6]);},api.seed);return true;}
  return false;
 },
});
