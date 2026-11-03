import {authorLevel,platform,spread,type EdgeSpec,type LevelSpec} from './author';
import type {DifficultyTier,GateDefinition,HazardDefinition,EnemyDefinition,PlatformDefinition,SwitchDefinition,TerrainKind,WindZoneDefinition} from '../game-types';

/** Composes a route-graph level from beats: the ordered moves a country's
 * route asks of the player. Every country names its own beats, terrain and
 * place; the composer only does the arithmetic that makes the result
 * measurable and fair:
 *  - a "hard" jump is sized inside the country's tier band of the measured
 *    jump envelope (Dmax 5.40, Hmax 1.95), an easy one at tier 1, so the
 *    DifficultyAnalyzer's hardest third lands on the declared tier;
 *  - every move becomes a route-graph edge (WALK, JUMP, DROP, RIDE_PLATFORM,
 *    CLIMB) and the optional upper path rejoins the main route;
 *  - coins, stars, checkpoints and the discovery are placed on platforms the
 *    route reaches, clear of landing edges.
 * The output is an ordinary LevelDefinition, checked by validateLevel, the
 * LevelValidator, the DifficultyAnalyzer and the bot like any authored level. */

export type Beat=
 |{kind:'run';width:number;terrain?:TerrainKind;style?:string;rise?:number;hard?:boolean;id?:string;coins?:number}
 |{kind:'stairs';width:number;rise:number;steps?:number;terrain?:TerrainKind;style?:string}
 |{kind:'slope';width:number;rise:number;terrain?:TerrainKind;style?:string}
 |{kind:'drop';width:number;fall:number;terrain?:TerrainKind;style?:string}
 |{kind:'lift';rise:number;terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind}
 |{kind:'mover';span:number;terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind;water?:boolean}
 |{kind:'collapse';count:number;terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind;water?:boolean}
 |{kind:'bounce';rise:number;terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind}
 |{kind:'ice';count:number;landing?:number;landingTerrain?:TerrainKind;style?:string}
 |{kind:'wind';count:number;terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind}
 |{kind:'gate';width:number;terrain?:TerrainKind;style?:string}
 |{kind:'raise';terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind}
 |{kind:'patrol';width:number;terrain?:TerrainKind;style?:string}
 |{kind:'climb';rise:number;terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind}
 |{kind:'swing';count:number;style?:string;landing?:number;landingTerrain?:TerrainKind}
 |{kind:'water';count:number;terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind}
 |{kind:'hazard';width:number;terrain?:TerrainKind;style?:string}
 |{kind:'current';width:number;terrain?:TerrainKind;style?:string;landing?:number;landingTerrain?:TerrainKind};

export type CompositionSpec={
 code:string;iso2:string;title:string;environmentId:string;tier:DifficultyTier;seed:number;
 archetype:string;signatureMechanic:string;
 start:{width:number;terrain?:TerrainKind;style?:string};
 beats:Beat[];
 finish:{width:number;terrain?:TerrainKind;style?:string};
 /** The beat index (0-based) after which the optional upper path branches. */
 bonusAfter:number;bonusTerrain?:TerrainKind;bonusStyle?:string;
 environment:LevelSpec['environment'];verticality?:'low'|'medium'|'high';enemyProfile?:'none'|'light'|'moderate'|'heavy';
};

/** Gap and rise in world units for a jump of a given tier: the middle of the
 * tier's gap band (25-45, 35-55, ... percent of Dmax) and under its step cap. */
