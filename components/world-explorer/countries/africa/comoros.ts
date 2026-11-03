import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {cubeHouse} from './architecture';
import {plantAfrica} from './flora';
import {plantGrove} from '../../kit/vegetation';
import {createDrift} from '../../kit/particles';
import {random,v3} from '../../kit/common';

/** Comoros — Mount Karthala: The Perfumed Volcano. Grande Comore rises from
 * black lava shores and whitewashed villages, through terraces of ylang-
 * ylang trees pruned low for picking, into cloud forest, to the rim of
 * Karthala's vast, steaming caldera — one of the largest active craters. */
const lava=earth('#3a3a36','#2e2c2a','#161514',{set:'alpine-rock',tint:'#b0aca4',repeat:.5},{rough:.28});
const terrace=earth('#5a8a3a','#5a4a3a','#2e2620',{set:'mossy-rock',tint:'#d8e6c0',repeat:.5});
const rim=earth('#7a7a62','#4a4640','#24221e',{set:'alpine-rock',tint:'#d0ccc0',repeat:.5});
export const environment=africaEnvironment({
 code:'COM',id:'africa-km',name:'comoros-karthala-environment',
 representation:'A fictional ascent inspired by Mount Karthala on Grande Comore. The caldera is a simplified study; the route and lava steps are game devices.',
 lighting:{background:'#c4d6dc',exposure:1.03,sun:'#fff0d4',sunIntensity:2.9,sky:'#eaf0ee',ground:'#161514',hemisphere:1.35,rim:'#ffe2c0',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#5a8eb8',horizon:'#e2eae8',ground:'#161514',intensity:.32}},
 sky:{zenith:'#5a90c0',horizon:'#e4ebe8',band:'#d0dcdc',glow:'#fff2d8',sun:[.5,.45,-.6],glowPower:12},
 fog:['#d8e2e2',35,170],clouds:{opacity:.85,high:[20,30],lowBand:[8,12],groups:14},
 layers:['terraces-forest-and-rim','karthala-caldera','crater-rim-path','cloud-forest','grande-comore-coast','sky'],
 backdrop:[{kind:'range',name:'karthala-caldera',z:-150,y:-6,height:22,peaks:2,rock:'#4a4640',forest:'#3a5a32',grass:'#6a7a52',treeLine:14,sharpness:.6,depth:70},{kind:'forest',name:'cloud-forest',z:[-36,-12],y:0,flora:['forest-giant','bamboo-clump','ravenala'],count:50,scale:[.8,1.2]},{kind:'sea',name:'grande-comore-coast',y:-5,z:-100,depth:150,shallow:'#3aa8c0',deep:'#1a5a90'}],
 floor:{kind:'land',y:-5,colors:['#1e1e1c','#2a2a26','#3a3a34'],name:'lava-field',rough:1.4},
 palettes:{default:lava,'ylang-terrace':terrace,'terrace-ledge':terrace,'cloud-forest':terrace,'coastal-village':lava,'crater-rim':rim,'rim-steps':rim,'caldera-overlook':rim},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#3a3a36',stoneAlt:'#2e2c2a',metal:'#4a4a4a',accent:'#3a75c4'},
 capFlora:{default:null,'ylang-terrace':'cocoa-shrub','cloud-forest':'savanna-grass','coastal-village':'savanna-grass'},
 drift:{kind:'mist',count:20,colors:['#eef2f0'],y:[3,10],z:[-12,-2],fall:-.02,sway:1.2,size:1.2,name:'cloud-wisps'},
 flocks:[{count:6,y:14,z:-20,color:'#2a2a2a',wing:'#4a4a4a',size:.9,glide:true,name:'fruit-bats'}],
 creature:{name:'mongoose-lemur',height:.65,shell:'#7a6a5a',belly:'#d8c8b0',foot:'#2a2a2a',crest:'ears',accent:'#c88a4a'},
 crate:{body:'stone',color:'#3a3a36',trim:'#3a75c4',glyph:'#ffc61e'},
 checkpoint:{pole:'#5a4028',cloth:'#3a75c4',accent:'#ffffff',cap:'#3d8e33'},
 finishArch:{style:'stone',stone:'#2e2c2a',trim:'#3d8e33'},
 landmarks(api){
  const {finish,low,features}=api,r=random(269),v=api.platform('km-village'),rimP=api.platform('km-rim');
  const coast=api.group('coast-village');built(coast,'whitewashed-village',b=>{for(let i=0;i<(low?5:10);i++)cubeHouse(b,[v.x-4+i*2.8,v.y-.1,-7-(i%3)*2],[2.2,2,2.2],{wall:'#f2ece0',door:'#3a6a8a',trim:'#c8b898'},i===4);b.add(new T.BoxGeometry(.9,5,.9),'#f2ece0',[v.x+8,v.y+2.5,-10]);b.add(new T.ConeGeometry(.6,1.4,8),'#3d8e33',[v.x+8,v.y+5.7,-10]);},3);
  createShoreFoam(features,Array.from({length:low?6:14},(_,i)=>({x:-10+i*3,y:-4.9,z:-12-(i%2),size:1.2})),low);
  const ylang=api.group('ylang-ylang-terraces');built(ylang,'ylang-trees',b=>{for(let i=0;i<(low?10:22);i++){const x=8+r()*30,y=.4+r()*1.5,z=-5-r()*6;b.strut(v3(x,y,z),v3(x,y+.8,z),.1,'#5a4632',5);for(let k=0;k<5;k++){const a=k/5*Math.PI*2;b.strut(v3(x,y+.8,z),v3(x+Math.cos(a)*1.1,y+.5,z+Math.sin(a)*1.1),.05,'#5a4632',4);b.add(new T.SphereGeometry(.4,6,4),'#4a7a2a',[x+Math.cos(a)*1.1,y+.6,z+Math.sin(a)*1.1]);b.add(new T.ConeGeometry(.06,.18,4).rotateX(Math.PI),'#e8d84a',[x+Math.cos(a)*1.1,y+.3,z+Math.sin(a)*1.1]);}}},4);
  const crater=api.group('crater-rim-path');built(crater,'caldera-wall',b=>{const cx=rimP.x+rimP.width/2+14,cz=-26;for(let i=0;i<28;i++){const a=i/28*Math.PI*2;b.add(new T.BoxGeometry(4,3+r()*3,3),'#4a4640',[cx+Math.cos(a)*16,rimP.y-1,cz+Math.sin(a)*8],[0,-a,0]);}b.add(new T.CylinderGeometry(15,10,.4,28),'#2a2826',[cx,rimP.y-4,cz],[0,0,0],[1,1,.5]);b.add(new T.CylinderGeometry(4,4,.1,20),'#6a8a7a',[cx+3,rimP.y-3.7,cz],[0,0,0],[1,1,.5]);},5,.95);
  const steam=createDrift(crater,{kind:'mist',count:low?8:18,colors:['#f2f2ee'],x:[rimP.x+6,rimP.x+30],y:[rimP.y-3,rimP.y+8],z:[-32,-20],fall:-.4,sway:1,size:1.6,seed:6,name:'caldera-steam'});
  api.animate({update:t=>steam.update(t),setVisible:x=>steam.setVisible(x),motion:true});
  plantGrove(coast,'coconut-palm',Array.from({length:low?3:6},()=>({x:v.x-6+r()*14,y:-.4,z:-12-r()*4,scale:1})),{low,name:'village-palms'});
  plantAfrica(ylang,'banana',Array.from({length:low?3:6},()=>({x:10+r()*20,y:.5,z:-9-r()*3,scale:.9})),{low,name:'terrace-bananas'});
 },
});
