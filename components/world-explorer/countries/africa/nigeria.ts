import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {rondavel} from './architecture';
import {plantAfrica} from './flora';
import {random,valueNoise} from '../../kit/common';

/** Nigeria — Zuma Rock: The Monolith Ascent. A great grey dome of granite
 * streaked dark by rainwater, with the pale "face" of weathered patches,
 * boulder fields at its foot and the Guinea savanna woodland all round. */
const granite=earth('#8f8c84','#76736c','#46443f',{set:'gneiss',tint:'#ecece4',repeat:.45},{rough:.16,strata:.8});
const road=earth('#7a8a4a','#9a6a40','#5a3a24',{set:'savanna-rock',tint:'#efd8c0',repeat:.5});
export const environment=africaEnvironment({
 code:'NGA',id:'africa-ng',name:'nigeria-zuma-rock-environment',
 representation:'A fictional ascent inspired by Zuma Rock. The monolith is a simplified study; the climbing route, loose flakes and rockfall timing are game devices.',
 lighting:{background:'#c4d6e2',exposure:1.04,sun:'#fff0d6',sunIntensity:3.2,sky:'#ecf0ee',ground:'#46443f',hemisphere:1.3,rim:'#e8f0ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#5a96c8',horizon:'#e8ecea',ground:'#46443f',intensity:.3}},
 sky:{zenith:'#5a92c8',horizon:'#e8ece4',band:'#d6e0e2',glow:'#fff4dc',sun:[-.6,.5,-.6],glowPower:15},
 fog:['#dce4e6',55,210],clouds:{opacity:.85,high:[26,40],groups:14},
 layers:['granite-boulders-flakes-and-slabs','zuma-rock-monolith','exfoliation-face','savanna-woodland','far-inselbergs','sky'],
 backdrop:[{kind:'range',name:'far-inselbergs',z:-170,y:-6,height:22,peaks:7,rock:'#7a7a72',forest:'#4f6a3a',grass:'#6a7a4a',treeLine:10,sharpness:.8}],
 floor:{kind:'land',y:-4.5,colors:['#5a6a32','#6a7a3a','#7a8a4a'],name:'savanna-floor',rough:1},
 palettes:{default:granite,'roadside':road},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#8f8c84',stoneAlt:'#76736c',metal:'#4a4a4a',accent:'#008751'},
 capFlora:{default:null,'roadside':'savanna-grass','granite-shoulder':'savanna-grass'},
 flora:[{kind:'umbrella-acacia',count:12,z:[-24,-10],y:-4.5,scale:[.9,1.2]},{kind:'savanna-grass',count:40,z:[-10,-4],y:-4.5,scale:[1.2,1.6],sway:.05},{kind:'borassus-palm',count:5,z:[-20,-14],y:-4.5}],
 flocks:[{count:3,y:24,z:-30,color:'#2a2420',wing:'#6a5a4a',size:1.2,glide:true,name:'kites'}],
 hazardPalette:{column:'#8f8c84',base:'#5a5852',warning:'#ffc95c',debris:'#8a8780'},
 creature:{name:'rock-hyrax',height:.55,shell:'#7a6a58',belly:'#c8b8a0',foot:'#3a3028',crest:'ears',accent:'#7a6a58'},
 crate:{body:'stone',color:'#8f8c84',trim:'#008751',glyph:'#ffffff'},
 checkpoint:{pole:'#4a4a4a',cloth:'#008751',accent:'#ffffff'},
 finishArch:{style:'stone',stone:'#8f8c84',trim:'#46443f'},
 landmarks(api){
  const {finish,low}=api,r=random(100),top=api.platform('ng-summit');
  // The monolith: a heightfield dome rising behind the route, streaked with
  // dark rain stripes and pale weathered patches.
  const rock=api.group('zuma-rock-monolith');
  built(rock,'monolith-dome',b=>{const seg=low?28:48,g=new T.SphereGeometry(1,seg,seg/2,0,Math.PI*2,0,Math.PI/2),p=g.getAttribute('position'),colors:number[]=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=valueNoise(x*3,z*3,5);p.setXYZ(i,x*(1+n*.08),y*(1.05+n*.1),z);const stripe=Math.sin(Math.atan2(z,x)*40+n*3)>.6;const c=new T.Color(stripe&&y<.85?'#4a4844':y>.7&&n>.6?'#b8b4aa':'#8a8780');colors.push(c.r,c.g,c.b);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();b.parts.push(g.scale(34,40,20).translate(top.x-6,-4.5,-36));},3,.95);
  const face=api.group('exfoliation-face'),f=api.platform('ng-face');
  built(face,'peeling-sheets',b=>{for(let i=0;i<7;i++)b.add(new T.BoxGeometry(2+r()*2,.25,2.6),'#9a978e',[f.x-1+r()*8,-3+i*1.4+r()*.4,-3.2],[0,0,.2-r()*.4]);},4);
  const boulders=api.group('granite-boulders');built(boulders,'boulder-field',b=>{for(let i=0;i<(low?10:22);i++){const s=.8+r()*2;b.add(new T.SphereGeometry(s,10,8),'#8a8780',[r()*finish,-4.5+s*.5,-5-r()*14],[0,r()*3,0],[1.2,.8,1]);}},5);
  const wood=api.group('savanna-woodland');plantAfrica(wood,'thorn-scrub',Array.from({length:low?12:26},()=>({x:r()*finish,y:-4.5,z:-6-r()*12,scale:1})),{low,name:'woodland-shrubs'});
  const roadside=api.group('abuja-road');built(roadside,'road-and-huts',b=>{b.add(new T.BoxGeometry(finish+40,.05,3),'#3a3a3a',[finish/2-10,-4.45,-8]);for(let x=-20;x<finish+20;x+=4)b.add(new T.BoxGeometry(1.6,.06,.15),'#e8e2c8',[x,-4.42,-8]);for(let i=0;i<3;i++)rondavel(b,[-4+i*3,0,-4.6],1.1,{wall:'#b8885a',thatch:'#9a8a5a'});},6);
 },
 dress(root,definition,_context,api){
  const style=definition.style;
  if(style==='granite-flake'){const d=api.landmass(root,definition,'default','island',.6);d.userData.flake=true;return true;}
  if(style==='granite-boulder'){api.landmass(root,definition,'default','island',2.4);return true;}
  return false;
 },
});
