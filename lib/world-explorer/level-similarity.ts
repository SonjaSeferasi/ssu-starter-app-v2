import {extent} from './level-analysis';
import {analyzeDifficulty} from './difficulty';
import {criticalPlatforms,routeGraphFor} from './route-graph';
import type {LevelDefinition} from './game-types';

/** A level's structural fingerprint: what a player does, not what they see.
 * Two countries can share an engine and still play differently; this is the
 * evidence. Colours, models and names are deliberately not part of it. */
export type LevelFingerprint={
 levelId:string;archetype:string;signature:string;mechanics:string[];terrain:string[];
 /** Quantized rhythm of the critical path: one symbol per move. */
 rhythm:string;
 metrics:{moves:number;meanGap:number;gapSpread:number;verticalRange:number;continuousShare:number;optionalShare:number;movingShare:number;sections:number};
};

const symbol=(gap:number,rise:number,moving:boolean,action:string)=>action==='PASS_GATE'||action==='ACTIVATE_SWITCH'?'G':action==='CLIMB'&&rise>1.5?'C':moving?'M':gap<.05&&Math.abs(rise)<.45?'w':rise>.8?'U':rise<-.8?'D':gap>3?'L':'j';

export function fingerprint(level:LevelDefinition):LevelFingerprint{
 const graph=routeGraphFor(level),path=criticalPlatforms(graph),byId=new Map(level.platforms.map(p=>[p.id,p])),node=new Map(graph.nodes.map(n=>[n.id,n]));
 const moves=graph.edges.filter(e=>e.mandatory).map(e=>{const a=byId.get(node.get(e.from)!.platformId)!,b=byId.get(node.get(e.to)!.platformId)!,ea=extent(a),eb=extent(b),gap=Math.max(0,eb.left-ea.right),rise=eb.leftY-ea.rightY;return{gap,rise,s:symbol(gap,rise,!!b.motion,e.action)};});
 const gaps=moves.map(m=>m.gap),mean=gaps.reduce((a,b)=>a+b,0)/Math.max(1,gaps.length),spread=Math.sqrt(gaps.reduce((a,g)=>a+(g-mean)**2,0)/Math.max(1,gaps.length));
 const ys=path.map(id=>byId.get(id)!).flatMap(p=>[p.y,p.y+(p.slope||0)]);
 const mechanics=analyzeDifficulty(level).mechanics.concat(level.platforms.some(p=>p.steps)?['stairs']:[],level.platforms.some(p=>p.slope&&!p.steps)?['slopes']:[]);
 const terrain=[...new Set(level.platforms.map(p=>p.terrain||(p.type==='stone'?(p.thickness>=8?'ground':'rock'):p.motion?'mechanical':'bridge')))].sort();
 return{
  levelId:level.id,archetype:level.design?.archetype||'template-a-to-h',signature:level.design?.signatureMechanic||'none',mechanics:[...new Set(mechanics)].sort(),terrain,rhythm:moves.map(m=>m.s).join(''),
  metrics:{moves:moves.length,meanGap:mean,gapSpread:spread,verticalRange:ys.length?Math.max(...ys)-Math.min(...ys):0,continuousShare:moves.filter(m=>m.s==='w').length/Math.max(1,moves.length),optionalShare:graph.edges.filter(e=>!e.mandatory).length/Math.max(1,graph.edges.length),movingShare:path.filter(id=>byId.get(id)!.motion).length/Math.max(1,path.length),sections:level.sections?.length??0},
 };
}

const jaccard=(a:string[],b:string[])=>{const A=new Set(a),B=new Set(b),union=new Set([...A,...B]);return union.size?[...A].filter(x=>B.has(x)).length/union.size:1;};
/** Normalized edit distance between two move rhythms (1 = identical). */
function rhythmSimilarity(a:string,b:string){
 if(!a.length&&!b.length)return 1;const row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const current=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=current;}}
 return 1-row[b.length]/Math.max(a.length,b.length);
}
const closeness=(a:number,b:number,scale:number)=>1-Math.min(1,Math.abs(a-b)/scale);

export type SimilarityResult={a:string;b:string;score:number;parts:Record<string,number>;review:boolean};
/** Weighted structural similarity in [0,1]. At or above `threshold` the pair
 * is flagged for human review; the tool never rejects a level by itself. */
export function compareLevels(a:LevelFingerprint,b:LevelFingerprint,threshold=.72):SimilarityResult{
 const m=a.metrics,n=b.metrics;
 const parts={
  archetype:a.archetype===b.archetype?1:0,signature:a.signature===b.signature?1:0,
  mechanics:jaccard(a.mechanics,b.mechanics),terrain:jaccard(a.terrain,b.terrain),rhythm:rhythmSimilarity(a.rhythm,b.rhythm),
  shape:(closeness(m.moves,n.moves,12)+closeness(m.meanGap,n.meanGap,2)+closeness(m.gapSpread,n.gapSpread,1.5)+closeness(m.verticalRange,n.verticalRange,6)+closeness(m.continuousShare,n.continuousShare,.5)+closeness(m.optionalShare,n.optionalShare,.4)+closeness(m.movingShare,n.movingShare,.3)+(m.sections===n.sections?1:0))/8,
 };
 const score=parts.archetype*.12+parts.signature*.1+parts.mechanics*.18+parts.terrain*.1+parts.rhythm*.25+parts.shape*.25;
 return{a:a.levelId,b:b.levelId,score,parts,review:score>=threshold};
}

/** Every pair, most similar first. */
export function similarityMatrix(levels:LevelDefinition[],threshold=.72){
 const prints=levels.map(fingerprint),pairs:SimilarityResult[]=[];
 for(let i=0;i<prints.length;i++)for(let j=i+1;j<prints.length;j++)pairs.push(compareLevels(prints[i],prints[j],threshold));
 return pairs.sort((x,y)=>y.score-x.score);
}
