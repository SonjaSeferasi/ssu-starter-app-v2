import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {adobeTower,adobeWall} from './architecture';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Mali — Djenné: Rooftops of the Mud City. Every surface is banco, the
 * sun-dried mud of the Inner Niger Delta: house walls bristle with toron
 * beams, roofs carry rows of parapet cones, and the three great towers of
 * the mosque rise over the square, with palm-wood scaffolds left from the
 * replastering. */
const banco=earth('#c08a58','#a8703f','#6e4526',{set:'sandstone-cliff',tint:'#f0d2b0',repeat:.5},{rough:.08,strata:.9});
const market=earth('#c9a676','#a8703f','#6e4526',{set:'savanna-rock',tint:'#efdcc0',repeat:.5});
function torons(b:Builder,w:number,h:number,z:number,y0=0){for(let y=y0-.7;y>y0-h;y-=1.1)for(let x=-w/2+.5;x<w/2;x+=1.1)b.add(new T.CylinderGeometry(.045,.045,.6,5).rotateX(Math.PI/2),'#4f3a26',[x,y,z]);}
export const environment=africaEnvironment({
 code:'MLI',id:'africa-ml',name:'mali-djenne-environment',
 representation:'A fictional rooftop course inspired by the old town of Djenné. The Great Mosque is a simplified backdrop study and never a platform; the route uses houses and replastering scaffolds.',
 lighting:{background:'#e6d2b2',exposure:1.05,sun:'#ffdcae',sunIntensity:3.2,sky:'#f0e2cc',ground:'#6e4526',hemisphere:1.2,rim:'#ffcf9a',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#8eb2d2',horizon:'#efd9b8',ground:'#6e4526',intensity:.28}},
 sky:{zenith:'#7fa8d2',horizon:'#f1dcbc',band:'#e8d4b4',glow:'#ffe8c4',sun:[.6,.42,-.6],glowPower:11},
 fog:['#e9d6b6',50,190],clouds:{opacity:.4,high:[30,40],groups:7,shade:'#e6d2b6'},
 layers:['mud-house-roofs','great-mosque-of-djenne','toron-mud-houses','bani-floodplain','sahel-horizon','sky'],
 backdrop:[{kind:'hills',name:'sahel-horizon',z:-140,y:-6,height:4,colors:['#b49a70','#c4ac80','#d4bc90'],scale:2}],
 floor:{kind:'water',y:-2.2,shallow:'#9aa676',deep:'#5a6a4a',name:'bani-floodplain',opacity:.9},
 palettes:{default:banco,'market-square':market,'floodplain':earth('#8f9a62','#7a6a48','#4f4430',{set:'savanna-rock',tint:'#dcd2b8',repeat:.5})},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#c08a58',stoneAlt:'#a8703f',metal:'#5a5a5a',accent:'#d9a23a'},
 capFlora:{default:null,'floodplain':'papyrus','market-square':null},
 flora:[{kind:'doum-palm',count:10,z:[-30,-20],y:-2.2,scale:[.8,1.1]},{kind:'papyrus',count:14,z:[-8,-4],y:-2.2}],
 flocks:[{count:9,y:14,z:-22,color:'#f4f4f0',wing:'#e6e6e0',size:.55,glide:true,name:'cattle-egrets'}],
 creature:{name:'agama-lizard',height:.55,shell:'#3a5ab0',belly:'#d8c8a8',foot:'#2a2a3a',crest:'frill',accent:'#e86a2a'},
 crate:{body:'wood',color:'#a8703f',trim:'#4f3a26',glyph:'#ffe2a0'},
 checkpoint:{pole:'#4f3a26',cloth:'#14b53a',accent:'#fcd116',cap:'#ce1126'},
 finishArch:{style:'egyptian',stone:'#b9804e',trim:'#6e4526'},
 mechanisms:{stone:'#c08a58',stoneDark:'#6e4526',trim:'#d9a23a',glow:'#ffd27a',metal:'#5a5a5a'},
 landmarks(api){
  const {finish,low,features}=api,r=random(116),t=api.platform('ml-terrace');
  // The Great Mosque: a long battered facade on a raised plinth with three
  // great towers, each crowned by a cone, and toron beams everywhere.
  const mosque=api.group('great-mosque-of-djenne');
  built(mosque,'mosque-facade',b=>{const x=t.x+6,z=-20,y=-2;b.add(new T.BoxGeometry(40,3,14),'#b07a48',[x,y+1.5,z-4],[0,0,0],[1,1,1],.05);adobeWall(b,[x,y+3,z],34,8,3,'#c08a58');for(const dx of [-8,0,8])adobeTower(b,[x+dx,y+3,z+1.6],13,2.6,'#c48c5a');for(const dx of [-17,17])adobeTower(b,[x+dx,y+3,z],9,2,'#b98450');},3,.92);
  // Rows of two-storey mud houses with toron beams and parapet pinnacles.
  const houses=api.group('toron-mud-houses');
  built(houses,'mud-house-rows',b=>{for(let row=0;row<(low?2:4);row++)for(let x=-10;x<finish+14;x+=4.2+r()*1.8){const z=-8-row*4.4,h=3.4+r()*2.6,w=3+r()*1.6;if(Math.abs(x-t.x-6)<20&&row>1)continue;adobeWall(b,[x,-2.2+row*.3,z],w,h,3,r()<.5?'#c08a58':'#b07a48',r()<.7);}},5,.92);
  // The Monday market under the mosque: stalls, mats and stacks of pots.
  const market=api.group('monday-market');
  built(market,'market-stalls',b=>{for(let i=0;i<6;i++){const x=-4+i*2.2;b.add(new T.CylinderGeometry(.05,.05,2.2,5),'#4f3a26',[x,1.1,-2.6]);b.add(new T.ConeGeometry(1.1,.5,8),['#d9a23a','#2f6a8a','#c1272d'][i%3],[x,2.3,-2.6]);b.add(new T.BoxGeometry(1.4,.12,1),['#e8c070','#7a9a4a','#c86a3a'][i%3],[x,.06,-2.4]);for(let k=0;k<3;k++)b.add(new T.SphereGeometry(.22,8,6),'#9a5a32',[x-.4+k*.4,.3,-2.1],[0,0,0],[1,.8,1]);}},7);
  // Palm-wood replastering scaffolds against the houses.
  const scaffold=api.group('replastering-scaffolds');
  built(scaffold,'palm-wood-scaffolds',b=>{for(const x of [20,40,64,82]){for(const s of [-.6,.6])b.strut(v3(x+s,-2,-4.2),v3(x+s*.6,8,-4.2),.06,'#6b4b2e',5);for(let y=-1;y<8;y+=1.2)b.add(new T.CylinderGeometry(.04,.04,1.3,4).rotateZ(Math.PI/2),'#6b4b2e',[x,y,-4.2]);}},9);
  plantAfrica(features,'borassus-palm',[{x:-2,y:-2.2,z:-14,scale:.9},{x:finish-6,y:-2.2,z:-16,scale:1}],{low,name:'borassus-by-the-river'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='toron-house'){const d=api.landmass(root,definition,'default','mass',5);built(d,'toron-beams',b=>{torons(b,w,5,1.25);for(let y=-.8;y>-5;y-=.9)b.add(new T.CylinderGeometry(.05,.05,.7,5).rotateZ(Math.PI/2),'#4f3a26',[-w/2-.2,y,(y*7)%1.4-.7]);for(let x=-w/2+.4;x<w/2;x+=1)b.add(new T.ConeGeometry(.22,.8,6),'#c08a58',[x,.4,-1.2]);},api.seed);return true;}
  if(style==='mud-roof'||style==='roof-terrace'){built(root,'mud-house-under-roof',(b,rr)=>{const drop=definition.y+3;b.add(new T.BoxGeometry(w,drop,3),rr()<.5?'#c08a58':'#b47c4a',[0,-drop/2,0],[0,0,0],[1,1,1],.05);b.add(new T.BoxGeometry(w+.2,.2,3.1),'#a8703f',[0,-.1,0]);torons(b,w,drop,1.55);for(let x=-w/2+.4;x<w/2;x+=1.1)b.add(new T.ConeGeometry(.24,.9,6),'#c08a58',[x,.45,-1.3]);b.add(new T.BoxGeometry(.7,1.2,.06),'#3a2a1a',[0,-drop+.6,1.53]);},api.seed,.92);return true;}
  if(style==='parapet-cone'){built(root,'parapet-cone',b=>{b.add(new T.BoxGeometry(w,.3,2),'#b47c4a',[0,-.15,0]);b.add(new T.ConeGeometry(w*.45,2.6,8).rotateX(Math.PI),'#c08a58',[0,-1.6,0]);b.add(new T.CylinderGeometry(.05,.05,.6,5).rotateX(Math.PI/2),'#4f3a26',[0,-.9,.6]);},api.seed);return true;}
  if(style==='replaster-scaffold'){built(root,'scaffold-deck',b=>{b.add(new T.BoxGeometry(w,.12,1.6),'#6b4b2e',[0,-.06,0]);for(const s of [-1,1])b.strut(v3(s*w/2,-.1,0),v3(s*w/2,-5,0),.05,'#6b4b2e',5);b.add(new T.CylinderGeometry(.3,.25,.4,8),'#8a5a32',[.4,.2,-.5]);},api.seed);return true;}
  return false;
 },
});