const DMAX=5.4,HMAX=1.95;
/** A small seeded generator (mulberry32), so a country's level is stable. */
function seeded(seed:number){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const hardGap=(tier:DifficultyTier)=>DMAX*[.4,.5,.6,.7,.765][tier-1];
const hardRise=(tier:DifficultyTier)=>HMAX*[.24,.34,.44,.54,.62][tier-1];
const easyGap=1.9,easyRise=.45;

export function composeLevel(spec:CompositionSpec){
 const r=seeded(spec.seed),prefix=spec.iso2.toLowerCase(),tier=spec.tier;
 const platforms:PlatformDefinition[]=[],edges:EdgeSpec[]=[],hazards:HazardDefinition[]=[],enemies:EnemyDefinition[]=[],switches:SwitchDefinition[]=[],gates:GateDefinition[]=[],zones:WindZoneDefinition[]=[];
 const coins:[string,number,number?][]=[],stars:[string,number,number][]=[],mainIds:string[]=[];
 let n=0,x=0,y=0,last='';
 const id=(name:string)=>`${prefix}-${name}-${++n}`;
 const vary=(value:number,spread=.12)=>+(value*(1+(r()-.5)*2*spread)).toFixed(2);
 /** Add a main-route platform after a gap; the edge action follows from the move. */
 const add=(name:string,width:number,options:Partial<PlatformDefinition>&{gap?:number;rise?:number;action?:EdgeSpec[2]}={})=>{
  const {gap=0,rise=0,action,...rest}=options,pid=id(name);
  const p=platform(pid,+(x+gap).toFixed(2),+(y+rise).toFixed(2),+width.toFixed(2),rest);platforms.push(p);
  if(last)edges.push([last,pid,action??(p.motion?'RIDE_PLATFORM':p.climbable?'CLIMB':rise<-1?'DROP':gap<.05?'WALK':'JUMP')]);
  x=p.x+p.width;y=p.y+(p.slope||0);last=pid;mainIds.push(pid);return p;
 };
 /** A tier-sized jump: hard ones use the tier band, others stay at tier 1. */
 // Long tier-4 gaps stay nearly level and tier-5 gaps land a little lower (as
 // Venezuela's do): a full-length jump that also climbs is beyond the envelope
 // a player can rely on; height comes from stairs, lifts and climbs instead.
 const jump=(hard:boolean)=>({gap:vary(hard?hardGap(tier):easyGap,tier>=4&&hard?.025:.06),rise:hard?(tier===5?-vary(.55,.25):tier===4?vary(.15,.3):r()<.5?vary(hardRise(tier)*.8,.1):0):(r()<.5?vary(easyRise,.2):0)});
 const landing=(width:number|undefined,terrain:TerrainKind|undefined,hard=false)=>{const j=jump(hard);add('landing',width??vary(6),{gap:j.gap,rise:j.rise,terrain:terrain??'ground'});};
 // Start platform.
 add('start',spec.start.width,{terrain:spec.start.terrain??'ground',style:spec.start.style});
 coins.push(...spread(platforms[0],2));
 let hardCount=0;const beatPlatforms:string[][]=[];
 /** The bonus valley: the main route drops into a wide hollow and climbs out
  * by a step; the optional ledge sits above the hollow's near end, half a unit
  * above the bank, so its underside clears both the hollow (2.6 above it) and
  * a player walking off the bank (who has fallen below it by then). The
  * optional path crosses the hollow on two ledges for the star and rejoins on
  * the stairs out. The hollow is not on the optional path, so a player (or the
  * test bot) who drops into it has simply taken the main route. */
 let bonus:PlatformDefinition|null=null;
 const valley=()=>{
  const near=platforms.at(-1)!,bankY=y,bankRight=x;
  const hollow=add('hollow',vary(10.5,.04),{gap:.9,rise:-2.4,terrain:near.terrain==='rooftop'?'ground':near.terrain??'ground'});
  coins.push([hollow.id,hollow.width-2.5,1.1]);
  const step=add('steps-out',4.6,{gap:0,terrain:'stairs',slope:1.15,steps:4});coins.push([step.id,step.width/2,1.7]);
  const ledge=(at:number)=>platform(`${prefix}-bonus-${++n}`,+(bankRight+at).toFixed(2),+(bankY+.5).toFixed(2),2.2,{thickness:.3,terrain:spec.bonusTerrain??'rooftop',route:'upper',style:spec.bonusStyle});
  const first=ledge(2.7),second=ledge(6.3);bonus=second;
  platforms.push(first,second);edges.push([near.id,first.id,'JUMP',false],[first.id,second.id,'JUMP',false],[second.id,step.id,'DROP',false]);
  coins.push([first.id,1.1,.85],[second.id,1.1,.85]);stars.push([second.id,1.1,.8]);
 };
 spec.beats.forEach((beat,index)=>{
  const before=platforms.length;
  switch(beat.kind){
   case'run':{const hard=beat.hard??false;if(hard)hardCount++;const j=jump(hard);const p=add(beat.id??'run',vary(beat.width),{gap:j.gap,rise:beat.rise??j.rise,terrain:beat.terrain??'ground',style:beat.style});coins.push(...spread(p,beat.coins??(p.width>=6?2:1)));break;}
   case'stairs':{const p=add('stairs',beat.width,{gap:0,terrain:beat.terrain??'stairs',style:beat.style,slope:beat.rise,steps:beat.steps??Math.max(3,Math.ceil(beat.rise/.4)+1)});coins.push(...spread(p,1,1.1+beat.rise/2));break;}
   case'slope':{const p=add('slope',beat.width,{gap:0,terrain:beat.terrain??'slope',style:beat.style,slope:beat.rise});// A descending slope is often entered with a jump that clears its upper half,
    // so its coins sit on the lower part where every approach lands.
    coins.push(...(beat.rise<0?spread(p,2,1.1,[+(p.width*.6).toFixed(2),+(p.width-1.2).toFixed(2)]):spread(p,2,1.1+beat.rise/2)));break;}
   case'drop':{const p=add('lower',beat.width,{gap:vary(1.4),rise:-beat.fall,terrain:beat.terrain??'ground',style:beat.style});coins.push(...spread(p,2));break;}
   case'lift':{
    const amp=+(beat.rise/2).toFixed(2),lift=add('lift',2.6,{gap:vary(1.6),rise:amp+.1,motion:'vertical',amplitude:amp,period:vary(7,.08),pause:.9,phase:r()*6,thickness:.3,terrain:beat.terrain??'mechanical',style:beat.style});
    coins.push([lift.id,1.3,1.1]);
    x=lift.x+lift.width;y=lift.y+amp;const j=jump(false);add('upper',beat.landing??vary(6),{gap:j.gap,rise:.4,terrain:beat.landingTerrain??'rooftop'});coins.push(...spread(platforms.at(-1)!,2));break;}
   case'mover':{
    const half=+(beat.span/2).toFixed(2),left=add('mover',2.8,{gap:+(vary(1.5)+half).toFixed(2),rise:0,motion:'horizontal',amplitude:half,period:vary(7.4,.08),pause:.7,phase:r()*6,thickness:.4,terrain:beat.terrain??'water-raft',style:beat.style});
    coins.push([left.id,1.4,1.1]);if(beat.water)hazards.push({id:id('water'),x:+(left.x-half-1.2).toFixed(2),y:+(left.y-1.6).toFixed(2),width:+(beat.span+left.width+2.4).toFixed(2),height:.9,style:'water'});
    add('bank',beat.landing??vary(6),{gap:+(vary(1.5)+half).toFixed(2),rise:0,terrain:beat.landingTerrain??'ground'});coins.push(...spread(platforms.at(-1)!,2));break;}
   case'collapse':{for(let k=0;k<beat.count;k++){const hard=k===1;if(hard)hardCount++;const j=jump(hard);const p=add('crumble',vary(2.4,.08),{gap:j.gap,rise:j.rise*.6,collapse:{delay:vary(1.5,.1),respawn:4.5},thickness:.6,terrain:beat.terrain??'rock',style:beat.style});coins.push([p.id,p.width/2,1.1]);}
    if(beat.water){const first=platforms[before];hazards.push({id:id('water'),x:+(first.x-2).toFixed(2),y:+(Math.min(...platforms.slice(before).map(p=>p.y))-1.6).toFixed(2),width:+(x-first.x+4).toFixed(2),height:.9,style:'water'});}
    landing(beat.landing,beat.landingTerrain,false);coins.push(...spread(platforms.at(-1)!,2));break;}
   case'bounce':{
    // As in Brazil: walk onto the pad; the launch carries the player about 7
    // units forward, so the high landing starts well beyond it and is wide.
    const pad=add('pad',1.8,{gap:0,rise:0,bounce:13.5,thickness:.6,terrain:beat.terrain??'mechanical',style:beat.style});coins.push([pad.id,.9,3.2]);
    add('high',Math.max(7.5,beat.landing??vary(8)),{gap:vary(3.9,.05),rise:beat.rise,terrain:beat.landingTerrain??'rooftop'});coins.push(...spread(platforms.at(-1)!,2));break;}
   case'ice':{for(let k=0;k<beat.count;k++){const hard=k===0;if(hard)hardCount++;const j=jump(hard);const p=add('ice',vary(4.2),{gap:j.gap,rise:Math.min(0,j.rise),surface:'ice',terrain:'ice-shelf',style:beat.style});coins.push([p.id,p.width/2,1.1]);}landing(beat.landing,beat.landingTerrain,false);break;}
   case'wind':{const startX=x;for(let k=0;k<beat.count;k++){const hard=k===1;if(hard)hardCount++;const j=jump(hard);const p=add('ledge',vary(3.4),{gap:j.gap,rise:j.rise,terrain:beat.terrain??'cliff',style:beat.style});coins.push([p.id,p.width/2,1.1]);}
    zones.push({id:id('wind'),type:'wind',x:+startX.toFixed(2),width:+(x-startX).toFixed(2),bottom:+(y-3).toFixed(2),top:+(y+12).toFixed(2),force:+(.35+tier*.06).toFixed(2),period:9,warning:1.6,duration:1.8,phase:r()*4});
    landing(beat.landing,beat.landingTerrain,false);coins.push(...spread(platforms.at(-1)!,2));break;}
   case'gate':{const j=jump(false);const court=add('court',Math.max(14,beat.width),{gap:j.gap,rise:j.rise,terrain:beat.terrain??'ground',style:beat.style});
    const plate=id('plate'),gate=id('gate');switches.push({id:plate,platformId:court.id,offset:3,gateIds:[gate]});gates.push({id:gate,x:+(court.x+court.width-5).toFixed(2),y:court.y,width:.35,height:2.2,openSeconds:vary(7,.06)});
    coins.push([court.id,6,1.1],[court.id,court.width-2.5,1.1]);break;}
   case'raise':{const j=jump(false);const court=add('plaza',8,{gap:j.gap,rise:j.rise,terrain:beat.terrain??'ground',style:beat.style});const plate=id('plate');switches.push({id:plate,platformId:court.id,offset:2.6,gateIds:[]});coins.push([court.id,5.5,1.1]);
    const raised=add('raised',3.2,{gap:vary(1.7),rise:.3,raise:{switchId:plate,drop:2.2,seconds:vary(12,.08)},thickness:.6,terrain:'mechanical',style:'raised-'+(beat.style??'platform')});coins.push([raised.id,1.6,1.1]);
    add('terrace',beat.landing??vary(6),{gap:vary(1.7),rise:.4,terrain:beat.landingTerrain??'terrace'});coins.push(...spread(platforms.at(-1)!,2));break;}
   case'patrol':{const j=jump(false);const p=add('patrol',Math.max(11,beat.width),{gap:j.gap,rise:j.rise,terrain:beat.terrain??'ground',style:beat.style});
    enemies.push({id:id('patrol'),platformId:p.id,minOffset:3,maxOffset:+(p.width-3).toFixed(2),speed:+(.75+tier*.1).toFixed(2),turnPause:.65,height:.8});
    // Coins only outside the patrol's beat, so collecting them never means meeting the walker.
    coins.push([p.id,1.6,1.1],[p.id,+(p.width-1.6).toFixed(2),1.1]);break;}
   case'climb':{const j=jump(false);const base=add('foot',6,{gap:j.gap,rise:j.rise,terrain:beat.terrain??'ground'});coins.push(...spread(base,1));
    const wall=add('wall',2.4,{gap:0,rise:beat.rise,climbable:true,terrain:'climb-wall',style:beat.style});coins.push([wall.id,1.2,1.2]);
    add('summit',beat.landing??vary(6),{gap:vary(1.4),rise:.3,terrain:beat.landingTerrain??'cliff'});coins.push(...spread(platforms.at(-1)!,2));break;}
   case'swing':{for(let k=0;k<beat.count;k++){const p=add('swing',1.8,{gap:vary(2.6,.05),rise:0,motion:'pendulum',amplitude:2.1,length:5,period:4.4,phase:k%2?Math.PI:0,thickness:.3,terrain:'canopy',style:beat.style??'rope-swing'});coins.push([p.id,.9,1.1]);}
    landing(beat.landing,beat.landingTerrain,false);coins.push(...spread(platforms.at(-1)!,2));break;}
   case'water':{const first=x;for(let k=0;k<beat.count;k++){const hard=k===beat.count-1;if(hard)hardCount++;const j=jump(hard);const p=add('stone',vary(3,.1),{gap:j.gap,rise:0,thickness:.9,terrain:beat.terrain??'rock',style:beat.style});coins.push([p.id,p.width/2,1.1]);}
    hazards.push({id:id('water'),x:+(first-.2).toFixed(2),y:+(y-1.6).toFixed(2),width:+(x-first+3).toFixed(2),height:.9,style:'water'});landing(beat.landing,beat.landingTerrain,false);coins.push(...spread(platforms.at(-1)!,2));break;}
   case'hazard':{const j=jump(false);const p=add('vent',Math.max(10,beat.width),{gap:j.gap,rise:j.rise,terrain:beat.terrain??'ground',style:beat.style});
    hazards.push({id:id('burst'),x:+(p.x+p.width/2-.9).toFixed(2),y:p.y,width:1.8,height:2.6,cycle:{period:vary(6.5,.05),warning:1.8,active:1.1,phase:r()*5},style:beat.style??'steam'});coins.push([p.id,2.5,1.1],[p.id,p.width-2.5,1.1]);break;}
   case'current':{const j=jump(false);const p=add('ford',Math.max(8,beat.width),{gap:j.gap,rise:0,current:-1.1,terrain:beat.terrain??'water-raft',style:beat.style});coins.push(...spread(p,2));landing(beat.landing,beat.landingTerrain,false);coins.push(...spread(platforms.at(-1)!,2));break;}
  }
  beatPlatforms[index]=platforms.slice(before).map(p=>p.id);
  if(index===spec.bonusAfter)valley();
 });
 // Extra tier-sized hops until the hardest third of the jumps is on tier.
 // Counts every move the DifficultyAnalyzer ranks (all but walks and drops).
 const ranked=()=>edges.filter(e=>e[2]==='JUMP'||e[2]==='RIDE_PLATFORM').length+1;
 while(hardCount<Math.max(3,Math.ceil(ranked()/3))){const j=jump(true);const p=add('ledge',vary(4.5),{gap:j.gap,rise:j.rise,terrain:spec.finish.terrain??'ground'});coins.push(...spread(p,1));hardCount++;}
 const finish=add('finish',spec.finish.width,{gap:jump(false).gap,rise:0,terrain:spec.finish.terrain??'terrace',style:spec.finish.style});
 coins.push([finish.id,3,1.1]);
 if(!bonus)valley();
 // Two more stars on the main route, a high jump above wide platforms.
 const busy=new Set([...switches.map(w=>w.platformId),...enemies.map(e=>e.platformId)]),wide=platforms.filter(p=>p.route==='main'&&!p.motion&&!p.collapse&&!p.slope&&p.width>=5&&p.id!==platforms[0].id&&p.id!==finish.id&&!busy.has(p.id)&&!/-(hollow|steps-out)-/.test(p.id)&&!gates.some(g=>g.x>=p.x&&g.x<=p.x+p.width)&&!hazards.some(h=>h.cycle&&h.x>=p.x&&h.x<=p.x+p.width));
 const hosts=[wide[Math.floor(wide.length*.35)],wide[Math.floor(wide.length*.8)]].filter((q,i,a)=>q&&a.indexOf(q)===i);
 while(hosts.length<2)hosts.push(hosts.length?finish:platforms[0]);
 for(const p of hosts)stars.push([p.id,p===finish?3.6:p.width/2,2.2]);
 // Checkpoints on the first wide safe platforms after a third and two thirds.
 const safe=platforms.filter(p=>p.route==='main'&&!p.motion&&!p.collapse&&!p.surface&&!p.current&&!p.raise&&!p.climbable&&!p.bounce&&p.width>=5&&!enemies.some(e=>e.platformId===p.id));
 // Two checkpoints: the first safe platform past a third of the route, then
 // the first past two thirds (or, failing that, any later safe platform).
 const pool=safe.filter(p=>p.id!==finish.id&&p.id!==platforms[0].id);
 // When the first safe platform past a third lies beyond half the route, the
 // last safe platform before the third is used instead, so no stretch grows too long.
 const pastThird=pool.find(p=>p.x>finish.x*.3),beforeThird=[...pool].reverse().find(p=>p.x<=finish.x*.3&&p.x>finish.x*.15);
 const firstCheckpoint=(pastThird&&pastThird.x>finish.x*.5&&beforeThird?beforeThird:pastThird)??pool[0];
 const secondCheckpoint=pool.find(p=>p.x>finish.x*.62&&p.x>firstCheckpoint.x)??pool.find(p=>p.x>firstCheckpoint.x+12)??pool.find(p=>p.x>firstCheckpoint.x);
 const checkpoints:[string,number][]=[firstCheckpoint,secondCheckpoint].filter(Boolean).map(p=>[p!.id,1.2]);
 const used=new Map<string,number>();const cleanCoins=coins.filter(([pid,off])=>{const k=`${pid}:${Math.round(off*2)}`;if(used.has(k))return false;used.set(k,1);return true;});
 const level=authorLevel({
  code:spec.code,iso2:spec.iso2,title:spec.title,environmentId:spec.environmentId,tier,
  design:{archetype:spec.archetype,signatureMechanic:spec.signatureMechanic,mechanics:[...new Set(spec.beats.map(b=>b.kind))],terrain:[...new Set(platforms.map(p=>p.terrain!))] as TerrainKind[],verticality:spec.verticality??'medium',enemyProfile:spec.enemyProfile??(enemies.length?'light':'none'),targetDurationSeconds:Math.round(finish.x/3.2),seed:spec.seed},
  environment:spec.environment,
  sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Country challenge',x:+(finish.x*.35).toFixed(1)},{id:'C',label:'Discovery viewpoint',x:+(finish.x*.8).toFixed(1)}],
  platforms,spawn:[platforms[0].id,2],finish:[finish.id,finish.width-2],checkpoints,discovery:[finish.id,Math.max(2,finish.width-4)],
  coins:cleanCoins,stars,edges,
  ...(hazards.length?{hazards}:{}),...(enemies.length?{enemies}:{}),...(switches.length?{switches}:{}),...(gates.length?{gates}:{}),...(zones.length?{zones}:{}),
 });
 return level;
}
