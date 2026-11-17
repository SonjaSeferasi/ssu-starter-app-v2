import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,battlementTower,bench,finishProps,flagMaterial,lampPost,pottedTree,texturedStone,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** North Macedonia: Ohrid on its lake (SRS-632.27). On a cliff above the
 * water stands the small church of St John at Kaneo, striped in stone and
 * brick, with its eight-sided dome and tiled roofs. Behind it the old town
 * climbs the hill in white houses whose upper floors lean out over the
 * lanes on dark timber brackets; the many-domed church of St Clement stands
 * among them; and Samuel's Fortress crowns the hill with its towers and the
 * flag. Reeds, wooden piers and canopied boats edge the shore, and snowy
 * mountains stand across the lake. The route carries lanterns, nets, reeds
 * and fig trees. Scenery only: nothing collides. */
const C={white:'#f8f5ec',trim:'#fbf8ef',timber:'#4a3626',red:'#b5563a',redDark:'#96452f',brick:'#b9603f',stone:'#e9dfc8',stoneDark:'#d6cab0',band:'#c9704a',glass:'#2a3540',shade:'#5a4a36',gold:'#d6a938',rock:'#d9d2c0',
 lawn:'#86b062',reed:'#8fa24e',reedTop:'#7a5c3a',iron:'#22262a',wood:'#7a5c40',rope:'#c9b88a',leaf:'#4a7d3f',fig:'#5a3a6a',hull:'#f6f3ea',canopy:'#c8402f',net:'#9fb0a8'} as const;
const base=europeEnvironment('MKD',{landmark:false,flat:true,town:false});
export const ohrid={shoreTop:-1,kaneoX:104,kaneoTop:3.6,terraces:[[-22,-1],[-29,1.5],[-36,4]],clementX:56,fortressX:36,fortressTop:8} as const;
const rockface=()=>texturedStone('paris-stone','#f6f0e2',.6,.97);

/** A white town house: the upper floor juts out on timber brackets under a broad red roof. */
function ohridHouse(s:Builder,p:Builder,x:number,y:number,z:number,w:number,low:boolean,seed:number){
 const lower=2+(seed%3)*.35,upper=2+(seed%2)*.45;box(s,w-.5,lower,4,C.white,x,y,z-2);box(s,w,upper,4.5,C.white,x,y+lower,z-1.9);box(p,w+.04,.14,4.54,C.timber,x,y+lower,z-1.9);for(let k=0;k<(low?2:4);k++)p.strut(new T.Vector3(x-w/2+.4+k*(w-.8)/(low?1:3),y+lower-.7,z+.02),new T.Vector3(x-w/2+.4+k*(w-.8)/(low?1:3),y+lower,z+.34),.05,C.timber,4,1);
 for(let k=0;k<(low?2:3);k++){const wx=x-w/2+w*(k+.5)/(low?2:3);box(p,w*.16,1.1,.06,C.glass,wx,y+lower+.5,z+.36);for(const side of [-1,1])box(p,.07,1.2,.08,C.timber,wx+side*w*.1,y+lower+.45,z+.37);}box(p,.8,1.6,.08,C.timber,x+(seed%2?.6:-.6),y,z+.02);
 roof(p,w+.5,1.1+(seed%2)*.3,5.6,seed%3?C.red:C.redDark,x,y+lower+upper,z-1.9,seed%4===1?Math.PI/2:0);
}

function town(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='ohrid-old-town';root.add(group);const s=new Builder(),p=new Builder(),g=new Builder(),top=ohrid.shoreTop,from=-56,to=finish+100,trees:Placement[]=[];let houses=0;
 box(g,to-from,top+4.4,70,C.lawn,(from+to)/2,-4.4,-51.5);for(const [z,y] of ohrid.terraces.slice(1)){box(g,to-from,y-top,60,C.lawn,(from+to)/2,top,z-27);box(g,to-from,y-top,.5,C.stoneDark,(from+to)/2,top,z+3.2);}
 ohrid.terraces.forEach(([z,y],row)=>{for(let x=-40+row*2;x<ohrid.kaneoX-14;){const w=3.6+r()*1.6,mid=x+w/2;if(!(row===1&&Math.abs(mid-ohrid.clementX)<7)&&!(row===2&&Math.abs(mid-ohrid.fortressX)<14)){ohridHouse(s,p,mid,y,z-r()*1.2,w-.3,low,houses);houses++;if(houses%3===0)trees.push({x:x+w+.7,y,z:z-1.6,scale:.55+r()*.25,rotation:r()*6});}x+=w+(houses%3===0?1.5:.35);}});
 s.mesh(group,vertexMaterial(.95),'white-jettied-houses');p.mesh(group,vertexMaterial(.7),'timber-brackets-shutters-and-red-roofs');g.mesh(group,vertexMaterial(.97),'hillside-terraces');group.userData={feature:'Old town houses with jettied upper floors',houses};return trees;
}

