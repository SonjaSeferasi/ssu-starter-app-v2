import type {DifficultyTier,PlatformDefinition} from '../../game-types';
import type {LevelSpec} from '../author';
/** A platform's reach, including its motion envelope (as level-analysis
 * measures it; repeated here because the level modules load before it). */
const extent=(p:PlatformDefinition)=>{
 if(p.motion==='pendulum'){const length=p.length||4,rise=length*(1-Math.cos(Math.asin(Math.min(.95,p.amplitude/length))));return{left:p.x-p.amplitude,right:p.x+p.width+p.amplitude,top:p.y+rise,low:p.y,leftY:p.y,rightY:p.y};}
 const h=p.motion==='horizontal'?p.amplitude:0,v=p.motion==='vertical'?p.amplitude:0,bob=p.bob||0,slope=p.slope||0;
 return{left:p.x-h,right:p.x+p.width+h,top:p.y+Math.max(0,slope)+v+bob,low:p.y+Math.min(0,slope)-v-bob,leftY:p.y,rightY:p.y+slope};
};

/** Difficulty pass for the African levels.
 *
 * Each country file is the authored layout (landmarks, sections, mechanics,
 * collectibles) at the tier it was first blocked out for. The production
 * manifest assigns every country a tier so that the 193 member states land on
 * the 39/39/39/38/38 split; when that tier differs from the blockout's, this
 * pass re-spaces the critical path's jumps for the manifest tier:
 *
 *  - Only plain jumps change. Walk-ons, drops, gates, climbs and bounce
 *    launches keep their authored geometry exactly; rides keep theirs when the
 *    tier goes up (a moving platform's own timing is the challenge).
 *  - Gaps are re-mapped by rank onto the tier's band, so the level keeps its
 *    authored rhythm (short hops stay the shortest); the hardest third sits at
 *    the band's top, which is what the difficulty analyzer measures.
 *  - Rises are capped for the new gap (a long jump is never also a tall one);
 *    at tier 5 the longest jumps descend, the only reliable way to clear them.
 *  - Everything after a changed jump (platforms, ledges, hazards, wind zones,
 *    gates, "?" blocks) moves with it; things in a gap move with the platform
 *    the player leaves, so bonus ledges keep their place under the takeoff.
 *
 * The result goes through the same validators as every other level.
 *
 * On 2026-11-03 the project owner chose to keep every built level's calibrated
 * tier (design-manifest.ts `tierTarget`), so the African levels declare their
 * blockout tiers and this pass currently changes nothing. It stays for a
 * future tier change. */
export const blockoutTier:Record<string,DifficultyTier>={
 MAR:3,DZA:4,TUN:2,LBY:3,SDN:2,MLI:4,NER:3,MRT:3,SEN:2,GMB:1,GNB:2,GIN:4,SLE:3,LBR:2,CIV:3,GHA:3,TGO:3,BEN:2,BFA:2,NGA:4,CPV:5,
 CMR:4,CAF:2,TCD:4,COD:5,COG:3,GAB:2,GNQ:3,STP:5,AGO:3,KEN:3,TZA:5,ETH:3,ERI:3,DJI:4,SOM:2,SSD:2,UGA:4,RWA:3,BDI:2,MWI:1,MOZ:2,
 MDG:5,MUS:2,SYC:1,COM:1,ZMB:4,ZWE:3,NAM:3,BWA:2,LSO:4,SWZ:1,
};
/** Gap band [shortest, longest] for each tier, in world units (Dmax 5.40). */
const band:Record<DifficultyTier,[number,number]>={1:[1.4,2.25],2:[1.9,2.8],3:[2.4,3.2],4:[2.8,3.7],5:[3.2,4.2]};
/** Highest rise a jump may have at each tier (Hmax 1.95: 30% = .585). */
const riseCap:Record<DifficultyTier,number>={1:.5,2:.65,3:.7,4:.7,5:.7};
const capFor=(tier:DifficultyTier,gap:number)=>Math.min(riseCap[tier],gap>3.5?.35:gap>3?.55:.65);

