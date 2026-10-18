// Jumpyland journeys. Internal `coins` stores a collectible count, never currency.
export const GRAVITY=1200;
export const RUN_SPEED=235;
export const JUMP_SPEED=510;
export type Platform={x:number;y:number;width:number};
export type Region={name:string;from:number;to:number;style:'meadow'|'cavern'|'castle'|'valley'|'namek'|'arena'|'konoha'|'forest'|'sand'|'cloud'};
export type Course={number:number;name:string;subtitle:string;width:number;platforms:Platform[];hazards:{x:number;y:number}[];coins:{x:number;y:number}[];finish:number;regions:Region[];enemies:{x:number;y:number;left:number;right:number}[]};
const definitions=[
 {name:'Mushroom Kingdom Journey',subtitle:'Meadows, pipe caverns, and a lava-lit fortress.',width:5800,regions:[['Mushroom Meadows','meadow'],['Pipe Caverns','cavern'],['Fortress Approach','castle']]},
 {name:'Dragon World Adventure',subtitle:'From mountain valleys to Namek and a stormy battle arena.',width:6300,regions:[['Mountain Valley','valley'],['Planet Namek','namek'],['Storm Arena','arena']]},
 {name:'Shinobi Village Journey',subtitle:'Konoha rooftops, forest treetops, Hidden Sand, and Hidden Cloud.',width:7000,regions:[['Konoha Village','konoha'],['Forest Treetops','forest'],['Hidden Sand Village','sand'],['Hidden Cloud Village','cloud']]},
] as const;
export const courses:Course[]=definitions.map((d,index)=>{
 const number=index+1;
 const platforms:Platform[]=[];
 let x=0,i=0;
 // Broad landings with varied elevations. All mandatory gaps are within one
 // ordinary jump; powers are helpful against enemies, never required to finish.
 while(x<d.width){
   const width=i===0?420:320+(i%3)*35;
   const y=[450,415,375,420,365,405,350,390][i%8];
   platforms.push({x,y,width:Math.min(width,d.width-x)});
   x+=width+68+(i%2)*8;i++;
 }
 const last=platforms[platforms.length-1];last.width=Math.max(260,d.width-last.x);
 const actualWidth=last.x+last.width;
 const coins=Array.from({length:6+index},(_,c)=>{
   const p=platforms[Math.min(platforms.length-1,Math.round((c+1)*(platforms.length-1)/(7+index)))];
   return{x:p.x+p.width*.38,y:p.y-78};
 });
 const regions=d.regions.map(([name,style],r)=>({name,style,from:Math.round(actualWidth*r/d.regions.length),to:Math.round(actualWidth*(r+1)/d.regions.length)}));
 const enemies=platforms.filter((_,p)=>p>1&&p%2===0).map(p=>({x:p.x+p.width*.55,y:p.y-19,left:p.x+65,right:p.x+p.width-65}));
 return{number,name:d.name,subtitle:d.subtitle,width:actualWidth,platforms,hazards:[],coins,finish:actualWidth-110,regions,enemies};
});
export function regionAt(course:Course,x:number){return course.regions.find(r=>x>=r.from&&x<r.to)||course.regions[course.regions.length-1];}
export function levelAvailable(level:number,completed:number[]){return level===1||completed.includes(level-1);}
export function horizontalVelocity(left:boolean,right:boolean){return left===right?0:left?-RUN_SPEED:RUN_SPEED;}
