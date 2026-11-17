import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bench,chimneyStack,finishProps,flagMaterial,flowerBox,lampPost,pottedTree,pyramid,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Liechtenstein: Vaduz Castle above the Rhine valley (SRS-632.32). On a
 * wooded cliff stands the castle: the great round bastion under its low
 * cone roof, the square keep, the red-roofed wings with red and white
 * shutters, the smaller south bastion and the flag. Vines climb in rows
 * below it. In the town are the cathedral with its spire, the government
 * building under its patterned roof, the black cube of the art museum and
 * the Red House with its stepped gable and tower. Cows graze the meadow
 * and the snowy Alps close the valley. The route carries vine trellises,
 * barrels, geranium boxes and chimneys. Scenery only: nothing collides. */
const C={meadow:'#86ad5e',meadowDark:'#74994f',vine:'#5f8f3f',grape:'#5a3a7a',rock:'#b0aa9c',rockDark:'#948e80',wall:'#e6dfcc',wallDark:'#d0c8b2',tile:'#9a4a38',tileDark:'#7e3c2e',pattern:'#b08a4a',shutter:'#c8102e',white:'#f8f5ee',trim:'#fbf8ef',glass:'#3a4652',shade:'#3a342c',cube:'#2a2a2e',redHouse:'#a8322c',
 iron:'#22262a',wood:'#7a5c40',woodDark:'#5a4636',leaf:'#4a7d3f',gold:'#e0b030',cowBrown:'#8a5a3a',pink:'#f09ab0'} as const;
const walls=['#f3ead6','#efe2c8','#f6f0e2','#e6dcc6'] as const;
const base=europeEnvironment('LIE',{landmark:false,flat:true,town:false});
export const vaduz={meadowTop:-1,cliff:[66,110],cliffTop:6,cliffZ:-30,castleX:88,cathedralX:26,governmentX:46,museumX:58,redHouseX:126} as const;

function valley(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='rhine-valley-meadow-and-vineyards';root.add(group);const s=new Builder(),top=vaduz.meadowTop,from=-60,to=finish+100,[a,b]=vaduz.cliff;
 box(s,to-from,top+5,60,C.meadow,(from+to)/2,-5,-46.5);for(let k=0;k<(low?12:24);k++)s.add(new T.SphereGeometry(1,8,5),C.meadowDark,[from+k*(to-from)/(low?12:24)+r()*4,-4.2,-16.3],[0,0,0],[5,2.9,1.4]);
 // Vine rows below the castle and beside the Red House.
 for(const [va,vb] of [[a+1,b-1],[vaduz.redHouseX-10,vaduz.redHouseX+16]] as const)for(let z=-18.4;z>-27.4;z-=low?3.2:1.6){box(s,vb-va,.62,.3,C.vine,(va+vb)/2,top+.3,z);for(let x=va;x<=vb;x+=low?6:3)cyl(s,.04,.05,1.1,C.woodDark,x,top,z,4);}
 // Brown and white cows.
 for(const [cx,cz,brown] of [[2,-19.5,1],[8,-21,0],[-14,-20,1],[150,-20,0],[157,-22,1]] as const){box(s,1.3,.62,.5,brown?C.cowBrown:C.white,cx,top+.5,cz);box(s,.4,.4,.36,brown?C.cowBrown:C.white,cx+.8,top+.82,cz);box(s,.5,.3,.52,brown?C.white:C.cowBrown,cx-.2,top+.7,cz);for(const [dx,dz] of [[-.5,-.16],[-.5,.16],[.5,-.16],[.5,.16]] as const)box(s,.11,.5,.11,C.woodDark,cx+dx,top,cz+dz);s.add(new T.SphereGeometry(.07,6,5),C.gold,[cx+.72,top+.7,cz]);}
 s.mesh(group,vertexMaterial(.97),'meadow-vine-rows-and-cows');group.userData={feature:'Meadow and vineyards'};
}

