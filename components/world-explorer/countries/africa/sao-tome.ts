import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,valueNoise} from '../../kit/common';

/** São Tomé and Príncipe — Pico Cão Grande: The Needle. A grey phonolite
 * spire shooting out of unbroken rainforest, wrapped in bands of mist,
 * with an old cocoa roça and its plantation house below. */
const phonolite=earth('#7a7a72','#5e5e58','#2e2e2a',{set:'gneiss',tint:'#dedcd4',repeat:.45},{rough:.3,strata:.7});
const forest=earth('#4f6a32','#5a4a38','#2e2620',{set:'mossy-rock',tint:'#d0d6c0',repeat:.5});
export const environment=africaEnvironment({
 code:'STP',id:'africa-st',name:'sao-tome-cao-grande-environment',
 representation:'A fictional climbing course inspired by Pico Cão Grande. The real needle is a serious technical climb; every face, ledge and the route here are game devices.',
 lighting:{background:'#b0c0c0',exposure:1.03,sun:'#f8f0dc',sunIntensity:2.7,sky:'#dce6e4',ground:'#2e2620',hemisphere:1.45,rim:'#d8f0ff',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#6a90b4',horizon:'#d8e2e0',ground:'#2e2620',intensity:.32}},
 sky:{zenith:'#6a94c0',horizon:'#dce4e2',band:'#c4d4d4',glow:'#f6f2e0',sun:[.4,.55,-.7],glowPower:12},
 fog:['#cad8d6',40,180],clouds:{opacity:.95,high:[22,34],lowBand:[2,8],groups:20,shade:'#c0ccd0'},
 layers:['roots-faces-and-flakes','pico-cao-grande','volcanic-plug-wall','mist-bands','obo-rainforest','sky'],
 backdrop:[{kind:'forest',name:'obo-rainforest',z:[-80,-40],y:-4,flora:['forest-giant','oil-palm'],count:52,scale:[1,1.4]},{kind:'range',name:'obo-ridges',z:-150,y:-8,height:30,peaks:6,rock:'#4a5a42',forest:'#2f4a2a',grass:'#4a6a3a',treeLine:40,sharpness:1.8}],
 floor:{kind:'land',y:-4,colors:['#2e3a24','#3a4a2a','#4a5a32'],name:'rainforest-floor',rough:1.4},
 palettes:{default:phonolite,'roca-plantation':forest,'buttress-root':forest,'forest-ledge':forest,'cocoa-terrace':forest},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#7a7a72',stoneAlt:'#5e5e58',metal:'#4a4a4a',accent:'#12ad2b'},
 capFlora:{default:null,'roca-plantation':'cocoa-shrub','forest-ledge':'cocoa-shrub','cocoa-terrace':'cocoa-shrub'},
 flora:[{kind:'forest-giant',count:14,z:[-24,-10],y:-4,scale:[.8,1.1]},{kind:'cocoa-shrub',count:24,z:[-8,-4],y:-4,scale:[1.2,1.6]}],
 flocks:[{count:5,y:16,z:-20,color:'#f4f4f0',wing:'#c8c8c4',size:.6,glide:true,name:'white-tailed-tropicbirds'}],
 drift:{kind:'mist',count:28,colors:['#f2f6f4'],y:[3,14],z:[-12,-2],fall:-.02,sway:2.6,size:2.8,name:'mist-bands'},
 creature:{name:'giant-snail',height:.5,shell:'#8a6a4a',belly:'#c8b8a0',foot:'#6a5a4a',crest:'shell-plates',accent:'#a8805a'},
 crate:{body:'stone',color:'#7a7a72',trim:'#12ad2b',glyph:'#ffce00'},
 checkpoint:{pole:'#4a4a4a',cloth:'#12ad2b',accent:'#ffce00',cap:'#d21034'},
 finishArch:{style:'stone',stone:'#5e5e58',trim:'#12ad2b'},
 landmarks(api){
  const {finish,low}=api,r=random(663),top=api.platform('st-summit');
  // The needle: a tall, fluted, slightly leaning spire behind the summit.
  const needle=api.group('pico-cao-grande');
  built(needle,'phonolite-spire',b=>{const seg=low?14:24,rows=low?16:30,g=new T.CylinderGeometry(4,11,60,seg,rows,false),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),n=1+Math.sin(a*9)*.06+valueNoise(a*3,y*.2,4)*.14;p.setXYZ(i,x*n+y*.05,y,z*n);}g.computeVertexNormals();b.add(g,'#6a6a64',[top.x+8,20,-34],[0,0,0],[1,1,.8],.06);b.add(new T.SphereGeometry(4.6,12,8,0,Math.PI*2,0,Math.PI/2),'#3f5a32',[top.x+9.5,50,-34],[0,0,0],[1,.4,.8]);},2,.95);
  const wall=api.group('volcanic-plug-wall');built(wall,'plug-buttresses',b=>{for(let i=0;i<8;i++)b.add(new T.CylinderGeometry(1.4+r(),2.4+r(),14+r()*8,8),'#5e5e58',[40+i*7+r()*3,0,-8-r()*4],[0,r()*3,0],[1,1,.7],.08);},3,.95);
  const mist=api.group('mist-bands');built(mist,'cloud-collars',b=>{for(let i=0;i<3;i++)b.add(new T.TorusGeometry(14+i*3,1.4,6,30),'#eef2f0',[top.x+8,12+i*12,-34],[Math.PI/2,0,0],[1,.8,1]);},4);
  (mist.children[0] as T.Mesh).material=new T.MeshStandardMaterial({color:'#f2f6f4',transparent:true,opacity:.45,roughness:1,depthWrite:false});
  const roca=api.group('cocoa-plantation');built(roca,'roca-house',b=>{b.add(new T.BoxGeometry(8,3,4),'#e8dcc8',[2,1.5,-6]);b.add(new T.BoxGeometry(8.6,.3,5),'#a8402a',[2,3.2,-6]);for(let i=0;i<6;i++)b.add(new T.BoxGeometry(.6,1.2,.06),'#3a5a7a',[-1.2+i*1.3,1.6,-3.97]);b.add(new T.BoxGeometry(8,.2,1.4),'#8a6a48',[2,.1,-3.4]);},5);
  plantAfrica(roca,'cocoa-shrub',Array.from({length:low?8:16},(_,i)=>({x:-5+i*1.1,y:0,z:-2.4,scale:1.3})),{low,name:'cocoa-rows'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='phonolite-face'){const d=api.landmass(root,definition,'default','mass',5);built(d,'columnar-joints',b=>{for(let i=0;i<6;i++)b.add(new T.BoxGeometry(.05,4,.05),'#3e3e3a',[-definition.width/2+.3+i*.8,-2.4,1.25]);for(let y=-.6;y>-4.4;y-=.7)b.add(new T.BoxGeometry(.3,.1,.5),'#4e4e48',[-definition.width/2-.12,y,(y*3)%1-.5]);},api.seed);return true;}
  return false;
 },
});
