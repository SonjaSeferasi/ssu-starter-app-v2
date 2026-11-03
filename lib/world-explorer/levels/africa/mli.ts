import {africaLevel,platform,ledge} from './common';

const cone={collapse:{delay:.75,respawn:3}};
/** Mali — Djenné: Rooftops of the Mud City. Tier 4 (Expert Explorer).
 * From the Monday market across the floodplain, then up the town by hand:
 * mud-brick house walls are climbed by their toron beams, flat roofs are
 * long precise jumps apart, parapet cones crumble soon after landing, and
 * an agama lizard sprints across the terrace below the Great Mosque's towers.
 * A replastering scaffold between the first roofs holds a star. The route
 * stays on houses and scaffolds; the mosque is the backdrop, never a
 * platform. */
export const level=africaLevel('MLI',{
 design:{archetype:'mud-city-climb-and-roof-leaps',signatureMechanic:'toron-beam-wall-climbs',mechanics:['toron-wall-climbs','long-roof-leaps','crumbling-parapet-cones','terrace-agama-patrol','floodplain-start'],terrain:['ground','climb-wall','rooftop','rock'],verticality:'high',enemyProfile:'light',targetDurationSeconds:64,seed:2026423},
 environment:{biome:'inner-niger-delta',locationReference:'The old town of Djenné, Inner Niger Delta, Mali',terrainMaterial:'banco-mud-brick',vegetationPack:'doum-palms-and-acacia',architecturePack:'sudano-sahelian-mud-houses',landmarkAssets:['great-mosque-of-djenne','toron-mud-houses','bani-floodplain','monday-market','replastering-scaffolds'],lightingPreset:'hot-afternoon',skyPreset:'sahel-haze'},
 sections:[{id:'A',label:'Monday market',x:0},{id:'B',label:'Floodplain',x:11},{id:'C',label:'First wall',x:17},{id:'D',label:'Roof leaps',x:23},{id:'E',label:'Second wall',x:37},{id:'F',label:'Parapet cones',x:46},{id:'G',label:'Mosque terrace',x:60},{id:'H',label:'Square overlook',x:86}],
 platforms:[
  platform('ml-market',-6,0,15,{style:'market-square'}),
  platform('ml-floodplain',11.2,-.4,6,{style:'floodplain'}),
  platform('ml-house-1',17.6,2,5,{terrain:'climb-wall',climbable:true,style:'toron-house'}),
  platform('ml-roof-1',26.2,2.6,3,{terrain:'rooftop',thickness:1,style:'mud-roof'}),
  platform('ml-roof-2',32.8,3.2,4,{terrain:'rooftop',thickness:1,style:'mud-roof'}),
  platform('ml-house-2',37.2,5.4,6,{terrain:'climb-wall',climbable:true,style:'toron-house'}),
  platform('ml-cone-1',47,5.6,2.2,{terrain:'rock',thickness:.8,style:'parapet-cone',...cone}),
  platform('ml-cone-2',53,5.8,2.2,{terrain:'rock',thickness:.8,style:'parapet-cone',...cone}),
  platform('ml-terrace',59,5.8,9,{terrain:'rooftop',thickness:1,style:'roof-terrace'}),
  platform('ml-roof-3',71.8,5.4,3,{terrain:'rooftop',thickness:1,style:'mud-roof'}),
  platform('ml-roof-4',78.6,5.8,3,{terrain:'rooftop',thickness:1,style:'mud-roof'}),
  platform('ml-overlook',85.4,6,13,{style:'mosque-square'}),
  ledge('ml-scaffold',29.6,2,1.8,{style:'replaster-scaffold'}),
 ],
 spawn:['ml-market',4],finish:['ml-overlook',11],discovery:['ml-overlook',8],checkpoints:[['ml-house-2',1.2],['ml-terrace',1.2]],
 enemies:[{id:'ml-agama',platformId:'ml-terrace',minOffset:3,maxOffset:6,speed:1.3,turnPause:.6,height:.55}],
 discoveryBlocks:[{id:'ml-discovery-block',x:4,y:3.05,width:.75,height:.8,factId:'ml-discovery'}],
 stars:[['ml-scaffold',.9,2],['ml-house-2',3.5,2.3],['ml-roof-4',1.5,2.2]],
 edges:[
  ['ml-market','ml-floodplain','JUMP'],['ml-floodplain','ml-house-1','CLIMB'],['ml-house-1','ml-roof-1','JUMP'],['ml-roof-1','ml-roof-2','JUMP'],['ml-roof-2','ml-house-2','CLIMB'],['ml-house-2','ml-cone-1','JUMP'],['ml-cone-1','ml-cone-2','JUMP'],
  ['ml-cone-2','ml-terrace','JUMP'],['ml-terrace','ml-roof-3','JUMP'],['ml-roof-3','ml-roof-4','JUMP'],['ml-roof-4','ml-overlook','JUMP'],
  ['ml-roof-1','ml-scaffold','DROP',false],['ml-scaffold','ml-roof-2','JUMP',false],
 ],
});
