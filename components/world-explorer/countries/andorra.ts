import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bench,finishProps,flagMaterial,pyramid,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Andorra: the Madriu valley in the high Pyrenees (SRS-632.34). Beyond the
 * mountain stream lie summer pastures divided by dry-stone walls and
 * stepped in stone terraces. Among them stand the shepherds' stone huts
 * under slate roofs, round turf-roofed shelters, and a small Romanesque
 * church with its tall square bell tower and porch. Grey glacial cliffs
 * close both ends of the valley, a waterfall dropping down the eastern
 * one, with pine forest between and snowy peaks behind. Horses and cows
 * graze, an isard stands on the rocks and vultures circle. The route
 * carries dry-stone walls, cairns, trail signposts, fences and milk
 * churns. Scenery only: nothing collides. */
const C={meadow:'#86ab5c',meadowDark:'#74984e',turf:'#7a9a50',granite:'#bdbab2',graniteDark:'#a09d96',stone:'#b0a898',stoneDark:'#928b7e',slate:'#5d5850',slateDark:'#4a463f',shade:'#2e2a24',wood:'#7a5c40',woodDark:'#5a4636',white:'#f8f5ee',water:'#e6f2f6',pool:'#8fc0c8',
 horse:'#6a4630',cow:'#c9a074',isard:'#a8763f',iron:'#22262a',steel:'#c9ced2',yellow:'#f0c020',red:'#d50032',hay:'#d9c070'} as const;
const base=europeEnvironment('AND',{landmark:false,flat:true,town:false});
export const madriu={bankTop:-1,churchX:40,cliffZ:-30,steps:[[-33,.2],[-39,1.6]]} as const;
/** The two rock walls that close the valley: from, to and height. The eastern one stands just past the finish. */
export const valleyWalls=(finish:number)=>[[-44,12,10],[finish+7,finish+54,11]] as const;

/** A wall of loose stones: rough blocks of uneven height. */
function looseWall(b:Builder,x:number,y:number,z:number,length:number,along:'x'|'z',seed:number,low:boolean){const step=low?1.6:.8;for(let d=0,k=0;d<length;d+=step,k++){const h=.5+((seed+k*5)%4)*.09;box(b,along==='x'?step+.04:.5,h,along==='x'?.5:step+.04,k%2?C.stone:C.stoneDark,along==='x'?x+d+step/2:x,y,along==='x'?z:z-d-step/2);}}

function valley(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='madriu-pastures-and-terraces';root.add(group);const g=new Builder(),s=new Builder(),top=madriu.bankTop,from=-60,to=finish+100;
 box(g,to-from,top+4.4,60,C.meadow,(from+to)/2,-4.4,-46.5);for(const [z,rise] of madriu.steps){box(g,to-from,rise+1.2,50,C.meadowDark,(from+to)/2,top,z-25);looseWall(s,from,top,z+.3,to-from,'x',Math.round(-z),true);}
 // Boulders along the stream, walls dividing the pastures, and hay stooks.
 for(let x=from,k=0;x<to;x+=low?7:3.4,k++)s.add(new T.DodecahedronGeometry(1,0),k%2?C.granite:C.graniteDark,[x+r()*2,-2.3+r()*.5,-16.2-r()*.5],[k,k*3,0],[.8+r()*.9,.6+r()*.5,.7+r()*.4],.08);
 for(const x of [14,52,100])looseWall(s,x,top,-17.4,15,'z',x,low);looseWall(s,14,top,-26.4,38,'x',3,low);
 for(const [hx,hz] of [[24,-21],[30,-23.4],[46,-28.4],[58,-23]] as const){g.add(new T.ConeGeometry(.6,1.3,7),C.hay,[hx,top+.65,hz]);}
 g.mesh(group,vertexMaterial(.97),'pastures-terraces-and-hay');s.mesh(group,vertexMaterial(.98),'dry-stone-walls-and-stream-boulders');group.userData={feature:'Pastures and dry-stone walls'};
}

