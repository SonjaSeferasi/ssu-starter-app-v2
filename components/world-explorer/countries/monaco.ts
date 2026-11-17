import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bandedFlagTexture,bench,cafeTable,drumDome,finishProps,flagMaterial,fountain,lampPost,pottedTree,pyramid,statue,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Monaco: the Rock above the harbour (SRS-632.30). On the cliff-sided Rock
 * stands the Prince's Palace, cream-walled and battlemented, with its
 * clock tower, arcade, corner towers, cannons, striped sentry boxes and
 * the red and white flag; beside it the white cathedral; and built into
 * the cliff face over the sea, the Oceanographic Museum. To the left the
 * harbour is full of white yachts below the Casino with its copper-green
 * roofs and the pastel apartment towers stepping up the hill. The route
 * is dressed as the street circuit: red and white kerbs, steel barriers
 * and tyre stacks, with orange trees and cafe tables on the terraces.
 * Scenery only: nothing collides. */
const C={quay:'#e9e3d6',rock:'#d8d1c0',rockDark:'#bbb4a2',garden:'#8fb066',palace:'#f3e6c8',palaceDark:'#e6d6b0',trim:'#fbf8ef',glass:'#3a4a58',shade:'#4a4034',white:'#f8f5ee',copper:'#6fa594',gold:'#d6a938',red:'#ce1126',
 iron:'#22262a',steel:'#c9ced2',wood:'#7a5c40',leaf:'#4a7d3f',orange:'#f08a24',hull:'#fbfaf6',deck:'#2f3a48',sail:'#fdfcf6',palmTrunk:'#8a6f52',palm:'#3f8a4a',tyre:'#26262a',water:'#6fb3c8',bronze:'#5a6a5a'} as const;
const pastels=['#f6e3c6','#f3d2c0','#f8f0dc','#e9d9c4','#f1c9b0','#f4ead0','#dfe8e6'] as const,tyreTints=['#ce1126','#f8f5ee','#2a5a9a'] as const;
const base=europeEnvironment('MCO',{landmark:false,flat:true,town:false});
export const monaco={quayTop:-1,rockFrom:44,rockTo:118,rockTop:4,rockFront:-21,palaceX:66,cathedralX:92,museumX:108,casinoX:8,tiers:[[-27,-1,8],[-34,1.5,9],[-41,4,9]]} as const;

function palm(b:Builder,x:number,y:number,z:number,h:number,seed:number){b.strut(new T.Vector3(x,y,z),new T.Vector3(x+.14*Math.sin(seed),y+h,z),.15,C.palmTrunk,7,.75);for(let k=0;k<8;k++){const a=k/8*Math.PI*2+seed,tip=new T.Vector3(x+Math.cos(a)*1.3,y+h-.45,z+Math.sin(a)*1),mid=new T.Vector3(x+Math.cos(a)*.7,y+h+.32,z+Math.sin(a)*.54);b.strut(new T.Vector3(x,y+h,z),mid,.08,C.palm,4,.8);b.strut(mid,tip,.07,C.palm,4,.3);}}
const merlons=(b:Builder,from:number,to:number,y:number,z:number,color:string,pitch=1.2)=>{for(let x=from;x<to-.01;x+=pitch)box(b,pitch*.5,.5,.4,color,x+pitch*.25,y,z);};

