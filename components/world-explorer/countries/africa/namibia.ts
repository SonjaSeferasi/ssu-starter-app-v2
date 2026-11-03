import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Namibia — Sossusvlei and Deadvlei. Star dunes of apricot-to-crimson
 * sand, some over 300 m high, their sharp crests half in shadow; between
 * them the white clay pan of Deadvlei with its blackened, 900-year-old camel
 * thorn trees; oryx with long straight horns; a sky of deep blue. */
const red=earth('#d8643a','#c0502e','#7a2e1a',{set:'sandstone-cliff',tint:'#ffd0b8',repeat:.35},{rough:.06});
const clay=earth('#f2ece0','#e0d6c4','#a89c86',{set:'limestone',tint:'#ffffff',repeat:.7},{rough:.04});
/** A dead camel thorn: a black, twisted trunk and bare angular branches. */
function deadTree(b:Builder,x:number,y:number,z:number,s:number,r:()=>number){
 const top=v3(x+(r()-.5)*.6*s,y+2.4*s,z);b.strut(v3(x,y,z),top,.16*s,'#2a1e18',6);
 for(let i=0;i<5;i++){const a=r()*Math.PI*2,end=v3(top.x+Math.cos(a)*1.6*s,top.y+(.2+r()*.9)*s,z+Math.sin(a)*.8*s);b.strut(top,end,.07*s,'#2a1e18',4);b.strut(end,v3(end.x+Math.cos(a+.8)*.6*s,end.y+.4*s,end.z),.035*s,'#2a1e18',3);}
}
function oryx(b:Builder,x:number,y:number,z:number){
 b.add(new T.SphereGeometry(.55,10,8),'#c8b8a0',[x,y+1.2,z],[0,0,0],[1.6,.8,.7]);b.add(new T.BoxGeometry(1.6,.2,.72),'#2a2420',[x,y+.95,z]);b.add(new T.SphereGeometry(.24,8,6),'#f2ece0',[x+.95,y+1.55,z]);
 b.add(new T.BoxGeometry(.1,.25,.26),'#2a2420',[x+1.05,y+1.6,z]);for(const s of [-1,1])b.strut(v3(x+.95,y+1.7,z+s*.08),v3(x+.45,y+2.9,z+s*.12),.03,'#2a2420',4);
 for(const [lx,lz] of [[-.6,-.2],[-.6,.2],[.6,-.2],[.6,.2]])b.strut(v3(x+lx,y+.9,z+lz),v3(x+lx,y,z+lz),.06,'#e8e0d0',4);
}
export const environment=africaEnvironment({
 code:'NAM',id:'africa-na',name:'namibia-sossusvlei-environment',
 representation:'A fictional route inspired by Sossusvlei and Deadvlei. Climbing dunes is real there; hopping the dead trees is purely a game device, and the real trees must never be touched.',
 lighting:{background:'#7ab0e8',exposure:1.08,sun:'#ffd8a8',sunIntensity:3.6,sky:'#e8f0f8',ground:'#7a2e1a',hemisphere:1.15,rim:'#ffa070',rimIntensity:.8,pixelRatio:1.25,reflections:{zenith:'#2a6ad0',horizon:'#e4c8b0',ground:'#7a2e1a',intensity:.28}},
 sky:{zenith:'#1e5ec8',horizon:'#f0d4bc',band:'#a8c8ec',glow:'#ffd8a8',sun:[.8,.25,-.55],glowPower:8},
 fog:['#e8c8b0',70,240],clouds:false,
 layers:['dunes-pan-and-trees','red-star-dunes','deadvlei-trees','white-clay-pan','namib-sand-sea','sky'],
 backdrop:[{kind:'dunes',name:'namib-sand-sea',z:-170,y:-8,height:30,colors:['#a83a22','#d0583a','#e8784a'],crests:4,depth:90},{kind:'dunes',name:'red-star-dunes',z:-70,y:-6,height:20,colors:['#7a2e1a','#c0502e','#e8704a'],crests:5,depth:40}],
 floor:{kind:'land',y:-4,colors:['#e0d6c4','#ece4d6','#f6f0e6'],name:'white-clay-pan',rough:.2,apron:['#b8502e','#c8603a','#d4744a']},
 palettes:{default:red,'white-clay-pan':clay,'salt-flat':clay},
 deck:{wood:'#2a1e18',woodAlt:'#3a2a20',rope:'#c9b07a',stone:'#c0502e',stoneAlt:'#7a2e1a',metal:'#4a4a4a',accent:'#003580'},
 capFlora:{default:null,'desert-camp':'savanna-grass'},
 drift:{kind:'dust',count:30,colors:['#e8804a','#f09a6a'],y:[1,6],z:[-4,3],fall:-.01,sway:2.6,size:.07,name:'crest-sand'},
 flocks:[{count:4,y:20,z:-26,color:'#2a2420',wing:'#5a4a3a',size:.9,glide:true,name:'lappet-faced-vultures'}],
 creature:{name:'oryx',height:1,shell:'#c8b8a0',belly:'#f2ece0',foot:'#2a2420',crest:'twin-horns',accent:'#2a2420'},
 crate:{body:'wood',color:'#3a2a20',trim:'#003580',glyph:'#ffce00'},
 checkpoint:{pole:'#3a2a20',cloth:'#003580',accent:'#ffce00',cap:'#d21034'},
 finishArch:{style:'timber',stone:'#7a2e1a',trim:'#003580'},
 landmarks(api){
  const {finish,low,level}=api,r=random(264),pan=api.platform('nm-pan');
  const trees=api.group('deadvlei-trees');built(trees,'dead-camel-thorns',b=>{for(let i=0;i<(low?8:16);i++)deadTree(b,pan.x+r()*30,-4,-6-r()*14,.9+r()*.6,r);for(const p of level.platforms)if(p.style==='deadvlei-tree'){deadTree(b,p.x+p.width/2,-4,-.4,(p.y+4)/2.6,r);}},3);
  plantAfrica(trees,'dead-camelthorn',Array.from({length:low?3:6},()=>({x:pan.x+r()*30,y:-4,z:-18-r()*10,scale:1})),{low,name:'far-dead-trees'});
  const herd=api.group('oryx');built(herd,'oryx-herd',b=>{for(let i=0;i<(low?2:4);i++)oryx(b,pan.x-10+i*5+r()*2,-4,-10-r()*4);},4);
  plantAfrica(herd,'quiver-tree',[{x:-4,y:0,z:-5,scale:.9}],{low,name:'camp-quiver-tree'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='deadvlei-tree'){built(root,'tree-crown-perch',(b,rr)=>{const w=definition.width;b.add(new T.BoxGeometry(w,.3,1.2),'#2a1e18',[0,-.15,0]);for(let i=0;i<4;i++)b.strut(v3(-w/2+.3+i*w/4,-.2,0),v3(-w/2+.1+i*w/4+(rr()-.5),-.9-rr()*.6,(rr()-.5)*1.4),.07,'#2a1e18',4);b.strut(v3(0,-.2,0),v3(0,-5,-.2),.22,'#2a1e18',6);},api.seed);return true;}
  return false;
 },
});
