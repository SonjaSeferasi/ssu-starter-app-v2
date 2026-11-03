import {africaLevel,platform,ledge} from './common';

const drum=(id:string,x:number,y:number)=>platform(id,x,y,2.4,{terrain:'mechanical',thickness:.4,bounce:14,style:'royal-drum'});
/** Burundi — Gishora: The Royal Drums. Tier 2 (Adventurer).
 * A drum sanctuary on a banana-covered hill: three great royal drums
 * bounce the player up onto the drummers' stages, thatched ridges lead to
 * the drum yard where a guinea fowl struts, and a last drum launches the
 * player into the sacred ficus above the drummers' circle. A hollow among
 * the ridges holds a star. */
export const level=africaLevel('BDI',{
 design:{archetype:'drum-sanctuary-bounce-ascent',signatureMechanic:'royal-drum-bounces',mechanics:['royal-drum-bounces','drummer-stages','thatched-ridge-hops','guinea-fowl-patrol','sacred-ficus'],terrain:['ground','mechanical','rooftop','canopy'],verticality:'high',enemyProfile:'light',targetDurationSeconds:50,seed:2026450},
 environment:{biome:'burundi-highland-hills',locationReference:'The drum sanctuary of Gishora, near Gitega, Burundi',terrainMaterial:'red-highland-earth',vegetationPack:'banana-groves-and-ficus',architecturePack:'thatched-drum-sanctuary',landmarkAssets:['royal-drums','drum-sanctuary','banana-hills','sacred-ficus','drummers-circle'],lightingPreset:'soft-highland-morning',skyPreset:'rolling-cumulus'},
 sections:[{id:'A',label:'Banana hill',x:0},{id:'B',label:'First drum',x:8},{id:'C',label:'Drum stage',x:12},{id:'D',label:'Sanctuary path',x:21},{id:'E',label:'Second drum',x:27},{id:'F',label:'Thatched ridges',x:41},{id:'G',label:'Drum yard',x:52},{id:'H',label:'Drummers’ circle',x:72}],
 platforms:[
  platform('bi-hill',-6,0,14,{style:'banana-hill'}),
  drum('bi-drum-1',8.6,-.8),
  platform('bi-stage-1',13,2.8,6,{terrain:'rooftop',thickness:.8,style:'drum-stage'}),
  platform('bi-path',21,2.6,6,{style:'sanctuary-path'}),
  drum('bi-drum-2',27.6,1.8),
  platform('bi-stage-2',32,5.4,7,{terrain:'rooftop',thickness:.8,style:'drum-stage'}),
  platform('bi-ridge-1',41,5,3,{terrain:'rooftop',thickness:.8,style:'thatch-ridge'}),
  platform('bi-ridge-2',46.8,5.2,3,{terrain:'rooftop',thickness:.8,style:'thatch-ridge'}),
  platform('bi-yard',52.6,5.2,9,{style:'drum-yard'}),
  drum('bi-drum-3',62.2,4.4),
  platform('bi-ficus',66.4,8,6,{terrain:'canopy',thickness:1,style:'sacred-ficus'}),
  platform('bi-circle',74.4,8,11.2,{style:'drummers-circle'}),
  ledge('bi-hollow',44.4,4,1.6,{style:'ridge-hollow'}),
 ],
 spawn:['bi-hill',4],finish:['bi-circle',9.6],discovery:['bi-circle',7],checkpoints:[['bi-path',1],['bi-yard',1]],
 enemies:[{id:'bi-guinea-fowl',platformId:'bi-yard',minOffset:2.6,maxOffset:5.4,speed:1,turnPause:.6,height:.6}],
 discoveryBlocks:[{id:'bi-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'bi-discovery'}],
 stars:[['bi-hollow',.8,2],['bi-stage-1',3,2.3],['bi-ficus',2,2.2]],
 edges:[
  ['bi-hill','bi-drum-1','DROP'],['bi-drum-1','bi-stage-1','JUMP'],['bi-stage-1','bi-path','JUMP'],['bi-path','bi-drum-2','DROP'],['bi-drum-2','bi-stage-2','JUMP'],['bi-stage-2','bi-ridge-1','JUMP'],['bi-ridge-1','bi-ridge-2','JUMP'],
  ['bi-ridge-2','bi-yard','JUMP'],['bi-yard','bi-drum-3','DROP'],['bi-drum-3','bi-ficus','JUMP'],['bi-ficus','bi-circle','JUMP'],
  ['bi-ridge-1','bi-hollow','DROP',false],['bi-hollow','bi-ridge-2','JUMP',false],
 ],
});