function quayAndRock(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='the-rock-of-monaco';root.add(group);const g=new Builder(),rock=new Builder(),top=monaco.quayTop,from=-56,to=finish+100,{rockFrom:a,rockTo:b,rockTop,rockFront:f}=monaco;
 box(g,to-from,top+4.4,70,C.quay,(from+to)/2,-4.4,-52);for(const [z,y] of monaco.tiers.slice(1)){for(const [s,e] of [[from,a-2],[b+2,to]] as const){box(g,e-s,y-top,60,C.quay,(s+e)/2,top,z-27);}}
 box(rock,b-a,rockTop-top,40,C.rock,(a+b)/2,top,f-20);box(g,b-a-.6,.06,39.4,C.garden,(a+b)/2,rockTop,f-20);box(g,b-a-1,.08,9,C.quay,(a+b)/2,rockTop,f-5);
 const crag=(x:number,z:number,k:number)=>rock.add(new T.DodecahedronGeometry(1,0),k%2?C.rock:C.rockDark,[x,top+.9+(k%3)*1.5,z],[k,k*2,0],[1.9+(k%3)*.4,1.5+(k%2)*.5,1.2],.08);
 for(let x=a,k=0;x<=b;x+=low?4:2,k++)if(Math.abs(x-monaco.museumX)>7.4)crag(x,f-.2-(k%2)*.3,k);for(let z=f-1,k=0;z>f-26;z-=low?4.4:2.2,k++)for(const x of [a,b])crag(x,z,k+x);
 // The rampart along the cliff edge, with a round lookout at its corner.
 box(g,b-a,.9,.5,C.palaceDark,(a+b)/2,rockTop,f-.9);merlons(g,a,b,rockTop+.9,f-.9,C.palaceDark);cyl(g,1.1,.8,1.8,C.palaceDark,a+.6,rockTop-.4,f-.8,low?8:12);cone(g,1.3,1,C.rockDark,a+.6,rockTop+1.4,f-.8,low?8:12);
 for(let x=from+3,k=0;x<to;x+=low?10:5,k++)if(x<a-2||x>b+2)palm(g,x,top,-18.6,3+r()*.8,k);
 g.mesh(group,vertexMaterial(.95),'quay-rampart-gardens-and-palms');rock.mesh(group,vertexMaterial(.98),'rock-cliffs');group.userData={feature:'The Rock'};
}

function palace(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='princes-palace';root.add(group);const s=new Builder(),p=new Builder(),x=monaco.palaceX,y=monaco.rockTop,z=-30;
 box(s,24,4.2,6,C.palace,x,y,z-3);box(s,24.3,.2,6.3,C.trim,x,y+4.2,z-3);merlons(s,x-12,x+12,y+4.4,z-.2,C.palace);
 for(let k=0;k<11;k++){const wx=x-10+k*2;if(Math.abs(wx-x)<1.6)continue;box(p,.9,1.2,.06,C.glass,wx,y+2.6,z+.03);box(p,1.1,.1,.12,C.trim,wx,y+2.5,z+.05);box(p,1.1,.1,.12,C.trim,wx,y+3.8,z+.05);if(!low||k%2===0)archedWindow(s,p,wx,y,z+.04,1.3,2,{frame:C.trim,glass:C.shade});}
 // The clock tower over the gate, and the battlemented corner towers.
 box(s,3,6.2,2.4,C.palace,x,y,z-.6);archedWindow(s,p,x,y,z+.62,1.6,2.6,{frame:C.trim,glass:C.shade});p.add(new T.CylinderGeometry(.7,.7,.08,low?12:20),C.white,[x,y+5,z+.64],[Math.PI/2,0,0]);box(p,.06,.5,.04,C.iron,x,y+5,z+.7);box(p,.36,.06,.04,C.iron,x+.18,y+5,z+.7);merlons(s,x-1.5,x+1.5,y+6.2,z+.4,C.palace,.75);
 for(const side of [-1,1]){const tx=x+side*13.2;box(s,3.4,5.2,3.4,C.palaceDark,tx,y,z-1.2);merlons(s,tx-1.7,tx+1.7,y+5.2,z+.3,C.palaceDark,.85);for(const level of [1.4,3.4])box(p,.5,.9,.06,C.glass,tx,y+level,z+.52);}
 cyl(p,.05,.07,2.2,C.iron,x+13.2,y+5.2,z-1.2,5);
 // The square before the palace: cannons, shot piles, striped sentry boxes and the founder's statue.
 for(const dx of [-7,-4,4,7]){p.add(new T.CylinderGeometry(.11,.15,1.3,8),C.bronze,[x+dx,y+.5,z+3.5],[Math.PI/2.3,0,0]);for(const w of [-.26,.26])p.add(new T.CylinderGeometry(.3,.3,.07,10),C.wood,[x+dx+w,y+.3,z+3.3],[0,0,Math.PI/2]);for(const [bx,by,bz] of [[-.12,0,0],[.12,0,0],[0,0,.2],[0,.18,.07]] as const)p.add(new T.SphereGeometry(.11,6,5),C.iron,[x+dx+.8+bx,y+.11+by,z+3.6+bz]);}
 for(const side of [-1,1])for(let k=0;k<8;k++)box(p,.7,.2,.7,k%2?C.white:C.red,x+side*2.4,y+k*.2,z+1.1);for(const side of [-1,1])pyramid(p,.05,.9,.4,C.red,x+side*2.4,y+1.6,z+1.1);
 statue(p,x-10.4,y,z+3.4,1.5,{pedestal:C.palaceDark,figure:C.bronze});
 s.mesh(group,vertexMaterial(.94),'palace-walls-towers-and-battlements');p.mesh(group,vertexMaterial(.75),'palace-windows-clock-cannons-and-sentry-boxes');wavingFlag(group,flag,x+13.26,y+6.8,z-1.2,1.7,'monaco-flag',.8);group.userData={landmark:"Prince's Palace of Monaco"};
}

