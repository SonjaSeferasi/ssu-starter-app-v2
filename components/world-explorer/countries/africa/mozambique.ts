import * as T from 'three';
import {africaEnvironment,built,earth,createShoreFoam} from './environment';
import {boat,lighthouse} from './architecture';
import {plantGrove} from '../../kit/vegetation';
import {random} from '../../kit/common';

/** Mozambique — Bazaruto Archipelago: Dunes and Dhows. Towering white sand
 * dunes drop into turquoise channels; wooden dhows with patched triangular
 * sails cross between sandbars; seagrass meadows show as dark green beneath
 * the clear water, and an old lighthouse stands on the island hill. */
const dune=earth('#f4ead4','#e4d4b0','#b8a47c',{set:'sandstone-cliff',tint:'#ffffff',repeat:.35},{rough:.04});
const reef=earth('#c8b898','#a8987a','#6a5e4a',{set:'coastal-rock',tint:'#f4ead8',repeat:.5});
export const environment=africaEnvironment({
 code:'MOZ',id:'africa-mz',name:'mozambique-bazaruto-environment',
 representation:'A fictional island crossing inspired by the Bazaruto Archipelago. Dhows, waves and sandbars are game devices; the lighthouse is a simplified study.',
 lighting:{background:'#a8e0f0',exposure:1.08,sun:'#fff6e4',sunIntensity:3.4,sky:'#eefaff',ground:'#b8a47c',hemisphere:1.4,rim:'#e8faff',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#2a94dc',horizon:'#e4f6fa',ground:'#b8a47c',intensity:.45}},
 sky:{zenith:'#2a90dc',horizon:'#e6f6fa',band:'#c6eaf4',glow:'#fffaec',sun:[.5,.6,-.6],glowPower:20},
 fog:['#d4f0f6',60,230],clouds:{opacity:.65,high:[24,34],groups:10},
 layers:['sandbars-dhows-and-dunes','island-lighthouse','bazaruto-dunes','turquoise-channels','indian-ocean','sky'],
 backdrop:[{kind:'sea',name:'turquoise-channels',y:-1.4,z:-70,depth:200,shallow:'#3ad0d0',deep:'#1a6ab0',foam:true},{kind:'dunes',name:'bazaruto-dunes',z:-120,y:-3,height:22,colors:['#e4d4b0','#f0e2c4','#faf2e0'],crests:4,depth:60}],
 floor:{kind:'water',y:-1.4,shallow:'#5ae0d8',deep:'#2a90b8',name:'channel-shallows',opacity:.8},
 palettes:{default:dune,'coral-head':reef,'seagrass-shelf':earth('#5a7a4a','#c8b898','#6a5e4a',{set:'coastal-rock',tint:'#e8f0dc',repeat:.5})},
 deck:{wood:'#6b4b2e',woodAlt:'#8a6a42',rope:'#c9b07a',stone:'#e4d4b0',stoneAlt:'#c8b898',metal:'#4a4a4a',accent:'#d21034'},
 capFlora:{default:null,'palm-lodge':'savanna-grass','lighthouse-hill':'savanna-grass','island-beach':null},
 flocks:[{count:10,y:10,z:-20,color:'#f4f4f0',wing:'#c8c8c4',size:.55,glide:true,name:'terns'}],
 hazardPalette:{column:'#f4ffff',base:'#c8b898',warning:'#ffe28a',debris:'#ffffff'},
 creature:{name:'ghost-crab',height:.5,shell:'#e8dcc0',belly:'#f4ece0',foot:'#c8b898',crest:'antennae',accent:'#e8dcc0'},
 crate:{body:'wood',color:'#8a6a42',trim:'#d21034',glyph:'#fce100'},
 checkpoint:{pole:'#5a4028',cloth:'#007168',accent:'#fce100',cap:'#d21034'},
 finishArch:{style:'harbor',stone:'#c8b898',trim:'#007168'},
 landmarks(api){
  const {finish,low,features}=api,r=random(258),lh=api.platform('mz-lighthouse');
  const light=api.group('island-lighthouse');built(light,'old-lighthouse',b=>{lighthouse(b,[lh.x+8,lh.y,-5],11,['#f4f2ea','#c8323a']);b.add(new T.BoxGeometry(3,2,2.4),'#f2ece0',[lh.x+4.8,lh.y+1,-5]);},3);
  const dhows=api.group('sailing-dhows'),fleet=new T.Group();fleet.name='dhow-fleet';dhows.add(fleet);
  built(fleet,'dhows',b=>{for(let i=0;i<(low?3:5);i++)boat(b,[i*16+r()*4,-1.3,-12-r()*14],5+r()*1.4,{hull:'#6b4b2e',trim:'#3a2a1a',sail:['#f2ead8','#e8dcc0','#f4ecdc'][i%3]},r()*.3);},4);
  api.animate({update:t=>{fleet.position.x=-20+((t*.6)%(finish+40));},motion:true,setVisible:v=>{fleet.visible=v;}});
  const grass=api.group('seagrass-shallows');built(grass,'seagrass-meadows',b=>{for(let i=0;i<(low?12:26);i++)b.add(new T.CylinderGeometry(1.4+r()*2,1.4+r()*2,.04,10),'#2a6a4a',[r()*finish,-1.9,-4-r()*12],[0,0,0],[1.6,1,1]);},5);
  createShoreFoam(features,Array.from({length:low?10:24},(_,i)=>({x:i*finish/24,y:-1.35,z:-3.2+(i%2)*.6,size:1.3})),low);
  plantGrove(features,'coconut-palm',Array.from({length:low?4:9},()=>({x:-8+r()*(finish+12),y:-1,z:-14-r()*8,scale:.9+r()*.3})),{low,name:'island-palms'});
 },
 dress(root,definition,_context,api){
  if(definition.style==='sailing-dhow'){built(root,'ride-dhow',b=>{boat(b,[0,-.9,0],definition.width+1.2,{hull:'#6b4b2e',trim:'#3a2a1a',sail:'#f2ead8'});b.add(new T.BoxGeometry(definition.width,.14,1.4),'#8a6a42',[0,-.07,0]);},api.seed);return true;}
  return false;
 },
});
