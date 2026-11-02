import type {LevelDefinition} from '../../game-types';
import {level as uruguay} from './uruguay';
import {level as bolivia} from './bolivia';
import {level as peru} from './peru';
import {level as argentina} from './argentina';
import {level as chile} from './chile';
import {level as colombia} from './colombia';
import {level as ecuador} from './ecuador';
import {level as guyana} from './guyana';
import {level as paraguay} from './paraguay';
import {level as suriname} from './suriname';
import {level as venezuela} from './venezuela';

/** South America, the first continental release. Each country's level is its
 * own authored JavaScript configuration (Brazil keeps its JSON proof level).
 * A country is listed here only once its route is built and validated. */
export const southAmericaLevels:Record<string,LevelDefinition>={
 // Batch A: prove variety.
 URY:uruguay,BOL:bolivia,PER:peru,
 // Batch B: expand terrain systems.
 ARG:argentina,CHL:chile,COL:colombia,ECU:ecuador,
 // Batch C: finish the continent.
 GUY:guyana,PRY:paraguay,SUR:suriname,VEN:venezuela,
};
