import {countries} from './catalog';
import {countryProfile,type LandmarkKind} from './profiles';
import {authoredLevels} from './authored-levels';
import type {DifficultyTier,TerrainKind} from './game-types';

/** The level design manifest for all 193 UN member states: the production
 * tracker. Authored levels carry their real design data; every other entry is
 * a proposal generated from the country's landscape profile and is marked
 * unreviewed until a person approves it. Antarctica stays a separate
 * expedition and is not counted toward the 193. */

export type MechanicId='moving-platform'|'vertical-lift'|'pendulum-swing'|'collapsing-ledge'|'ice-surface'|'wind-gusts'|'water-hazard'|'pressure-plate'|'timed-gate'|'bounce-pad'|'stairs-and-slopes'|'patrol-enemy'|'climbable-wall'|'switch-raised-platform'|'timed-hazard'|'circular-platform'|'pushable-block'|'breakable-obstacle'|'conveyor'|'falling-debris'|'low-visibility'|'water-current';
/** What the shared engine can run today. Planned mechanics are design
 * vocabulary only; a proposal that needs one cannot be built until it exists. */
export const mechanics:{id:MechanicId;name:string;status:'implemented'|'planned';field:string}[]=[
 {id:'moving-platform',name:'Moving platform (eased, paused, bobbing)',status:'implemented',field:'platform.motion=horizontal|vertical, pause, bob'},
 {id:'vertical-lift',name:'Lift / elevator',status:'implemented',field:"platform.motion='vertical'"},
 {id:'pendulum-swing',name:'Swinging platform on a rope or vine',status:'implemented',field:"platform.motion='pendulum', length"},
 {id:'collapsing-ledge',name:'Collapsing ledge that returns',status:'implemented',field:'platform.collapse={delay,respawn}'},
 {id:'ice-surface',name:'Slippery ice',status:'implemented',field:"platform.surface='ice', physics.iceGrip"},
 {id:'wind-gusts',name:'Warned, periodic wind gusts',status:'implemented',field:'zones[type=wind]'},
 {id:'water-hazard',name:'Water or lava that respawns the player',status:'implemented',field:'hazards[]'},
 {id:'pressure-plate',name:'Pressure plate',status:'implemented',field:'switches[]'},
 {id:'timed-gate',name:'Timed stone gate',status:'implemented',field:'gates[]'},
 {id:'bounce-pad',name:'Bounce pad',status:'implemented',field:'platform.bounce'},
 {id:'stairs-and-slopes',name:'Walkable stairs and slopes',status:'implemented',field:'platform.slope, steps; physics.stepHeight'},
 {id:'patrol-enemy',name:'Patrol creature (IDLE/PATROL/TURN/ALERT/STUNNED/DISABLED)',status:'implemented',field:'enemies[]'},
 {id:'climbable-wall',name:'Climbable face (hold jump against it)',status:'implemented',field:'platform.climbable, physics.climbSpeed'},
 {id:'switch-raised-platform',name:'Platform raised by a pressure switch for a window',status:'implemented',field:'platform.raise={switchId,drop,seconds}'},
 {id:'timed-hazard',name:'Warned, periodic hazard (geyser, wave surge, steam)',status:'implemented',field:'hazards[].cycle, style'},
 {id:'falling-debris',name:'Warned falling debris (calving ice, rockfall)',status:'implemented',field:"hazards[].cycle, style='calving'|'rockfall'"},
 {id:'water-current',name:'Water current that carries a standing player',status:'implemented',field:'platform.current'},
 {id:'circular-platform',name:'Circular-path platform',status:'planned',field:'—'},
 {id:'pushable-block',name:'Pushable block',status:'planned',field:'—'},
 {id:'breakable-obstacle',name:'Breakable obstacle',status:'planned',field:'—'},
 {id:'conveyor',name:'Conveyor surface',status:'planned',field:'—'},
 {id:'low-visibility',name:'Fog or darkness with lanterns',status:'planned',field:'—'},
];

