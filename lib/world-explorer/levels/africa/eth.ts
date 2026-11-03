import {africaLevel,platform,ledge} from './common';

/** Ethiopia — Lalibela: The Rock-Hewn Churches. Tier 3 (Challenger).
 * A descent into stone: from the hillside village down cut steps into the
 * trench around a cross-shaped church, through a carved tunnel whose door a
 * plate in the courtyard opens, across the trench ledges and up the far
 * side by pilgrim steps to the highland view. A niche in the trench wall
 * holds a star. The route uses trench floors, steps and tunnels; the
 * church itself is never a platform. */
export const level=africaLevel('ETH',{
 design:{archetype:'carved-trench-descent-and-tunnel',signatureMechanic:'courtyard-plate-and-carved-tunnel-door',mechanics:['cut-step-descent','trench-ledge-hops','courtyard-plate-tunnel-door','tunnel-passage','pilgrim-steps-ascent'],terrain:['ground','stairs','cliff','cave','rock'],verticality:'high',enemyProfile:'none',targetDurationSeconds:44,seed:2026443},
 environment:{biome:'ethiopian-highlands',locationReference:'The rock-hewn churches of Lalibela, Amhara Region, Ethiopia',terrainMaterial:'red-volcanic-tuff',vegetationPack:'juniper-and-highland-grass',architecturePack:'rock-hewn-churches',landmarkAssets:['bete-giyorgis','rock-cut-trenches','carved-tunnels','lasta-highlands','pilgrim-steps'],lightingPreset:'clear-highland-afternoon',skyPreset:'highland-blue'},
 sections:[{id:'A',label:'Hillside village',x:0},{id:'B',label:'Cut steps',x:9},{id:'C',label:'Trench ledges',x:20},{id:'D',label:'Courtyard',x:34},{id:'E',label:'Carved tunnel',x:46},{id:'F',label:'Far trench',x:58},{id:'G',label:'Pilgrim steps',x:76},{id:'H',label:'Highland view',x:86}],
 platforms:[
  platform('et-village',-6,0,15,{style:'hillside-village'}),
  platform('et-cut-steps',9,0,7,{terrain:'stairs',slope:-2.4,steps:7,style:'cut-steps'}),
  platform('et-ledge-1',19,-2.2,3,{terrain:'cliff',style:'trench-ledge'}),
  platform('et-ledge-2',25.2,-2.6,3,{terrain:'cliff',style:'trench-ledge'}),
  platform('et-courtyard',31.4,-3,14,{style:'church-courtyard'}),
  platform('et-tunnel',45.4,-3,9,{terrain:'cave',style:'carved-tunnel'}),
  platform('et-ledge-3',57.2,-2.6,3,{terrain:'cliff',style:'trench-ledge'}),
  platform('et-ledge-4',63.8,-2.2,3,{terrain:'cliff',style:'trench-ledge'}),
  platform('et-far-trench',70,-1.8,6,{style:'trench-floor'}),
  platform('et-pilgrim-steps',76,-1.8,8,{terrain:'stairs',slope:2.8,steps:8,style:'pilgrim-steps'}),
  platform('et-view',84,1,14,{style:'highland-view'}),
  ledge('et-niche',22.4,-3.4,1.8,{style:'trench-niche'}),
 ],
 spawn:['et-village',4],finish:['et-view',12],discovery:['et-view',9],checkpoints:[['et-courtyard',1.2],['et-far-trench',1.2]],
 switches:[{id:'et-courtyard-plate',platformId:'et-courtyard',offset:6,gateIds:['et-tunnel-door']}],
 gates:[{id:'et-tunnel-door',x:44.8,y:-3,width:.5,height:2.4,openSeconds:5}],
 discoveryBlocks:[{id:'et-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'et-discovery'}],
 stars:[['et-niche',.9,2],['et-courtyard',10.5,2.3],['et-ledge-4',1.5,2.2]],
 edges:[
  ['et-village','et-cut-steps','WALK'],['et-cut-steps','et-ledge-1','JUMP'],['et-ledge-1','et-ledge-2','JUMP'],['et-ledge-2','et-courtyard','JUMP'],['et-courtyard','et-tunnel','PASS_GATE'],['et-tunnel','et-ledge-3','JUMP'],
  ['et-ledge-3','et-ledge-4','JUMP'],['et-ledge-4','et-far-trench','JUMP'],['et-far-trench','et-pilgrim-steps','WALK'],['et-pilgrim-steps','et-view','WALK'],
  ['et-ledge-1','et-niche','DROP',false],['et-niche','et-ledge-2','JUMP',false],
 ],
});
