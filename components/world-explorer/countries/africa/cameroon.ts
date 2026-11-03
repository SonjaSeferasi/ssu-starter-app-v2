import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {cabinLike} from './shared-props';
import {plantAfrica} from './flora';
import {random,v3,valueNoise} from '../../kit/common';

/** Cameroon — Mount Cameroon: The Race of Hope. A huge volcano rising from
 * the Gulf of Guinea: dense montane forest hung with lianas, black lava
 * gullies, heath and grassland above the trees, a mountain hut, and the
 * grey summit far above the cloud. */
const basalt=earth('#5a5a4a','#4a4640','#26241f',{set:'alpine-rock',tint:'#c8c4b8',repeat:.5},{rough:.22});
const forest=earth('#4f6a32','#5a4a38','#2e2620',{set:'mossy-rock',tint:'#d0d6c0',repeat:.5},{rough:.14});
const heath=earth('#8a8a52','#6a6252','#3a3630',{set:'alpine-rock',tint:'#d8d4c8',repeat:.5});
export const environment=africaEnvironment({
 code:'CMR',id:'africa-cm',name:'cameroon-mount-cameroon-environment',
 representation:'A fictional ascent inspired by the Race of Hope route on Mount Cameroon. Liana swings, rockfall timing and the route are game devices.',
 lighting:{background:'#aec4cc',exposure:1.02,sun:'#fff0d4',sunIntensity:2.9,sky:'#e0eaea',ground:'#26241f',hemisphere:1.4,rim:'#e0f0ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#6a96c0',horizon:'#dce6e6',ground:'#26241f',intensity:.3}},
 sky:{zenith:'#5a8cc4',horizon:'#e2eaea',band:'#ccdcdf',glow:'#fff4dc',sun:[-.5,.55,-.6],glowPower:14},
 fog:['#d4e0e2',40,180],clouds:{opacity:.95,high:[24,34],lowBand:[-6,0],groups:20,shade:'#c8d4d8'},
 layers:['roots-lianas-and-scree','mount-cameroon','montane-cloud-forest','lava-gullies','gulf-of-guinea','sky'],
 backdrop:[{kind:'sea',name:'gulf-of-guinea',y:-14,z:-200,depth:140,shallow:'#4a8aa0',deep:'#1f5a78'},{kind:'range',name:'mount-cameroon',z:-130,y:-10,height:50,peaks:3,rock:'#5a5650',forest:'#3f5a32',grass:'#8a8a52',treeLine:22,sharpness:1,depth:80}],
 floor:{kind:'land',y:-5,colors:['#2e3a24','#3a4a2a','#4a5a32'],name:'forest-floor',rough:1.4},
 palettes:{default:basalt,'farm-terraces':forest,'forest-trail':forest,'buttress-root':forest,'fern-ledge':forest,'mountain-hut':heath,'heath-boulder':heath,'summit-crater':basalt},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#5a6a32',stone:'#5a5a4a',stoneAlt:'#4a4640',metal:'#4a4a4a',accent:'#ce1126'},
 decks:{liana:'swing'},
 capFlora:{default:null,'farm-terraces':'banana','forest-trail':'cocoa-shrub','mountain-hut':'savanna-grass','heath-boulder':'thorn-scrub'},
 flora:[{kind:'forest-giant',count:18,z:[-26,-12],y:-5,scale:[.8,1.1]},{kind:'banana',count:10,z:[-9,-5],y:-5,sway:.04}],
 flocks:[{count:4,y:20,z:-26,color:'#1a1a1a',wing:'#3a3a3a',size:.8,name:'ravens'}],
 drift:{kind:'mist',count:18,colors:['#f2f6f6'],y:[0,8],z:[-10,-2],fall:-.02,sway:2.4,size:2.4,name:'cloud-wisps'},
 ropeColor:'#5a6a32',
 hazardPalette:{column:'#6a6458',base:'#3a3630',warning:'#ffc95c',debris:'#5a5650'},
 creature:{name:'mountain-chameleon',height:.55,shell:'#5a9a4a',belly:'#c8d8a0',foot:'#3a5a2a',crest:'horn',accent:'#e8c040'},
 crate:{body:'wood',color:'#007a5e',trim:'#fcd116',glyph:'#ce1126'},
 checkpoint:{pole:'#4a3a2a',cloth:'#007a5e',accent:'#fcd116',cap:'#ce1126'},
 finishArch:{style:'stone',stone:'#4a4640',trim:'#ce1126'},
 landmarks(api){
  const {finish,low,level}=api,r=random(4040);
  const forest=api.group('montane-cloud-forest');
  plantAfrica(forest,'forest-giant',level.platforms.filter(p=>p.style==='buttress-root'||p.style==='gully-edge').map(p=>({x:p.x+p.width/2,y:p.y-6,z:-3.4,scale:1.1})),{low,name:'route-giants'});
  // Lianas hanging from a high bough over the gully (the swings hang here).
  const lianas=api.group('giant-lianas'),l1=api.platform('cm-liana-1'),l2=api.platform('cm-liana-2');
  built(lianas,'bough-and-lianas',b=>{const top=l1.y+5.6;b.add(new T.CylinderGeometry(.5,.7,l2.x-l1.x+14,10).rotateZ(Math.PI/2),'#6a5a44',[(l1.x+l2.x)/2+.9,top,-1.4]);for(let i=0;i<12;i++){const x=l1.x-4+i*1.6+r(),len=3+r()*4;b.strut(v3(x,top,-1.6-r()*.6),v3(x+(r()-.5),top-len,-1.8-r()*.6),.03,'#4a6a2a',4);}for(const x of [l1.x-6,l2.x+8])b.add(new T.CylinderGeometry(.9,1.4,top+8,12),'#7d725f',[x,top/2-4,-2.4]);},3);
  // Black lava gullies: old flows running down through the forest.
  const gullies=api.group('lava-gullies'),g=api.platform('cm-gully-edge');
  built(gullies,'lava-flow-tongues',b=>{for(let i=0;i<(low?10:22);i++){const x=g.x+4+r()*14,y=-5+r()*2;b.add(new T.DodecahedronGeometry(.6+r()*1,0),'#1e1c1a',[x,y,-3-r()*10],[r()*3,r()*3,0],[1.4,.5,1]);}b.add(new T.BoxGeometry(14,.4,30),'#26241f',[g.x+11,-5,-16]);},4);
  const hut=api.platform('cm-hut');built(api.group('mountain-hut-and-route'),'race-route',b=>{cabinLike(b,[hut.x+5.4,hut.y,-2.6],[3,2,2.4],'#8a6a48','#6a7a8a');for(let i=0;i<8;i++)b.add(new T.CylinderGeometry(.04,.04,.9,5),'#ce1126',[8+i*12,i*.8,-1.4]);},5);
  void valueNoise;void finish;
 },
 dress(root,definition,_context,api){
  if(definition.style==='scree'){const d=api.landmass(root,definition,'default','island',.6);built(d,'loose-scree',(b,rr)=>{for(let i=0;i<6;i++)b.add(new T.DodecahedronGeometry(.15+rr()*.15,0),'#3a3630',[-definition.width/2+.3+rr()*(definition.width-.6),-.3,-1+rr()*.4]);},api.seed);return true;}
  return false;
 },
});