function huts(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='shepherd-huts';root.add(group);const s=new Builder(),p=new Builder(),y=madriu.bankTop;let count=0;
 for(const [x,z,w,d,turn] of [[62,-21.4,3.4,3,0],[70,-24.6,4,3.2,1],[80,-21,3,2.8,0],[90,-24,4.4,3.4,1],[20,-22,3.2,2.8,1]] as const){
  box(s,w,2.1,d,count%2?C.stone:C.stoneDark,x,y,z);roof(p,w+.5,1.1,d+.5,count%2?C.slate:C.slateDark,x,y+2.1,z,turn?Math.PI/2:0);box(p,.7,1.3,.08,C.woodDark,x-w*.2,y,z+d/2+.02);box(p,.4,.4,.08,C.shade,x+w*.25,y+1.1,z+d/2+.02);if(turn)box(p,.5,.5,.08,C.woodDark,x,y+2.3,z+d/2+.05);cyl(s,.14,.16,.5,C.stoneDark,x+w*.3,y+2.7,z-d*.2,6);count++;}
 // Round stone shelters under turf.
 for(const [x,z] of [[75,-27.6],[96,-20.6],[30,-27.2]] as const){cyl(s,1.3,1.4,1.1,C.stone,x,y,z,low?8:12);p.add(new T.SphereGeometry(1.42,low?8:12,5,0,Math.PI*2,0,Math.PI/2),C.turf,[x,y+1.1,z],[0,0,0],[1,.6,1]);box(p,.6,.8,.1,C.shade,x,y,z+1.36);count++;}
 s.mesh(group,vertexMaterial(.98),'stone-huts-and-round-shelters');p.mesh(group,vertexMaterial(.8),'slate-and-turf-roofs');group.userData={feature:'Bordes and shepherd shelters',huts:count};
}

function church(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='romanesque-church';root.add(group);const s=new Builder(),p=new Builder(),x=madriu.churchX,y=madriu.bankTop,z=-23;
 box(s,7,3.4,4,C.stone,x,y,z-2);roof(p,7.4,1.5,4.5,C.slate,x,y+3.4,z-2);cyl(s,1.7,1.7,2.8,C.stone,x+3.5,y,z-2,low?8:12);p.add(new T.SphereGeometry(1.75,low?8:12,5,0,Math.PI*2,0,Math.PI/2),C.slate,[x+3.5,y+2.8,z-2],[0,0,0],[1,.5,1]);
 // The bell tower: paired openings on three levels under a low pyramid roof.
 box(s,2,7.4,2,C.stoneDark,x-4.4,y,z-1.4);for(const level of [2.6,4.2,5.8])for(const dx of [-.36,.36])archedWindow(s,p,x-4.4+dx,y+level,z-.38,.4,.9,{frame:C.stone,glass:C.shade});for(const level of [2.4,4,5.6])box(s,2.1,.1,2.1,C.stone,x-4.4,y+level,z-1.4);pyramid(p,.1,2.5,1.2,C.slateDark,x-4.4,y+7.4,z-1.4);
 // The porch along the front, on wooden posts.
 for(let k=0;k<5;k++)cyl(p,.09,.1,2,C.woodDark,x-2.6+k*1.4,y,z+1.5,6);p.add(new T.BoxGeometry(6.6,.1,1.9),C.slateDark,[x+.2,y+2.3,z+.8],[.3,0,0]);box(p,.8,1.6,.08,C.woodDark,x,y,z+.03);cyl(p,.05,.06,3.4,C.iron,x+7,y,z+.4,5);
 s.mesh(group,vertexMaterial(.98),'nave-apse-and-bell-tower');p.mesh(group,vertexMaterial(.8),'slate-roofs-porch-and-mast');wavingFlag(group,flag,x+7.06,y+2.8,z+.4,1.8,'andorra-flag',.7);group.userData={landmark:'Romanesque church with Lombard bell tower'};
}

