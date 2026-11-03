import {africaLevel,platform,ledge} from './common';

/** Côte d’Ivoire — Yamoussoukro: The Basilica Dome. Tier 3 (Challenger).
 * Up the palm avenue and the travertine steps, across the capitals of the
 * curved colonnade, onto a maintenance lift that rises to the dome ring
 * (where a pigeon struts), along the cornices to a bell frame whose platform
 * swings in a long arc, then down the steps to the esplanade. A fountain
 * basin between the first capitals holds a star. */
export const level=africaLevel('CIV',{
 design:{archetype:'colonnade-and-dome-ring',signatureMechanic:'swinging-bell-platform-after-dome-lift',mechanics:['colonnade-capital-hops','dome-maintenance-lift','dome-ring-pigeon','cornice-hops','swinging-bell-platform','grand-stairs'],terrain:['ground','stairs','rock','mechanical','rooftop'],verticality:'high',enemyProfile:'light',targetDurationSeconds:60,seed:2026417},
 environment:{biome:'humid-savanna-city',locationReference:'Basilica of Our Lady of Peace, Yamoussoukro, Côte d’Ivoire',terrainMaterial:'travertine-and-marble',vegetationPack:'royal-palms-and-lawns',architecturePack:'domed-basilica-and-colonnades',landmarkAssets:['basilica-dome','colonnade-ring','travertine-plaza','palm-avenue','bell-frame'],lightingPreset:'humid-bright-noon',skyPreset:'tropical-cumulus'},
 sections:[{id:'A',label:'Palm avenue',x:0},{id:'B',label:'Grand steps',x:9},{id:'C',label:'Colonnade capitals',x:27},{id:'D',label:'Dome lift',x:43},{id:'E',label:'Dome ring',x:50},{id:'F',label:'Cornices',x:63},{id:'G',label:'Bell frame',x:73},{id:'H',label:'Esplanade',x:90}],
 platforms:[
  platform('ci-palms',-6,0,15,{style:'palm-avenue'}),
  platform('ci-steps',9,0,6,{terrain:'stairs',slope:1.6,steps:5,style:'travertine-steps'}),
  platform('ci-plaza',15,1.6,10,{style:'travertine-plaza'}),
  platform('ci-capital-1',28.2,2.2,2.2,{terrain:'rock',thickness:1,style:'column-capital'}),
  platform('ci-capital-2',33.6,2.6,2.2,{terrain:'rock',thickness:1,style:'column-capital'}),
  platform('ci-capital-3',39,3,2.2,{terrain:'rock',thickness:1,style:'column-capital'}),
  platform('ci-lift',44.6,3,3,{type:'moving',motion:'vertical',amplitude:1.6,period:7,pause:1,terrain:'mechanical',thickness:.4,style:'dome-lift'}),
  platform('ci-ring',50.8,5.2,10,{terrain:'rooftop',thickness:.8,style:'dome-ring'}),
  platform('ci-cornice-1',64,5,2.6,{terrain:'rooftop',thickness:.6,style:'cornice'}),
  platform('ci-cornice-2',69.8,5.4,2.6,{terrain:'rooftop',thickness:.6,style:'cornice'}),
  platform('ci-bell',77.2,4.4,2.4,{type:'moving',motion:'pendulum',length:4,amplitude:2,period:4.4,terrain:'mechanical',thickness:.4,style:'bell-platform'}),
  platform('ci-gallery',84.4,5,7,{terrain:'rooftop',thickness:.8,style:'bell-gallery'}),
  platform('ci-descent',91.4,5,6,{terrain:'stairs',slope:-2.4,steps:7,style:'travertine-steps'}),
  platform('ci-esplanade',97.4,2.6,13,{style:'esplanade'}),
  ledge('ci-fountain',30.8,1.1,1.8,{style:'fountain-basin'}),
 ],
 spawn:['ci-palms',4],finish:['ci-esplanade',11],discovery:['ci-esplanade',8],checkpoints:[['ci-ring',1.2],['ci-gallery',1.2]],
 enemies:[{id:'ci-pigeon',platformId:'ci-ring',minOffset:3.6,maxOffset:7,speed:1.1,turnPause:.5,height:.6}],
 discoveryBlocks:[{id:'ci-discovery-block',x:20,y:5.65,width:.75,height:.8,factId:'ci-discovery'}],
 stars:[['ci-fountain',.9,2],['ci-lift',1.5,2.4],['ci-cornice-2',1.3,2.2]],
 edges:[
  ['ci-palms','ci-steps','WALK'],['ci-steps','ci-plaza','WALK'],['ci-plaza','ci-capital-1','JUMP'],['ci-capital-1','ci-capital-2','JUMP'],['ci-capital-2','ci-capital-3','JUMP'],['ci-capital-3','ci-lift','RIDE_PLATFORM'],['ci-lift','ci-ring','JUMP'],
  ['ci-ring','ci-cornice-1','JUMP'],['ci-cornice-1','ci-cornice-2','JUMP'],['ci-cornice-2','ci-bell','RIDE_PLATFORM'],['ci-bell','ci-gallery','JUMP'],['ci-gallery','ci-descent','WALK'],['ci-descent','ci-esplanade','WALK'],
  ['ci-capital-1','ci-fountain','DROP',false],['ci-fountain','ci-capital-2','JUMP',false],
 ],
});
