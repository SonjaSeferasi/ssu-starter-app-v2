import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantGrove} from '../../kit/vegetation';
import {random,v3,type Builder} from '../../kit/common';

/** Eritrea — Asmara: The Modernist City. Pastel Art Deco blocks with
 * rounded corners, ribbon windows and porthole details along a palm
 * boulevard; a streamlined cinema; and the Fiat Tagliero service station,
 * its two great cantilevered concrete wings spreading like an aircraft. */
const render=earth('#e8dcc4','#d8c8a8','#9a8a6c',{set:'paris-stone',tint:'#fff6e6',repeat:.8},{rough:.02,strata:.9});
const pastel=['#f0d8b0','#e8c8c0','#d8e0c8','#f2e8d0','#d0d8e0'];
function decoBlock(b:Builder,x:number,y:number,z:number,w:number,h:number,c:string){
 b.add(new T.BoxGeometry(w,h,4),c,[x,y+h/2,z],[0,0,0],[1,1,1],.02);b.add(new T.CylinderGeometry(2,2,h,16,1,false,0,Math.PI/2),c,[x+w/2,y+h/2,z+0]);
 for(let k=1;k<h/2.2;k++)b.add(new T.BoxGeometry(w*.8,.5,.06),'#3a4a5a',[x,y+k*2.2,z+2.03]);b.add(new T.BoxGeometry(w+.3,.25,4.3),'#f6f2ea',[x,y+h+.12,z]);
 b.add(new T.CylinderGeometry(.35,.35,.06,12).rotateX(Math.PI/2),'#3a4a5a',[x-w/2+.6,y+h-1,z+2.04]);
}
export const environment=africaEnvironment({
 code:'ERI',id:'africa-er',name:'eritrea-asmara-environment',
 representation:'A fictional rooftop course in an Art Deco city inspired by Asmara. The Fiat Tagliero and cinema are simplified studies; lifts, sign and route are game devices.',
 lighting:{background:'#c4daf0',exposure:1.06,sun:'#fff4e0',sunIntensity:3.2,sky:'#eef4f8',ground:'#9a8a6c',hemisphere:1.35,rim:'#ffeacc',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#4a8ad0',horizon:'#e8eef2',ground:'#9a8a6c',intensity:.36}},
 sky:{zenith:'#3f86d4',horizon:'#e6eef2',band:'#d0e0ec',glow:'#fff6e4',sun:[-.5,.6,-.6],glowPower:18},
 fog:['#e2eaf0',60,220],clouds:{opacity:.7,high:[26,38],groups:10},
 layers:['balconies-lifts-and-wings','fiat-tagliero','art-deco-blocks','cinema-impero','highland-hills','sky'],
 backdrop:[{kind:'hills',name:'highland-hills',z:-150,y:-2,height:12,colors:['#a89a6a','#b8aa7a','#c8ba8a'],scale:2}],
 floor:{kind:'land',y:-3,colors:['#a89a80','#b8aa90','#c8baa0'],name:'boulevard-street',rough:.2},
 palettes:{default:render,'palm-boulevard':earth('#c8c0b0','#a89c84','#6a604e',{set:'paris-stone',tint:'#e8e2d6',repeat:1})},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#e8dcc4',stoneAlt:'#d8c8a8',metal:'#5a6a7a',accent:'#4189dd'},
 decks:{'art-deco-lift':'lift','shop-sign':'slab'},
 capFlora:{default:null},
 flocks:[{count:8,y:18,z:-24,color:'#4a4a4a',wing:'#8a8a8a',size:.4,name:'swifts'}],
 creature:{name:'city-gecko',height:.5,shell:'#8a9a6a',belly:'#e0d8c0',foot:'#4a4a3a',crest:'spines',accent:'#4189dd'},
 crate:{body:'metal',color:'#4189dd',trim:'#12ad2b',glyph:'#ffc726'},
 checkpoint:{pole:'#5a6a7a',cloth:'#12ad2b',accent:'#ffc726',cap:'#ea0437'},
 finishArch:{style:'iron',stone:'#d8c8a8',trim:'#4189dd'},
 landmarks(api){
  const {finish,low,level}=api,r=random(1550),w=api.platform('er-wings');
  // The Fiat Tagliero: a central tower and two 15-metre cantilevered wings.
  const fiat=api.group('fiat-tagliero');
  built(fiat,'service-station',b=>{const x=w.x+7,y=w.y;b.add(new T.BoxGeometry(3,7,3),'#f2ece0',[x,y-3.5,-4]);b.add(new T.BoxGeometry(2.2,4,2.2),'#f2ece0',[x,y+2,-4]);b.add(new T.CylinderGeometry(.9,.9,.6,16),'#f2ece0',[x,y+4.3,-4]);for(const s of [-1,1]){const wing=new T.BoxGeometry(14,.4,3.6);b.add(wing,'#f6f2ea',[x+s*8.5,y-.2,-4],[0,0,s*-.04]);b.add(new T.BoxGeometry(14,.12,.12),'#4189dd',[x+s*8.5,y-.45,-2.2],[0,0,s*-.04]);}},2,.9);
  const blocks=api.group('art-deco-blocks');built(blocks,'boulevard-blocks',b=>{for(let i=0;i<(low?8:16);i++){const x=-10+i*(finish+20)/16,h=6+r()*8;decoBlock(b,x,-3,-9-(i%2)*3,5+r()*2,h,pastel[i%pastel.length]);}for(const p of level.platforms)if(p.style==='cantilever-balcony'||p.style==='cornice'||p.style==='roof-terrace')decoBlock(b,p.x+p.width/2,-3,-3.6,p.width+1.4,p.y+2.8,pastel[Math.round(p.x)%pastel.length]);},3,.92);
  const cinema=api.group('cinema-impero'),c=api.platform('er-canopy');built(cinema,'cinema-front',b=>{b.add(new T.BoxGeometry(c.width+2,12,4),'#e8c8a0',[c.x+c.width/2,3,-3.8]);for(let i=0;i<5;i++)b.add(new T.BoxGeometry(.6,8,.1),'#c8a070',[c.x+1+i*1.6,6,-1.75]);b.add(new T.BoxGeometry(c.width,1.2,.2),'#3a4a5a',[c.x+c.width/2,8.6,-1.7]);},4);
  const palms=api.group('palm-boulevard');plantGrove(palms,'date-palm',Array.from({length:low?6:12},(_,i)=>({x:-8+i*(finish+16)/12,y:-3,z:-6.2,scale:1.1})),{low,name:'boulevard-palms'});
  void v3;
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='cantilever-balcony'||style==='cafe-awning'){built(root,style,b=>{b.add(new T.BoxGeometry(w,.25,2),style==='cafe-awning'?'#c8323a':'#f2ece0',[0,-.12,0]);if(style==='cantilever-balcony')b.add(new T.BoxGeometry(w,.7,.08),'#5a6a7a',[0,.35,-.95]);for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.05,.7,.05),'#5a6a7a',[-w/2+.3+i*(w-.6)/3,.35,-.95]);},api.seed);return true;}
  if(style==='tagliero-wing'||style==='tagliero-pylon'||style==='cinema-canopy'||style==='cornice'||style==='roof-terrace'){built(root,style,b=>{b.add(new T.BoxGeometry(w,.5,2.6),'#f6f2ea',[0,-.25,0]);b.add(new T.BoxGeometry(w,.08,.08),'#4189dd',[0,-.52,1.25]);if(style==='tagliero-pylon')b.add(new T.BoxGeometry(1,6,1),'#f2ece0',[0,-3.5,-.6]);},api.seed);return true;}
  return false;
 },
});
