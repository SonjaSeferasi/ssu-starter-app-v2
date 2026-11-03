import {africaLevel,platform,ledge,hazardStrip} from './common';

const spray=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:1.2,height:2.6,style:'spray',cycle:{period:6.5,warning:1.8,active:1.4,phase}});
/** Zambia — Victoria Falls: The Smoke That Thunders. Tier 4 (Expert Explorer).
 * Along the lip of the falls: on the rock shelves of the Zambezi lip the
 * river pulls the player toward the drop, warned spray bursts over the
 * rocks at Devil's Pool, and the Knife-Edge Bridge is crossed in gusts
 * before the viewpoint. A rock shelf just below the lip holds a star. */
export const level=africaLevel('ZMB',{
 design:{archetype:'lip-of-the-falls-traverse',signatureMechanic:'zambezi-lip-current-and-knife-edge-gusts',mechanics:['lip-current-toward-the-drop','devils-pool-spray','basalt-rock-hops','knife-edge-bridge-gusts'],terrain:['ground','rock','cliff','bridge'],verticality:'low',enemyProfile:'none',targetDurationSeconds:42,seed:2026457},
 environment:{biome:'zambezi-spray-forest',locationReference:'The lip of Victoria Falls and the Knife-Edge Bridge, Livingstone, Zambia',terrainMaterial:'black-basalt',vegetationPack:'rain-forest-in-the-spray',architecturePack:'knife-edge-bridge',landmarkAssets:['victoria-falls-curtain','zambezi-lip','knife-edge-bridge','rainbow-spray','batoka-gorge'],lightingPreset:'bright-spray-light',skyPreset:'blue-with-spray-cloud',weatherPreset:'falls-spray'},
 sections:[{id:'A',label:'Rain forest',x:0},{id:'B',label:'Basalt rocks',x:11},{id:'C',label:'Zambezi lip',x:18},{id:'D',label:'Devil’s Pool',x:36},{id:'E',label:'Second lip',x:45},{id:'F',label:'Spray rocks',x:56},{id:'G',label:'Knife-Edge Bridge',x:63},{id:'H',label:'Viewpoint',x:91}],
 platforms:[
  platform('zm-forest',-6,0,14,{style:'spray-rainforest'}),
  platform('zm-rock-1',11.6,.2,3,{terrain:'rock',thickness:1.2,style:'basalt-rock'}),
  platform('zm-lip-1',18.4,.2,7,{terrain:'rock',thickness:1.2,current:1.4,style:'zambezi-lip'}),
  platform('zm-rock-2',29.2,.4,3,{terrain:'rock',thickness:1.2,style:'basalt-rock'}),
  platform('zm-pool',36,.4,6,{terrain:'cliff',style:'devils-pool-rim'}),
  platform('zm-lip-2',45.8,.6,7,{terrain:'rock',thickness:1.2,current:1.6,style:'zambezi-lip'}),
  platform('zm-rock-3',56.6,.8,3.4,{terrain:'rock',thickness:1.2,style:'basalt-rock'}),
  platform('zm-bridge-head',63.8,1,5,{terrain:'cliff',style:'bridge-head'}),
  platform('zm-knife-edge',68.8,1,12,{type:'wooden-bridge',terrain:'bridge',sagDepth:.3,style:'knife-edge-bridge'}),
  platform('zm-rock-4',84.6,1.2,3,{terrain:'rock',thickness:1.2,style:'basalt-rock'}),
  platform('zm-viewpoint',91.4,1.4,13,{style:'falls-viewpoint'}),
  ledge('zm-shelf',32.6,-.8,1.8,{style:'lip-shelf'}),
 ],
 spawn:['zm-forest',4],finish:['zm-viewpoint',11],discovery:['zm-viewpoint',8],checkpoints:[['zm-pool',1.2],['zm-bridge-head',1.2]],
 hazards:[spray('zm-spray-1',40.4,.4,0),spray('zm-spray-2',58.8,.8,3.2),...hazardStrip('zm-gorge',10,82,-3.4,'river')],
 zones:[{id:'zm-bridge-gust',type:'wind',x:67,width:16,bottom:-1,top:9,force:-2,period:7.5,warning:1.8,duration:2,phase:0}],
 discoveryBlocks:[{id:'zm-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'zm-discovery'}],
 stars:[['zm-shelf',.9,2],['zm-bridge-head',2.5,2.3],['zm-rock-4',1.5,2.2]],
 edges:[
  ['zm-forest','zm-rock-1','JUMP'],['zm-rock-1','zm-lip-1','JUMP'],['zm-lip-1','zm-rock-2','JUMP'],['zm-rock-2','zm-pool','JUMP'],['zm-pool','zm-lip-2','JUMP'],['zm-lip-2','zm-rock-3','JUMP'],['zm-rock-3','zm-bridge-head','JUMP'],
  ['zm-bridge-head','zm-knife-edge','WALK'],['zm-knife-edge','zm-rock-4','JUMP'],['zm-rock-4','zm-viewpoint','JUMP'],
  ['zm-rock-2','zm-shelf','DROP',false],['zm-shelf','zm-pool','JUMP',false],
 ],
});
