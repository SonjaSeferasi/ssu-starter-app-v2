import {africaLevel,platform,ledge} from './common';

const scree={collapse:{delay:.75,respawn:3}};
/** Tanzania — Kilimanjaro: Roof of Africa. Tier 5 (Master Explorer).
 * From rainforest roots to the summit glaciers. Height is won by
 * scrambling: the Barranco Wall is a staircase of high step-ups, a lava
 * tower face is climbed by hand, and between them long leaps cross gullies,
 * moorland groundsels, crumbling scree and slippery glacier ice, with
 * gusts on the summit ridge. A moss ledge in the forest holds a star. */
export const level=africaLevel('TZA',{
 design:{archetype:'summit-scramble-through-climate-zones',signatureMechanic:'barranco-wall-step-ups-to-glacier-ice',mechanics:['forest-root-leaps','barranco-step-ups','lava-tower-climb','crumbling-scree','glacier-ice','summit-gusts'],terrain:['ground','rock','cliff','terrace','climb-wall','ice-shelf'],verticality:'high',enemyProfile:'none',targetDurationSeconds:70,seed:2026442},
 environment:{biome:'equatorial-high-mountain',locationReference:'The Machame and Barranco routes to Uhuru Peak, Kilimanjaro, Tanzania',terrainMaterial:'volcanic-rock-and-glacier-ice',vegetationPack:'rainforest-groundsels-and-lobelias',architecturePack:'none',landmarkAssets:['kibo-summit','glaciers-of-kibo','barranco-wall','giant-groundsels','montane-rainforest'],lightingPreset:'high-altitude-sun',skyPreset:'above-the-clouds'},
 sections:[{id:'A',label:'Rainforest gate',x:0},{id:'B',label:'Forest roots',x:12},{id:'C',label:'Moorland',x:30},{id:'D',label:'Barranco Wall',x:44},{id:'E',label:'Lava Tower',x:60},{id:'F',label:'Scree',x:70},{id:'G',label:'Glacier',x:84},{id:'H',label:'Uhuru Peak',x:112}],
 platforms:[
  platform('tz-gate',-6,0,14,{style:'park-gate'}),
  platform('tz-root-1',12.2,-.2,2.6,{terrain:'rock',thickness:1.2,style:'forest-root'}),
  platform('tz-root-2',19,-.4,2.6,{terrain:'rock',thickness:1.2,style:'forest-root'}),
  platform('tz-moor',25.8,-.6,8,{style:'heath-moorland'}),
  platform('tz-step-1',33.8,.7,3,{terrain:'terrace',style:'barranco-step'}),
  platform('tz-step-2',36.8,2,3,{terrain:'terrace',style:'barranco-step'}),
  platform('tz-groundsel',43,1.8,2.6,{terrain:'rock',thickness:1.2,style:'groundsel-perch'}),
  platform('tz-step-3',49.8,1.6,3,{terrain:'terrace',style:'barranco-step'}),
  platform('tz-step-4',52.8,2.9,3,{terrain:'terrace',style:'barranco-step'}),
  platform('tz-ridge',55.8,2.9,5,{terrain:'cliff',style:'barranco-top'}),
  platform('tz-lava-tower',61.2,6.4,5,{terrain:'climb-wall',climbable:true,style:'lava-tower'}),
  platform('tz-scree-1',70.4,6.2,2.6,{terrain:'rock',thickness:.6,style:'scree',...scree}),
  platform('tz-scree-2',77.2,6,2.6,{terrain:'rock',thickness:.6,style:'scree',...scree}),
  platform('tz-col',84,5.8,6,{terrain:'cliff',style:'stella-point'}),
  platform('tz-ice-1',94.2,5.6,5.2,{terrain:'ice-shelf',surface:'ice',thickness:1.2,style:'glacier-ice'}),
  platform('tz-ice-2',103.6,5.4,5.2,{terrain:'ice-shelf',surface:'ice',thickness:1.2,style:'glacier-ice'}),
  platform('tz-summit',113,5.2,12,{terrain:'cliff',style:'uhuru-peak'}),
  ledge('tz-moss-ledge',22.6,-1.8,1.8,{style:'moss-ledge'}),
 ],
 spawn:['tz-gate',4],finish:['tz-summit',10],discovery:['tz-summit',7.5],checkpoints:[['tz-moor',1.2],['tz-ridge',1.2],['tz-col',1.2]],
 zones:[{id:'tz-summit-gust',type:'wind',x:92,width:22,bottom:3,top:16,force:-2,period:7.5,warning:1.8,duration:2,phase:0}],
 discoveryBlocks:[{id:'tz-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'tz-discovery'}],
 stars:[['tz-moss-ledge',.9,2],['tz-ridge',2.5,2.3],['tz-col',4,2.3]],
 coinRange:{'tz-ridge':[3,4.2]},
 edges:[
  ['tz-gate','tz-root-1','JUMP'],['tz-root-1','tz-root-2','JUMP'],['tz-root-2','tz-moor','JUMP'],['tz-moor','tz-step-1','JUMP'],['tz-step-1','tz-step-2','JUMP'],['tz-step-2','tz-groundsel','JUMP'],['tz-groundsel','tz-step-3','JUMP'],['tz-step-3','tz-step-4','JUMP'],['tz-step-4','tz-ridge','WALK'],
  ['tz-ridge','tz-lava-tower','CLIMB'],['tz-lava-tower','tz-scree-1','JUMP'],['tz-scree-1','tz-scree-2','JUMP'],['tz-scree-2','tz-col','JUMP'],['tz-col','tz-ice-1','JUMP'],['tz-ice-1','tz-ice-2','JUMP'],['tz-ice-2','tz-summit','JUMP'],
  ['tz-root-2','tz-moss-ledge','DROP',false],['tz-moss-ledge','tz-moor','JUMP',false],
 ],
});