function cathedralAndMuseum(root:T.Object3D,low:boolean){
 const church=new T.Group();church.name='monaco-cathedral';root.add(church);const s=new Builder(),p=new Builder(),x=monaco.cathedralX,y=monaco.rockTop,z=-29.5;
 box(s,5,5,10,C.white,x,y,z-5);const gable=new Builder();gable.add(new T.ConeGeometry(3.6,1.6,4),C.white,[x,y+5.8,z-.3],[0,Math.PI/4,0],[1,1,.12]);s.parts.push(...gable.parts);
 archedWindow(s,p,x,y,z+.04,1.6,2.6,{frame:C.trim,glass:C.shade});p.add(new T.CylinderGeometry(.7,.7,.08,low?10:16),C.glass,[x,y+3.9,z+.05],[Math.PI/2,0,0]);p.add(new T.TorusGeometry(.72,.08,5,low?10:16),C.trim,[x,y+3.9,z+.08]);
 for(const side of [-1,1]){box(s,1.7,6.2,1.7,C.white,x+side*3.3,y,z-.9);archedWindow(s,p,x+side*3.3,y+4.2,z-.02,.6,1.2,{frame:C.trim,glass:C.shade});pyramid(p,.06,1.9,1.1,C.rockDark,x+side*3.3,y+6.2,z-.9);}
 drumDome(s,p,x,y+5,z-8,1.5,.8,{wall:C.white,trim:C.trim,dome:C.rockDark,finial:C.gold,glass:C.glass},{low,sides:low?8:12,cross:true});
 s.mesh(church,vertexMaterial(.92),'white-stone-nave-and-towers');p.mesh(church,vertexMaterial(.7),'portal-rose-window-and-dome');church.userData={landmark:'Cathedral of Our Lady Immaculate'};
 // The museum: a tall front of arches rising straight from the sea up the cliff.
 const museum=new T.Group();museum.name='oceanographic-museum';root.add(museum);const m=new Builder(),q=new Builder(),mx=monaco.museumX,base=monaco.quayTop,mz=monaco.rockFront+1.6,h=monaco.rockTop-base+3.4;
 box(m,14,h,4.4,C.palace,mx,base,mz-2.2);box(m,14.4,.3,4.8,C.trim,mx,base+h,mz-2.2);box(m,5,1.2,4,C.palace,mx,base+h+.3,mz-2.2);box(m,5.3,.2,4.3,C.trim,mx,base+h+1.5,mz-2.2);box(m,14.4,.24,.3,C.trim,mx,base+4.6,mz+.1);
 for(let k=0;k<5;k++){const ax=mx-5.2+k*2.6;archedWindow(m,q,ax,base+.3,mz+.04,1.7,3.6,{frame:C.trim,glass:C.shade});box(q,1.1,2,.06,C.glass,ax,base+5.4,mz+.03);if(k<4)cyl(m,.2,.22,2.9,C.trim,ax+1.3,base+4.9,mz+.3,low?6:10);}
 m.mesh(museum,vertexMaterial(.93),'museum-cliff-front');q.mesh(museum,vertexMaterial(.7),'museum-arches-and-windows');museum.userData={landmark:'Oceanographic Museum'};
}

