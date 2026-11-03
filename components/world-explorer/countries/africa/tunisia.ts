import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {cubeHouse} from './architecture';
import {plantAfrica} from './flora';
import {plantGrove} from '../../kit/vegetation';
import {arcadeBay} from '../../kit/architecture';
import {random,type Builder} from '../../kit/common';

/** Tunisia — El Jem: The Amphitheatre Climb. The great oval of honey-coloured
 * limestone rises over the low white town, three storeys of arcades with
 * the famous breach in its western side, olive groves all around. */
const ashlar=earth('#d9b27a','#c4985e','#8a6a42',{set:'ashlar',tint:'#f4e2c4',repeat:.7},{strata:.42,rough:.04});
const sand=earth('#e2c08a','#c4985e','#8a6a42',{set:'ashlar',tint:'#f4e2c4',repeat:.7},{capMaps:{set:'sandstone-blocks',tint:'#f2ddb8',repeat:.8}});
const grove=earth('#9c9a62','#b08a5a','#7a5e3e',{set:'savanna-rock',tint:'#eadcc4',repeat:.5});

/** One storey of the amphitheatre: arcaded bays around part of an ellipse. */
function storey(b:Builder,cx:number,cz:number,rx:number,rz:number,y:number,h:number,from:number,to:number,bays:number,colour:string,breach?:[number,number]){
 for(let i=0;i<bays;i++){const a0=from+(to-from)*i/bays,a1=from+(to-from)*(i+1)/bays,a=(a0+a1)/2;if(breach&&a>breach[0]&&a<breach[1])continue;const x=cx+Math.cos(a)*rx,z=cz+Math.sin(a)*rz,w=Math.hypot(Math.cos(a1)*rx-Math.cos(a0)*rx,Math.sin(a1)*rz-Math.sin(a0)*rz);b.add(arcadeBay(w*1.02,h,1.4,{opening:.56,spring:.6}),colour,[x,y,z],[0,Math.atan2(-Math.cos(a)*rz,-Math.sin(a)*rx),0],[1,1,1],.04);b.add(new T.BoxGeometry(w*1.02,.3,1.7),'#c4985e',[x,y+h,z],[0,Math.atan2(-Math.cos(a)*rz,-Math.sin(a)*rx),0]);}
}
export const environment=africaEnvironment({
 code:'TUN',id:'africa-tn',name:'tunisia-el-jem-environment',
 representation:'A fictional training course inspired by the Amphitheatre of El Jem. The amphitheatre and town are simplified studies; the raised arena stones, the lift and the route on the tiers are game devices, not a reconstruction.',
 lighting:{background:'#bcd6ea',exposure:1.05,sun:'#ffe6be',sunIntensity:3.1,sky:'#eef2ee',ground:'#8a6a42',hemisphere:1.3,rim:'#ffe0b0',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#5a9ad8',horizon:'#f1e3c8',ground:'#8a6a42',intensity:.3}},
 sky:{zenith:'#4e93d6',horizon:'#f1e6cf',band:'#dfe6dc',glow:'#fff0d0',sun:[.6,.45,-.65],glowPower:16},
 fog:['#e8e4d6',55,210],clouds:{opacity:.7,high:[26,36],groups:10},
 layers:['amphitheatre-route','el-jem-amphitheatre','town-of-thysdrus','olive-groves','sahel-plain','sky'],
 backdrop:[{kind:'hills',name:'sahel-plain',z:-130,y:-7,height:6,colors:['#b9a77a','#c9b78a','#d8c89c'],scale:2}],
 floor:{kind:'land',y:-5,colors:['#a99a6a','#c2ad7e','#d4c094'],name:'olive-country-floor',rough:.8},
 palettes:{default:ashlar,'olive-grove':grove,'arena-sand':sand,'portal':ashlar},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#d9b27a',stoneAlt:'#c4985e',metal:'#4c4c48',accent:'#c9a24a'},
 capFlora:{default:null,'olive-grove':'savanna-grass'},
 flora:[{kind:'thorn-scrub',count:16,z:[-12,-5],y:-5}],
 flocks:[{count:6,y:16,z:-26,color:'#3a3a3a',wing:'#6a6a6a',size:.4,name:'swifts'}],
 creature:{name:'gallery-gecko',height:.6,shell:'#8a9a5a',belly:'#e2d6a8',foot:'#5a5a3a',crest:'spines',accent:'#c9a24a'},
 crate:{body:'stone',color:'#d9b27a',trim:'#8a6a42',glyph:'#fff0b0'},
 checkpoint:{pole:'#6b4b2e',cloth:'#e70013',accent:'#ffffff'},
 finishArch:{style:'roman',stone:'#d9b27a',trim:'#8a6a42'},
 mechanisms:{stone:'#d9b27a',stoneDark:'#8a6a42',trim:'#c9a24a',glow:'#ffd27a',metal:'#4c4c48',maps:{set:'ashlar',tint:'#f4e2c4',repeat:.7}},
 landmarks(api){
  const {finish,low,features}=api,r=random(38);
  // The amphitheatre: the far half of the oval, three arcaded storeys and
  // an attic, with the breach cut through one side.
  const amph=api.group('el-jem-amphitheatre'),cx=finish*.5,cz=-34;
  built(amph,'amphitheatre-arcades',b=>{const bays=low?22:34;storey(b,cx,cz,46,22,-5,6,Math.PI*1.02,Math.PI*1.98,bays,'#d9b27a',[Math.PI*1.12,Math.PI*1.2]);storey(b,cx,cz,46,22,1.3,5.6,Math.PI*1.02,Math.PI*1.98,bays,'#cfa76e',[Math.PI*1.1,Math.PI*1.22]);storey(b,cx,cz,46,22,7.2,5,Math.PI*1.05,Math.PI*1.95,bays,'#c79f68',[Math.PI*1.08,Math.PI*1.25]);for(let i=0;i<bays;i++){const a=Math.PI*1.08+Math.PI*.84*i/bays;if(a>Math.PI*1.07&&a<Math.PI*1.27)continue;b.add(new T.BoxGeometry(2.6,2.2,1.2),'#c4985e',[cx+Math.cos(a)*46,13.3,cz+Math.sin(a)*22],[0,Math.atan2(-Math.cos(a)*22,-Math.sin(a)*46),0]);}for(let i=0;i<12;i++)b.add(new T.DodecahedronGeometry(.6+r()*.8,0),'#c4985e',[cx-38+r()*8,-5+r()*.6,cz-8-r()*6]);},2,.9);
  // The near arcades behind the tiers the route climbs.
  const tiers=api.group('arcade-tiers'),g=api.platform('tn-gallery');
  built(tiers,'near-arcade-facade',b=>{for(let i=0;i<9;i++){const x=g.x-14+i*4.2;b.add(arcadeBay(4.2,4.4,1,{opening:.6}),'#d9b27a',[x,-1.2,-3.6]);b.add(arcadeBay(4.2,4,1,{opening:.6}),'#cfa76e',[x,3.2,-4.2]);b.add(new T.BoxGeometry(4.2,.32,1.3),'#c4985e',[x,7.2,-4.2]);}},4,.9);
  // The hypogeum: a stone shaft around the lift with a wooden cage frame.
  const lift=api.platform('tn-lift'),shaft=api.group('hypogeum-lift-shaft');
  built(shaft,'hypogeum-shaft',b=>{const x=lift.x+lift.width/2;for(const s of [-1,1])b.add(new T.BoxGeometry(.5,7,2.8),'#8a6a42',[x+s*(lift.width/2+.4),-2.6,-.2]);b.add(new T.BoxGeometry(lift.width+1.3,.4,.4),'#6b4b2e',[x,3.6,-1.2]);b.add(new T.CylinderGeometry(.22,.22,.6,10).rotateZ(Math.PI/2),'#5a4028',[x,3.6,-1.2]);for(const s of [-1,1])b.add(new T.CylinderGeometry(.015,.015,4.2,4),'#c9b07a',[x+s*(lift.width/2-.2),1.6,-1]);},6);
  // Thysdrus today: low white houses with blue doors around the monument.
  const town=api.group('town-of-thysdrus');
  built(town,'el-jem-town',b=>{for(let i=0;i<(low?14:30);i++){const x=-12+r()*(finish+24),z=-14-r()*10;if(Math.abs(x-cx)<30&&z<-20)continue;cubeHouse(b,[x,-5,z],[2.2+r()*1.6,2+r()*1.4,2.4],{wall:'#f1ece0',door:'#2a6aa8',trim:r()<.4?'#2a6aa8':'#e8e0d0'},r()<.15);}},9);
  // Olive groves in neat rows over the plain.
  const olives=api.group('olive-groves'),spots:{x:number;y:number;z:number;scale:number}[]=[];
  for(let row=0;row<(low?2:4);row++)for(let x=-10;x<finish+12;x+=5)spots.push({x:x+(row%2)*2.5,y:-5,z:-9-row*3.2,scale:.75+r()*.3});
  plantGrove(olives,'olive',spots,{low,name:'olive-rows'});
  plantAfrica(features,'aloe',[{x:4,y:0,z:-1.8,scale:.8},{x:19,y:1,z:-1.8,scale:.7}],{low,name:'prickly-aloes'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='arena-stone'){const d=api.landmass(root,definition,'default','shelf',.8);built(d,'arena-stone-joints',b=>{for(let x=-w/2+.75;x<w/2;x+=.75)b.add(new T.BoxGeometry(.03,.75,.02),'#8a6a42',[x,-.4,1.21]);},api.seed);return true;}
  if(style==='cavea-tier'||style==='upper-gallery'||style==='arcade-top'){const d=api.landmass(root,definition,'default','shelf',style==='arcade-top'?1.4:2.4);built(d,'tier-arches',b=>{const bays=Math.max(1,Math.round(w/2.6));for(let i=0;i<bays;i++)b.add(arcadeBay(w/bays,2.6,.4,{opening:.58}),'#c79f68',[-w/2+(i+.5)*w/bays,-3.1,1.05]);},api.seed);return true;}
  if(style==='hypogeum-cell'){api.landmass(root,definition,'default','island',.5);return true;}
  return false;
 },
});
