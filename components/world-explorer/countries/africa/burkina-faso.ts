import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,type Builder} from '../../kit/common';

/** Burkina Faso — Tiébélé: The Painted Royal Court. Earthen houses of the
 * Kassena painted in red, black and white geometric bands: triangles,
 * chevrons and checkers, with low doorways, rounded granaries and the
 * millet fields of the Sudan savanna. */
const wall=earth('#a8583a','#9a4a30','#4a2418',{set:'savanna-rock',tint:'#f0c0a8',repeat:.5},{rough:.05});
const yard=earth('#b8844e','#9a4a30','#4a2418',{set:'savanna-rock',tint:'#f0d2b0',repeat:.5});
/** A painted Kassena wall band: alternating triangles and checkers in red,
 * black and white, set on a face at z. */
export function paintedBand(b:Builder,x0:number,x1:number,y:number,z:number,h=.6){
 const colours=['#f2ece0','#1e1a18','#a8402a'];
 for(let x=x0,i=0;x<x1-.2;x+=.36,i++){const tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([0,0,0,.36,0,0,.18,h*.55,0],3));tri.computeVertexNormals();b.add(tri,colours[i%2],[x,y,z]);b.add(new T.BoxGeometry(.16,.16,.02),colours[(i+1)%3],[x+.18,y+h*.75,z]);}
 b.add(new T.BoxGeometry(x1-x0,.06,.02),'#1e1a18',[(x0+x1)/2,y+h,z]);
}
export const environment=africaEnvironment({
 code:'BFA',id:'africa-bf',name:'burkina-faso-tiebele-environment',
 representation:'A fictional course through a court inspired by Tiébélé. The painted patterns are original compositions in the Kassena colours, not copies of real walls; the doors and plates are game devices.',
 lighting:{background:'#e6d6bc',exposure:1.05,sun:'#ffe2b4',sunIntensity:3.1,sky:'#f2e6d2',ground:'#4a2418',hemisphere:1.25,rim:'#ffd0a0',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#8ab0d0',horizon:'#f0dcc0',ground:'#4a2418',intensity:.26}},
 sky:{zenith:'#86a8cc',horizon:'#f2dcbc',band:'#e8d4b8',glow:'#ffecc8',sun:[.5,.5,-.6],glowPower:12},
 fog:['#ead8bc',45,180],clouds:{opacity:.45,high:[28,38],groups:7},
 layers:['painted-walls-and-roofs','painted-kassena-houses','royal-court','granaries','millet-fields','sky'],
 backdrop:[{kind:'hills',name:'savanna-horizon',z:-130,y:-5,height:5,colors:['#a8945a','#b8a46a','#c8b47a'],scale:2}],
 floor:{kind:'land',y:-3,colors:['#a8844e','#b8945e','#c8a46e'],name:'court-ground',rough:.5},
 palettes:{default:yard,'painted-wall':wall,'earth-roof':wall,'granary':wall,'clay-oven':wall},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#a8583a',stoneAlt:'#9a4a30',metal:'#4a4a4a',accent:'#ef2b2d'},
 capFlora:{default:null,'millet-field':'savanna-grass'},
 flora:[{kind:'baobab',count:4,z:[-30,-22],y:-3,scale:[1,1.3]},{kind:'umbrella-acacia',count:6,z:[-24,-16],y:-3,scale:[.8,1]}],
 flocks:[{count:7,y:16,z:-22,color:'#2a2a2a',wing:'#6a6a6a',size:.5,name:'swallows'}],
 creature:{name:'rainbow-agama',height:.55,shell:'#2a4ab0',belly:'#e8c8a8',foot:'#2a2a3a',crest:'frill',accent:'#f08a2a'},
 crate:{body:'wood',color:'#ef2b2d',trim:'#009e49',glyph:'#fcd116'},
 checkpoint:{pole:'#5a4028',cloth:'#ef2b2d',accent:'#fcd116',cap:'#009e49'},
 finishArch:{style:'timber',stone:'#9a4a30',trim:'#1e1a18'},
 mechanisms:{stone:'#a8583a',stoneDark:'#4a2418',trim:'#f2ece0',glow:'#ffd27a',metal:'#4a4a4a'},
 landmarks(api){
  const {finish,low,level}=api,r=random(1932);
  // Painted houses around the court: square and round, all patterned.
  const houses=api.group('painted-kassena-houses');
  built(houses,'painted-house-rows',b=>{for(let i=0;i<(low?8:16);i++){const x=-8+i*(finish+16)/16+r(),z=-7-(i%3)*3.4,w=3+r()*1.4,h=2.2+r()*.6,round=r()<.35;if(round){b.add(new T.CylinderGeometry(w/2,w/2,h,14),'#a8583a',[x,-3+h/2,z]);}else b.add(new T.BoxGeometry(w,h,2.6),'#a8583a',[x,-3+h/2,z]);paintedBand(b,x-w/2+.1,x+w/2-.1,-3+.3,z+(round?w/2:1.31),.6);paintedBand(b,x-w/2+.1,x+w/2-.1,-3+h-.9,z+(round?w/2:1.31),.5);b.add(new T.BoxGeometry(.6,.9,.04),'#1e1a18',[x,-3+.45,z+(round?w/2+.02:1.33)]);}},3,.92);
  // The royal court enclosure wall at the finish.
  const court=api.group('royal-court'),c=api.platform('bf-chief-court');
  built(court,'court-enclosure',b=>{b.add(new T.BoxGeometry(14,2.4,.6),'#9a4a30',[c.x+6.5,c.y+1.2,-4]);paintedBand(b,c.x,c.x+13,c.y+.3,-3.68,.7);b.add(new T.CylinderGeometry(1.6,1.6,2.8,16),'#a8583a',[c.x+10,c.y+1.4,-6.4]);b.add(new T.ConeGeometry(2,1.4,16),'#b99a5a',[c.x+10,c.y+3.5,-6.4]);},5);
  const patterns=api.group('painted-patterns');built(patterns,'route-wall-paintings',b=>{for(const p of level.platforms)if(p.style==='painted-wall'||p.style==='earth-roof')paintedBand(b,p.x+.1,p.x+p.width-.1,p.y-.85,1.33,.5);},6);
  const granaries=api.group('granaries');built(granaries,'round-granaries',b=>{for(let i=0;i<7;i++){const x=r()*finish,z=-5-r()*3;b.add(new T.SphereGeometry(.9,12,8),'#9a4a30',[x,-1.9,z],[0,0,0],[1,1.3,1]);b.add(new T.ConeGeometry(1,.9,12),'#b99a5a',[x,-.4,z]);}},7);
  const fields=api.group('millet-fields');plantAfrica(fields,'savanna-grass',Array.from({length:low?20:50},()=>({x:-8+r()*16,y:0,z:-2-r()*4,scale:1.7+r()*.6})),{low,name:'millet'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='painted-wall'||style==='earth-roof'){built(root,style,b=>{const drop=definition.y+3;b.add(new T.BoxGeometry(w,drop,2.6),'#a8583a',[0,-drop/2,0],[0,0,0],[1,1,1],.04);b.add(new T.BoxGeometry(w+.1,.2,2.7),'#9a4a30',[0,-.1,0]);paintedBand(b,-w/2+.1,w/2-.1,-drop+.3,1.31,.6);if(style==='earth-roof')b.add(new T.BoxGeometry(.6,.9,.04),'#1e1a18',[0,-drop+.45,1.32]);},api.seed);return true;}
  if(style==='granary'){built(root,'granary-top',b=>{b.add(new T.CylinderGeometry(w/2,w/2,.3,14),'#9a4a30',[0,-.15,0]);b.add(new T.SphereGeometry(w/2,14,10),'#a8583a',[0,-1.6,0],[0,0,0],[1,1.3,1]);b.add(new T.CylinderGeometry(w*.35,w*.4,definition.y+2,10),'#9a4a30',[0,-3.2-(definition.y)/2,0]);},api.seed);return true;}
  if(style==='clay-oven'){built(root,'clay-oven',b=>{b.add(new T.BoxGeometry(w,.3,1.6),'#9a4a30',[0,-.15,0]);b.add(new T.SphereGeometry(.5,10,8,0,Math.PI*2,0,Math.PI/2),'#8a3a22',[w/2-.4,0,-.4]);},api.seed);return true;}
  return false;
 },
});
