import {africaLevel,platform,ledge} from './common';

const flake={collapse:{delay:.8,respawn:3}};
const rockfall=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:2.4,height:2.6,style:'rockfall',cycle:{period:7,warning:1.8,active:1.2,phase}});
/** Nigeria — Zuma Rock: The Monolith Ascent. Tier 4 (Expert Explorer).
 * From the roadside up a granite monolith: boulders and a sloping slab, an
 * exfoliation face climbed by hand, loose flakes that drop underfoot, a
 * shoulder and dome slope where warned rockfall comes down, and wind-swept
 * boulders to the summit. A cave mouth at the foot of the slab holds a
 * star. */
export const level=africaLevel('NGA',{
 design:{archetype:'granite-monolith-ascent',signatureMechanic:'warned-rockfall-on-the-dome',mechanics:['granite-slab-ascent','exfoliation-face-climb','loose-flakes','warned-rockfall','summit-wind'],terrain:['ground','rock','slope','climb-wall'],verticality:'high',enemyProfile:'none',targetDurationSeconds:54,seed:2026425},
 environment:{biome:'guinea-savanna-inselberg',locationReference:'Zuma Rock, Niger State, near Abuja, Nigeria',terrainMaterial:'grey-granite',vegetationPack:'savanna-woodland-and-grass',architecturePack:'roadside-village',landmarkAssets:['zuma-rock-monolith','granite-boulders','exfoliation-face','savanna-woodland','abuja-road'],lightingPreset:'clear-afternoon',skyPreset:'savanna-cumulus'},
 sections:[{id:'A',label:'Abuja road',x:0},{id:'B',label:'Boulders',x:11},{id:'C',label:'Granite slab',x:18},{id:'D',label:'Exfoliation face',x:26},{id:'E',label:'Loose flakes',x:35},{id:'F',label:'Shoulder',x:49},{id:'G',label:'Dome slope',x:58},{id:'H',label:'Summit',x:83}],
 platforms:[
  platform('ng-road',-6,0,14,{style:'roadside'}),
  platform('ng-boulder-1',11.6,.4,3,{terrain:'rock',thickness:1.2,style:'granite-boulder'}),
  platform('ng-slab',18,1,7,{terrain:'slope',slope:1,style:'granite-slab'}),
  platform('ng-face',25.4,5,6,{terrain:'climb-wall',climbable:true,style:'exfoliation-face'}),
  platform('ng-flake-1',35.2,5.2,2.6,{terrain:'rock',thickness:.6,style:'granite-flake',...flake}),
  platform('ng-flake-2',41.6,5.6,2.6,{terrain:'rock',thickness:.6,style:'granite-flake',...flake}),
  platform('ng-shoulder',48,5.8,9,{terrain:'cliff',style:'granite-shoulder'}),
  platform('ng-dome',57,5.8,8,{terrain:'slope',slope:1.4,style:'dome-slope'}),
  platform('ng-boulder-2',68.6,7.4,2.6,{terrain:'rock',thickness:1.2,style:'granite-boulder'}),
  platform('ng-boulder-3',75,7.6,2.6,{terrain:'rock',thickness:1.2,style:'granite-boulder'}),
  platform('ng-summit',81.4,7.8,13,{terrain:'cliff',style:'zuma-summit'}),
  ledge('ng-cave',15,-.2,1.8,{style:'cave-mouth'}),
 ],
 spawn:['ng-road',4],finish:['ng-summit',11],discovery:['ng-summit',8],checkpoints:[['ng-slab',1.2],['ng-shoulder',1.2]],
 hazards:[rockfall('ng-rockfall-1',51.4,5.8,0)],
 zones:[{id:'ng-summit-wind',type:'wind',x:66,width:18,bottom:5,top:16,force:-2,period:7.5,warning:1.8,duration:2,phase:1}],
 discoveryBlocks:[{id:'ng-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'ng-discovery'}],
 stars:[['ng-cave',.9,2],['ng-shoulder',4,2.3],['ng-boulder-3',1.3,2.2]],
 edges:[
  ['ng-road','ng-boulder-1','JUMP'],['ng-boulder-1','ng-slab','JUMP'],['ng-slab','ng-face','CLIMB'],['ng-face','ng-flake-1','JUMP'],['ng-flake-1','ng-flake-2','JUMP'],['ng-flake-2','ng-shoulder','JUMP'],
  ['ng-shoulder','ng-dome','WALK'],['ng-dome','ng-boulder-2','JUMP'],['ng-boulder-2','ng-boulder-3','JUMP'],['ng-boulder-3','ng-summit','JUMP'],
  ['ng-boulder-1','ng-cave','DROP',false],['ng-cave','ng-slab','JUMP',false],
 ],
});
