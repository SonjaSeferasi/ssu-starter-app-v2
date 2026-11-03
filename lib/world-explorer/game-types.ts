export type Difficulty=1|2|3|4;
export type MotionAxis='horizontal'|'vertical'|'pendulum';
/** `type` selects the collision role; `style` is only a rendering hint for the
 * country environment (for example `roman-arch`, `rope`, `raft` or `lift`).
 * `pause` holds a moving platform at each endpoint; `bob` adds a gentle
 * vertical wave to horizontal motion. `surface:'ice'` reduces grip locally.
 * `sagDepth` curves a wooden bridge's shared visible and collision surface.
 * `terrain` names the landform the scenery must build (continuous ground,
 * stairs, a canopy branch...); it never changes collision. `slope` raises the
 * right edge above `y` so ground can climb continuously; `steps` cuts that
 * rise into stair treads. A `pendulum` hangs on
 * a rope of `length` and swings `amplitude` units each side of its lowest
 * point. `collapse` crumbles a ledge `delay` seconds after it is stood on and
 * restores it after `respawn`. `bounce` launches a landing player upward.
 * `climbable` lets a player hold jump against the platform's side face to
 * climb it. `current` carries a standing player sideways (units per second).
 * `raise` keeps the platform sunk `drop` units below `y` until the named
 * pressure switch raises it; it stays up for `seconds` after the switch is
 * released and never sinks while the player stands on it. */
export type TerrainKind='ground'|'cliff'|'slope'|'stairs'|'arch'|'cave'|'rooftop'|'canopy'|'ice-shelf'|'sand'|'water-raft'|'mechanical'|'rock'|'bridge'|'salt-flat'|'terrace'|'climb-wall'|'dune'|'lava'|'tepui';
export type RaiseDefinition={switchId:string;drop:number;seconds:number};
export type PlatformDefinition={id:string;x:number;y:number;width:number;depth:number;thickness:number;type:'stone'|'wooden-bridge'|'wooden-moving'|'bridge'|'moving';motion:MotionAxis|null;amplitude:number;phase:number;period:number;route?:'main'|'upper'|'bonus';style?:string;surface?:'ice';pause?:number;bob?:number;sagDepth?:number;terrain?:TerrainKind;slope?:number;steps?:number;length?:number;collapse?:{delay:number;respawn:number};bounce?:number;climbable?:boolean;current?:number;raise?:RaiseDefinition};
export type CollectibleDefinition={id:string;platformId:string;offset:number;height:number};
export type TriggerDefinition={id:string;platformId:string;offset:number};
/** A hazard without `cycle` is always active (water, brine). With `cycle` it
 * erupts periodically: calm, then a visible `warning`, then `active` seconds
 * that hurt. `style` only tells the renderer what to draw (geyser, wave...). */
export type HazardCycle={period:number;warning:number;active:number;phase:number};
export type HazardDefinition={id:string;x:number;y:number;width:number;height:number;cycle?:HazardCycle;style?:string};
export type HazardPhase='calm'|'warning'|'active';
/** `turnPause` holds the patrol at each end. `height` shares the visible height
 * with collision; countries without it retain the 1.06-unit default. */
export type EnemyDefinition={id:string;platformId:string;minOffset:number;maxOffset:number;speed:number;turnPause?:number;height?:number};
export type EnemyState=EnemyDefinition&{x:number;y:number;z:0;direction:1|-1;state:'IDLE'|'PATROL_LEFT'|'PATROL_RIGHT'|'TURN'|'ALERT'|'STUNNED'|'DISABLED'};
/** x and y describe the centre of the block; its bottom is y-height/2. */
export type DiscoveryBlockDefinition={id:string;x:number;y:number;width:number;height:number;factId:string};
/** A periodic gust inside a bounded region. Each cycle is calm, then a visible
 * and audible warning, then a gust that pushes at `force` units per second. */
export type WindZoneDefinition={id:string;type:'wind';x:number;width:number;bottom:number;top:number;force:number;period:number;warning:number;duration:number;phase:number};
export type ZoneDefinition=WindZoneDefinition;
/** Standing on a pressure plate opens its gates for `openSeconds`; a gate never
 * closes on a player standing over it. A gate is a solid stone slab standing
 * on the floor at `y`; it sinks by its own height into the ground to open. */
/** A switch may also raise platforms that name it (`platform.raise`); its
 * `gateIds` may then be empty. */
export type SwitchDefinition={id:string;platformId:string;offset:number;gateIds:string[]};
export type GateDefinition={id:string;x:number;y:number;width:number;height:number;openSeconds:number};
/** A fictional sluice basin; its fill fraction is the validated raise actuator.
 * The water surface drives the crossing height, and submerged players recover. */
export type WaterBasinDefinition={id:string;platformId:string;x:number;width:number;z:number;depth:number;lowSurface:number;highSurface:number};
export type LightPuzzleDefinition={id:string;gateId:string;platformId:string;offset:number;height:number;emitter:{x:number;y:number};receiver:{x:number;y:number;radius:number};normals:[number,number][];initialIndex:number;chargeSeconds:number;range:number;occluders?:{x:number;y:number;width:number;height:number}[]};
export type LightPuzzleState={id:string;index:number;charge:number;lit:boolean};
export type WindPhase='calm'|'warning'|'gust';
export type LevelSection={id:'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H';label:string;x:number};
/** Route graph: what a player does to get from one place to the next. Nodes
 * name a platform; mandatory edges form the critical path to the finish. */
