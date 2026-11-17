import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bench,drumDome,finishProps,flagMaterial,lampPost,pottedTree,pyramid,texturedStone,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Montenegro: Kotor at the head of its bay (SRS-632.26). Behind a palm-lined
 * quay the town wall runs between the round tower at the river mouth and
 * the Sea Gate with its clock tower. Stone houses under red roofs fill the
 * old town, around the cathedral's two towers and the dark domes of
 * St Nicholas. Above it all the wall zigzags up the bare limestone hill,
 * past the little church of Our Lady, to the fortress and the flag at the
 * top. A white cruise ship lies in the bay among small boats, and the cats
 * of Kotor sit along the route. Scenery only: nothing collides. */
const C={stone:'#f0eadc',stoneDark:'#dcd5c4',wall:'#efe6d0',red:'#b9603f',redDark:'#96492f',white:'#f8f5ec',trim:'#fbf8ef',glass:'#2a3540',shade:'#5a4e42',dome:'#3a3f48',gold:'#d6a938',hill:'#cfc9ba',scrub:'#6f8a52',
 quay:'#e6dfcf',iron:'#22262a',wood:'#7a5c40',rope:'#c9b88a',leaf:'#4a7d3f',palmTrunk:'#8a6f52',palm:'#3f8a4a',hull:'#f8f6f0',funnel:'#1f3a6a',ginger:'#d98a3a',black:'#26262a',cream:'#efe6d2',pink:'#e85a8a'} as const;
const walls=['#f0eadc','#e6dcc4','#f6f0e0','#e9d9b8'] as const;
const base=europeEnvironment('MNE',{landmark:false,flat:true,town:false,backdrop:false});
export const kotor={quayTop:-1,wallZ:-21,seaGateX:58,cathedralX:92,nicholasX:40,hillX:96,hillZ:-58,hillTop:14} as const;
const limestone=()=>texturedStone('paris-stone','#fbf6ea',1.1,.95);
/** Height of the fortress hill above the quay at a point in front of its crest. */
const hillY=(x:number,z:number)=>{const dx=(x-kotor.hillX)/42,dz=(z-kotor.hillZ)/18,inside=1-dx*dx-dz*dz;return inside<=0?-3:-3+(kotor.hillTop+3)*Math.sqrt(inside);};

function palm(b:Builder,x:number,y:number,z:number,h:number,seed:number){b.strut(new T.Vector3(x,y,z),new T.Vector3(x+.14*Math.sin(seed),y+h,z),.15,C.palmTrunk,7,.75);for(let k=0;k<8;k++){const a=k/8*Math.PI*2+seed,tip=new T.Vector3(x+Math.cos(a)*1.3,y+h-.45,z+Math.sin(a)*1),mid=new T.Vector3(x+Math.cos(a)*.7,y+h+.32,z+Math.sin(a)*.54);b.strut(new T.Vector3(x,y+h,z),mid,.08,C.palm,4,.8);b.strut(mid,tip,.07,C.palm,4,.3);}}

function quayAndWall(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='kotor-quay-and-sea-wall';root.add(group);const s=new Builder(.5),p=new Builder(),top=kotor.quayTop,z=kotor.wallZ,from=-56,to=finish+100;
 box(p,to-from,top+4.4,70,C.quay,(from+to)/2,-4.4,-51.5);for(let x=from+3,k=0;x<to;x+=low?10:5,k++){palm(p,x,top,-18.4,3+r()*.8,k);if(k%2)cyl(p,.14,.18,.4,C.iron,x+2.4,top,-17.1,8);}
 // The sea wall with its battlements, the round tower at the river mouth, and the Sea Gate under its clock tower.
 const a=18,b=finish+30;box(s,b-a,4,2,C.wall,(a+b)/2,top,z-1);for(let x=a;x<b;x+=low?2.4:1.2)box(s,.7,.6,.5,C.wall,x+.35,top+4,z-.25);cyl(s,4.4,4.8,4.8,C.wall,a,top,z-1,low?12:18);for(let k=0;k<(low?8:14);k++){const t=k/(low?8:14)*Math.PI*2;box(s,.9,.6,.5,C.wall,a+Math.sin(t)*4.3,top+4.8,z-1+Math.cos(t)*4.3,t);}
 const gx=kotor.seaGateX;box(s,6,5.2,2.4,C.stone,gx,top,z-.8);archedWindow(s,p,gx,top,z+.42,2.4,3.4,{frame:C.stoneDark,glass:C.shade});box(p,2,.6,.08,C.gold,gx,top+4.1,z+.44);box(s,2.6,8.4,2.6,C.stone,gx+5,top,z-2.2);p.add(new T.CylinderGeometry(.8,.8,.08,16),C.white,[gx+5,top+6.4,z-.88],[Math.PI/2,0,0]);box(p,.06,.6,.03,C.iron,gx+5,top+6.4,z-.82);pyramid(p,.1,1.5,1.3,C.red,gx+5,top+8.4,z-2.2);
 s.mesh(group,limestone(),'sea-wall-round-tower-and-gate');p.mesh(group,vertexMaterial(.85),'quay-paving-palms-and-clock');group.userData={landmark:'Kotor sea wall and Sea Gate'};
}

