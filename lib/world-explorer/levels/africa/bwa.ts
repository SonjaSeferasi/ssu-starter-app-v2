import {africaLevel,platform,ledge,hazardStrip} from './common';

const mokoro=(id:string,x:number)=>platform(id,x,-.3,4,{type:'moving',motion:'horizontal',amplitude:2,period:7.6,pause:1.2,bob:.1,terrain:'water-raft',thickness:.5,style:'mokoro'});
const lily=(id:string,x:number,y:number)=>platform(id,x,y,2.4,{terrain:'water-raft',thickness:.3,style:'lily-pad',collapse:{delay:1,respawn:3}});
/** Botswana — Okavango Delta: Mokoro Channels. Tier 2 (Adventurer).
 * Through the clear channels of the delta: pole across on a mokoro canoe,
 * hop lily pads that sink if you linger, cross a papyrus island where a
 * water monitor hunts, take a second mokoro and step over termite-mound
 * islands to the lookout where elephants wade. A reed tussock below the
 * last bank holds a star. */
export const level=africaLevel('BWA',{
 design:{archetype:'delta-channel-poling-and-lily-hops',signatureMechanic:'mokoro-rides-between-sinking-lily-pads',mechanics:['mokoro-canoe-ride','sinking-lily-pads','papyrus-island','monitor-patrol','termite-mound-islands'],terrain:['ground','water-raft','sand','rock'],verticality:'low',enemyProfile:'light',targetDurationSeconds:50,seed:2026462},
 environment:{biome:'inland-delta',locationReference:'Okavango Delta, Botswana',terrainMaterial:'white-sand-and-papyrus',vegetationPack:'papyrus-and-water-lilies',architecturePack:'safari-camp',landmarkAssets:['okavango-channels','mokoro-canoes','water-lilies','papyrus-islands','delta-wildlife'],lightingPreset:'golden-delta-afternoon',skyPreset:'delta-clear'},
 sections:[{id:'A',label:'Safari camp',x:0},{id:'B',label:'Mokoro landing',x:8},{id:'C',label:'First mokoro',x:15},{id:'D',label:'Lily pads',x:25},{id:'E',label:'Papyrus island',x:36},{id:'F',label:'Second mokoro and lilies',x:46},{id:'G',label:'Termite islands',x:67},{id:'H',label:'Lookout',x:81}],
 platforms:[
  platform('bw-camp',-6,0,14,{style:'safari-camp'}),
  platform('bw-landing',8,0,6,{terrain:'sand',style:'mokoro-landing'}),
  mokoro('bw-mokoro-1',16.8),
  lily('bw-lily-1',25.6,-.2),
  lily('bw-lily-2',30.8,-.1),
  platform('bw-island',36,0,9,{terrain:'sand',style:'papyrus-island'}),
  mokoro('bw-mokoro-2',48),
  lily('bw-lily-3',56.8,-.2),
  lily('bw-lily-4',62,0),
  platform('bw-bank',67.2,.4,6,{terrain:'sand',style:'sand-bank'}),
  platform('bw-termite',76,.4,3,{terrain:'rock',thickness:1,style:'termite-island'}),
  platform('bw-lookout',81.6,.8,13,{style:'delta-lookout'}),
  ledge('bw-tussock',73.5,-.7,1.6,{style:'reed-tussock'}),
 ],
 spawn:['bw-camp',4],finish:['bw-lookout',11],discovery:['bw-lookout',8],checkpoints:[['bw-island',1.2],['bw-bank',1.2]],
 hazards:hazardStrip('bw-channel',14,62,-1.6,'river'),
 enemies:[{id:'bw-monitor',platformId:'bw-island',minOffset:3.6,maxOffset:5.8,speed:.8,turnPause:1,height:.55}],
 discoveryBlocks:[{id:'bw-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'bw-discovery'}],
 stars:[['bw-tussock',.9,2],['bw-island',4.6,2.3],['bw-termite',1.5,2.2]],
 // The reed-tussock bonus sits under the bank-to-termite hop, which keeps its authored length.
 tuneSkip:['bw-termite'],
 edges:[
  ['bw-camp','bw-landing','WALK'],['bw-landing','bw-mokoro-1','RIDE_PLATFORM'],['bw-mokoro-1','bw-lily-1','JUMP'],['bw-lily-1','bw-lily-2','JUMP'],['bw-lily-2','bw-island','JUMP'],['bw-island','bw-mokoro-2','RIDE_PLATFORM'],
  ['bw-mokoro-2','bw-lily-3','JUMP'],['bw-lily-3','bw-lily-4','JUMP'],['bw-lily-4','bw-bank','JUMP'],['bw-bank','bw-termite','JUMP'],['bw-termite','bw-lookout','JUMP'],
  ['bw-bank','bw-tussock','DROP',false],['bw-tussock','bw-termite','JUMP',false],
 ],
});
