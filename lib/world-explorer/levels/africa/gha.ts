import {africaLevel,platform,ledge} from './common';

const span=(id:string,x:number,y:number,amplitude:number,period:number)=>platform(id,x,y,3,{type:'moving',motion:'horizontal',amplitude,period,pause:.6,bob:.2,terrain:'bridge',thickness:.3,style:'swaying-span'});
const plank={collapse:{delay:.8,respawn:3}};
/** Ghana — Kakum: The Canopy Walkway. Tier 3 (Challenger).
 * Up the access tower into the canopy: sagging rope bridges link tree
 * platforms, short spans sway sideways in the breeze and must be boarded as
 * they swing close, broken planks drop underfoot, and a pangolin rolls along
 * the big platform before a stair winds back down to a clearing. A buttress
 * root below the third platform holds a star. */
export const level=africaLevel('GHA',{
 design:{archetype:'canopy-walkway-tree-platforms',signatureMechanic:'swaying-spans-between-tree-platforms',mechanics:['sagging-rope-bridges','swaying-spans','dropping-planks','pangolin-patrol','tower-stairs'],terrain:['ground','stairs','canopy','bridge'],verticality:'high',enemyProfile:'light',targetDurationSeconds:62,seed:2026418},
 environment:{biome:'moist-semi-deciduous-forest',locationReference:'The canopy walkway of Kakum National Park, Central Region, Ghana',terrainMaterial:'forest-earth-and-timber',vegetationPack:'emergent-trees-and-understory',architecturePack:'rope-walkways-and-tree-platforms',landmarkAssets:['kakum-canopy-walkway','emergent-trees','tree-platforms','forest-floor','hornbills'],lightingPreset:'green-canopy-light',skyPreset:'humid-haze'},
 sections:[{id:'A',label:'Forest floor',x:0},{id:'B',label:'Access tower',x:8},{id:'C',label:'First bridge',x:19},{id:'D',label:'Swaying span',x:33},{id:'E',label:'Broken planks',x:49},{id:'F',label:'Long bridge',x:67},{id:'G',label:'Last span',x:86},{id:'H',label:'Clearing',x:100}],
 platforms:[
  platform('gh-floor',-6,0,14,{style:'forest-floor'}),
  platform('gh-tower',8,0,6,{terrain:'stairs',slope:1.8,steps:5,style:'tower-stairs'}),
  platform('gh-platform-1',14,1.8,5,{terrain:'canopy',thickness:1,style:'tree-platform'}),
  platform('gh-bridge-1',19,1.8,9,{type:'wooden-bridge',terrain:'bridge',sagDepth:.45,style:'rope-walkway'}),
  platform('gh-platform-2',28,1.8,4,{terrain:'canopy',thickness:1,style:'tree-platform'}),
  span('gh-span-1',36,1.6,1.2,5.5),
  platform('gh-platform-3',43.4,2.2,4,{terrain:'canopy',thickness:1,style:'tree-platform'}),
  platform('gh-plank-1',50.6,2.2,2.2,{terrain:'bridge',thickness:.3,style:'broken-plank',...plank}),
  platform('gh-plank-2',56,2.4,2.2,{terrain:'bridge',thickness:.3,style:'broken-plank',...plank}),
  platform('gh-platform-4',61.4,2.6,6,{terrain:'canopy',thickness:1,style:'tree-platform'}),
  platform('gh-bridge-2',67.4,2.6,10,{type:'wooden-bridge',terrain:'bridge',sagDepth:.45,style:'rope-walkway'}),
  platform('gh-platform-5',77.4,2.6,8,{terrain:'canopy',thickness:1,style:'big-tree-platform'}),
  span('gh-span-2',89,2.6,1.4,6),
  platform('gh-platform-6',96.8,3,4,{terrain:'canopy',thickness:1,style:'tree-platform'}),
  platform('gh-descent',100.8,3,6,{terrain:'stairs',slope:-2.4,steps:7,style:'tower-stairs'}),
  platform('gh-clearing',106.8,.6,13,{style:'forest-clearing'}),
  ledge('gh-buttress',47.8,.8,1.8,{style:'buttress-root'}),
 ],
 spawn:['gh-floor',4],finish:['gh-clearing',11],discovery:['gh-clearing',8],checkpoints:[['gh-platform-4',1.2],['gh-platform-6',1]],
 enemies:[{id:'gh-pangolin',platformId:'gh-platform-5',minOffset:3.6,maxOffset:5.4,speed:.9,turnPause:.7,height:.6}],
 discoveryBlocks:[{id:'gh-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'gh-discovery'}],
 stars:[['gh-buttress',.9,2],['gh-span-1',1.5,2.3],['gh-platform-6',2,2.2]],
 edges:[
  ['gh-floor','gh-tower','WALK'],['gh-tower','gh-platform-1','WALK'],['gh-platform-1','gh-bridge-1','WALK'],['gh-bridge-1','gh-platform-2','WALK'],['gh-platform-2','gh-span-1','RIDE_PLATFORM'],['gh-span-1','gh-platform-3','JUMP'],
  ['gh-platform-3','gh-plank-1','JUMP'],['gh-plank-1','gh-plank-2','JUMP'],['gh-plank-2','gh-platform-4','JUMP'],['gh-platform-4','gh-bridge-2','WALK'],['gh-bridge-2','gh-platform-5','WALK'],
  ['gh-platform-5','gh-span-2','RIDE_PLATFORM'],['gh-span-2','gh-platform-6','JUMP'],['gh-platform-6','gh-descent','WALK'],['gh-descent','gh-clearing','WALK'],
  ['gh-platform-3','gh-buttress','DROP',false],['gh-buttress','gh-plank-1','JUMP',false],
 ],
});
