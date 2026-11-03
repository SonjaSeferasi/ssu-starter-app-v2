import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {createWaterfall} from '../../kit/water';
import {createDrift} from '../../kit/particles';
import {plantGrove} from '../../kit/vegetation';
import {random,valueNoise} from '../../kit/common';

/** Mauritius — Chamarel: The Seven Coloured Earths. Dunes of volcanic
 * earth banded red, brown, violet, blue, green, purple and yellow; nearby,
 * Chamarel Falls drops 100 metres into a green gorge; green sugar cane
 * rolls down to the sea, and Le Morne Brabant rises above the lagoon. */
const bands=['#b8442e','#8a4a2a','#7a4a6a','#5a5a8a','#5a7a4a','#6a3a5a','#c8a040'];
const ochre=earth('#a8583a','#8a4a2e','#4a2a1e',{set:'sandstone-cliff',tint:'#f0c8b0',repeat:.4},{rough:.1});
const basalt=earth('#5a6a3a','#4a4a42','#2a2a26',{set:'mossy-rock',tint:'#d8e0c8',repeat:.5});
const cane=earth('#8aaa42','#6a5a3a','#3a3020',{set:'savanna-rock',tint:'#e6ecc4',repeat:.5});
export const environment=africaEnvironment({
 code:'MUS',id:'africa-mu',name:'mauritius-chamarel-environment',
 representation:'A fictional route inspired by Chamarel and Le Morne. The coloured earths are protected and fenced in reality; the route crosses studies of them as a game device.',
 lighting:{background:'#bce0ea',exposure:1.06,sun:'#fff2d8',sunIntensity:3.2,sky:'#eef8f6',ground:'#2a2a26',hemisphere:1.4,rim:'#ffe8c8',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#3a92d4',horizon:'#e6f2ee',ground:'#2a2a26',intensity:.36}},
 sky:{zenith:'#3a92d4',horizon:'#e8f2ec',band:'#cce4e6',glow:'#fff6e0',sun:[.5,.5,-.6],glowPower:16},
 fog:['#d8eaea',50,200],clouds:{opacity:.8,high:[22,32],groups:12},
 layers:['earths-gorge-and-falls','seven-coloured-earths','chamarel-falls','gorges-forest','le-morne-brabant','sky'],
 backdrop:[{kind:'range',name:'le-morne-brabant',z:-170,y:-6,height:30,peaks:1,rock:'#4a5a4a',forest:'#3a6a3a',grass:'#5a8a4a',treeLine:18,sharpness:.9,depth:50},{kind:'sea',name:'lagoon',y:-4,z:-110,depth:120,shallow:'#4ad0d0',deep:'#1a70b0'},{kind:'forest',name:'gorges-forest',z:[-40,-14],y:-3,flora:['ravenala','forest-giant','oil-palm'],count:50,scale:[.8,1.2]}],
 floor:{kind:'land',y:-4,colors:['#3a5a2a','#4a6a32','#5a7a3a'],name:'gorge-floor',rough:1},
 palettes:{default:basalt,'coloured-earth':ochre,'earths-viewpoint':ochre,'sugar-cane':cane},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#4a4a42',stoneAlt:'#3a3a34',metal:'#4a4a4a',accent:'#ea2839'},
 decks:{'cane-cart':'timber'},
 capFlora:{default:'savanna-grass','coloured-earth':null,'earths-viewpoint':null,'falls-rock':null,'falls-shelf':null,'sugar-cane':'savanna-grass'},
 flocks:[{count:6,y:16,z:-24,color:'#f4f4f0',wing:'#f0f0ea',size:.7,glide:true,name:'tropicbirds'}],
 hazardPalette:{column:'#f4fbff',base:'#4a4a42',warning:'#ffe28a',debris:'#ffffff'},
 creature:{name:'day-gecko',height:.5,shell:'#3aa83a',belly:'#e8e8a0',foot:'#2a6a2a',crest:'frill',accent:'#e83a2a'},
 crate:{body:'wood',color:'#6b4b2e',trim:'#ea2839',glyph:'#ffd500'},
 checkpoint:{pole:'#5a4028',cloth:'#1a206d',accent:'#ffd500',cap:'#00a551'},
 finishArch:{style:'timber',stone:'#4a4a42',trim:'#ea2839'},
 landmarks(api){
  const {finish,low}=api,r=random(480),e=api.platform('mu-earth-1'),fl=api.platform('mu-falls-ledge');
  // The earths: smooth rippled mounds whose bands run through all seven colours.
  const earths=api.group('seven-coloured-earths');built(earths,'banded-dunes',b=>{for(let m=0;m<(low?4:7);m++){const cx=e.x-4+m*4.2,cz=-6-(m%3)*3;for(let k=0;k<7;k++){const g=new T.SphereGeometry(3.4-k*.38,20,10,0,Math.PI*2,0,Math.PI/2),p=g.getAttribute('position');for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)*(.7+valueNoise(p.getX(i),p.getZ(i)+m,7)*.2));g.computeVertexNormals();b.add(g,bands[(k+m)%7],[cx,-1.4+k*.08,cz],[0,r(),0],[1.4,.8,1]);}}},3);
  const falls=api.group('chamarel-falls'),fallA=createWaterfall(falls,{x:fl.x+fl.width/2,top:fl.y+16,z:-12,width:2.6,height:20,seed:2,low,tint:'#eaf6f4'});
  built(falls,'falls-cliff',b=>{b.add(new T.BoxGeometry(14,24,6),'#3a3a34',[fl.x+fl.width/2,fl.y+4,-16],[0,0,0],[1,1,1],.08);for(let i=0;i<10;i++)b.add(new T.SphereGeometry(1+r(),8,6),'#3a6a2a',[fl.x+r()*14-2,fl.y+14+r()*3,-13]);},4,.95);
  const spray=createDrift(falls,{kind:'mist',count:low?10:24,colors:['#f4fbff'],x:[fl.x-2,fl.x+fl.width+2],y:[fl.y-4,fl.y+4],z:[-13,-6],fall:-.3,sway:1,size:1.4,seed:4,name:'falls-mist'});
  api.animate({update:t=>{fallA.update(t);spray.update(t);},setVisible:v=>spray.setVisible(v)});
  const cane=api.group('sugar-cane-fields');built(cane,'cane-rows',b=>{for(let row=0;row<(low?3:6);row++)for(let i=0;i<(low?16:30);i++){const x=-10+i*2.2+row*.6,h=2+r()*.8;b.add(new T.CylinderGeometry(.04,.05,h,4),'#8aaa42',[x,h/2-.2,-10-row*1.6]);b.add(new T.ConeGeometry(.5,.9,5).rotateX(Math.PI),'#6a9a32',[x,h,-10-row*1.6]);}},5);
  plantGrove(cane,'coconut-palm',Array.from({length:low?3:6},()=>({x:finish-30+r()*40,y:-2,z:-16-r()*8,scale:1})),{low,name:'coast-palms'});
 },
});
