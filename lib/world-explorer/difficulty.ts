import {FIXED_STEP,LevelSimulation} from './simulation';
import {extent} from './level-analysis';
import {routeGraphFor} from './route-graph';
import type {DifficultyTier,LevelDefinition} from './game-types';

/** Five difficulty tiers calibrated to the measured jump envelope. A tier
 * names the typical horizontal gap (as a % of the longest running jump,
 * Dmax) and the largest step up (as a % of the highest jump, Hmax). */
export const tiers:{tier:DifficultyTier;name:string;gap:[number,number];step:number;share:number}[]=[
 {tier:1,name:'Explorer',gap:[25,45],step:30,share:39},
 {tier:2,name:'Adventurer',gap:[35,55],step:40,share:39},
 {tier:3,name:'Challenger',gap:[45,65],step:50,share:39},
 {tier:4,name:'Expert Explorer',gap:[55,75],step:60,share:38},
 {tier:5,name:'Master Explorer',gap:[65,85],step:70,share:38},
];
export const tierName=(tier:number)=>tiers[Math.max(1,Math.min(5,tier))-1].name;

export type JumpEnvelope={dmax:number;hmax:number};
const envelopes=new Map<string,JumpEnvelope>();

/** Measure Dmax and Hmax with the real simulation: a full-speed running jump
 * from flat ground, landing back at the same height. */
export function measureJumpEnvelope(physics:LevelDefinition['physics']):JumpEnvelope{
 const key=JSON.stringify(physics);const cached=envelopes.get(key);if(cached)return cached;
 const level={id:'envelope',countryId:'JP',legacyCode:'JPN',title:'Envelope',environmentId:'test',spawn:{platformId:'floor',offset:1},platforms:[{id:'floor',x:0,y:0,width:30,depth:3,thickness:2,type:'stone',motion:null,amplitude:0,phase:0,period:5},{id:'end',x:31,y:0,width:2,depth:3,thickness:2,type:'stone',motion:null,amplitude:0,phase:0,period:5}],coins:[],stars:[0,1,2].map(i=>({id:'s'+i,platformId:'end',offset:1,height:1})),checkpoints:[],discovery:{id:'d',platformId:'end',offset:1,factId:'f'},finish:{platformId:'end',offset:1.5},hazards:[],physics} as LevelDefinition;
 const simulation=new LevelSimulation(level),s=simulation.state;let takeoff=0,peak=0,jumped=false;
 for(let frame=0;frame<400;frame++){
  const jump=frame>=60&&frame<62;simulation.setInput({left:false,right:true,jump});simulation.advance(FIXED_STEP);
  if(!jumped&&!s.grounded){jumped=true;takeoff=s.x-s.vx*FIXED_STEP;}
  if(jumped){peak=Math.max(peak,s.y);if(s.grounded){const envelope={dmax:s.x-takeoff,hmax:peak};envelopes.set(key,envelope);return envelope;}}
 }
 throw new Error('Jump envelope could not be measured.');
}

export type MeasuredJump={from:string;to:string;action:string;gap:number;rise:number;gapPercent:number;stepPercent:number;tier:number};
export type DifficultyReport={envelope:JumpEnvelope;jumps:MeasuredJump[];mechanics:string[];measuredTier:DifficultyTier;declaredTier?:DifficultyTier;score:number;warnings:string[]};

const tierFor=(gapPercent:number,stepPercent:number)=>{
 const byGap=gapPercent<=45?1:gapPercent<=55?2:gapPercent<=65?3:gapPercent<=75?4:gapPercent<=85?5:6;
 const byStep=stepPercent<=30?1:stepPercent<=40?2:stepPercent<=50?3:stepPercent<=60?4:stepPercent<=70?5:6;
 return Math.max(byGap,byStep);
};

/** Read the critical path's jumps and hazards against the measured envelope.
 * The tier is the mean of the hardest third of the jumps (at least three)
 * plus a bounded allowance
 * for mechanics that demand timing (moving, swinging, crumbling, ice, wind,
 * timed gates, patrols). Warnings are for a designer to review. */
