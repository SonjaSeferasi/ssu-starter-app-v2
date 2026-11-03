import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {plantAfrica} from './flora';
import {createHerd} from '../../kit/animals';
import {random,v3,type Builder} from '../../kit/common';

/** Kenya — Maasai Mara: The Great Migration. Endless golden grass under a
 * huge sky, umbrella acacias, the Oloololo escarpment, a brown river with
 * steep cut banks, wildebeest pouring across, and balloons at dawn. */
const earthRed=earth('#b49a5a','#9a6a40','#5a3a22',{set:'savanna-rock',tint:'#f0d6b0',repeat:.5},{rough:.12});
const river=earth('#a89068','#8a6a48','#4a3624',{set:'savanna-rock',tint:'#e8d8c0',repeat:.5});
/** A wildebeest: dark barrel body, high shoulders, beard and curved horns. */
export function wildebeestFigure(b:Builder,x:number,y:number,z:number,s=1){
 b.add(new T.SphereGeometry(.6*s,10,8),'#4a4440',[x,y+1.2*s,z],[0,0,-.12],[1.4,.8,.7]);b.add(new T.SphereGeometry(.3*s,8,6),'#3a3430',[x+.85*s,y+1.25*s,z],[0,0,-.6],[1.4,.8,.8]);
 for(const sz of [-1,1])b.add(new T.TorusGeometry(.14*s,.03*s,4,8,Math.PI),'#d8d0c0',[x+.8*s,y+1.55*s,z+sz*.12*s],[0,0,sz*.4]);
 b.add(new T.BoxGeometry(.06*s,.3*s,.12*s),'#e8e2d6',[x+.95*s,y+.95*s,z]);for(const [lx,lz] of [[-.5,-.2],[-.5,.2],[.45,-.2],[.45,.2]])b.strut(v3(x+lx*s,y+.9*s,z+lz*s),v3(x+lx*s,y,z+lz*s),.05*s,'#3a3430',4);
}
export const environment=africaEnvironment({
 code:'KEN',id:'africa-ke',name:'kenya-maasai-mara-environment',
 representation:'A fictional crossing inspired by the Mara River during the migration. Riding the herd and the balloon basket are game devices; animals are never to be approached.',
 lighting:{background:'#e8d6b4',exposure:1.05,sun:'#ffd8a0',sunIntensity:3.1,sky:'#f4e6cc',ground:'#5a3a22',hemisphere:1.2,rim:'#ffc890',rimIntensity:.65,pixelRatio:1.25,reflections:{zenith:'#7aa4cc',horizon:'#f2dcb8',ground:'#5a3a22',intensity:.3}},
 sky:{zenith:'#6a9ed0',horizon:'#f4dcb4',band:'#eed6b2',glow:'#ffe4b4',sun:[-.75,.25,-.55],glowPower:9},
 fog:['#efdcbc',60,220],clouds:{opacity:.85,high:[24,36],groups:16,flat:.5},
 layers:['banks-herd-and-balloon','mara-river-crossing','wildebeest-herd','acacia-savanna','mara-escarpment','sky'],
 backdrop:[{kind:'range',name:'mara-escarpment',z:-150,y:-6,height:18,peaks:3,rock:'#7a6a50',forest:'#5a6a3a',grass:'#a89a5a',treeLine:8,sharpness:.6,depth:50},{kind:'hills',name:'golden-plains',z:-70,y:-4,height:4,colors:['#b8a060','#c8b070','#d8c080']}],
 floor:{kind:'water',y:-3.6,shallow:'#9a7e58',deep:'#5a4630',name:'mara-river',opacity:.96},
 palettes:{default:earthRed,'river-bank':river,'river-shallows':river,'sandbar':earth('#d8c094','#b89a6a','#7a6040',{set:'sandstone-cliff',tint:'#f6e6c8',repeat:.4}),'bank-rock':earth('#8a7a5a','#6a5a44','#3a3024',{set:'savanna-rock',tint:'#e0d0b8',repeat:.5})},
 deck:{wood:'#6b4b2e',woodAlt:'#7d5a38',rope:'#c9b07a',stone:'#9a6a40',stoneAlt:'#5a3a22',metal:'#4a4a4a',accent:'#bb0000'},
 decks:{'balloon-basket':'lift'},
 capFlora:{default:'savanna-grass','sandbar':null,'bank-rock':null,'river-shallows':null},
 flora:[{kind:'umbrella-acacia',count:14,z:[-34,-14],y:-1,scale:[.9,1.3]},{kind:'savanna-grass',count:50,z:[-12,-5],y:-1,scale:[1.2,1.8],sway:.06}],
 herds:[{kind:'zebra',count:5,x:20,z:-26,y:-1,scale:.9,range:10,speed:.5},{kind:'giraffe',count:2,x:70,z:-34,y:-1,scale:1.1,range:6,speed:.3}],
 flocks:[{count:5,y:20,z:-26,color:'#2a2420',wing:'#6a5a4a',size:1.2,glide:true,name:'vultures'}],
 creature:{name:'nile-crocodile',height:.55,shell:'#4a5a3a',belly:'#a8a87a',foot:'#2a3a22',crest:'spines',accent:'#3a4a2a'},
 crate:{body:'wood',color:'#bb0000',trim:'#006600',glyph:'#ffffff'},
 checkpoint:{pole:'#6b4b2e',cloth:'#bb0000',accent:'#ffffff',cap:'#006600'},
 finishArch:{style:'timber',stone:'#8a6a48',trim:'#5a3a22'},
 landmarks(api){
  const {finish,low}=api,r=random(1000);
  const crossing=api.group('mara-river-crossing');built(crossing,'cut-banks',b=>{for(let i=0;i<8;i++)b.add(new T.BoxGeometry(8,4,4),'#8a6a48',[r()*finish,-2,-10-r()*3],[0,r()*.4,0],[1,1,1],.08);},2);
  const herd=api.group('wildebeest-herd'),stream=new T.Group();stream.name='crossing-stream';herd.add(stream);
  built(stream,'crossing-wildebeest',b=>{for(let i=0;i<(low?14:32);i++)wildebeestFigure(b,i*1.6+r(),-3.5+r()*.2,-6-r()*6,.9);},3);
  api.animate({update:t=>{stream.position.x=((t*1.4)%40)-10;},motion:true,setVisible:v=>{stream.visible=v;}});
  built(herd,'plains-herd',b=>{for(let i=0;i<(low?20:44);i++)wildebeestFigure(b,r()*finish,-1,-16-r()*14,.8);},4);
  const balloons=api.group('hot-air-balloons');built(balloons,'dawn-balloons',b=>{for(const [x,y,z,c] of [[finish*.3,18,-40,'#e2a23a'],[finish*.55,24,-60,'#c8323a'],[finish*.8,16,-34,'#2f6a9a']] as const){b.add(new T.SphereGeometry(3,16,12),c,[x,y,z],[0,0,0],[1,1.25,1]);b.add(new T.ConeGeometry(1.4,2,12).rotateX(Math.PI),c,[x,y-4.2,z]);b.add(new T.BoxGeometry(1,.8,1),'#6b4b2e',[x,y-5.8,z]);}},5);
  const savanna=api.group('acacia-savanna');plantAfrica(savanna,'umbrella-acacia',[{x:-2,y:0,z:-4,scale:1.2},{x:finish-4,y:2.4,z:-5,scale:1.3}],{low,name:'route-acacias'});
  const zebras=createHerd(savanna,'antelope',{count:low?3:6,x:finish*.6,y:-1,z:-20,spread:2.4,scale:.9,range:8,speed:.6,seed:5});api.animate({update:t=>zebras.update(t),motion:true,setVisible:v=>{for(const a of zebras.animals)a.root.visible=v;}});
 },
 dress(root,definition,_context,api){
  if(definition.style==='wildebeest'){built(root,'carrying-wildebeest',b=>{wildebeestFigure(b,-.1,-1.25,0,1.15);b.add(new T.BoxGeometry(definition.width,.1,1.2),'#4a4440',[0,-.05,0]);},api.seed);return true;}
  if(definition.style==='balloon-basket'){built(root,'balloon-basket',b=>{b.add(new T.BoxGeometry(definition.width,.6,2.2),'#7a5a38',[0,-.3,0]);for(const sx of [-1,1])for(const sz of [-1,1])b.strut(v3(sx*(definition.width/2-.1),0,sz),v3(sx*.8,4,sz*.6),.03,'#c9b07a',4);b.add(new T.SphereGeometry(2.6,14,10),'#e2a23a',[0,6.2,-.4],[0,0,0],[1,1.2,1]);for(let i=0;i<8;i++)b.add(new T.BoxGeometry(.06,5.6,.06),'#c8323a',[Math.cos(i*.8)*2.5,6.2,Math.sin(i*.8)*2.5-.4]);},api.seed);return true;}
  return false;
 },
});
