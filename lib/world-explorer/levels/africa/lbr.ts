import {africaLevel,platform,ledge,hazardStrip} from './common';

const board=(id:string,x:number,y:number,amplitude:number,period:number)=>platform(id,x,y,2.6,{type:'moving',motion:'horizontal',amplitude,period,pause:.8,bob:.3,terrain:'water-raft',thickness:.3,style:'surfboard'});
const wave=(id:string,x:number,width:number,y:number,phase:number)=>({id,x,y,width,height:1.5,style:'wave',cycle:{period:7,warning:2,active:1.5,phase}});
/** Liberia — Robertsport: The Surf Coast. Tier 2 (Adventurer).
 * Through a fishing village to the surf: on the wet beach the backwash
 * drags the player seaward while warned waves wash in, bobbing surfboards
 * ferry them between surf rocks, a crab patrols Cape Mount's slope and a
 * stone stair climbs to the lighthouse. A rock pool at the end of the
 * beach holds a star. */
export const level=africaLevel('LBR',{
 design:{archetype:'surf-beach-and-headland',signatureMechanic:'bobbing-surfboards-over-backwash',mechanics:['backwash-current','surf-wave-washes','bobbing-surfboards','headland-crab-patrol','lighthouse-stair'],terrain:['ground','slope','sand','rock','water-raft','stairs'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:54,seed:2026415},
 environment:{biome:'atlantic-surf-coast',locationReference:'Robertsport and Cape Mount, Grand Cape Mount County, Liberia',terrainMaterial:'beach-sand-and-granite',vegetationPack:'coconut-palms-and-coastal-forest',architecturePack:'fishing-village-and-lighthouse',landmarkAssets:['atlantic-surf','cape-mount','fishing-canoes','surf-rocks','cape-lighthouse'],lightingPreset:'late-afternoon-sea',skyPreset:'atlantic-clouds',weatherPreset:'sea-spray'},
 sections:[{id:'A',label:'Fishing village',x:0},{id:'B',label:'Backwash beach',x:14},{id:'C',label:'Surfboard ride',x:27},{id:'D',label:'The point',x:44},{id:'E',label:'Second ride',x:54},{id:'F',label:'Cape slope',x:69},{id:'G',label:'Lighthouse',x:82}],
 platforms:[
  platform('lr-village',-6,0,14,{style:'fishing-village'}),
  platform('lr-dunes',8,0,6,{terrain:'sand',slope:-.6,style:'beach-slope'}),
  platform('lr-beach',14,-.6,10,{terrain:'sand',current:-1,style:'surf-beach'}),
  platform('lr-rock-1',26.6,-.4,3,{terrain:'rock',thickness:.8,style:'surf-rock'}),
  board('lr-board-1',32.2,-.6,1.6,6),
  platform('lr-rock-2',39,-.2,3,{terrain:'rock',thickness:.8,style:'surf-rock'}),
  platform('lr-point',44.6,0,9,{terrain:'rock',style:'cape-point'}),
  board('lr-board-2',56.2,-.4,1.8,6.6),
  platform('lr-rock-3',63.2,.2,3,{terrain:'rock',thickness:.8,style:'surf-rock'}),
  platform('lr-cape',68.8,.6,8,{style:'cape-slope'}),
  platform('lr-stairs',76.8,.6,5,{terrain:'stairs',slope:1.2,steps:4,style:'lighthouse-steps'}),
  platform('lr-lighthouse',81.8,1.8,13,{style:'lighthouse-hill'}),
  ledge('lr-rock-pool',24.4,-1.8,1.6,{style:'rock-pool'}),
 ],
 spawn:['lr-village',4],finish:['lr-lighthouse',11],discovery:['lr-lighthouse',8],checkpoints:[['lr-point',1.2],['lr-cape',1.2]],
 hazards:[...hazardStrip('lr-sea',24,46,-3,'sea'),wave('lr-wave-1',18.4,2.6,-.6,0),wave('lr-wave-2',48.2,2.4,0,3.5)],
 enemies:[{id:'lr-ghost-crab',platformId:'lr-cape',minOffset:2.4,maxOffset:5.8,speed:1,turnPause:.6,height:.55}],
 discoveryBlocks:[{id:'lr-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'lr-discovery'}],
 stars:[['lr-rock-pool',.8,2.1],['lr-rock-2',1.5,2.2],['lr-rock-3',1.5,2.2]],
 edges:[
  ['lr-village','lr-dunes','WALK'],['lr-dunes','lr-beach','WALK'],['lr-beach','lr-rock-1','JUMP'],['lr-rock-1','lr-board-1','RIDE_PLATFORM'],['lr-board-1','lr-rock-2','JUMP'],['lr-rock-2','lr-point','JUMP'],
  ['lr-point','lr-board-2','RIDE_PLATFORM'],['lr-board-2','lr-rock-3','JUMP'],['lr-rock-3','lr-cape','JUMP'],['lr-cape','lr-stairs','WALK'],['lr-stairs','lr-lighthouse','WALK'],
  ['lr-beach','lr-rock-pool','DROP',false],['lr-rock-pool','lr-rock-1','JUMP',false],
 ],
});