function cliffs(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='glacial-cliffs-and-waterfall';root.add(group);const rock=new Builder(),w=new Builder(),top=madriu.bankTop,z=madriu.cliffZ;
 const walls=valleyWalls(finish);for(const [a,b,up] of walls){for(let x=a,k=0;x<b;x+=low?4:2,k++){const edge=Math.min(1,(x-a+3)/5,(b-x+3)/5),h=top+(up-top)*edge*(.86+.14*Math.sin(x*.7));box(rock,(low?4:2)+.04,h-top,26,k%2?C.granite:C.graniteDark,x+(low?2:1),top,z-13);
   for(let y=top+1,j=0;y<h-.4;y+=2.2,j++)rock.add(new T.DodecahedronGeometry(1,0),(k+j)%2?C.granite:C.graniteDark,[x+1,Math.min(y,h-1.2),z+.25-((k+j)%2)*.35],[k,j*2,0],[(low?3:1.6),1.6+(j%2)*.4,1.1],.08);}}
 // The waterfall: a white ribbon down the eastern cliff into a pool.
 const fx=walls[1][0]+9,up=walls[1][2]*.93;box(w,1.5,up-top-.4,.3,C.water,fx,top,z+1.5);box(w,.8,up-top-.4,.34,C.white,fx+.2,top,z+1.52);w.add(new T.CylinderGeometry(2.6,2.6,.1,low?10:18),C.pool,[fx,top+.06,z+3.4]);for(let k=0;k<(low?4:8);k++)w.add(new T.SphereGeometry(.4,6,5),C.white,[fx-1+k*.3,top+.3,z+2+((k*7)%5)*.2],[0,0,0],[1,.6,1]);
 rock.mesh(group,vertexMaterial(.98),'grey-granite-walls');w.mesh(group,vertexMaterial(.4),'waterfall-and-pool');group.userData={feature:'Glacial cliffs and waterfall'};
 const spray=new T.Group();spray.name='waterfall-spray';root.add(spray);const f=new Builder();for(let k=0;k<(low?4:7);k++)f.add(new T.SphereGeometry(.22,6,5),C.white,[fx-.5+((k*5)%4)*.3,0,z+1.75],[0,0,0],[1,1.8,.6]);f.mesh(spray,vertexMaterial(.4),'falling-water');spray.userData={animated:true};return spray;
}

function herd(root:T.Object3D,finish:number){
 const group=new T.Group();group.name='grazing-horses-cows-and-isard';root.add(group);const b=new Builder(),y=madriu.bankTop;
 const beast=(x:number,ty:number,z:number,color:string,size:number,horns:boolean)=>{box(b,1.3*size,.6*size,.46*size,color,x,ty+.52*size,z);box(b,.34*size,.5*size,.3*size,color,x+.72*size,ty+(horns?.9:.5)*size,z);for(const [dx,dz] of [[-.5,-.14],[-.5,.14],[.5,-.14],[.5,.14]] as const)box(b,.1*size,.52*size,.1*size,color,x+dx*size,ty,z+dz*size);b.strut(new T.Vector3(x-.66*size,ty+1*size,z),new T.Vector3(x-.8*size,ty+.5*size,z),.03,color,4,.6);if(horns)for(const dz of [-.08,.08])b.strut(new T.Vector3(x+.72*size,ty+1.4*size,z+dz),new T.Vector3(x+.6*size,ty+1.8*size,z+dz),.025,C.shade,4,.5);};
 for(const [x,z] of [[26,-19.2],[34,-20.6],[66,-18.6]] as const)beast(x,y,z,C.horse,1,false);for(const [x,z] of [[56,-19],[86,-18.8]] as const)beast(x,y,z,C.cow,.95,false);beast(valleyWalls(finish)[1][0]+16,valleyWalls(finish)[1][2]*.9,madriu.cliffZ-1.4,C.isard,.6,true);
 b.mesh(group,vertexMaterial(.9),'animals');group.userData={feature:'Grazing animals'};
}

