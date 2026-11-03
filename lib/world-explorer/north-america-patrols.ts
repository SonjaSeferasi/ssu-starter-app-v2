import type {EnemyDefinition} from './game-types';
import type {NorthAmericaCode} from './north-america';
/** Stable, roomy banks with space to land and activate checkpoints before a
 * patrol. These are fictional game encounters inspired by local wildlife. */
export const northAmericaPatrols:Record<NorthAmericaCode,EnemyDefinition[]>={
 CAN:[{id:'ca-marmot',platformId:'ca-ridge',minOffset:3.5,maxOffset:6.2,speed:.7,turnPause:.9,height:.7}],
 USA:[{id:'us-dock-robot',platformId:'us-warehouse',minOffset:5,maxOffset:10,speed:1,turnPause:.65,height:.7}],
 MEX:[{id:'mx-iguana',platformId:'mx-upper-court',minOffset:4.1,maxOffset:7.1,speed:.65,turnPause:1,height:.6}],
 GTM:[{id:'gt-coati',platformId:'gt-temple-bank',minOffset:5.4,maxOffset:8.5,speed:.8,turnPause:.7,height:.7}],
 CRI:[{id:'cr-leafcutter',platformId:'cr-tree-bank',minOffset:5.3,maxOffset:8,speed:.6,turnPause:1.1,height:.56}],
 JAM:[{id:'jm-land-crab',platformId:'jm-dry-bank',minOffset:4.8,maxOffset:7.6,speed:.65,turnPause:.8,height:.7}],
};
