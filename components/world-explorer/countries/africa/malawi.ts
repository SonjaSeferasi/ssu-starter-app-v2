import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {boat,rondavel} from './architecture';
import {plantAfrica} from './flora';
import {createSchool,} from '../../kit/wildlife';
import {random} from '../../kit/common';

/** Malawi — Lake Malawi: Cichlid Coves. A clear freshwater lake like an
 * inland sea, smooth granite boulders stacked along the shore, hundreds of
 * species of bright cichlid fish in the shallows, dugout canoes pulled up
 * on the sand, and a fishing village with drying racks of usipa. */
const granite=earth('#b8a898','#9a8a7a','#5a4e44',{set:'gneiss',tint:'#f0e8e0',repeat:.45},{rough:.08,strata:.9});
const beach=earth('#e8d8b0','#d4c094','#9a8a62',{set:'sandstone-cliff',tint:'#fff4dc',repeat:.4},{rough:.04});
export const environment=africaEnvironment({
 code:'MWI',id:'africa-mw',name:'malawi-lake-environment',
 representation:'A fictional shoreline course inspired by Lake Malawi National Park. The village, dugouts and fish are generic studies; the otter patrol is a game device.',
 lighting:{background:'#b8dcec',exposure:1.06,sun:'#fff2d8',sunIntensity:3.2,sky:'#eef6f8',ground:'#5a4e44',hemisphere:1.35,rim:'#e0f2ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#3a8ad4',horizon:'#e4f0f4',ground:'#5a4e44',intensity:.42}},
 sky:{zenith:'#3a8ad4',horizon:'#e6f2f4',band:'#cfe4ee',glow:'#fff6e0',sun:[-.6,.45,-.6],glowPower:16},
 fog:['#d8eaf0',60,220],clouds:{opacity:.7,high:[24,34],groups:10},
 layers:['boulders-jetty-and-cove','fishing-village','granite-boulders','lake-malawi','mozambique-shore-hills','sky'],
 backdrop:[{kind:'sea',name:'lake-malawi',y:-1.6,z:-80,depth:180,shallow:'#4ab8c4',deep:'#1a5a8a'},{kind:'hills',name:'mozambique-shore-hills',z:-200,y:-2,height:12,colors:['#6a8aa0','#7a9aaa','#8aa8b4'],scale:2}],
 floor:{kind:'water',y:-1.6,shallow:'#5ac8cc',deep:'#2a7a9a',name:'lake-shallows',opacity:.82},
 palettes:{default:granite,'lake-beach':beach,'cove-beach':beach,'sand-shelf':beach,'fishing-village':beach},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#b8a898',stoneAlt:'#9a8a7a',metal:'#4a4a4a',accent:'#ce1126'},
 decks:{dugout:'raft','fishing-jetty':'dock'},
 capFlora:{default:null,'fishing-village':'savanna-grass','lakeside-lookout':'savanna-grass'},
 flora:[{kind:'baobab',count:4,z:[-26,-18],y:-1,scale:[.8,1]},{kind:'borassus-palm',count:6,z:[-18,-10],y:-1}],
 flocks:[{count:6,y:14,z:-20,color:'#2a2a2a',wing:'#f4f4f0',size:.8,glide:true,name:'fish-eagles'}],
 creature:{name:'spotted-otter',height:.55,shell:'#5a3e2a',belly:'#d8c8a8',foot:'#3a2a1e',crest:'ears',accent:'#5a3e2a'},
 crate:{body:'wood',color:'#6b4b2e',trim:'#ce1126',glyph:'#339e35'},
 checkpoint:{pole:'#5a4028',cloth:'#000000',accent:'#ce1126',cap:'#339e35'},
 finishArch:{style:'timber',stone:'#9a8a7a',trim:'#ce1126'},
 landmarks(api){
  const {finish,low}=api,r=random(265),v=api.platform('mw-village');
  const boulders=api.group('granite-boulders');built(boulders,'stacked-boulders',b=>{for(let i=0;i<(low?14:28);i++){const s=1.2+r()*3,x=r()*finish;b.add(new T.SphereGeometry(s,14,10),'#a89888',[x,-1.6+s*.4,-6-r()*14],[r(),r(),0],[1.2,.8,1]);if(r()<.4)b.add(new T.SphereGeometry(s*.6,12,8),'#b8a898',[x+(r()-.5)*s,-1.6+s*1.1,-7-r()*10],[0,0,0],[1.1,.8,1]);}},3);
  const fish=createSchool(api.group('cichlid-fish'),{count:low?18:40,centre:[finish*.45,-2.1,-1.6],radius:[16,1.2],colors:['#2a6ae0','#f0c020','#e85a2a','#5ac8f0','#f4f4f4'],size:.22,seed:5});
  api.animate({update:t=>fish.update(t),motion:true});
  const village=api.group('fishing-village');built(village,'village-huts',b=>{for(let i=0;i<4;i++)rondavel(b,[v.x+1+i*3.2,v.y,-8-(i%2)*2],1.1,{wall:'#a8865a',thatch:'#c8a862'});for(let i=0;i<3;i++){const x=v.x+2+i*3.4;for(const s of [-1,1])b.add(new T.CylinderGeometry(.05,.05,1.2,5),'#5a4028',[x+s*1.2,v.y+.6,-4.2]);b.add(new T.BoxGeometry(2.6,.06,1),'#b8a888',[x,v.y+1.2,-4.2]);for(let k=0;k<10;k++)b.add(new T.BoxGeometry(.18,.02,.06),'#d8d8d0',[x-1+k*.22,v.y+1.24,-4.2+(r()-.5)*.6]);}},4);
  const canoes=api.group('dugout-canoe');built(canoes,'beached-dugouts',b=>{for(let i=0;i<(low?3:6);i++)boat(b,[8+i*7+r()*3,-1.3,-5-r()*3],4,{hull:'#5a3e26',trim:'#3a2a1a'},r()*.4-.2);},5);
  plantAfrica(village,'savanna-grass',Array.from({length:12},()=>({x:v.x+r()*14,y:0,z:-3-r()*3})),{low,name:'village-grass'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='smooth-granite'||definition.style==='granite-point'){const d=api.landmass(root,definition,'default','island',2.6);built(d,'boulder-cap',b=>{b.add(new T.SphereGeometry(.7,10,6,0,Math.PI*2,0,Math.PI/2),'#b8a898',[definition.width/2-.6,-.2,-.9],[0,0,0],[1,.6,1]);},api.seed);return true;}
  return false;
 },
});