function castle(root:T.Object3D,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='vaduz-castle';root.add(group);const rock=new Builder(),s=new Builder(),p=new Builder(),[a,b]=vaduz.cliff,top=vaduz.meadowTop,up=vaduz.cliffTop,f=vaduz.cliffZ,x=vaduz.castleX,z=f-3.4;
 box(rock,b-a,up-top,26,C.rock,(a+b)/2,top,f-13);const crag=(cx:number,cz:number,k:number)=>rock.add(new T.DodecahedronGeometry(1,0),k%2?C.rock:C.rockDark,[cx,top+1+(k%3)*2,cz],[k,k*2,0],[2+(k%3)*.4,1.8+(k%2)*.6,1.3],.08);
 for(let cx=a,k=0;cx<=b;cx+=low?4.4:2.2,k++)crag(cx,f+.2-(k%2)*.3,k);for(let cz=f-1,k=0;cz>f-24;cz-=low?4.8:2.4,k++)for(const cx of [a,b])crag(cx,cz,k+cx);rock.mesh(group,vertexMaterial(.98),'castle-cliff');
 // Curtain wall, the two round bastions, the keep and the wings between them.
 box(s,27,2.6,1.2,C.wall,x,up,z);cyl(s,3.3,3.5,4.4,C.wall,x-12.4,up,z-.6,low?12:20);cone(p,3.7,1.5,C.tile,x-12.4,up+4.4,z-.6,low?12:20);cyl(s,2.6,2.8,3.6,C.wall,x+12.6,up,z-.6,low?12:18);cone(p,3,1.3,C.tileDark,x+12.6,up+3.6,z-.6,low?12:18);
 box(s,4.4,5.6,4.4,C.wallDark,x+2.4,up,z-3.4);pyramid(p,.3,5,1.6,C.tile,x+2.4,up+5.6,z-3.4);box(s,9,3.8,4,C.wall,x-4.6,up,z-3);roof(p,9.3,1.4,4.3,C.tile,x-4.6,up+3.8,z-3);box(s,6,3.4,4,C.wall,x+7.6,up,z-3);roof(p,6.3,1.3,4.3,C.tileDark,x+7.6,up+3.4,z-3);
 // Windows with red and white shutters.
 const win=(wx:number,wy:number,wz:number)=>{box(p,.5,.8,.06,C.glass,wx,wy,wz);for(const side of [-1,1]){box(p,.24,.84,.07,C.shutter,wx+side*.4,wy-.02,wz);box(p,.24,.2,.08,C.white,wx+side*.4,wy+.3,wz);}};
 for(let k=0;k<4;k++)win(x-7.6+k*2,up+2.4,z-.97);for(let k=0;k<2;k++)win(x+6.4+k*2.4,up+2.2,z-.97);for(const level of [2.6,4.2])win(x+2.4,up+level,z-1.17);for(const dx of [-1.4,1.4])win(x-12.4+dx,up+2.6,z+2.72-Math.abs(dx)*.24);
 archedWindow(s,p,x-1,up,z+.62,1.4,2,{frame:C.wallDark,glass:C.shade});cyl(p,.05,.07,2.6,C.iron,x-6,up+2.6,z,5);
 s.mesh(group,vertexMaterial(.95),'castle-walls-bastions-and-keep');p.mesh(group,vertexMaterial(.75),'castle-roofs-and-shutters');wavingFlag(group,flag,x-5.94,up+4.6,z,1.9,'liechtenstein-flag',.6);group.userData={landmark:'Vaduz Castle'};
 const trees:Placement[]=[];for(let k=0;k<(low?10:24);k++)trees.push({x:a+r()*(b-a),y:top,z:f+1.4+r()*1.2,scale:.5+r()*.3,rotation:r()*6});return trees;
}

