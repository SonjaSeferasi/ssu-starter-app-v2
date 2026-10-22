export const ATTEMPT_HEARTS=3;
export const HIT_RECOVERY_MS=1800;
export type AttemptLife={hearts:number;recoverUntil:number};
export const freshLife=():AttemptLife=>({hearts:ATTEMPT_HEARTS,recoverUntil:0});
// Checkpoints change the respawn location; they never replenish the attempt.
export function loseHeart(state:AttemptLife,now:number,fall=false){
 if(state.hearts===0||(!fall&&now<state.recoverUntil))return{state,lost:false,gameOver:state.hearts===0};
 const hearts=Math.max(0,state.hearts-1);
 return{state:{hearts,recoverUntil:now+HIT_RECOVERY_MS},lost:true,gameOver:hearts===0};
}
