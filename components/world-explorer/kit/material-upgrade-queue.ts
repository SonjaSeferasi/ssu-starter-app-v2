/** Late textures may require synchronous upload/linking even with KHR shader
 * compilation. Keep the current art during play; do that work at startup or
 * while paused. No fixed timeout is treated as proof of GPU readiness. */
export function materialUpgradeQueue(safe:()=>boolean,onState:(state:'queued'|'preparing'|'idle')=>void=()=>{}){
 let disposed=false,running=false;
 const pending:{work:()=>Promise<void>;resolve:()=>void;reject:(error:Error)=>void}[]=[];
 const flush=async()=>{
  if(running||disposed||!safe())return;running=true;
  try{while(pending.length&&!disposed&&safe()){const job=pending.shift()!;onState('preparing');try{await job.work();if(disposed)job.reject(new Error('Stage closed'));else job.resolve();}catch(e){job.reject(e instanceof Error?e:new Error('Material preparation failed'));}}}
  finally{running=false;if(!disposed)onState(pending.length?'queued':'idle');}
 };
 return{
  prepare(work:()=>Promise<void>){if(disposed)return Promise.reject(new Error('Stage closed'));return new Promise<void>((resolve,reject)=>{pending.push({work,resolve,reject});onState('queued');void flush();});},
  flush,
  dispose(){disposed=true;for(const job of pending.splice(0))job.reject(new Error('Stage closed'));},
 };
}
