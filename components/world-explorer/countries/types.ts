import type * as T from 'three';
import type {LevelDefinition,PlatformDefinition,PlatformState,WindPhase} from '../../../lib/world-explorer/game-types';
import type {CreatureState} from '../kit/creature';
import type {MechanismPalette} from '../kit/mechanisms';
import type {HazardPalette} from '../kit/hazards';

/** The contract between the shared engine and one country's scenery. The
 * engine owns physics, camera, collectibles, HUD and progress; a country only
 * supplies decorative geometry, materials, lighting and its patrol creature. */
export type EnvironmentContext={scene:T.Scene;renderer?:T.WebGLRenderer;level:LevelDefinition;finish:number;low:boolean;reducedMotion:boolean};
export type EnvironmentSignals={time:number;platforms:readonly PlatformState[];wind:{id:string;phase:WindPhase;strength:number;force:number}[];playerX:number};
export type MountedEnvironment={
 root:T.Group;
 update:(time:number,dt:number,signals:EnvironmentSignals)=>void;
 frame:(cameraX:number)=>void;
 setReducedMotion:(value:boolean)=>void;
 setView?:(view:'gameplay'|'overview')=>void;
 /** Runs after every platform is dressed and batched (for late material swaps). */
 finalize?:(scene:T.Scene,onReady:()=>void)=>{dispose:()=>void}|void;
 dispose:()=>void;
};
export type EnvironmentLighting={background:string;exposure:number;sun:string;sunIntensity:number;sky:string;ground:string;hemisphere:number;rim?:string;rimIntensity?:number;pixelRatio?:number;fog?:[string,number,number];overviewFog?:[number,number];reflections?:{zenith:string;horizon:string;ground:string;intensity:number}};
export type CountryEnvironment={
 id:string;
 info:{title:string;license:string;representation:string;landmarkSource:string;assets:string[]};
 lighting:EnvironmentLighting;
 mount:(context:EnvironmentContext)=>MountedEnvironment;
 dressPlatform:(root:T.Group,definition:PlatformDefinition,context:EnvironmentContext)=>void;
 createEnemy:(parent:T.Object3D)=>{root:T.Group;update:(time:number,facing:1|-1,state:CreatureState)=>void};
 createDiscoveryBlock:(parent:T.Object3D,width:number,height:number)=>T.Group;
 decorateCheckpoint:(marker:T.Group,context:EnvironmentContext)=>void;
 decorateFinish:(gate:T.Group,context:EnvironmentContext)=>void;
 /** Optional stone palette for gates and pressure plates, and rope colour for swings. */
 mechanisms?:MechanismPalette;
 ropeColor?:string;
 /** Colours for timed hazards (geyser steam, surf, calving ice). */
 hazardPalette?:HazardPalette;
};
