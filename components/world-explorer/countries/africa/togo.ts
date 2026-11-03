import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {towerHouse} from './architecture';
import {plantAfrica} from './flora';
import {random,v3} from '../../kit/common';

/** Togo — Koutammakou: The Tower Houses. Earthen takienta stand alone in
 * their fields, each a cluster of round towers joined by a wall, granaries
 * with thatched caps on the terrace, the Atakora hills behind. */
const banco=earth('#b07a4a','#9a6a40','#5e3e24',{set:'savanna-rock',tint:'#f0d2b0',repeat:.5},{rough:.1});
const field=earth('#a89a5a','#9a6a40','#5e3e24',{set:'savanna-rock',tint:'#f0dcc0',repeat:.5});
export const environment=africaEnvironment({
 code:'TGO',id:'africa-tg',name:'togo-koutammakou-environment',
 representation:'A fictional course inspired by the takienta of Koutammakou. Houses are inhabited homes; climbing them here is a game device, and the shrines shown are generic and respectful studies.',
 lighting:{background:'#e8d2b0',exposure:1.05,sun:'#ffdca8',sunIntensity:3.1,sky:'#f2e2c8',ground:'#5e3e24',hemisphere:1.2,rim:'#ffc890',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#88a8c8',horizon:'#efd8b8',ground:'#5e3e24',intensity:.26}},
 sky:{zenith:'#7a9ec8',horizon:'#f0d8b4',band:'#e8ceaa',glow:'#ffe6be',sun:[.7,.3,-.6],glowPower:9},
 fog:['#ead4b2',45,190],clouds:{opacity:.5,high:[28,38],groups:8,shade:'#e6d2b6'},
 layers:['tower-houses-and-turrets','takienta-tower-houses','compound-yards','millet-fields','atakora-hills','sky'],
 backdrop:[{kind:'range',name:'atakora-hills',z:-120,y:-6,height:18,peaks:6,rock:'#8a7a5a',forest:'#5a6a3a',grass:'#8a8a4a',treeLine:16,sharpness:1.1}],
 floor:{kind:'land',y:-4,colors:['#9a8a4a','#a89a5a','#b8aa6a'],name:'savanna-floor',rough:.8},
 palettes:{default:banco,'millet-field':field,'compound-yard':field,'atakora-hill':field},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#b07a4a',stoneAlt:'#9a6a40',metal:'#4a4a4a',accent:'#d21034'},
 capFlora:{default:null,'millet-field':'savanna-grass','compound-yard':'savanna-grass','atakora-hill':'savanna-grass'},
 flora:[{kind:'baobab',count:5,z:[-28,-18],y:-4,scale:[1,1.3]},{kind:'savanna-grass',count:40,z:[-10,-4],y:-4,scale:[1.2,1.8],sway:.05}],
 flocks:[{count:6,y:16,z:-22,color:'#2a2a2a',wing:'#6a6a6a',size:.5,name:'swifts'}],
 creature:{name:'dwarf-goat',height:.7,shell:'#f2ece0',belly:'#d8ccb8',foot:'#3a3a3a',crest:'twin-horns',accent:'#8a7a6a'},
 crate:{body:'wood',color:'#006a4e',trim:'#ffce00',glyph:'#d21034'},
 checkpoint:{pole:'#5a4028',cloth:'#006a4e',accent:'#ffce00',cap:'#d21034'},
 finishArch:{style:'timber',stone:'#9a6a40',trim:'#5e3e24'},
 landmarks(api){
  const {finish,low,features}=api,r=random(1140);
  const towers=api.group('takienta-tower-houses');
  built(towers,'distant-takienta',b=>{for(let i=0;i<(low?6:12);i++)towerHouse(b,[r()*finish,-4,-14-r()*16],{wall:r()<.5?'#b07a4a':'#a8703f',cap:'#c9a35a'},3+Math.floor(r()*2));},3,.92);
  const granaries=api.group('granary-turrets');built(granaries,'yard-granaries',b=>{for(let i=0;i<6;i++){const x=r()*finish,z=-6-r()*3;b.add(new T.CylinderGeometry(.7,.8,2,12),'#a8703f',[x,-3,z]);b.add(new T.ConeGeometry(1,1,12),'#c9a35a',[x,-1.5,z]);}},4);
  const yards=api.group('compound-yards'),y=api.platform('tg-yard');
  built(yards,'yard-life',b=>{for(let i=0;i<3;i++)b.add(new T.CylinderGeometry(.4,.3,.6,10),'#7a4a2a',[y.x+2+i*1.2,y.y+.3,-2.2]);b.add(new T.CylinderGeometry(.6,.6,.08,12),'#3a3a3a',[y.x+6,y.y+.04,-2.6]);b.add(new T.ConeGeometry(.5,.9,8),'#8a5a3a',[y.x+7.6,y.y+.45,-3.2]);},5);
  const fields=api.group('millet-fields');plantAfrica(fields,'savanna-grass',Array.from({length:low?20:50},()=>({x:-8+r()*20,y:0,z:-2-r()*5,scale:1.6+r()*.6})),{low,name:'millet-stands'});
  void features;void v3;
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='takienta'){const d=api.landmass(root,definition,'default','mass',4.6);built(d,'takienta-towers',b=>{for(const sx of [-1,1]){b.add(new T.CylinderGeometry(.8,.9,.9,12),'#a8703f',[sx*(w/2-.9),.45,-1.6]);b.add(new T.ConeGeometry(1,1,12),'#c9a35a',[sx*(w/2-.9),1.4,-1.6]);}b.add(new T.BoxGeometry(.6,1,.06),'#2a1e14',[0,-3.2,1.25]);for(let y=-.8;y>-4.4;y-=.5)b.add(new T.BoxGeometry(.5,.05,.08),'#5a4028',[-w/2-.06,y,0],[0,Math.PI/2,0]);},api.seed);return true;}
  if(style==='granary-turret'||style==='thatch-cap'){built(root,style,b=>{const h=definition.y+4;b.add(new T.CylinderGeometry(w/2-.1,w/2,.3,12),style==='thatch-cap'?'#c9a35a':'#9a6a40',[0,-.15,0]);b.add(new T.CylinderGeometry(w/2-.15,w/2-.05,h,12),'#a8703f',[0,-.3-h/2,0],[0,0,0],[1,1,1],.05);if(style==='thatch-cap')for(let i=0;i<10;i++)b.add(new T.BoxGeometry(.06,.35,.06),'#b8924a',[Math.cos(i/10*Math.PI*2)*(w/2-.05),-.35,Math.sin(i/10*Math.PI*2)*(w/2-.05)]);},api.seed);return true;}
  if(style==='takienta-terrace'){built(root,'takienta-terrace',b=>{const h=definition.y+4;b.add(new T.BoxGeometry(w,.3,2.6),'#9a6a40',[0,-.15,0]);b.add(new T.CylinderGeometry(w*.42,w*.46,h,14),'#b07a4a',[0,-.3-h/2,-.2],[0,0,0],[1,1,.55],.05);b.add(new T.CylinderGeometry(.6,.7,1.2,10),'#a8703f',[w/2-.7,.6,-1]);b.add(new T.ConeGeometry(.85,.9,10),'#c9a35a',[w/2-.7,1.65,-1]);},api.seed);return true;}
  if(style==='fetish-shrine'){built(root,'small-shrine',b=>{b.add(new T.BoxGeometry(w,.3,1.6),'#9a6a40',[0,-.15,0]);b.add(new T.ConeGeometry(.35,.7,8),'#8a5a3a',[w/2-.3,.35,-.55]);},api.seed);return true;}
  return false;
 },
});
