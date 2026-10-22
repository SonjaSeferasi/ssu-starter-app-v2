import type {PowerState} from './powers';
export type EnemyKind='mushroom'|'turtle'|'plant'|'raider'|'drone'|'itachi'|'kisame'|'deidara';
export function enemyKind(world:number,index:number):EnemyKind{return (world===1?['mushroom','turtle','plant']:world===2?['raider','drone']:['itachi','kisame','deidara'])[index%(world===2?2:3)] as EnemyKind;}
export const enemyNames:Record<EnemyKind,string>={mushroom:'Mushroom prowler',turtle:'Shell guard',plant:'Thorn blossom',raider:'Scouter raider',drone:'Ki sentry',itachi:'Itachi',kisame:'Kisame',deidara:'Deidara'};
export function weaponFor(world:number,p:PowerState,now:number){
 if(now<p.saiyanUntil)return{key:'golden-beam',name:'Golden Kamehameha',cooldown:700,speed:800,life:1300,pierce:true};
 if(now<p.chidoriUntil)return{key:'lightning',name:'Chidori',cooldown:1700,speed:700,life:400,pierce:true};
 if(now<p.rasenganUntil)return{key:'rasengan',name:'Rasengan',cooldown:1300,speed:510,life:1500,pierce:false};
 if(now<p.flowerUntil)return{key:'fireball',name:'Fire Flower',cooldown:900,speed:390,life:2100,pierce:false};
 return{key:world===1?'fireball':world===2?'ki':'shuriken',name:world===1?'Fire shot':world===2?'Ki blast':'Shuriken',cooldown:now<p.rapidUntil?650:3500,speed:world===2?620:490,life:1300,pierce:false};
}