function monteCarlo(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='monte-carlo-apartments-and-casino';root.add(group);const s=new Builder(),p=new Builder(),{rockFrom:a,rockTo:b,casinoX:cx}=monaco;let towers=0;
 monaco.tiers.forEach(([z,y,max],row)=>{for(let x=-48+row*2;x<finish+70;){const w=3.6+r()*2.2,h=4.6+r()*(max-4.6),mid=x+w/2;if((mid<a-4||mid>b+4)&&!(row===0&&Math.abs(mid-cx)<10)){const floors=Math.round(h/1.8);townhouse(s,p,mid,y,z,w-.3,h,5,{wall:pastels[Math.floor(r()*pastels.length)],trim:C.trim,glass:'#5f7f95',roof:'#d9d2c2'},{rows:low?Math.ceil(floors/2):floors,roof:'parapet',door:false,low});if(!low&&row<2)for(let k=1;k<floors;k++)box(p,w-.2,.07,.5,C.white,mid,y+k*h/floors,z+.25);towers++;}x+=w+(towers%3?0:.8);}});
 // The Casino: cream front, three arches, twin turrets and copper-green roofs, with a fountain before it.
 const y=monaco.quayTop,z=-24.5,col={wall:C.palace,trim:C.trim,dome:C.copper,finial:C.gold,glass:C.glass};box(s,13,4.2,5,C.palace,cx,y,z-2.5);box(s,13.4,.24,5.4,C.trim,cx,y+4.2,z-2.5);p.add(new T.BoxGeometry(11,1,4),C.copper,[cx,y+4.94,z-2.5]);
 for(const dx of [-2.2,0,2.2])archedWindow(s,p,cx+dx,y,z+.04,1.5,2.7,{frame:C.trim,glass:C.shade});for(const dx of [-4.6,4.6]){box(p,.9,1.3,.06,C.glass,cx+dx,y+2.2,z+.03);box(p,.9,1.1,.06,C.glass,cx+dx,y+.6,z+.03);}
 for(const side of [-1,1]){box(s,1.9,6,1.9,C.palace,cx+side*3.5,y,z-.6);drumDome(s,p,cx+side*3.5,y+6,z-.6,.9,.4,col,{low,sides:8});}p.add(new T.CylinderGeometry(.5,.5,.06,12),C.white,[cx,y+3.5,z+.05],[Math.PI/2,0,0]);
 fountain(p,cx,y,z+3.4,1.5,{stone:C.trim,water:C.water});
 s.mesh(group,vertexMaterial(.93),'pastel-apartment-towers-and-casino');p.mesh(group,vertexMaterial(.6),'balconies-copper-roofs-and-fountain');group.userData={feature:'Monte Carlo',towers,landmark:'Casino de Monte-Carlo'};
}

function yacht(b:Builder,x:number,z:number,len:number,decks:number){const y=-2.5;box(b,len,.9,len*.24,C.hull,x,y,z);b.add(new T.ConeGeometry(len*.12,len*.24,4),C.hull,[x+len*.62,y+.45,z],[0,Math.PI/4,-Math.PI/2],[1,1,.9]);box(b,len*1.01,.1,len*.245,C.deck,x,y+.3,z);
 for(let k=0;k<decks;k++){const l=len*(.72-k*.17);box(b,l,.55,len*.2-k*.12,C.hull,x-len*.08-k*len*.04,y+.9+k*.55,z);box(b,l*.96,.2,len*.202-k*.12,C.deck,x-len*.08-k*len*.04,y+1.1+k*.55,z);}cyl(b,.03,.04,.9,C.steel,x-len*.1,y+.9+decks*.55,z,4);}
