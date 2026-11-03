import {africaLevel,platform,ledge,hazardStrip} from './common';

const crumble={collapse:{delay:.7,respawn:3}};
const fountain=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:2,height:3,style:'geyser',cycle:{period:6.8,warning:1.8,active:1.4,phase}});
/** Democratic Republic of the Congo — Nyiragongo: Rim of the Lava Lake.
 * Tier 5 (Master Explorer). From the summit huts along the rim and down
 * into the crater: long leaps between rim rocks, crater terraces where lava
 * fountains glow then burst, terraces that crack and fall, a winch lift
 * back to the upper rim and windy rim rocks to the viewpoint. An ash shelf
 * just inside the rim holds a star. */
export const level=africaLevel('COD',{
 design:{archetype:'crater-descent-above-lava-lake',signatureMechanic:'warned-lava-fountains-on-crater-terraces',mechanics:['rim-rock-leaps','lava-fountains','cracking-crater-terraces','crater-winch-lift','rim-gusts'],terrain:['cliff','rock','mechanical'],verticality:'high',enemyProfile:'none',targetDurationSeconds:66,seed:2026434},
 environment:{biome:'active-stratovolcano',locationReference:'The summit crater of Mount Nyiragongo, Virunga National Park, DR Congo',terrainMaterial:'black-basalt-and-sulphur',vegetationPack:'senecio-and-heath-on-the-rim',architecturePack:'summit-huts',landmarkAssets:['nyiragongo-crater','lava-lake','crater-terraces','virunga-volcanoes','summit-huts'],lightingPreset:'lava-glow-dusk',skyPreset:'volcanic-dusk',weatherPreset:'gas-plume'},
 sections:[{id:'A',label:'Summit huts',x:0},{id:'B',label:'Rim rocks',x:12},{id:'C',label:'First terrace',x:25},{id:'D',label:'Cracking terraces',x:36},{id:'E',label:'Inner ledge',x:49},{id:'F',label:'Crater winch',x:60},{id:'G',label:'Upper rim',x:68},{id:'H',label:'Viewpoint',x:92}],
 platforms:[
  platform('cd-huts',-6,0,14,{terrain:'cliff',style:'rim-huts'}),
  platform('cd-rim-1',12.2,-.2,2.6,{terrain:'rock',thickness:1.2,style:'rim-rock'}),
  platform('cd-rim-2',19,-.4,2.6,{terrain:'rock',thickness:1.2,style:'rim-rock'}),
  platform('cd-terrace-1',25.8,-.6,6,{terrain:'cliff',style:'crater-terrace'}),
  platform('cd-terrace-2',36.2,-.8,2.6,{terrain:'rock',thickness:.7,style:'crumbling-terrace',...crumble}),
  platform('cd-terrace-3',43,-1,2.6,{terrain:'rock',thickness:.7,style:'crumbling-terrace',...crumble}),
  platform('cd-inner-ledge',49.8,-1.2,7,{terrain:'cliff',style:'inner-ledge'}),
  platform('cd-winch',61,.4,3.6,{type:'moving',motion:'vertical',amplitude:2,period:7,pause:1,terrain:'mechanical',thickness:.4,style:'crater-winch'}),
  platform('cd-rim-3',68.2,2,6,{terrain:'cliff',style:'upper-rim'}),
  platform('cd-rim-4',78.4,1.8,2.6,{terrain:'rock',thickness:1.2,style:'rim-rock'}),
  platform('cd-rim-5',85.2,1.6,2.6,{terrain:'rock',thickness:1.2,style:'rim-rock'}),
  platform('cd-viewpoint',92,1.4,13,{terrain:'cliff',style:'crater-viewpoint'}),
  ledge('cd-ash-shelf',22,-1.8,2,{style:'ash-shelf'}),
 ],
 spawn:['cd-huts',4],finish:['cd-viewpoint',11],discovery:['cd-viewpoint',8],checkpoints:[['cd-inner-ledge',1.2],['cd-rim-3',1.2]],
 hazards:[fountain('cd-fountain-1',30.2,-.6,0),fountain('cd-fountain-2',53,-1.2,3.4),...hazardStrip('cd-lava-lake',10,80,-6,'lava')],
 zones:[{id:'cd-rim-gust',type:'wind',x:76,width:20,bottom:0,top:14,force:-2.2,period:7.5,warning:1.8,duration:2,phase:1}],
 discoveryBlocks:[{id:'cd-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'cd-discovery'}],
 stars:[['cd-ash-shelf',1,2],['cd-rim-3',3,2.3],['cd-rim-5',1.3,2.2]],
 edges:[
  ['cd-huts','cd-rim-1','JUMP'],['cd-rim-1','cd-rim-2','JUMP'],['cd-rim-2','cd-terrace-1','JUMP'],['cd-terrace-1','cd-terrace-2','JUMP'],['cd-terrace-2','cd-terrace-3','JUMP'],['cd-terrace-3','cd-inner-ledge','JUMP'],
  ['cd-inner-ledge','cd-winch','RIDE_PLATFORM'],['cd-winch','cd-rim-3','JUMP'],['cd-rim-3','cd-rim-4','JUMP'],['cd-rim-4','cd-rim-5','JUMP'],['cd-rim-5','cd-viewpoint','JUMP'],
  ['cd-rim-2','cd-ash-shelf','DROP',false],['cd-ash-shelf','cd-terrace-1','JUMP',false],
 ],
});
