import {remainingNorthAmericaLevels} from './levels/north-america/remaining';
import {northAmericaLevels} from './levels/north-america';
import japan from '../../public/world-explorer/levels/jp-level-01.json';
import italy from '../../public/world-explorer/levels/it-level-01.json';
import egypt from '../../public/world-explorer/levels/eg-level-01.json';
import brazil from '../../public/world-explorer/levels/br-level-01.json';
import australia from '../../public/world-explorer/levels/au-level-01.json';
import india from '../../public/world-explorer/levels/in-level-01.json';
import southAfrica from '../../public/world-explorer/levels/za-level-01.json';
import norway from '../../public/world-explorer/levels/no-level-01.json';
import france from '../../public/world-explorer/levels/fr-level-01.json';
import china from '../../public/world-explorer/levels/cn-level-01.json';
import mongolia from '../../public/world-explorer/levels/mn-level-01.json';
import northKorea from '../../public/world-explorer/levels/kp-level-01.json';
import southKorea from '../../public/world-explorer/levels/kr-level-01.json';
import {southAmericaLevels} from './levels/south-america';
import {southeastAsiaLevels} from './levels/southeast-asia';
import {southAsiaLevels} from './levels/south-asia';
import {westAsiaLevels} from './levels/west-asia';
import {europeLevels} from './levels/europe';
import {oceaniaLevels} from './levels/oceania';
import {centralAsiaLevels} from './levels/central-asia';
import {africaLevels} from './levels/africa';

/** Authored country levels, keyed by ISO alpha-3. Each file is a complete,
 * validated level configuration; its scenery lives in the matching lazily
 * loaded environment module under components/world-explorer/countries. */
export const authoredLevels:Record<string,{id:string;countryId:string;title:string}&Record<string,unknown>>={
 JPN:japan,
 ITA:italy,
 EGY:egypt,
 BRA:brazil,

 AUS:australia,
 IND:india,
 ZAF:southAfrica,
 NOR:norway,
 FRA:france,

 CHN:china,MNG:mongolia,PRK:northKorea,KOR:southKorea,
 ...northAmericaLevels,
 ...remainingNorthAmericaLevels,
 ...southAmericaLevels,
 ...southeastAsiaLevels,
 ...southAsiaLevels,
 ...centralAsiaLevels,
 ...westAsiaLevels,
 ...africaLevels as Record<string,{id:string;countryId:string;title:string}&Record<string,unknown>>,
 ...europeLevels,
 ...oceaniaLevels,
};
