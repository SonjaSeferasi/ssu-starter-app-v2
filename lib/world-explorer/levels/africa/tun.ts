import {africaLevel,platform,ledge} from './common';

const sunk={switchId:'tn-portal-plate',drop:2.2,seconds:11};
/** Tunisia — El Jem: The Amphitheatre Climb. Tier 2 (Adventurer).
 * From the olive groves through the great portal into the arena: a plate in
 * the portal raises two sunken arena stones for a short while, the hypogeum
 * lift carries the player to the first tier, a stair in the cavea climbs to
 * the upper gallery where a gecko patrols, and the top arcades lead to the
 * attic walk. A drop between the arena stones finds a hypogeum cell with a
 * star. */
export const level=africaLevel('TUN',{
 design:{archetype:'amphitheatre-arena-to-arcade-ascent',signatureMechanic:'plate-raised-arena-stones-and-hypogeum-lift',mechanics:['plate-raised-stones','hypogeum-lift','cavea-stairs','gallery-gecko-patrol','arcade-hops','hypogeum-cell'],terrain:['ground','stairs','rock','mechanical','arch','terrace'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:48,seed:2026403},
 environment:{biome:'sahel-olive-country',locationReference:'The Amphitheatre of El Jem (ancient Thysdrus), Tunisia',terrainMaterial:'honey-limestone-ashlar',vegetationPack:'olive-groves-and-prickly-pear',architecturePack:'roman-amphitheatre-arcades',landmarkAssets:['el-jem-amphitheatre','arcade-tiers','hypogeum-lift-shaft','olive-groves','town-of-thysdrus'],lightingPreset:'warm-afternoon',skyPreset:'sahel-clear'},
 sections:[{id:'A',label:'Olive grove',x:0},{id:'B',label:'Great portal',x:14},{id:'C',label:'Raised arena stones',x:24},{id:'D',label:'Arena floor',x:36},{id:'E',label:'Hypogeum lift',x:47},{id:'F',label:'Cavea stairs',x:53},{id:'G',label:'Upper gallery',x:64},{id:'H',label:'Attic walk',x:88}],
 platforms:[
  platform('tn-grove',-6,0,15,{style:'olive-grove'}),
  platform('tn-steps',9,0,5,{terrain:'stairs',slope:1,steps:4,style:'portal-steps'}),
  platform('tn-portal',14,1,8,{style:'portal'}),
  platform('tn-arena-1',24.6,1,3,{terrain:'rock',thickness:.8,style:'arena-stone',raise:sunk}),
  platform('tn-arena-2',30.2,1,3,{terrain:'rock',thickness:.8,style:'arena-stone',raise:sunk}),
  platform('tn-arena',35.8,1,9,{style:'arena-sand'}),
  platform('tn-lift',47.4,.6,3,{type:'moving',motion:'vertical',amplitude:1.4,period:6,pause:1,terrain:'mechanical',thickness:.4,style:'hypogeum-lift'}),
  platform('tn-tier-1',53,2.6,6,{terrain:'arch',style:'cavea-tier'}),
  platform('tn-cavea',59,2.6,5,{terrain:'stairs',slope:1.2,steps:4,style:'cavea-steps'}),
  platform('tn-gallery',64,3.8,10,{terrain:'arch',style:'upper-gallery'}),
  platform('tn-arcade-1',76.6,3.6,3,{terrain:'arch',style:'arcade-top'}),
  platform('tn-arcade-2',82.2,4,3,{terrain:'arch',style:'arcade-top'}),
  platform('tn-attic',87.8,4,13,{terrain:'terrace',style:'attic-walk'}),
  ledge('tn-cell',33.6,-.4,1.8,{style:'hypogeum-cell'}),
 ],
 spawn:['tn-grove',4],finish:['tn-attic',11],discovery:['tn-attic',8],checkpoints:[['tn-arena',1.4],['tn-gallery',1.4]],
 switches:[{id:'tn-portal-plate',platformId:'tn-portal',offset:6,gateIds:[]}],
 enemies:[{id:'tn-gallery-gecko',platformId:'tn-gallery',minOffset:3.5,maxOffset:8,speed:1,turnPause:.6,height:.6}],
 discoveryBlocks:[{id:'tn-discovery-block',x:40,y:4.05,width:.75,height:.8,factId:'tn-discovery'}],
 stars:[['tn-cell',1.2,1.7],['tn-lift',1.5,2.4],['tn-arcade-2',1.5,2.2]],
 edges:[
  ['tn-grove','tn-steps','WALK'],['tn-steps','tn-portal','WALK'],['tn-portal','tn-arena-1','ACTIVATE_SWITCH'],['tn-arena-1','tn-arena-2','JUMP'],['tn-arena-2','tn-arena','JUMP'],
  ['tn-arena','tn-lift','RIDE_PLATFORM'],['tn-lift','tn-tier-1','JUMP'],['tn-tier-1','tn-cavea','WALK'],['tn-cavea','tn-gallery','WALK'],['tn-gallery','tn-arcade-1','JUMP'],['tn-arcade-1','tn-arcade-2','JUMP'],['tn-arcade-2','tn-attic','JUMP'],
  ['tn-arena-2','tn-cell','DROP',false],['tn-cell','tn-arena','JUMP',false],
 ],
});