/** A Byzantine church: striped walls, a tiled cross of roofs, and domes on eight-sided drums. */
function byzantine(s:Builder,p:Builder,x:number,y:number,z:number,size:number,domes:[number,number,number][],low:boolean){
 box(s,size,size*.7,size*1.2,C.stone,x,y,z-size*.6);for(let k=1;k<4;k++)box(s,size+.04,.12,size*1.2+.04,C.band,x,y+k*size*.17,z-size*.6);roof(p,size+.3,size*.22,size*1.2+.3,C.red,x,y+size*.7,z-size*.6,Math.PI/2);roof(p,size+.3,size*.22,size*.5,C.red,x,y+size*.7,z-size*.6);
 cyl(s,size*.24,size*.24,size*.5,C.stone,x,y,z+.1,low?6:10);p.add(new T.SphereGeometry(size*.25,low?6:10,5,0,Math.PI*2,0,Math.PI/2),C.red,[x,y+size*.5,z+.1],[0,0,0],[1,.6,1]);archedWindow(s,p,x,y+.3,z+size*.34+.1,size*.12,size*.24,{frame:C.band,glass:C.shade});
 for(const [dx,dz,radius] of domes){const dy=y+size*.7+size*.1;cyl(s,radius,radius,radius*1.3,C.stone,x+dx,dy,z-size*.6+dz,8);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;p.add(new T.BoxGeometry(radius*.3,radius*.8,.06),C.shade,[x+dx+Math.sin(a)*radius,dy+radius*.7,z-size*.6+dz+Math.cos(a)*radius],[0,a,0]);}cyl(s,radius*1.1,radius*1.1,.1,C.band,x+dx,dy+radius*1.3,z-size*.6+dz,8);p.add(new T.SphereGeometry(radius*1.12,8,6,0,Math.PI*2,0,Math.PI/2),C.red,[x+dx,dy+radius*1.3,z-size*.6+dz],[0,0,0],[1,.66,1]);box(p,.05,.5,.05,C.gold,x+dx,dy+radius*2.04,z-size*.6+dz);box(p,.26,.05,.05,C.gold,x+dx,dy+radius*2.04+.32,z-size*.6+dz);}
}

function churches(root:T.Object3D,low:boolean){
 const kaneo=new T.Group();kaneo.name='st-john-at-kaneo';root.add(kaneo);const rock=new Builder(),s=new Builder(),p=new Builder(),x=ohrid.kaneoX,top=ohrid.kaneoTop;
 // The cliff: a rocky headland standing out into the lake.
 box(rock,22,top+4.4,16,C.rock,x,-4.4,-27.4);const crags=low?11:22;for(let k=0;k<crags;k++)rock.add(new T.DodecahedronGeometry(1,0),k%2?C.rock:'#b9b2a0',[x-11+k*22/(crags-1),-2.4+(k%4)*1.1,-18.9-(k%3)*.5],[k,k*2,0],[2+(k%3)*.5,2.2+(k%2)*.6,1.5],.08);rock.mesh(kaneo,vertexMaterial(.98),'kaneo-cliff');
 byzantine(s,p,x,top,-22,4.4,[[0,0,1.15]],low);for(let k=0;k<(low?3:6);k++)box(s,.1,.8,.1,C.stoneDark,x-8+k*1.2,top,-18.6);box(s,7,.08,.08,C.stoneDark,x-5,top+.8,-18.6);
 s.mesh(kaneo,vertexMaterial(.94),'kaneo-striped-walls');p.mesh(kaneo,vertexMaterial(.7),'kaneo-tiled-roofs-and-dome');kaneo.userData={landmark:'Church of St John at Kaneo'};
 const clement=new T.Group();clement.name='st-clement-church';root.add(clement);const cs=new Builder(),cp=new Builder(),[cz,cy]=ohrid.terraces[1];
 byzantine(cs,cp,ohrid.clementX,cy,cz,5,[[0,0,1.2],[-1.8,-1.6,.6],[1.8,-1.6,.6],[-1.8,1.6,.6],[1.8,1.6,.6]],low);cs.mesh(clement,vertexMaterial(.94),'st-clement-striped-walls');cp.mesh(clement,vertexMaterial(.7),'st-clement-roofs-and-five-domes');clement.userData={landmark:'Church of St Clement at Plaoshnik',domes:5};
}

