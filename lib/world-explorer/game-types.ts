export type Difficulty=1|2|3|4;
export type MotionAxis='horizontal'|'vertical';
export type PlatformDefinition={id:string;x:number;y:number;width:number;depth:number;thickness:number;type:'stone'|'wooden-bridge'|'wooden-moving';motion:MotionAxis|null;amplitude:number;phase:number;period:number};
export type CollectibleDefinition={id:string;platformId:string;offset:number;height:number};
export type TriggerDefinition={id:string;platformId:string;offset:number};
export type HazardDefinition={id:string;x:number;y:number;width:number;height:number};
export type LevelDefinition={
 id:string;countryId:string;legacyCode:string;title:string;environmentId:string;
 spawn:{platformId:string;offset:number};platforms:PlatformDefinition[];
 coins:CollectibleDefinition[];stars:CollectibleDefinition[];checkpoints:TriggerDefinition[];
 discovery:TriggerDefinition&{factId:string};finish:{platformId:string;offset:number};hazards:HazardDefinition[];
 physics:{gravity:number;jumpSpeed:number;runSpeed:number;acceleration:number;airControl:number;coyoteTime:number;jumpBuffer:number;playerRadius:number;playerHeight:number;killY:number};
};
export type PlatformState=PlatformDefinition&{baseX:number;baseY:number;dx:number;dy:number};
export type SimulationStatus='playing'|'paused'|'discovery'|'respawning'|'completed'|'failed';
export type ExplorerAnimation='idle'|'run'|'jump'|'fall'|'land'|'collect'|'celebrate'|'damage'|'respawn';
export type SimulationState={
 x:number;y:number;z:0;vx:number;vy:number;grounded:boolean;standing:string|null;hearts:number;
 coins:number;stars:number;checkpointId:string|null;discoveryFound:boolean;elapsedSeconds:number;
 status:SimulationStatus;animation:ExplorerAnimation;facing:1|-1;invulnerable:number;
};
export type SimulationInput={left:boolean;right:boolean;jump:boolean};
export type SimulationEvent={type:'coin'|'star'|'checkpoint'|'discovery'|'damage'|'respawn'|'finish'|'failed';id?:string};
export type CountryStats={hearts:number;coins:number;totalCoins:number;stars:number;totalStars:number;checkpointActive:boolean;timeSeconds:number;discoveryFound:boolean};
export type CountryRunResult={stars:number;elapsedMs:number;discoveryFound:boolean};
export type CountryCallbacks={
 onProgress:(percent:number)=>void;onFinish:(coins?:number,result?:CountryRunResult)=>void;onReady:()=>void;
 onFail?:()=>void;onError?:(message:string)=>void;onStats?:(stats:CountryStats)=>void;onDiscovery?:()=>void;
 onPerformance?:(stats:{fps:number;drawCalls:number;triangles:number})=>void;
};
export type ExplorerRunPreferences={reducedMotion?:boolean;graphicsQuality?:'standard'|'low';musicVolume?:number;effectsVolume?:number};