type Tuning={tier:DifficultyTier;skip?:string[]};
export function tuneToTier<S extends Pick<LevelSpec,'platforms'|'edges'|'hazards'|'zones'|'gates'|'discoveryBlocks'|'spawn'|'enemies'>>(spec:S,from:DifficultyTier,tuning:Tuning):S{
 const to=tuning.tier;if(from===to)return spec;
 const byId=new Map(spec.platforms.map(p=>[p.id,p])),skip=new Set(tuning.skip??[]);
 // The critical path in route order: mandatory edges as authored.
 const path=spec.edges.filter(([,, ,mandatory])=>mandatory!==false);
 const tuned=path.filter(([a,b,action])=>{
  const pa=byId.get(a)!,pb=byId.get(b)!;
  if(skip.has(b)||action==='WALK'||action==='DROP'||action==='PASS_GATE'||action==='ACTIVATE_SWITCH'||action==='CLIMB')return false;
  if(pa.bounce||pb.bounce||pb.climbable)return false;
  // Moving platforms keep their authored spacing when the tier rises.
  if((pa.motion||pb.motion)&&to>from)return false;
  return true;
 });
 const geometry=([a,b]:[string,string,...unknown[]])=>{const ea=extent(byId.get(a)!),eb=extent(byId.get(b)!),pa=byId.get(a)!,pb=byId.get(b)!;return{gap:Math.max(0,eb.left-ea.right),rise:(pb.motion?eb.low:eb.leftY)-(pa.motion?ea.top:ea.rightY)};};
 const measured=tuned.map(edge=>({edge,...geometry(edge)}));
 // A jump with a bonus ledge in its gap is held near the ledge (below), so it
 // never counts toward the hardest third; the next-longest jump does instead.
 const ledgesIn=(m:{edge:[string,string,...unknown[]]})=>{const ea=extent(byId.get(m.edge[0])!),eb=extent(byId.get(m.edge[1])!);return spec.platforms.filter(p=>p.route&&p.route!=='main'&&p.x>=ea.right-.6&&p.x<eb.left);};
 // Nor does a takeoff from a patrolled platform: a player waiting out the patrol
 // has no room for the run-up a long jump needs.
 const patrolled=new Set((spec.enemies??[]).map(e=>e.platformId)),held=(m:{edge:[string,string,...unknown[]]})=>ledgesIn(m).length>0||patrolled.has(m.edge[0]);
 const order=[...measured].sort((x,y)=>(held(x)?0:1)-(held(y)?0:1)||x.gap-y.gap),top=Math.max(3,Math.ceil(order.length/3)),[lo,hi]=band[to];
 const target=new Map<string,{gap:number;rise:number}>();
 order.forEach((m,i)=>{
  const key=m.edge[0]+'>'+m.edge[1],hardest=i>=order.length-top;
  // Zero-gap step-ups are measured by their rise alone; at tier 1 they become
  // walkable steps (under the 0.4 step height).
  if(m.gap<.05&&m.rise>=.45){target.set(key,{gap:0,rise:to>=5?1.3:to===4?1.1:to===3?.9:to===2?.7:.38});return;}
  // Below the hardest third, gaps stay under 3.7: longer running jumps are only
  // fair when they descend, which is reserved for the hardest third at tier 5.
  const rest=Math.min(hi*.95,3.7);
  let gap=hardest?hi:lo+(rest-lo)*(order.length-top>1?i/(order.length-top-1):0);
  if(to<from&&(byId.get(m.edge[0])!.motion||byId.get(m.edge[1])!.motion))gap=Math.min(m.gap,gap);
  let rise=Math.min(m.rise,capFor(to,gap));
  if(to===5&&hardest)rise=Math.min(m.rise,-.25);
  // A bonus ledge in this gap moves with the takeoff, so the landing must stay
  // within reach of it: from the ledge's far end at most 1.8 across and 1.2 up,
  // and no closer than its far end.
  const ea=extent(byId.get(m.edge[0])!),eb=extent(byId.get(m.edge[1])!);
  for(const l of ledgesIn(m)){
   const reach=l.x+l.width-ea.right;gap=Math.max(reach-.3,Math.min(gap,reach+1.6));
   const rejoin=eb.leftY-l.y;rise=Math.min(rise,m.rise+(1.2-rejoin));
  }
  target.set(key,{gap:+gap.toFixed(2),rise:+rise.toFixed(2)});
 });
 // Walk the path, carrying each platform's displacement to the next.
 const shift=new Map<string,{dx:number;dy:number}>();shift.set(spec.spawn[0],{dx:0,dy:0});
 for(const edge of path){
  const [a,b]=edge,sa=shift.get(a)??{dx:0,dy:0};if(shift.has(b))continue;
  const t=target.get(a+'>'+b);
  if(!t){shift.set(b,sa);continue;}
  const g=geometry(edge);shift.set(b,{dx:sa.dx+(t.gap-g.gap),dy:sa.dy+(t.rise-g.rise)});
 }
 // Anything at a given x moves with the last path platform starting at or before it.
 const anchors=[...shift.entries()].map(([id,s])=>({x:byId.get(id)!.x,...s})).sort((p,q)=>p.x-q.x);
 const at=(x:number)=>{let s={dx:0,dy:0};for(const a of anchors){if(a.x<=x+1e-6)s=a;else break;}return s;};
 const move=(p:PlatformDefinition):PlatformDefinition=>{const s=shift.get(p.id)??at(p.x);return{...p,x:+(p.x+s.dx).toFixed(2),y:+(p.y+s.dy).toFixed(2)};};
 const span=<T extends {x:number;width:number}>(item:T,lowerY?:(dy:number)=>Partial<T>)=>{
  const a=at(item.x),b=at(item.x+item.width),x=item.x+a.dx,end=item.x+item.width+b.dx;
  return{...item,x:+x.toFixed(2),width:+(end-x).toFixed(2),...(lowerY?lowerY(Math.min(a.dy,b.dy)):{})};
 };
 return{...spec,
  platforms:spec.platforms.map(move),
  // A stretched hazard strip is re-split into the 20-unit pieces the manifest allows.
  // Hazards under the course never end up level with a ledge they used to sit just below.
  hazards:spec.hazards?.flatMap(h=>{const moved=span(h,dy=>({y:dy?Math.floor((h.y+dy-.04)*100)/100:h.y}));if(moved.width<=20)return[moved];
   const parts=Math.ceil(moved.width/20);return Array.from({length:parts},(_,i)=>({...moved,id:`${h.id}-${String.fromCharCode(97+i)}`,x:+(moved.x+i*moved.width/parts).toFixed(2),width:+(moved.width/parts).toFixed(2)}));}),
  zones:spec.zones?.map(z=>span(z,dy=>({bottom:+(z.bottom+dy).toFixed(2),top:+(z.top+dy).toFixed(2)}))),
  gates:spec.gates?.map(g=>{const s=at(g.x);return{...g,x:+(g.x+s.dx).toFixed(2),y:+(g.y+s.dy).toFixed(2)};}),
  discoveryBlocks:spec.discoveryBlocks?.map(d=>{const s=at(d.x);return{...d,x:+(d.x+s.dx).toFixed(2),y:+(d.y+s.dy).toFixed(2)};}),
 };
}
