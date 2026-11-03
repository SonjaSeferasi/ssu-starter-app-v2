import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {rondavel,termiteMound} from './architecture';
import {plantAfrica} from './flora';
import {random,v3,type Builder} from '../../kit/common';

/** Niger — Kouré: The Giraffe Plateau. Red laterite plateaus banded with
 * the dark stripes of tiger bush, termite mounds, baobabs and acacias, and
 * the pale, lightly spotted West African giraffes. */
const laterite=earth('#b8754a','#9a5a36','#5e3420',{set:'savanna-rock',tint:'#f0c8a8',repeat:.5},{rough:.18,strata:.5});
const bush=earth('#a8915a','#9a5a36','#5e3420',{set:'savanna-rock',tint:'#f0d2b0',repeat:.5});
/** A West African giraffe: pale coat with light tan patches, long legs and
 * neck, ossicones. Faces +x; `deck` adds the ride platform on its back. */
export function giraffe(b:Builder,x:number,y:number,z:number,scale=1){
 const s=scale,coat='#e8cfa0',patch='#c2925a';b.add(new T.SphereGeometry(.7*s,12,8),coat,[x,y+2.5*s,z],[0,0,.08],[1.5,.85,.75]);
 for(let i=0;i<7;i++)b.add(new T.SphereGeometry(.18*s,6,4),patch,[x-.7*s+i*.24*s,y+2.6*s+(i%2)*.25*s,z+.48*s],[0,0,0],[1.2,1,.3]);
 for(const [lx,lz] of [[-.75,-.25],[-.75,.25],[.65,-.25],[.65,.25]])b.strut(v3(x+lx*s,y+2.2*s,z+lz*s),v3(x+lx*s,y,z+lz*s),.09*s,coat,6);
 b.strut(v3(x+.8*s,y+2.7*s,z),v3(x+1.6*s,y+4.6*s,z),.2*s,coat,8);b.add(new T.SphereGeometry(.25*s,8,6),coat,[x+1.85*s,y+4.75*s,z],[0,0,-.3],[1.7,.85,.8]);
 for(const sz of [-1,1])b.add(new T.CylinderGeometry(.04*s,.05*s,.3*s,5),'#6b4b2e',[x+1.65*s,y+5.05*s,z+sz*.1*s]);
 b.strut(v3(x-1*s,y+2.6*s,z),v3(x-1.35*s,y+1.6*s,z),.04*s,coat,4);
}
export const environment=africaEnvironment({
 code:'NER',id:'africa-ne',name:'niger-koure-environment',
 representation:'A fictional course on the laterite plateaus around Kouré. Riding the giraffes is a game device; in the real reserve the herd is protected and must not be approached.',
 lighting:{background:'#f0c89a',exposure:1.05,sun:'#ffc98a',sunIntensity:3,sky:'#f6dcbc',ground:'#5e3420',hemisphere:1.15,rim:'#ffb070',rimIntensity:.7,pixelRatio:1.25,reflections:{zenith:'#8ea6c6',horizon:'#f4cfa4',ground:'#5e3420',intensity:.25}},
 sky:{zenith:'#7d9cc8',horizon:'#f6cf9c',band:'#f2c08a',glow:'#ffd8a0',sun:[.8,.18,-.5],glowPower:7},
 fog:['#efcda4',45,180],clouds:{opacity:.5,high:[26,36],groups:9,shade:'#f0c49a',color:'#fbe2c4'},
 layers:['laterite-plateaus','west-african-giraffes','tiger-bush-bands','termite-mounds','sahel-horizon','sky'],
 backdrop:[{kind:'mesas',name:'laterite-terraces',z:-90,y:-6,height:7,colors:['#9a5a36','#7a4228','#a8915a'],count:6},{kind:'hills',name:'sahel-horizon',z:-160,y:-6,height:5,colors:['#a87a50','#b88a5a','#c89a6a']}],
 floor:{kind:'land',y:-4.6,colors:['#a86a40','#b98a5a','#c8a070'],name:'sandy-valley',rough:1},
 palettes:{default:laterite,'tiger-bush':bush,'koure-lookout':bush,'sahel-village':bush},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#b8754a',stoneAlt:'#9a5a36',metal:'#5a5a5a',accent:'#e05206'},
 capFlora:{default:'savanna-grass','laterite-slab':null,'cracked-laterite':null,'termite-mound':null},
 flora:[{kind:'umbrella-acacia',count:12,z:[-28,-12],y:-4.6,scale:[.8,1.2]},{kind:'thorn-scrub',count:30,z:[-12,-5],y:-4.6}],
 flocks:[{count:5,y:20,z:-30,color:'#2a2420',wing:'#5a4a3a',size:1.1,glide:true,name:'hooded-vultures'}],
 drift:{kind:'pollen',count:20,colors:['#ffe0a0'],y:[0,6],z:[-3,2],fall:.03,sway:1.2,size:.05,name:'evening-motes'},
 creature:{name:'dung-beetle',height:.55,shell:'#2a2a2a',belly:'#4a3a2a',foot:'#1a1a1a',crest:'twin-horns',accent:'#3a3a3a'},
 crate:{body:'wood',color:'#9a5a36',trim:'#5e3420',glyph:'#ffd890'},
 checkpoint:{pole:'#5e3420',cloth:'#e05206',accent:'#ffffff',cap:'#0db02b'},
 finishArch:{style:'timber',stone:'#9a5a36',trim:'#5e3420'},
 landmarks(api){
  const {finish,low,features}=api,r=random(220);
  // The herd: giraffes browsing among the acacias, slowly walking.
  const herd=api.group('west-african-giraffes'),walkers=new T.Group();walkers.name='browsing-giraffes';herd.add(walkers);
  built(walkers,'giraffe-herd',b=>{for(const [x,z,s] of [[0,0,1.1],[6,-3,.9],[14,1,1],[30,-2,1.2]] as const)giraffe(b,x,0,z,s);},4);
  walkers.position.set(20,-4.6,-18);api.animate({update:t=>{walkers.position.x=20+Math.sin(t*.05)*14;},motion:true,setVisible:v=>{walkers.visible=v;}});
  // Tiger bush: dark bands of shrubs across the plateau tops.
  const bands=api.group('tiger-bush-plateau'),spots:{x:number;y:number;z:number;scale:number}[]=[];
  for(let band=0;band<(low?3:6);band++){const z=-8-band*3.6;for(let x=-10;x<finish+10;x+=1.6+r()*1.2)if(Math.sin(x*.18+band)>.1)spots.push({x,y:-4.6,z:z+r(),scale:.7+r()*.5});}
  plantAfrica(bands,'thorn-scrub',spots,{low,name:'tiger-bush-bands'});
  const mounds=api.group('termite-mounds');built(mounds,'cathedral-mounds',b=>{for(let i=0;i<(low?5:11);i++)termiteMound(b,[-6+r()*(finish+12),-4.6,-6-r()*14],1.6+r()*2.2,'#a8603a');},6);
  const village=api.group('sahel-village');built(village,'village-huts',b=>{for(let i=0;i<5;i++)rondavel(b,[-5+i*2.6,0,-4.6-(i%2)*2],1,{wall:'#b8885a',thatch:'#c9a35a'});b.add(new T.CylinderGeometry(.6,.6,1.6,10),'#a87a4a',[8,.8,-5]);b.add(new T.ConeGeometry(.8,.8,10),'#c9a35a',[8,2,-5]);},7);
  plantAfrica(features,'baobab',[{x:api.platform('ne-baobab').x+2,y:-4.6,z:-4.2,scale:1.3},{x:finish*.3,y:-4.6,z:-20,scale:1.1}],{low,name:'sahel-baobabs'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='giraffe'){built(root,'ridden-giraffe',b=>{giraffe(b,-.2,-2.75,0,1);b.add(new T.BoxGeometry(w,.18,1.6),'#e05206',[0,-.09,0]);b.add(new T.BoxGeometry(w*.9,.08,1.62),'#f2e2b0',[0,-.2,0]);},api.seed);return true;}
  if(style==='termite-mound'){built(root,'termite-mound-cap',b=>{b.add(new T.CylinderGeometry(w/2,w/2+.2,.4,10),'#a8603a',[0,-.2,0]);termiteMound(b,[0,-6,0],5.6,'#a8603a');},api.seed);return true;}
  if(style==='baobab-crown'||style==='acacia-crown'){built(root,'crown-perch',b=>{b.add(new T.BoxGeometry(w,.3,1.8),style==='baobab-crown'?'#8f7f6b':'#5d4a3a',[0,-.15,0]);b.add(new T.CylinderGeometry(style==='baobab-crown'?1.2:.25,style==='baobab-crown'?1.8:.32,7,10),style==='baobab-crown'?'#9b8a76':'#5d4a3a',[0,-3.6,-.4]);for(let i=0;i<5;i++)b.add(new T.SphereGeometry(.7,8,6),i%2?'#6b7f3a':'#7f8f45',[-w/2+i*w/4,.15,-1.35],[0,0,0],[1.2,.4,.8]);},api.seed);return true;}
  return false;
 },
});
