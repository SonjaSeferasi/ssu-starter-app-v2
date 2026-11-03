import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {plantGrove} from '../../kit/vegetation';
import {createSchool} from '../../kit/wildlife';
import {random,valueNoise,v3,type Builder} from '../../kit/common';

/** Seychelles — Anse Source d'Argent: Granite and Lagoon. Huge pink-grey
 * granite boulders, sculpted by rain into deep grooves, stand on powder-
 * white sand inside a shallow coral lagoon; coconut palms lean over the
 * beach and Aldabra giant tortoises graze in the shade. */
const granite=earth('#c8a8a0','#a88a84','#5e4a48',{set:'gneiss',tint:'#f8e8e4',repeat:.45},{rough:.08,strata:.9});
const sand=earth('#f6f2e8','#e8dcc8','#b8aa90',{set:'limestone',tint:'#ffffff',repeat:.6},{rough:.02});
/** A grooved granite boulder: a rounded mass with vertical rain flutes. */
function boulder(b:Builder,x:number,y:number,z:number,s:number,r:()=>number){
 const g=new T.SphereGeometry(s,22,14),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),k=1-Math.abs(Math.sin(a*9))*.06+valueNoise(p.getX(i),p.getY(i),3)*.1;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}g.computeVertexNormals();
 b.add(g,r()<.5?'#c0a098':'#b09088',[x,y+s*.55,z],[0,r()*3,(r()-.5)*.3],[1.2,.9+r()*.3,1]);
}
function tortoise(b:Builder,x:number,y:number,z:number,s=1){
 b.add(new T.SphereGeometry(.8*s,14,8,0,Math.PI*2,0,Math.PI/2),'#4a4234',[x,y+.25*s,z],[0,0,0],[1.2,.9,1]);for(let i=0;i<6;i++)b.add(new T.CylinderGeometry(.22*s,.22*s,.04,6),'#3a3428',[x+Math.cos(i)*.5*s,y+.7*s,z+Math.sin(i)*.4*s],[.4,0,0]);
 b.strut(v3(x+.8*s,y+.35*s,z),v3(x+1.3*s,y+.7*s,z),.13*s,'#6a6050',5);b.add(new T.SphereGeometry(.17*s,8,6),'#6a6050',[x+1.4*s,y+.75*s,z]);for(const [lx,lz] of [[-.6,-.5],[-.6,.5],[.6,-.5],[.6,.5]])b.add(new T.CylinderGeometry(.14*s,.16*s,.35*s,6),'#6a6050',[x+lx*s,y+.15*s,z+lz*s]);
}
export const environment=africaEnvironment({
 code:'SYC',id:'africa-sc',name:'seychelles-la-digue-environment',
 representation:'A fictional beach course inspired by Anse Source d\'Argent on La Digue. Riding a tortoise is purely a game device; real tortoises are protected and should never be ridden.',
 lighting:{background:'#a8e4f0',exposure:1.08,sun:'#fff6e4',sunIntensity:3.4,sky:'#eefcff',ground:'#5e4a48',hemisphere:1.45,rim:'#ffe8d8',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#2a98dc',horizon:'#e4f8fa',ground:'#5e4a48',intensity:.48}},
 sky:{zenith:'#2a96dc',horizon:'#e6f8fa',band:'#c6ecf4',glow:'#fffaec',sun:[-.5,.6,-.6],glowPower:20},
 fog:['#d4f2f8',60,230],clouds:{opacity:.65,high:[24,34],groups:10},
 layers:['boulders-beach-and-grove','granite-boulders','coconut-palms','coral-lagoon','praslin-horizon','sky'],
 backdrop:[{kind:'sea',name:'coral-lagoon',y:-1.2,z:-60,depth:200,shallow:'#4ae0d8',deep:'#1a80c0',foam:true},{kind:'hills',name:'praslin-horizon',z:-200,y:-2,height:10,colors:['#3a6a4a','#4a7a52','#5a8a5a'],scale:2}],
 floor:{kind:'water',y:-1.2,shallow:'#6ae8e0',deep:'#2aa0c8',name:'lagoon-shallows',opacity:.75},
 palettes:{default:granite,'white-beach':sand,'sandy-hollow':sand,'palm-grove':sand},
 deck:{wood:'#6b4b2e',woodAlt:'#8a6a42',rope:'#c9b07a',stone:'#c8a8a0',stoneAlt:'#a88a84',metal:'#4a4a4a',accent:'#003f87'},
 capFlora:{default:null,'palm-grove':'savanna-grass'},
 flocks:[{count:8,y:12,z:-20,color:'#f4f4f0',wing:'#f4f4f0',size:.6,glide:true,name:'fairy-terns'}],
 creature:{name:'ghost-crab',height:.5,shell:'#e8d8c8',belly:'#f6ece0',foot:'#c8b8a8',crest:'antennae',accent:'#e8d8c8'},
 crate:{body:'wood',color:'#8a6a42',trim:'#003f87',glyph:'#fcd856'},
 checkpoint:{pole:'#5a4028',cloth:'#003f87',accent:'#fcd856',cap:'#d62828'},
 finishArch:{style:'harbor',stone:'#a88a84',trim:'#007a3d'},
 landmarks(api){
  const {finish,low,features}=api,r=random(248),cove=api.platform('sc-cove'),grove=api.platform('sc-grove');
  const rocks=api.group('granite-boulders');built(rocks,'boulder-field',b=>{for(let i=0;i<(low?10:22);i++)boulder(b,-6+r()*(finish+12),-1.2,-6-r()*16,2+r()*4,r);},3);
  const beach=api.group('anse-source-dargent');built(beach,'powder-beach',b=>{b.add(new T.BoxGeometry(finish+20,.3,6),'#f6f2e8',[finish/2,-1.15,-5]);for(let i=0;i<10;i++)b.add(new T.BoxGeometry(.1,.04,1+r()),'#d8ccb8',[r()*finish,-.98,-4-r()*3]);},4);
  createShoreFoam(features,Array.from({length:low?10:24},(_,i)=>({x:i*finish/24,y:-1.15,z:-2+(i%2)*.4,size:1.1})),low);
  const palms=api.group('coconut-palms');plantGrove(palms,'coconut-palm',Array.from({length:low?6:12},()=>({x:-6+r()*(finish+12),y:-1,z:-7-r()*8,scale:.9+r()*.4,rotation:[0,r()*6,(r()-.5)*.3]})),{low,name:'leaning-palms'});
  const tort=api.group('giant-tortoises');built(tort,'grazing-tortoises',b=>{tortoise(b,grove.x+2,grove.y,-3.6,1.2);tortoise(b,grove.x+5.6,grove.y,-4.6,1);tortoise(b,cove.x+5,cove.y,-4.2,.9);},5);
  const fish=createSchool(api.group('reef-fish'),{count:low?14:30,centre:[finish*.5,-1.7,-1.4],radius:[14,1],colors:['#f0c020','#2a8ae0','#f4f4f4'],size:.2,seed:9});api.animate({update:t=>fish.update(t),motion:true});
 },
 dress(root,definition,_context,api){
  if(definition.style==='giant-tortoise'){built(root,'ride-tortoise',b=>{tortoise(b,-.2,-1.25,0,1.3);b.add(new T.SphereGeometry(definition.width/2,16,6,0,Math.PI*2,0,Math.PI/2),'#4a4234',[0,-.35,0],[0,0,0],[1,.3,.7]);},api.seed);return true;}
  if(definition.style==='granite-boulder'||definition.style==='boulder-viewpoint'||definition.style==='boulder-cove'){const d=api.landmass(root,definition,'default','island',2.6);built(d,'rain-flutes',b=>{for(let i=0;i<Math.ceil(definition.width/.5);i++)b.add(new T.BoxGeometry(.06,1.6,.04),'#8a6a64',[-definition.width/2+.25+i*.5,-.9,1.22]);},api.seed);return true;}
  return false;
 },
});
