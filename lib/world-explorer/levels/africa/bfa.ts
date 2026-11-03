import {africaLevel,platform,ledge} from './common';

/** Burkina Faso — Tiébélé: The Painted Royal Court. Tier 2 (Adventurer).
 * Through the compounds of the royal court: a plate in the outer court
 * opens the low painted doorway for a few seconds, painted wall tops and
 * flat earth roofs lead to the inner court, whose own plate opens a second
 * doorway; granary tops step up to the high roof where a lizard suns
 * itself, then on to the chief's court. A clay oven below the first roof
 * holds a star. */
export const level=africaLevel('BFA',{
 design:{archetype:'painted-compound-doorway-run',signatureMechanic:'two-plate-low-doorways',mechanics:['outer-court-plate-door','inner-court-plate-door','painted-wall-tops','granary-steps','roof-lizard-patrol'],terrain:['ground','rooftop','rock'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:42,seed:2026416},
 environment:{biome:'sudan-savanna',locationReference:'The royal court of Tiébélé, Nahouri Province, Burkina Faso',terrainMaterial:'painted-earth-and-laterite',vegetationPack:'millet-shea-and-baobab',architecturePack:'kassena-painted-houses',landmarkAssets:['painted-kassena-houses','royal-court','granaries','millet-fields','painted-patterns'],lightingPreset:'warm-savanna-noon',skyPreset:'harmattan-haze'},
 sections:[{id:'A',label:'Millet field',x:0},{id:'B',label:'Outer court',x:8},{id:'C',label:'Painted walls',x:22},{id:'D',label:'Inner court',x:38},{id:'E',label:'Granaries',x:52},{id:'F',label:'High roof',x:62},{id:'G',label:'Chief’s court',x:79}],
 platforms:[
  platform('bf-field',-6,0,14,{style:'millet-field'}),
  platform('bf-outer-court',8,0,12,{style:'outer-court'}),
  platform('bf-wall-1',22.6,.7,3,{terrain:'rooftop',thickness:.8,style:'painted-wall'}),
  platform('bf-roof-1',28.2,1.4,7,{terrain:'rooftop',thickness:.8,style:'earth-roof'}),
  platform('bf-inner-court',38,.8,12,{style:'inner-court'}),
  platform('bf-granary-1',52.6,1.4,2.4,{terrain:'rock',thickness:1,style:'granary'}),
  platform('bf-granary-2',57.6,2,2.4,{terrain:'rock',thickness:1,style:'granary'}),
  platform('bf-roof-2',62.6,2.6,8,{terrain:'rooftop',thickness:.8,style:'earth-roof'}),
  platform('bf-roof-3',73.2,2.4,4,{terrain:'rooftop',thickness:.8,style:'earth-roof'}),
  platform('bf-chief-court',79.6,2.4,13,{style:'royal-court'}),
  ledge('bf-oven',35.8,-.2,1.6,{style:'clay-oven'}),
 ],
 spawn:['bf-field',4],finish:['bf-chief-court',11],discovery:['bf-chief-court',8],checkpoints:[['bf-inner-court',1.2],['bf-roof-2',1.2]],
 switches:[{id:'bf-outer-plate',platformId:'bf-outer-court',offset:5,gateIds:['bf-outer-door']},{id:'bf-inner-plate',platformId:'bf-inner-court',offset:3.5,gateIds:['bf-inner-door']}],
 gates:[{id:'bf-outer-door',x:16.6,y:0,width:.5,height:2.4,openSeconds:5},{id:'bf-inner-door',x:44.6,y:.8,width:.5,height:2.4,openSeconds:5}],
 enemies:[{id:'bf-agama',platformId:'bf-roof-2',minOffset:3,maxOffset:5.8,speed:1,turnPause:.8,height:.55}],
 discoveryBlocks:[{id:'bf-discovery-block',x:31.7,y:4.45,width:.75,height:.8,factId:'bf-discovery'}],
 stars:[['bf-oven',.8,2],['bf-granary-2',1.2,2.2],['bf-roof-3',2,2.2]],
 edges:[
  ['bf-field','bf-outer-court','WALK'],['bf-outer-court','bf-wall-1','PASS_GATE'],['bf-wall-1','bf-roof-1','JUMP'],['bf-roof-1','bf-inner-court','JUMP'],['bf-inner-court','bf-granary-1','PASS_GATE'],
  ['bf-granary-1','bf-granary-2','JUMP'],['bf-granary-2','bf-roof-2','JUMP'],['bf-roof-2','bf-roof-3','JUMP'],['bf-roof-3','bf-chief-court','JUMP'],
  ['bf-roof-1','bf-oven','DROP',false],['bf-oven','bf-inner-court','JUMP',false],
 ],
});
