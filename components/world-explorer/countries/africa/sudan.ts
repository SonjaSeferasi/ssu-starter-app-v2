import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Sudan — Meroë: Pyramids of the Kushite Kings. Red-gold dunes lap the
 * ridges of the royal cemetery, where dozens of small, steep pyramids stand
 * in rows, each with an offering chapel and pylon at its foot. */
const sand=earth('#e2a96a','#c98a52','#8f5a32',{set:'sandstone-cliff',tint:'#f6d6b0',repeat:.4},{rough:.1,strata:.9});
const block=earth('#b9784a','#a5683e','#6e4126',{set:'sandstone-blocks',tint:'#f0cfa8',repeat:.7},{strata:.4,rough:.04});

/** A Kushite pyramid: a narrow base and steep sides (about 70°), stepped
 * courses, and an offering chapel with a pylon gateway on its east face. */
export function kushitePyramid(b:Builder,x:number,y:number,z:number,base:number,ruined:boolean,r:()=>number){
 const h=base*1.45*(ruined?.75:1),courses=Math.round(h/.5);
 for(let i=0;i<courses;i++){const t=i/courses,s=base*(1-t*(ruined?.75:1)*(1/(ruined?.75:1))*.92);b.add(new T.BoxGeometry(s,h/courses*1.02,s),i%2?'#a5683e':'#b9784a',[x,y+h*t+h/courses/2,z],[0,0,0],[1,1,1],.05);}
 if(!ruined)b.add(new T.ConeGeometry(base*.06,base*.2,4),'#a5683e',[x,y+h+base*.1,z],[0,Math.PI/4,0]);
 const cx=x+base*.5+1.1;b.add(new T.BoxGeometry(2.2,1.6,1.6),'#b07040',[cx,y+.8,z]);for(const s of [-1,1])b.add(new T.BoxGeometry(.7,2.4,.7).translate(0,0,0),'#a5683e',[cx+1.3,y+1.2,z+s*.9],[0,0,0],[1,1,1],.04);
 if(r()<.5)b.add(new T.DodecahedronGeometry(.5,0),'#a5683e',[x+base*.7,y+.3,z+base*.4]);
}
/** A camel: humped body, long neck, knobbly legs. Faces +x. */
function camel(b:Builder,x:number,y:number,z:number,colour:string,saddle?:string){
 b.add(new T.SphereGeometry(.7,12,8),colour,[x,y+1.75,z],[0,0,0],[1.5,.75,.7]);b.add(new T.SphereGeometry(.45,10,8),colour,[x-.1,y+2.3,z],[0,0,0],[1,.9,.9]);
 b.strut(v3(x+.85,y+1.9,z),v3(x+1.35,y+2.5,z),.16,colour,7);b.add(new T.SphereGeometry(.2,8,6),colour,[x+1.5,y+2.55,z],[0,0,0],[1.6,.8,.8]);
 for(const [lx,lz] of [[-.65,-.25],[-.65,.25],[.6,-.25],[.6,.25]])b.strut(v3(x+lx,y+1.4,z+lz),v3(x+lx,y,z+lz),.08,colour,5);
 b.strut(v3(x-1,y+1.8,z),v3(x-1.25,y+1.2,z),.04,colour,4);
 if(saddle)b.add(new T.BoxGeometry(1.1,.18,1.1),saddle,[x-.1,y+2.65,z]);
}
export const environment=africaEnvironment({
 code:'SDN',id:'africa-sd',name:'sudan-meroe-environment',
 representation:'A fictional desert approach inspired by the royal cemeteries of Meroë. The pyramids are simplified studies at game scale and the route stays on dunes and course blocks set apart from them; the camel and shaduf are game devices.',
 lighting:{background:'#ead2ae',exposure:1.06,sun:'#ffd8a0',sunIntensity:3.3,sky:'#f2e2c8',ground:'#8f5a32',hemisphere:1.2,rim:'#ffc890',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#8fb0cf',horizon:'#f0d8b4',ground:'#8f5a32',intensity:.26}},
 sky:{zenith:'#7aa6d0',horizon:'#f2dcb8',band:'#ead2ae',glow:'#ffe6be',sun:[.75,.3,-.55],glowPower:9},
 fog:['#ecd4b0',45,180],clouds:{opacity:.35,high:[30,40],groups:6,shade:'#ead6b6'},
 layers:['dunes-and-pyramid-courses','meroe-pyramids','camel-caravan','acacia-wadi','nubian-dunes','sky'],
 backdrop:[
  {kind:'dunes',name:'nubian-dunes',z:-150,y:-7,height:18,colors:['#c9844c','#dea064','#efbf84'],crests:5,depth:80},
  {kind:'dunes',name:'near-dune-field',z:-58,y:-6,height:7,colors:['#d6965a','#e6ad70','#f2c690'],crests:8,depth:30},
 ],
 floor:{kind:'land',y:-5,colors:['#d08e54','#e2a86a','#f0c086'],name:'dune-trough',rough:1.6},
 palettes:{default:sand,'pyramid-course':block,'pyramid-shoulder':block,'necropolis':earth('#c99060','#b07848','#7a4a2a',{set:'sandstone-cliff',tint:'#f2d2b0',repeat:.45})},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#cdb68a',stone:'#b9784a',stoneAlt:'#a5683e',metal:'#5a5a5a',accent:'#d9a23a'},
 capFlora:{default:'savanna-grass','pyramid-course':null,'pyramid-shoulder':null,'dune-face':null},
 flora:[{kind:'umbrella-acacia',count:7,z:[-26,-14],y:-5,scale:[.8,1.1]}],
 drift:{kind:'dust',count:34,colors:['#f0c890','#e2b070'],y:[0,7],z:[-4,3],fall:-.01,sway:2.8,size:.08,name:'blowing-sand'},
 banners:[{platform:'sd-shoulder',offset:6,colors:['#d21034']},{platform:'sd-ridge-2',offset:5,colors:['#007229']}],
 creature:{name:'dune-scarab',height:.6,shell:'#3a5a4a',belly:'#c9a24a',foot:'#2a2a22',crest:'horn',accent:'#c9a24a'},
 crate:{body:'stone',color:'#b9784a',trim:'#6e4126',glyph:'#ffd890'},
 checkpoint:{pole:'#6b4b2e',cloth:'#d21034',accent:'#ffffff',cap:'#007229'},
 finishArch:{style:'egyptian',stone:'#b9784a',trim:'#6e4126'},
 mechanisms:{stone:'#b9784a',stoneDark:'#6e4126',trim:'#d9a23a',glow:'#ffd27a',metal:'#5a5a5a'},
 landmarks(api){
  const {finish,low}=api,r=random(1336);
  // The royal cemetery: rows of steep pyramids on the ridges, some broken.
  const pyramids=api.group('meroe-pyramids'),end=api.platform('sd-necropolis');
  built(pyramids,'kushite-pyramid-rows',b=>{for(let i=0;i<(low?10:20);i++){const near=i<8,x=near?end.x-20+i*4.6+r():r()*finish,z=near?-9-r()*8:-28-r()*20,y=near?end.y-1.2:-4,base=near?3.2+r()*1.2:4+r()*2;kushitePyramid(b,x,y,z,base,r()<.35,r);}},4,.9);
  // The caravan: a string of camels crossing the dune trough, walking.
  const caravan=api.group('camel-caravan'),walkers=new T.Group();walkers.name='caravan-walkers';caravan.add(walkers);
  built(walkers,'caravan-camels',b=>{for(let i=0;i<5;i++)camel(b,i*3.4,0,0,i%2?'#c9a070':'#b98a5a',i%2?'#c1272d':'#2f5a8a');b.add(new T.CylinderGeometry(.18,.22,1.6,8),'#f2f2ee',[-2.2,.8,0]).add(new T.SphereGeometry(.2,8,6),'#5a3a22',[-2.2,1.8,0]);},6);
  walkers.position.set(10,-4.6,-20);api.animate({update:t=>{walkers.position.x=10+((t*.8)%(finish+20));},motion:true,setVisible:v=>{walkers.visible=v;}});
  // The shaduf: a counterweighted sweep beside the lift in the dune trough.
  const shaduf=api.group('shaduf-well'),s=api.platform('sd-shaduf');
  built(shaduf,'shaduf-frame',b=>{const x=s.x+s.width/2;for(const sx of [-1,1])b.add(new T.CylinderGeometry(.09,.11,5.4,6),'#6b4b2e',[x+sx*.5,.4,-2]);b.add(new T.CylinderGeometry(.06,.06,1.3,6).rotateZ(Math.PI/2),'#5a4028',[x,3.1,-2]);b.strut(v3(x-2.6,1.9,-2),v3(x+2.8,4.2,-2),.07,'#7a5a38',6);b.add(new T.SphereGeometry(.45,8,6),'#8a6a52',[x-2.7,1.7,-2]);b.add(new T.CylinderGeometry(.6,.6,.7,12),'#9a8a6a',[x,-1.4,-2.2]);},7);
  // The wadi: acacias and doum palms along a dry watercourse.
  const wadi=api.group('acacia-wadi');
  plantAfrica(wadi,'doum-palm',Array.from({length:low?4:8},()=>({x:-6+r()*(finish+10),y:-5,z:-13-r()*6,scale:.8+r()*.4})),{low,name:'doum-palms'});
  plantAfrica(wadi,'thorn-scrub',Array.from({length:low?8:16},()=>({x:-6+r()*(finish+10),y:-5,z:-8-r()*10,scale:.7+r()*.5})),{low,name:'wadi-scrub'});
 },
 dress(root,definition,_context,api){
  const style=definition.style;
  if(style==='camel'){built(root,'ferry-camel',b=>{camel(b,0,-2.85,0,'#c09060');b.add(new T.BoxGeometry(definition.width,.22,2.2),'#c1272d',[0,-.11,0]);for(let i=0;i<5;i++)b.add(new T.BoxGeometry(.06,.24,2.22),i%2?'#f2e2b0':'#2f5a8a',[-definition.width/2+.3+i*.5,-.11,0]);for(const s of [-1,1])b.add(new T.BoxGeometry(definition.width*.8,.5,.06),'#8a3a2a',[0,-.4,s*1.1]);},api.seed);return true;}
  if(style==='shaduf'){built(root,'shaduf-bucket-deck',b=>{b.add(new T.BoxGeometry(definition.width,.3,2),'#7a5a38',[0,-.15,0]);for(const s of [-1,1])b.add(new T.CylinderGeometry(.02,.02,3,4),'#cdb68a',[s*(definition.width/2-.1),1.5,-.9]);},api.seed);return true;}
  if(style==='dune-face'||style==='dune-crest'||style==='interdune'||style==='camp'){const d=api.landmass(root,definition,'default','mass',2.4);api.plants(d,definition,style==='dune-face'?null as never:'savanna-grass',2);if(style==='camp')built(d,'nomad-tent',b=>{b.add(new T.CylinderGeometry(.02,1.8,1.6,4,1),'#7a5a3a',[-3,.8,-1.6],[0,Math.PI/4,0],[1.4,1,1]);b.add(new T.CylinderGeometry(.06,.06,1.8,5),'#5a3a22',[-3,.9,-1.6]);},api.seed);return true;}
  return false;
 },
});