/** Blue, yellow and red upright bands, with the arms in the middle. */
const andorranFlag=()=>pixelTexture(96,(u,v)=>{if(Math.abs(u-.5)<.07&&Math.abs(v-.5)<.14)return(u<.5)===(v<.5)?[213,0,50,255]:[240,192,32,255];return u<.32?[16,6,159,255]:u<.68?[254,221,0,255]:[213,0,50,255];},true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
function dryWall(b:Builder,from:number,to:number,y:number,z:number,seed:number){for(let x=from,k=0;x<to-.01;x+=.6,k++)box(b,Math.min(.62,to-x+.02),.46+((seed+k*5)%4)*.1,.38,k%2?C.stone:C.stoneDark,x+Math.min(.6,to-x)/2,y,z);}
function cairn(b:Builder,x:number,y:number,z:number){[[.3,.16],[.22,.42],[.15,.62],[.09,.77]].forEach(([size,h],k)=>b.add(new T.DodecahedronGeometry(size,0),k%2?C.granite:C.stoneDark,[x+(k%2)*.03,y+h,z],[k,k*2,0],[1,.7,1]));}
function signpost(b:Builder,x:number,y:number,z:number){cyl(b,.05,.06,1.7,C.woodDark,x,y,z,5);box(b,.8,.2,.05,C.yellow,x+.3,y+1.4,z+.04);box(b,.7,.2,.05,C.yellow,x-.26,y+1.12,z+.04);box(b,.16,.08,.06,C.white,x,y+.7,z+.05);box(b,.16,.08,.06,C.red,x,y+.62,z+.05);}
function churn(b:Builder,x:number,y:number,z:number){cyl(b,.15,.15,.42,C.steel,x,y,z,10);cyl(b,.09,.15,.12,C.steel,x,y+.42,z,10);cyl(b,.11,.11,.05,C.steel,x,y+.54,z,10);}
function fence(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.3)cyl(b,.06,.07,.95,C.woodDark,x,y,z,5);for(const dy of [.4,.78])box(b,to-from+.1,.07,.05,C.wood,(from+to)/2,y+dy,z);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'dry-stone-walls-and-terraces','stone-huts-under-slate-roofs','round-turf-roofed-shelters','romanesque-church-and-bell-tower','glacial-cliffs','waterfall','pine-forest-and-snowy-peaks','horses-cows-and-isard','cairns-and-trail-signposts']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(36100),detail=new T.Group();detail.name='madriu-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  valley(detail,finish,r,low);huts(detail,low);church(detail,flagMaterial(andorranFlag()),low);const spray=cliffs(detail,finish,low);herd(detail,finish);
  const peaks=createHeightfield(detail,{name:'pyrenees-peaks',x:finish/2,y:-12,z:-128,width:finish+260,depth:70,segments:[low?40:90,low?14:28],height:ridgedRange(5733,{peaks:10,height:50,sharpness:1.6}),color:mountainColor({snowLine:30,treeLine:16,rock:'#8b8a86',forest:'#4f6e3f',snow:'#eef3f5'})});peaks.userData={feature:'Pyrenees'};
  const slopes=new T.Group();slopes.name='forested-valley-sides';detail.add(slopes);const m=new Builder(.5);for(const [dx,w,h] of [[-50,60,20],[40,70,24],[130,66,22],[215,60,19]] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#4f7340':'#476a3a',[dx,-5,-88],[0,0,0],[w,h,14],.1);m.mesh(slopes,vertexMaterial(.98),'pine-covered-slopes');
  const pines:Placement[]=[];for(let k=0;k<(low?24:60);k++){const x=-40+r()*(finish+100),z=-31-r()*18;if(valleyWalls(finish).some(([a,b])=>x>a-1&&x<b+1))continue;pines.push({x,y:madriu.bankTop+(z<madriu.steps[1][0]?madriu.steps[1][1]+1.2:z<madriu.steps[0][0]?madriu.steps[0][1]+1.2:0),z,scale:.8+r()*.6,rotation:r()*6});}plantGrove(detail,'conifer',pines,{low,name:'valley-pines'});
  const vultures=createFlock(detail,{name:'pyrenean-vultures',count:low?3:6,centre:[finish*.5,13,-24],radius:[40,2,6],speed:.12,size:1.5,color:'#5a4a3a',wing:'#3a3028',seed:181,glide:true});
  const up=valleyWalls(finish)[1][2]*.93,fall=(time:number)=>{spray.children[0].position.y=up-1.5-((time*3)%2.2);};let reduced=context.reducedMotion;fall(0);vultures.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;fall(time);vultures.update(time);},setReducedMotion(value){reduced=value;vultures.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*149+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){fence(b,from,to,y,rear);signpost(b,from+.6,y,rear+.4);if(w>4.4)churn(b,to-.7,y,rear+.45);if(w>6)churn(b,to-1.1,y,rear+.5);}
  else if(t==='cliff'){dryWall(b,from,to,Math.min(surface(from),surface(to)),rear,seed);cairn(b,to-.6,surface(to-.6),rear+.6);}
  else if(t==='stairs'){for(let x=from;x<=to+.01;x+=1.3){cyl(b,.06,.07,.95,C.woodDark,x,surface(x),rear,5);if(x+1.3<=to+.01)b.strut(new T.Vector3(x,surface(x)+.85,rear),new T.Vector3(x+1.3,surface(x+1.3)+.85,rear),.035,C.wood,4,1);}}
  else if(t==='terrace'){dryWall(b,from,to,y,rear,seed);cairn(b,from+.6,y,rear+.6);if(w>5)bench(b,to-1.4,y,rear+.6);if(w>8)signpost(b,0,y,rear+.5);}
  else if(t==='rock'){cairn(b,(seed%2?.3:-.3),surface(0),rear+.4);}
  finishProps(root,b,glow,'madriu-dry-stone-walls-cairns-and-signposts');
 },
};
