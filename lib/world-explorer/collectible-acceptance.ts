import {authoredDifficulty,levelDefinitionFor} from './level-manifest';
import {playRoute,type Detour} from './level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from './route-graph';

/** Collectible acceptance at the difficulty the game itself plays a level at
 * (a level's own data can raise it; Brazil's says medium). A start delay
 * shifts every patrol, gust and hazard phase, so each route is played at
 * several timings. A coin or star counts as collected when a run that
 * completes without damage collects it. */
export const acceptanceTimings=[0,1.8,3.6];
/** Coins a player reaches by stepping back a little after a jump, which the
 * forward-moving bot does not do on its own: the platform is played with a
 * one-second backtrack. Argentina: at difficulty 2 the jump over the faster
 * crest patrol carries past ar-coin-20 on the moraine. */
export const stepBack:Record<string,string[]>={ARG:['ar-moraine']};

export type AcceptanceRun={route:'main'|'bonus';wait:number;status:string;damage:number;coins:number;stars:number};
export function collectibleAcceptance(code:string){
 const difficulty=authoredDifficulty(code)??1,level=levelDefinitionFor(code,difficulty),graph=routeGraphFor(level);
 const detours:Detour[]=(stepBack[code]||[]).map(platformId=>({platformId,kind:'backtrack',seconds:1}));
 const coins=new Set<string>(),stars=new Set<string>(),runs:AcceptanceRun[]=[];
 for(const wait of acceptanceTimings)for(const route of ['main','bonus'] as const){
  const result=playRoute(level,route==='main'?criticalPlatforms(graph):optionalPath(graph),{collectCoins:true,collectStars:route==='bonus',wait,detours});
  const s=result.simulation.state;runs.push({route,wait,status:s.status,damage:result.damage,coins:s.coins,stars:s.stars});
  if(s.status==='completed'&&result.damage===0){result.simulation.collectedCoins.forEach(id=>coins.add(id));result.simulation.collectedStars.forEach(id=>stars.add(id));}
 }
 const clean=runs.filter(run=>run.status==='completed'&&run.damage===0);
 return{difficulty,level,runs,
  incomplete:runs.filter(run=>run.status!=='completed'),damaged:runs.filter(run=>run.damage>0),
  cleanRoutes:[...new Set(clean.map(run=>run.route))].sort(),
  missingCoins:level.coins.filter(coin=>!coins.has(coin.id)).map(coin=>coin.id),missingStars:level.stars.filter(star=>!stars.has(star.id)).map(star=>star.id),
  coins:`${coins.size}/${level.coins.length}`,stars:`${stars.size}/${level.stars.length}`};
}
