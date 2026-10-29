import {describe,expect,it} from 'vitest';
import {countries} from '../lib/world-explorer/catalog';
import {buildCountryCourse} from '../components/world-explorer/country-scene';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';

const codes=[...countries.map(c=>c.code),'ANTARCTICA'];
describe('All country routes and the Antarctica expedition',()=>{
 it('builds 194 deterministic, finite and individually seeded routes',()=>{
  expect(codes).toHaveLength(194);
  const layouts=new Set<string>();
  for(const code of codes){
   const course=buildCountryCourse({code});
   expect(course).toEqual(buildCountryCourse({code}));
   expect(course.platforms[0]).toMatchObject({x:0,y:0,motion:null});
   expect(course.platforms[0].width).toBeGreaterThan(5);
   const final=course.platforms.at(-1)!;
   expect(course.finish).toBeGreaterThan(final.x);
   expect(course.finish).toBeLessThan(final.x+final.width);
   layouts.add(JSON.stringify(course.platforms));
  }
  expect(layouts.size).toBe(194);
 });
 it('keeps jumps physically reachable even at worst moving-platform offsets',()=>{
  for(const code of codes)for(const difficulty of [1,2,3,4] as const){
   const course=buildCountryCourse({code,difficulty}),{gravity,jumpSpeed,runSpeed}=course;
   const level=code==='JPN'?levelDefinitionFor(code,difficulty):undefined;
   const routes=level?[level.mainRoute!,level.upperRoute!].map(ids=>ids.map(id=>course.platforms.find((platform)=>'id'in platform&&platform.id===id)!)):[course.platforms];
   for(const platforms of routes)for(let i=1;i<platforms.length;i++){
    const a=platforms[i-1],b=platforms[i];
    const rise=b.y-a.y+(a.motion==='vertical'?a.amplitude:0)+(b.motion==='vertical'?b.amplitude:0);
    const discriminant=jumpSpeed**2-2*gravity*rise;
    expect(discriminant,`${code} difficulty ${difficulty} jump ${i} vertical clearance`).toBeGreaterThan(0);
    const flightTime=(jumpSpeed+Math.sqrt(discriminant))/gravity;
    const gap=b.x-(a.x+a.width)+(a.motion==='horizontal'?a.amplitude:0)+(b.motion==='horizontal'?b.amplitude:0);
    if(code!=='JPN')expect(gap,`${code} jump ${i}`).toBeGreaterThan(0);
    expect(gap+.55,`${code} difficulty ${difficulty} jump ${i} landing margin`).toBeLessThan(runSpeed*flightTime);
    expect(b.width).toBeGreaterThanOrEqual(code==='JPN'?1.6:2.8);
    for(const value of [b.x,b.y,b.width,b.amplitude,b.phase])expect(Number.isFinite(value)).toBe(true);
   }
  }
 });
 it('adds challenge through longer courses, narrower platforms and moving landings',()=>{
  for(const code of codes){
   const easy=buildCountryCourse({code,difficulty:1}),expert=buildCountryCourse({code,difficulty:4});
   // The authored Japan prototype teaches a gentle moving landing even on
   // Discovery difficulty; seeded previews add motion at higher settings.
   expect(easy.platforms.some(p=>!!p.motion)).toBe(code==='JPN');
   expect(expert.platforms.some(p=>!!p.motion)).toBe(true);
   if(code==='JPN'){expect(expert.platforms.length).toBe(easy.platforms.length);expect(levelDefinitionFor(code,4).enemies![0].speed).toBeGreaterThan(levelDefinitionFor(code,1).enemies![0].speed);}else expect(expert.platforms.length).toBeGreaterThan(easy.platforms.length);
   const mean=(rows:typeof easy.platforms)=>rows.slice(1).reduce((n,p)=>n+p.width,0)/(rows.length-1);
   expect(mean(expert.platforms)).toBeLessThan(mean(easy.platforms));
  }
 });
});
