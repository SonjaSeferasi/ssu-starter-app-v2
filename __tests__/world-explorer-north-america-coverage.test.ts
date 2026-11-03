import {it,expect} from 'vitest';
import {countriesForContinent} from '../lib/world-explorer/catalog';
import {isAuthoredLevel,levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {remainingNorthAmericaPlaces} from '../lib/world-explorer/north-america-remaining';
import {northAmericaPlaces} from '../lib/world-explorer/north-america';
import {environmentIds} from '../components/world-explorer/countries/registry';
import {mkdirSync,writeFileSync} from 'node:fs';
it('opens an authored level and registered environment for all 23 North American countries',()=>{
 const countries=countriesForContinent('north-america');
 expect(countries).toHaveLength(23);
 expect(Object.keys({...northAmericaPlaces,...remainingNorthAmericaPlaces}).sort()).toEqual(countries.map(c=>c.code).sort());
 for(const country of countries){expect(isAuthoredLevel(country.code),country.code).toBe(true);expect(environmentIds).toContain(levelDefinitionFor(country.code).environmentId);}
 mkdirSync('tmp/north-america-complete',{recursive:true});writeFileSync('tmp/north-america-complete/places.json',JSON.stringify(remainingNorthAmericaPlaces,null,2));
});
