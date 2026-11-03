import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {boat} from './architecture';
import {plantAfrica} from './flora';
import {random,v3} from '../../kit/common';

/** The Gambia — River Gambia: Baboon Islands. A broad brown river between
 * walls of mangrove, forested islands, borassus palms on the banks, a small
 * river ferry, and chimpanzees on the island shore. */
const mud=earth('#7a7a4a','#6a5a3a','#3e3424',{set:'mossy-rock',tint:'#d8d4b8',repeat:.5},{rough:.12});
const laterite=earth('#8a8a4a','#a8603a','#6a3a22',{set:'savanna-rock',tint:'#f0c8a8',repeat:.5});
export const environment=africaEnvironment({
 code:'GMB',id:'africa-gm',name:'gambia-river-environment',
 representation:'A fictional river trail inspired by River Gambia National Park. The islands are protected and closed to visitors; the boardwalks, ferry and route are game devices.',
 lighting:{background:'#c8dce0',exposure:1.03,sun:'#fff0d0',sunIntensity:2.9,sky:'#e8f0ec',ground:'#3e3424',hemisphere:1.4,rim:'#e8f0d0',rimIntensity:.4,pixelRatio:1.25,reflections:{zenith:'#7aa8c8',horizon:'#e6ecdc',ground:'#3e3424',intensity:.3}},
 sky:{zenith:'#6a9ec8',horizon:'#e8ecdc',band:'#d8e2d8',glow:'#fff4d8',sun:[-.5,.5,-.7],glowPower:14},
 fog:['#dfe6dc',45,180],clouds:{opacity:.75,high:[24,34],groups:14},
 layers:['boardwalks-roots-and-island','baboon-islands','mangrove-forest','river-gambia','far-bank-woodland','sky'],
 backdrop:[{kind:'forest',name:'far-bank-woodland',z:[-70,-46],y:-2.4,flora:['borassus-palm','umbrella-acacia','oil-palm'],count:40,scale:[1,1.4]},{kind:'hills',name:'far-bank',z:-80,y:-4,height:4,colors:['#5a6a3a','#6a7a42','#7a8a4a']}],
 floor:{kind:'water',y:-2.4,shallow:'#8a8a5a',deep:'#4a4a2e',name:'river-gambia',opacity:.95},
 palettes:{default:mud,'lookout':laterite,'river-bank':laterite},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#7a7a4a',stoneAlt:'#6a5a3a',metal:'#4a4a4a',accent:'#3a75c4'},
 decks:{'boardwalk':'boardwalk','river-ferry':'raft'},
 capFlora:{default:'savanna-grass','mangrove-root':null,'fallen-log':null,'oyster-bed':null},
 flora:[{kind:'mangrove',count:26,z:[-10,-4],y:-2.4,scale:[.8,1.2],sway:.02}],
 flocks:[{count:6,y:12,z:-20,color:'#f4f4f0',wing:'#d8d8d0',size:.7,glide:true,name:'herons-and-egrets'}],
 creature:{name:'mudskipper',height:.55,shell:'#6a6a4a',belly:'#c8c0a0',foot:'#4a4a3a',crest:'frill',accent:'#3a75c4'},
 crate:{body:'wood',color:'#6b4b2e',trim:'#3a75c4',glyph:'#ffe39a'},
 checkpoint:{pole:'#6b4b2e',cloth:'#3a75c4',accent:'#ffffff',cap:'#ce1126'},
 finishArch:{style:'jungle',stone:'#6b4b2e',trim:'#3a5a2a'},
 landmarks(api){
  const {finish,low}=api,r=random(1979);
  // The river itself: a wide brown sweep beyond the floor water.
  const river=api.group('river-gambia');built(river,'sandbars',b=>{for(let i=0;i<6;i++)b.add(new T.SphereGeometry(3,10,6),'#c8b48a',[r()*finish,-2.6,-24-r()*14],[0,0,0],[2,.12,.6]);},2);
  // Mangroves: a dense wall of stilt-rooted trees along both banks.
  const mangroves=api.group('mangrove-forest');
  plantAfrica(mangroves,'mangrove',Array.from({length:low?14:34},()=>({x:-8+r()*(finish+16),y:-2.4,z:-12-r()*9,scale:1+r()*.6})),{low,name:'bank-mangroves'});
  // The islands: forested humps in mid-river with chimps on the shore.
  const islands=api.group('baboon-islands');
  built(islands,'island-humps',b=>{for(const [x,s] of [[finish*.3,1],[finish*.62,1.3],[finish*.9,.9]] as const){b.add(new T.SphereGeometry(10*s,14,8,0,Math.PI*2,0,Math.PI/2),'#3f6a2f',[x,-2.6,-34],[0,0,0],[1.6,.5,.7]);for(let k=0;k<3;k++){const cx=x-4+k*3;b.add(new T.SphereGeometry(.35,8,6),'#2a2420',[cx,-1.8,-27.4]).add(new T.SphereGeometry(.22,8,6),'#3a302a',[cx+.3,-1.3,-27.4]);}}},3);
  plantAfrica(islands,'forest-giant',[{x:finish*.3,y:1,z:-36,scale:.7},{x:finish*.62,y:2,z:-37,scale:.8},{x:finish*.9,y:.6,z:-36,scale:.6}],{low,name:'island-giants'});
  // The ferry crossing: a moored ferry and dugouts at the jetty.
  const ferry=api.group('river-ferry'),j=api.platform('gm-jetty');
  built(ferry,'moored-boats',b=>{boat(b,[j.x+3,-2.7,-4.4],5.4,{hull:'#3a75c4',trim:'#f2f2ee'});boat(b,[j.x-6,-2.7,-5],4,{hull:'#6b4b2e',trim:'#c9a24a'},.2);for(let i=0;i<4;i++)b.strut(v3(j.x+i*2,-2.6,-2.4),v3(j.x+i*2,.6,-2.4),.08,'#5a4028',5);},4);
  const palms=api.group('borassus-palms');
  plantAfrica(palms,'borassus-palm',Array.from({length:low?4:9},()=>({x:-8+r()*(finish+16),y:-1,z:-8-r()*6,scale:.8+r()*.3})),{low,name:'bank-borassus'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='mangrove-root'){built(root,'mangrove-root-step',(b,rr)=>{b.add(new T.BoxGeometry(w,.3,1.8),'#4f3a26',[0,-.15,0]);for(let i=0;i<7;i++){const x=-w/2+.3+i*(w-.6)/6;b.strut(v3(x,-.2,(rr()-.5)*1.2),v3(x+(rr()-.5),-3.6,(rr()-.5)*1.6),.07,'#5b4a3a',4);}},api.seed);plantAfrica(root,'mangrove',[{x:0,y:-2.4,z:-1.6,scale:.7}],{low:api.low,name:'root-mangrove'});return true;}
  if(style==='fallen-log'){built(root,'fallen-log',b=>{b.add(new T.CylinderGeometry(.42,.48,w+.6,12).rotateZ(Math.PI/2),'#6b5038',[0,-.42,0],[0,0,0],[1,1,1.6],.06);for(let i=0;i<3;i++)b.add(new T.SphereGeometry(.18,6,4),'#4f7a3a',[-w/2+.5+i,.0,-.6],[0,0,0],[1,.4,1]);b.add(new T.CylinderGeometry(.06,.06,3,5),'#5b4a3a',[w/2-.3,-2,0]);},api.seed);return true;}
  if(style==='oyster-bed'){built(root,'oyster-bed',b=>{b.add(new T.BoxGeometry(w,.4,1.6),'#8a8270',[0,-.2,0]);for(let i=0;i<8;i++)b.add(new T.SphereGeometry(.12,6,4),'#d8d0c0',[-w/2+.2+i*.2,.02,(i%3-1)*.4],[0,0,0],[1.3,.4,1]);},api.seed);return true;}
  return false;
 },
});
