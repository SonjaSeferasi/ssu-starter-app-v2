export type PowerKind = 'shield' | 'doubleJump' | 'rapid' | 'nimbus' | 'saiyan' | 'flower' | 'star' | 'rasengan' | 'chidori' | 'clone';
export type PowerState = {shield:boolean;doubleJumpUntil:number;rapidUntil:number;invulnerableUntil:number;nimbusUntil:number;saiyanUntil:number;flowerUntil:number;starUntil:number;rasenganUntil:number;chidoriUntil:number;cloneUntil:number;clones:number};
export const POWER_DURATION=20000;
export const powerNames:Record<PowerKind,string>={shield:'Guardian shield',doubleJump:'Sky jump',rapid:'Rapid fire',nimbus:'Golden Nimbus',saiyan:'Super Saiyan',flower:'Fire Flower',star:'Super Star',rasengan:'Rasengan',chidori:'Chidori',clone:'Shadow clone'};
export const powerSymbols:Record<PowerKind,string>={shield:'◆',doubleJump:'↑↑',rapid:'✦',nimbus:'☁',saiyan:'★',flower:'✿',star:'★',rasengan:'◎',chidori:'ϟ',clone:'分'};
export function freshPowers():PowerState{return{shield:false,doubleJumpUntil:0,rapidUntil:0,invulnerableUntil:0,nimbusUntil:0,saiyanUntil:0,flowerUntil:0,starUntil:0,rasenganUntil:0,chidoriUntil:0,cloneUntil:0,clones:0};}
export function collectPower(state:PowerState,kind:PowerKind,now:number):PowerState{
 if(kind==='clone')return{...state,cloneUntil:now+POWER_DURATION,clones:2};
 if(kind==='shield')return{...state,shield:true};
 const field=({doubleJump:'doubleJumpUntil',rapid:'rapidUntil',nimbus:'nimbusUntil',saiyan:'saiyanUntil',flower:'flowerUntil',star:'starUntil',rasengan:'rasenganUntil',chidori:'chidoriUntil',clone:'cloneUntil'} as const)[kind];
 return{...state,[field]:now+(kind==='nimbus'?12000:kind==='saiyan'?15000:kind==='star'?10000:POWER_DURATION)};
}
export function canCollectPower(kind:PowerKind,world:number,collectibles:number){return kind==='saiyan'?world===2&&collectibles>=3:kind==='nimbus'?world===2:kind==='flower'||kind==='star'?world===1:['rasengan','chidori','clone'].includes(kind)?world===3:true;}
export function takeHit(state:PowerState,now:number):{state:PowerState;survived:boolean}{
 if(now<state.invulnerableUntil||now<state.saiyanUntil||now<state.starUntil)return{state,survived:true};
 if(now<state.cloneUntil&&state.clones>0)return{state:{...state,clones:state.clones-1,cloneUntil:state.clones>1?state.cloneUntil:0,invulnerableUntil:now+1500},survived:true};
 if(state.shield)return{state:{...state,shield:false,invulnerableUntil:now+1500},survived:true};
 return{state,survived:false};
}
export function enemyDifficulty(level:number){return{speed:48+level*8,projectileSpeed:135+level*25,cooldown:5100-level*650,windup:1000-level*100};}

export function activeTechnique(state:PowerState,now:number):{name:string;until:number;kind:PowerKind}|null{
 const kinds=['saiyan','star','chidori','rasengan','flower','clone'] as const;
 for(const kind of kinds){const until=state[`${kind}Until`];if(until>now)return{name:powerNames[kind],until,kind};}return null;
}
