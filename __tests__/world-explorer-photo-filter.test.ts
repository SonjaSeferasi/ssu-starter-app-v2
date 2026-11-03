import {describe,expect,it} from 'vitest';
import {guideDestination} from '../lib/world-explorer/guide-destination';
import {commonsImage} from '../lib/world-explorer/media';
import {countries} from '../lib/world-explorer/catalog';

/** Regression cases for the shared landmark-card photo filter, from the Africa
 * review. These are synthetic Commons responses: they pin down the matching
 * rules, not which photograph the live search returns (the live selections are
 * recorded by scripts/world-explorer/africa-photo-audit.mjs against the
 * running app). The filter is shared by every continent; the last case checks
 * that every destination's own names still match a file titled with them. */
const page=(title:string,index?:number)=>({title:`File:${title}`,...(index===undefined?{}:{index}),imageinfo:[{mime:'image/jpeg',thumburl:`https://upload.wikimedia.org/wikipedia/commons/thumb/t/${encodeURIComponent(title)}`,descriptionurl:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,extmetadata:{Artist:{value:'Photographer'},LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0'}}}]});
const pick=(titles:(string|[string,number])[],code:string)=>{const d=guideDestination(code)!;return commonsImage({query:{pages:titles.map(t=>typeof t==='string'?page(t):page(t[0],t[1]))}},d.photoAliases??d.photoSubject)?.title??null;};

describe('Landmark photo filter: Africa regressions',()=>{
 it('Kenya: "Mara" is a whole word, so "Samara" and "Maramureș" never match',()=>{
  expect(pick(['Samara river embankment.jpg'],'KEN')).toBeNull();
  expect(pick(['Maramureș wooden church.jpg'],'KEN')).toBeNull();
  expect(pick(['Mara River crossing, Kenya.jpg'],'KEN')).toBe('Mara River crossing, Kenya.jpg');
  expect(pick(['Wildebeest_crossing_the_Mara-River.jpg'],'KEN')).toBe('Wildebeest_crossing_the_Mara-River.jpg');
 });
 it('Kenya: the reserve\'s verified names are accepted, each only in full',()=>{
  expect(guideDestination('KEN')!.photoAliases).toEqual(['Mara River','Maasai Mara','Masai Mara']);
  expect(pick(['Wildebeest migration, Maasai Mara.jpg'],'KEN')).toBe('Wildebeest migration, Maasai Mara.jpg');
  expect(pick(['Masai Mara sunrise.jpg'],'KEN')).toBe('Masai Mara sunrise.jpg');
  // "Masai" alone names a people, not the reserve; "Mara" alone is not enough either.
  expect(pick(['Masai warriors dancing.jpg','Mara village market.jpg'],'KEN')).toBeNull();
 });
 it('generic single words no longer identify a destination',()=>{
  expect(pick(['Giraffe at Berlin Zoo.jpg','Koure giraffes, Niger.jpg'],'NER')).toBe('Koure giraffes, Niger.jpg');
  expect(pick(['Djembe drum.jpg'],'BDI')).toBeNull();
  expect(pick(['Burundi drummers at Gitega.jpg'],'BDI')).toBe('Burundi drummers at Gitega.jpg');
  expect(pick(['Source of the Nile.jpg'],'SYC')).toBeNull();
  expect(pick(['Rio Grande.jpg'],'STP')).toBeNull();
  expect(pick(['Volcanoes of Hawaii.jpg'],'RWA')).toBeNull();
  expect(pick(['Tsingy de Bemaraha strict reserve.jpg','Tsingy of Ankarana.jpg'],'MDG')).toBe('Tsingy de Bemaraha strict reserve.jpg');
  expect(pick(['Murchison House, Western Australia.jpg'],'UGA')).toBeNull();
  expect(pick(['Lake Abbey reflections.jpg'],'DJI')).toBeNull();
  expect(pick(['La mariée.jpg'],'GIN')).toBeNull();
  expect(pick(['Yamoussoukro street market.jpg'],'CIV')).toBeNull();
 });
 it('a country name alone (flags, maps) never passes',()=>{
  for(const [code,title] of [['GMB','Flag of the Gambia.png'],['MRT','Mauritania location map.png'],['CMR','Cameroon map.png'],['COG','Congo flag.png'],['MWI','Malawi map.png']] as const)expect(pick([title],code),code).toBeNull();
 });
 it('Tunisia now has a subject that can match (it used to be "El Jem", with no usable word)',()=>{
  expect(pick(['Amphitheatre of El Jem.jpg'],'TUN')).toBe('Amphitheatre of El Jem.jpg');
  expect(pick(['El Djem Amphitheatre 2012.jpg'],'TUN')).toBe('El Djem Amphitheatre 2012.jpg');
 });
});

describe('Landmark photo filter: search order',()=>{
 it('walks results by search rank ("index"), not by the order Commons lists them',()=>{
  // generator=search lists pages by page id; the best match can come last.
  expect(pick([['Mara River at dusk.jpg',3],['Mara River crossing.jpg',1],['Mara River bank.jpg',2]],'KEN')).toBe('Mara River crossing.jpg');
  // A better-ranked file that fails the filter is skipped for the next rank.
  expect(pick([['Mara River at dusk.jpg',3],['Samara.jpg',1],['Mara River bank.jpg',2]],'KEN')).toBe('Mara River bank.jpg');
  // Without rank information the listed order is kept.
  expect(pick(['Mara River at dusk.jpg','Mara River crossing.jpg'],'KEN')).toBe('Mara River at dusk.jpg');
 });
});

describe('Landmark photo filter: every continent',()=>{
 it('each destination\'s own names still match a file titled with them',()=>{
  const missed:string[]=[];
  for(const country of countries){
   const d=guideDestination(country.code);if(!d||d.photoFile)continue;
   for(const name of d.photoAliases??[d.photoSubject]){const t=`${name} 2024.jpg`;if(commonsImage({query:{pages:[page(t)]}},d.photoAliases??d.photoSubject)?.title!==t)missed.push(`${country.code}: ${name}`);}
  }
  expect(missed).toEqual([]);
 });
});
