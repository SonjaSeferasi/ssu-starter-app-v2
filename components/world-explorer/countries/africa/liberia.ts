import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {boat,lighthouse,cubeHouse} from './architecture';
import {plantAfrica} from './flora';
import {random} from '../../kit/common';
import {plantGrove} from '../../kit/vegetation';

/** Liberia — Robertsport: The Surf Coast. Long Atlantic swells peeling
 * along a palm-backed bay under the forested hump of Cape Mount, painted
 * fishing canoes on the sand and a lighthouse on the headland. */
const sand=earth('#e8d2a2','#cfb07a','#8f7448',{set:'sandstone-cliff',tint:'#fff0d4',repeat:.4},{rough:.08});
const granite=earth('#6f7a52','#7a7a6e','#46463e',{set:'gneiss',tint:'#e0e0d6',repeat:.5},{rough:.2});
export const environment=africaEnvironment({
 code:'LBR',id:'africa-lr',name:'liberia-robertsport-environment',
 representation:'A fictional coastal course inspired by Robertsport and Cape Mount. Riding the boards between rocks is a game device; currents and waves are simplified.',
 lighting:{background:'#c4d8e2',exposure:1.04,sun:'#ffdcb0',sunIntensity:3,sky:'#eef0ea',ground:'#46463e',hemisphere:1.3,rim:'#ffd0a0',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#5a96c8',horizon:'#f0e6d8',ground:'#46463e',intensity:.38}},
 sky:{zenith:'#5a90c8',horizon:'#f4e2c8',band:'#e8d8c8',glow:'#ffe2b8',sun:[.75,.25,-.6],glowPower:9},
 fog:['#e6e2d8',50,200],clouds:{opacity:.8,high:[22,32],groups:15,color:'#fff4e8'},
 layers:['beach-rocks-and-boards','atlantic-surf','fishing-canoes','cape-mount','atlantic-ocean','sky'],
 backdrop:[{kind:'sea',name:'atlantic-ocean',y:-3,z:-90,depth:170,shallow:'#4aa6b0',deep:'#1a5a80'},{kind:'range',name:'cape-mount',z:-80,y:-4,height:22,peaks:2,rock:'#5a6a4a',forest:'#2f5a2a',grass:'#4a6a3a',treeLine:30,sharpness:.9,depth:40}],
 floor:{kind:'water',y:-3,shallow:'#5ab6b8',deep:'#1f6a88',name:'surf-zone',opacity:.9},
 palettes:{default:sand,'surf-rock':granite,'cape-point':granite,'cape-slope':granite,'lighthouse-hill':granite,'lighthouse-steps':granite,'rock-pool':granite,'fishing-village':sand},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#7a7a6e',stoneAlt:'#46463e',metal:'#4a4a4a',accent:'#bf0a30'},
 capFlora:{default:null,'cape-slope':'savanna-grass','lighthouse-hill':'savanna-grass','fishing-village':'savanna-grass'},
 flora:[{kind:'oil-palm',count:14,z:[-14,-8],y:-1.4,scale:[.9,1.2],sway:.04}],
 flocks:[{count:8,y:10,z:-18,color:'#f4f4f0',wing:'#3a3a3a',size:.6,glide:true,name:'gulls'}],
 drift:{kind:'mist',count:16,colors:['#f6fafa'],y:[-2,1],z:[-6,-1],fall:-.02,sway:2.2,size:1.2,name:'sea-spray'},
 hazardPalette:{column:'#f2fbfb',base:'#9a8f7a',warning:'#ffd27a',debris:'#f6fbfb'},
 creature:{name:'ghost-crab',height:.55,shell:'#e8d8b0',belly:'#f6ecd8',foot:'#c8b090',crest:'antennae',accent:'#e8d8b0'},
 crate:{body:'wood',color:'#002868',trim:'#bf0a30',glyph:'#ffffff'},
 checkpoint:{pole:'#6b4b2e',cloth:'#bf0a30',accent:'#ffffff',cap:'#002868'},
 finishArch:{style:'harbor',stone:'#e8e4dc',trim:'#bf0a30'},
 landmarks(api){
  const {finish,low,features}=api,r=random(1836);
  const surf=api.group('atlantic-surf');
  createShoreFoam(surf,Array.from({length:low?14:30},()=>({x:-10+r()*(finish+20),y:-2.9,z:-4-r()*16,size:1.2+r()*1.4})),low);
  built(surf,'swell-lines',b=>{for(let i=0;i<6;i++)b.add(new T.CylinderGeometry(.35,.6,finish+40,8,1,false,0,Math.PI).rotateZ(Math.PI/2),'#3a9aaa',[finish/2,-3,-10-i*7],[0,0,0],[1,1,.6]);},2);
  const canoes=api.group('fishing-canoes');built(canoes,'painted-canoes',b=>{for(let i=0;i<6;i++)boat(b,[-4+i*3.4,-.6,-3.6-(i%2)*1.6],4.6,{hull:['#bf0a30','#002868','#e2a23a','#2f7a5a'][i%4],trim:'#f2f2ee'},.15*(i%3-1));},4);
  const cape=api.group('cape-lighthouse'),c=api.platform('lr-lighthouse');
  built(cape,'cape-lighthouse',b=>{lighthouse(b,[c.x+9,c.y,-4.2],7,['#f4f2ee','#bf0a30']);cubeHouse(b,[c.x+5,c.y,-5.4],[2.4,2,2.2],{wall:'#f4f2ee',door:'#002868'});},6);
  const rocks=api.group('surf-rocks');built(rocks,'outer-rocks',b=>{for(let i=0;i<9;i++)b.add(new T.DodecahedronGeometry(.8+r()*1.2,0),'#5a5a52',[r()*finish,-3,-7-r()*10],[0,r()*3,0],[1.2,.7,1]);},5);
  plantGrove(features,'coconut-palm',Array.from({length:low?5:11},()=>({x:-8+r()*(finish+12),y:-.4,z:-6-r()*6,scale:.8+r()*.4})),{low,name:'beach-coconut-palms'});
  plantAfrica(features,'umbrella-acacia',[{x:-2,y:0,z:-5,scale:.7}],{low,name:'village-shade-tree'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='surfboard'){built(root,'surfboard',b=>{const g=new T.CylinderGeometry(w/2,w/2,.16,16);g.scale(1,1,.28);b.add(g,'#f4f2ee',[0,-.08,0]);b.add(new T.BoxGeometry(w*.9,.02,.08),'#bf0a30',[0,.01,0]);b.add(new T.BoxGeometry(.08,.3,.4),'#2a2a2a',[-w/2+.3,-.3,0]);},api.seed);return true;}
  return false;
 },
});
