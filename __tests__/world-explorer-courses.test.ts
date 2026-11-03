import {describe,expect,it} from 'vitest';
import {countries} from '../lib/world-explorer/catalog';
import {buildCountryCourse} from '../components/world-explorer/country-scene';
import {isAuthoredLevel,levelDefinitionFor} from '../lib/world-explorer/level-manifest';

const codes=[...countries.map(c=>c.code),'ANTARCTICA'];
describe('All country routes and the Antarctica expedition',()=>{
 it('builds 194 deterministic, finite and individually seeded routes',()=>{
  expect(codes).toHaveLength(194);
  const layouts=new Set<string>();
  for(const code of codes){
   const course=buildCountryCourse({code});
   expect(course).toEqual(buildCountryCourse({code}));
   // Route-graph levels start on ground that continues off-screen to the left.
   if(levelDefinitionFor(code).routeGraph)expect(course.platforms[0].x).toBeLessThanOrEqual(0);else expect(course.platforms[0]).toMatchObject({x:0,y:0,motion:null});
   expect(course.platforms[0].width).toBeGreaterThan(5);
   const graph=levelDefinitionFor(code).routeGraph?levelDefinitionFor(code):undefined,final=graph?course.platforms.find(p=>'id'in p&&p.id===graph.finish.platformId)!:course.platforms.at(-1)!;
   expect(course.finish).toBeGreaterThan(final.x);
   expect(course.finish).toBeLessThan(final.x+final.width);
   layouts.add(JSON.stringify(course.platforms));
  }
  expect(layouts.size).toBe(194);
 });
 it('keeps Japan and seeded preview jumps reachable even at worst moving-platform offsets',()=>{
  // Other authored countries have their own timed-platform route checks.
  // This invariant predates those manifests and applies to Japan/previews.
  for(const code of codes.filter(code=>code==='JPN'||!isAuthoredLevel(code)))for(const difficulty of [1,2,3,4] as const){
   const course=buildCountryCourse({code,difficulty}),{gravity,jumpSpeed,runSpeed}=course;
   const level=isAuthoredLevel(code)?levelDefinitionFor(code,difficulty):undefined;
   const routes=level?[level.mainRoute!,level.upperRoute!].map(ids=>ids.map(id=>course.platforms.find((platform)=>'id'in platform&&platform.id===id)!)):[course.platforms];
   for(const platforms of routes)for(let i=1;i<platforms.length;i++){
    const a=platforms[i-1],b=platforms[i];
    const rise=b.y-a.y+(a.motion==='vertical'?a.amplitude:0)+(b.motion==='vertical'?b.amplitude:0);
    const discriminant=jumpSpeed**2-2*gravity*rise;
    expect(discriminant,`${code} difficulty ${difficulty} jump ${i} vertical clearance`).toBeGreaterThan(0);
    const flightTime=(jumpSpeed+Math.sqrt(discriminant))/gravity;
    const gap=b.x-(a.x+a.width)+(a.motion==='horizontal'?a.amplitude:0)+(b.motion==='horizontal'?b.amplitude:0);
    if(!level)expect(gap,`${code} jump ${i}`).toBeGreaterThan(0);
    expect(gap+.55,`${code} difficulty ${difficulty} jump ${i} landing margin`).toBeLessThan(runSpeed*flightTime);
    expect(b.width).toBeGreaterThanOrEqual(level?1.6:2.8);
    for(const value of [b.x,b.y,b.width,b.amplitude,b.phase])expect(Number.isFinite(value)).toBe(true);
   }
  }
 });
 it('adds challenge through longer courses, narrower platforms and moving landings',()=>{
  for(const code of codes){
   const easy=buildCountryCourse({code,difficulty:1}),expert=buildCountryCourse({code,difficulty:4});
   const mean=(rows:typeof easy.platforms)=>rows.slice(1).reduce((n,p)=>n+p.width,0)/(rows.length-1);
   // A route-graph level is validated as built: Expert keeps every jump and only quickens patrols.
   if(levelDefinitionFor(code).routeGraph){expect(expert.platforms).toEqual(easy.platforms);const fast=levelDefinitionFor(code,4).enemies||[],slow=levelDefinitionFor(code,1).enemies||[];fast.forEach((enemy,i)=>expect(enemy.speed).toBeGreaterThan(slow[i].speed));continue;}
   // Authored prototypes teach a gentle moving landing even on Discovery
   // difficulty; seeded previews introduce motion at higher settings.
   expect(easy.platforms.some(p=>!!p.motion)).toBe(isAuthoredLevel(code));
   expect(expert.platforms.some(p=>!!p.motion)).toBe(true);
   if(isAuthoredLevel(code)){expect(expert.platforms.length).toBe(easy.platforms.length);expect(levelDefinitionFor(code,4).enemies![0].speed).toBeGreaterThan(levelDefinitionFor(code,1).enemies![0].speed);}else expect(expert.platforms.length).toBeGreaterThan(easy.platforms.length);
   expect(mean(expert.platforms)).toBeLessThan(mean(easy.platforms));
  }
 });
});
