import type {CollectibleDefinition,DifficultyTier,EnemyDefinition,GateDefinition,HazardDefinition,LevelDefinition,LevelDesign,LevelEnvironment,LevelSection,PlatformDefinition,RouteAction,RouteNodeType,SwitchDefinition,WindZoneDefinition,DiscoveryBlockDefinition,CameraDefinition} from '../game-types';

/** A small authoring vocabulary for country levels written as JavaScript
 * modules. It only fills defaults and ids; every number that shapes play is
 * written in the country file, and the result is checked by validateLevel and
 * the LevelValidator exactly like a JSON level. */

/** The shared, measured explorer physics (Dmax 5.40, Hmax 1.95). */
export const explorerPhysics:LevelDefinition['physics']={gravity:20,jumpSpeed:9,runSpeed:6,acceleration:25,airControl:.65,coyoteTime:.12,jumpBuffer:.12,playerRadius:.2,playerHeight:1.83,killY:-7,iceGrip:.3,stepHeight:.4,climbSpeed:3.4};
export const closeCamera:CameraDefinition={height:2.6,look:1.75,follow:1,maxRise:0,distance:20.5};

const deep=new Set(['ground','cliff','slope','stairs','salt-flat','terrace','climb-wall','dune','lava','tepui','sand','cave','arch']);
type PlatformOptions=Partial<Omit<PlatformDefinition,'id'|'x'|'y'|'width'>>;
/** A platform: landforms (ground, cliffs, terraces...) run 12+ units down out
 * of view; ledges, branches, rafts and roofs default to a slab. */
export function platform(id:string,x:number,y:number,width:number,options:PlatformOptions={}):PlatformDefinition{
 const terrain=options.terrain??'ground',landform=deep.has(terrain);
 return{id,x,y,width,depth:landform?6:3,thickness:landform?13:.8,type:options.motion?'moving':'stone',motion:null,amplitude:0,phase:0,period:7.2,route:'main',terrain,...options};
}

export type EdgeSpec=[from:string,to:string,action:RouteAction,mandatory?:boolean];
export type LevelSpec={
 code:string;iso2:string;title:string;environmentId:string;tier:DifficultyTier;design:LevelDesign;environment:LevelEnvironment;sections:LevelSection[];
 platforms:PlatformDefinition[];spawn:[string,number];finish:[string,number];checkpoints:[string,number][];discovery:[string,number];
 /** [platformId, offset, height] */
 coins:[string,number,number?][];stars:[string,number,number][];
 edges:EdgeSpec[];nodeTypes?:Record<string,RouteNodeType>;
 hazards?:HazardDefinition[];enemies?:EnemyDefinition[];switches?:SwitchDefinition[];gates?:GateDefinition[];zones?:WindZoneDefinition[];discoveryBlocks?:DiscoveryBlockDefinition[];
 camera?:CameraDefinition;physics?:Partial<LevelDefinition['physics']>;
};

/** Build a complete route-graph level. Node types are inferred (start, finish,
 * checkpoint, puzzle plate, patrol, moving, optional reward) unless named. */
export function authorLevel(spec:LevelSpec):LevelDefinition{
 const prefix=spec.iso2.toLowerCase(),ids=new Set(spec.platforms.map(p=>p.id));
 const used=new Set(spec.edges.flatMap(([a,b])=>[a,b]));
 const missing=[...used].filter(id=>!ids.has(id));if(missing.length)throw new Error(`${spec.code}: edges name missing platforms ${missing.join(', ')}`);
 const typeOf=(p:PlatformDefinition):RouteNodeType=>{
  if(spec.nodeTypes?.[p.id])return spec.nodeTypes[p.id];
  if(p.id===spec.spawn[0])return'START';if(p.id===spec.finish[0])return'FINISH';
  if(spec.checkpoints.some(([id])=>id===p.id))return'CHECKPOINT';
  if((spec.switches||[]).some(s=>s.platformId===p.id)||p.raise)return'PUZZLE';
  if((spec.enemies||[]).some(e=>e.platformId===p.id))return'ENEMY_AREA';
  if(p.motion)return'MOVING_PLATFORM';if(p.route==='upper'||p.route==='bonus')return'OPTIONAL_REWARD';
  return p.terrain==='ground'&&p.width>=8?'SAFE_PLATFORM':'JUMP_PLATFORM';
 };
 const collectible=(kind:string)=>([platformId,offset,height]:[string,number,number?],i:number):CollectibleDefinition=>({id:`${prefix}-${kind}-${String(i+1).padStart(2,'0')}`,platformId,offset,height:height??1.1});
 const level:LevelDefinition={
  id:`${prefix}-level-01`,countryId:spec.iso2,legacyCode:spec.code,title:spec.title,environmentId:spec.environmentId,
  difficulty:(['easy','easy-medium','medium','hard','hard'] as const)[spec.tier-1],difficultyTier:spec.tier,design:spec.design,environment:spec.environment,sections:spec.sections,camera:spec.camera??closeCamera,
  spawn:{platformId:spec.spawn[0],offset:spec.spawn[1]},platforms:spec.platforms,
  coins:spec.coins.map(collectible('coin')),stars:spec.stars.map(collectible('star')),
  checkpoints:spec.checkpoints.map(([platformId,offset],i)=>({id:`${prefix}-checkpoint-${String(i+1).padStart(2,'0')}`,platformId,offset})),
  discovery:{id:`${prefix}-discovery`,platformId:spec.discovery[0],offset:spec.discovery[1],factId:`${prefix}-discovery`},
  finish:{platformId:spec.finish[0],offset:spec.finish[1]},hazards:spec.hazards||[],
  ...(spec.enemies?{enemies:spec.enemies}:{}),...(spec.switches?{switches:spec.switches}:{}),...(spec.gates?{gates:spec.gates}:{}),...(spec.zones?{zones:spec.zones}:{}),...(spec.discoveryBlocks?{discoveryBlocks:spec.discoveryBlocks}:{}),
  routeGraph:{nodes:spec.platforms.map(p=>({id:p.id,type:typeOf(p),platformId:p.id})),edges:spec.edges.map(([from,to,action,mandatory])=>({from,to,action,mandatory:mandatory??true}))},
  physics:{...explorerPhysics,...spec.physics},
 };
 return level;
}

/** Coins spread evenly along a platform, kept clear of its edges where a
 * player lands and takes off. Narrow platforms get one coin in the middle. */
export function spread(p:PlatformDefinition,count:number,height=1.1,range?:[number,number]):[string,number,number][]{
 if((p.width<3.4||count<=1)&&!range)return[[p.id,p.width/2,height]];
 const first=range?.[0]??Math.min(3.2,p.width*.3),last=range?.[1]??p.width-Math.min(1.6,p.width*.25);if(count<=1)return[[p.id,(first+last)/2,height]];
 return Array.from({length:count},(_,i)=>[p.id,first+(last-first)*i/(count-1),height]);
}