function oldTown(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='kotor-old-town';root.add(group);const s=new Builder(),m=new Builder(.5),p=new Builder(),y=kotor.quayTop;let houses=0;
 for(const z of [-27,-33])for(let x=22;x<finish+28;){const w=3.4+r()*2,h=4.6+r()*1.8+(z<-30?1.4:0),mid=x+w/2;if(Math.abs(mid-kotor.cathedralX)>7&&Math.abs(mid-kotor.nicholasX)>5.4){townhouse(s,p,mid,y,z,w-.1,h,5,{wall:walls[Math.floor(r()*walls.length)],trim:C.trim,glass:'#3f6f5f',roof:r()>.4?C.red:C.redDark},{rows:Math.round(h/2.2),roof:'hip',door:false,low});houses++;}x+=w;}
 // The cathedral: two square stone towers joined by an arch over the porch.
 const cx=kotor.cathedralX,cz=-28;box(m,6,5.6,12,C.stone,cx,y,cz-6);roof(p,6.3,2.2,12.3,C.red,cx,y+5.6,cz-6,Math.PI/2);for(const side of [-1,1]){box(m,2.6,9.4,2.6,C.stone,cx+side*3.6,y,cz+.2);for(const level of [3,5.6,7.6])archedWindow(m,p,cx+side*3.6,y+level,cz+1.52,.9,1.4,{frame:C.stoneDark,glass:C.shade});box(m,2.9,.26,2.9,C.stoneDark,cx+side*3.6,y+9.4,cz+.2);pyramid(p,.08,1.5,1.5,C.stoneDark,cx+side*3.6,y+9.66,cz+.2);p.add(new T.SphereGeometry(.1,6,5),C.gold,[cx+side*3.6,y+11.3,cz+.2]);}
 m.add(new T.TorusGeometry(2.3,.4,5,low?8:12,Math.PI),C.stone,[cx,y+5.2,cz+.6],[0,0,0],[1,1,2.4]);p.add(new T.CylinderGeometry(1,1,.08,16),C.shade,[cx,y+4,cz+.04],[Math.PI/2,0,0]);
 // St Nicholas: a pale church with two bell towers and dark domes.
 const nx=kotor.nicholasX,nz=-30;box(s,6,5,9,C.cream,nx,y,nz-4.5);const oni={wall:C.cream,trim:C.trim,dome:C.dome,finial:C.gold,glass:C.glass};drumDome(s,p,nx,y+5,nz-5,1.8,1.6,oni,{low,cross:true,sides:low?8:12});for(const side of [-1,1]){box(s,1.8,7,1.8,C.cream,nx+side*2.6,y,nz+.2);archedWindow(s,p,nx+side*2.6,y+4.8,nz+1.12,.7,1.4,{frame:C.trim,glass:C.shade});drumDome(s,p,nx+side*2.6,y+7,nz+.2,.8,.5,oni,{low,cross:true,sides:8});}
 s.mesh(group,vertexMaterial(.94),'stone-houses-and-st-nicholas');m.mesh(group,limestone(),'cathedral-twin-towers');p.mesh(group,vertexMaterial(.7),'red-roofs-domes-and-shutters');group.userData={landmark:'Cathedral of St Tryphon and the old town',houses};
}

