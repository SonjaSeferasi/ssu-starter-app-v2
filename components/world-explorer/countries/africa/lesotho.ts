import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {rondavel} from './architecture';
import {plantAfrica} from './flora';
import {createWaterfall} from '../../kit/water';
import {createDrift} from '../../kit/particles';
import {random,v3,type Builder} from '../../kit/common';

/** Lesotho — Maletsunyane Falls. A single 192-metre drop of the
 * Maletsunyane River into a deep basalt gorge; stone rondavels with
 * thatched roofs on the grassy plateau; Basotho horsemen in conical mokorotlo
 * hats and woollen blankets on the pony trail; the Maloti mountains behind,
 * frost on the high ledges. */
const basalt=earth('#5a5450','#4a4440','#24201e',{set:'alpine-rock',tint:'#d0c8c0',repeat:.5},{rough:.2,strata:.5});
const grass=earth('#8a9a52','#6a5a46','#3a3028',{set:'savanna-rock',tint:'#eae8c4',repeat:.5});
const frost=earth('#e8eef2','#6a6662','#2e2a28',{set:'alpine-rock',tint:'#f4f8fa',repeat:.5});
function rider(b:Builder,x:number,y:number,z:number,blanket:string){
 b.add(new T.SphereGeometry(.55,10,8),'#6a4a32',[x,y+1.3,z],[0,0,0],[1.5,.75,.6]);b.strut(v3(x+.7,y+1.5,z),v3(x+1.05,y+2,z),.14,'#6a4a32',5);b.add(new T.SphereGeometry(.18,8,6),'#6a4a32',[x+1.15,y+2,z],[0,0,0],[1.5,.8,.8]);
 for(const [lx,lz] of [[-.5,-.18],[-.5,.18],[.5,-.18],[.5,.18]])b.strut(v3(x+lx,y+1,z+lz),v3(x+lx,y,z+lz),.06,'#4a3424',4);
 b.add(new T.CylinderGeometry(.25,.4,.9,8),blanket,[x,y+2.2,z]);b.add(new T.SphereGeometry(.15,8,6),'#4a3424',[x,y+2.8,z]);b.add(new T.ConeGeometry(.3,.45,10),'#c8a862',[x,y+3.1,z]);b.add(new T.ConeGeometry(.07,.12,6),'#c8a862',[x,y+3.38,z]);
}
export const environment=africaEnvironment({
 code:'LSO',id:'africa-ls',name:'lesotho-maletsunyane-environment',
 representation:'A fictional route inspired by Maletsunyane Falls at Semonkong. The abseil platform and winch are game devices modelled loosely on the real commercial abseil there.',
 lighting:{background:'#b4cce4',exposure:1.04,sun:'#fff4e4',sunIntensity:3.1,sky:'#eef2f6',ground:'#24201e',hemisphere:1.3,rim:'#e4f0ff',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#3a7ad0',horizon:'#e2e8ee',ground:'#24201e',intensity:.36}},
 sky:{zenith:'#3a7ad0',horizon:'#e4eaee',band:'#c8d8e8',glow:'#fff6e8',sun:[-.5,.45,-.65],glowPower:16},
 fog:['#dce4ea',40,190],clouds:{opacity:.7,high:[24,34],groups:12},
 layers:['ledges-lifts-and-rim','maletsunyane-falls','basalt-gorge','highland-villages','maloti-mountains','sky'],
 backdrop:[{kind:'range',name:'maloti-mountains',z:-170,y:-6,height:30,peaks:6,rock:'#5a5450',forest:'#6a7a4a',grass:'#8a9a5a',snow:'#f4f6f8',snowLine:24,treeLine:12,sharpness:1.1,depth:60}],
 floor:{kind:'land',y:-6,colors:['#24201e','#2e2a26','#3a3430'],name:'gorge-bottom',rough:1.4},
 palettes:{default:basalt,'highland-village':grass,'pony-trail':grass,'maloti-lookout':grass,'ice-shelf':frost,'frosted-basalt':frost},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#5a5450',stoneAlt:'#4a4440',metal:'#6a7078',accent:'#00209f'},
 decks:{'abseil-platform':'lift','gorge-winch':'lift'},
 capFlora:{default:null,'highland-village':'savanna-grass','pony-trail':'savanna-grass','maloti-lookout':'aloe'},
 flocks:[{count:4,y:18,z:-24,color:'#2a2420',wing:'#e8dcc8',size:1,glide:true,name:'bearded-vultures'}],
 creature:{name:'ice-rat',height:.5,shell:'#6a5a4a',belly:'#c8b8a0',foot:'#2a2a22',crest:'ears',accent:'#6a5a4a'},
 crate:{body:'stone',color:'#5a5450',trim:'#00209f',glyph:'#ffffff'},
 checkpoint:{pole:'#5a4028',cloth:'#00209f',accent:'#ffffff',cap:'#009543'},
 finishArch:{style:'stone',stone:'#4a4440',trim:'#009543'},
 mechanisms:{stone:'#5a5450',stoneDark:'#24201e',trim:'#c9b07a',glow:'#ffd27a',metal:'#6a7078'},
 landmarks(api){
  const {finish,low}=api,r=random(426),shelf=api.platform('ls-gorge-shelf'),v=api.platform('ls-village');
  const gorge=api.group('basalt-gorge');built(gorge,'gorge-walls',b=>{b.add(new T.BoxGeometry(32,22,6),'#3a3430',[shelf.x+6,-6,-18],[0,0,0],[1,1,1],.06);for(const s of [-1,1])b.add(new T.BoxGeometry(6,20,14),'#4a4440',[shelf.x+6+s*18,-4,-12],[0,s*.15,0]);for(let i=0;i<12;i++)b.add(new T.BoxGeometry(.3,4+r()*6,.4),'#2e2a26',[shelf.x-8+i*2.6,-2,-14.8]);},3,.95);
  const falls=api.group('maletsunyane-falls'),drop=createWaterfall(falls,{x:shelf.x+8,top:8,z:-14.6,width:3,height:18,seed:11,low,tint:'#eef6f4'});
  const spray=createDrift(falls,{kind:'mist',count:low?10:26,colors:['#f4fbff'],x:[shelf.x,shelf.x+16],y:[-6,2],z:[-15,-6],fall:-.4,sway:1.2,size:1.6,seed:5,name:'falls-spray'});
  api.animate({update:t=>{drop.update(t);spray.update(t);},setVisible:x=>spray.setVisible(x)});
  const villages=api.group('highland-villages');built(villages,'stone-rondavels',b=>{for(let i=0;i<(low?3:6);i++)rondavel(b,[v.x+1+i*2.6,v.y,-5-(i%2)*3],1.1,{wall:'#8a8478',thatch:'#c8a862',door:'#3a2a1e'});for(let i=0;i<14;i++)b.add(new T.BoxGeometry(.5,.4,.5),'#7a746a',[v.x-2+i*1.2,v.y+.2,-9]);},4);
  const trail=api.group('pony-trail');built(trail,'basotho-riders',b=>{rider(b,v.x+v.width-2,0,-3.4,'#2a4a8a');rider(b,v.x+v.width+3,0,-4.2,'#8a2a2a');},5);
  plantAfrica(trail,'aloe',Array.from({length:low?4:8},()=>({x:r()*finish,y:0,z:-6-r()*4,scale:1})),{low,name:'spiral-aloes'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='frosted-basalt'){const d=api.landmass(root,definition,'frosted-basalt','island',2.6);built(d,'hoarfrost',(b,rr)=>{for(let i=0;i<10;i++)b.add(new T.ConeGeometry(.05,.18,4).rotateX(Math.PI),'#f4f8fa',[-definition.width/2+.3+rr()*(definition.width-.6),-.15,1.22]);},api.seed);return true;}
  return false;
 },
});
