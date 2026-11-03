import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,type Builder} from '../../kit/common';

/** Angola — Serra da Leba: The Hairpin Pass. A sheer red-and-ochre
 * escarpment laced with a road of tight hairpins, white retaining walls,
 * trucks grinding up the bends, and highland grass and miombo above. */
const quartzite=earth('#a8683e','#8a5232','#4e2a1a',{set:'sandstone-cliff',tint:'#f0c8a8',repeat:.45},{rough:.24,strata:.5});
const road=earth('#6a6a66','#8a5232','#4e2a1a',{set:'sandstone-cliff',tint:'#d8d0c8',repeat:.45},{capMaps:{set:'paris-stone',tint:'#9a9a94',repeat:1},rough:.12});
const grass=earth('#8a9a4a','#8a5232','#4e2a1a',{set:'savanna-rock',tint:'#efd8c0',repeat:.5});
/** A small truck: cab and load bed; faces +x. */
function truck(b:Builder,x:number,y:number,z:number,w:number,colour:string){
 b.add(new T.BoxGeometry(w*.7,.9,2),'#5a4a3a',[x-w*.12,y-.45,z]);b.add(new T.BoxGeometry(w*.28,1.5,2),colour,[x+w*.36,y-.15,z]);b.add(new T.BoxGeometry(w*.2,.6,2.02),'#8ab0c8',[x+w*.38,y+.2,z]);
 for(const s of [-1,1])for(const sz of [-1,1])b.add(new T.CylinderGeometry(.38,.38,.24,12).rotateX(Math.PI/2),'#1e1e1e',[x+s*w*.32,y-1,z+sz*.9]);
}
export const environment=africaEnvironment({
 code:'AGO',id:'africa-ao',name:'angola-serra-da-leba-environment',
 representation:'A fictional route inspired by the Serra da Leba road. Riding on trucks is a game device only.',
 lighting:{background:'#bcd2e4',exposure:1.05,sun:'#fff0d6',sunIntensity:3.2,sky:'#eaf0f2',ground:'#4e2a1a',hemisphere:1.3,rim:'#ffe6c8',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#5a92c8',horizon:'#e6ecee',ground:'#4e2a1a',intensity:.3}},
 sky:{zenith:'#4e8ccc',horizon:'#e8eeee',band:'#d0e0e8',glow:'#fff4dc',sun:[-.5,.6,-.6],glowPower:16},
 fog:['#dce6ea',55,210],clouds:{opacity:.75,high:[26,38],groups:12},
 layers:['hairpins-trucks-and-cuttings','serra-da-leba-road','escarpment','tundavala-highlands','coastal-plain','sky'],
 backdrop:[{kind:'hills',name:'tundavala-highlands',z:-150,y:-2,height:14,colors:['#7a8a4a','#8a9a5a','#9aaa6a']}],
 floor:{kind:'land',y:-6,colors:['#8a5a3a','#9a6a44','#aa7a4e'],name:'coastal-plain',rough:1},
 palettes:{default:quartzite,'hairpin-road':road,'road-cutting':road,'road-foot':road,'tundavala-rim':grass,'wayside-shrine':grass},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#a8683e',stoneAlt:'#8a5232',metal:'#4a4a4a',accent:'#cc092f'},
 capFlora:{default:null,'tundavala-rim':'savanna-grass','quartzite-outcrop':'aloe'},
 flora:[{kind:'umbrella-acacia',count:10,z:[-24,-12],y:-6,scale:[.8,1.1]},{kind:'euphorbia',count:10,z:[-12,-5],y:-6}],
 flocks:[{count:3,y:22,z:-24,color:'#2a2420',wing:'#6a5a4a',size:1.1,glide:true,name:'black-kites'}],
 hazardPalette:{column:'#8a5232',base:'#4e2a1a',warning:'#ffc95c',debris:'#9a6a44'},
 creature:{name:'rock-agama',height:.5,shell:'#c86a3a',belly:'#e8c8a8',foot:'#3a2a1e',crest:'frill',accent:'#2a4ab0'},
 crate:{body:'metal',color:'#cc092f',trim:'#1e1e1e',glyph:'#ffcb00'},
 checkpoint:{pole:'#4a4a4a',cloth:'#cc092f',accent:'#ffcb00',cap:'#1e1e1e'},
 finishArch:{style:'stone',stone:'#8a5232',trim:'#cc092f'},
 landmarks(api){
  const {finish,low}=api,r=random(1845);
  // The escarpment wall behind the route, with the road's upper hairpins
  // zig-zagging up its face and white retaining walls on each bend.
  const scarp=api.group('escarpment');built(scarp,'escarpment-face',b=>{for(let i=0;i<14;i++)b.add(new T.BoxGeometry(12+r()*4,34+r()*8,6),i%2?'#8a5232':'#9a5e38',[-10+i*(finish+20)/13,6,-30-r()*4],[0,r()*.2-.1,0],[1,1,1],.08);},2,.95);
  const road=api.group('serra-da-leba-road');built(road,'upper-hairpins',b=>{for(let k=0;k<7;k++){const y=4+k*3.4,dir=k%2?1:-1,x0=finish*.35,len=finish*.5;b.add(new T.BoxGeometry(len,.25,1.6),'#5a5a56',[x0+len/2,y,-26.4],[0,0,dir*.06]);b.add(new T.BoxGeometry(len,.6,.2),'#f2efe8',[x0+len/2,y+.4,-25.5],[0,0,dir*.06]);b.add(new T.CylinderGeometry(1.6,1.6,.25,16,1,false,0,Math.PI),'#5a5a56',[dir>0?x0+len:x0,y+1.7+dir*.6,-26.4],[0,dir>0?0:Math.PI,0]);}},3);
  const trucks=api.group('mountain-trucks'),fleet=new T.Group();fleet.name='climbing-trucks';trucks.add(fleet);
  built(fleet,'distant-trucks',b=>{truck(b,0,8.4,-25.4,3,'#cc092f');truck(b,30,15.2,-25.4,3,'#2f5a8a');},4);
  api.animate({update:t=>{fleet.position.x=finish*.35+((t*1.2)%(finish*.4));},motion:true,setVisible:v=>{fleet.visible=v;}});
  const hairpins=api.group('hairpin-bends');built(hairpins,'route-retaining-walls',b=>{for(let i=0;i<5;i++)b.add(new T.BoxGeometry(.3,.6,6),'#f2efe8',[16+i*20,i*1.6+.6,-1.6]);},5);
  plantAfrica(api.group('highland-flora'),'aloe',Array.from({length:low?4:9},()=>({x:r()*finish,y:-6,z:-4-r()*4,scale:1.2})),{low,name:'highland-aloes'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='mountain-truck'){built(root,'riding-truck',b=>{truck(b,0,-.1,0,w+.6,'#cc092f');b.add(new T.BoxGeometry(w,.1,2),'#6a5a48',[0,-.05,0]);},api.seed);return true;}
  if(style==='hairpin-road'){const d=api.landmass(root,definition,'hairpin-road','mass',3);built(d,'road-markings',b=>{for(let x=-w/2+.4;x<w/2;x+=1.4)b.add(new T.BoxGeometry(.7,.02,.12),'#f2efe8',[x,(definition.slope||0)*(x+w/2)/w+.012,-.9],[0,0,Math.atan2(definition.slope||0,w)]);b.add(new T.BoxGeometry(w,.5,.2),'#f2efe8',[0,(definition.slope||0)/2+.25,-1.35],[0,0,Math.atan2(definition.slope||0,w)]);},api.seed);return true;}
  return false;
 },
});
