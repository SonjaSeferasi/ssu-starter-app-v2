import type {LevelDefinition} from '../../game-types';
import type {AfricaCode} from '../../africa';
import {level as mar} from './mar';
import {level as dza} from './dza';
import {level as tun} from './tun';
import {level as lby} from './lby';
import {level as sdn} from './sdn';
import {level as mli} from './mli';
import {level as ner} from './ner';
import {level as mrt} from './mrt';
import {level as sen} from './sen';
import {level as gmb} from './gmb';
import {level as gnb} from './gnb';
import {level as gin} from './gin';
import {level as sle} from './sle';
import {level as lbr} from './lbr';
import {level as civ} from './civ';
import {level as gha} from './gha';
import {level as tgo} from './tgo';
import {level as ben} from './ben';
import {level as bfa} from './bfa';
import {level as nga} from './nga';
import {level as cpv} from './cpv';
import {level as cmr} from './cmr';
import {level as caf} from './caf';
import {level as tcd} from './tcd';
import {level as cod} from './cod';
import {level as cog} from './cog';
import {level as gab} from './gab';
import {level as gnq} from './gnq';
import {level as stp} from './stp';
import {level as ago} from './ago';
import {level as ken} from './ken';
import {level as tza} from './tza';
import {level as eth} from './eth';
import {level as eri} from './eri';
import {level as dji} from './dji';
import {level as som} from './som';
import {level as ssd} from './ssd';
import {level as uga} from './uga';
import {level as rwa} from './rwa';
import {level as bdi} from './bdi';
import {level as mwi} from './mwi';
import {level as moz} from './moz';
import {level as mdg} from './mdg';
import {level as mus} from './mus';
import {level as syc} from './syc';
import {level as com} from './com';
import {level as zmb} from './zmb';
import {level as zwe} from './zwe';
import {level as nam} from './nam';
import {level as bwa} from './bwa';
import {level as lso} from './lso';
import {level as swz} from './swz';

/** Africa. Each country's level is its own authored module; Egypt keeps its
 * JSON proof level and South Africa its first-template level. A country is
 * listed here only once its route is built and validated. */
export const africaLevels:Partial<Record<AfricaCode,LevelDefinition>>={
 // Batch A: North Africa.
 MAR:mar,DZA:dza,TUN:tun,LBY:lby,SDN:sdn,
 // Batch B: West Africa.
 MLI:mli,NER:ner,MRT:mrt,SEN:sen,GMB:gmb,GNB:gnb,GIN:gin,SLE:sle,LBR:lbr,CIV:civ,GHA:gha,TGO:tgo,BEN:ben,BFA:bfa,NGA:nga,CPV:cpv,
 // Batch C: Middle Africa.
 CMR:cmr,CAF:caf,TCD:tcd,COD:cod,COG:cog,GAB:gab,GNQ:gnq,STP:stp,AGO:ago,
 // Batch D: East Africa.
 KEN:ken,TZA:tza,ETH:eth,ERI:eri,DJI:dji,SOM:som,SSD:ssd,UGA:uga,RWA:rwa,BDI:bdi,MWI:mwi,MOZ:moz,MDG:mdg,MUS:mus,SYC:syc,COM:com,ZMB:zmb,ZWE:zwe,
 // Batch E: Southern Africa (South Africa keeps its template level).
 NAM:nam,BWA:bwa,LSO:lso,SWZ:swz,
};
