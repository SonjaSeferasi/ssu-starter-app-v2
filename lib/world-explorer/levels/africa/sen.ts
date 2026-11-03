import {africaLevel,platform,ledge,hazardStrip} from './common';

const crust={collapse:{delay:1.1,respawn:3}};
/** Senegal — Lac Rose: The Salt Harvest. Tier 2 (Adventurer).
 * Down the dunes to a pink lake: salty shallows push the player back to
 * the shore, a salt pirogue ferries them out, thin salt crust cracks over
 * the brine, salt baskets and baobab roots step up to a dune ridge. Between
 * the second shallows and the baskets, a salt heap in the water holds a star. */
export const level=africaLevel('SEN',{
 design:{archetype:'salt-lake-shallows-harvest',signatureMechanic:'shoreward-brine-current-and-salt-crust',mechanics:['brine-shallows-current','salt-pirogue','cracking-salt-crust','salt-basket-steps','dune-descent-and-climb'],terrain:['sand','slope','ground','rock','water-raft'],verticality:'low',enemyProfile:'none',targetDurationSeconds:54,seed:2026413},
 environment:{biome:'coastal-salt-lake',locationReference:'Lake Retba (Lac Rose), Cap-Vert peninsula, Senegal',terrainMaterial:'white-salt-and-dune-sand',vegetationPack:'baobabs-and-dune-scrub',architecturePack:'salt-harvest-camp',landmarkAssets:['pink-lake-water','salt-mounds','salt-pirogues','coastal-dunes','baobab-trees'],lightingPreset:'bright-sahel-coast',skyPreset:'hazy-blue'},
 sections:[{id:'A',label:'Coastal dunes',x:0},{id:'B',label:'Down to the lake',x:9},{id:'C',label:'Brine shallows',x:25},{id:'D',label:'Salt pirogue',x:33},{id:'E',label:'Salt crust',x:42},{id:'F',label:'Harvest bank',x:55},{id:'G',label:'Second shallows',x:67},{id:'H',label:'Baobab ridge',x:82}],
 platforms:[
  platform('sn-dunes',-6,0,15,{terrain:'sand',style:'coastal-dune'}),
  platform('sn-slope',9,0,6,{terrain:'sand',slope:-.8,style:'dune-slope'}),
  platform('sn-bank-1',15,-.8,8,{style:'salt-bank'}),
  platform('sn-shallows-1',25.6,-.8,7,{terrain:'rock',thickness:.8,current:-1.2,style:'brine-shallows'}),
  platform('sn-pirogue',35.2,-.6,3,{type:'moving',motion:'horizontal',amplitude:1.6,period:6.5,pause:.9,bob:.12,terrain:'water-raft',thickness:.4,style:'salt-pirogue'}),
  platform('sn-mound',42.6,-.2,4,{terrain:'sand',style:'salt-mound'}),
  platform('sn-crust',49.2,0,3,{terrain:'rock',thickness:.5,style:'salt-crust',...crust}),
  platform('sn-bank-2',54.8,.2,10,{style:'harvest-bank'}),
  platform('sn-shallows-2',67.6,.2,7,{terrain:'rock',thickness:.8,current:-1.4,style:'brine-shallows'}),
  platform('sn-baskets',77.2,.8,3,{terrain:'rock',thickness:.8,style:'salt-baskets'}),
  platform('sn-roots',82.8,1.3,3,{terrain:'rock',thickness:.8,style:'baobab-roots'}),
  platform('sn-ridge',88.4,1.3,8,{terrain:'sand',style:'dune-ridge'}),
  platform('sn-ridge-slope',96.4,1.3,6,{terrain:'sand',slope:.8,style:'dune-slope'}),
  platform('sn-baobab-hill',102.4,2.1,13,{style:'baobab-hill'}),
  ledge('sn-salt-heap',75,-.4,1.6,{style:'salt-heap'}),
 ],
 spawn:['sn-dunes',4],finish:['sn-baobab-hill',11],discovery:['sn-baobab-hill',8],checkpoints:[['sn-bank-2',1.2],['sn-ridge',1.2]],
 hazards:[...hazardStrip('sn-brine',23,66,-2.8,'pink-brine')],
 discoveryBlocks:[{id:'sn-discovery-block',x:20,y:2.25,width:.75,height:.8,factId:'sn-discovery'}],
 stars:[['sn-salt-heap',.8,2],['sn-bank-1',4,2.3],['sn-roots',1.5,2.2]],
 edges:[
  ['sn-dunes','sn-slope','WALK'],['sn-slope','sn-bank-1','WALK'],['sn-bank-1','sn-shallows-1','JUMP'],['sn-shallows-1','sn-pirogue','RIDE_PLATFORM'],['sn-pirogue','sn-mound','JUMP'],['sn-mound','sn-crust','JUMP'],['sn-crust','sn-bank-2','JUMP'],
  ['sn-bank-2','sn-shallows-2','JUMP'],['sn-shallows-2','sn-baskets','JUMP'],['sn-baskets','sn-roots','JUMP'],['sn-roots','sn-ridge','JUMP'],['sn-ridge','sn-ridge-slope','WALK'],['sn-ridge-slope','sn-baobab-hill','WALK'],
  ['sn-shallows-2','sn-salt-heap','DROP',false],['sn-salt-heap','sn-baskets','JUMP',false],
 ],
});
