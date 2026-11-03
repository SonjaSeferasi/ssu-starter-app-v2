import {africaLevel,platform,ledge} from './common';

const dune=(id:string,x:number,y:number,width:number,slope:number)=>platform(id,x,y,width,{terrain:'sand',slope,current:-1.2,style:'dune-face'});
const tree=(id:string,x:number,y:number)=>platform(id,x,y,2.6,{terrain:'rock',thickness:.6,style:'deadvlei-tree'});
/** Namibia — Sossusvlei: Dunes of the Namib. Tier 3 (Challenger).
 * Up the sliding face of a red star dune, along crests that give way under
 * your feet, over the summit and down the slipface into Deadvlei, where the
 * blackened camel thorn trees stand on white clay; hop the dead trees past
 * a grazing oryx and climb a last dune to the lookout. A wind scoop under
 * the first crest holds a star. */
export const level=africaLevel('NAM',{
 design:{archetype:'red-dune-ascent-and-clay-pan-descent',signatureMechanic:'sliding-dune-crests-and-deadvlei-tree-hops',mechanics:['sliding-dune-faces','crumbling-crests','slipface-descent','deadvlei-tree-hops','oryx-on-the-pan'],terrain:['ground','sand','rock'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:52,seed:2026461},
 environment:{biome:'namib-sand-sea',locationReference:'Sossusvlei and Deadvlei, Namib-Naukluft National Park, Namibia',terrainMaterial:'red-iron-oxide-sand-and-white-clay',vegetationPack:'dead-camel-thorn-and-nara',architecturePack:'desert-camp',landmarkAssets:['red-star-dunes','deadvlei-trees','namib-sand-sea','oryx','white-clay-pan'],lightingPreset:'low-desert-morning',skyPreset:'namib-deep-blue'},
 sections:[{id:'A',label:'Desert camp',x:0},{id:'B',label:'Dune face',x:8},{id:'C',label:'Crests',x:16},{id:'D',label:'Summit',x:35},{id:'E',label:'Slipface',x:41},{id:'F',label:'Clay pan',x:49},{id:'G',label:'Dead trees',x:60},{id:'H',label:'Dune lookout',x:84}],
 platforms:[
  platform('nm-camp',-6,0,14,{terrain:'sand',style:'desert-camp'}),
  dune('nm-dune-1',8,0,8,2),
  platform('nm-crest-1',16,2,4,{terrain:'sand',style:'dune-crest'}),
  platform('nm-crest-2',23,2,4,{terrain:'sand',thickness:.8,style:'crumbling-crest',collapse:{delay:.9,respawn:3}}),
  dune('nm-dune-2',27,2,8,2.4),
  platform('nm-summit',35,4.4,6,{terrain:'sand',style:'big-daddy-summit'}),
  platform('nm-slipface',41,4.4,8,{terrain:'sand',slope:-3.6,style:'slipface'}),
  platform('nm-pan',49,.8,8,{terrain:'salt-flat',style:'white-clay-pan'}),
  tree('nm-tree-1',60.2,1.2),
  tree('nm-tree-2',66,1.6),
  tree('nm-tree-3',71.8,2),
  platform('nm-vlei-rim',77.6,2.4,6,{terrain:'sand',style:'vlei-rim'}),
  dune('nm-dune-3',83.6,2.4,6,1.8),
  platform('nm-lookout',89.6,4.2,13,{terrain:'sand',style:'dune-lookout'}),
  ledge('nm-wind-scoop',20.3,.9,1.6,{terrain:'sand',style:'wind-scoop'}),
 ],
 spawn:['nm-camp',4],finish:['nm-lookout',11],discovery:['nm-lookout',8],checkpoints:[['nm-summit',1.2],['nm-vlei-rim',1.2]],
 enemies:[{id:'nm-oryx',platformId:'nm-pan',minOffset:3.6,maxOffset:5.8,speed:.8,turnPause:1,height:1}],
 discoveryBlocks:[{id:'nm-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'nm-discovery'}],
 stars:[['nm-wind-scoop',.9,2],['nm-summit',3,2.3],['nm-tree-3',1.3,2.2]],
 edges:[
  ['nm-camp','nm-dune-1','WALK'],['nm-dune-1','nm-crest-1','WALK'],['nm-crest-1','nm-crest-2','JUMP'],['nm-crest-2','nm-dune-2','WALK'],['nm-dune-2','nm-summit','WALK'],['nm-summit','nm-slipface','WALK'],['nm-slipface','nm-pan','WALK'],
  ['nm-pan','nm-tree-1','JUMP'],['nm-tree-1','nm-tree-2','JUMP'],['nm-tree-2','nm-tree-3','JUMP'],['nm-tree-3','nm-vlei-rim','JUMP'],['nm-vlei-rim','nm-dune-3','WALK'],['nm-dune-3','nm-lookout','WALK'],
  ['nm-crest-1','nm-wind-scoop','DROP',false],['nm-wind-scoop','nm-crest-2','JUMP',false],
 ],
});
