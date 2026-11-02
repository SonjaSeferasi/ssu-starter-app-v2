import {authorLevel,platform,spread} from '../author';

/** Argentina — Los Glaciares: Perito Moreno Valley. Tier 3 (Challenger).
 * A valley crossing with a down-then-up profile: drop from a moraine lookout
 * onto glacial boulders (an optional high ridge carries on over them), cross
 * Lago Argentino on drifting ice floes, pass the glacier front where warned
 * seracs calve, climb slick ice steps into a katabatic headwind, then follow
 * the moraine to a view of the Fitz Roy skyline. */
const p={
 lookout:platform('ar-lookout',-6,4,18,{style:'moraine'}),
 flat:platform('ar-moraine-flat',15,1.2,12,{style:'moraine'}),
 boulder2:platform('ar-boulder-2',30,.8,2.4,{terrain:'rock',style:'erratic'}),
 shore:platform('ar-shore',35.4,0,9,{style:'lake-shore'}),
 floe1:platform('ar-floe-1',48.6,-.2,3,{type:'moving',motion:'horizontal',amplitude:1.2,period:7,pause:1.4,bob:.08,terrain:'water-raft',thickness:.6,style:'ice-floe'}),
 floe2:platform('ar-floe-2',56.8,-.2,3,{type:'moving',motion:'horizontal',amplitude:1.2,period:7,phase:2.1,pause:1.4,bob:.08,terrain:'water-raft',thickness:.6,style:'ice-floe'}),
 floe3:platform('ar-floe-3',65,-.2,3,{type:'moving',motion:'horizontal',amplitude:1.2,period:7,phase:4.2,pause:1.4,bob:.08,terrain:'water-raft',thickness:.6,style:'ice-floe'}),
 iceWalk:platform('ar-ice-walk',72.2,.4,14,{terrain:'ice-shelf',style:'glacier-front'}),
 step1:platform('ar-ice-step-1',89.2,1.3,2.6,{terrain:'ice-shelf',style:'serac'}),
 step2:platform('ar-ice-step-2',94.8,2.2,2.6,{terrain:'ice-shelf',style:'serac'}),
 crest:platform('ar-crest',100.4,2.6,10,{style:'moraine'}),
 moraine:platform('ar-moraine',110.4,2.6,10,{terrain:'slope',slope:-1,style:'moraine'}),
 boulder3:platform('ar-boulder-3',123.4,1.9,2.4,{terrain:'rock',style:'erratic'}),
 finish:platform('ar-fitz-roy-view',128.8,2.4,13,{style:'lenga-meadow'}),
 ridge1:platform('ar-ridge-1',15.2,4.2,2.6,{terrain:'rock',thickness:.6,route:'upper',style:'ridge-slab'}),
 ridge2:platform('ar-ridge-2',21.4,4.4,2.4,{terrain:'rock',thickness:.6,route:'upper',style:'ridge-slab'}),
};
export const level=authorLevel({
 code:'ARG',iso2:'AR',title:'Los Glaciares: Perito Moreno Valley',environmentId:'argentina-los-glaciares',tier:3,
 design:{archetype:'glacier-valley-descent-and-crossing',signatureMechanic:'calving-ice-and-floes',mechanics:['calving-seracs','drifting-ice-floes','katabatic-headwind','snow-crusted-serac-steps','lake-hazard','shore-patrol','moraine-slope'],terrain:['ground','rock','water-raft','ice-shelf','slope'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:70,seed:2026205},
 environment:{biome:'patagonian-glacier-lake',locationReference:'Perito Moreno Glacier on Lago Argentino, Los Glaciares National Park, Santa Cruz, Argentina',terrainMaterial:'glacial-moraine-and-blue-ice',vegetationPack:'lenga-beech-and-steppe-grass',architecturePack:'park-boardwalk-and-cairns',landmarkAssets:['perito-moreno-glacier-front','lago-argentino-water','fitz-roy-skyline'],lightingPreset:'cold-patagonian-sun',skyPreset:'fast-patagonian-clouds',weatherPreset:'katabatic-wind'},
 sections:[{id:'A',label:'Moraine lookout',x:0},{id:'B',label:'Moraine flat',x:13},{id:'C',label:'Lake shore',x:35.6},{id:'D',label:'Ice floes',x:45.6},{id:'E',label:'Glacier front',x:71.6},{id:'F',label:'Serac steps',x:87.6},{id:'G',label:'Moraine ridge',x:100.6},{id:'H',label:'Fitz Roy view',x:122.6}],
 platforms:Object.values(p),
 spawn:['ar-lookout',4],finish:['ar-fitz-roy-view',9],discovery:['ar-fitz-roy-view',5],checkpoints:[['ar-shore',1.5],['ar-crest',1.5]],
 hazards:[
  {id:'ar-lake',x:44.4,y:-1.6,width:20,height:.9,style:'lake'},{id:'ar-lake-east',x:64.4,y:-1.6,width:7.8,height:.9,style:'lake'},
  {id:'ar-serac-fall-1',x:75.8,y:.4,width:1.6,height:3.2,style:'calving',cycle:{period:6.5,warning:1.8,active:1.1,phase:0}},
  {id:'ar-serac-fall-2',x:81,y:.4,width:1.6,height:3.2,style:'calving',cycle:{period:6.5,warning:1.8,active:1.1,phase:3.2}},
 ],
 zones:[{id:'ar-katabatic',type:'wind',x:86.6,width:24,bottom:-2,top:10,force:-2.4,period:7.5,warning:1.6,duration:2,phase:1}],
 enemies:[{id:'ar-moraine-mite',platformId:'ar-crest',minOffset:4,maxOffset:7.6,speed:1,turnPause:.5,height:.8}],
 discoveryBlocks:[{id:'ar-discovery-block',x:104.8,y:5.25,width:.75,height:.8,factId:'ar-discovery'}],
 coins:[...spread(p.lookout,4,1.1,[7,16.4]),...spread(p.flat,2,1.1,[6,11]),...spread(p.boulder2,1),...spread(p.shore,2),...spread(p.floe1,1),...spread(p.floe2,1),...spread(p.floe3,1),['ar-ice-walk',1.8,1.1],['ar-ice-walk',7,1.1],['ar-ice-walk',11.2,1.1],...spread(p.step1,1),...spread(p.step2,1),['ar-crest',8.6,1.1],['ar-crest',9.4,1.1],...spread(p.moraine,3),...spread(p.boulder3,1),...spread(p.finish,2,1.1,[1.6,7]),...spread(p.ridge1,1),...spread(p.ridge2,1)],
 stars:[['ar-ridge-2',1.2,1.2],['ar-floe-2',1.5,1.1],['ar-crest',7,2.6]],
 edges:[
  ['ar-lookout','ar-moraine-flat','DROP'],['ar-moraine-flat','ar-boulder-2','JUMP'],['ar-boulder-2','ar-shore','JUMP'],['ar-shore','ar-floe-1','RIDE_PLATFORM'],['ar-floe-1','ar-floe-2','RIDE_PLATFORM'],['ar-floe-2','ar-floe-3','RIDE_PLATFORM'],['ar-floe-3','ar-ice-walk','JUMP'],
  ['ar-ice-walk','ar-ice-step-1','JUMP'],['ar-ice-step-1','ar-ice-step-2','JUMP'],['ar-ice-step-2','ar-crest','JUMP'],['ar-crest','ar-moraine','WALK'],['ar-moraine','ar-boulder-3','JUMP'],['ar-boulder-3','ar-fitz-roy-view','JUMP'],
  ['ar-lookout','ar-ridge-1','JUMP',false],['ar-ridge-1','ar-ridge-2','JUMP',false],['ar-ridge-2','ar-moraine-flat','DROP',false],
 ],
});
