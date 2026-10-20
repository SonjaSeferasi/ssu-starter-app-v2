// Coordinates are centimeters; y points down to preserve the existing run API.
export const GRAVITY=1200;
export const RUN_SPEED=235;
export const JUMP_SPEED=510;
export type Platform={x:number;y:number;width:number;depth?:number;kind?:'rock'|'deck'|'bamboo'|'brick'|'mushroom'|'bridge';motion?:'horizontal'|'vertical'|'swing'};
export type Region={name:string;from:number;to:number;style:'meadow'|'cavern'|'castle'|'valley'|'namek'|'arena'|'konoha'|'forest'|'sand'|'cloud'};
export type PowerPickup={x:number;y:number;kind:import('./powers').PowerKind};
export type Course={number:number;name:string;subtitle:string;width:number;platforms:Platform[];ledges:Platform[];powers:PowerPickup[];hazards:{x:number;y:number}[];coins:{x:number;y:number}[];finish:number;regions:Region[];enemies:{x:number;y:number;left:number;right:number}[]};
function route(rows:[number,number,number,Platform['kind']?,Platform['motion']?][]):Platform[]{return rows.map(([x,y,width,kind='rock',motion])=>({x,y,width,kind,motion}));}
// Three authored routes. Their geometry and traversal differ, not just materials.
const meadow=route([[0,450,520],[575,410,300],[905,335,220],[1180,410,480],[1720,350,310],[2070,280,240],[2360,350,450],[2870,310,330],[3245,240,280],[3560,320,500],[4120,260,340],[4510,195,300],[4870,260,540]]);
const islands=route([[0,450,350],[405,405,240],[700,350,220],[975,400,190,'rock','horizontal'],[1230,335,250],[1535,265,200],[1790,335,220,'rock','vertical'],[2065,280,250],[2370,215,190],[2610,280,240],[2910,220,210,'rock','horizontal'],[3180,155,240],[3475,225,320],[3850,165,260],[4160,100,460]]);
const treetops=route([[0,450,330],[370,395,300,'deck'],[700,395,270,'bridge'],[1010,325,250,'bamboo','swing'],[1320,260,300,'deck'],[1660,325,400,'bridge'],[2110,255,260,'deck'],[2415,190,220,'bamboo'],[2680,255,340,'deck'],[3060,255,310,'bridge'],[3420,185,250,'bamboo','vertical'],[3720,120,290,'deck'],[4060,185,360],[4470,120,480,'deck']]);
function summit(x:number,y:number,kind:Platform['kind']='rock'):Platform[]{return[{x,y,width:155,kind},{x:x+180,y:y-82,width:155,kind},{x:x+360,y:y-164,width:165,kind}];}
const options=[
 {name:'Mushroom Cliffs',subtitle:'Bounce on giant mushrooms, climb brick terraces and travel through pipes.',platforms:meadow,ledges:[...summit(150,360,'brick'),...summit(1840,260,'mushroom'),...summit(4260,170,'brick')],styles:[['Sunlit Meadows','meadow'],['Mushroom Highlands','cavern'],['Castle Terraces','castle']]},
 {name:'Islands of the Dragon',subtitle:'Ride drifting islands above a deep valley. Discover Nimbus and the golden transformation.',platforms:islands,ledges:route([[730,270,150],[920,190,160],[1120,110,155],[1580,185,155],[1770,105,155],[1980,185,175],[3520,145,165],[3710,65,155],[3910,-15,155]]),styles:[['Mountain Crossings','valley'],['Namek Sky Islands','namek'],['Celestial Gate','arena']]},
 {name:'Shinobi Treetop Trail',subtitle:'Cross rope bridges, ride swinging bamboo and climb through a living forest.',platforms:treetops,ledges:[...summit(430,305,'deck'),...summit(1390,170,'bamboo'),...summit(3820,30,'deck')],styles:[['Konoha Forest','konoha'],['Canopy Bridges','forest'],['Hidden Village','cloud']]},
] as const;
export const courses:Course[]=options.map((d,index)=>{
 const number=index+1,platforms=[...d.platforms],ledges=[...d.ledges],last=platforms[platforms.length-1],width=last.x+last.width;
 const coins=Array.from({length:6+index},(_,i)=>{const p=platforms[1+i*(index===0?2:1)];return{x:p.x+p.width*.48,y:p.y-65};});
 const kinds:import('./powers').PowerKind[]=number===1?['shield','doubleJump','flower','rapid','doubleJump','star','shield','doubleJump','flower']:number===2?['shield','doubleJump','rapid','doubleJump','nimbus','shield','doubleJump','shield','saiyan']:['shield','doubleJump','rasengan','doubleJump','clone','rapid','doubleJump','chidori','clone'];
 const powers=ledges.map((p,i)=>({x:p.x+p.width/2,y:p.y-44,kind:kinds[i]}));
 const enemies=platforms.flatMap((p,i)=>{
  if(i<2)return [];const positions=i>5&&p.width>=400?[.48,.82]:[.68];
  const right=p.x+p.width-(i===platforms.length-1?240:35);
  return positions.map((t,n)=>({x:Math.min(right-n*75,p.x+p.width*t),y:p.y,left:p.x+35,right}));
 });
 const regions=d.styles.map(([name,style],i)=>({name,style,from:width*i/d.styles.length,to:width*(i+1)/d.styles.length}));
 return{number,name:d.name,subtitle:d.subtitle,width,platforms,ledges,powers,coins,enemies,hazards:[],finish:width-100,regions};
});
export function regionAt(course:Course,x:number){return course.regions.find(r=>x>=r.from&&x<r.to)||course.regions[course.regions.length-1];}
export function levelAvailable(level:number,completed:number[]){return level===1||completed.includes(level-1);}
export function horizontalVelocity(left:boolean,right:boolean){return left===right?0:left?-RUN_SPEED:RUN_SPEED;}