function town(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='vaduz-town';root.add(group);const s=new Builder(),p=new Builder(),y=vaduz.meadowTop,z=-22,[a,b]=vaduz.cliff,{cathedralX:cx,governmentX:gx,museumX:mx,redHouseX:rx}=vaduz;let houses=0;
 for(let x=-40;x<finish+60;){const w=3.4+r()*1.8,h=3+r()*1.2,mid=x+w/2;if(mid<a-3&&Math.abs(mid-cx)>5.5&&!(mid>gx-8&&mid<mx+4.5)||mid>b+3&&Math.abs(mid-rx-3)>16){townhouse(s,p,mid,y,z-r()*2,w-.2,h,4.4,{wall:walls[Math.floor(r()*walls.length)],trim:C.trim,glass:C.glass,roof:r()>.5?C.tile:C.tileDark},{rows:2,roof:'gable',door:true,low});houses++;}x+=w+1.2;}
 // The cathedral: a grey stone nave and a west tower with a spire.
 box(s,5,4.6,9,C.wallDark,cx,y,z-5.5);roof(p,5.3,1.8,9.3,C.tileDark,cx,y+4.6,z-5.5,Math.PI/2);box(s,2.2,7.2,2.2,C.wallDark,cx,y,z+.1);archedWindow(s,p,cx,y,z+1.22,1,2,{frame:C.trim,glass:C.shade});archedWindow(s,p,cx,y+4.6,z+1.22,.7,1.4,{frame:C.trim,glass:C.shade});p.add(new T.ConeGeometry(1.5,3.2,4),C.tileDark,[cx,y+8.8,z+.1],[0,Math.PI/4,0]);
 // The government building under its patterned roof, and the black cube of the art museum.
 box(s,12,4.2,5,C.wall,gx,y,z-2.5);roof(p,12.3,1.7,5.3,C.pattern,gx,y+4.2,z-2.5);for(let k=0;k<12;k+=2)box(p,1,.06,5.34,C.tileDark,gx-5.5+k,y+4.5+.05,z-2.5);box(s,3.4,5,1,C.wall,gx,y,z+.3);roof(p,3.7,1.2,1.3,C.pattern,gx,y+5,z+.3,Math.PI/2);
 for(let k=0;k<(low?4:7);k++)for(const level of [.8,2.5])if(Math.abs(k-(low?1.5:3))>.6)box(p,.7,1,.06,C.glass,gx-5.1+k*(low?3.4:1.7),y+level,z+.03);archedWindow(s,p,gx,y,z+.82,1.2,2.2,{frame:C.trim,glass:C.shade});
 box(s,5,3.6,4.4,C.cube,mx+2,y,z-2.6);box(p,5.04,.5,.06,C.glass,mx+2,y+.3,z-.38);
 // The Red House: stepped gable and a white tower.
 box(s,3.6,3.6,4.4,C.redHouse,rx,y,z-2.2);for(let k=0;k<4;k++)box(s,3.6-k*.9,.5,.4,C.redHouse,rx,y+3.6+k*.5,z-.2);roof(p,3.3,1.5,4,C.tileDark,rx,y+3.6,z-2.4,Math.PI/2);for(const dx of [-.9,.9])for(const level of [.7,2.2])box(p,.5,.8,.06,C.white,rx+dx,y+level,z+.03);
 box(s,2.6,6.2,2.6,C.white,rx+3.4,y,z-2.2);pyramid(p,.2,3,1.4,C.tileDark,rx+3.4,y+6.2,z-2.2);for(const level of [2,4.4])box(p,.5,.8,.06,C.glass,rx+3.4,y+level,z-.87);
 s.mesh(group,vertexMaterial(.95),'town-houses-cathedral-and-public-buildings');p.mesh(group,vertexMaterial(.7),'town-roofs-and-windows');group.userData={landmark:'St Florin Cathedral, Government Building and the Red House',houses};
}