function harbour(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='port-hercule-yachts';root.add(group);const b=new Builder();let count=0;
 for(let x=-40;x<finish+60;x+=low?16:9){if(x>monaco.museumX-12&&x<monaco.rockTo+4)continue;if(count%3===2){const sx=x+r()*2;b.add(new T.SphereGeometry(1,8,5),C.hull,[sx,-2.36,-14.6],[0,0,0],[1.7,.34,.5]);cyl(b,.035,.045,3.4,C.steel,sx,-2.2,-14.6,4);box(b,1.5,.05,.05,C.steel,sx-.7,-1.5,-14.6);}else yacht(b,x+r()*2,-14.4-r()*.6,5+r()*3.4,2+(count%2));count++;}
 b.mesh(group,vertexMaterial(.5),'moored-yachts-and-sailing-boats');group.userData={feature:'Port Hercule',yachts:count};
 const sailing=new T.Group();sailing.name='sailing-yacht';root.add(sailing);const s=new Builder();s.add(new T.SphereGeometry(1,10,6),C.hull,[0,0,0],[0,0,0],[2.2,.4,.6]);cyl(s,.04,.05,4.6,C.steel,.2,.2,0,5);const sail=new T.BufferGeometry().setFromPoints([new T.Vector3(.1,.6,0),new T.Vector3(.1,4.7,0),new T.Vector3(-1.9,.6,0),new T.Vector3(.1,.6,0),new T.Vector3(-1.9,.6,0),new T.Vector3(.1,4.7,0),new T.Vector3(.3,.6,0),new T.Vector3(1.9,.6,0),new T.Vector3(.3,3.9,0),new T.Vector3(.3,.6,0),new T.Vector3(.3,3.9,0),new T.Vector3(1.9,.6,0)]);sail.computeVertexNormals();s.add(sail,C.sail,[0,0,0]);
 s.mesh(sailing,vertexMaterial(.6,{side:T.DoubleSide}),'sailing-yacht-hull-and-sails');sailing.userData={animated:true};return sailing;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function kerb(b:Builder,from:number,to:number,y:number,z:number){for(let x=from,k=0;x<to-.01;x+=.6,k++)box(b,Math.min(.6,to-x),.07,.3,k%2?C.white:C.red,x+Math.min(.6,to-x)/2,y,z);}
function barrier(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.4)box(b,.08,.8,.08,C.steel,x,y,z);for(const dy of [.36,.66])box(b,to-from+.1,.18,.05,C.steel,(from+to)/2,y+dy,z+.06);}
function tyres(b:Builder,x:number,y:number,z:number,seed:number){for(let stack=0;stack<2;stack++)for(let k=0;k<3;k++)b.add(new T.TorusGeometry(.2,.09,6,10),k===1?tyreTints[(seed+stack)%3]:C.tyre,[x+stack*.56,y+.09+k*.18,z],[Math.PI/2,0,0]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'princes-palace-clock-tower-and-battlements','palace-square-cannons-and-sentry-boxes','white-cathedral','oceanographic-museum-on-the-cliff','casino-copper-roofs-and-fountain','pastel-apartment-towers','harbour-full-of-yachts','street-circuit-kerbs-barriers-and-tyres']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37700),detail=new T.Group();detail.name='monaco-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  quayAndRock(detail,finish,r,low);monteCarlo(detail,finish,r,low);palace(detail,flagMaterial(bandedFlagTexture([['#ce1126',1],['#ffffff',1]])),low);cathedralAndMuseum(detail,low);
  const range=new T.Group();range.name='maritime-alps';detail.add(range);const m=new Builder(.5);for(const [dx,w,h] of [[-60,70,36],[30,80,42],[130,76,38],[220,70,34]] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#a9ad9a':'#9da18e',[dx,-4,-112],[0,0,0],[w,h,16],.1);m.mesh(range,vertexMaterial(.98),'limestone-escarpment');
  const pines:Placement[]=[];for(let k=0;k<(low?6:14);k++)pines.push({x:monaco.rockFrom+3+r()*(monaco.rockTo-monaco.rockFrom-6),y:monaco.rockTop,z:-40-r()*10,scale:.7+r()*.4,rotation:r()*6});plantGrove(detail,'stone-pine',pines,{low,name:'rock-garden-pines'});
  const sailing=harbour(detail,finish,r,low),gulls=createFlock(detail,{name:'riviera-gulls',count:low?5:10,centre:[finish*.5,8,-10],radius:[32,3,5],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:167,glide:true});
  let reduced=context.reducedMotion;const sail=(time:number)=>{sailing.position.set(-20+((time*.5)%(finish+60)),-2.3+Math.sin(time*.7)*.04,-9.6);sailing.rotation.z=Math.sin(time*.5)*.04;};sail(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*127+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='terrace'){balustrade(b,from,to,y,rear,{rail:C.trim,base:C.palaceDark,baluster:C.white});pottedTree(b,from+.7,y,rear+.6,.75,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.orange},seed);if(w>5)cafeTable(b,to-1.3,y,rear+.8,{metal:C.iron,top:C.white,parasol:C.red,parasolAlt:C.white});if(w>8)bench(b,0,y,rear+.5);}
  else if(t==='ground'){barrier(b,from,to,y,rear);kerb(b,from,to,y,rear+.42);tyres(b,to-1.1,y,rear+.5,seed);lampPost(b,glow,from+.3,y,rear+.34);}
  else if(t==='bridge'){barrier(b,from,to,y,rear);}
  else if(t==='rock'||t==='cliff'){barrier(b,from,to,Math.min(surface(from),surface(to)),rear);tyres(b,(seed%2?.2:-.6),surface(0),rear+.5,seed);}
  finishProps(root,b,glow,'monaco-kerbs-barriers-and-tyres');
 },
};
