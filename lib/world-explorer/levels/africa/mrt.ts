import {africaLevel,platform,ledge} from './common';

// The ore wagons of one train share a phase, so they roll together and the
// gaps between them stay fixed while the whole train moves.
const wagon=(id:string,x:number,y:number,amplitude:number,period:number)=>platform(id,x,y,4,{type:'moving',motion:'horizontal',amplitude,period,pause:1.2,terrain:'mechanical',thickness:.5,style:'ore-wagon'});
/** Mauritania — Iron Ore Train: Across the Sahara. Tier 3 (Challenger).
 * Up the loading ramp at the mine, onto a rolling train of open ore wagons
 * (hop between them as the train rolls), off at a signal platform, across a
 * windswept line of dunes where warned gusts blow off the sand sea, to the
 * depot, onto a second train and off at the port. A spilled ore heap
 * beside the signal platform holds a star. */
export const level=africaLevel('MRT',{
 design:{archetype:'moving-train-and-dune-crossing',signatureMechanic:'hop-between-rolling-ore-wagons',mechanics:['rolling-ore-train','wagon-to-wagon-hops','sand-sea-gusts','dune-hump-hops','second-train'],terrain:['ground','slope','rooftop','mechanical','sand'],verticality:'low',enemyProfile:'none',targetDurationSeconds:62,seed:2026420},
 environment:{biome:'saharan-sand-sea',locationReference:'The Mauritania Railway between Zouérat and Nouadhibou',terrainMaterial:'iron-red-ore-and-sand',vegetationPack:'sparse-desert-scrub',architecturePack:'railway-and-ore-loader',landmarkAssets:['iron-ore-train','richat-structure','ore-loader','saharan-railway','sand-sea'],lightingPreset:'harsh-desert-sun',skyPreset:'pale-desert-sky',weatherPreset:'blowing-sand'},
 sections:[{id:'A',label:'Mine station',x:0},{id:'B',label:'Ore loader',x:8},{id:'C',label:'First train',x:19},{id:'D',label:'Signal platform',x:44},{id:'E',label:'Windy dunes',x:54},{id:'F',label:'Depot',x:73},{id:'G',label:'Second train',x:82},{id:'H',label:'Port of Nouadhibou',x:99}],
 platforms:[
  platform('mr-station',-6,0,14,{style:'mine-station'}),
  platform('mr-ramp',8,0,5,{terrain:'slope',slope:1.2,style:'loading-ramp'}),
  platform('mr-loader',13,1.2,6,{terrain:'rooftop',thickness:.8,style:'ore-loader'}),
  wagon('mr-wagon-1',21.4,1.6,2.4,8),
  wagon('mr-wagon-2',28.6,1.6,2.4,8),
  wagon('mr-wagon-3',35.8,1.6,2.4,8),
  platform('mr-signal',44.6,1.6,7,{terrain:'rooftop',thickness:.8,style:'signal-platform'}),
  platform('mr-dune-1',54.6,1.6,3,{terrain:'sand',style:'dune-hump'}),
  platform('mr-dune-2',60.8,2,3,{terrain:'sand',style:'dune-hump'}),
  platform('mr-dune-3',67.2,2.2,3,{terrain:'sand',style:'dune-hump'}),
  platform('mr-depot',73.6,2.2,8,{style:'depot'}),
  wagon('mr-wagon-4',84.2,2.4,2.2,7.5),
  wagon('mr-wagon-5',91.2,2.4,2.2,7.5),
  platform('mr-port',99.8,2.4,13,{style:'port-quay'}),
  ledge('mr-ore-heap',52,.4,1.6,{style:'ore-heap'}),
 ],
 spawn:['mr-station',4],finish:['mr-port',11],discovery:['mr-port',8],checkpoints:[['mr-signal',1.2],['mr-depot',1.2]],
 zones:[{id:'mr-sand-gust',type:'wind',x:52,width:21,bottom:0,top:10,force:-1.9,period:7,warning:1.8,duration:2,phase:0}],
 discoveryBlocks:[{id:'mr-discovery-block',x:77,y:5.25,width:.75,height:.8,factId:'mr-discovery'}],
 stars:[['mr-ore-heap',.8,2],['mr-wagon-2',2,2.2],['mr-dune-3',1.5,2.3]],
 edges:[
  ['mr-station','mr-ramp','WALK'],['mr-ramp','mr-loader','WALK'],['mr-loader','mr-wagon-1','RIDE_PLATFORM'],['mr-wagon-1','mr-wagon-2','JUMP'],['mr-wagon-2','mr-wagon-3','JUMP'],['mr-wagon-3','mr-signal','JUMP'],
  ['mr-signal','mr-dune-1','JUMP'],['mr-dune-1','mr-dune-2','JUMP'],['mr-dune-2','mr-dune-3','JUMP'],['mr-dune-3','mr-depot','JUMP'],['mr-depot','mr-wagon-4','RIDE_PLATFORM'],['mr-wagon-4','mr-wagon-5','JUMP'],['mr-wagon-5','mr-port','JUMP'],
  ['mr-signal','mr-ore-heap','DROP',false],['mr-ore-heap','mr-dune-1','JUMP',false],
 ],
});
