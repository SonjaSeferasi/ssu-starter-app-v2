import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {dryStoneWall} from './architecture';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Zimbabwe — Great Zimbabwe: Walls Without Mortar. Granite blocks laid
 * dry in curving walls up to eleven metres high, decorated with a chevron
 * band; inside the Great Enclosure the solid conical tower; on the hill
 * above, the Hill Complex built between balancing granite boulders; msasa
 * woodland flushed red with new leaves. */
const granite=earth('#a89a84','#8a7e6a','#4e463a',{set:'gneiss',tint:'#f0e8dc',repeat:.45},{rough:.12,strata:.8});
const wood=earth('#8a7a3a','#8a6a46','#4a3a26',{set:'savanna-rock',tint:'#efe0c0',repeat:.5});
/** The conical tower: solid, tapering, of the same coursed granite. */
function conicalTower(b:Builder,x:number,y:number,z:number){
 const h=9;for(let i=0;i<18;i++){const t=i/18;b.add(new T.CylinderGeometry(2.4-t*1.1-.06,2.4-t*1.1,h/18*1.02,20),i%2?'#9a8e78':'#a89a84',[x,y+h*t+h/36,z]);}
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;b.add(new T.BoxGeometry(.24,.14,.06),'#6a5e4a',[x+Math.cos(a)*1.32,y+h-.5,z+Math.sin(a)*1.32],[0,-a,Math.PI/4]);}
}
export const environment=africaEnvironment({
 code:'ZWE',id:'africa-zw',name:'zimbabwe-great-zimbabwe-environment',
 representation:'A fictional route inspired by Great Zimbabwe. Walls and tower are simplified studies; the route runs along modern-scale wall tops and boulders as a game device, which visitors must never climb.',
 lighting:{background:'#c8dcec',exposure:1.05,sun:'#ffeccc',sunIntensity:3.2,sky:'#eef2ee',ground:'#4e463a',hemisphere:1.3,rim:'#ffdcb4',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#5a96d0',horizon:'#ece8dc',ground:'#4e463a',intensity:.3}},
 sky:{zenith:'#5a96d0',horizon:'#eee8da',band:'#d8e0dc',glow:'#fff0d4',sun:[-.6,.42,-.6],glowPower:13},
 fog:['#e4e6de',50,200],clouds:{opacity:.7,high:[24,34],groups:12},
 layers:['walls-boulders-and-hilltop','great-enclosure','conical-tower','hill-complex','msasa-woodland','sky'],
 backdrop:[{kind:'forest',name:'msasa-woodland',z:[-60,-20],y:-2,flora:['umbrella-acacia','forest-giant','savanna-grass'],count:60,scale:[.8,1.2]},{kind:'hills',name:'granite-kopjes',z:-140,y:-3,height:14,colors:['#8a7e6a','#9a8e78','#a89a84'],scale:3}],
 floor:{kind:'land',y:-3,colors:['#8a6a46','#9a7a52','#aa8a5e'],name:'valley-floor',rough:.8},
 palettes:{default:granite,'msasa-woodland':wood,'enclosure-floor':wood,'hilltop':granite},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#a89a84',stoneAlt:'#8a7e6a',metal:'#4a4a4a',accent:'#ffd200'},
 capFlora:{default:null,'msasa-woodland':'savanna-grass','enclosure-floor':'savanna-grass','hilltop':'aloe'},
 flora:[{kind:'euphorbia',count:6,z:[-14,-8],y:-3}],
 flocks:[{count:4,y:18,z:-24,color:'#2a2420',wing:'#f4f4f0',size:.9,glide:true,name:'bateleur-eagles'}],
 creature:{name:'rock-monitor',height:.55,shell:'#6a6a4a',belly:'#d8c8a0',foot:'#2a2a22',crest:'spines',accent:'#c8a040'},
 crate:{body:'stone',color:'#a89a84',trim:'#319208',glyph:'#ffd200'},
 checkpoint:{pole:'#5a4028',cloth:'#319208',accent:'#ffd200',cap:'#de2010'},
 finishArch:{style:'stone',stone:'#8a7e6a',trim:'#de2010'},
 landmarks(api){
  const {finish,low,level}=api,r=random(263),enc=api.platform('zw-enclosure'),hill=api.platform('zw-hilltop');
  const great=api.group('great-enclosure');built(great,'curving-walls',b=>{const cx=enc.x+enc.width/2,cz=-12;for(let i=0;i<(low?20:34);i++){const a=Math.PI*(1.05+.9*i/(low?19:33)),x=cx+Math.cos(a)*14,z=cz+Math.sin(a)*7;dryStoneWall(b,[x,enc.y-1.2,z],2.8,7,1.4,'#a89a84',true);}for(const p of level.platforms)if(p.style==='dry-stone-wall'||p.style==='wall-gap')dryStoneWall(b,[p.x+p.width/2,-3,-.8],p.width,p.y+2.6,1.2,'#9a8e78',true);},3,.95);
  const tower=api.group('conical-tower');built(tower,'solid-tower',b=>{conicalTower(b,enc.x+enc.width/2+3,enc.y-1.2,-14);},4);
  const hc=api.group('hill-complex');built(hc,'hill-walls',b=>{for(let i=0;i<6;i++)dryStoneWall(b,[hill.x-4+i*3,hill.y-.5,-9-(i%2)*1.5],3,3.4,1,'#9a8e78',i%2===0);},5);
  const bal=api.group('balancing-granite');built(bal,'balancing-rocks',b=>{for(let i=0;i<(low?4:8);i++){const x=hill.x-14+r()*(finish-hill.x+20),z=-14-r()*10;let y=hill.y-2;for(let k=0;k<3;k++){const s=1.4-k*.3+r()*.4;b.add(new T.SphereGeometry(s,12,8),'#a89a84',[x+(r()-.5)*.6,y+s*.8,z],[r(),r(),0],[1.2,.8,1]);y+=s*1.5;}}},6);
  // Msasa trees flush red in spring; a few here show the new leaves.
  plantAfrica(bal,'umbrella-acacia',Array.from({length:low?4:8},()=>({x:-8+r()*30,y:0,z:-5-r()*5,scale:.8,color:r()<.5?'#a8442e':'#6a8a3a'})),{low,name:'msasa-trees'});
  void v3;
 },
 dress(root,definition,_context,api){
  if(definition.style==='dry-stone-wall'||definition.style==='wall-gap'){const d=api.landmass(root,definition,'default','island',2.4);built(d,'chevron-band',b=>{const w=definition.width;for(let i=0;i<Math.floor(w/.5);i++)b.add(new T.BoxGeometry(.3,.08,.04),'#6a5e4a',[-w/2+.25+i*.5,-.5,1.22],[0,0,i%2?.6:-.6]);for(let k=0;k<3;k++)b.add(new T.BoxGeometry(w,.03,.04),'#7a6e5a',[0,-.9-k*.32,1.22]);},api.seed);return true;}
  return false;
 },
});
