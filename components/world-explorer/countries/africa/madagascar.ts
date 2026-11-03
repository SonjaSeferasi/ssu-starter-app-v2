import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Madagascar — Tsingy de Bemaraha: Stone Forest. A labyrinth of razor
 * limestone needles split by deep canyons with forest at their floor,
 * crossed by rope-and-plank bridges; sifaka lemurs leap between pinnacles,
 * and the Avenue of the Baobabs stands at the start of the road. */
const tsingy=earth('#a8a49a','#8a867c','#4a4844',{set:'limestone',tint:'#e8e6e0',repeat:.55},{rough:.3,strata:.3});
const red=earth('#b86a3a','#9a5a32','#5a3420',{set:'savanna-rock',tint:'#f0d0b0',repeat:.5});
/** A tsingy needle: a fluted, knife-edged spire of grey limestone. */
function needle(b:Builder,x:number,y:number,z:number,h:number,r:()=>number){
 const g=new T.ConeGeometry(.9+r()*.8,h,7,4);const p=g.getAttribute('position');for(let i=0;i<p.count;i++){const k=1+(i%2?-.18:.12);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}g.computeVertexNormals();b.add(g,r()<.5?'#9a968c':'#8a867c',[x,y+h/2,z],[0,r()*3,(r()-.5)*.08]);
}
function sifaka(b:Builder,x:number,y:number,z:number){
 b.add(new T.SphereGeometry(.28,8,6),'#f2ece0',[x,y+.5,z],[0,0,0],[.8,1.4,.8]);b.add(new T.SphereGeometry(.16,8,6),'#2a2a2a',[x,y+.98,z]);b.strut(v3(x,y+.2,z),v3(x-.3,y-.6,z),.05,'#f2ece0',4);
 for(const s of [-1,1])b.strut(v3(x,y+.7,z+s*.15),v3(x+.4,y+1.1,z+s*.3),.05,'#f2ece0',4);b.add(new T.SphereGeometry(.12,6,4),'#8a4a2a',[x,y+.85,z]);
}
export const environment=africaEnvironment({
 code:'MDG',id:'africa-mg',name:'madagascar-tsingy-environment',
 representation:'A fictional crossing inspired by the Tsingy de Bemaraha and the Avenue of the Baobabs. Pinnacle tops, bridges and the sifaka patrol are game devices.',
 lighting:{background:'#c4dce8',exposure:1.05,sun:'#fff0d4',sunIntensity:3.2,sky:'#eef4f2',ground:'#4a4844',hemisphere:1.35,rim:'#ffe6c4',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#4a92cc',horizon:'#e6eee8',ground:'#4a4844',intensity:.3}},
 sky:{zenith:'#4a92d0',horizon:'#ecece0',band:'#d4e0de',glow:'#fff2d8',sun:[-.6,.45,-.6],glowPower:13},
 fog:['#dce6e4',45,190],clouds:{opacity:.7,high:[24,34],groups:12},
 layers:['pinnacles-bridges-and-ledges','tsingy-pinnacles','suspension-bridges','canyon-forest','avenue-of-baobabs','sky'],
 backdrop:[{kind:'forest',name:'canyon-forest',z:[-30,-8],y:-6,flora:['forest-giant','ravenala','oil-palm'],count:40,scale:[.8,1.2]}],
 floor:{kind:'land',y:-7,colors:['#3a4a2a','#4a5a32','#5a6a3a'],name:'canyon-floor',rough:1.2},
 palettes:{default:tsingy,'baobab-avenue':red},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#9a968c',stoneAlt:'#8a867c',metal:'#4a4a4a',accent:'#fc3d32'},
 decks:{'rope-bridge':'rope'},
 capFlora:{default:null,'baobab-avenue':'savanna-grass','tsingy-lookout':'aloe'},
 flocks:[{count:6,y:14,z:-22,color:'#2a2a2a',wing:'#4a4a4a',size:.6,name:'vasa-parrots'}],
 creature:{name:'sifaka',height:.7,shell:'#f2ece0',belly:'#d8c8a8',foot:'#2a2a2a',crest:'ears',accent:'#8a4a2a'},
 crate:{body:'stone',color:'#9a968c',trim:'#fc3d32',glyph:'#007e3a'},
 checkpoint:{pole:'#5a4028',cloth:'#fc3d32',accent:'#ffffff',cap:'#007e3a'},
 finishArch:{style:'stone',stone:'#8a867c',trim:'#007e3a'},
 landmarks(api){
  const {finish,low,level}=api,r=random(261),av=api.platform('mg-avenue');
  const pins=api.group('tsingy-pinnacles');built(pins,'needle-forest',b=>{for(let i=0;i<(low?30:70);i++)needle(b,-10+r()*(finish+20),-7,-6-r()*30,8+r()*12,r);for(const p of level.platforms)if(p.style==='tsingy-pinnacle'||p.style==='tsingy-tip')needle(b,p.x+p.width/2,-7,-1.6,p.y+8,r);},3,.95);
  const baobabs=api.group('avenue-of-baobabs');plantAfrica(baobabs,'grandidier-baobab',Array.from({length:low?4:8},(_,i)=>({x:av.x-4+i*2.6,y:0,z:i%2?-5:-9,scale:1.4+r()*.3})),{low,name:'avenue-baobabs'});
  built(baobabs,'red-road',b=>{b.add(new T.BoxGeometry(av.width+10,.04,3),'#b86a3a',[av.x+av.width/2,.02,-7]);},4);
  const bridges=api.group('suspension-bridges');built(bridges,'far-bridges',b=>{for(let i=0;i<3;i++){const x=20+i*26,y=4+r()*4,z=-12-r()*8;for(let k=0;k<14;k++)b.add(new T.BoxGeometry(.5,.08,1),'#6b4b2e',[x+k*.6,y-Math.sin(k/13*Math.PI)*.8,z]);for(const s of [-1,1])b.strut(v3(x,y+1,z+s*.5),v3(x+8,y+1,z+s*.5),.02,'#c9b07a',8);}},5);
  const lemurs=api.group('sifaka-lemurs'),troop=new T.Group();troop.name='leaping-sifakas';lemurs.add(troop);built(troop,'sifakas',b=>{for(let i=0;i<4;i++)sifaka(b,i*3,0,0);},6);
  troop.position.set(30,8,-14);api.animate({update:t=>{const k=(t*.5)%1;troop.position.x=30+((t*2)%(finish-30));troop.position.y=8+Math.sin(k*Math.PI)*2.5;},motion:true,setVisible:v=>{troop.visible=v;}});
 },
 dress(root,definition,_context,api){
  if(definition.style==='tsingy-pinnacle'||definition.style==='tsingy-tip'){const d=api.landmass(root,definition,'default','island',2.2);built(d,'karst-blades',(b,rr)=>{for(let i=0;i<3;i++)b.add(new T.ConeGeometry(.12,.5,4),'#8a867c',[-definition.width/2+.3+rr()*(definition.width-.6),.2,-.9]);},api.seed);return true;}
  return false;
 },
});
