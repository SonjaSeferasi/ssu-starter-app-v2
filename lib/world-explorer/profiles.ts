import {remainingNorthAmericaPlaces,type RemainingNorthAmericaCode} from './north-america-remaining';
import {westAsiaPlaces,type WestAsiaCode} from './west-asia';
import {africaPlaces,type AfricaCode} from './africa';
import {africaLevels} from './levels/africa';
import {northAmericaPlaces,type NorthAmericaCode} from './north-america';
import snapshot from '../../public/world-explorer/data/profiles.json';
import {countryByCode,type Biome} from './catalog';
import {eastAsiaPlaces,type NewEastAsiaCode} from './east-asia';
import {southeastAsiaPlaces,type SoutheastAsiaCode} from './southeast-asia';
import {southAsiaPlaces,type SouthAsiaCode} from './south-asia';
import {centralAsiaPlaces,type CentralAsiaCode} from './central-asia';
import {europePlaces,type EuropeCode} from './europe';
import {oceaniaPlaces,type OceaniaCode} from './oceania';

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
 const base=countryByCode(key)?byCode.get(key):undefined,place=eastAsiaPlaces[key as NewEastAsiaCode];
 const remaining=remainingNorthAmericaPlaces[key as RemainingNorthAmericaCode];
 if(base&&remaining)return{...base,levelTitle:remaining.title,landmarkName:remaining.landmark,landmarkKind:['citadel','hill-fort'].includes(remaining.theme)?'castle':remaining.theme==='maya'||remaining.theme==='buried-village'?'ruins':['crater','pitons','twin-volcanoes','boiling-lake'].includes(remaining.theme)?'mountain':remaining.theme==='mangrove'?'wetland':remaining.theme==='reef'||remaining.theme==='sand-cays'?'island':'old-town',sourceUrl:remaining.source,mediaSearch:remaining.landmark,referenceFile:undefined,features:[...remaining.features],biome:remaining.biome};
 const north=northAmericaPlaces[key as NorthAmericaCode];
 if(base&&north)return{...base,levelTitle:north.title,landmarkName:north.landmark,landmarkKind:key==='MEX'?'pyramid':key==='GTM'?'ruins':key==='CAN'?'mountain':key==='USA'?'harbour':'forest',sourceUrl:north.source,mediaSearch:north.landmark,referenceFile:undefined,features:[...north.features],biome:key==='CAN'?'alpine':key==='USA'?'coastal':'tropical'};
 const africa=africaPlaces[key as AfricaCode];
 if(base&&africa&&africaLevels[key as AfricaCode])return{...base,levelTitle:africa.title,landmarkName:africa.landmark,landmarkKind:africa.kind,sourceUrl:africa.source,mediaSearch:africa.mediaSearch,referenceFile:undefined,features:base.features,biome:africa.biome};
 const southeast=southeastAsiaPlaces[key as SoutheastAsiaCode];
 const south=southAsiaPlaces[key as SouthAsiaCode];
 const europe=europePlaces[key as EuropeCode];
 const oceania=oceaniaPlaces[key as OceaniaCode];
 if(base&&oceania)return{...base,levelTitle:oceania.title,landmarkName:oceania.landmark,sourceUrl:oceania.source,mediaSearch:oceania.mediaSearch,referenceFile:undefined,features:[...oceania.features],biome:oceania.biome};
 if(base&&europe)return{...base,levelTitle:europe.title,landmarkName:europe.landmark,sourceUrl:europe.source,mediaSearch:europe.mediaSearch,referenceFile:undefined,features:[...europe.features],biome:europe.biome};
 const west=westAsiaPlaces[key as WestAsiaCode];
 if(base&&west)return{...base,levelTitle:west.title,landmarkName:west.landmark,landmarkKind:west.kind,sourceUrl:west.source,mediaSearch:west.mediaSearch,referenceFile:undefined,features:[...west.features],biome:west.biome};
 const central=centralAsiaPlaces[key as CentralAsiaCode];
 if(base&&central)return{...base,levelTitle:central.title,landmarkName:central.landmark,landmarkKind:central.kind,sourceUrl:central.source,mediaSearch:central.landmark,referenceFile:undefined,features:[...central.features],biome:central.biome};
 if(base&&south)return{...base,levelTitle:south.title,landmarkName:south.landmark,landmarkKind:south.kind,sourceUrl:south.source,mediaSearch:south.landmark,referenceFile:undefined,features:[...south.features],biome:south.biome};
 if(base&&southeast)return{...base,levelTitle:southeast.title,landmarkName:southeast.landmark,landmarkKind:southeast.kind,sourceUrl:southeast.source,mediaSearch:southeast.landmark,referenceFile:undefined,features:[...southeast.features],biome:southeast.biome};
 return base&&place?{...base,levelTitle:place.title,landmarkName:place.landmark,landmarkKind:key==='KOR'?'tower':key==='CHN'||key==='PRK'?'mountain':base.landmarkKind,sourceUrl:place.source,mediaSearch:place.landmark,referenceFile:undefined,features:[...place.features],biome:place.biome}:base;
}
