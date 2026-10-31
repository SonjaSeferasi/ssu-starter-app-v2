import type {CountryEnvironment} from './types';

/** Each country environment is a separate chunk, loaded only when its level is
 * selected; opening World Explorer never downloads every country's scenery. */
const loaders:Record<string,()=>Promise<{environment:CountryEnvironment}>>={
 'japan-mountain-spring':()=>import('./japan'),
 'italy-rome-colosseum':()=>import('./italy'),
 'egypt-giza-desert':()=>import('./egypt'),
 'brazil-amazon-canopy':()=>import('./brazil'),
 'canada-rockies-alpine':()=>import('./canada'),
 'australia-reef-coast':()=>import('./australia'),
 'india-taj-gardens':()=>import('./india'),
 'south-africa-savanna':()=>import('./south-africa'),
 'norway-lofoten-fjords':()=>import('./norway'),
 'france-paris-rooftops':()=>import('./france'),
 'usa-new-york-harbor':()=>import('./usa'),
 'china-wulingyuan':()=>import('./china'),
 'mongolia-orkhon':()=>import('./mongolia'),
 'north-korea-paektu':()=>import('./north-korea'),
 'south-korea-seoul':()=>import('./south-korea'),
};
export const environmentIds=Object.keys(loaders);
export async function loadCountryEnvironment(id:string):Promise<CountryEnvironment|null>{const load=loaders[id];return load?(await load()).environment:null;}
