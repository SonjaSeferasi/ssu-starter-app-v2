import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {rondavel} from './architecture';
import {plantAfrica} from './flora';
import {random} from '../../kit/common';

/** Guinea-Bissau — Bijagós: The Hippo Crossing. Low islands of palm and
 * mangrove in warm tidal channels, oyster reefs, green-turtle beaches, a
 * thatched Bijagó village, and hippos that swim between the islands. */
const sand=earth('#ecd6a8','#d4b47e','#9a7a50',{set:'sandstone-cliff',tint:'#fff0d4',repeat:.4},{rough:.08});
const reef=earth('#9a9484','#7a7464','#4a463c',{set:'coastal-rock',tint:'#e8e4d8',repeat:.6});
/** A hippo body: barrel, broad head, small ears; mostly below the water. */
function hippoBody(b:import('../../kit/common').Builder,x:number,y:number,z:number,s=1){
 b.add(new T.SphereGeometry(1,14,10),'#6a5a62',[x,y,z],[0,0,0],[1.5*s,.7*s,.85*s],.04);b.add(new T.SphereGeometry(.6,12,8),'#7a6a70',[x+1.4*s,y+.05,z],[0,0,0],[1.1*s,.7*s,.8*s]);
 b.add(new T.SphereGeometry(.4,10,6),'#8a7078',[x+1.9*s,y-.05,z],[0,0,0],[.8*s,.6*s,.9*s]);for(const sz of [-1,1]){b.add(new T.SphereGeometry(.1,6,4),'#5a4a52',[x+1.3*s,y+.45*s,z+sz*.32*s]);b.add(new T.SphereGeometry(.09,6,4),'#ffffff',[x+1.65*s,y+.3*s,z+sz*.28*s]);}
}
export const environment=africaEnvironment({
 code:'GNB',id:'africa-gw',name:'guinea-bissau-bijagos-environment',
 representation:'A fictional island-hopping course inspired by the Bijagós Archipelago. Standing on hippos is purely a game device; real hippos are dangerous and must never be approached.',
 lighting:{background:'#bfe0ea',exposure:1.05,sun:'#ffe6c0',sunIntensity:3.1,sky:'#eef4ee',ground:'#9a7a50',hemisphere:1.35,rim:'#ffe0b8',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#5aa6d6',horizon:'#eaf0e6',ground:'#9a7a50',intensity:.36}},
 sky:{zenith:'#4a9ad6',horizon:'#eef0e2',band:'#d8e8e6',glow:'#fff0d4',sun:[.6,.4,-.65],glowPower:14},
 fog:['#e0ece8',50,200],clouds:{opacity:.8,high:[22,32],groups:16},
 layers:['sandbars-hippos-and-reefs','saltwater-hippos','turtle-beach','bijagos-islands','atlantic-channels','sky'],
 backdrop:[{kind:'sea',name:'atlantic-channels',y:-2.6,z:-80,depth:150,shallow:'#5ab8b8',deep:'#2a7a8a'},{kind:'forest',name:'bijagos-islands',z:[-60,-40],y:-2.2,flora:['oil-palm','mangrove'],count:36,scale:[.9,1.3]}],
 floor:{kind:'water',y:-2.6,shallow:'#6ac6c2',deep:'#2e8a92',name:'tidal-channel',opacity:.9},
 palettes:{default:sand,'oyster-reef':reef,'mangrove-root':reef,'bijago-village':earth('#c8a670','#a8804e','#6e5232',{set:'savanna-rock',tint:'#efdcc0',repeat:.5})},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#d4b47e',stoneAlt:'#9a7a50',metal:'#4a4a4a',accent:'#ce1126'},
 capFlora:{default:'savanna-grass','oyster-reef':null,'sandbar':null,'mangrove-root':null},
 flora:[{kind:'oil-palm',count:16,z:[-16,-8],y:-1.6,scale:[.8,1.1],sway:.03}],
 flocks:[{count:10,y:9,z:-22,color:'#f4f4f0',wing:'#2a2a2a',size:.45,name:'terns'}],
 creature:{name:'fiddler-crab',height:.5,shell:'#c8582e',belly:'#f0b48a',foot:'#8a3a1e',crest:'antennae',accent:'#c8582e'},
 crate:{body:'wood',color:'#ce1126',trim:'#fcd116',glyph:'#ffffff'},
 checkpoint:{pole:'#6b4b2e',cloth:'#ce1126',accent:'#fcd116',cap:'#009e49'},
 finishArch:{style:'timber',stone:'#8a6a48',trim:'#5a4028'},
 hazardPalette:{column:'#eaf8f8',base:'#9a8f7a',warning:'#ffd27a',debris:'#f4fbfb'},
 landmarks(api){
  const {finish,low,features}=api,r=random(88);
  // Hippos wallowing in the channels beyond the route, rising and sinking.
  const pod=api.group('saltwater-hippos'),wallow=new T.Group();wallow.name='wallowing-hippos';pod.add(wallow);
  built(wallow,'hippo-pod',b=>{for(const [x,z,s] of [[finish*.2,-12,1],[finish*.24,-15,.8],[finish*.55,-13,1.1],[finish*.7,-17,.9]] as const)hippoBody(b,x,-2.6,z,s);},5);
  api.animate({update:t=>{wallow.position.y=Math.sin(t*.6)*.25;},motion:true,setVisible:v=>{wallow.visible=v;}});
  // Oyster reefs and mangrove clumps in the shallows.
  const reefs=api.group('oyster-reefs');built(reefs,'reef-crusts',b=>{for(let i=0;i<(low?8:18);i++)b.add(new T.DodecahedronGeometry(.8+r()*.8,0),'#8a8474',[r()*finish,-2.7,-4-r()*6],[0,r()*3,0],[1.4,.35,1]);},6);
  // Turtle beach: tracks in the sand and a turtle hauling out.
  const beach=api.group('turtle-beach'),tb=api.platform('gw-turtle-beach');
  built(beach,'nesting-turtles',b=>{for(const dx of [2,7]){b.add(new T.SphereGeometry(.7,12,8),'#4a5a3a',[tb.x+dx,tb.y+.25,-2.4],[0,0,0],[1.3,.4,1]);b.add(new T.SphereGeometry(.25,8,6),'#6a7a5a',[tb.x+dx+.95,tb.y+.25,-2.4]);for(let k=0;k<6;k++)b.add(new T.BoxGeometry(.3,.02,.12),'#c4a470',[tb.x+dx-1.2-k*.5,tb.y+.02,-2.4+(k%2?.25:-.25)]);}},7);
  const palms=api.group('palm-groves'),v=api.platform('gw-village');
  plantAfrica(palms,'oil-palm',Array.from({length:low?4:9},(_,i)=>({x:v.x-6+i*2.6,y:v.y,z:-5-r()*4,scale:.9+r()*.3})),{low,name:'village-palms'});
  built(palms,'bijago-houses',b=>{for(let i=0;i<4;i++)rondavel(b,[v.x+2+i*3,v.y,-6.5-(i%2)*1.5],1.2,{wall:'#a8804e',thatch:'#b99a5a'});},8);
  createShoreFoam(features,Array.from({length:low?8:18},(_,i)=>({x:-2+i*5,y:-2.5,z:-3.2,size:1.1})),low);
 },
 dress(root,definition,_context,api){
  if(definition.style==='hippo-back'){built(root,'hippo-back',b=>{hippoBody(b,-.3,-.75,0,.95);b.add(new T.BoxGeometry(definition.width,.08,1.5),'#7a6a70',[0,-.04,0]);},api.seed);return true;}
  return false;
 },
});
