import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {cubeHouse} from './architecture';
import {plantAfrica} from './flora';
import {createDrift} from '../../kit/particles';
import {random,valueNoise} from '../../kit/common';

/** Cabo Verde — Fogo: Into the Volcano. A black cinder cone rising from a
 * vast caldera floor, the frozen rivers of the 2014–15 lava flow, steaming
 * fumaroles, the stone houses and vines of Chã das Caldeiras, and the sheer
 * caldera wall (the Bordeira) behind. */
const basalt=earth('#3a3634','#2c2826','#141210',{set:'alpine-rock',tint:'#a8a4a0',repeat:.5},{rough:.32,strata:.6});
const cinder=earth('#4a3a34','#3a2c28','#1a1412',{set:'alpine-rock',tint:'#b89a90',repeat:.5},{rough:.18});
const vineyard=earth('#5a5a3a','#3a3634','#141210',{set:'alpine-rock',tint:'#b0aca0',repeat:.5});
export const environment=africaEnvironment({
 code:'CPV',id:'africa-cv',name:'cabo-verde-fogo-environment',
 representation:'A fictional course on Pico do Fogo. Steam vents, cracking crusts and the route are game devices; never leave marked trails on an active volcano.',
 lighting:{background:'#b4c4d4',exposure:1.02,sun:'#fff0dc',sunIntensity:3.2,sky:'#e2e8ee',ground:'#141210',hemisphere:1.25,rim:'#ffd8b0',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#5a86b8',horizon:'#dce2e8',ground:'#141210',intensity:.3}},
 sky:{zenith:'#4a7ab8',horizon:'#dee4ea',band:'#c8d4e0',glow:'#fff4e0',sun:[.5,.5,-.65],glowPower:14},
 fog:['#d2d8de',50,200],clouds:{opacity:.85,high:[18,28],lowBand:[-6,-1],groups:16,shade:'#c4ccd4'},
 layers:['lava-blocks-cinder-and-rims','pico-do-fogo','fumaroles','lava-fields','cha-das-caldeiras','sky'],
 backdrop:[{kind:'range',name:'bordeira-caldera-wall',z:-150,y:-6,height:28,peaks:9,rock:'#4a4440',forest:'#5a5a48',grass:'#6a6a52',treeLine:6,sharpness:.7,depth:50}],
 floor:{kind:'land',y:-4,colors:['#2a2422','#3a3230','#4a3e3a'],name:'caldera-floor',rough:1.6},
 palettes:{default:basalt,'cinder-crust':cinder,'cinder-slope':cinder,'ash-ledge':cinder,'caldera-vineyard':vineyard,'lava-tube':basalt},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#3a3634',stoneAlt:'#2c2826',metal:'#4a4a4a',accent:'#cf2027'},
 capFlora:{default:null,'caldera-vineyard':'thorn-scrub'},
 flocks:[{count:3,y:22,z:-30,color:'#2a2a2a',wing:'#5a5a5a',size:1,glide:true,name:'ravens'}],
 hazardPalette:{column:'#f4f4f2',base:'#4a3e3a',warning:'#ffb060'},
 creature:{name:'cinder-gecko',height:.5,shell:'#5a4a42',belly:'#a89a8a',foot:'#2a2220',crest:'spines',accent:'#c86a3a'},
 crate:{body:'stone',color:'#3a3634',trim:'#cf2027',glyph:'#f7d116'},
 checkpoint:{pole:'#3a3634',cloth:'#003893',accent:'#ffffff',cap:'#cf2027'},
 finishArch:{style:'stone',stone:'#3a3634',trim:'#cf2027'},
 landmarks(api){
  const {finish,low,root}=api,r=random(2829),s=api.platform('cv-summit');
  // The cone: a steep black cinder cone with a summit crater and fumarole
  // stains, rising behind the summit platform.
  const pico=api.group('pico-do-fogo');
  built(pico,'cinder-cone',b=>{const seg=low?24:44,pts=Array.from({length:10},(_,i)=>{const t=i/9;return new T.Vector2(30*(1-t)+3*t+(t>.92?2:0),t*36);});const g=new T.LatheGeometry(pts,seg),p=g.getAttribute('position'),colors:number[]=[];for(let i=0;i<p.count;i++){const y=p.getY(i),n=valueNoise(p.getX(i)*.3,p.getZ(i)*.3,3);p.setX(i,p.getX(i)*(1+n*.06));const c=new T.Color(y>30&&n>.55?'#c8b45a':n>.7?'#5a3a30':'#2e2826');colors.push(c.r,c.g,c.b);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();b.parts.push(g.translate(s.x-2,-4,-60));},3,.95);
  // The 2014–15 lava flow: ropey black tongues across the caldera floor.
  const flows=api.group('lava-fields');built(flows,'aa-lava-tongues',b=>{for(let i=0;i<(low?14:30);i++)b.add(new T.DodecahedronGeometry(.8+r()*1.4,0),'#1e1a18',[r()*finish,-4,-4-r()*14],[r()*3,r()*3,0],[1.4,.5,1]);},4);
  // Fumaroles with sulphur stains and drifting steam.
  const vents=api.group('fumaroles');built(vents,'sulphur-vents',b=>{for(const x of [52,59,66,72,90])b.add(new T.CylinderGeometry(.6,1.2,.3,10),'#c8b45a',[x,-1+x*.05,-6]);},5);
  const steam=createDrift(root,{kind:'mist',count:low?10:24,colors:['#f4f4f2'],x:[45,95],y:[2,12],z:[-8,-2],fall:-.4,sway:1.2,size:1.2,seed:5,name:'fumarole-steam'});
  api.animate({update:t=>steam.update(t),setVisible:v=>steam.setVisible(v),motion:true});
  // Chã das Caldeiras: basalt houses (some half-buried by lava) and vines.
  const village=api.group('cha-das-caldeiras');
  built(village,'basalt-houses',b=>{for(let i=0;i<6;i++){cubeHouse(b,[-6+i*3,-.4*(i%2),-5-(i%3)*2],[2.4,2,2.2],{wall:i%2?'#4a4440':'#f2ece0',door:'#2a5a8a',trim:'#cf2027'});}b.add(new T.DodecahedronGeometry(2.2,0),'#1e1a18',[4,-.6,-4.4],[0,0,0],[1.6,.6,1]);},6);
  const vines=api.group('caldera-vineyards');plantAfrica(vines,'thorn-scrub',Array.from({length:low?12:28},(_,i)=>({x:-6+(i%14)*1.1,y:0,z:-2.4-Math.floor(i/14)*1.2,scale:.5})),{low,name:'vine-rows'});
 },
});
