import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,v3} from '../../kit/common';

/** Ghana — Kakum: The Canopy Walkway. Rope walkways and timber platforms
 * strung between the trunks of emergent rainforest giants, high above a
 * fern-and-sapling forest floor, with hornbills crossing the canopy. */
const floor=earth('#4f6a32','#5a4632','#33281c',{set:'mossy-rock',tint:'#d0d6c0',repeat:.5},{rough:.14});
const timber=earth('#8a6a44','#6b4b2e','#3e2a1a',{set:'savanna-rock',tint:'#e8d6c0',repeat:.6},{rough:.02});
export const environment=africaEnvironment({
 code:'GHA',id:'africa-gh',name:'ghana-kakum-environment',
 representation:'A fictional canopy course inspired by the Kakum canopy walkway. Its swaying spans and breaking planks are game devices; the real walkway is maintained and safe.',
 lighting:{background:'#a8c4a8',exposure:1.02,sun:'#f8f0c8',sunIntensity:2.7,sky:'#dce8d0',ground:'#33281c',hemisphere:1.45,rim:'#d8f0b8',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#7aa090',horizon:'#d6e2c8',ground:'#33281c',intensity:.28}},
 sky:{zenith:'#6a9ab8',horizon:'#dce6cc',band:'#c8d8bc',glow:'#f6f2d0',sun:[-.3,.65,-.6],glowPower:14},
 fog:['#c6d6bc',30,150],clouds:{opacity:.9,high:[26,36],groups:12,shade:'#c0d0bc'},
 layers:['tree-platforms-and-walkways','kakum-canopy-walkway','emergent-trees','understory','forest-floor','sky'],
 backdrop:[{kind:'forest',name:'canopy-sea',z:[-80,-40],y:-6,flora:['forest-giant'],count:40,scale:[1,1.4]}],
 floor:{kind:'land',y:-6,colors:['#3a4a26','#4a5a30','#5a6a3a'],name:'forest-floor',rough:1.4},
 palettes:{default:floor,'tree-platform':timber,'big-tree-platform':timber,'buttress-root':floor},
 deck:{wood:'#8a6a44',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#6a5a44',stoneAlt:'#4a3a2a',metal:'#4a4a4a',accent:'#fcd116'},
 decks:{'rope-walkway':'rope','broken-plank':'rope','swaying-span':'suspended'},
 capFlora:{default:'cocoa-shrub','tree-platform':null,'big-tree-platform':null,'tower-stairs':null,'buttress-root':null},
 flora:[{kind:'forest-giant',count:18,z:[-24,-10],y:-6,scale:[.9,1.3]},{kind:'banana',count:16,z:[-8,-4],y:-6,scale:[1,1.4],sway:.04},{kind:'cocoa-shrub',count:20,z:[-10,-4],y:-6,scale:[1,1.4]}],
 flocks:[{count:3,y:14,z:-14,color:'#1a1a1a',wing:'#f2f2f2',size:1.1,glide:true,name:'hornbills'}],
 drift:{kind:'leaf',count:22,colors:['#7a9a3a','#a8a04a','#5a7a2a'],y:[0,10],z:[-4,3],fall:.25,sway:1.2,size:.14,name:'falling-leaves'},
 creature:{name:'tree-pangolin',height:.6,shell:'#8a6a44',belly:'#e0c8a0',foot:'#4a3a2a',crest:'shell-plates',accent:'#7a5a38'},
 crate:{body:'wood',color:'#ce1126',trim:'#fcd116',glyph:'#006b3f'},
 checkpoint:{pole:'#6b4b2e',cloth:'#ce1126',accent:'#fcd116',cap:'#006b3f'},
 finishArch:{style:'jungle',stone:'#6b4b2e',trim:'#3a5a2a'},
 ropeColor:'#c9b07a',
 landmarks(api){
  const {finish,low,level}=api,r=random(1931);
  // A trunk under every tree platform, with a crown overhead and buttresses.
  const trees=api.group('emergent-trees');
  built(trees,'platform-trunks',b=>{for(const p of level.platforms)if(p.style==='tree-platform'||p.style==='big-tree-platform'){const x=p.x+p.width/2;b.add(new T.CylinderGeometry(.9,1.4,p.y+7,14),'#8a7f6c',[x,(p.y-6)/2,-2.4],[0,0,0],[1,1,1],.06);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;b.add(new T.BoxGeometry(.12,3,1.8),'#7d725f',[x+Math.cos(a)*1.2,-4.5,-2.4+Math.sin(a)*1.2],[0,-a,0]);}b.add(new T.CylinderGeometry(.6,.9,10,12),'#8a7f6c',[x,p.y+5,-2.6]);}},3,.92);
  plantAfrica(trees,'forest-giant',level.platforms.filter(p=>p.style?.includes('tree-platform')).map(p=>({x:p.x+p.width/2,y:p.y-6,z:-2.6,scale:1.2})),{low,name:'walkway-crowns'});
  // The walkway's support lines: guy ropes from each trunk.
  const walkway=api.group('kakum-canopy-walkway');
  built(walkway,'walkway-guys',b=>{for(const p of level.platforms)if(p.style==='tree-platform'||p.style==='big-tree-platform'){const x=p.x+p.width/2;for(const s of [-1,1])b.strut(v3(x,p.y+4,-2.4),v3(x+s*p.width*.6,p.y+.9,s>0?-1.3:-1.3),.025,'#c9b07a',4);}for(const p of level.platforms)if(p.style==='rope-walkway')for(let x=p.x;x<p.x+p.width;x+=1.2)b.add(new T.BoxGeometry(.05,1,.05),'#c9b07a',[x,p.y+.3,-1.42]);},5);
  const plats=api.group('tree-platforms');void plats;
  const ground=api.group('understory');plantAfrica(ground,'ravenala',Array.from({length:low?4:8},()=>({x:r()*finish,y:-6,z:-4-r()*4,scale:1.1})),{low,name:'understory-palms'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='tree-platform'||style==='big-tree-platform'){built(root,'tree-platform-deck',b=>{b.add(new T.BoxGeometry(w,.3,2.8),'#8a6a44',[0,-.15,0]);for(let x=-w/2+.2;x<w/2;x+=.35)b.add(new T.BoxGeometry(.02,.31,2.82),'#5a4028',[x,-.15,0]);for(const s of [-1,1])b.strut(v3(s*(w/2-.3),-.3,0),v3(s*.6,-2.4,-.8),.1,'#6b4b2e',5);b.add(new T.BoxGeometry(w,.06,.06),'#c9b07a',[0,.95,-1.4]);for(let x=-w/2;x<=w/2;x+=1)b.add(new T.CylinderGeometry(.04,.04,1,5),'#6b4b2e',[x,.5,-1.4]);},api.seed);return true;}
  return false;
 },
});
