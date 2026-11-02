import {authorLevel,platform,spread} from '../author';

const crumble={collapse:{delay:.75,respawn:3}};
/** Venezuela — Angel Falls: The Auyán-tepui Descent. Tier 5 (Master Explorer).
 * South America's advanced challenge, built downward: from the tepui summit,
 * long precise leaps across crumbling sandstone blocks and down terraces,
 * two climbable faces where the route doubles back up, pillars crossed in
 * gusts off the escarpment and spray-slick rock beside Angel Falls. An
 * optional crag above the plunge pool holds a star. */
const p={
 summit:platform('ve-summit',-6,14,16,{terrain:'tepui',style:'tepui-summit'}),
 block1:platform('ve-block-1',14.2,13.4,2.4,{terrain:'tepui',thickness:.9,style:'sandstone-block',...crumble}),
 block2:platform('ve-block-2',20.8,12.8,2.4,{terrain:'tepui',thickness:.9,style:'sandstone-block',...crumble}),
 terrace1:platform('ve-terrace-1',27.4,11.6,8,{terrain:'tepui',style:'tepui-terrace'}),
 ledgeA:platform('ve-ledge-a',35.4,9,5,{terrain:'cliff',style:'escarpment-ledge'}),
 ledgeB:platform('ve-ledge-b',44.6,8.4,2.4,{terrain:'tepui',thickness:.9,style:'sandstone-block',...crumble}),
 ledgeC:platform('ve-ledge-c',51.2,7.4,3,{terrain:'cliff',style:'escarpment-ledge'}),
 wall1:platform('ve-wall-1',54.2,10.2,4,{terrain:'climb-wall',climbable:true,style:'escarpment-face'}),
 pillar1:platform('ve-pillar-1',62.6,9.4,2.4,{terrain:'tepui',style:'sandstone-pillar'}),
 pillar2:platform('ve-pillar-2',69.2,8.4,2.4,{terrain:'tepui',style:'sandstone-pillar'}),
 terrace2:platform('ve-terrace-2',75.8,7,8,{terrain:'tepui',style:'tepui-terrace'}),
 pool:platform('ve-plunge-rim',83.8,4.4,8,{terrain:'cliff',style:'plunge-rim'}),
 spray1:platform('ve-spray-1',96,4,2.4,{terrain:'rock',surface:'ice',style:'spray-rock'}),
 spray2:platform('ve-spray-2',102.6,3.4,2.4,{terrain:'rock',surface:'ice',style:'spray-rock'}),
 ledgeD:platform('ve-ledge-d',109.2,2.2,3,{terrain:'cliff',style:'escarpment-ledge'}),
 wall2:platform('ve-wall-2',112.2,4.8,3,{terrain:'climb-wall',climbable:true,style:'escarpment-face'}),
 finish:platform('ve-angel-falls-view',119.6,4.4,13,{terrain:'ground',style:'canaima-lookout'}),
 crag:platform('ve-crag',86.8,7.2,2.6,{terrain:'tepui',thickness:.4,route:'upper',style:'sandstone-crag'}),
};
export const level=authorLevel({
 code:'VEN',iso2:'VE',title:'Angel Falls: The Auyán-tepui Descent',environmentId:'venezuela-auyan-tepui',tier:5,
 design:{archetype:'tepui-cliff-descent',signatureMechanic:'descent-with-climb-backs',mechanics:['long-precise-leaps','crumbling-sandstone','climb-back-faces','escarpment-gusts','spray-slick-rock','terrace-patrol','plunge-pool-crag'],terrain:['tepui','cliff','climb-wall','rock','ground'],verticality:'high',enemyProfile:'light',targetDurationSeconds:65,seed:2026212},
 environment:{biome:'tepui-tableland',locationReference:'Auyán-tepui and Angel Falls (Kerepakupai Merú), Canaima National Park, Bolívar, Venezuela',terrainMaterial:'black-weathered-quartzite-sandstone',vegetationPack:'tepui-shrubs-bromeliads-and-gallery-forest',architecturePack:'none',landmarkAssets:['angel-falls','auyan-tepui-plateau','canaima-rainforest'],lightingPreset:'cloud-break-sun',skyPreset:'tepui-cloud-cap',weatherPreset:'falls-spray'},
 sections:[{id:'A',label:'Tepui summit',x:0},{id:'B',label:'Crumbling blocks',x:13},{id:'C',label:'Upper terrace',x:27},{id:'D',label:'Escarpment ledges',x:35},{id:'E',label:'Climb-back face',x:51},{id:'F',label:'Wind pillars',x:60},{id:'G',label:'Plunge-pool rim',x:76},{id:'H',label:'Angel Falls spray',x:95}],
 platforms:Object.values(p),
 spawn:['ve-summit',4],finish:['ve-angel-falls-view',9],discovery:['ve-angel-falls-view',5],checkpoints:[['ve-terrace-1',1.5],['ve-terrace-2',1.5]],
 zones:[{id:'ve-escarpment-gust',type:'wind',x:58,width:18,bottom:4,top:16,force:-2.4,period:8,warning:1.6,duration:2,phase:0}],
 enemies:[{id:'ve-tepui-toad',platformId:'ve-summit',minOffset:9,maxOffset:12.6,speed:1.2,turnPause:.4,height:.7}],
 discoveryBlocks:[{id:'ve-discovery-block',x:4,y:16.65,width:.75,height:.8,factId:'ve-discovery'}],
 coins:[['ve-summit',14.4,1.1],...spread(p.block1,1),...spread(p.block2,1),...spread(p.terrace1,3),['ve-ledge-a',3.2,1.1],...spread(p.ledgeB,1),...spread(p.ledgeC,1),...spread(p.wall1,2),...spread(p.pillar1,1),...spread(p.pillar2,1),...spread(p.terrace2,2),...spread(p.pool,2),...spread(p.spray1,1),...spread(p.spray2,1),...spread(p.ledgeD,1),...spread(p.wall2,1),...spread(p.finish,2,1.1,[1.6,7]),...spread(p.crag,1)],
 stars:[['ve-crag',1.3,1.2],['ve-pillar-2',1.2,2.2],['ve-wall-1',2,2.4]],
 edges:[
  ['ve-summit','ve-block-1','JUMP'],['ve-block-1','ve-block-2','JUMP'],['ve-block-2','ve-terrace-1','JUMP'],['ve-terrace-1','ve-ledge-a','DROP'],['ve-ledge-a','ve-ledge-b','JUMP'],['ve-ledge-b','ve-ledge-c','JUMP'],['ve-ledge-c','ve-wall-1','CLIMB'],
  ['ve-wall-1','ve-pillar-1','JUMP'],['ve-pillar-1','ve-pillar-2','JUMP'],['ve-pillar-2','ve-terrace-2','JUMP'],['ve-terrace-2','ve-plunge-rim','DROP'],['ve-plunge-rim','ve-spray-1','JUMP'],['ve-spray-1','ve-spray-2','JUMP'],['ve-spray-2','ve-ledge-d','JUMP'],
  ['ve-ledge-d','ve-wall-2','CLIMB'],['ve-wall-2','ve-angel-falls-view','JUMP'],
  ['ve-terrace-2','ve-crag','JUMP',false],['ve-crag','ve-plunge-rim','DROP',false],
 ],
});
