import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {cabinLike} from './shared-props';
import {createDrift} from '../../kit/particles';
import {random,valueNoise} from '../../kit/common';

/** DR Congo — Nyiragongo: Rim of the Lava Lake. A dusk scene inside the
 * crater: steep black walls dropping in terraces to a churning lava lake
 * that lights the steam from below, sparks rising, the summit huts on the
 * rim and the other Virunga volcanoes on the horizon. */
const basalt=earth('#3e3a38','#2c2826','#141210',{set:'alpine-rock',tint:'#a8a09c',repeat:.5},{rough:.3,strata:.55});
const terrace=earth('#4a3e38','#342a26','#18120f',{set:'alpine-rock',tint:'#b89a90',repeat:.5},{rough:.2});
export const environment=africaEnvironment({
 code:'COD',id:'africa-cd',name:'dr-congo-nyiragongo-environment',
 representation:'A fictional crater course inspired by Mount Nyiragongo. Nobody may descend into the real crater; the terraces, winch and lava fountains here are game devices.',
 lighting:{background:'#3a3240',exposure:1.1,sun:'#ffb070',sunIntensity:2.2,sky:'#6a5a6a',ground:'#2a1a14',hemisphere:1,rim:'#ff7a3a',rimIntensity:1.2,pixelRatio:1.25,reflections:{zenith:'#3a3a5a',horizon:'#8a5a4a',ground:'#2a1a14',intensity:.3}},
 sky:{zenith:'#2a2a4a',horizon:'#c87a5a',band:'#8a5a5a',glow:'#ffb070',sun:[.7,.12,-.6],glowPower:6},
 fog:['#5a4a4a',35,170],clouds:{opacity:.7,high:[22,32],groups:10,color:'#8a7070',shade:'#5a4a4a'},
 layers:['rim-rocks-terraces-and-winch','nyiragongo-crater','lava-lake','crater-terraces','virunga-volcanoes','sky'],
 backdrop:[{kind:'range',name:'virunga-volcanoes',z:-200,y:-10,height:46,peaks:4,rock:'#3a3634',forest:'#2a3a2a',grass:'#4a4a3a',treeLine:18,sharpness:1.6,depth:70}],
 floor:{kind:'land',y:-7.5,colors:['#2a2420','#3a2e2a','#4a3a34'],name:'crater-floor',rough:1},
 palettes:{default:basalt,'crater-terrace':terrace,'crumbling-terrace':terrace,'inner-ledge':terrace,'ash-shelf':terrace},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#3e3a38',stoneAlt:'#2c2826',metal:'#5a5a5a',accent:'#f7d618'},
 decks:{'crater-winch':'lift'},
 capFlora:{default:null,'rim-huts':'thorn-scrub'},
 hazardPalette:{column:'#ff7a2a',base:'#3a1a10',warning:'#ffb040'},
 creature:{name:'ember-beetle',height:.55,shell:'#3a2a24',belly:'#ff8a3a',foot:'#1a1210',crest:'horn',accent:'#ff8a3a'},
 crate:{body:'stone',color:'#3e3a38',trim:'#007fff',glyph:'#f7d618'},
 checkpoint:{pole:'#3a3634',cloth:'#007fff',accent:'#f7d618',cap:'#ce1021'},
 finishArch:{style:'stone',stone:'#3e3a38',trim:'#ce1021'},
 landmarks(api){
  const {finish,low,root}=api,r=random(1925);
  // The crater: a ring of steep walls in tiers behind the course.
  const crater=api.group('nyiragongo-crater');
  built(crater,'crater-walls',b=>{for(let tier=0;tier<4;tier++){const rad=60-tier*9,h=16-tier*3.5;const g=new T.CylinderGeometry(rad,rad+2,h,low?32:56,1,true,Math.PI*.05,Math.PI*.9);g.rotateY(Math.PI);b.add(g,tier%2?'#2c2826':'#3a3432',[finish*.5,-6+h/2-tier*1.5,-30-tier*4],[0,0,0],[1,1,.5],.08);}},2,.95);
  // The lava lake: an emissive, slowly churning surface far below.
  const lake=api.group('lava-lake'),mat=new T.MeshStandardMaterial({color:'#ff5a1a',emissive:'#ff4a10',emissiveIntensity:1.6,roughness:.6});
  const g=new T.PlaneGeometry(finish+40,40,low?20:48,low?8:16);g.rotateX(-Math.PI/2);const surface=new T.Mesh(g,mat);surface.name='lava-lake-surface';surface.position.set(finish/2,-7.2,-24);lake.add(surface);
  built(lake,'cooled-crust-plates',b=>{for(let i=0;i<(low?14:30);i++)b.add(new T.BoxGeometry(2+r()*4,.2,1.5+r()*3),'#1a1210',[r()*finish,-7.05,-10-r()*28],[0,r()*3,0]);},3);
  const p=g.getAttribute('position'),base=Float32Array.from(p.array as Float32Array);
  api.animate({update:t=>{for(let i=0;i<p.count;i++)p.setY(i,base[i*3+1]+valueNoise(base[i*3]*.15+t*.3,base[i*3+2]*.15,2)*.6);p.needsUpdate=true;mat.emissiveIntensity=1.4+Math.sin(t*1.7)*.2;}});
  const light=new T.PointLight('#ff6a2a',40,80,1.6);light.position.set(finish/2,-4,-14);lake.add(light);
  const terraces=api.group('crater-terraces');built(terraces,'inner-benches',b=>{for(let i=0;i<5;i++)b.add(new T.BoxGeometry(finish/4,1,3),'#2c2826',[r()*finish,-3-i*.8,-6-i*3]);},4);
  const huts=api.group('summit-huts');built(huts,'rim-shelters',b=>{for(let i=0;i<3;i++)cabinLike(b,[-4+i*3.2,0,-3.4-(i%2)],[2.4,1.8,2],'#6a5a4a','#8a9aaa');},5);
  const sparks=createDrift(root,{kind:'spark',count:low?16:40,colors:['#ffb040','#ff6a20'],x:[0,finish],y:[-6,6],z:[-16,-2],fall:-.6,sway:.6,size:.08,seed:7,name:'rising-sparks',emissive:true});
  api.animate({update:t=>sparks.update(t),setVisible:v=>sparks.setVisible(v),motion:true});
 },
});
