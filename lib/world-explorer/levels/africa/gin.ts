import {africaLevel,platform,ledge,hazardStrip} from './common';

const spray=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:2,height:2.6,style:'spray',cycle:{period:6.5,warning:1.8,active:1.4,phase}});
/** Guinea — Fouta Djallon: The Bridal Veil Falls. Tier 4 (Expert Explorer).
 * Up beside a waterfall: slick wet ledges must be landed early, the
 * cliff beside the veil of water is climbed by hand, cascade shelves push
 * the player back towards the drop, warned bursts of spray sweep the spray
 * ledge, and two more slick ledges lead to the highland plateau. A fern
 * grotto behind the falls holds a star. */
export const level=africaLevel('GIN',{
 design:{archetype:'waterfall-side-ascent',signatureMechanic:'slick-ledges-and-cliff-beside-the-falls',mechanics:['slick-wet-ledges','falls-cliff-climb','cascade-current','warned-spray-bursts','highland-finish'],terrain:['ground','rock','ice-shelf','climb-wall'],verticality:'high',enemyProfile:'none',targetDurationSeconds:56,seed:2026424},
 environment:{biome:'sandstone-highlands',locationReference:'The Voile de la Mariée near Kindia, Fouta Djallon, Guinea',terrainMaterial:'wet-dark-sandstone',vegetationPack:'gallery-forest-ferns-and-bananas',architecturePack:'fula-village-huts',landmarkAssets:['bridal-veil-falls','fouta-djallon-highlands','cascade-shelves','plunge-pool','gallery-forest'],lightingPreset:'misty-green-morning',skyPreset:'highland-cloud',weatherPreset:'waterfall-spray'},
 sections:[{id:'A',label:'Fula village',x:0},{id:'B',label:'Wet ledges',x:11},{id:'C',label:'Plunge-pool rim',x:25},{id:'D',label:'Falls cliff',x:32},{id:'E',label:'Cascade shelves',x:42},{id:'F',label:'Spray ledge',x:58},{id:'G',label:'Upper ledges',x:67},{id:'H',label:'Highland plateau',x:85}],
 platforms:[
  platform('gn-village',-6,0,14,{style:'fula-village'}),
  platform('gn-ledge-1',11.4,.4,4.4,{terrain:'ice-shelf',surface:'ice',thickness:1,style:'wet-ledge'}),
  platform('gn-ledge-2',19.2,.8,4.4,{terrain:'ice-shelf',surface:'ice',thickness:1,style:'wet-ledge'}),
  platform('gn-pool-rim',27,1.2,7,{style:'pool-rim'}),
  platform('gn-cliff',34.4,4.6,6,{terrain:'climb-wall',climbable:true,style:'falls-cliff'}),
  platform('gn-shelf-1',44.2,4.6,4,{terrain:'rock',thickness:1,current:-1.6,style:'cascade-shelf'}),
  platform('gn-shelf-2',52,5,4,{terrain:'rock',thickness:1,current:-1.8,style:'cascade-shelf'}),
  platform('gn-spray-ledge',59.8,5.2,6,{style:'spray-ledge'}),
  platform('gn-ledge-3',69.4,5.6,4.4,{terrain:'ice-shelf',surface:'ice',thickness:1,style:'wet-ledge'}),
  platform('gn-ledge-4',77.2,6,4.4,{terrain:'ice-shelf',surface:'ice',thickness:1,style:'wet-ledge'}),
  platform('gn-plateau',85,6.2,13,{style:'highland-plateau'}),
  ledge('gn-grotto',48.6,3.8,1.8,{style:'fern-grotto'}),
 ],
 spawn:['gn-village',4],finish:['gn-plateau',11],discovery:['gn-plateau',8],checkpoints:[['gn-pool-rim',1.2],['gn-spray-ledge',1.2]],
 hazards:[spray('gn-spray-1',62,5.2,0),...hazardStrip('gn-plunge-pool',9,72,-2.4,'pool')],
 discoveryBlocks:[{id:'gn-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'gn-discovery'}],
 stars:[['gn-grotto',.9,2],['gn-pool-rim',4,2.3],['gn-ledge-4',2.2,2]],
 edges:[
  ['gn-village','gn-ledge-1','JUMP'],['gn-ledge-1','gn-ledge-2','JUMP'],['gn-ledge-2','gn-pool-rim','JUMP'],['gn-pool-rim','gn-cliff','CLIMB'],['gn-cliff','gn-shelf-1','JUMP'],['gn-shelf-1','gn-shelf-2','JUMP'],
  ['gn-shelf-2','gn-spray-ledge','JUMP'],['gn-spray-ledge','gn-ledge-3','JUMP'],['gn-ledge-3','gn-ledge-4','JUMP'],['gn-ledge-4','gn-plateau','JUMP'],
  ['gn-shelf-1','gn-grotto','DROP',false],['gn-grotto','gn-shelf-2','JUMP',false],
 ],
});
