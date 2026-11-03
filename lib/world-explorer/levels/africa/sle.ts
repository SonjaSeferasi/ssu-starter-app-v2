import {africaLevel,platform,ledge,hazardStrip} from './common';

const log=(id:string,x:number,y:number,amplitude:number,period:number,phase=0)=>platform(id,x,y,3.2,{type:'moving',motion:'horizontal',amplitude,period,phase,pause:.8,bob:.1,terrain:'water-raft',thickness:.5,style:'drifting-log'});
/** Sierra Leone — Tiwai Island: Down the Moa River. Tier 3 (Challenger).
 * A river crossing in three stages: granite boulders and drifting logs to
 * a rapids shelf whose current pushes the player back upstream, the forested
 * island where a beetle patrols, two more drifting logs and a second rapids
 * shelf to the research camp. A sandbank below the island's edge holds a
 * star. */
export const level=africaLevel('SLE',{
 design:{archetype:'rainforest-river-log-drift',signatureMechanic:'drifting-logs-and-upstream-rapids',mechanics:['drifting-logs','upstream-rapids-current','boulder-hops','island-beetle-patrol'],terrain:['ground','rock','water-raft'],verticality:'low',enemyProfile:'light',targetDurationSeconds:58,seed:2026421},
 environment:{biome:'lowland-rainforest-river',locationReference:'Tiwai Island in the Moa River, Sierra Leone',terrainMaterial:'granite-boulders-and-river-mud',vegetationPack:'rainforest-giants-and-oil-palms',architecturePack:'research-camp',landmarkAssets:['moa-river','tiwai-rainforest','drifting-logs','river-boulders','research-camp'],lightingPreset:'misty-river-morning',skyPreset:'humid-haze'},
 sections:[{id:'A',label:'Mainland landing',x:0},{id:'B',label:'Boulder and log',x:10},{id:'C',label:'Rapids shelf',x:31},{id:'D',label:'Tiwai forest',x:42},{id:'E',label:'Log pair',x:54},{id:'F',label:'Second rapids',x:71},{id:'G',label:'Research camp',x:88}],
 platforms:[
  platform('sl-landing',-6,0,14,{style:'riverbank'}),
  platform('sl-boulder-1',10.8,.3,3,{terrain:'rock',thickness:1,style:'river-boulder'}),
  log('sl-log-1',17.4,-.2,1.6,6),
  platform('sl-boulder-2',25.6,.4,3,{terrain:'rock',thickness:1,style:'river-boulder'}),
  platform('sl-rapids-1',31.8,.4,7,{terrain:'rock',thickness:1,current:-1.4,style:'rapids-shelf'}),
  platform('sl-island',42.2,.8,10,{style:'tiwai-forest'}),
  log('sl-log-2',56,.4,1.8,6.5),
  log('sl-log-3',63.6,.4,1.8,6.5),
  platform('sl-boulder-3',71.6,.8,3,{terrain:'rock',thickness:1,style:'river-boulder'}),
  platform('sl-rapids-2',77.6,.8,7,{terrain:'rock',thickness:1,current:-1.6,style:'rapids-shelf'}),
  platform('sl-boulder-4',88,1.2,3,{terrain:'rock',thickness:1,style:'river-boulder'}),
  platform('sl-camp',94.4,1.4,13,{style:'research-camp'}),
  ledge('sl-sandbank',39.2,-.6,1.8,{style:'sandbank'}),
 ],
 spawn:['sl-landing',4],finish:['sl-camp',11],discovery:['sl-camp',8],checkpoints:[['sl-island',1.2],['sl-boulder-3',.5]],
 hazards:[...hazardStrip('sl-moa',8,88,-2.6,'river')],
 enemies:[{id:'sl-forest-beetle',platformId:'sl-island',minOffset:3.6,maxOffset:7,speed:1,turnPause:.6,height:.6}],
 discoveryBlocks:[{id:'sl-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'sl-discovery'}],
 stars:[['sl-sandbank',.9,2],['sl-boulder-2',1.5,2.3],['sl-boulder-4',1.5,2.2]],
 edges:[
  ['sl-landing','sl-boulder-1','JUMP'],['sl-boulder-1','sl-log-1','RIDE_PLATFORM'],['sl-log-1','sl-boulder-2','JUMP'],['sl-boulder-2','sl-rapids-1','JUMP'],['sl-rapids-1','sl-island','JUMP'],
  ['sl-island','sl-log-2','RIDE_PLATFORM'],['sl-log-2','sl-log-3','JUMP'],['sl-log-3','sl-boulder-3','JUMP'],['sl-boulder-3','sl-rapids-2','JUMP'],['sl-rapids-2','sl-boulder-4','JUMP'],['sl-boulder-4','sl-camp','JUMP'],
  ['sl-rapids-1','sl-sandbank','DROP',false],['sl-sandbank','sl-island','JUMP',false],
 ],
});
