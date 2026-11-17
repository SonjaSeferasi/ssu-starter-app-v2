import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,bench,drumDome,finishProps,flagMaterial,lampPost,pottedTree,pyramid,texturedStone,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Bosnia and Herzegovina: the Old Bridge of Mostar (SRS-632.28). The far
 * bank is a limestone gorge, and where the river turns away between its
 * cliffs the single pale arch of Stari Most leaps across, humped at the
 * crown, between the square Halebija tower and the round Tara tower with
 * the flag. A diver stands on the parapet and, every so often, dives.
 * Along the cobbled bank runs the bazaar of small stone shops under
 * stone-slab roofs, with awnings and copper wares, and behind it the
 * domed mosque with its thin minaret. Bare hills close the valley. The
 * route carries stone parapets, kilims, copper coffee sets and fig trees.
 * Scenery only: nothing collides. */
const C={stone:'#f2ecdc',stoneLight:'#faf6ea',cobble:'#ddd6c6',rock:'#d6cfbe',rockDark:'#b8b1a0',slate:'#8f8a80',red:'#b5593c',cream:'#f1e9d6',trim:'#fbf8ef',shutter:'#5a4630',shade:'#4a4034',lead:'#7f8a8e',gold:'#d6a938',copper:'#c8773a',
 river:'#5fa59a',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',fig:'#5a3a6a',skin:'#d9a37a',trunks:'#c8402f',rug:'#a8322c',rugAlt:'#e0c080',rugDark:'#2f3a5a'} as const;
const walls=['#f1e9d6','#e6dcc6','#f6f0e2','#e2d6bc'] as const,awnings=['#b5402f','#e6dcc6','#3f6a8a'] as const;
const base=europeEnvironment('BIH',{landmark:false,flat:true,town:false,backdrop:false});
export const mostar={bankTop:2,bridgeX:74,bridgeZ:-21,span:14,crown:8.2,mosqueX:40} as const;
const limestone=()=>texturedStone('paris-stone','#fcf8ee',1.2,.94);

function banks(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='neretva-gorge-banks';root.add(group);const s=new Builder(),rock=new Builder(),top=mostar.bankTop,bx=mostar.bridgeX,half=mostar.span/2,from=-56,to=finish+100;
 for(const [a,b] of [[from,bx-half],[bx+half,to]] as const)box(s,b-a,top+4.4,70,C.cobble,(a+b)/2,-4.4,-52);box(s,mostar.span,2.15,70,C.river,bx,-4.4,-52);
 const crag=(x:number,z:number,k:number)=>rock.add(new T.DodecahedronGeometry(1,0),k%2?C.rock:C.rockDark,[x,-1.8+(k%3)*.9,z],[k,k*2,0],[1.9+(k%3)*.4,1.7+(k%2)*.5,1.3],.08);
 for(let x=from,k=0;x<to;x+=low?4.4:2.2,k++)if(Math.abs(x-bx)>half+1)crag(x,-17.3-(k%2)*.4,k);for(let z=-17.6,k=0;z>-46;z-=low?4.8:2.4,k++)for(const side of [-1,1])crag(bx+side*(half+.5),z,k+side);
 s.mesh(group,vertexMaterial(.96),'cobbled-banks-and-river-bend');rock.mesh(group,vertexMaterial(.98),'limestone-gorge-cliffs');group.userData={feature:'Neretva gorge'};
}

function oldBridge(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='stari-most';root.add(group);const s=new Builder(.5),p=new Builder(),bx=mostar.bridgeX,z=mostar.bridgeZ,R=mostar.span/2,top=mostar.bankTop,crown=mostar.crown,reach=R+3.5,depth=3,deck=(dx:number)=>crown-Math.abs(dx)*(crown-top-.5)/reach;
 // The ring of arch stones, then the walls above it up to the humped deck and its parapets.
 const n=low?14:26;for(let k=0;k<n;k++){const a=(k+.5)/n*Math.PI;s.add(new T.BoxGeometry(Math.PI*(R+.3)/n+.05,.62,depth+.24),C.stoneLight,[bx+Math.cos(a)*(R+.3),Math.sin(a)*(R+.3),z],[0,0,a+Math.PI/2]);}
 const step=low?1:.5;for(let dx=-reach;dx<reach-.01;dx+=step){const m=dx+step/2,bottom=Math.abs(m)<R?Math.sqrt(R*R-m*m)+.5:-2.4,y=deck(m);if(y>bottom)box(s,step+.02,y-bottom,depth,C.stone,bx+m,bottom,z);box(s,step+.04,.12,depth+.3,C.stoneLight,bx+m,y,z);for(const side of [-1,1])box(s,step+.02,.55,.22,C.stone,bx+m,y+.1,z+side*(depth/2-.1));}
 // Halebija, square, on the left bank; Tara, round, on the right, with the flag.
 const hx=bx-reach-1.7,tx=bx+reach+1.9;box(s,3.2,4.6,3.2,C.stone,hx,top,z-.2);pyramid(p,.2,3.6,1.2,C.slate,hx,top+4.6,z-.2);cyl(s,2,2.1,5.2,C.stone,tx,top,z-.2,low?10:16);cone(p,2.3,1.2,C.slate,tx,top+5.2,z-.2,low?10:16);
 for(const [x,h] of [[hx,4.6],[tx,5.2]] as const)for(const dx of [-.6,.6])box(p,.28,.7,.08,C.shade,x+dx,top+h*.6,z-.2+(x===hx?1.62:2.02));
 cyl(p,.05,.06,1.9,C.iron,tx,top+6.3,z-.2,5);s.mesh(group,limestone(),'single-arch-deck-and-towers');p.mesh(group,vertexMaterial(.8),'tower-roofs-and-mast');wavingFlag(group,flag,tx+.06,top+7.7,z-.2,1.6,'bosnia-flag',.5);
 group.userData={landmark:'Stari Most with the Halebija and Tara towers',span:mostar.span};
}

/** A bridge diver: arms spread, standing on the parapet at the crown. */
function diver(root:T.Object3D){
 const group=new T.Group();group.name='bridge-diver';root.add(group);const b=new Builder();for(const dx of [-.09,.09])box(b,.11,.5,.11,C.skin,dx,0,0);box(b,.32,.22,.18,C.trunks,0,.44,0);box(b,.3,.42,.16,C.skin,0,.66,0);b.add(new T.SphereGeometry(.12,8,6),C.skin,[0,1.2,0]);b.strut(new T.Vector3(-.14,1,0),new T.Vector3(-.62,1.08,0),.045,C.skin,5,.8);b.strut(new T.Vector3(.14,1,0),new T.Vector3(.62,1.08,0),.045,C.skin,5,.8);
 b.mesh(group,vertexMaterial(.8),'diver-figure');group.userData={animated:true};return group;
}

function bazaar(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='kujundziluk-bazaar';root.add(group);const s=new Builder(),p=new Builder(),y=mostar.bankTop,bx=mostar.bridgeX,half=mostar.span/2;let shops=0;
 for(const [z,tall] of [[-25.5,0],[-32,1.8]] as const)for(let x=-40;x<finish+60;){const w=3+r()*1.8,h=3+r()*1.1+tall,mid=x+w/2;
  if(Math.abs(mid-bx)>half+(tall?2.6:7.6)&&!(tall&&Math.abs(mid-mostar.mosqueX)<7.5)){townhouse(s,p,mid,y,z,w-.15,h,4.4,{wall:walls[Math.floor(r()*walls.length)],trim:C.trim,glass:C.shutter,roof:tall&&r()>.45?C.red:C.slate},{rows:h>4.3?2:1,roof:'hip',door:!tall,low});
   if(!tall){p.add(new T.BoxGeometry(w*.78,.06,1.1),awnings[shops%3],[mid,y+2,z+.5],[.38,0,0]);for(let j=0;j<(low?2:4);j++)p.add(new T.SphereGeometry(.12,6,5),C.copper,[mid-w*.3+j*w*.2,y+1.5,z+.86]);}shops++;}x+=w+(shops%4?0:.9);}
 s.mesh(group,vertexMaterial(.95),'stone-shops');p.mesh(group,vertexMaterial(.75),'slab-roofs-awnings-and-copper-wares');group.userData={feature:'Old bazaar',shops};
}

function mosque(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='koski-mehmed-pasha-mosque';root.add(group);const s=new Builder(),p=new Builder(),x=mostar.mosqueX,z=-34,y=mostar.bankTop,col={wall:C.cream,trim:C.trim,dome:C.lead,finial:C.gold,glass:C.shade};
 box(s,6,4.2,6,C.cream,x,y,z-3);drumDome(s,p,x,y+4.2,z-3,2.7,.7,col,{low,sides:low?10:16});box(s,6.4,.3,2.2,C.cream,x,y+2.4,z+1.1);for(const dx of [-3,-1,1,3])cyl(s,.14,.16,2.4,C.trim,x+dx,y,z+2,8);for(const dx of [-2,0,2])p.add(new T.SphereGeometry(.95,8,5,0,Math.PI*2,0,Math.PI/2),C.lead,[x+dx,y+2.7,z+1.1],[0,0,0],[1,.6,1]);
 const mx=x+4.1,mz=z-.8;cyl(s,.46,.6,6.6,C.cream,mx,y,mz,10);cyl(s,.85,.5,.35,C.trim,mx,y+6.3,mz,10);cyl(s,.85,.85,.45,C.trim,mx,y+6.65,mz,10);cyl(s,.36,.38,1.5,C.cream,mx,y+7.1,mz,10);cone(p,.46,1.8,C.lead,mx,y+8.6,mz,10);p.add(new T.SphereGeometry(.1,6,5),C.gold,[mx,y+10.5,mz]);
 s.mesh(group,vertexMaterial(.94),'prayer-hall-porch-and-minaret');p.mesh(group,vertexMaterial(.6),'lead-domes-and-minaret-cap');group.userData={landmark:'Koski Mehmed Pasha Mosque'};
}

/** Blue, with a yellow triangle and a line of white stars along its long side. */
const bosnianFlag=()=>pixelTexture(96,(u,v)=>{const t=1-v;if(u>=.3&&u<=.8&&(u-.3)/.5>=t)return[254,203,0,255];for(let k=0;k<7;k++){const q=(k+.3)/7;if(Math.hypot((u-(.215+.5*q))*2,t-q-.03)<.05)return[255,255,255,255];}return[0,35,149,255];},true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
function parapet(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.6,.34,C.stone,(from+to)/2,y,z);box(b,to-from+.1,.1,.44,C.stoneLight,(from+to)/2,y+.6,z);}
/** A copper coffee set on a low round table. */
function coffeeSet(b:Builder,x:number,y:number,z:number){cyl(b,.05,.07,.42,C.wood,x,y,z,6);cyl(b,.3,.3,.04,C.copper,x,y+.42,z,12);cyl(b,.06,.09,.16,C.copper,x-.08,y+.46,z,8);b.strut(new T.Vector3(x-.03,y+.58,z),new T.Vector3(x+.16,y+.64,z),.015,C.copper,4,1);for(const dx of [.08,.17])cyl(b,.04,.03,.06,C.trim,x+dx,y+.46,z+.1,6);}
/** A kilim hung over a rail. */
function kilim(b:Builder,x:number,y:number,z:number,seed:number){for(const dx of [-.7,.7])cyl(b,.05,.06,1.4,C.wood,x+dx,y,z,5);box(b,1.5,.05,.05,C.wood,x,y+1.36,z);box(b,1.2,1,.04,seed%2?C.rug:C.rugDark,x,y+.36,z);for(const dy of [.5,.82,1.14])box(b,1.2,.08,.05,C.rugAlt,x,y+dy,z);box(b,.5,.3,.05,seed%2?C.rugDark:C.rug,x,y+.68,z+.005);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'single-arch-old-bridge','halebija-and-tara-towers','bridge-diver','limestone-gorge-and-river-bend','bazaar-of-stone-shops-with-copper-wares','domed-mosque-and-minaret','kilims-and-copper-coffee-sets']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(38760),detail=new T.Group();detail.name='mostar-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  banks(detail,finish,low);oldBridge(detail,flagMaterial(bosnianFlag()),low);bazaar(detail,finish,r,low);mosque(detail,low);
  const range=new T.Group();range.name='herzegovina-hills';detail.add(range);const m=new Builder(.5);for(const [dx,w,h] of [[-60,70,30],[30,80,36],[130,76,32],[220,70,28]] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#aaa893':'#9c9a86',[dx,-4,-112],[0,0,0],[w,h,16],.1);m.mesh(range,vertexMaterial(.98),'bare-karst-hills');
  const cypresses:Placement[]=[];for(let k=0;k<(low?8:18);k++){const x=-36+r()*(finish+90);if(Math.abs(x-mostar.bridgeX)>10)cypresses.push({x,y:mostar.bankTop,z:-37-r()*5,scale:.7+r()*.4,rotation:r()*6});}plantGrove(detail,'cypress',cypresses,{low,name:'mostar-cypresses'});
  const figure=diver(detail),swifts=createFlock(detail,{name:'gorge-swifts',count:low?6:12,centre:[mostar.bridgeX,9,-14],radius:[26,2.5,4],speed:.34,size:.5,color:'#2c2f36',wing:'#3a3e46',seed:157});
  const stand=mostar.crown+.65,dive=(time:number)=>{const c=time%16,t=c-12;figure.visible=c<13.5;figure.position.set(mostar.bridgeX,t>0?stand+2.2*t-7*t*t:stand,mostar.bridgeZ+1.4+(t>0?t*1.3:0));figure.rotation.x=t>0?t*2.2:0;};
  let reduced=context.reducedMotion;dive(0);swifts.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;dive(time);swifts.update(time);},setReducedMotion(value){reduced=value;if(value)dive(0);swifts.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*109+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='bridge'){parapet(b,from,to,y,rear);lampPost(b,glow,from+.4,surface(from+.4),rear+.36);if(w>4.4)kilim(b,to-1.1,surface(to-1.1),rear+.3,seed);}
  else if(t==='cliff'){parapet(b,from,to,Math.min(surface(from),surface(to)),rear);pottedTree(b,from+.7,surface(from+.7),rear+.55,.7,{pot:C.copper,trunk:'#5a4636',leaf:C.leaf,fruit:C.fig},seed);if(w>4.4)coffeeSet(b,to-.8,surface(to-.8),rear+.6);}
  else if(t==='rock'){coffeeSet(b,(seed%2?.3:-.3),surface(0),rear+.35);}
  else if(t==='arch'||t==='terrace'){parapet(b,from,to,y,rear);kilim(b,from+1.1,y,rear+.3,seed);coffeeSet(b,0,y,-1.6);if(w>6)bench(b,to-1.4,y,-1.9);}
  else if(t==='ground'){lampPost(b,glow,from+.3,y,-1.3);coffeeSet(b,0,y,-1.6);bench(b,to-1.2,y,-1.9);}
  finishProps(root,b,glow,'mostar-parapets-kilims-and-copper');
 },
};
