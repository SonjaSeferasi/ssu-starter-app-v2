import {describe,it,expect} from 'vitest';
import {countries} from '../lib/world-explorer/catalog';
import {countryProfile,profileRepresentation} from '../lib/world-explorer/profiles';

describe('Country-specific World Explorer place profiles',()=>{
 it('gives all 193 members a named, sourced place profile with bounded art and descriptive traits',()=>{
  const names=new Set<string>(),kinds=new Set<string>();
  for(const country of countries){
   const profile=countryProfile(country.code);expect(profile?.code).toBe(country.code);expect(profile?.landmarkName.length).toBeGreaterThan(2);
   expect(profile?.sourceUrl).toMatch(/^https:\/\//);expect(profile?.features.length).toBeGreaterThan(0);expect(profile?.features.length).toBeLessThanOrEqual(3);expect(profile?.representation).toBe('stylized');
   for(const color of Object.values(profile!.palette))expect(color).toMatch(/^#[0-9a-f]{6}$/i);
   names.add(profile!.landmarkName);kinds.add(profile!.landmarkKind);
  }
  expect(names.size).toBe(193);expect(kinds.size).toBeGreaterThanOrEqual(15);
 });
 it('preserves named physical distinctions rather than giving all countries the same continent icon',()=>{
  expect(countryProfile('JPN')?.landmarkName).toBe('Mount Fuji');expect(countryProfile('JPN')?.landmarkKind).toBe('mountain');
  expect(countryProfile('EGY')?.landmarkKind).toBe('pyramid');expect(countryProfile('FRA')?.landmarkName).toBe('Eiffel Tower');
  expect(countryProfile('MDG')?.landmarkKind).toBe('forest');expect(countryProfile('BRA')?.landmarkKind).toBe('rainforest');
  expect(countryProfile('BIH')?.landmarkKind).toBe('bridge');expect(countryProfile('ARG')?.landmarkKind).toBe('glacier');
 });
 it('uses real named places for smaller countries and qualifies geometric interpretations',()=>{
  const nauru=countryProfile('NRU');expect(nauru?.landmarkName).toBe('Buada Lagoon');expect(nauru?.landmarkKind).toBe('wetland');expect(nauru?.features).toContain('Landlocked waterbody');
  expect(countryProfile('BDI')?.features).toContain('Circular thatched royal houses');expect(countryProfile('SOM')?.landmarkName).toContain('Somaliland region');
  expect(countryProfile('KWT')?.landmarkName).toBe('Kuwait Towers');expect(countryProfile('TON')?.features).toContain('Two upright stones');
  for(const country of countries)expect(countryProfile(country.code)?.features).not.toContain('Civic route illustration');
  for(const code of ['GAB','COG'])expect(countryProfile(code)?.features).not.toContain('Glacial landscape');
  expect(profileRepresentation).toContain('not scans');expect(profileRepresentation).toContain('not verified historical paint colours');
 });
 it('includes the Antarctic science expedition without inventing a country or accepting unsupported areas',()=>{
  expect(countryProfile('ANTARCTICA')?.landmarkKind).toBe('research-station');for(const code of ['VAT','PSE','TWN','XKX','ZZZ'])expect(countryProfile(code)).toBeUndefined();
 });
});