function fortress(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='samuels-fortress';root.add(group);const h=new Builder(),s=new Builder(.5),p=new Builder(),x=ohrid.fortressX,z=-50,top=ohrid.fortressTop;
 h.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.lawn,[x,-4.4,z],[0,0,0],[30,top+4.4,12],.08);h.mesh(group,vertexMaterial(.97),'fortress-hill');
 box(s,26,2.6,1.2,C.stone,x,top-.6,z+3);for(let k=0;k<(low?13:26);k++)box(s,.6,.5,.5,C.stone,x-12.6+k*(low?2:1),top+2,z+3.4);for(const dx of [-13,-4.4,4.4,13])battlementTower(s,x+dx,top-.6,z+3,2.6,4.4,{wall:C.stone,trim:C.stoneDark});box(s,3.4,3.4,2,C.stone,x,top-.6,z+3.4);archedWindow(s,p,x,top-.6,z+4.42,1.4,2.4,{frame:C.stoneDark,glass:C.shade});
 cyl(p,.05,.07,3,C.iron,x+4.4,top+4.4,z+3,5);s.mesh(group,rockface(),'fortress-walls-and-towers');p.mesh(group,vertexMaterial(.7),'fortress-gate-and-mast');wavingFlag(group,flag,x+4.46,top+6.6,z+3,2.2,'north-macedonia-flag',.5);group.userData={landmark:"Samuel's Fortress",towers:4};
}

/** Red, with a golden sun and eight broadening rays. */
const macedonianFlag=()=>pixelTexture(96,(u,v)=>{const dx=(u-.5)*2,dy=v-.5,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx),ray=Math.abs(((a/(Math.PI/4))%1+1)%1-.5);return d<.13||(d>.17&&ray>.5-.04-d*.16)?[248,208,40,255]:[206,32,40,255];},true,false);

