import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {createWaterfall} from '../../kit/water';
import {random,v3,type Builder} from '../../kit/common';

/** Eswatini — Mantenga. A traditional Swazi homestead of domed beehive
 * huts thatched with grass over a frame of saplings, reed fences and a
 * circular cattle kraal; a stream through the bush to the Mantenga Falls;
 * the green Ezulwini valley and the vast granite dome of Sibebe. */
const earthRed=earth('#8a9a4a','#9a5a36','#4e2e1e',{set:'savanna-rock',tint:'#efe0c4',repeat:.5},{rough:.12});
const granite=earth('#a89e90','#8a8274','#4a4440',{set:'gneiss',tint:'#eee8e0',repeat:.45});
/** A beehive hut: a grass dome, ribbed with rope, a low arched door. */
export function beehiveHut(b:Builder,x:number,y:number,z:number,s=1){
 b.add(new T.SphereGeometry(1.5*s,16,10,0,Math.PI*2,0,Math.PI*.55),'#c8a862',[x,y-.2*s,z],[0,0,0],[1,1.25,1],.08);
 for(let i=0;i<4;i++)b.add(new T.TorusGeometry(1.5*s*Math.cos(i*.3),.03*s,4,24),'#8a7040',[x,y+i*.45*s,z],[Math.PI/2,0,0],[1,1,1]);
 b.add(new T.CylinderGeometry(.35*s,.35*s,.1,10,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2),'#2a1e14',[x,y+.15*s,z+1.45*s]);b.add(new T.ConeGeometry(.1*s,.4*s,6),'#8a7040',[x,y+1.75*s,z]);
}
export const environment=africaEnvironment({
 code:'SWZ',id:'africa-sz',name:'eswatini-mantenga-environment',
 representation:'A fictional walk inspired by Mantenga Cultural Village. The homestead is a respectful generic study of Swazi beehive huts; the route keeps out of the huts and the kraal.',
 lighting:{background:'#c4dcec',exposure:1.05,sun:'#ffecc8',sunIntensity:3.1,sky:'#f0f4ec',ground:'#4e2e1e',hemisphere:1.35,rim:'#ffdca8',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#4a92d0',horizon:'#ecead8',ground:'#4e2e1e',intensity:.3}},
 sky:{zenith:'#4a92d0',horizon:'#eeead6',band:'#d6e2dc',glow:'#ffecc8',sun:[.6,.4,-.6],glowPower:13},
 fog:['#e2e6da',50,200],clouds:{opacity:.75,high:[24,34],groups:12},
 layers:['huts-stones-and-falls-path','beehive-huts','cattle-kraal','mantenga-falls','ezulwini-valley','sky'],
 backdrop:[{kind:'hills',name:'ezulwini-valley',z:-120,y:-4,height:16,colors:['#4a7a32','#5a8a3a','#6a9a46'],scale:3},{kind:'range',name:'sibebe-dome',z:-180,y:-6,height:22,peaks:1,rock:'#8a8274',forest:'#5a7a3a',grass:'#7a8a4a',treeLine:6,sharpness:.5,depth:60}],
 floor:{kind:'land',y:-3,colors:['#5a3a24','#6a4a2c','#7a5a34'],name:'valley-floor',rough:.8},
 palettes:{default:earthRed,'granite-rock':granite,'stepping-stone':granite,'falls-viewpoint':granite},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#a89e90',stoneAlt:'#8a8274',metal:'#4a4a4a',accent:'#3e5eb9'},
 capFlora:{default:'savanna-grass','stepping-stone':null,'granite-rock':null,'stone-steps':null},
 flora:[{kind:'umbrella-acacia',count:6,z:[-26,-16],y:-2,scale:[.8,1]},{kind:'aloe',count:10,z:[-10,-5],y:-1}],
 flocks:[{count:8,y:12,z:-20,color:'#2a2a2a',wing:'#c8323a',size:.5,name:'purple-crested-turacos'}],
 creature:{name:'nguni-calf',height:.8,shell:'#8a4a2a',belly:'#f2ece0',foot:'#2a1e14',crest:'twin-horns',accent:'#f2ece0'},
 crate:{body:'wood',color:'#6b4b2e',trim:'#3e5eb9',glyph:'#ffd900'},
 checkpoint:{pole:'#5a4028',cloth:'#3e5eb9',accent:'#ffd900',cap:'#b10c0c'},
 finishArch:{style:'timber',stone:'#8a8274',trim:'#b10c0c'},
 landmarks(api){
  const {finish,low,level}=api,r=random(268),v=api.platform('sz-village'),k=api.platform('sz-kraal'),view=api.platform('sz-falls-view');
  const huts=api.group('beehive-huts');built(huts,'homestead',b=>{for(let i=0;i<(low?4:7);i++)beehiveHut(b,v.x+1+i*2.1,v.y,-5-(i%2)*3,.9+r()*.2);for(let i=0;i<20;i++)b.add(new T.CylinderGeometry(.03,.03,1.4,4),'#b8a070',[v.x-2+i*.8,v.y+.7,-8.6]);b.add(new T.BoxGeometry(16,1.2,.08),'#c8b080',[v.x+6,v.y+.7,-8.6]);},3);
  const kraal=api.group('cattle-kraal');built(kraal,'kraal-ring',b=>{const cx=k.x+k.width/2,cz=-6;for(let i=0;i<28;i++){const a=i/28*Math.PI*2;b.add(new T.CylinderGeometry(.07,.08,1.5,5),'#5a4028',[cx+Math.cos(a)*3.2,k.y+.75,cz+Math.sin(a)*1.8]);}for(let i=0;i<3;i++){const x=cx-1.4+i*1.4,z=cz-.4+(i%2)*.6;b.add(new T.SphereGeometry(.5,10,8),i%2?'#f2ece0':'#3a2a1e',[x,k.y+.95,z],[0,0,0],[1.5,.8,.7]);b.add(new T.SphereGeometry(.22,8,6),i%2?'#f2ece0':'#3a2a1e',[x+.75,k.y+1.1,z]);for(const s of [-1,1])b.strut(v3(x+.8,k.y+1.25,z+s*.1),v3(x+.8,k.y+1.6,z+s*.4),.03,'#e8dcc4',4);for(const [lx,lz] of [[-.45,-.15],[-.45,.15],[.45,-.15],[.45,.15]])b.strut(v3(x+lx,k.y+.7,z+lz),v3(x+lx,k.y,z+lz),.05,'#3a2a1e',4);}},4);
  const falls=api.group('mantenga-falls');built(falls,'falls-cliff',b=>{b.add(new T.BoxGeometry(12,18,5),'#7a746a',[view.x+7,view.y+2,-16],[0,0,0],[1,1,1],.08);for(let i=0;i<8;i++)b.add(new T.SphereGeometry(1+r(),8,6),'#3a6a2a',[view.x+2+r()*10,view.y+10+r()*2,-13.5]);b.add(new T.CylinderGeometry(4,4,.1,20),'#5a9a9a',[view.x+7,view.y-.5,-11],[0,0,0],[1,1,.4]);},5,.95);
  const drop=createWaterfall(falls,{x:view.x+7,top:view.y+11,z:-13.4,width:2.2,height:11.5,seed:12,low,tint:'#eaf6f2'});api.animate({update:t=>drop.update(t)});
  const stream=api.group('mantenga-stream');built(stream,'stream-water',b=>{b.add(new T.BoxGeometry(16,.06,10),'#5a9aa0',[25,-1.5,-3]);for(let i=0;i<8;i++)b.add(new T.SphereGeometry(.4+r()*.4,8,6),'#8a8274',[18+r()*14,-1.4,-1-r()*6],[0,0,0],[1.3,.6,1]);},6);
  plantAfrica(stream,'thorn-scrub',Array.from({length:low?6:12},()=>({x:r()*finish,y:-1,z:-10-r()*6,scale:1})),{low,name:'valley-bush'});
  void level;
 },
 dress(root,definition,_context,api){
  if(definition.style==='beehive-village'){api.landmass(root,definition,'default','mass',2.4);built(root,'village-hearth',b=>{b.add(new T.CylinderGeometry(.6,.6,.12,12),'#5a4a3a',[definition.width/2+2,.06,-1.6]);},api.seed);return true;}
  return false;
 },
});
