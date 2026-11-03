import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {dromedary} from './shared-props';
import {plantAfrica} from './flora';
import {createWaterSurface} from '../../kit/water';
import {random,valueNoise} from '../../kit/common';

/** Chad — Ennedi: The Aloba Arch. Red-brown sandstone carved into towers,
 * canyons and an immense arch; a dark guelta pool in a gorge where camels
 * come to drink, and acacias in the sandy wadis. */
const sandstone=earth('#a8603a','#8a4a2c','#4e2818',{set:'sandstone-cliff',tint:'#f0c0a0',repeat:.45},{strata:.4,rough:.28});
const sand=earth('#d8a06a','#b07a48','#7a4e2c',{set:'sandstone-cliff',tint:'#f6d8b8',repeat:.4},{rough:.1});
export const environment=africaEnvironment({
 code:'TCD',id:'africa-td',name:'chad-ennedi-environment',
 representation:'A fictional route through scenery inspired by the Ennedi Massif. The Aloba Arch is shown in the distance; the arch the route climbs is a smaller invented one. Raised stones and the route are game devices.',
 lighting:{background:'#e4c4a0',exposure:1.05,sun:'#ffcf98',sunIntensity:3.2,sky:'#f2dcc0',ground:'#4e2818',hemisphere:1.15,rim:'#ffb878',rimIntensity:.7,pixelRatio:1.25,reflections:{zenith:'#7a9ec8',horizon:'#f0cfa8',ground:'#4e2818',intensity:.26}},
 sky:{zenith:'#6e98c8',horizon:'#f2d2aa',band:'#ecc8a0',glow:'#ffd8a8',sun:[.75,.25,-.55],glowPower:8},
 fog:['#ecd0ae',45,190],clouds:{opacity:.35,high:[30,40],groups:6},
 layers:['bank-stones-arch-and-pillars','aloba-arch','guelta-darchei','sandstone-pillars','ennedi-massif','sky'],
 backdrop:[{kind:'mesas',name:'ennedi-massif',z:-110,y:-6,height:26,colors:['#8a4a2c','#6a3820','#a8603a'],count:9,depth:80}],
 floor:{kind:'land',y:-4,colors:['#c88a54','#d8a06a','#e6b47c'],name:'wadi-sand',rough:1},
 palettes:{default:sandstone,'camel-camp':sand,'dune':sand,'guelta-bank':earth('#8a7a4a','#8a4a2c','#4e2818',{set:'sandstone-cliff',tint:'#f0c8a8',repeat:.45})},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#a8603a',stoneAlt:'#8a4a2c',metal:'#4a4a4a',accent:'#fecb00'},
 capFlora:{default:null,'camel-camp':'savanna-grass','guelta-bank':'papyrus','ennedi-plateau':'thorn-scrub'},
 flora:[{kind:'umbrella-acacia',count:8,z:[-22,-12],y:-4,scale:[.8,1.1]},{kind:'doum-palm',count:5,z:[-14,-8],y:-4}],
 flocks:[{count:4,y:18,z:-26,color:'#2a2420',wing:'#c8b8a0',size:.9,glide:true,name:'lanner-falcons'}],
 banners:[{platform:'td-arch-far',offset:5,colors:['#002664']},{platform:'td-span-1',offset:1.5,colors:['#c60c30']}],
 creature:{name:'desert-crocodile',height:.6,shell:'#5a6a4a',belly:'#a8a87a',foot:'#3a4a2a',crest:'spines',accent:'#4a5a3a'},
 crate:{body:'stone',color:'#a8603a',trim:'#002664',glyph:'#fecb00'},
 checkpoint:{pole:'#5a4028',cloth:'#002664',accent:'#fecb00',cap:'#c60c30'},
 finishArch:{style:'stone',stone:'#8a4a2c',trim:'#4e2818'},
 mechanisms:{stone:'#a8603a',stoneDark:'#4e2818',trim:'#fecb00',glow:'#ffd27a',metal:'#4a4a4a'},
 landmarks(api){
  const {finish,low}=api,r=random(1475);
  // The Aloba Arch: a vast, slender span on the horizon.
  const aloba=api.group('aloba-arch');
  built(aloba,'great-arch',b=>{const arc=new T.TorusGeometry(26,3.2,10,40,Math.PI),p=arc.getAttribute('position');for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)*1.6*(1+valueNoise(p.getX(i)*.2,p.getY(i)*.2,3)*.3));arc.computeVertexNormals();b.add(arc,'#9a5432',[finish*.5,-6,-150]);for(const s of [-1,1])b.add(new T.CylinderGeometry(9,14,22,10),'#8a4a2c',[finish*.5+s*28,-2,-150]);},2,.95);
  // The guelta: dark water in a narrow gorge, with camels drinking.
  const guelta=api.group('guelta-darchei'),bank=api.platform('td-bank');
  const pool=createWaterSurface(guelta,{x:bank.x+14,y:-1.6,z:-3,width:30,depth:14,shallow:'#3a5a4a',deep:'#142a24',segments:12,name:'guelta-water',flow:[.005,0],repeat:.25});api.animate({update:t=>pool.update(t)});
  built(guelta,'gorge-walls',b=>{for(let i=0;i<10;i++)b.add(new T.BoxGeometry(4+r()*3,14+r()*8,4),'#7a4026',[bank.x-4+i*4,2,-12-r()*3],[0,r()*.3,0],[1,1,1],.08);},3,.95);
  const herd=api.group('camel-herd');built(herd,'drinking-camels',b=>{for(let i=0;i<5;i++)dromedary(b,bank.x+4+i*3.6,-1.6,-6-(i%2)*1.6,i%2?'#b88a5a':'#9a6a40',.9);},4);
  const pillars=api.group('sandstone-pillars');built(pillars,'wind-towers',b=>{for(let i=0;i<(low?10:22);i++){const x=r()*finish,z=-14-r()*24,h=6+r()*12;b.add(new T.CylinderGeometry(1+r(),1.8+r(),h,8),'#9a5432',[x,-4+h/2,z],[0,r()*3,0],[1,1,.8],.08);b.add(new T.SphereGeometry(1.6,8,6),'#8a4a2c',[x,-4+h,z],[0,0,0],[1.2,.5,1]);}},5,.95);
  plantAfrica(guelta,'papyrus',[{x:bank.x+2,y:-1.6,z:-4},{x:bank.x+24,y:-1.6,z:-5}],{low,name:'guelta-reeds'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='arch-span'){const d=api.landmass(root,definition,'default','island',1.4);built(d,'arch-underside',b=>{b.add(new T.TorusGeometry(w*.9,.5,6,12,Math.PI),'#8a4a2c',[0,-1.5,-.2],[Math.PI,0,0],[1,.6,1]);},api.seed);return true;}
  if(style==='guelta-stone'){const d=api.landmass(root,definition,'default','island',.8);built(d,'wet-stone-ring',b=>{b.add(new T.TorusGeometry(w*.5,.06,4,14),'#2a3a32',[0,-.7,0],[Math.PI/2,0,0]);},api.seed);return true;}
  return false;
 },
});