function shoreLife(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='lake-shore-reeds-and-piers';root.add(group);const b=new Builder(),top=ohrid.shoreTop;
 for(let k=0;k<(low?60:170);k++){const x=-50+r()*(finish+140),z=-16.2+r()*1.6;if(Math.abs(x-ohrid.kaneoX)<12)continue;const h=1.2+r()*.9;box(b,.05,h,.05,C.reed,x,-2.4,z);box(b,.09,.3,.09,C.reedTop,x,-2.4+h,z);}
 for(const px of [8,48,finish+8]){box(b,1.4,.12,6,C.wood,px,top-.3,-14);for(const dz of [-11.4,-13,-15,-16.6])for(const side of [-1,1])cyl(b,.08,.08,1.8,C.wood,px+side*.6,-2.6,dz,5);b.add(new T.SphereGeometry(1,8,5),C.hull,[px+1.8,-2.34,-12.4],[0,0,0],[1.5,.32,.5]);for(const [dx,dz] of [[-.6,-.3],[.6,-.3],[-.6,.3],[.6,.3]] as const)cyl(b,.03,.03,.9,C.wood,px+1.8+dx,-2.2,-12.4+dz,4);box(b,1.6,.06,.8,C.canopy,px+1.8,-1.3,-12.4);}
 b.mesh(group,vertexMaterial(.85),'reeds-piers-and-canopied-boats');group.userData={feature:'Reeds, piers and lake boats'};
 const swans=new T.Group();swans.name='lake-swans';root.add(swans);const sb=new Builder();for(let k=0;k<(low?2:4);k++){const x=k*2,z=(k%2)*1.4;sb.add(new T.SphereGeometry(1,10,7),'#fbfaf5',[x,-2.3,z],[0,0,0],[.52,.26,.3]);const a=new T.Vector3(x+.34,-2.2,z),m=new T.Vector3(x+.5,-1.85,z),t=new T.Vector3(x+.42,-1.55,z),h=new T.Vector3(x+.6,-1.56,z);sb.strut(a,m,.07,'#fbfaf5',6,.9);sb.strut(m,t,.06,'#fbfaf5',6,.9);sb.strut(t,h,.06,'#fbfaf5',6,.8);sb.strut(h,new T.Vector3(x+.76,-1.62,z),.035,'#e8892a',5,.5);}sb.mesh(swans,vertexMaterial(.7),'swans');swans.userData={animated:true};return swans;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function nets(b:Builder,x:number,y:number,z:number){for(const dx of [-.6,.6])cyl(b,.05,.06,1.5,C.wood,x+dx,y,z,5);box(b,1.3,.04,.04,C.wood,x,y+1.45,z);box(b,1.2,.9,.03,C.net,x,y+.5,z);for(let k=0;k<4;k++)b.add(new T.SphereGeometry(.07,6,4),'#e8892a',[x-.45+k*.3,y+1.4,z+.04]);}
function reeds(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<6;k++){const dx=((seed*7+k*13)%10)/10*.8-.4,h=.8+((seed+k)%4)*.2;box(b,.04,h,.04,C.reed,x+dx,y,z);box(b,.08,.24,.08,C.reedTop,x+dx,y+h,z);}}
function ropeRail(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.5){cyl(b,.07,.08,.8,C.wood,x,y,z,6);if(x+1.5<=to+.01)b.strut(new T.Vector3(x,y+.7,z),new T.Vector3(x+1.5,y+.7,z),.025,C.rope,4,1);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'st-john-at-kaneo-on-its-cliff','white-houses-with-jettied-upper-floors','st-clement-five-domes','samuels-fortress-towers-and-flag','reeds-wooden-piers-and-canopied-boats','lanterns-nets-and-fig-trees']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(38900),detail=new T.Group();detail.name='ohrid-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  fortress(detail,flagMaterial(macedonianFlag()),low);plantGrove(detail,'cypress',town(detail,finish,r,low),{low,name:'old-town-cypresses'});churches(detail,low);
  const cypresses:Placement[]=[];for(let k=0;k<(low?10:22);k++)cypresses.push({x:ohrid.kaneoX-8+r()*(finish+90-ohrid.kaneoX),y:r()>.5?ohrid.shoreTop:ohrid.kaneoTop,z:-30-r()*10,scale:.8+r()*.5,rotation:r()*6});plantGrove(detail,'cypress',cypresses.map(t=>({...t,y:Math.abs(t.x-ohrid.kaneoX)<11&&t.z>-34?ohrid.kaneoTop:ohrid.shoreTop})),{low,name:'lakeside-cypresses'});
  const swans=shoreLife(detail,finish,r,low),gulls=createFlock(detail,{name:'ohrid-gulls',count:low?5:10,centre:[finish*.5,8,-10],radius:[32,3,5],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:151,glide:true});
  let reduced=context.reducedMotion;const drift=(time:number)=>{swans.position.set(20+((time*.2)%(finish-10)),Math.sin(time*.9)*.02,-9+Math.sin(time*.16)*2);};drift(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;drift(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*107+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='bridge'){ropeRail(b,from,to,y,rear);lampPost(b,glow,from+.4,surface(from+.4),rear+.3);if(w>4.4)nets(b,to-1.1,surface(to-1.1),rear+.2);if(w>7)bench(b,0,y,rear+.25);}
  else if(t==='cliff'){box(b,w-.6,.7,.4,C.stoneDark,0,Math.min(surface(from),surface(to)),rear);pottedTree(b,from+.7,surface(from+.7),rear+.5,.7,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.fig},seed);if(w>4.4)lampPost(b,glow,to-.4,surface(to-.4),rear+.3);}
  else if(t==='terrace'){balustrade(b,from,to,y,rear,{rail:C.trim,base:C.stoneDark,baluster:C.white});pottedTree(b,from+.7,y,-1.7,.75,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.fig},seed);if(w>5)bench(b,to-1.4,y,-1.9);}
  else if(t==='rock'){reeds(b,(seed%2?.3:-.3),surface(0),rear+.3,seed);}
  else if(t==='ground'){lampPost(b,glow,from+.3,y,-1.3);reeds(b,0,y,-1.6,seed);bench(b,to-1.2,y,-1.9);}
  finishProps(root,b,glow,'ohrid-piers-nets-and-reeds');
 },
};
