import {africaLevel,platform,ledge} from './common';

const tip={collapse:{delay:.75,respawn:3}};
/** Madagascar — Tsingy de Bemaraha: Razor Stone Forest. Tier 5 (Master Explorer).
 * From the Avenue of the Baobabs into the Tsingy: long leaps between
 * limestone pinnacles whose tips crumble, a canyon wall climbed by hand, a
 * swaying rope bridge, a carved step, a sifaka bounding along the canyon
 * ledge and a last line of pinnacles to the lookout. A crevice below the
 * first pinnacles holds a star. */
export const level=africaLevel('MDG',{
 design:{archetype:'razor-pinnacle-maze',signatureMechanic:'crumbling-pinnacle-tips-and-rope-bridge',mechanics:['pinnacle-leaps','crumbling-tips','canyon-wall-climb','rope-bridge','sifaka-patrol'],terrain:['ground','rock','cliff','climb-wall','bridge','terrace'],verticality:'high',enemyProfile:'light',targetDurationSeconds:45,seed:2026453},
 environment:{biome:'dry-deciduous-karst',locationReference:'Tsingy de Bemaraha National Park, with the Avenue of the Baobabs near Morondava, Madagascar',terrainMaterial:'grey-karst-limestone',vegetationPack:'baobabs-pachypodium-and-dry-forest',architecturePack:'rope-bridges',landmarkAssets:['tsingy-pinnacles','avenue-of-baobabs','suspension-bridges','sifaka-lemurs','canyon-forest'],lightingPreset:'warm-dry-season-light',skyPreset:'clear-blue'},
 sections:[{id:'A',label:'Avenue of the Baobabs',x:0},{id:'B',label:'First pinnacles',x:12},{id:'C',label:'Canyon ledge',x:25},{id:'D',label:'Canyon wall',x:31},{id:'E',label:'Rope bridge',x:35},{id:'F',label:'Crumbling tips',x:48},{id:'G',label:'Sifaka ledge',x:64},{id:'H',label:'Tsingy lookout',x:89}],
 platforms:[
  platform('mg-avenue',-6,0,14,{style:'baobab-avenue'}),
  platform('mg-pin-1',12.2,-.2,2.4,{terrain:'rock',thickness:1.4,style:'tsingy-pinnacle'}),
  platform('mg-pin-2',18.8,-.4,2.4,{terrain:'rock',thickness:.8,style:'tsingy-tip',...tip}),
  platform('mg-ledge',25.4,-.6,5,{terrain:'cliff',style:'canyon-ledge'}),
  platform('mg-wall',30.8,3,4,{terrain:'climb-wall',climbable:true,style:'tsingy-wall'}),
  platform('mg-bridge',34.8,3,9,{type:'wooden-bridge',terrain:'bridge',sagDepth:.45,style:'rope-bridge'}),
  platform('mg-pin-3',48,2.8,2.4,{terrain:'rock',thickness:.8,style:'tsingy-tip',...tip}),
  platform('mg-pin-4',54.6,2.6,2.4,{terrain:'rock',thickness:1.4,style:'tsingy-pinnacle'}),
  platform('mg-step',57,3.9,3,{terrain:'terrace',style:'carved-step'}),
  platform('mg-ledge-2',64.2,3.7,8,{terrain:'cliff',style:'canyon-ledge'}),
  platform('mg-pin-5',76.4,3.5,2.4,{terrain:'rock',thickness:.8,style:'tsingy-tip',...tip}),
  platform('mg-pin-6',83,3.3,2.4,{terrain:'rock',thickness:1.4,style:'tsingy-pinnacle'}),
  platform('mg-lookout',89.6,3.1,12,{terrain:'cliff',style:'tsingy-lookout'}),
  ledge('mg-crevice',15.8,-1.4,1.8,{style:'crevice'}),
 ],
 spawn:['mg-avenue',4],finish:['mg-lookout',10],discovery:['mg-lookout',7.5],checkpoints:[['mg-ledge',1.2],['mg-ledge-2',1.2]],
 enemies:[{id:'mg-sifaka',platformId:'mg-ledge-2',minOffset:3.4,maxOffset:5.6,speed:1.2,turnPause:.7,height:.75}],
 discoveryBlocks:[{id:'mg-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'mg-discovery'}],
 stars:[['mg-crevice',.9,2],['mg-bridge',4.5,2.2],['mg-pin-6',1.2,2.2]],
coinRange:{'mg-bridge':[4.6,7.4]},
 edges:[
  ['mg-avenue','mg-pin-1','JUMP'],['mg-pin-1','mg-pin-2','JUMP'],['mg-pin-2','mg-ledge','JUMP'],['mg-ledge','mg-wall','CLIMB'],['mg-wall','mg-bridge','WALK'],['mg-bridge','mg-pin-3','JUMP'],['mg-pin-3','mg-pin-4','JUMP'],['mg-pin-4','mg-step','JUMP'],
  ['mg-step','mg-ledge-2','JUMP'],['mg-ledge-2','mg-pin-5','JUMP'],['mg-pin-5','mg-pin-6','JUMP'],['mg-pin-6','mg-lookout','JUMP'],
  ['mg-pin-1','mg-crevice','DROP',false],['mg-crevice','mg-pin-2','JUMP',false],
 ],
});
