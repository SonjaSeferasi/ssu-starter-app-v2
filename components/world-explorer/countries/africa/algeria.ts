import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {plantGrove} from '../../kit/vegetation';
import {createWaterSurface} from '../../kit/water';
import {random,v3,valueNoise} from '../../kit/common';

/** Algeria — Tassili n’Ajjer: The Stone Forest. A plateau of wind-carved
 * sandstone: towers with eroded waists and wider caps, natural arches, a
 * painted rock shelter, a shaded guelta pool in the gorge and the orange
 * dunes of the erg beyond. */
const sandstone=earth('#c98f5a','#a8653c','#6e3f26',{set:'sandstone-cliff',tint:'#f2d2b4',repeat:.45},{strata:.38,rough:.3});
const erg=earth('#e4b47c','#c88f58','#93603a',{set:'sandstone-cliff',tint:'#f6dcc0',repeat:.4},{rough:.12});

/** A wind-carved sandstone tower: stacked lumps that narrow at the waist
 * and flare at the cap, as in the "stone forest" of the Tassili. */
function tower(b:import('../../kit/common').Builder,x:number,y:number,z:number,h:number,r:()=>number){
 const rings=Math.max(4,Math.round(h/1.6));
 for(let i=0;i<rings;i++){const t=i/(rings-1),waist=.55+.45*Math.abs(Math.cos(t*Math.PI*1.3+.4)),rad=(1.1+r()*.4)*waist*(t>.85?1.25:1);const g=new T.CylinderGeometry(rad*(.92+r()*.1),rad,h/rings*1.05,9,1);const p=g.getAttribute('position');for(let k=0;k<p.count;k++){const n=valueNoise(p.getX(k)*2+x,p.getZ(k)*2+i,7)*.18;p.setX(k,p.getX(k)*(1+n));p.setZ(k,p.getZ(k)*(1+n));}g.computeVertexNormals();b.add(g,i%3===2?'#8e5232':i%2?'#b5703f':'#a8653c',[x,y+h*(t*.94)+h/rings/2,z],[0,r()*3,0],[1,1,.85],.06);}
}
export const environment=africaEnvironment({
 code:'DZA',id:'africa-dz',name:'algeria-tassili-environment',
 representation:'A fictional route through a sandstone landscape inspired by Tassili n’Ajjer National Park. Towers, arches and the painted shelter are simplified studies; the painted figures are generic and not copies of real panels. No route touches rock art.',
 lighting:{background:'#e7c49a',exposure:1.05,sun:'#ffd9a8',sunIntensity:3.2,sky:'#f2e2cc',ground:'#6e3f26',hemisphere:1.2,rim:'#ffc98a',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#7aa3cf',horizon:'#f0d8b8',ground:'#6e3f26',intensity:.28}},
 sky:{zenith:'#5c8fc6',horizon:'#f3d9b6',band:'#ebcfa8',glow:'#ffe2b8',sun:[.7,.28,-.6],glowPower:10},
 fog:['#ecd2b0',50,190],clouds:{opacity:.45,high:[30,40],groups:8,shade:'#e8d0b0'},
 layers:['sandstone-towers-and-flakes','rock-art-shelter-and-arches','stone-forest-midground','guelta-gorge','erg-dunes','sky'],
 backdrop:[
  {kind:'dunes',name:'erg-dunes',z:-170,y:-8,height:22,colors:['#d9965a','#e9b075','#f2c890'],crests:6,depth:80},
  {kind:'mesas',name:'tassili-plateau-mesas',z:-95,y:-8,height:20,colors:['#a8653c','#7e4426','#c98f5a'],count:9},
 ],
 floor:{kind:'land',y:-6,colors:['#b97a48','#d0995f','#e2b47c'],name:'wadi-floor',rough:1.4},
 palettes:{default:sandstone,'erg':erg,'sand-ramp':erg},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#cdb68a',stone:'#c98f5a',stoneAlt:'#a8653c',metal:'#5a5a5a',accent:'#e0a040'},
 capFlora:{default:'thorn-scrub','erg':'savanna-grass','sand-ramp':'savanna-grass','flake':null,'hoodoo':null},
 flora:[{kind:'umbrella-acacia',count:8,z:[-30,-16],y:-6,scale:[.8,1.2]},{kind:'thorn-scrub',count:20,z:[-14,-6],y:-6}],
 flocks:[{count:3,y:22,z:-36,color:'#3a2a20',wing:'#d8c8b0',size:1.2,glide:true,name:'lanner-falcons'}],
 drift:{kind:'dust',count:28,colors:['#f2d2a8','#e8c090'],y:[0,8],z:[-4,3],fall:-.02,sway:2.4,size:.08,name:'blowing-sand'},
 banners:[{platform:'dz-plateau',offset:6.5,colors:['#e2a23a']},{platform:'dz-rim',offset:7,colors:['#c1272d']}],
 creature:{name:'tassili-sand-monitor',height:.7,shell:'#9a6a3c',belly:'#d9b07a',foot:'#5a3a22',crest:'spines',accent:'#7a4a2a'},
 crate:{body:'stone',color:'#c98f5a',trim:'#7e4426',glyph:'#ffe2a0'},
 checkpoint:{pole:'#5a3a22',cloth:'#006233',accent:'#ffffff',cap:'#d21034'},
 finishArch:{style:'stone',stone:'#b5703f',trim:'#7e4426'},
 mechanisms:{stone:'#c98f5a',stoneDark:'#7e4426',trim:'#e0a040',glow:'#ffd27a',metal:'#5a5a5a'},
 landmarks(api){
  const {finish,low,features,level}=api,r=random(179);
  // The stone forest: dozens of wind-carved towers in the middle distance.
  const forest=api.group('sandstone-stone-forest');
  built(forest,'eroded-sandstone-towers',b=>{for(let i=0;i<(low?14:30);i++){const x=-10+r()*(finish+30),z=-18-r()*40,h=6+r()*12;tower(b,x,-6,z,h,r);}},3,.95);
  // Natural arches standing in the canyon behind the arch crossing.
  const arches=api.group('natural-rock-arches'),a1=api.platform('dz-arch-1');
  built(arches,'wind-carved-arches',b=>{for(const [x,z,s] of [[a1.x+2,-14,1.4],[a1.x-14,-30,1.9],[a1.x+24,-26,1.6]] as const){const arc=new T.TorusGeometry(4*s,1.1*s,8,22,Math.PI);const p=arc.getAttribute('position');for(let k=0;k<p.count;k++){p.setY(k,p.getY(k)*(1+valueNoise(p.getX(k),p.getY(k),3)*.15));}arc.computeVertexNormals();b.add(arc,'#b5703f',[x,-6,z],[0,0,0],[1,1.2,.8],.06);for(const sx of [-1,1])b.add(new T.CylinderGeometry(1.3*s,1.8*s,3,8),'#a8653c',[x+sx*4*s,-5,z]);}},5,.95);
  // The rock-art shelter: a deep overhang above the rest stop, its back wall
  // painted with cattle, herders and giraffe in ochre and white.
  const shelter=api.group('rock-art-shelter'),sh=api.platform('dz-shelter');
  built(shelter,'shelter-overhang',b=>{b.add(new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),'#8e5232',[sh.x+sh.width/2,sh.y+4.4,-1.6],[Math.PI,0,0],[sh.width*.62,1.6,2.6],.07);b.add(new T.BoxGeometry(sh.width+2,5.5,1.6),'#9a5a34',[sh.x+sh.width/2,sh.y+2.2,-3.1],[0,0,0],[1,1,1],.06);},7,.95);
  built(shelter,'painted-figures',b=>{const wall=-2.28;for(let i=0;i<9;i++){const x=sh.x+1+i*(sh.width-2)/8,y=sh.y+1.6+(i%3)*.75,ochre=i%3?'#a3402a':'#f0e6d0';if(i%3===0){b.add(new T.BoxGeometry(.7,.28,.02),ochre,[x,y,wall]);for(const lx of [-.25,.25])b.add(new T.BoxGeometry(.06,.3,.02),ochre,[x+lx,y-.28,wall]);b.add(new T.BoxGeometry(.22,.16,.02),ochre,[x+.42,y+.12,wall]);for(const h of [-1,1])b.add(new T.BoxGeometry(.04,.18,.02),ochre,[x+.42+h*.08,y+.28,wall],[0,0,h*.5]);}else if(i%3===1){b.add(new T.BoxGeometry(.08,.42,.02),ochre,[x,y,wall]);b.add(new T.SphereGeometry(.07,6,4),ochre,[x,y+.28,wall]);for(const s of [-1,1])b.add(new T.BoxGeometry(.04,.32,.02),ochre,[x+s*.08,y-.32,wall],[0,0,s*.3]);b.add(new T.BoxGeometry(.03,.6,.02),ochre,[x+.2,y,wall],[0,0,-.3]);}else{b.add(new T.BoxGeometry(.4,.22,.02),ochre,[x,y,wall]);b.add(new T.BoxGeometry(.06,.6,.02),ochre,[x+.24,y+.3,wall],[0,0,-.35]);for(const lx of [-.15,.15])b.add(new T.BoxGeometry(.05,.34,.02),ochre,[x+lx,y-.26,wall]);}}},8);
  // The guelta: a shaded pool deep in the gorge under the hoodoos.
  const ledge=api.platform('dz-guelta-ledge'),pool=api.group('guelta-pool');
  const water=createWaterSurface(pool,{x:ledge.x+1,y:-4.6,z:-2,width:26,depth:12,shallow:'#5f8a7a',deep:'#24463f',segments:14,name:'guelta-water',flow:[.01,0],repeat:.2});api.animate({update:t=>water.update(t)});
  plantAfrica(pool,'papyrus',[{x:ledge.x-6,y:-4.6,z:-5},{x:ledge.x+7,y:-4.6,z:-6}],{low,name:'guelta-reeds'});
  // Saharan cypresses: rare, ancient trees of the plateau.
  plantGrove(features,'cypress',[{x:24,y:-6,z:-12,scale:[1.2,.9,1.2]},{x:finish*.7,y:-6,z:-15,scale:[1.4,1,1.4]},{x:finish-4,y:6,z:-9,scale:[.9,.8,.9]}],{low,name:'saharan-cypresses'});
  void level;void v3;
 },
 dress(root,definition,_context,api){
  const style=definition.style;
  if(style==='flake'){const d=api.landmass(root,definition,'default','island',.6);d.userData.flake=true;return true;}
  if(style==='hoodoo'){const d=api.landmass(root,definition,'default','island',3.2);built(d,'hoodoo-waist',(b,rr)=>{for(let i=0;i<3;i++)b.add(new T.CylinderGeometry(.6+rr()*.2,.75+rr()*.2,1.4,8),i%2?'#8e5232':'#a8653c',[0,-3.6-i*1.4,0],[0,rr()*3,0]);},api.seed);return true;}
  if(style==='natural-arch'){const d=api.landmass(root,definition,'default','island',1.2);built(d,'arch-legs',b=>{for(const s of [-1,1])b.add(new T.CylinderGeometry(.55,.9,9,8),'#a8653c',[s*(definition.width/2+.2),-5.6,-.6],[0,0,s*.12]);},api.seed);return true;}
  if(style==='shelter-wall'){const d=api.landmass(root,definition,'default','mass',4);built(d,'climbing-cracks',(b,rr)=>{for(let i=0;i<6;i++)b.add(new T.BoxGeometry(.06,.6+rr()*.6,.04),'#5a3420',[-definition.width/2+.06,-.6-i*.7,-.4+rr()*.8],[0,0,rr()-.5]);},api.seed);return true;}
  return false;
 },
});
