import * as T from 'three';
import {africaEnvironment,built,earth} from './environment';
import {boat} from './architecture';
import {plantAfrica} from './flora';
import {random} from '../../kit/common';

/** Senegal — Lac Rose: The Salt Harvest. A lake of startling pink beside
 * white dunes: conical salt mounds line the shore, salt collectors' pirogues
 * sit low in the water, and baobabs stand on the dune ridge. */
const salt=earth('#f2eee6','#d8d0c4','#a89e90',{set:'limestone',tint:'#ffffff',repeat:.7},{rough:.06});
const dune=earth('#ead2a6','#d6b684','#a88a5a',{set:'sandstone-cliff',tint:'#fff0d8',repeat:.4},{rough:.1});
const brine=earth('#e6c6c8','#c8a4a6','#8a6a6c',{set:'limestone',tint:'#ffe8ea',repeat:.6},{rough:.04});
export const environment=africaEnvironment({
 code:'SEN',id:'africa-sn',name:'senegal-lac-rose-environment',
 representation:'A fictional course around Lake Retba (Lac Rose). Salt mounds and pirogues follow the harvest scene; the current, crust and route are game devices.',
 lighting:{background:'#d8e6f0',exposure:1.07,sun:'#fff2dc',sunIntensity:3.3,sky:'#f2f2ee',ground:'#a88a5a',hemisphere:1.35,rim:'#ffe4d0',rimIntensity:.4,pixelRatio:1.25,reflections:{zenith:'#7ab0d8',horizon:'#f2ecea',ground:'#a88a5a',intensity:.34}},
 sky:{zenith:'#6aa6d8',horizon:'#f2eae6',band:'#e6e0e2',glow:'#fff0e0',sun:[-.6,.5,-.6],glowPower:16},
 fog:['#efe6e6',55,200],clouds:{opacity:.6,high:[26,36],groups:9},
 layers:['salt-shore-and-shallows','salt-mounds','salt-pirogues','pink-lake-water','coastal-dunes','sky'],
 backdrop:[{kind:'dunes',name:'coastal-dunes',z:-110,y:-4,height:12,colors:['#e2c494','#efd6aa','#f8e8c8'],crests:6,depth:60},{kind:'sea',name:'pink-lake-water',y:-2.8,z:-50,depth:70,shallow:'#f2a6b6',deep:'#d46a8a'}],
 floor:{kind:'water',y:-2.8,shallow:'#f4b2c0',deep:'#d87a96',name:'pink-shallows',opacity:.94},
 palettes:{default:dune,'salt-bank':salt,'harvest-bank':salt,'salt-mound':salt,'salt-crust':salt,'brine-shallows':brine,'salt-heap':salt,'salt-baskets':earth('#c8a070','#a8804e','#6e5232',{set:'savanna-rock',tint:'#efdcc0',repeat:.6})},
 deck:{wood:'#5a4028',woodAlt:'#6b4b2e',rope:'#c9b07a',stone:'#f2eee6',stoneAlt:'#d8d0c4',metal:'#5a5a5a',accent:'#00853f'},
 capFlora:{default:'savanna-grass','salt-bank':null,'harvest-bank':null,'salt-mound':null,'salt-crust':null,'brine-shallows':null,'salt-baskets':null,'baobab-roots':null},
 flora:[{kind:'baobab',count:6,z:[-26,-16],y:-1,scale:[.9,1.3]},{kind:'thorn-scrub',count:16,z:[-14,-8],y:-1.6}],
 flocks:[{count:8,y:10,z:-24,color:'#f6f0ee',wing:'#e8a0a8',size:.55,glide:true,name:'flamingos-and-terns'}],
 creature:{name:'sand-crab',height:.5,shell:'#e8c890',belly:'#f6ecd8',foot:'#c8a070',crest:'antennae',accent:'#e8c890'},
 crate:{body:'wood',color:'#00853f',trim:'#fdef42',glyph:'#ffffff'},
 checkpoint:{pole:'#5a4028',cloth:'#00853f',accent:'#fdef42',cap:'#e31b23'},
 finishArch:{style:'timber',stone:'#8a6a48',trim:'#5a4028'},
 landmarks(api){
  const {finish,low}=api,r=random(1359);
  // Conical white salt mounds along the shore, some with collectors' tools.
  const mounds=api.group('salt-mounds');
  built(mounds,'shore-salt-cones',b=>{for(let i=0;i<(low?10:22);i++){const x=-8+r()*(finish+16),z=-6-r()*8,h=1+r()*1.6;b.add(new T.ConeGeometry(h*.9,h,10),r()<.8?'#f4f2ee':'#e8e2da',[x,-1.6+h/2,z],[0,0,0],[1,1,1],.04);}for(let i=0;i<6;i++)b.add(new T.CylinderGeometry(.35,.3,.5,10),'#c8a070',[10+i*14,-1.3,-5.2]);},3,.9);
  // Pirogues of the salt collectors moored and working on the lake.
  const fleet=api.group('salt-pirogues');
  built(fleet,'working-pirogues',b=>{for(let i=0;i<(low?5:10);i++){const x=r()*finish,z=-12-r()*16;boat(b,[x,-3.1,z],4.2+r()*1.4,{hull:['#2f7a5a','#e2a23a','#c1272d','#2f5a8a'][i%4],trim:'#f2e6c8'},r()*.4-.2);for(let k=0;k<3;k++)b.add(new T.ConeGeometry(.35,.4,8),'#f4f2ee',[x-.8+k*.8,-2.4,z]);}},5);
  plantAfrica(mounds,'aloe',Array.from({length:low?3:6},()=>({x:r()*finish,y:-1.6,z:-4-r()*2,scale:.7})),{low,name:'dune-aloes'});
  // Baobabs on the ridge at the finish.
  const ridge=api.group('baobab-trees'),end=api.platform('sn-baobab-hill');
  plantAfrica(ridge,'baobab',[{x:end.x+4,y:end.y,z:-6,scale:1.5},{x:end.x+12,y:end.y,z:-9,scale:1.8},{x:end.x-6,y:1.3,z:-8,scale:1.2}],{low,name:'ridge-baobabs'});
 },
 dress(root,definition,_context,api){
  const style=definition.style,w=definition.width;
  if(style==='salt-pirogue'){built(root,'harvest-pirogue',b=>{boat(b,[0,-.85,0],w+1.4,{hull:'#e2a23a',trim:'#2f7a5a'});b.add(new T.BoxGeometry(w,.12,1),'#8a6a48',[0,-.06,0]);for(let k=0;k<2;k++)b.add(new T.ConeGeometry(.3,.35,8),'#f4f2ee',[-w/2+.4+k*.5,.17,-.7]);},api.seed);return true;}
  if(style==='salt-baskets'){const d=api.landmass(root,definition,'salt-baskets','island',1.2);built(d,'basket-stack',b=>{for(let i=0;i<3;i++)b.add(new T.CylinderGeometry(.42,.34,.55,10),'#c8a070',[-w/2+.6+i*.9,.27,-1.2]).add(new T.ConeGeometry(.38,.3,10),'#f4f2ee',[-w/2+.6+i*.9,.7,-1.2]);},api.seed);return true;}
  if(style==='baobab-roots'){const d=api.landmass(root,definition,'baobab-roots','island',1.6);built(d,'baobab-root-flare',b=>{b.add(new T.CylinderGeometry(1.2,2,3,10),'#9b8a76',[0,-1.8,-1.2]);},api.seed);return true;}
  return false;
 },
});
