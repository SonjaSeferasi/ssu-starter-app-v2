import {africaLevel,platform,ledge} from './common';

const mud={collapse:{delay:1.3,respawn:3}};
/** Central African Republic — Dzanga Bai: The Elephant Clearing. Tier 2 (Adventurer).
 * Along a forest boardwalk to the viewing platform, then out across the bai:
 * soft mud patches sink if the player stands still, a young elephant ambles
 * along the mineral-pool rim, a fallen log and a sandbank lead to the far
 * forest edge. A salt lick below the viewing platform holds a star. */
export const level=africaLevel('CAF',{
 design:{archetype:'forest-clearing-mud-crossing',signatureMechanic:'sinking-mud-and-elephant-timing',mechanics:['sinking-mud-patches','elephant-patrol','forest-boardwalk','viewing-platform-stairs','fallen-log'],terrain:['ground','bridge','stairs','rooftop','rock','sand'],verticality:'low',enemyProfile:'moderate',targetDurationSeconds:42,seed:2026432},
 environment:{biome:'congo-basin-rainforest',locationReference:'Dzanga Bai, Dzanga-Sangha Special Reserve, Central African Republic',terrainMaterial:'grey-mineral-mud-and-sand',vegetationPack:'rainforest-wall-and-marantaceae',architecturePack:'timber-viewing-platform',landmarkAssets:['dzanga-bai-clearing','forest-elephants','mineral-pools','viewing-platform','sangha-rainforest'],lightingPreset:'soft-forest-afternoon',skyPreset:'humid-cumulus'},
 sections:[{id:'A',label:'Forest edge',x:0},{id:'B',label:'Boardwalk',x:8},{id:'C',label:'Viewing platform',x:18},{id:'D',label:'Mud patches',x:31},{id:'E',label:'Mineral pools',x:43},{id:'F',label:'Fallen log',x:55},{id:'G',label:'Sandbank',x:67},{id:'H',label:'Far forest',x:85}],
 platforms:[
  platform('cf-forest',-6,0,14,{style:'forest-edge'}),
  platform('cf-boardwalk',8,0,10,{type:'wooden-bridge',terrain:'bridge',sagDepth:.3,style:'forest-boardwalk'}),
  platform('cf-steps',18,0,5,{terrain:'stairs',slope:1.2,steps:4,style:'mirador-steps'}),
  platform('cf-mirador',23,1.2,6,{terrain:'rooftop',thickness:.8,style:'viewing-platform'}),
  platform('cf-mud-1',31.8,.6,3,{terrain:'rock',thickness:.6,style:'mud-patch',...mud}),
  platform('cf-mud-2',37.4,.6,3,{terrain:'rock',thickness:.6,style:'mud-patch',...mud}),
  platform('cf-pools',43,.8,10,{style:'mineral-pool-rim'}),
  platform('cf-mud-3',55.6,1.2,3,{terrain:'rock',thickness:.6,style:'mud-patch',...mud}),
  platform('cf-log',61.2,1.4,4,{terrain:'rock',thickness:.8,style:'fallen-log'}),
  platform('cf-sandbank',67.8,1.4,9,{terrain:'sand',style:'sandbank'}),
  platform('cf-mud-4',79.4,1.8,3,{terrain:'rock',thickness:.6,style:'mud-patch',...mud}),
  platform('cf-far-forest',85,2,13,{style:'forest-edge'}),
  ledge('cf-salt-lick',29.4,-.6,1.6,{style:'salt-lick'}),
 ],
 spawn:['cf-forest',4],finish:['cf-far-forest',11],discovery:['cf-far-forest',8],checkpoints:[['cf-pools',1.2],['cf-sandbank',1.2]],
 enemies:[{id:'cf-young-elephant',platformId:'cf-pools',minOffset:3.2,maxOffset:7.2,speed:.7,turnPause:1,height:1.1}],
 discoveryBlocks:[{id:'cf-discovery-block',x:26,y:4.45,width:.75,height:.8,factId:'cf-discovery'}],
 stars:[['cf-salt-lick',.8,2],['cf-mirador',3,2.3],['cf-log',2,2.2]],
 edges:[
  ['cf-forest','cf-boardwalk','WALK'],['cf-boardwalk','cf-steps','WALK'],['cf-steps','cf-mirador','WALK'],['cf-mirador','cf-mud-1','JUMP'],['cf-mud-1','cf-mud-2','JUMP'],['cf-mud-2','cf-pools','JUMP'],
  ['cf-pools','cf-mud-3','JUMP'],['cf-mud-3','cf-log','JUMP'],['cf-log','cf-sandbank','JUMP'],['cf-sandbank','cf-mud-4','JUMP'],['cf-mud-4','cf-far-forest','JUMP'],
  ['cf-mirador','cf-salt-lick','DROP',false],['cf-salt-lick','cf-mud-1','JUMP',false],
 ],
});
