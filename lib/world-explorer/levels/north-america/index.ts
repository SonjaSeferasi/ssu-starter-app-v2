import {authorLevel,platform as p,spread,type EdgeSpec} from '../author';
import type {LevelDefinition,PlatformDefinition,DifficultyTier,GateDefinition,SwitchDefinition,WindZoneDefinition} from '../../game-types';
import {northAmericaPlaces,type NorthAmericaCode} from '../../north-america';
import {northAmericaPatrols} from '../../north-america-patrols';

type Course={tier:DifficultyTier;platforms:PlatformDefinition[];route:string[];bonus:string[];checkpoints:string[];stars:[string,number,number][];sections:[string,number][];switches?:SwitchDefinition[];gates?:GateDefinition[];zones?:WindZoneDefinition[]};

function build(code:NorthAmericaCode,c:Course):LevelDefinition{
 const place=northAmericaPlaces[code],prefix=place.iso2.toLowerCase(),byId=new Map(c.platforms.map(p=>[p.id,p]));
 const edges:EdgeSpec[]=c.route.slice(1).map((to,i)=>{const a=byId.get(c.route[i])!,b=byId.get(to)!;return[a.id,b.id,b.raise?'ACTIVATE_SWITCH':b.climbable?'CLIMB':b.motion||a.motion?'RIDE_PLATFORM':b.y<a.y-1?'DROP':b.x-a.x-a.width<.1?'WALK':'JUMP'];});
 for(let i=1;i<c.bonus.length;i++)edges.push([c.bonus[i-1],c.bonus[i],'JUMP',false]);
 const finish=byId.get(c.route.at(-1)!)!,start=byId.get(c.route[0])!;
 return authorLevel({code,iso2:place.iso2,title:place.title,environmentId:code==='CAN'?'canada-rockies-alpine':code==='USA'?'usa-new-york-harbor':'north-america-'+prefix,tier:c.tier,
  design:{archetype:place.theme+'-expedition',signatureMechanic:place.signature,mechanics:[place.signature,'optional-star-detour','checkpoint-recovery','country-patrol'],terrain:[...new Set(c.platforms.map(p=>p.terrain!))],verticality:code==='GTM'||code==='JAM'?'high':'medium',enemyProfile:'light',targetDurationSeconds:55,seed:20261100+code.charCodeAt(0)},
  environment:{biome:place.theme,locationReference:place.landmark,terrainMaterial:code==='CAN'?'alpine-rock':code==='USA'?'harbor-brick':'weathered-limestone',vegetationPack:code==='CAN'?'spruce':code==='USA'?'harbor-trees':'tropical-forest',architecturePack:code==='MEX'||code==='GTM'?'maya-stone-monuments':'trail-and-crossing',landmarkAssets:[...place.features],lightingPreset:'warm-directional-daylight',skyPreset:code==='CRI'?'cloud-forest-mist':'clear-layered-sky'},
  camera:{height:2.8,look:1.8,follow:1,maxRise:5,distance:21},platforms:c.platforms,
  sections:c.sections.map(([label,x],i)=>({id:('ABCDEFGH'[i]) as 'A',label,x})),
  spawn:[start.id,2],finish:[finish.id,finish.width-2],discovery:[finish.id,2.2],checkpoints:c.checkpoints.map(s=>[s,1.2]),
  coins:c.platforms.flatMap(platform=>code==='CAN'&&platform.id==='ca-ridge'?[[platform.id,1.5,1.05] as [string,number,number]]:spread(platform,platform.width>=9?3:1,1.05)),stars:c.stars,
  edges,switches:c.switches,gates:c.gates,zones:c.zones,
  enemies:northAmericaPatrols[code],
 });
}
// Coordinates below are authored per country. Gaps grow after the mechanic's
// safe introduction; long stable banks are checkpoints and recovery spaces.
const canada=build('CAN',{tier:3,
 platforms:[p('ca-start',-5,.4,15),p('ca-snow-ledge',12.5,.7,7,{surface:'ice',terrain:'ice-shelf'}),p('ca-ridge',22.2,1,8),p('ca-bridge',30.2,1,12,{type:'bridge',terrain:'bridge'}),p('ca-rest',44.8,1,10),p('ca-lift',57.7,.8,4,{motion:'vertical',amplitude:.55,period:6.8,terrain:'mechanical'}),p('ca-pass',64.6,1.3,8),p('ca-ice',75.6,1.6,7,{surface:'ice',terrain:'ice-shelf'}),p('ca-summit',85.7,1.6,9),p('ca-finish',97.5,1.2,13),p('ca-star-island',42.5,2.3,1.8,{route:'bonus',terrain:'rock',thickness:.5})],
 route:['ca-start','ca-snow-ledge','ca-ridge','ca-bridge','ca-rest','ca-lift','ca-pass','ca-ice','ca-summit','ca-finish'],bonus:['ca-bridge','ca-star-island','ca-rest'],checkpoints:['ca-rest','ca-summit'],stars:[['ca-star-island',.9,1.2],['ca-pass',4,2.4],['ca-ice',3.5,2.3]],sections:[['Trailhead / learn to brake',0],['Timber gorge',23],['Lift crossing',45],['Exposed pass',73],['Alpine lookout',97]],
 zones:[{id:'ca-pass-gust',type:'wind',x:74,width:10,bottom:-1,top:6,force:-1.4,period:7,warning:1.8,duration:1.2,phase:0}],
});
const usa=build('USA',{tier:2,
 platforms:[p('us-start',-5,.4,15),p('us-dock',12.2,.4,12,{terrain:'rooftop'}),p('us-ferry',26.4,.4,5,{motion:'horizontal',amplitude:.55,period:6.5,terrain:'water-raft'}),p('us-quay',34.2,.4,12),p('us-cargo-lift',48.6,.5,4,{motion:'vertical',amplitude:.5,period:6,terrain:'mechanical'}),p('us-warehouse',55,1,13,{terrain:'rooftop'}),p('us-brick',70.6,1,8,{terrain:'terrace'}),p('us-gantry',81.3,1.3,6,{terrain:'mechanical'}),p('us-finish',89.9,1,14),p('us-roof-star',68.5,2.2,1.6,{route:'bonus',terrain:'rooftop',thickness:.4})],
 route:['us-start','us-dock','us-ferry','us-quay','us-cargo-lift','us-warehouse','us-brick','us-gantry','us-finish'],bonus:['us-warehouse','us-roof-star','us-brick'],checkpoints:['us-quay','us-brick'],stars:[['us-roof-star',.8,1.15],['us-dock',8,2.4],['us-gantry',3,2.3]],sections:[['Dock plate',0],['Ferry timing',24],['Cargo lift',44],['Warehouse patrol',55],['Liberty lookout',89]],
 switches:[{id:'us-dock-plate',platformId:'us-dock',offset:3,gateIds:['us-dock-gate']}],gates:[{id:'us-dock-gate',x:22,y:.4,width:.6,height:2.5,openSeconds:7}],
});
const mexico=build('MEX',{tier:3,
 platforms:[p('mx-start',-5,.3,15,{terrain:'terrace'}),p('mx-court',12.6,.7,12,{terrain:'terrace'}),p('mx-stone-1',27.4,.7,4,{terrain:'rock',raise:{switchId:'mx-cenote-plate',drop:2.2,seconds:12}}),p('mx-stone-2',34.4,.7,4,{terrain:'rock',raise:{switchId:'mx-cenote-plate',drop:2.2,seconds:12}}),p('mx-bank',41.4,.7,12,{terrain:'terrace'}),p('mx-stairs',53.4,.7,7,{terrain:'stairs',slope:1.2,steps:4}),p('mx-upper-court',63.4,1.9,9,{terrain:'terrace'}),p('mx-column',75.4,2.3,4,{terrain:'terrace'}),p('mx-finish',82.5,2.3,14,{terrain:'terrace'}),p('mx-observatory-spur',60.8,3,1.6,{route:'bonus',terrain:'rock',thickness:.4})],
 route:['mx-start','mx-court','mx-stone-1','mx-stone-2','mx-bank','mx-stairs','mx-upper-court','mx-column','mx-finish'],bonus:['mx-stairs','mx-observatory-spur','mx-upper-court'],checkpoints:['mx-court','mx-bank','mx-upper-court'],stars:[['mx-observatory-spur',.8,1.2],['mx-bank',7,2.3],['mx-column',2,2.4]],sections:[['Limestone causeway',0],['Raise the cenote stones',13],['Dry-bank refuge',41],['Terrace ascent',54],['Observatory lookout',82]],
 switches:[{id:'mx-cenote-plate',platformId:'mx-court',offset:9,gateIds:[]}],
});
const guatemala=build('GTM',{tier:3,
 platforms:[p('gt-start',-5,.3,15),p('gt-plaza',12.6,.7,10,{terrain:'terrace'}),p('gt-stairs',22.6,.7,7,{terrain:'stairs',slope:1.2,steps:4}),p('gt-temple-bank',32.6,1.9,11,{terrain:'terrace'}),p('gt-log-1',46.6,1.9,4,{terrain:'canopy',collapse:{delay:1.6,respawn:4.5}}),p('gt-log-2',53.6,1.9,4,{terrain:'canopy',collapse:{delay:1.5,respawn:4.5}}),p('gt-reservoir-bank',60.6,1.9,11),p('gt-ruin-step',74.6,2.6,6,{terrain:'terrace'}),p('gt-upper-ruins',83.6,3.2,8,{terrain:'terrace'}),p('gt-finish',94.6,3.2,14,{terrain:'terrace'}),p('gt-canopy-spur',72.3,3.1,1.6,{route:'bonus',terrain:'canopy',thickness:.4})],
 route:['gt-start','gt-plaza','gt-stairs','gt-temple-bank','gt-log-1','gt-log-2','gt-reservoir-bank','gt-ruin-step','gt-upper-ruins','gt-finish'],bonus:['gt-reservoir-bank','gt-canopy-spur','gt-ruin-step'],checkpoints:['gt-temple-bank','gt-reservoir-bank'],stars:[['gt-canopy-spur',.8,1.1],['gt-plaza',6,2.4],['gt-upper-ruins',4,2.4]],sections:[['Forest causeway',0],['Stone stair',23],['Fallen-log crossing',44],['Reservoir refuge',61],['Temple skyline',94]],
});
const costaRica=build('CRI',{tier:2,
 platforms:[p('cr-start',-5,.5,15),p('cr-root',12.2,.8,8),p('cr-basket-1',22.7,.7,4,{terrain:'mechanical',motion:'vertical',amplitude:.5,period:7}),p('cr-canopy-rest',29.3,1.2,12,{terrain:'canopy',thickness:1.2}),p('cr-rope',41.3,1.2,13,{terrain:'bridge',type:'wooden-bridge',sagDepth:.35}),p('cr-tree-bank',56.8,1.2,10),p('cr-basket-2',69.4,1.1,4,{terrain:'mechanical',motion:'horizontal',amplitude:.5,period:6.8}),p('cr-branch',76.1,1.5,7,{terrain:'canopy',thickness:1.1}),p('cr-finish',85.7,1.5,14),p('cr-orchid-spur',54.5,2.4,1.7,{route:'bonus',terrain:'canopy',thickness:.4})],
 route:['cr-start','cr-root','cr-basket-1','cr-canopy-rest','cr-rope','cr-tree-bank','cr-basket-2','cr-branch','cr-finish'],bonus:['cr-rope','cr-orchid-spur','cr-tree-bank'],checkpoints:['cr-canopy-rest','cr-tree-bank'],stars:[['cr-orchid-spur',.85,1.2],['cr-root',4,2.3],['cr-branch',3.5,2.4]],sections:[['Forest floor',0],['Basket lesson',21],['Suspension bridge',41],['Canopy transfer',67],['Cloud-forest lookout',85]],
});
const jamaica=build('JAM',{tier:3,
 platforms:[p('jm-start',-5,.2,15),p('jm-shallows',12.6,.2,9,{terrain:'rock',current:-1.1}),p('jm-dry-bank',24.6,.6,10),p('jm-cascade-1',37.6,1.2,6,{terrain:'rock',current:-1.3}),p('jm-cascade-2',46.6,1.8,6,{terrain:'rock',surface:'ice'}),p('jm-pool-bank',55.6,2.3,11),p('jm-cascade-3',69.6,2.9,6,{terrain:'rock',current:-1.4}),p('jm-cascade-4',78.6,3.5,6,{terrain:'rock',surface:'ice'}),p('jm-finish',87.6,4.1,14),p('jm-fern-spur',67.2,3.5,1.6,{terrain:'rock',route:'bonus',thickness:.4})],
 route:['jm-start','jm-shallows','jm-dry-bank','jm-cascade-1','jm-cascade-2','jm-pool-bank','jm-cascade-3','jm-cascade-4','jm-finish'],bonus:['jm-pool-bank','jm-fern-spur','jm-cascade-3'],checkpoints:['jm-dry-bank','jm-pool-bank'],stars:[['jm-fern-spur',.8,1.2],['jm-dry-bank',6,2.4],['jm-cascade-3',3,2.2]],sections:[['River mouth',0],['Current lesson',12],['Wet cascade steps',37],['Dry-pool refuge',55],['Upper falls',78]],
});
export const northAmericaLevels:Record<NorthAmericaCode,LevelDefinition>={CAN:canada,USA:usa,MEX:mexico,GTM:guatemala,CRI:costaRica,JAM:jamaica};
