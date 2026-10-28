import snapshot from '../../public/world-explorer/data/profiles.json';
import {countryByCode,type Biome} from './catalog';

/** A scene-building archetype, not a formal classification of a monument. */
export type LandmarkKind='mountain'|'pyramid'|'tower'|'palace'|'castle'|'pagoda'|'mosque'|'cathedral'|'old-town'|'harbour'|'bridge'|'ruins'|'rainforest'|'forest'|'glacier'|'savanna'|'wetland'|'desert'|'island'|'research-station'|'civic';
export type CountryProfile={
 code:string;levelTitle:string;landmarkName:string;landmarkKind:LandmarkKind;
 palette:{stone:string;roof:string;accent:string;foliage:string};
 features:string[];biome:Biome;sourceUrl:string;representation:'stylized';mediaSearch:string;referenceFile?:string;
 shapeHints?:{height?:number;width?:number;towers?:number;tiers?:number;arches?:number;roof?:'flat'|'gable'|'dome'|'tiered'|'spire'};
};
const byCode=new Map(snapshot.profiles.map(profile=>[profile.code,profile as CountryProfile]));
export const profileAttribution=snapshot.source;
export const profileRepresentation=snapshot.representation;
export const profileSnapshotDate=snapshot.reviewed;

/** Unknown areas cannot acquire invented country profiles through an API. */
export function countryProfile(code:string):CountryProfile|undefined{
 const key=code.toUpperCase();
 if(key==='ANTARCTICA')return byCode.get(key);
 return countryByCode(key)?byCode.get(key):undefined;
}