function fortressHill(root:T.Object3D,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='st-johns-fortress-hill';root.add(group);const h=new Builder(.5),s=new Builder(),p=new Builder(),x=kotor.hillX,z=kotor.hillZ,top=kotor.hillTop;
 h.add(new T.SphereGeometry(1,low?16:28,low?10:16),C.hill,[x,-3,z],[0,0,0],[42,top+3,18],.06);for(let k=0;k<(low?20:50);k++){const px=x-36+r()*72,pz=z+4+r()*12;h.add(new T.SphereGeometry(1,6,4),C.scrub,[px,hillY(px,pz)-.2,pz],[0,0,0],[1.4+r()*1.6,.5,1+r()]);}
 h.mesh(group,texturedStone('paris-stone','#f6f2e8',.4,.98),'bare-limestone-hill');
 // The wall climbs in zigzags, a small tower at each turn, past the church to the fortress.
 const path:[number,number][]=[];for(let k=0;k<=9;k++){const t=k/9,px=x-30+t*30+(k%2?5:-5)*(1-t);path.push([px,z+16.4*(1-t*.86)]);}
 for(let k=0;k<path.length-1;k++){const [ax,az]=path[k],[bx,bz]=path[k+1],a=new T.Vector3(ax,hillY(ax,az)+.5,az),b=new T.Vector3(bx,hillY(bx,bz)+.5,bz);s.strut(a,b,.42,C.wall,6,1);cyl(s,.8,.9,1.6,C.wall,bx,hillY(bx,bz),bz,8);for(let j=0;j<6;j++)box(s,.3,.3,.3,C.wall,bx+Math.cos(j)*.74,hillY(bx,bz)+1.6,bz+Math.sin(j)*.74);}
 const [cx,cz]=path[4],cy=hillY(cx,cz);box(s,2.2,1.8,3,C.white,cx+2.4,cy,cz-.6);roof(p,2.5,.9,3.3,C.red,cx+2.4,cy+1.8,cz-.6,Math.PI/2);box(s,.8,3,.8,C.white,cx+2.4,cy,cz+1.2);pyramid(p,.05,.5,.7,C.red,cx+2.4,cy+3,cz+1.2);
 box(s,9,2,4,C.wall,x,top-.4,z+2);for(let k=0;k<(low?5:9);k++)box(s,.6,.5,.5,C.wall,x-4+k*(low?2:1),top+1.6,z+3.8);box(s,3,3,3,C.wall,x+3.4,top-.4,z+1.6);cyl(p,.05,.07,2.6,C.iron,x+3.4,top+2.6,z+1.6,5);
 s.mesh(group,vertexMaterial(.94),'zigzag-wall-church-and-fortress');p.mesh(group,vertexMaterial(.7),'hill-church-roof-and-mast');wavingFlag(group,flag,x+3.46,top+4.6,z+1.6,2,'montenegro-flag',.5);group.userData={landmark:"Fortress of St John and the town walls"};
}

/** Red, bordered in gold, with the golden eagle at the centre. */
const montenegrinFlag=()=>pixelTexture(64,(u,v)=>u<.05||u>.95||v<.1||v>.9?[212,175,58,255]:Math.hypot((u-.5)*1.6,v-.5)<.2||(Math.abs(v-.56)<.07&&Math.abs(u-.5)<.2)?[212,175,58,255]:[196,30,45,255],true,false);

