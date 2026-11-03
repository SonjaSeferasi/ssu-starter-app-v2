import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {random,valueNoise} from '../../kit/common';

/** Tanzania — Kilimanjaro: Roof of Africa. The great snow-capped dome of
 * Kibo above a sea of cloud; on the way up, rainforest, moorland of giant
 * groundsels and lobelias, the dark Barranco Wall and the Lava Tower, and
 * finally terraced glacier ice near Uhuru Peak. */
const lava=earth('#5a5450','#46403c','#221e1c',{set:'alpine-rock',tint:'#c8c4bc',repeat:.5},{rough:.26,strata:.6});
const moor=earth('#7a8a52','#5a5450','#2a2622',{set:'alpine-rock',tint:'#d0ccc0',repeat:.5});
const forest=earth('#4f6a32','#5a4a38','#2e2620',{set:'mossy-rock',tint:'#d0d6c0',repeat:.5});
export const environment=africaEnvironment({
 code:'TZA',id:'africa-tz',name:'tanzania-kilimanjaro-environment',
 representation:'A fictional summit course inspired by the routes up Kilimanjaro. The step-ups, ice and timing are game devices.',
 lighting:{background:'#9ec0e0',exposure:1.06,sun:'#fff6e6',sunIntensity:3.4,sky:'#e8f0f8',ground:'#221e1c',hemisphere:1.3,rim:'#e0f0ff',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#3f7ac8',horizon:'#e2ecf4',ground:'#221e1c',intensity:.34}},
 sky:{zenith:'#2e6ec0',horizon:'#e4eef6',band:'#c8dcee',glow:'#fff8ea',sun:[-.4,.65,-.6],glowPower:22},
 fog:['#dce8f2',60,230],clouds:{opacity:.95,high:[30,40],lowBand:[-12,-4],groups:22,shade:'#d8e2ea'},
 layers:['roots-steps-scree-and-ice','kibo-summit','glaciers-of-kibo','barranco-wall','giant-groundsels','sky'],
 backdrop:[{kind:'range',name:'kibo-summit',z:-170,y:-14,height:56,peaks:2,rock:'#5a5450',forest:'#3f5a32',grass:'#7a7a5a',snow:'#f6f8fa',snowLine:44,treeLine:20,sharpness:.7,depth:90}],
 floor:{kind:'land',y:-5,colors:['#3a3430','#4a443e','#5a544c'],name:'gully-floor',rough:1.4},
 palettes:{default:lava,'park-gate':forest,'forest-root':forest,'moss-ledge':forest,'heath-moorland':moor,'groundsel-perch':moor,'glacier-ice':earth('#e8f2f8','#c8dce8','#8aa8c0',undefined,{rough:.05})},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#5a5450',stoneAlt:'#46403c',metal:'#4a4a4a',accent:'#1eb53a'},
 capFlora:{default:null,'park-gate':'banana','heath-moorland':'aloe','barranco-top':'giant-groundsel'},
 flora:[{kind:'giant-groundsel',count:22,z:[-14,-6],y:-5,scale:[1.2,1.8]},{kind:'forest-giant',count:8,z:[-24,-12],y:-5,scale:[.7,1]}],
 flocks:[{count:4,y:22,z:-26,color:'#1a1a1a',wing:'#f2f2f2',size:.9,glide:true,name:'white-necked-ravens'}],
 drift:{kind:'snow',count:22,colors:['#ffffff'],y:[2,14],z:[-6,3],fall:.4,sway:.8,size:.06,name:'summit-flurries'},
 creature:{name:'scree-hyrax',height:.5,shell:'#6a5a4a',belly:'#c8b8a0',foot:'#3a3028',crest:'ears',accent:'#6a5a4a'},
 crate:{body:'stone',color:'#1eb53a',trim:'#fcd116',glyph:'#00a3dd'},
 checkpoint:{pole:'#4a4a4a',cloth:'#1eb53a',accent:'#fcd116',cap:'#00a3dd'},
 finishArch:{style:'timber',stone:'#5a4028',trim:'#1eb53a'},
 landmarks(api){
  const {finish,low}=api,r=random(5895);
  const glaciers=api.group('glaciers-of-kibo');built(glaciers,'ice-cliffs',b=>{for(let i=0;i<(low?6:12);i++){const x=finish*.3+r()*finish*.7,h=4+r()*5;b.add(new T.BoxGeometry(6+r()*6,h,4),'#eef6fa',[x,40+r()*6,-170+r()*10],[0,r()*.4,0],[1,1,1],.04);for(let k=0;k<4;k++)b.add(new T.BoxGeometry(.2,h*.8,.1),'#b8d0e0',[x-2+k*1.3,40,-168]);}},2);
  const wall=api.group('barranco-wall'),s1=api.platform('tz-step-1');built(wall,'wall-face',b=>{for(let i=0;i<12;i++){const g=new T.DodecahedronGeometry(2+r()*2,0),p=g.getAttribute('position');for(let k=0;k<p.count;k++)p.setY(k,p.getY(k)*(1.4+valueNoise(k,i,3)*.4));g.computeVertexNormals();b.add(g,i%2?'#3e3a36':'#4a4440',[s1.x-4+i*2.4,2+r()*6,-8-r()*3]);}},3,.95);
  const tower=api.group('lava-tower'),lt=api.platform('tz-lava-tower');built(tower,'lava-tower-crag',b=>{b.add(new T.CylinderGeometry(3,5,16,8),'#3a3430',[lt.x+3,4,-9],[0,0,0],[1,1,.8],.1);},4,.95);
  const groundsels=api.group('giant-groundsels');plantAfrica(groundsels,'giant-groundsel',Array.from({length:low?6:12},()=>({x:20+r()*40,y:-.6,z:-3-r()*3,scale:1.1+r()*.5})),{low,name:'route-groundsels'});
  plantAfrica(api.group('montane-rainforest'),'forest-giant',[{x:2,y:0,z:-5,scale:.9},{x:12,y:-1,z:-6,scale:1}],{low,name:'gate-forest'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='glacier-ice'){const d=api.landmass(root,definition,'glacier-ice','island',1.2);built(d,'ice-banding',b=>{for(let i=0;i<5;i++)b.add(new T.BoxGeometry(definition.width,.04,.04),'#a8c8dc',[0,-.2-i*.22,1.21]);},api.seed);return true;}
  return false;
 },
});
