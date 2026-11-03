import {africaLevel,platform,ledge,hazardStrip} from './common';

const standing=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:2.4,height:1.6,style:'wave',cycle:{period:7,warning:2,active:1.5,phase}});
/** Republic of the Congo — Congo River: The Brazzaville Rapids. Tier 3 (Challenger).
 * Down the quay steps into the rapids: rocks where standing waves rear up
 * after a warning, a shelf where the river pulls the player downstream, a
 * barge that shuttles to a river island, three more wave-washed rocks and
 * the stairs up to the corniche. An eddy rock in the first rapid holds a
 * star. */
export const level=africaLevel('COG',{
 design:{archetype:'great-river-rapids-crossing',signatureMechanic:'standing-waves-over-rapids-rocks',mechanics:['standing-wave-surges','downstream-current','river-barge-shuttle','river-island','corniche-stairs'],terrain:['ground','stairs','rock','mechanical'],verticality:'low',enemyProfile:'none',targetDurationSeconds:58,seed:2026435},
 environment:{biome:'great-river',locationReference:'The rapids of the Congo River below Brazzaville, Republic of the Congo',terrainMaterial:'dark-sandstone-rapids-rocks',vegetationPack:'riverside-palms-and-forest',architecturePack:'brazzaville-corniche',landmarkAssets:['congo-river','rapids-rocks','standing-waves','river-barge','brazzaville-skyline'],lightingPreset:'humid-afternoon',skyPreset:'equatorial-cumulus'},
 sections:[{id:'A',label:'Brazzaville quay',x:0},{id:'B',label:'Quay steps',x:8},{id:'C',label:'Wave rocks',x:16},{id:'D',label:'Downstream shelf',x:34},{id:'E',label:'River barge',x:43},{id:'F',label:'River island',x:54},{id:'G',label:'Second rapid',x:66},{id:'H',label:'Corniche',x:84}],
 platforms:[
  platform('cg-quay',-6,0,14,{style:'river-quay'}),
  platform('cg-steps',8,0,5,{terrain:'stairs',slope:-1,steps:4,style:'quay-steps'}),
  platform('cg-rock-1',16,-.8,3,{terrain:'rock',thickness:1,style:'rapids-rock'}),
  platform('cg-rock-2',22,-.6,3,{terrain:'rock',thickness:1,style:'rapids-rock'}),
  platform('cg-rock-3',28,-.4,3,{terrain:'rock',thickness:1,style:'rapids-rock'}),
  platform('cg-shelf',34,-.2,8,{terrain:'rock',thickness:1,current:1.2,style:'rapids-shelf'}),
  platform('cg-barge',45.2,0,4,{type:'moving',motion:'horizontal',amplitude:2.2,period:7.6,pause:1,terrain:'water-raft',thickness:.5,style:'river-barge'}),
  platform('cg-island',54.4,.4,9,{style:'river-island'}),
  platform('cg-rock-4',66.4,.6,3,{terrain:'rock',thickness:1,style:'rapids-rock'}),
  platform('cg-rock-5',72.4,.9,3,{terrain:'rock',thickness:1,style:'rapids-rock'}),
  platform('cg-rock-6',78.4,1.2,3,{terrain:'rock',thickness:1,style:'rapids-rock'}),
  platform('cg-bank',84.4,1.4,6,{style:'south-bank'}),
  platform('cg-stairs',90.4,1.4,5,{terrain:'stairs',slope:1.2,steps:4,style:'corniche-stairs'}),
  platform('cg-corniche',95.4,2.6,13,{style:'corniche'}),
  ledge('cg-eddy-rock',13.4,-2,1.6,{style:'eddy-rock'}),
 ],
 spawn:['cg-quay',4],finish:['cg-corniche',11],discovery:['cg-corniche',8],checkpoints:[['cg-island',1.2],['cg-bank',1.2]],
 hazards:[standing('cg-wave-1',22.3,-.6,0),standing('cg-wave-2',28.3,-.4,3.5),standing('cg-wave-3',72.7,.9,1.8),standing('cg-wave-4',78.7,1.2,5.3),...hazardStrip('cg-river',14,82,-3.2,'river')],
 discoveryBlocks:[{id:'cg-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'cg-discovery'}],
 stars:[['cg-eddy-rock',.8,2],['cg-bank',3,2.3],['cg-island',5,2.3]],
 edges:[
  ['cg-quay','cg-steps','WALK'],['cg-steps','cg-rock-1','JUMP'],['cg-rock-1','cg-rock-2','JUMP'],['cg-rock-2','cg-rock-3','JUMP'],['cg-rock-3','cg-shelf','JUMP'],['cg-shelf','cg-barge','RIDE_PLATFORM'],['cg-barge','cg-island','JUMP'],
  ['cg-island','cg-rock-4','JUMP'],['cg-rock-4','cg-rock-5','JUMP'],['cg-rock-5','cg-rock-6','JUMP'],['cg-rock-6','cg-bank','JUMP'],['cg-bank','cg-stairs','WALK'],['cg-stairs','cg-corniche','WALK'],
  ['cg-steps','cg-eddy-rock','DROP',false],['cg-eddy-rock','cg-rock-1','JUMP',false],
 ],
});
