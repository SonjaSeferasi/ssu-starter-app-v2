import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {plantAfrica} from './flora';
import {random,v3} from '../../kit/common';

/** Sierra Leone — Tiwai Island: Down the Moa River. A brown forest river
 * with granite boulders and white rapids, drifting logs, the high wall of
 * lowland rainforest on Tiwai Island, and a small research camp. */
const granite=earth('#8a8a7a','#6a6a5e','#3e3e36',{set:'gneiss',tint:'#e0e0d6',repeat:.5},{rough:.2});
const forest=earth('#5a6a3a','#6a5440','#3e3024',{set:'mossy-rock',tint:'#d0d6c0',repeat:.5});
export const environment=africaEnvironment({
 code:'SLE',id:'africa-sl',name:'sierra-leone-tiwai-environment',
 representation:'A fictional river course inspired by Tiwai Island Wildlife Sanctuary. Logs, currents and the route are game devices.',
 lighting:{background:'#b8c8bc',exposure:1.02,sun:'#f8f0d8',sunIntensity:2.6,sky:'#e2eae0',ground:'#3e3024',hemisphere:1.45,rim:'#e0f0d8',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#7a9ab0',horizon:'#dce4d8',ground:'#3e3024',intensity:.3}},
 sky:{zenith:'#7a9ec0',horizon:'#e4e8da',band:'#d0dccf',glow:'#f8f2dc',sun:[-.6,.4,-.6],glowPower:10},
 fog:['#d2ddd0',35,160],clouds:{opacity:.9,high:[20,30],lowBand:[-3,2],groups:16,shade:'#c4d0c4'},
 layers:['boulders-logs-and-rapids','drifting-logs','tiwai-rainforest','moa-river','forest-horizon','sky'],
 backdrop:[{kind:'forest',name:'forest-horizon',z:[-70,-44],y:-2.6,flora:['forest-giant','oil-palm'],count:44,scale:[.8,1.2]}],
 floor:{kind:'water',y:-2.6,shallow:'#7a7a52',deep:'#3e3e2a',name:'moa-river',opacity:.95},
 palettes:{default:granite,'tiwai-forest':forest,'riverbank':forest,'research-camp':forest},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#8a8a7a',stoneAlt:'#6a6a5e',metal:'#4a4a4a',accent:'#1eb53a'},
 capFlora:{default:null,'tiwai-forest':'cocoa-shrub','riverbank':'savanna-grass','research-camp':'savanna-grass'},
 flora:[{kind:'forest-giant',count:16,z:[-26,-14],y:-2.6,scale:[.7,1]},{kind:'oil-palm',count:12,z:[-14,-8],y:-2.4,scale:[.8,1.1],sway:.03},{kind:'banana',count:10,z:[-8,-5],y:-2.2,sway:.04}],
 flocks:[{count:3,y:18,z:-24,color:'#2a2a2a',wing:'#f2f2f2',size:1.2,glide:true,name:'hornbills'}],
 drift:{kind:'mist',count:14,colors:['#eef4ee'],y:[-2,3],z:[-12,-2],fall:-.01,sway:2,size:2.6,name:'river-mist'},
 creature:{name:'forest-beetle',height:.6,shell:'#2a6a4a',belly:'#a8c070',foot:'#1a2a1a',crest:'horn',accent:'#e8c040'},
 crate:{body:'wood',color:'#1eb53a',trim:'#0072c6',glyph:'#ffffff'},
 checkpoint:{pole:'#5a4028',cloth:'#1eb53a',accent:'#ffffff',cap:'#0072c6'},
 finishArch:{style:'jungle',stone:'#5a4028',trim:'#2f5a2a'},
 landmarks(api){
  const {finish,low,features}=api,r=random(11);
  const river=api.group('moa-river');built(river,'rapids',b=>{for(let i=0;i<(low?12:26);i++)b.add(new T.DodecahedronGeometry(.6+r()*1.2,0),'#6a6a5e',[r()*finish,-2.6,-5-r()*14],[0,r()*3,0],[1.3,.5,1]);},3);
  createShoreFoam(features,Array.from({length:low?10:22},()=>({x:r()*finish,y:-2.5,z:-5-r()*10,size:.9+r()})),low);
  const boulders=api.group('river-boulders');built(boulders,'granite-domes',b=>{for(let i=0;i<8;i++)b.add(new T.SphereGeometry(2+r()*2,12,8),'#7a7a6e',[r()*finish,-3,-16-r()*8],[0,0,0],[1.4,.6,1]);},4);
  const logs=api.group('drifting-logs'),drifting=new T.Group();drifting.name='downstream-logs';logs.add(drifting);
  built(drifting,'floating-logs',b=>{for(let i=0;i<5;i++)b.add(new T.CylinderGeometry(.3,.35,4+r()*2,10).rotateZ(Math.PI/2),'#5a4430',[i*18,-2.55,-8-r()*6],[0,r()-.5,0]);},5);
  api.animate({update:t=>{drifting.position.x=-((t*.6)%90);},motion:true,setVisible:v=>{drifting.visible=v;}});
  const tiwai=api.group('tiwai-rainforest'),isl=api.platform('sl-island');
  plantAfrica(tiwai,'forest-giant',[{x:isl.x+2,y:isl.y,z:-4.4,scale:.8},{x:isl.x+7,y:isl.y,z:-6,scale:1},{x:isl.x+11,y:isl.y,z:-5,scale:.7}],{low,name:'island-giants'});
  built(tiwai,'colobus-troop',b=>{for(let i=0;i<4;i++){const x=isl.x+1+i*2.6,y=isl.y+10+r()*3;b.add(new T.SphereGeometry(.3,8,6),'#1a1a1a',[x,y,-5]).add(new T.SphereGeometry(.2,8,6),'#f2f2f2',[x+.25,y+.3,-5]);b.strut(v3(x-.2,y,-5),v3(x-.6,y-1.2,-5),.05,'#f2f2f2',4);}},6);
  const camp=api.group('research-camp'),c=api.platform('sl-camp');
  built(camp,'camp-huts',b=>{for(let i=0;i<3;i++){const x=c.x+2+i*3.4;b.add(new T.BoxGeometry(2.4,1.8,2),'#8a6a48',[x,c.y+.9,-4.4]);const roof=new T.CylinderGeometry(.01,1.8,1.2,4,1);roof.rotateY(Math.PI/4);b.add(roof,'#9a9a8a',[x,c.y+2.4,-4.4],[0,0,0],[1,1,.85]);}b.add(new T.BoxGeometry(1,1.6,.06),'#2f5a8a',[c.x+12,c.y+1.6,-3.2]);},7);
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='drifting-log'){built(root,'drift-log',b=>{b.add(new T.CylinderGeometry(.48,.52,w+.4,12).rotateZ(Math.PI/2),'#5a4430',[0,-.48,0],[0,0,0],[1,1,1.4],.06);b.add(new T.CylinderGeometry(.08,.1,1,5),'#4a3828',[w/2-.2,-.2,-.7],[.6,0,0]);for(let i=0;i<3;i++)b.add(new T.SphereGeometry(.15,6,4),'#4f7a3a',[-w/2+.6+i*.9,.02,-.55],[0,0,0],[1,.4,1]);},api.seed);return true;}
  if(style==='rapids-shelf'){const d=api.landmass(root,definition,'default','shelf',1.2);built(d,'white-water',b=>{b.add(new T.BoxGeometry(w,.04,2.2),'#a8b0a0',[0,.025,0]);for(let i=0;i<8;i++)b.add(new T.BoxGeometry(.5+((i*7)%3)*.2,.03,.25),'#f4f6f0',[-w/2+.4+i*(w-.8)/7,.05,(i%3-1)*.6]);},api.seed);return true;}
  return false;
 },
});
