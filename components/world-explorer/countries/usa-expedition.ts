import {environment as original} from './usa';
import {northAmericaTerrain} from './north-america-terrain';
export const environment=northAmericaTerrain(original,false);
