import {africaLevel,platform,ledge} from './common';

const truck=(id:string,x:number,y:number,amplitude:number,period:number)=>platform(id,x,y,4,{type:'moving',motion:'horizontal',amplitude,period,pause:1,terrain:'mechanical',thickness:.5,style:'mountain-truck'});
const rockfall=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:2.4,height:2.6,style:'rockfall',cycle:{period:7,warning:1.8,active:1.2,phase}});
/** Angola — Serra da Leba: The Hairpin Pass. Tier 3 (Challenger).
 * Up an escarpment by its famous road: each hairpin is a climbing ramp,
 * the gaps between bends are crossed on the backs of trucks grinding up the
 * pass, road cuttings are swept by warned rockfall, and a retaining wall
 * leads to the Tundavala rim. A wayside shrine below a bend holds a star. */
export const level=africaLevel('AGO',{
 design:{archetype:'hairpin-road-escarpment-climb',signatureMechanic:'truck-rides-between-hairpin-bends',mechanics:['hairpin-ramps','mountain-truck-rides','cutting-rockfall','retaining-wall-hops','escarpment-rim'],terrain:['ground','slope','mechanical','cliff','rock'],verticality:'high',enemyProfile:'none',targetDurationSeconds:62,seed:2026439},
 environment:{biome:'highland-escarpment',locationReference:'The Serra da Leba pass near Lubango, Huíla Province, Angola',terrainMaterial:'red-quartzite-and-road-stone',vegetationPack:'miombo-and-highland-grass',architecturePack:'mountain-road',landmarkAssets:['serra-da-leba-road','hairpin-bends','mountain-trucks','escarpment','tundavala-highlands'],lightingPreset:'clear-highland-morning',skyPreset:'highland-blue'},
 sections:[{id:'A',label:'Foot of the pass',x:0},{id:'B',label:'First hairpin',x:8},{id:'C',label:'Truck ride',x:17},{id:'D',label:'Rock cutting',x:36},{id:'E',label:'Second truck',x:44},{id:'F',label:'Upper hairpins',x:55},{id:'G',label:'Second cutting',x:80},{id:'H',label:'Tundavala rim',x:95}],
 platforms:[
  platform('ao-foot',-6,0,14,{style:'road-foot'}),
  platform('ao-bend-1',8,0,8,{terrain:'slope',slope:1.4,style:'hairpin-road'}),
  truck('ao-truck-1',19.4,1.4,2,7.4),
  platform('ao-bend-2',28.4,1.8,8,{terrain:'slope',slope:1.4,style:'hairpin-road'}),
  platform('ao-cutting',36.4,3.2,7,{terrain:'cliff',style:'road-cutting'}),
  truck('ao-truck-2',46.4,3.4,2,7.6),
  platform('ao-bend-3',55.4,3.8,8,{terrain:'slope',slope:1.4,style:'hairpin-road'}),
  platform('ao-wall',66.4,5.6,3,{terrain:'rock',thickness:1.2,style:'retaining-wall'}),
  platform('ao-bend-4',72.4,5.8,8,{terrain:'slope',slope:1.4,style:'hairpin-road'}),
  platform('ao-cutting-2',80.4,7.2,6,{terrain:'cliff',style:'road-cutting'}),
  platform('ao-outcrop',89.4,7.4,3,{terrain:'rock',thickness:1.2,style:'quartzite-outcrop'}),
  platform('ao-rim',95.4,7.6,13,{style:'tundavala-rim'}),
  ledge('ao-shrine',63.8,4.4,1.6,{style:'wayside-shrine'}),
 ],
 spawn:['ao-foot',4],finish:['ao-rim',11],discovery:['ao-rim',8],checkpoints:[['ao-bend-3',1.2],['ao-bend-4',1.2]],
 hazards:[rockfall('ao-rockfall-1',39.4,3.2,0),rockfall('ao-rockfall-2',82.4,7.2,3.5)],
 discoveryBlocks:[{id:'ao-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'ao-discovery'}],
 stars:[['ao-shrine',.8,2],['ao-rim',5,2.3],['ao-outcrop',1.5,2.2]],
 edges:[
  ['ao-foot','ao-bend-1','WALK'],['ao-bend-1','ao-truck-1','RIDE_PLATFORM'],['ao-truck-1','ao-bend-2','JUMP'],['ao-bend-2','ao-cutting','WALK'],['ao-cutting','ao-truck-2','RIDE_PLATFORM'],['ao-truck-2','ao-bend-3','JUMP'],
  ['ao-bend-3','ao-wall','JUMP'],['ao-wall','ao-bend-4','JUMP'],['ao-bend-4','ao-cutting-2','WALK'],['ao-cutting-2','ao-outcrop','JUMP'],['ao-outcrop','ao-rim','JUMP'],
  ['ao-bend-3','ao-shrine','DROP',false],['ao-shrine','ao-wall','JUMP',false],
 ],
});