function bayTraffic(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='bay-of-kotor-boats';root.add(group);const b=new Builder();for(let x=-30;x<finish+60;x+=low?16:8){const bx=x+r()*4;b.add(new T.SphereGeometry(1,8,5),[C.white,'#3f78a8','#c8402f'][Math.floor(r()*3)],[bx,-2.36,-15.6],[0,0,0],[1.3,.32,.5]);cyl(b,.03,.04,1.6,C.iron,bx,-2.2,-15.6,4);}
 b.mesh(group,vertexMaterial(.7),'moored-boats');
 const ship=new T.Group();ship.name='cruise-ship';root.add(ship);const c=new Builder();box(c,22,1.6,4,C.hull,0,0,0);c.add(new T.ConeGeometry(2,4,4),C.hull,[12.6,.8,0],[0,Math.PI/4,-Math.PI/2],[1,1,.8]);for(let k=0;k<3;k++){box(c,19-k*2.4,.8,3.6-k*.3,C.hull,-1-k*.6,1.6+k*.8,0);box(c,18.6-k*2.4,.3,3.64-k*.3,C.glass,-1-k*.6,1.9+k*.8,0);}box(c,22.2,.3,4.04,C.funnel,0,.5,0);cyl(c,.7,.9,1.6,C.funnel,-5,4,0,10);box(c,2.6,1,2.4,C.hull,5,4,0);c.mesh(ship,vertexMaterial(.5),'cruise-ship-hull-and-decks');ship.userData={animated:true};return ship;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** One of Kotor's cats, sitting upright with its tail curled round. */
function cat(b:Builder,x:number,y:number,z:number,seed:number){const coat=[C.ginger,C.black,C.cream][seed%3];b.add(new T.SphereGeometry(.17,8,6),coat,[x,y+.2,z],[0,0,0],[1,1.25,.9]);b.add(new T.SphereGeometry(.12,8,6),coat,[x,y+.5,z+.03]);for(const dx of [-.06,.06])b.add(new T.ConeGeometry(.045,.1,4),coat,[x+dx,y+.63,z+.03]);b.add(new T.TorusGeometry(.16,.03,4,8,Math.PI),coat,[x+.1,y+.06,z+.06],[Math.PI/2,0,0]);}
function bollardRope(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.2){cyl(b,.1,.13,.6,C.iron,x,y,z,8);b.add(new T.SphereGeometry(.13,6,5),C.iron,[x,y+.64,z]);if(x+1.2<=to+.01)b.strut(new T.Vector3(x,y+.5,z),new T.Vector3(x+1.2,y+.5,z),.03,C.rope,4,1);}}
function merlonWall(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.8,.4,C.wall,(from+to)/2,y,z);for(let x=from;x<to;x+=.9)box(b,.5,.4,.4,C.wall,x+.25,y+.8,z);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'sea-wall-round-tower-and-sea-gate','cathedral-twin-towers','st-nicholas-dark-domes','zigzag-wall-up-the-hill','fortress-and-flag-at-the-top','cruise-ship-in-the-bay','palm-lined-quay','cats-of-kotor']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(38200),detail=new T.Group();detail.name='kotor-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  fortressHill(detail,flagMaterial(montenegrinFlag()),r,low);quayAndWall(detail,finish,r,low);oldTown(detail,finish,r,low);
  const range=new T.Group();range.name='lovcen-mountains';detail.add(range);const m=new Builder(.5);for(const [dx,w,h] of [[-60,70,30],[30,80,36],[130,76,32],[220,70,28]] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#a3a796':'#979c8a',[dx,-4,-112],[0,0,0],[w,h,16],.1);m.mesh(range,vertexMaterial(.98),'grey-limestone-range');
  const cypresses:Placement[]=[];for(let k=0;k<(low?8:18);k++){const x=24+r()*(finish-10),z=-37-r()*4;cypresses.push({x,y:Math.max(kotor.quayTop,hillY(x,z)),z,scale:.7+r()*.4,rotation:r()*6});}plantGrove(detail,'cypress',cypresses,{low,name:'kotor-cypresses'});
  const ship=bayTraffic(detail,finish,r,low),gulls=createFlock(detail,{name:'bay-gulls',count:low?5:10,centre:[finish*.5,8,-10],radius:[32,3,5],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:149,glide:true});
  let reduced=context.reducedMotion;const drift=(time:number)=>{ship.position.set(-18+Math.sin(time*.03)*6,-2.4+Math.sin(time*.5)*.03,-9.5);};drift(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;drift(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*103+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='bridge'){bollardRope(b,from,to,y,rear);lampPost(b,glow,from+.4,surface(from+.4),rear+.3);cat(b,to-.6,surface(to-.6),rear+.3,seed);if(w>5)bench(b,0,y,rear+.25);}
  else if(t==='cliff'){merlonWall(b,from,to,Math.min(surface(from),surface(to)),rear);cat(b,from+.9,surface(from+.9)+.8,rear,seed);if(w>4.4)pottedTree(b,to-.7,surface(to-.7),rear+.5,.7,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.pink},seed);}
  else if(t==='terrace'){balustrade(b,from,to,y,rear,{rail:C.trim,base:C.stoneDark,baluster:C.white});pottedTree(b,from+.7,y,-1.7,.75,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.pink},seed);cat(b,to-1,y,-1.5,seed+1);if(w>6)bench(b,.4,y,-1.9);}
  else if(t==='rock'){cat(b,(seed%2?.3:-.3),surface(0),rear+.3,seed);}
  else if(t==='ground'){lampPost(b,glow,from+.3,y,-1.3);cat(b,0,y,-1.5,seed);bench(b,to-1.2,y,-1.9);}
  finishProps(root,b,glow,'kotor-quays-walls-and-cats');
 },
};
