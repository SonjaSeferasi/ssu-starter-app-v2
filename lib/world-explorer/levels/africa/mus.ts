import {africaLevel,platform,ledge} from './common';

const spray=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:1.2,height:2.4,style:'spray',cycle:{period:6.5,warning:1.8,active:1.4,phase}});
/** Mauritius — Chamarel: The Seven Coloured Earths. Tier 2 (Adventurer).
 * Through sugar cane to the coloured dunes: the loose earth slides the
 * player back as they climb, a cane cart rolls across a gully, rocks by
 * the Chamarel falls are swept by warned spray, and a path leads to a view
 * of Le Morne. A ledge beside the falls holds a star. */
export const level=africaLevel('MUS',{
 design:{archetype:'coloured-dunes-and-falls-gully',signatureMechanic:'sliding-coloured-earth-dunes',mechanics:['sliding-coloured-earth','cane-cart-ride','falls-spray','gully-rocks','le-morne-view'],terrain:['ground','slope','mechanical','rock'],verticality:'medium',enemyProfile:'none',targetDurationSeconds:50,seed:2026454},
 environment:{biome:'tropical-volcanic-island',locationReference:'Chamarel, Rivière Noire District, Mauritius',terrainMaterial:'coloured-volcanic-earth',vegetationPack:'sugar-cane-and-endemic-forest',architecturePack:'none',landmarkAssets:['seven-coloured-earths','chamarel-falls','le-morne-brabant','sugar-cane-fields','gorges-forest'],lightingPreset:'soft-tropical-afternoon',skyPreset:'island-cumulus'},
 sections:[{id:'A',label:'Sugar cane',x:0},{id:'B',label:'Coloured earths',x:8},{id:'C',label:'Viewpoint',x:21},{id:'D',label:'Cane cart',x:27},{id:'E',label:'Gorge path',x:37},{id:'F',label:'Falls rocks',x:47},{id:'G',label:'Falls ledge',x:59},{id:'H',label:'Le Morne view',x:75}],
 platforms:[
  platform('mu-cane',-6,0,14,{style:'sugar-cane'}),
  platform('mu-earth-1',8,0,7,{terrain:'slope',slope:1.4,current:-1.2,style:'coloured-earth'}),
  platform('mu-earth-2',15,1.4,6,{terrain:'slope',slope:-1.4,style:'coloured-earth'}),
  platform('mu-viewpoint',21,0,6,{style:'earths-viewpoint'}),
  platform('mu-cart',29.6,0,3,{type:'moving',motion:'horizontal',amplitude:2,period:7,pause:1,terrain:'mechanical',thickness:.5,style:'cane-cart'}),
  platform('mu-gorge',37.2,.4,8,{style:'gorge-path'}),
  platform('mu-rock-1',47.8,.8,3,{terrain:'rock',thickness:1.2,style:'falls-rock'}),
  platform('mu-rock-2',53.4,1,3.4,{terrain:'rock',thickness:1.2,style:'falls-rock'}),
  platform('mu-falls-ledge',59.4,1.2,8,{style:'falls-ledge'}),
  platform('mu-rock-3',70,1.6,3,{terrain:'rock',thickness:1.2,style:'falls-rock'}),
  platform('mu-morne-view',75.6,1.8,13,{style:'le-morne-view'}),
  ledge('mu-falls-shelf',51.1,-.2,1.6,{style:'falls-shelf'}),
 ],
 spawn:['mu-cane',4],finish:['mu-morne-view',11],discovery:['mu-morne-view',8],checkpoints:[['mu-gorge',1.2],['mu-falls-ledge',1]],
 hazards:[spray('mu-spray-1',55.4,1,0)],
 discoveryBlocks:[{id:'mu-discovery-block',x:24,y:3.05,width:.75,height:.8,factId:'mu-discovery'}],
 stars:[['mu-falls-shelf',.8,2],['mu-viewpoint',4.4,2.3],['mu-rock-3',1.5,2.2]],
coinRange:{'mu-viewpoint':[3.8,5.2]},
 edges:[
  ['mu-cane','mu-earth-1','WALK'],['mu-earth-1','mu-earth-2','WALK'],['mu-earth-2','mu-viewpoint','WALK'],['mu-viewpoint','mu-cart','RIDE_PLATFORM'],['mu-cart','mu-gorge','JUMP'],['mu-gorge','mu-rock-1','JUMP'],['mu-rock-1','mu-rock-2','JUMP'],
  ['mu-rock-2','mu-falls-ledge','JUMP'],['mu-falls-ledge','mu-rock-3','JUMP'],['mu-rock-3','mu-morne-view','JUMP'],
  ['mu-rock-1','mu-falls-shelf','DROP',false],['mu-falls-shelf','mu-rock-2','JUMP',false],
 ],
});
