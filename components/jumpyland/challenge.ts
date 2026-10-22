export const GUARD_DURATION=650,GUARD_COOLDOWN=2600;
export type GuardState={until:number;readyAt:number;blocked:number};
export const freshGuard=():GuardState=>({until:0,readyAt:0,blocked:0});
export function raiseGuard(state:GuardState,now:number){return now>=state.readyAt?{...state,until:now+GUARD_DURATION,readyAt:now+GUARD_COOLDOWN}:state;}
export function guardActive(state:GuardState,now:number){return now<state.until;}
export function enemyTuning(world:number){return {range:560,height:260,windup:640,cooldown:1200-world*100,speed:230+world*25,pursuitSpeed:85+world*12,patrolSpeed:40+world*6};}
export function enemyTracks(enemy:{x:number;y:number},player:{x:number;y:number},world:number){const t=enemyTuning(world);return Math.abs(player.x-enemy.x)<t.range&&Math.abs(player.y-enemy.y)<t.height;}
export function projectileAim(from:{x:number;y:number},target:{x:number;y:number},speed:number){const dx=target.x-from.x,dy=target.y-from.y,length=Math.max(1,Math.hypot(dx,dy));return {vx:dx/length*speed,vy:dy/length*speed};}
/** Pursuit is bounded by the carrier's safe deck, so enemies never walk across gaps. */
export function stepEnemy(enemy:{x:number;left:number;right:number;direction:number},target:number,alert:boolean,dt:number,world:number,stationary=false){
 const tuning=enemyTuning(world);let direction=enemy.direction;
 if(alert&&Math.abs(target-enemy.x)>18)direction=Math.sign(target-enemy.x);
 else if(!alert&&(enemy.x<=enemy.left||enemy.x>=enemy.right))direction=enemy.x<=enemy.left?1:-1;
 const step=stationary?0:alert&&Math.abs(target-enemy.x)<85?0:direction*(alert?tuning.pursuitSpeed:tuning.patrolSpeed)*dt;
 return {x:Math.max(enemy.left,Math.min(enemy.right,enemy.x+step)),direction};
}