/** Layout archetypes: the structural families a level is drawn from. */
export const archetypes:{id:string;summary:string;terrain:TerrainKind[];signatures:MechanicId[]}[]=[
 {id:'desert-ruins-mechanism',summary:'Plateau and stairs into ruins with a switch-and-gate puzzle',terrain:['ground','sand','stairs','arch'],signatures:['timed-gate','pressure-plate','wind-gusts']},
 {id:'canopy-river-traversal',summary:'Launch into a canopy, swing across, ford a river',terrain:['ground','canopy','water-raft','stairs'],signatures:['pendulum-swing','bounce-pad','moving-platform']},
 {id:'vertical-cliff-precision',summary:'Climb a cliff face and cross hazards high above water',terrain:['cliff','ice-shelf','rooftop','stairs'],signatures:['collapsing-ledge','wind-gusts','ice-surface']},
 {id:'mountain-switchback-ascent',summary:'Long slopes and stair paths zig-zagging up to a pass',terrain:['slope','stairs','cliff','ground'],signatures:['stairs-and-slopes','wind-gusts','collapsing-ledge','vertical-lift']},
 {id:'coastal-boardwalk-tides',summary:'Boardwalks, piers and rocks with tide-timed crossings',terrain:['bridge','rock','water-raft','ground'],signatures:['moving-platform','water-hazard','bounce-pad']},
 {id:'island-hopping',summary:'Short islands, rafts and reef rocks over open water',terrain:['sand','water-raft','rock'],signatures:['moving-platform','bounce-pad','water-hazard']},
 {id:'old-town-rooftop-run',summary:'Streets, stair alleys and rooftops with awnings',terrain:['rooftop','stairs','ground'],signatures:['bounce-pad','vertical-lift','timed-gate']},
 {id:'castle-rampart-climb',summary:'Moat, drawbridge gate, ramparts and towers',terrain:['ground','stairs','rooftop','arch'],signatures:['timed-gate','pressure-plate','patrol-enemy']},
 {id:'palace-garden-terraces',summary:'Formal terraces, fountains and hedge courts',terrain:['ground','stairs','arch'],signatures:['pressure-plate','bounce-pad','moving-platform']},
 {id:'tower-ascent',summary:'A vertical climb around a tall structure with lifts',terrain:['mechanical','stairs','rooftop'],signatures:['vertical-lift','wind-gusts','moving-platform']},
 {id:'wetland-stilt-walk',summary:'Reed beds, stilt walks and floating logs',terrain:['bridge','water-raft','ground'],signatures:['collapsing-ledge','moving-platform','water-hazard']},
 {id:'savanna-plains-run',summary:'Long continuous ground, kopjes and patrols to time',terrain:['ground','rock','slope'],signatures:['patrol-enemy','bounce-pad','stairs-and-slopes']},
 {id:'glacier-crevasse-crossing',summary:'Ice shelves, crevasses and snow bridges',terrain:['ice-shelf','cliff','slope'],signatures:['ice-surface','collapsing-ledge','wind-gusts']},
 {id:'harbour-crane-docks',summary:'Quays, crane lifts and moored boats',terrain:['bridge','mechanical','water-raft'],signatures:['vertical-lift','moving-platform','water-hazard']},
 {id:'courtyard-arcades',summary:'Arcaded courtyards, domes and gated passages',terrain:['ground','arch','stairs'],signatures:['timed-gate','pressure-plate','stairs-and-slopes']},
 {id:'canyon-mesa-wind',summary:'Mesas and arches across a windy canyon',terrain:['cliff','arch','sand'],signatures:['wind-gusts','collapsing-ledge','moving-platform']},
 {id:'forest-treetop-bridges',summary:'Forest floor, trunks and rope bridges between trees',terrain:['ground','canopy','bridge'],signatures:['pendulum-swing','collapsing-ledge','patrol-enemy']},
 {id:'rolling-hills-meadow',summary:'Continuous rolling hills with dips and ridges',terrain:['ground','slope'],signatures:['stairs-and-slopes','bounce-pad','patrol-enemy']},
];

const archetypeFor:Record<LandmarkKind,string[]>={
 pyramid:['desert-ruins-mechanism','courtyard-arcades'],ruins:['desert-ruins-mechanism','canyon-mesa-wind','courtyard-arcades','palace-garden-terraces'],desert:['canyon-mesa-wind','desert-ruins-mechanism'],
 rainforest:['canopy-river-traversal','forest-treetop-bridges'],forest:['forest-treetop-bridges','canopy-river-traversal'],wetland:['wetland-stilt-walk','coastal-boardwalk-tides'],savanna:['savanna-plains-run','rolling-hills-meadow'],
 mountain:['mountain-switchback-ascent','vertical-cliff-precision','glacier-crevasse-crossing'],glacier:['glacier-crevasse-crossing','vertical-cliff-precision'],
 island:['island-hopping','coastal-boardwalk-tides'],harbour:['harbour-crane-docks','coastal-boardwalk-tides'],bridge:['harbour-crane-docks','tower-ascent'],
 'old-town':['old-town-rooftop-run','castle-rampart-climb','courtyard-arcades'],castle:['castle-rampart-climb','old-town-rooftop-run'],palace:['palace-garden-terraces','courtyard-arcades'],
 tower:['tower-ascent','old-town-rooftop-run'],cathedral:['tower-ascent','old-town-rooftop-run'],mosque:['courtyard-arcades','palace-garden-terraces'],pagoda:['tower-ascent','palace-garden-terraces'],
 civic:['palace-garden-terraces','old-town-rooftop-run'],'research-station':['glacier-crevasse-crossing'],
};
/** How demanding a landscape naturally is, before the quota balance. */
const landscapeWeight:Record<string,number>={grassland:0,coastal:.6,temperate:.8,forest:1.2,desert:1.4,tropical:1.6,alpine:2.6};