export type RouteNodeType='START'|'SAFE_PLATFORM'|'JUMP_PLATFORM'|'MOVING_PLATFORM'|'CHECKPOINT'|'PUZZLE'|'ENEMY_AREA'|'DISCOVERY'|'OPTIONAL_REWARD'|'FINISH';
export type RouteAction='WALK'|'JUMP'|'DROP'|'RIDE_PLATFORM'|'ACTIVATE_SWITCH'|'CLIMB'|'PASS_GATE';
export type RouteNode={id:string;type:RouteNodeType;platformId:string};
export type RouteEdge={from:string;to:string;action:RouteAction;mandatory:boolean};
export type RouteGraph={nodes:RouteNode[];edges:RouteEdge[]};
export type DifficultyTier=1|2|3|4|5;
/** The level's design identity, used by the similarity and difficulty checks
 * and by the production tracker. `archetype` and `signatureMechanic` are what
 * must make two countries play differently, not only look different. */
export type LevelDesign={archetype:string;signatureMechanic:string;mechanics:string[];terrain:TerrainKind[];verticality:'low'|'medium'|'high';enemyProfile:'none'|'light'|'moderate'|'heavy';targetDurationSeconds:number;seed:number};
/** Rendering and documentation metadata. It never changes collision. */
export type LevelEnvironment={biome:string;locationReference:string;terrainMaterial:string;vegetationPack:string;architecturePack:string;landmarkAssets:string[];lightingPreset:string;skyPreset:string;weatherPreset?:string};
/** Side-camera framing: base height, look height, how strongly it follows a
 * climb and the largest rise, in world units above the authored base. */
export type CameraDefinition={height:number;look:number;follow:number;maxRise:number;distance?:number};
export type LevelDefinition={
 id:string;countryId:string;legacyCode:string;title:string;environmentId:string;
 spawn:{platformId:string;offset:number};platforms:PlatformDefinition[];
 coins:CollectibleDefinition[];stars:CollectibleDefinition[];checkpoints:TriggerDefinition[];
 discovery:TriggerDefinition&{factId:string};finish:{platformId:string;offset:number};hazards:HazardDefinition[];
 enemies?:EnemyDefinition[];discoveryBlocks?:DiscoveryBlockDefinition[];mainRoute?:string[];upperRoute?:string[];
 waterBasins?:WaterBasinDefinition[];lightPuzzles?:LightPuzzleDefinition[];zones?:ZoneDefinition[];switches?:SwitchDefinition[];gates?:GateDefinition[];routeGraph?:RouteGraph;design?:LevelDesign;difficultyTier?:DifficultyTier;sections?:LevelSection[];environment?:LevelEnvironment;camera?:CameraDefinition;difficulty?:'easy'|'easy-medium'|'medium'|'hard';
 physics:{gravity:number;jumpSpeed:number;runSpeed:number;acceleration:number;airControl:number;coyoteTime:number;jumpBuffer:number;playerRadius:number;playerHeight:number;killY:number;iceGrip?:number;stepHeight?:number;climbSpeed?:number};
};
export type CollapsePhase='stable'|'shaking'|'falling'|'hidden';
export type PlatformState=PlatformDefinition&{baseX:number;baseY:number;dx:number;dy:number;collapsePhase?:CollapsePhase;collapseTime?:number;drop?:number;raised?:number;raiseTimer?:number};
export type GateState={id:string;open:number;timer:number};
export type SimulationStatus='playing'|'paused'|'discovery'|'respawning'|'completed'|'failed';
export type ExplorerAnimation='idle'|'run'|'jump'|'fall'|'land'|'collect'|'celebrate'|'damage'|'respawn'|'climb';
export type SimulationState={
 x:number;y:number;z:0;vx:number;vy:number;grounded:boolean;standing:string|null;hearts:number;climbing?:boolean;
 coins:number;stars:number;checkpointId:string|null;discoveryFound:boolean;elapsedSeconds:number;
 status:SimulationStatus;animation:ExplorerAnimation;facing:1|-1;invulnerable:number;
};
export type SimulationInput={left:boolean;right:boolean;jump:boolean;interact?:boolean};
export type SimulationEvent={type:'coin'|'star'|'checkpoint'|'discovery'|'block'|'damage'|'respawn'|'finish'|'failed'|'wind-warning'|'wind'|'switch'|'gate-open'|'gate-closing'|'collapse'|'bounce'|'hazard-warning'|'hazard'|'raise'|'lower'|'climb'|'mirror-turn'|'light-aligned';id?:string};
export type CountryStats={hearts:number;coins:number;totalCoins:number;stars:number;totalStars:number;checkpointActive:boolean;checkpointId?:string|null;timeSeconds:number;discoveryFound:boolean;collectedStarIds?:string[]};
export type CountryRunResult={stars:number;elapsedMs:number;discoveryFound:boolean};
export type CountryCallbacks={
 onProgress:(percent:number)=>void;onFinish:(coins?:number,result?:CountryRunResult)=>void;onReady:()=>void;
 onFail?:()=>void;onError?:(message:string)=>void;onStats?:(stats:CountryStats)=>void;onDiscovery?:()=>void;
 onPerformance?:(stats:{fps:number;drawCalls:number;triangles:number})=>void;
};
export type ExplorerRunPreferences={explorerAssist?:boolean;reducedMotion?:boolean;graphicsQuality?:'standard'|'low';musicVolume?:number;effectsVolume?:number};