export function analyzeDifficulty(level:LevelDefinition):DifficultyReport{
 const envelope=measureJumpEnvelope(level.physics),graph=routeGraphFor(level),byId=new Map(level.platforms.map(p=>[p.id,p])),node=new Map(graph.nodes.map(n=>[n.id,n]));
 const jumps:MeasuredJump[]=[];
 for(const edge of graph.edges){
  if(!edge.mandatory||edge.action==='WALK'||edge.action==='DROP'||edge.action==='PASS_GATE'||edge.action==='ACTIVATE_SWITCH')continue;
  const a=byId.get(node.get(edge.from)!.platformId)!,b=byId.get(node.get(edge.to)!.platformId)!;if(a.id===b.id||a.bounce)continue; // a bounce pad's launch is its own mechanic, not a jump
  if(b.climbable&&edge.action==='CLIMB'&&extent(b).left-extent(a).right<.6)continue; // so is a climb up a climbable face
  const ea=extent(a),eb=extent(b),gap=Math.max(0,eb.left-ea.right),rise=(b.motion?eb.low:eb.leftY)-(a.motion?ea.top:ea.rightY);
  const gapPercent=gap/envelope.dmax*100,stepPercent=Math.max(0,rise)/envelope.hmax*100;
  jumps.push({from:edge.from,to:edge.to,action:edge.action,gap,rise,gapPercent,stepPercent,tier:gap<.05&&rise<.45?0:tierFor(gapPercent,stepPercent)});
 }
 const critical=new Set(graph.edges.filter(e=>e.mandatory).flatMap(e=>[e.from,e.to]).map(id=>node.get(id)!.platformId)),onPath=level.platforms.filter(p=>critical.has(p.id));
 const mechanics=[...new Set([
  ...onPath.flatMap(p=>[p.motion==='pendulum'?'swinging':p.motion?'moving':'',p.collapse?'collapsing':'',p.surface==='ice'?'ice':'',p.bounce?'bounce':'',p.climbable?'climbing':'',p.current?'current':'',p.raise?'raised-platform':'']),
  ...(level.zones||[]).map(()=>'wind'),...(level.gates||[]).map(()=>'timed-gate'),...(level.enemies||[]).filter(e=>critical.has(e.platformId)).map(()=>'patrol'),
  ...level.hazards.filter(h=>h.cycle).map(()=>'timed-hazard'),
 ].filter(Boolean))];
 const ranked=jumps.map(j=>j.tier).filter(t=>t>0).sort((a,b)=>b-a),hardest=ranked.slice(0,Math.max(3,Math.ceil(ranked.length/3))),base=hardest.length?hardest.reduce((a,b)=>a+b,0)/hardest.length:1;
 const score=base+Math.min(.45,mechanics.filter(m=>m!=='bounce').length*.12),measuredTier=Math.max(1,Math.min(5,Math.round(score))) as DifficultyTier;
 const warnings:string[]=[],declared=level.difficultyTier;
 for(const jump of jumps){
  if(jump.gapPercent>85)warnings.push(`${jump.from} → ${jump.to}: gap is ${jump.gapPercent.toFixed(0)}% of Dmax (above every tier).`);
  if(jump.stepPercent>70)warnings.push(`${jump.from} → ${jump.to}: step up is ${jump.stepPercent.toFixed(0)}% of Hmax (above every tier).`);
  if(declared&&jump.tier>declared+1)warnings.push(`${jump.from} → ${jump.to}: a tier ${jump.tier} jump in a tier ${declared} level.`);
 }
 if(declared&&Math.abs(measuredTier-declared)>=1)warnings.push(`Measured tier ${measuredTier} differs from declared tier ${declared}.`);
 return{envelope,jumps,mechanics,measuredTier,declaredTier:declared,score,warnings};
}

/** Explorer accessibility mode: the same route with gentler timing. Longer
 * coyote and jump buffers, slower motion, weaker gusts, longer gate and
 * raised-platform windows, longer calm between timed hazards, weaker
 * currents, slower crumbling and patrols. Jumps and layout are unchanged. */
export function explorerAssist(source:LevelDefinition):LevelDefinition{
 const level=structuredClone(source);
 level.physics.coyoteTime=.2;level.physics.jumpBuffer=.2;
 for(const p of level.platforms){if(p.motion){p.period*=1.3;if(p.pause)p.pause*=1.3;}if(p.collapse)p.collapse={delay:Math.min(5,p.collapse.delay*2),respawn:p.collapse.respawn};if(p.raise)p.raise={...p.raise,seconds:Math.min(30,p.raise.seconds*1.5)};if(p.current)p.current*=.6;}
 for(const hazard of level.hazards)if(hazard.cycle){const c=hazard.cycle,period=Math.min(30,c.period+(c.period-c.warning-c.active)*.5);hazard.cycle={...c,period,warning:Math.min(5,c.warning+(period-c.period)*.5)};}
 for(const zone of level.zones||[])zone.force*=.5;
 for(const gate of level.gates||[])gate.openSeconds=Math.min(30,gate.openSeconds*1.5);
 for(const enemy of level.enemies||[])enemy.speed=Math.max(.2,enemy.speed*.7);
 return level;
}