export type DesignStatus='playable'|'template'|'planned';
export type DesignRecord={
 code:string;iso2:string;name:string;continent:string;levelId:string;
 /** playable: a validated route-graph level; template: playable on the first
  * shared template and due for redesign; planned: a proposal only. */
 status:DesignStatus;reviewed:boolean;archetype:string;signatureMechanic:string;difficultyTier:DifficultyTier;
 biome:string;landmark:string;terrain:TerrainKind[];mechanicsReady:boolean;
};

const hash=(text:string)=>[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);
/** Measured tiers of the template levels (see difficulty.ts; tested). */
const templateTiers:Record<string,DifficultyTier>={JPN:1,ITA:3,CAN:3,AUS:3,IND:3,ZAF:3,FRA:2,USA:3};
export const tierQuota:Record<DifficultyTier,number>={1:39,2:39,3:39,4:38,5:38};

let cache:DesignRecord[]|null=null;
export function designManifest():DesignRecord[]{
 if(cache)return cache;
 const members=countries.filter(country=>country.code!=='ANTARCTICA'),records:DesignRecord[]=[],remaining={...tierQuota};
 const used=new Map<string,number>();
 for(const country of members){
  const level=authoredLevels[country.code] as {id:string;difficultyTier?:DifficultyTier;design?:{archetype:string;signatureMechanic:string;terrain:TerrainKind[]}}|undefined;
  const profile=countryProfile(country.code),kind=profile?.landmarkKind||'old-town';
  let archetype:string,signature:string,tier:DifficultyTier|0=0,status:DesignStatus='planned',terrain:TerrainKind[];
  if(level?.design&&level.difficultyTier){archetype=level.design.archetype;signature=level.design.signatureMechanic;tier=level.difficultyTier;status='playable';terrain=level.design.terrain;}
  else{
   // Rotate through the fitting archetypes and their signatures so neighbours
   // in a landscape family do not repeat the same structure.
   const options=archetypeFor[kind]||archetypeFor['old-town'],count=used.get(kind)||0;used.set(kind,count+1);
   const chosen=archetypes.find(a=>a.id===options[(count+hash(country.code))%options.length])!;
   archetype=chosen.id;signature=chosen.signatures[Math.floor(count/options.length)%chosen.signatures.length];terrain=chosen.terrain;
   if(level){status='template';tier=templateTiers[country.code]??2;}
  }
  if(tier)remaining[tier as DifficultyTier]--;
  records.push({code:country.code,iso2:country.iso2,name:country.name,continent:country.continent,levelId:level?.id||`${country.iso2.toLowerCase()}-level-01`,status,reviewed:false,archetype,signatureMechanic:signature,difficultyTier:(tier||1) as DifficultyTier,biome:profile?.biome||country.biome,landmark:profile?.landmarkName||country.landmark,terrain,mechanicsReady:true});
 }
 // Proposed tiers fill the remaining quota in order of landscape demand, so
 // the full set lands exactly on the 39/39/39/38/38 distribution.
 const planned=records.filter(record=>record.status==='planned').sort((a,b)=>(landscapeWeight[a.biome]??1)-(landscapeWeight[b.biome]??1)||(hash(a.code)%997)-(hash(b.code)%997));
 let tier:DifficultyTier=1;
 for(const record of planned){while(remaining[tier]<=0&&tier<5)tier=(tier+1) as DifficultyTier;record.difficultyTier=tier;remaining[tier]--;}
 const ready=new Set(mechanics.filter(m=>m.status==='implemented').map(m=>m.id));
 for(const record of records)record.mechanicsReady=record.status==='playable'||ready.has(record.signatureMechanic as MechanicId);
 cache=records;return records;
}
export function designRecord(code:string){return designManifest().find(record=>record.code===code.toUpperCase());}

/** Card status: a level is completed, playable, or still under development
 * (a scenery preview of a planned design). There is no tier lock: any built
 * level can be chosen in any order. Its tier describes the gameplay design,
 * not the country, and is shown so a player can pick their own challenge. */
export type CardStatus='completed'|'playable'|'under-development';
export function cardStatus(code:string,completed:ReadonlySet<string>):CardStatus{
 const record=designRecord(code);if(!record)return'under-development';
 if(completed.has(record.code))return'completed';
 return record.status==='planned'?'under-development':'playable';
}

/** Production tracker summary for the documentation and tests. */
export function productionSummary(){
 const records=designManifest(),count=<K extends keyof DesignRecord>(key:K)=>records.reduce((map,record)=>map.set(String(record[key]),(map.get(String(record[key]))||0)+1),new Map<string,number>());
 return{total:records.length,status:Object.fromEntries(count('status')),tiers:Object.fromEntries(count('difficultyTier')),archetypes:Object.fromEntries(count('archetype')),reviewed:records.filter(record=>record.reviewed).length,blockedByMechanics:records.filter(record=>!record.mechanicsReady).length};
}
