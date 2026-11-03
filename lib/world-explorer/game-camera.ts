import type {CameraDefinition,LevelDefinition} from './game-types';

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/** The tuned Japan reference framing is the default for every authored level. */
const referenceCamera:CameraDefinition={height:4.4,look:1.35,follow:.35,maxRise:1.25};

/** Hold the horizon through ordinary jumps, follow a new landing elevation,
 * and keep a long fall from carrying the player beneath the viewport. */
export function cameraTrackingHeight(previous:number,y:number,grounded:boolean){
 return grounded?y:y<previous-2.5?y+2.5:previous;
}

/** The close gameplay camera for redesigned levels. At the authored distance a
 * 1.83-unit player fills about 9-12% of the view height; 18% of the view width
 * of look-ahead keeps them on the left third with the next obstacles visible.
 * `y` is the tracked ground height, so the view climbs with the terrain while
 * ordinary jumps leave it still. Portrait screens pull back to keep the lead. */
export function gameplayCameraFrame(level:LevelDefinition,camera:CameraDefinition,x:number,y:number,aspect:number){
 const last=level.platforms.find(p=>p.id===level.finish.platformId)!,spawn=level.platforms.find(p=>p.id===level.spawn.platformId)!;
 const ratio=Math.max(.35,Math.min(aspect,2.4)),z=(camera.distance||20)*(ratio<1?1.25:1);
 const visibleWidth=2*Math.tan(44*Math.PI/360)*z*ratio,lead=visibleWidth*.18,start=spawn.x+level.spawn.offset+lead;
 const ground=spawn.y+(y-spawn.y)*camera.follow;
 return{x:clamp(x+lead,start,Math.max(start,last.x+last.width-visibleWidth*.2)),y:ground+camera.height,z,lookY:ground+camera.look};
}

/** Frame an authored composition: the start cliff, lower route and elevated
 * rewards together. The player stays near the left third while running right;
 * small jumps stay inside a vertical dead zone and climbs are followed gently. */
export function referenceCameraFrame(level:LevelDefinition,x:number,y:number,aspect:number){
 const first=level.platforms[0],last=level.platforms.find(p=>p.id===level.finish.platformId)!;
 if(level.countryId!=='JP'&&!level.camera){
  const lead=aspect<1?2.8:5.5,finish=last.x+last.width;
  return{x:clamp(x+lead,first.x+lead,Math.max(first.x+lead,finish-lead)),y:clamp(y+3.6,2.8,5.8),z:aspect<1?25:19,lookY:clamp(y+1.9,1.3,3.9)};
 }
 const japan=level.countryId==='JP';
 if(!japan&&level.camera?.distance)return gameplayCameraFrame(level,level.camera,x,y,aspect);
 const camera=japan?{height:3.5,look:1.3,follow:.78,maxRise:4}:level.camera||referenceCamera;
 const ratio=Math.max(.35,Math.min(aspect,2.4)),z=japan?(ratio<1?21:19.5):ratio<1?29:24;
 const visibleWidth=2*Math.tan(44*Math.PI/360)*z*ratio,lead=visibleWidth*.18;
 const spawnPlatform=level.platforms.find(p=>p.id===level.spawn.platformId)!;
 const initialCenter=spawnPlatform.x+level.spawn.offset+lead;
 const rise=clamp((y-(japan?.7:1.8))*camera.follow,0,camera.maxRise);
 return{x:clamp(x+lead,initialCenter,Math.max(initialCenter,last.x+last.width-visibleWidth*.2)),y:camera.height+rise,z,lookY:camera.look+rise};
}
