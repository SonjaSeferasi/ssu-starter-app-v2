import {authorLevel,platform,spread,type LevelSpec} from '../author';
import {africaPlaces,type AfricaCode} from '../../africa';
import type {LevelDefinition,PlatformDefinition} from '../../game-types';
import {blockoutTier,tuneToTier} from './tune';

export {platform};
type Spec=Omit<LevelSpec,'code'|'iso2'|'title'|'tier'|'coins'|'environmentId'>&{
 /** Extra coins on top of the evenly spread trail coins. */
 coins?:[string,number,number?][];
 /** Platforms that get no automatic coins (bounce pads, hazards). */
 noCoins?:string[];
 /** Offset range for a platform's trail coins, where the default spread
  * would put one where an input-only player is still in the air. */
 coinRange?:Record<string,[number,number]>;
 /** Jump targets the difficulty pass leaves exactly as authored. */
 tuneSkip?:string[];
};
/** An African country level. Title, tier and environment id come from the
 * country's place entry; trail coins are spread along every platform (three
 * on long ground, two on medium, one on a ledge) and kept off bounce pads. */
export function africaLevel(code:AfricaCode,authored:Spec):LevelDefinition{
 const place=africaPlaces[code],spec=tuneToTier(authored,blockoutTier[code]??place.tier,{tier:place.tier,skip:authored.tuneSkip}),skip=new Set(spec.noCoins??[]),patrols=new Map((spec.enemies??[]).map(e=>[e.platformId,e]));
 // Trail coins stay ahead of the spawn, short of the finish, off stairs
 // (where a climbing player's head passes them) and clear of patrol beats.
 const byId=new Map(spec.platforms.map(p=>[p.id,p]));
 const arrivesRunning=new Set((spec.edges??[]).filter(([from,to,type])=>{const a=byId.get(from),b=byId.get(to);return!!a&&!!b&&b.id!==spec.spawn[0]&&b.id!==spec.finish[0]&&(!!a.bounce||(type==='WALK'&&Math.abs(a.x+a.width-b.x)<.05));}).map(([,to])=>to));
 const trail=spec.platforms.filter(p=>!p.bounce&&!p.slope&&!skip.has(p.id)&&!(p.route&&p.route!=='main'&&p.width<2.6)).flatMap(p=>{
  const count=p.width>=9?3:p.width>=5?2:1,h=p.collapse?.95:1.1,e=patrols.get(p.id);
  // A coin before a patrol is never safe to fetch: the beat is ahead of it.
  if(e)return[[p.id,Math.min(p.width-.7,e.maxOffset+1.8),h]] as [string,number,number][];
  if(p.id===spec.spawn[0])return spread(p,count,h,[spec.spawn[1]+1.4,p.width-1.6]);
  if(p.id===spec.finish[0])return spread(p,count,h,[3.2,spec.finish[1]-1.4]);
  if(spec.coinRange?.[p.id])return spread(p,count,h,spec.coinRange[p.id]);
  // Off a slope, a walk-on or a bounce the player arrives running and hops
  // the first few units, so the trail starts further in.
  if(arrivesRunning.has(p.id)){const last=p.width-Math.min(1.6,p.width*.25);if(last<4.2)return[];return spread(p,last-4.2<1.2?1:count,h,[4.2,last]);}
  return spread(p,count,h);
 });
 return authorLevel({...spec,code,iso2:place.iso2,title:place.title,tier:place.tier,environmentId:'africa-'+place.iso2.toLowerCase(),coins:[...trail,...(spec.coins??[])]});
}
/** A thin optional ledge or spur (never a deep landform). */
export const ledge=(id:string,x:number,y:number,width:number,options:Partial<PlatformDefinition>={})=>platform(id,x,y,width,{terrain:'rock',thickness:.5,route:'upper',...options});
/** A long, always-active hazard (river, lagoon, lava) split into the
 * 20-unit pieces the level manifest allows. */
export function hazardStrip(id:string,x:number,width:number,y:number,style:string,height=.9){
 const parts=Math.ceil(width/20);return Array.from({length:parts},(_,i)=>({id:`${id}-${i+1}`,x:x+i*width/parts,y,width:width/parts,height,style}));
}
