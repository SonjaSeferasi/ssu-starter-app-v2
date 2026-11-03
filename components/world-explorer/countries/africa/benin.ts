import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {boat,stiltHouse} from './architecture';
import {plantAfrica} from './flora';
import {random,v3} from '../../kit/common';

/** Benin — Ganvié: The Stilt Village. Timber houses on stilts with thatch
 * and tin roofs spread across Lake Nokoué, pirogues everywhere, the
 * brushwood fish parks (acadja) in the shallows and a floating market. */
const shore=earth('#d6c08a','#b49a6a','#7a6440',{set:'sandstone-cliff',tint:'#f6e8cc',repeat:.4},{rough:.06});
export const environment=africaEnvironment({
 code:'BEN',id:'africa-bj',name:'benin-ganvie-environment',
 representation:'A fictional course through a stilt village inspired by Ganvié. Homes, school and church are generic studies; pirogue rides and sagging fences are game devices.',
 lighting:{background:'#c6dce4',exposure:1.05,sun:'#fff0d4',sunIntensity:3.1,sky:'#eef2ea',ground:'#7a6440',hemisphere:1.35,rim:'#ffe8c8',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#5a9ac8',horizon:'#ecece0',ground:'#7a6440',intensity:.38}},
 sky:{zenith:'#5a96c8',horizon:'#eeeadc',band:'#dfe2d8',glow:'#fff2d8',sun:[-.5,.55,-.65],glowPower:15},
 fog:['#e2e6dc',50,190],clouds:{opacity:.8,high:[22,32],groups:15},
 layers:['stilt-verandas-and-pirogues','ganvie-stilt-houses','floating-market','acadja-fish-parks','lake-nokoue','sky'],
 backdrop:[{kind:'sea',name:'lake-nokoue',y:-2.3,z:-70,depth:130,shallow:'#7aa8a0',deep:'#3a6a6a'},{kind:'forest',name:'far-shore-palms',z:[-110,-90],y:-2,flora:['oil-palm'],count:30,scale:[1.2,1.6]}],
 floor:{kind:'water',y:-2.3,shallow:'#7aaaa0',deep:'#3e6e6c',name:'lagoon-water',opacity:.92},
 palettes:{default:shore,'church-pier':earth('#b8b0a0','#9a8f7c','#5a5448',{set:'coastal-rock',tint:'#e8e4dc',repeat:.5})},
 deck:{wood:'#7a5a38',woodAlt:'#8d6a45',rope:'#c9b07a',stone:'#b49a6a',stoneAlt:'#7a6440',metal:'#8a8a8a',accent:'#e8112d'},
 decks:{'stilt-veranda':'boardwalk','floating-market':'dock','school-jetty':'boardwalk','acadja-fence':'log'},
 capFlora:{default:null,'lagoon-shore':'savanna-grass'},
 flocks:[{count:8,y:10,z:-22,color:'#f4f4f0',wing:'#d8d8d0',size:.6,glide:true,name:'egrets'}],
 creature:{name:'pink-backed-pelican',height:.75,shell:'#e8e2dc',belly:'#f6f2ee',foot:'#e8a060',crest:'leaf',accent:'#e8b070'},
 crate:{body:'wood',color:'#008751',trim:'#fcd116',glyph:'#e8112d'},
 checkpoint:{pole:'#6b4b2e',cloth:'#008751',accent:'#fcd116',cap:'#e8112d'},
 finishArch:{style:'timber',stone:'#7a5a38',trim:'#5a4028'},
 landmarks(api){
  const {finish,low,level}=api,r=random(1717);
  // A whole village of stilt houses across the lake, behind and around the
  // route, with a stilt house behind every veranda the player uses.
  const village=api.group('ganvie-stilt-houses');
  built(village,'stilt-village',b=>{for(let i=0;i<(low?14:30);i++){const x=-10+r()*(finish+20),z=-8-r()*26;stiltHouse(b,[x,-2.3,z],2.4+r()*1.2,2+r()*.8,{wood:'#6b5138',roof:r()<.5?'#b99a5a':'#9aa0a6',wall:r()<.3?'#c86a3a':r()<.5?'#2f7aa8':'#8a6a48'});}for(const p of level.platforms)if(p.style==='stilt-veranda'){stiltHouse(b,[p.x+p.width/2,-2.3,-3.2],p.width*.9,2.2,{wood:'#6b5138',roof:'#b99a5a',wall:'#8a6a48'});}},3,.9);
  const fleet=api.group('pirogues');built(fleet,'lake-pirogues',b=>{for(let i=0;i<(low?8:18);i++)boat(b,[r()*finish,-2.6,-4-r()*20],3.4+r()*1.4,{hull:'#5a4028',trim:'#8a6a48',sail:r()<.15?'#e8e2d0':undefined},r()*.6-.3);},4);
  const market=api.group('floating-market'),m=api.platform('bj-market');
  built(market,'market-boats',b=>{for(let i=0;i<5;i++){const x=m.x+1+i*1.9;boat(b,[x,-2.6,-2.6],2.4,{hull:'#6b4b2e',trim:'#8a6a48'},Math.PI/2);for(let k=0;k<3;k++)b.add(new T.SphereGeometry(.16,6,4),['#e2a23a','#c8323a','#7a9a3a'][(i+k)%3],[x-.3+k*.3,-1.9,-2.6]);}b.add(new T.ConeGeometry(1,.4,8),'#e2a23a',[m.x+4,m.y+2.4,-1.6]);b.add(new T.CylinderGeometry(.04,.04,2.4,5),'#5a4028',[m.x+4,m.y+1.2,-1.6]);},5);
  const parks=api.group('acadja-fish-parks');built(parks,'brushwood-parks',b=>{for(let i=0;i<(low?5:10);i++){const cx=r()*finish,cz=-6-r()*12;for(let k=0;k<24;k++){const a=k/24*Math.PI*2;b.strut(v3(cx+Math.cos(a)*2,-2.8,cz+Math.sin(a)*1.4),v3(cx+Math.cos(a)*2.1,-1.6,cz+Math.sin(a)*1.5),.03,'#7a6440',3);}}},6);
  const end=api.platform('bj-church-pier');built(village,'stilt-church',b=>{b.add(new T.BoxGeometry(4,3,3),'#f2ece0',[end.x+7,end.y+1.5,-6]);b.add(new T.BoxGeometry(1.2,3,1.2),'#f2ece0',[end.x+5,end.y+4.5,-5.2]);b.add(new T.BoxGeometry(.2,1,.2),'#3a3a3a',[end.x+5,end.y+6.5,-5.2]).add(new T.BoxGeometry(.6,.2,.2),'#3a3a3a',[end.x+5,end.y+6.7,-5.2]);},7);
  plantAfrica(village,'oil-palm',[{x:-2,y:0,z:-4,scale:.9},{x:4,y:0,z:-5,scale:1}],{low,name:'shore-palms'});
 },
});
