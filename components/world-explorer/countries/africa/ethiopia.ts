import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random} from '../../kit/common';

/** Ethiopia — Lalibela: The Rock-Hewn Churches. Reddish volcanic tuff cut
 * into deep trenches; at the centre a cross-shaped church carved down from
 * the surface, its roof level with the ground; carved steps, tunnels and
 * the folded Lasta mountains under a high blue sky. */
const tuff=earth('#a8705a','#8a5a46','#4e3024',{set:'sandstone-cliff',tint:'#f0c8b4',repeat:.45},{rough:.12,strata:.5});
const highland=earth('#8a8a4a','#8a5a46','#4e3024',{set:'savanna-rock',tint:'#efd8c0',repeat:.5});
export const environment=africaEnvironment({
 code:'ETH',id:'africa-et',name:'ethiopia-lalibela-environment',
 representation:'A fictional route through trenches inspired by Lalibela. The churches are living places of worship and are shown as respectful backdrop studies; the route never crosses a church.',
 lighting:{background:'#b8d0ea',exposure:1.05,sun:'#fff0d8',sunIntensity:3.2,sky:'#eaf0f4',ground:'#4e3024',hemisphere:1.3,rim:'#ffe2c4',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#4a88cc',horizon:'#e8ecee',ground:'#4e3024',intensity:.3}},
 sky:{zenith:'#3f80cc',horizon:'#e6ecee',band:'#cfdeea',glow:'#fff4e0',sun:[.5,.6,-.6],glowPower:18},
 fog:['#dfe6ea',55,210],clouds:{opacity:.75,high:[26,38],groups:12},
 layers:['steps-trenches-and-tunnel','bete-giyorgis','rock-cut-trenches','carved-tunnels','lasta-highlands','sky'],
 backdrop:[{kind:'range',name:'lasta-highlands',z:-150,y:-4,height:28,peaks:7,rock:'#8a6a52',forest:'#5a6a3a',grass:'#8a8a5a',treeLine:10,sharpness:1.1}],
 floor:{kind:'land',y:-7,colors:['#7a4e38','#8a5a46','#9a6a52'],name:'trench-bottom',rough:.6},
 palettes:{default:tuff,'hillside-village':highland,'highland-view':highland},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#a8705a',stoneAlt:'#8a5a46',metal:'#4a4a4a',accent:'#078930'},
 capFlora:{default:null,'hillside-village':'thorn-scrub','highland-view':'savanna-grass'},
 flora:[{kind:'umbrella-acacia',count:6,z:[-28,-18],y:1,scale:[.8,1]}],
 flocks:[{count:6,y:16,z:-22,color:'#2a2a2a',wing:'#c8c8c8',size:.7,glide:true,name:'thick-billed-ravens'}],
 creature:{name:'trench-gecko',height:.5,shell:'#8a7a5a',belly:'#d8c8a8',foot:'#4a3a2a',crest:'spines',accent:'#a8705a'},
 crate:{body:'stone',color:'#a8705a',trim:'#078930',glyph:'#fcdd09'},
 checkpoint:{pole:'#5a4028',cloth:'#078930',accent:'#fcdd09',cap:'#da121a'},
 finishArch:{style:'stone',stone:'#8a5a46',trim:'#4e3024'},
 mechanisms:{stone:'#a8705a',stoneDark:'#4e3024',trim:'#fcdd09',glow:'#ffd27a',metal:'#4a4a4a'},
 landmarks(api){
  const {finish,low}=api,r=random(18),court=api.platform('et-courtyard');
  // Bete Giyorgis: a cross-shaped block carved down into its pit, its
  // roof carrying nested crosses, standing in the trench behind the route.
  const church=api.group('bete-giyorgis'),cx=court.x+7,cz=-11;
  built(church,'cross-church',b=>{const h=11,base=court.y;for(const [w,d] of [[12,4],[4,12]] as const)b.add(new T.BoxGeometry(w,h,d),'#a8705a',[cx,base+h/2,cz],[0,0,0],[1,1,1],.03);for(const [w,d] of [[9,1],[1,9]] as const)b.add(new T.BoxGeometry(w,.3,d),'#8a5a46',[cx,base+h+.15,cz]);for(let i=0;i<3;i++)for(const s of [-1,1]){b.add(new T.BoxGeometry(.9,1.6,.06),'#3a221a',[cx+s*4.2,base+3+i*2.6,cz+2.03]);b.add(new T.CylinderGeometry(.45,.45,.06,10,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2),'#3a221a',[cx+s*4.2,base+3.8+i*2.6,cz+2.03]);}for(const s of [-1,1])b.add(new T.BoxGeometry(1.2,h*.4,.1),'#8a5a46',[cx+s*1.4,base+1.2,cz+6.02]);},3,.92);
  const trenches=api.group('rock-cut-trenches');built(trenches,'trench-walls',b=>{b.add(new T.BoxGeometry(finish+20,12,3),'#8a5a46',[finish/2,-4,-20],[0,0,0],[1,1,1],.05);for(let i=0;i<20;i++)b.add(new T.BoxGeometry(2+r()*3,.2,.3),'#6e4434',[r()*finish,-3+r()*8,-18.4]);},4,.95);
  const tunnels=api.group('carved-tunnels'),t=api.platform('et-tunnel');built(tunnels,'tunnel-portal',b=>{b.add(new T.BoxGeometry(t.width+1,5,1.4),'#8a5a46',[t.x+t.width/2,t.y+3.4,-1.6]);b.add(new T.BoxGeometry(1.2,3.2,.2),'#2a1a14',[t.x+2,t.y+1.6,-.9]);},5);
  const steps=api.group('pilgrim-steps');built(steps,'pilgrims',b=>{for(let i=0;i<4;i++){const x=finish-14+i*2.2;b.add(new T.CylinderGeometry(.22,.3,1.4,8),'#f2ece0',[x,1.7,-4]).add(new T.SphereGeometry(.18,8,6),'#4a3426',[x,2.55,-4]);}},6);
  plantAfrica(steps,'thorn-scrub',[{x:-2,y:0,z:-3,scale:1}],{low,name:'village-shrub'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='trench-ledge'){const d=api.landmass(root,definition,'default','island',2.6);built(d,'tool-marks',b=>{for(let i=0;i<6;i++)b.add(new T.BoxGeometry(.04,.5,.02),'#6e4434',[-definition.width/2+.3+i*.45,-.6,1.21],[0,0,.3]);},api.seed);return true;}
  return false;
 },
});
