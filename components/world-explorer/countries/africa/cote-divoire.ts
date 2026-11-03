import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {pillar} from './architecture';
import {plantGrove} from '../../kit/vegetation';
import {random,v3} from '../../kit/common';

/** Côte d’Ivoire — Yamoussoukro: The Basilica Dome. A vast pale dome on a
 * drum of columns, crowned by a lantern and cross, embraced by two curved
 * colonnades, with a travertine plaza and palm avenues on the savanna. */
const travertine=earth('#ece6d8','#d6cdb8','#9a907c',{set:'limestone',tint:'#fbf6ea',repeat:.7},{capMaps:{set:'paris-stone',tint:'#f6efe0',repeat:1},rough:.03,strata:.5});
const lawn=earth('#7aa04a','#b9ac90','#7a6e58',{set:'limestone',tint:'#efe6d4',repeat:.6});
export const environment=africaEnvironment({
 code:'CIV',id:'africa-ci',name:'cote-divoire-basilica-environment',
 representation:'A fictional course around a simplified study of the Basilica of Our Lady of Peace. The route is placed on capitals, cornices and a bell frame invented for the game; it does not reproduce the building’s real access.',
 lighting:{background:'#c8dcec',exposure:1.05,sun:'#fff4dc',sunIntensity:3.2,sky:'#eef2f2',ground:'#7a6e58',hemisphere:1.35,rim:'#e8f0ff',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#5a96d0',horizon:'#e8eef0',ground:'#7a6e58',intensity:.36}},
 sky:{zenith:'#4f8fd0',horizon:'#eaeeee',band:'#d6e2ea',glow:'#fff6e0',sun:[-.4,.65,-.6],glowPower:18},
 fog:['#e0e8ec',60,220],clouds:{opacity:.8,high:[24,36],groups:14},
 layers:['colonnade-capitals-and-cornices','basilica-dome','colonnade-ring','travertine-plaza','palm-avenue','sky'],
 backdrop:[{kind:'hills',name:'savanna-horizon',z:-150,y:-5,height:5,colors:['#7a9a4a','#8aa85a','#9ab86a'],scale:2}],
 floor:{kind:'land',y:-4,colors:['#7aa04a','#8ab05a','#9abf6a'],name:'basilica-lawns',rough:.4},
 palettes:{default:travertine,'palm-avenue':lawn},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#ece6d8',stoneAlt:'#d6cdb8',metal:'#7a7a7a',accent:'#f77f00'},
 decks:{'dome-lift':'masonry-lift','bell-platform':'swing'},
 capFlora:{default:null},
 flocks:[{count:10,y:20,z:-26,color:'#f4f4f0',wing:'#c8c8c4',size:.5,name:'doves'}],
 creature:{name:'basilica-pigeon',height:.6,shell:'#8a8a9a',belly:'#c8c8d0',foot:'#c86a6a',crest:'crown',accent:'#6a7a8a'},
 crate:{body:'marble',color:'#ece6d8',trim:'#f77f00',glyph:'#009e60'},
 checkpoint:{pole:'#6b4b2e',cloth:'#f77f00',accent:'#ffffff',cap:'#009e60'},
 finishArch:{style:'roman',stone:'#ece6d8',trim:'#9a907c'},
 ropeColor:'#3a3a3a',
 mechanisms:{stone:'#ece6d8',stoneDark:'#9a907c',trim:'#f77f00',glow:'#ffd27a',metal:'#7a7a7a'},
 landmarks(api){
  const {finish,low,features}=api,r=random(1989),ring=api.platform('ci-ring');
  // The basilica: drum of columns, ribbed dome, lantern and cross.
  const dome=api.group('basilica-dome'),cx=ring.x+5,cz=-34;
  built(dome,'dome-and-drum',b=>{b.add(new T.CylinderGeometry(16,17,8,40),'#e6dfd0',[cx,0,cz]);for(let i=0;i<(low?20:36);i++){const a=i/36*Math.PI*2;pillar(b,[cx+Math.cos(a)*15.4,4,cz+Math.sin(a)*15.4],8,.45,'#f2ece0');}b.add(new T.CylinderGeometry(15.6,15.6,1.2,40),'#d6cdb8',[cx,12.6,cz]);b.add(new T.SphereGeometry(15,low?24:40,low?12:20,0,Math.PI*2,0,Math.PI/2),'#cfd6dc',[cx,13.2,cz],[0,0,0],[1,1.05,1]);for(let i=0;i<16;i++){const a=i/16*Math.PI*2;b.add(new T.TorusGeometry(15.05,.18,4,24,Math.PI/2),'#e8ecee',[cx,13.2,cz],[0,-a,Math.PI/2]);}b.add(new T.CylinderGeometry(2,2.2,4,16),'#ece6d8',[cx,30,cz]);b.add(new T.SphereGeometry(2.2,16,8,0,Math.PI*2,0,Math.PI/2),'#d6c08a',[cx,32,cz]);b.add(new T.BoxGeometry(.4,3,.4),'#d6c08a',[cx,35.4,cz]);b.add(new T.BoxGeometry(1.6,.4,.4),'#d6c08a',[cx,36,cz]);b.add(new T.BoxGeometry(36,4,4),'#e6dfd0',[cx,-2,cz+14]);},2,.9);
  // Curved colonnades embracing the plaza.
  const colonnade=api.group('colonnade-ring');
  built(colonnade,'curved-colonnades',b=>{for(const side of [-1,1])for(let i=0;i<(low?12:22);i++){const a=Math.PI*(.5+side*(.12+i*.02)),x=cx+Math.cos(a)*44*side*-1,z=cz+20+Math.sin(a)*14;pillar(b,[x,-4,z-12],9,.5,'#f2ece0');}b.add(new T.TorusGeometry(44,.6,6,48,Math.PI*.9),'#e6dfd0',[cx,5.4,cz+8],[Math.PI/2,0,Math.PI*.05]);},3,.9);
  // The plaza: patterned paving and lamp posts.
  const plaza=api.group('travertine-plaza'),p=api.platform('ci-plaza');
  built(plaza,'plaza-lamps',b=>{for(let i=0;i<5;i++){const x=p.x+1+i*2.4;b.add(new T.CylinderGeometry(.05,.07,3,6),'#3a3a3a',[x,p.y+1.5,-1.6]);b.add(new T.SphereGeometry(.22,8,6),'#fff2c8',[x,p.y+3.1,-1.6]);}},5);
  // The palm avenue that leads in from the town.
  const avenue=api.group('palm-avenue');
  plantGrove(avenue,'coconut-palm',Array.from({length:low?6:14},(_,i)=>({x:-8+i*(finish/13),y:-4,z:i%2?-6:-9,scale:1.2+r()*.2})),{low,name:'royal-palm-rows'});
  // The bell frame: posts and a beam over the swinging platform.
  const frame=api.group('bell-frame'),bell=api.platform('ci-bell');
  built(frame,'bell-gallows',b=>{const x=bell.x+bell.width/2,top=bell.y+4.3;for(const sx of [-3.6,3.6])b.strut(v3(x+sx,-3,-1.4),v3(x+sx*.7,top,-1.4),.18,'#cfc6b2',8);b.add(new T.BoxGeometry(8,.5,.6),'#cfc6b2',[x,top,-1.4]);b.add(new T.CylinderGeometry(.5,.9,1.1,12),'#b08a3a',[x+2.2,top-1,-1.6]);},6);
  void features;
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='column-capital'){built(root,'colonnade-column',b=>{b.add(new T.BoxGeometry(w,.4,2),'#ece6d8',[0,-.2,0]);b.add(new T.CylinderGeometry(.62,.7,.5,14),'#e6dfd0',[0,-.6,0]);b.add(new T.CylinderGeometry(.5,.56,definition.y+4,16),'#f2ece0',[0,-.85-(definition.y+4)/2,0],[0,0,0],[1,1,1],.03);},api.seed);return true;}
  if(style==='dome-ring'||style==='cornice'||style==='bell-gallery'){built(root,style,b=>{b.add(new T.BoxGeometry(w,.8,2.6),'#e6dfd0',[0,-.4,0]);b.add(new T.BoxGeometry(w+.2,.12,2.7),'#d6cdb8',[0,-.06,0]);for(let x=-w/2+.4;x<w/2;x+=.8)b.add(new T.BoxGeometry(.18,.25,.3),'#cfc6b2',[x,-.9,1.2]);b.add(new T.BoxGeometry(w,6,2),'#ece6d8',[0,-3.8,-.2],[0,0,0],[1,1,1],.03);},api.seed);return true;}
  return false;
 },
});
