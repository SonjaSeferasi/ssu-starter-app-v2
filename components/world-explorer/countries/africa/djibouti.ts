import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {createDrift} from '../../kit/particles';
import {random,valueNoise} from '../../kit/common';

/** Djibouti — Lac Abbé: The Steaming Chimneys. A pale, otherworldly plain
 * studded with tall limestone chimneys, some puffing steam, hot springs
 * rimmed with mineral crusts, a shallow lake pink with flamingos, and the
 * cone of Dama Ali beyond. */
const travertine=earth('#d8ccb0','#b8a888','#7a6a52',{set:'limestone',tint:'#fff4e0',repeat:.6},{rough:.2,strata:.45});
const salt=earth('#f0ece0','#d8d0c0','#a89e8a',{set:'limestone',tint:'#ffffff',repeat:.7},{rough:.04});
/** A travertine chimney: a lumpy, tapering stack with bulbous ledges. */
function chimney(b:import('../../kit/common').Builder,x:number,y:number,z:number,h:number,r:()=>number){
 const n=Math.max(3,Math.round(h/2.4));for(let i=0;i<n;i++){const t=i/n,rad=(1.4-t*.7)*(1+r()*.2),g=new T.CylinderGeometry(rad*.9,rad,h/n*1.1,9);const p=g.getAttribute('position');for(let k=0;k<p.count;k++){const s=1+valueNoise(p.getX(k)*2,p.getY(k)+i,4)*.25;p.setX(k,p.getX(k)*s);p.setZ(k,p.getZ(k)*s);}g.computeVertexNormals();b.add(g,i%2?'#c8b898':'#b8a888',[x,y+h*t+h/n/2,z],[0,r()*3,0]);}
}
export const environment=africaEnvironment({
 code:'DJI',id:'africa-dj',name:'djibouti-lac-abbe-environment',
 representation:'A fictional crossing inspired by the chimney field of Lake Abbé. Hot springs and vents are dangerous; the timing and the route are game devices.',
 lighting:{background:'#f0d2c0',exposure:1.06,sun:'#ffd0a8',sunIntensity:2.9,sky:'#f6e2d8',ground:'#7a6a52',hemisphere:1.25,rim:'#ffb898',rimIntensity:.7,pixelRatio:1.25,reflections:{zenith:'#8aa0c8',horizon:'#f4d4c4',ground:'#7a6a52',intensity:.3}},
 sky:{zenith:'#7a92c8',horizon:'#f8d4bc',band:'#f0c8b4',glow:'#ffd0a8',sun:[-.8,.12,-.55],glowPower:6},
 fog:['#f0d8c8',45,190],clouds:{opacity:.6,high:[24,34],groups:10,color:'#ffe6d8',shade:'#e8c0b0'},
 layers:['crusts-chimney-tops-and-shore','limestone-chimneys','lake-abbe','salt-flats','dama-ali-volcano','sky'],
 backdrop:[{kind:'range',name:'dama-ali-volcano',z:-170,y:-6,height:24,peaks:1,rock:'#6a5a50',forest:'#7a6a58',grass:'#8a7a62',treeLine:4,sharpness:1.2,depth:60},{kind:'sea',name:'lake-abbe',y:-3,z:-70,depth:90,shallow:'#a8b8b0',deep:'#6a8a8a'}],
 floor:{kind:'land',y:-4,colors:['#e8e2d4','#d8d0c0','#c8bea8'],name:'salt-flats',rough:.4},
 palettes:{default:travertine,'salt-flat':salt,'lake-shore':salt,'lake-lookout':salt,'hot-pool':salt},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#d8ccb0',stoneAlt:'#b8a888',metal:'#4a4a4a',accent:'#6ab2e7'},
 capFlora:{default:null},
 flora:[{kind:'doum-palm',count:6,z:[-22,-14],y:-4,scale:[.8,1.1]}],
 flocks:[{count:14,y:4,z:-30,color:'#f4b0b8',wing:'#e86a7a',size:.6,glide:true,name:'flamingo-flocks'}],
 hazardPalette:{column:'#f6f6f2',base:'#b8a888',warning:'#ffd8a8'},
 creature:{name:'salt-beetle',height:.5,shell:'#6a5a4a',belly:'#d8c8b0',foot:'#3a3028',crest:'horn',accent:'#c8b898'},
 crate:{body:'stone',color:'#d8ccb0',trim:'#6ab2e7',glyph:'#12ad2b'},
 checkpoint:{pole:'#5a4028',cloth:'#6ab2e7',accent:'#ffffff',cap:'#12ad2b'},
 finishArch:{style:'stone',stone:'#b8a888',trim:'#6ab2e7'},
 banners:[{platform:'dj-shore',offset:6,colors:['#6ab2e7']}],
 landmarks(api){
  const {finish,low,root,level}=api,r=random(243);
  const field=api.group('limestone-chimneys');built(field,'chimney-field',b=>{for(let i=0;i<(low?14:30);i++)chimney(b,-10+r()*(finish+20),-4,-8-r()*30,5+r()*12,r);for(const p of level.platforms)if(p.style==='chimney-top')chimney(b,p.x+p.width/2,-4,-.4,p.y+3.4,r);},3,.95);
  const steam=createDrift(root,{kind:'mist',count:low?14:34,colors:['#f6f6f2'],x:[0,finish],y:[2,14],z:[-30,-4],fall:-.5,sway:1,size:1.4,seed:6,name:'chimney-steam'});
  api.animate({update:t=>steam.update(t),setVisible:v=>steam.setVisible(v),motion:true});
  const flats=api.group('salt-flats');built(flats,'salt-polygons',b=>{for(let i=0;i<40;i++)b.add(new T.CylinderGeometry(1+r()*1.2,1+r()*1.2,.04,6),'#f6f2ea',[r()*finish,-3.95,-4-r()*16]);},4);
  plantAfrica(flats,'papyrus',[{x:finish-20,y:-3,z:-12},{x:finish-10,y:-3,z:-14}],{low,name:'shore-sedges'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='chimney-top'){const d=api.landmass(root,definition,'default','island',2.4);built(d,'vent-mouth',b=>{b.add(new T.CylinderGeometry(.45,.6,.2,10),'#8a7a62',[definition.width/2-.9,.06,-.2]);},api.seed);return true;}
  if(definition.style==='travertine-crust'){const d=api.landmass(root,definition,'default','island',.6);built(d,'crust-cracks',b=>{for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.04,.02,1.4),'#8a7a62',[-definition.width/2+.6+i*.7,.011,0],[0,i*.5,0]);},api.seed);return true;}
  return false;
 },
});
