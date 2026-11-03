import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {guideDestination} from '../lib/world-explorer/guide-destination';
import {commonsImage,landmarkImage} from '../lib/world-explorer/media';
import {southAmerica} from '../lib/world-explorer/south-america';
import {countryProfile} from '../lib/world-explorer/profiles';
import {countryByCode} from '../lib/world-explorer/catalog';
import {discoveryFor} from '../lib/world-explorer-discoveries';

/** The country guide must describe the place a playable level is set in:
 * its Place and Landscape lines and its reference photograph, not the
 * country's older general profile (Chile's level is El Tatio, not Rapa Nui).
 * Capital facts stay with the catalogue. */
const page=(title:string)=>({title:`File:${title}`,imageinfo:[{mime:'image/jpeg',thumburl:`https://upload.wikimedia.org/wikipedia/commons/thumb/t/${encodeURIComponent(title)}`,descriptionurl:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,extmetadata:{Artist:{value:'Photographer'},LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0'}}}]});
const built=southAmerica.filter(entry=>entry.levelBuilt);
afterEach(()=>vi.unstubAllGlobals());

describe('Country guide destination for authored South American levels',()=>{
 it.each(built.map(entry=>[entry.code,entry] as const))('%s guide names the level\'s own place, landscape and photo subject',(code,entry)=>{
  const destination=guideDestination(code)!;
  expect(destination.fromLevel).toBe(true);
  expect(destination.place).toContain(entry.featuredLandmark.name);expect(destination.place).toContain(entry.locationName);
  expect(destination.landscape.length).toBeGreaterThanOrEqual(2);
  // The discovery fact shown above the guide is about the same place.
  expect(discoveryFor(code)?.landmark,code).toBeTruthy();
  // The old profile destination is not reused when it is a different place,
  // and its photographs are not accepted for the level's subject.
  const profile=countryProfile(code)!;
  // The level's photo-subject words identify its place; when the old profile
  // names the same place (Uruguay's Colonia, Paraguay's Trinidad) there is no mismatch.
  const fold=(t:string)=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(),samePlace=destination.place.includes(profile.landmarkName)||fold(destination.photoSubject).split(' ').every(word=>fold(profile.landmarkName).includes(word));
  if(!samePlace){
   expect(destination.place).not.toContain(profile.landmarkName);
   expect(commonsImage({query:{pages:[page(`${profile.landmarkName}.jpg`)]}},destination.photoSubject),`${code} accepts a ${profile.landmarkName} photo`).toBeNull();
  }
 });
 it('fixes the reported mismatches and keeps the capitals',()=>{
  const chile=guideDestination('CHL')!,colombia=guideDestination('COL')!,ecuador=guideDestination('ECU')!;
  expect(chile.place).toContain('El Tatio');expect(chile.place).not.toContain('Rapa Nui');expect(chile.landscape.join(' ')).not.toMatch(/island/i);
  expect(colombia.place).toContain('Cocora');expect(colombia.place).not.toContain('Cartagena');expect(colombia.landscape.join(' ')).not.toMatch(/cathedral|fortif|palat/i);
  expect(ecuador.place).toContain('Galápagos');expect(ecuador.place).not.toContain('Quito');expect(ecuador.landscape.join(' ')).not.toMatch(/baroque|church|monast/i);
  expect(countryByCode('ECU')!.capital).toContain('Quito');expect(countryByCode('CHL')!.capital).toContain('Santiago');expect(countryByCode('COL')!.capital).toContain('Bogotá');
 });
 it('accepts a photograph only when its title names the level\'s place, accents folded',()=>{
  expect(commonsImage({query:{pages:[page('Pahoehoe Lava Flow on Santiago island in Galapagos Islands.jpg')]}},guideDestination('ECU')!.photoSubject)).not.toBeNull();
  expect(commonsImage({query:{pages:[page('Quito street.jpg')]}},guideDestination('ECU')!.photoSubject)).toBeNull();
  expect(commonsImage({query:{pages:[page('Rapa Nui moai.jpg')]}},guideDestination('CHL')!.photoSubject)).toBeNull();
  expect(commonsImage({query:{pages:[page('Spherical panorama Amazon rainforest.jpg')]}},'Amazon rainforest')).toBeNull();
 });
 it('looks up the photograph for the level\'s destination, not the old profile place',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({query:{pages:[page('Rapa Nui National Park.jpg'),page('El Tatio geyser field - panoramio.jpg')]}})});vi.stubGlobal('fetch',fetch);
  const image=await landmarkImage('CHL');
  expect(new URL(fetch.mock.calls[0][0]).searchParams.get('gsrsearch')).toContain(guideDestination('CHL')!.mediaSearch);
  expect(image?.title).toBe('El Tatio geyser field - panoramio.jpg');
 });
 it('keeps non-South-American countries on their general profile',()=>{
  const japan=guideDestination('JPN'),profile=countryProfile('JPN')!;expect(japan?.fromLevel).toBe(false);expect(japan?.place).toBe(profile.landmarkName);
 });
 it('renders the guide\'s Place and Landscape from the destination',()=>{
  // The guide component is internal to the run screen; its source must read
  // the destination, never the general profile, for these two lines.
  const source=readFileSync('components/world-explorer/country-run.tsx','utf8');
  expect(source).toContain('<dt>Place</dt><dd>{destination?.place}</dd>');expect(source).toContain('<dt>Landscape</dt><dd>{destination?.landscape.join(');
  expect(source).not.toContain('<dt>Place</dt><dd>{profile?.landmarkName}</dd>');
 });
});
