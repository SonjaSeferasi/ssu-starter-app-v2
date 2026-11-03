import {africaLevel,platform,ledge,hazardStrip} from './common';

const stone=(id:string,x:number,y:number)=>platform(id,x,y,2.4,{terrain:'rock',thickness:1,style:'stepping-stone'});
/** Eswatini — Mantenga: The Beehive Village. Tier 1 (Explorer).
 * A gentle walk through a Swazi homestead of grass beehive huts, past the
 * cattle kraal where a calf wanders, across the stream on stepping stones,
 * up stone steps through the Ezulwini valley to the Mantenga Falls. A fern
 * ledge beside the falls path holds a star. */
export const level=africaLevel('SWZ',{
 design:{archetype:'homestead-stream-and-falls-walk',signatureMechanic:'stepping-stones-across-the-mantenga-stream',mechanics:['beehive-hut-homestead','kraal-calf-patrol','stream-stepping-stones','stone-steps','falls-path-rocks'],terrain:['ground','rock','stairs'],verticality:'low',enemyProfile:'light',targetDurationSeconds:34,seed:2026464},
 environment:{biome:'ezulwini-valley',locationReference:'Mantenga Cultural Village and Nature Reserve, Ezulwini Valley, Eswatini',terrainMaterial:'granite-and-red-earth',vegetationPack:'valley-bushveld',architecturePack:'swazi-beehive-huts',landmarkAssets:['beehive-huts','mantenga-falls','ezulwini-valley','cattle-kraal','sibebe-dome'],lightingPreset:'warm-valley-afternoon',skyPreset:'valley-clear'},
 sections:[{id:'A',label:'Beehive village',x:0},{id:'B',label:'Cattle kraal',x:8},{id:'C',label:'Stepping stones',x:19},{id:'D',label:'Stream bank',x:32},{id:'E',label:'Stone steps',x:39},{id:'F',label:'Valley terrace',x:45},{id:'G',label:'Falls path',x:53},{id:'H',label:'Mantenga Falls',x:64}],
 platforms:[
  platform('sz-village',-6,0,14,{style:'beehive-village'}),
  platform('sz-kraal',8,0,9,{style:'cattle-kraal'}),
  stone('sz-stone-1',19.4,0),
  stone('sz-stone-2',23.6,.2),
  stone('sz-stone-3',27.8,.2),
  platform('sz-bank',32,.4,7,{style:'stream-bank'}),
  platform('sz-steps',39,.4,6,{terrain:'stairs',slope:1.5,steps:5,style:'stone-steps'}),
  platform('sz-terrace',45,1.9,6,{style:'valley-terrace'}),
  platform('sz-rock-1',53.2,2.2,3,{terrain:'rock',thickness:1,style:'granite-rock'}),
  platform('sz-rock-2',58.6,2.2,3,{terrain:'rock',thickness:1,style:'granite-rock'}),
  platform('sz-falls-view',63.8,2.6,13,{style:'falls-viewpoint'}),
  ledge('sz-fern-ledge',56.5,1.1,1.6,{style:'fern-ledge'}),
 ],
 spawn:['sz-village',4],finish:['sz-falls-view',11],discovery:['sz-falls-view',8],checkpoints:[['sz-bank',1.2],['sz-terrace',1]],
 hazards:hazardStrip('sz-stream',17,15,-1.6,'stream'),
 enemies:[{id:'sz-calf',platformId:'sz-kraal',minOffset:3.6,maxOffset:5.8,speed:.6,turnPause:1.2,height:.8}],
 discoveryBlocks:[{id:'sz-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'sz-discovery'}],
 stars:[['sz-fern-ledge',.9,2],['sz-terrace',3,2.3],['sz-rock-2',1.5,2.2]],
 edges:[
  ['sz-village','sz-kraal','WALK'],['sz-kraal','sz-stone-1','JUMP'],['sz-stone-1','sz-stone-2','JUMP'],['sz-stone-2','sz-stone-3','JUMP'],['sz-stone-3','sz-bank','JUMP'],['sz-bank','sz-steps','WALK'],['sz-steps','sz-terrace','WALK'],
  ['sz-terrace','sz-rock-1','JUMP'],['sz-rock-1','sz-rock-2','JUMP'],['sz-rock-2','sz-falls-view','JUMP'],
  ['sz-rock-1','sz-fern-ledge','DROP',false],['sz-fern-ledge','sz-rock-2','JUMP',false],
 ],
});
