import {africaLevel,platform,ledge,hazardStrip} from './common';

/** The Gambia — River Gambia: Baboon Islands. Tier 1 (Explorer).
 * A river trail of long leaps: a sagging mangrove
 * boardwalk, stepping roots, a small ferry to a forested island where a
 * mudskipper hops about, fallen logs and a second boardwalk to the lookout.
 * A short drop between the roots finds an oyster bed with a star. */
export const level=africaLevel('GMB',{
 design:{archetype:'mangrove-river-ferry-trail',signatureMechanic:'river-ferry-to-island',mechanics:['sagging-boardwalks','mangrove-root-steps','river-ferry','mudskipper-patrol','fallen-log-steps'],terrain:['ground','bridge','rock','water-raft'],verticality:'low',enemyProfile:'light',targetDurationSeconds:48,seed:2026411},
 environment:{biome:'riverine-mangrove',locationReference:'River Gambia National Park and the Baboon Islands, The Gambia',terrainMaterial:'river-mud-and-laterite',vegetationPack:'mangroves-and-borassus-palms',architecturePack:'boardwalks-and-ferry',landmarkAssets:['river-gambia','mangrove-forest','baboon-islands','river-ferry','borassus-palms'],lightingPreset:'humid-morning',skyPreset:'tropical-haze'},
 sections:[{id:'A',label:'River landing',x:0},{id:'B',label:'Mangrove boardwalk',x:9},{id:'C',label:'Root steps',x:20},{id:'D',label:'Ferry',x:41},{id:'E',label:'Baboon Island',x:51},{id:'F',label:'Fallen logs',x:63},{id:'G',label:'Lookout boardwalk',x:74}],
 platforms:[
  platform('gm-landing',-6,0,15,{style:'river-bank'}),
  platform('gm-boardwalk-1',9,0,9,{type:'wooden-bridge',terrain:'bridge',sagDepth:.25,style:'boardwalk'}),
  platform('gm-root-1',20.2,.3,4,{terrain:'rock',thickness:.8,style:'mangrove-root'}),
  platform('gm-root-2',26.4,.6,4,{terrain:'rock',thickness:.8,style:'mangrove-root'}),
  platform('gm-jetty',32.8,.6,8,{style:'jetty-bank'}),
  platform('gm-ferry',43,.3,4,{type:'moving',motion:'horizontal',amplitude:2.2,period:7,pause:1,terrain:'water-raft',thickness:.4,style:'river-ferry'}),
  platform('gm-island',51.2,.6,10,{style:'island-forest'}),
  platform('gm-log-1',63.4,.6,3,{terrain:'rock',thickness:.7,style:'fallen-log'}),
  platform('gm-log-2',68.6,1,3,{terrain:'rock',thickness:.7,style:'fallen-log'}),
  platform('gm-boardwalk-2',73.8,1,8,{type:'wooden-bridge',terrain:'bridge',sagDepth:.25,style:'boardwalk'}),
  platform('gm-lookout',81.8,1,13,{style:'lookout'}),
  ledge('gm-oyster-bed',30.8,-.6,1.6,{style:'oyster-bed'}),
 ],
 spawn:['gm-landing',4],finish:['gm-lookout',11],discovery:['gm-lookout',8],checkpoints:[['gm-jetty',1.2],['gm-island',1.2]],
 hazards:[...hazardStrip('gm-river',18,66,-2.4,'river')],
 enemies:[{id:'gm-mudskipper',platformId:'gm-island',minOffset:4,maxOffset:7.5,speed:.8,turnPause:.8,height:.55}],
 discoveryBlocks:[{id:'gm-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'gm-discovery'}],
 stars:[['gm-oyster-bed',.8,2],['gm-island',2.2,2.3],['gm-boardwalk-2',4,2.2]],
 // Taking off from the sagging boardwalk: the authored hop stays as it is.
 tuneSkip:['gm-root-1'],
 edges:[
  ['gm-landing','gm-boardwalk-1','WALK'],['gm-boardwalk-1','gm-root-1','JUMP'],['gm-root-1','gm-root-2','JUMP'],['gm-root-2','gm-jetty','JUMP'],['gm-jetty','gm-ferry','RIDE_PLATFORM'],['gm-ferry','gm-island','JUMP'],
  ['gm-island','gm-log-1','JUMP'],['gm-log-1','gm-log-2','JUMP'],['gm-log-2','gm-boardwalk-2','JUMP'],['gm-boardwalk-2','gm-lookout','WALK'],
  ['gm-root-2','gm-oyster-bed','DROP',false],['gm-oyster-bed','gm-jetty','JUMP',false],
 ],
});