/** Blue over red, with a gold crown in the blue near the hoist. */
const liechtensteinFlag=()=>pixelTexture(96,(u,v)=>{const x=(u-.24)*2,y=v-.72,crown=(Math.abs(y+.08)<.03&&Math.abs(x)<.2)||(y>-.08&&y<.1&&Math.abs(x)<.2&&Math.hypot(x/.22,(y+.08)/.2)<1&&Math.sin(x*40)>-.5)||Math.hypot(x,y-.13)<.035;return crown?[255,216,61,255]:v>.5?[0,43,127,255]:[206,17,38,255];},true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
function trellis(b:Builder,from:number,to:number,y:number,z:number,seed:number){for(let x=from;x<=to+.01;x+=1.2)cyl(b,.04,.05,1.1,C.woodDark,x,y,z,5);for(const dy of [.5,.95])box(b,to-from,.02,.02,C.iron,(from+to)/2,y+dy,z);for(let x=from+.3,k=0;x<to-.2;x+=.45,k++){b.add(new T.SphereGeometry(.2,6,5),C.vine,[x,y+.72+((seed+k)%3)*.07,z],[0,0,0],[1.2,.9,.6]);if(k%2)for(const [dx,dy] of [[0,0],[.05,-.08],[-.04,-.09],[0,-.16]] as const)b.add(new T.SphereGeometry(.045,5,4),C.grape,[x+dx,y+.5+dy,z+.1]);}}
function barrel(b:Builder,x:number,y:number,z:number){cyl(b,.24,.2,.3,C.wood,x,y,z,10);cyl(b,.2,.24,.3,C.wood,x,y+.3,z,10);for(const dy of [.06,.3,.54])cyl(b,.25,.25,.03,C.iron,x,y+dy-.015,z,10);}
function parapet(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.6,.34,C.wall,(from+to)/2,y,z);box(b,to-from+.1,.1,.44,C.wallDark,(from+to)/2,y+.6,z);}
const geraniums=[C.shutter,C.pink,C.shutter] as const;

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'castle-round-bastion-and-keep','red-and-white-shutters','vine-rows-below-the-castle','cathedral-spire','government-building-patterned-roof','art-museum-black-cube','red-house-stepped-gable','cows-in-the-meadow','snowy-alps','vine-trellises-barrels-and-geraniums']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(36800),detail=new T.Group();detail.name='vaduz-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  valley(detail,finish,r,low);const slope=castle(detail,flagMaterial(liechtensteinFlag()),r,low);town(detail,finish,r,low);
  const alps=createHeightfield(detail,{name:'raetikon-alps',x:finish/2,y:-12,z:-128,width:finish+260,depth:70,segments:[low?40:90,low?14:28],height:ridgedRange(5611,{peaks:9,height:46,sharpness:1.5}),color:mountainColor({snowLine:28,treeLine:15,rock:'#8b8a86',forest:'#4d7a42',snow:'#eef3f5'})});alps.userData={feature:'Alps'};
  const hills=new T.Group();hills.name='wooded-foothills';detail.add(hills);const m=new Builder(.5);for(const [dx,w,h] of [[-50,60,17],[40,70,21],[130,66,19],[215,60,16]] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#557c46':'#4d7240',[dx,-5,-86],[0,0,0],[w,h,14],.1);m.mesh(hills,vertexMaterial(.98),'forested-slopes');
  const conifers:Placement[]=[...slope];for(let k=0;k<(low?14:34);k++){const x=-40+r()*(finish+100),z=-38-r()*14;if(x>vaduz.cliff[0]-2&&x<vaduz.cliff[1]+2)continue;conifers.push({x,y:vaduz.meadowTop,z,scale:.8+r()*.5,rotation:r()*6});}plantGrove(detail,'conifer',conifers,{low,name:'valley-conifers'});
  const choughs=createFlock(detail,{name:'alpine-choughs',count:low?5:10,centre:[vaduz.castleX,13,-22],radius:[30,2.5,5],speed:.24,size:.6,color:'#1f2226',wing:'#2c3036',seed:173,glide:true});
  let reduced=context.reducedMotion;choughs.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;choughs.update(time);},setReducedMotion(value){reduced=value;choughs.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*137+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){trellis(b,from,to,y,rear,seed);if(w>4.4)barrel(b,to-.7,y,rear+.5);}
  else if(t==='cliff'){const low=Math.min(surface(from),surface(to));parapet(b,from,to,low,rear);flowerBox(b,from+.3,to-.3,low+.7,rear,C.wood,geraniums);if(w>4.4)lampPost(b,glow,to-.4,surface(to-.4),rear+.36);}
  else if(t==='rooftop'){chimneyStack(b,from+.6,y,rear+.1,2,{brick:C.wall,cap:C.wallDark,pot:C.tile});if(w>4.4)chimneyStack(b,to-.8,y,rear+.1,1,{brick:C.wall,cap:C.wallDark,pot:C.tile});}
  else if(t==='terrace'){balustrade(b,from,to,y,rear,{rail:C.trim,base:C.wallDark,baluster:C.white});pottedTree(b,from+.7,y,rear+.6,.75,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.shutter},seed);barrel(b,to-.8,y,rear+.6);if(w>6)bench(b,0,y,rear+.5);}
  else if(t==='rock'){barrel(b,(seed%2?.3:-.3),surface(0),rear+.4);}
  finishProps(root,b,glow,'vaduz-trellises-barrels-and-geraniums');
 },
};
