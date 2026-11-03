import {africaLevel,platform,ledge,hazardStrip} from './common';

const hippo=(id:string,x:number,y:number,amplitude:number,period:number,phase=0)=>platform(id,x,y,2.6,{type:'moving',motion:'vertical',amplitude,period,phase,pause:.8,terrain:'water-raft',thickness:.6,style:'hippo-back'});
const wave=(id:string,x:number,width:number,y:number,phase:number)=>({id,x,y,width,height:1.4,style:'wave',cycle:{period:7.5,warning:2,active:1.5,phase}});
/** Guinea-Bissau — Bijagós: The Hippo Crossing. Tier 2 (Adventurer).
 * Island hopping in the tide: saltwater hippos surface and sink as they
 * breathe, so their backs rise and fall under the player; warned waves wash
 * over the sandbar and the turtle beach; oyster reefs and palm dunes lead to
 * a Bijagó village. A mangrove root in the channel holds a star. */
export const level=africaLevel('GNB',{
 design:{archetype:'tidal-island-hippo-hopping',signatureMechanic:'surfacing-hippo-backs',mechanics:['rising-and-sinking-hippos','tidal-wave-washes','oyster-reef-steps','turtle-beach','palm-dune-climb'],terrain:['sand','water-raft','rock','ground'],verticality:'low',enemyProfile:'none',targetDurationSeconds:52,seed:2026414},
 environment:{biome:'tidal-archipelago',locationReference:'The Bijagós Archipelago, Guinea-Bissau',terrainMaterial:'tidal-sand-and-oyster-reef',vegetationPack:'oil-palms-and-mangroves',architecturePack:'bijago-thatched-village',landmarkAssets:['saltwater-hippos','bijagos-islands','oyster-reefs','turtle-beach','palm-groves'],lightingPreset:'warm-tidal-afternoon',skyPreset:'tropical-cumulus'},
 sections:[{id:'A',label:'Palm beach',x:0},{id:'B',label:'Washed sandbar',x:11},{id:'C',label:'First hippos',x:19},{id:'D',label:'Oyster reef',x:29},{id:'E',label:'Channel island',x:36},{id:'F',label:'Hippo channel',x:48},{id:'G',label:'Turtle beach',x:59},{id:'H',label:'Bijagó village',x:78}],
 platforms:[
  platform('gw-beach',-6,0,15,{terrain:'sand',style:'palm-beach'}),
  platform('gw-sandbar',11.6,0,5,{terrain:'sand',style:'sandbar'}),
  hippo('gw-hippo-1',19.2,-.4,.5,5.6),
  hippo('gw-hippo-2',24.4,-.2,.5,6.2,1.5),
  platform('gw-reef',29.6,.3,4,{terrain:'rock',thickness:.8,style:'oyster-reef'}),
  platform('gw-island',36.2,.3,10,{terrain:'sand',style:'channel-island'}),
  hippo('gw-hippo-3',48.8,-.2,.6,6),
  hippo('gw-hippo-4',54,.1,.6,6.4,2),
  platform('gw-turtle-beach',59.2,.5,10,{terrain:'sand',style:'turtle-beach'}),
  platform('gw-dune',71.8,.9,4,{terrain:'sand',style:'palm-dune'}),
  platform('gw-village',78.4,1.4,13,{style:'bijago-village'}),
  ledge('gw-mangrove-root',34,-.8,1.6,{style:'mangrove-root'}),
 ],
 spawn:['gw-beach',4],finish:['gw-village',11],discovery:['gw-village',8],checkpoints:[['gw-island',1.2],['gw-turtle-beach',1.2]],
 hazards:[...hazardStrip('gw-channel',9,70,-2.6,'sea'),wave('gw-wave-1',12.4,3,0,0),wave('gw-wave-2',62.6,2.8,.5,3.6)],
 discoveryBlocks:[{id:'gw-discovery-block',x:41,y:3.35,width:.75,height:.8,factId:'gw-discovery'}],
 stars:[['gw-mangrove-root',.8,2],['gw-reef',2,2.3],['gw-dune',2,2.2]],
 edges:[
  ['gw-beach','gw-sandbar','JUMP'],['gw-sandbar','gw-hippo-1','RIDE_PLATFORM'],['gw-hippo-1','gw-hippo-2','RIDE_PLATFORM'],['gw-hippo-2','gw-reef','JUMP'],['gw-reef','gw-island','JUMP'],
  ['gw-island','gw-hippo-3','RIDE_PLATFORM'],['gw-hippo-3','gw-hippo-4','RIDE_PLATFORM'],['gw-hippo-4','gw-turtle-beach','JUMP'],['gw-turtle-beach','gw-dune','JUMP'],['gw-dune','gw-village','JUMP'],
  ['gw-reef','gw-mangrove-root','DROP',false],['gw-mangrove-root','gw-island','JUMP',false],
 ],
});
