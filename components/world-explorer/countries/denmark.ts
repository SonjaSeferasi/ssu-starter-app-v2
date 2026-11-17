import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bench,finishProps,flagMaterial,lampPost,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Denmark: Jelling (SRS-632.17). On a broad meadow stand the two great
 * grass mounds of the Viking kings and, between them, the whitewashed
 * church with its stepped-gable tower and red roof. Before its door stand
 * the two runestones, the larger ringed with carved ribbons, and rows of
 * white posts mark the line of the royal palisade and the stone ship. Round
 * about lie Danish farmland: a thatched half-timbered farmhouse, a red barn,
 * a white windmill whose sails turn, strips of rapeseed and corn, beech
 * trees, and the red-and-white flag on tall white poles. The route carries
 * small rune stones, fences, poppies and daisies. Scenery only. */
const C={meadow:'#86b25e',meadowDark:'#6f9f50',mound:'#7fae58',white:'#f8f6ee',trim:'#fbf9f2',red:'#b23a2e',roof:'#a8533a',thatch:'#b79a5a',thatchDark:'#9a8048',timber:'#3a2c22',yellow:'#e8c860',barn:'#9c3a2c',
 granite:'#a8a29a',graniteDark:'#8a857e',rune:'#b23a2e',runeBlue:'#3f6fae',glass:'#2a3540',rape:'#ecd23a',corn:'#d9c27a',earth:'#8a6a4a',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',poppy:'#d6302a',daisy:'#fbfaf2',gold:'#d6a938'} as const;
// The meadow, the mounds and the farmland are built here on level ground.
const base=europeEnvironment('DNK',{landmark:false,flat:true,town:false});
export const jelling={meadowTop:-1.5,northMoundX:50,southMoundX:112,churchX:81,stonesX:[75,78.4],moundZ:-38} as const;

function meadow(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='jelling-meadow-and-fields';root.add(group);const s=new Builder(),top=jelling.meadowTop,from=-60,to=finish+100;
 box(s,to-from,top+5,36,C.meadow,(from+to)/2,-5,-34.5);for(let k=0;k<(low?12:24);k++)s.add(new T.SphereGeometry(1,8,5),C.meadowDark,[from+k*(to-from)/(low?12:24)+r()*4,-4.2,-16.3],[0,0,0],[5,2.9,1.4]);
 // Strips of rapeseed, corn and ploughed earth run away behind the monument.
 const strips=[C.rape,C.meadowDark,C.corn,C.earth,C.rape,C.meadow,C.corn] as const;for(let k=0;k<Math.ceil((to-from)/22);k++)box(s,21.4,.1+(k%3)*.1,40,strips[k%strips.length],from+11+k*22,top-.02,-72.5);box(s,to-from,top+5,40,C.meadowDark,(from+to)/2,-5.02,-72.5);
 for(let k=0;k<(low?8:18);k++){const bx=from+r()*(to-from),bz=-56-r()*30;s.add(new T.CylinderGeometry(.7,.7,1,10),C.corn,[bx,top+.75,bz],[Math.PI/2,0,r()*3]);}
 s.mesh(group,vertexMaterial(.97),'meadow-field-strips-and-bales');group.userData={feature:'Meadow and farmland'};
}

function mounds(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='royal-burial-mounds';root.add(group);const s=new Builder(),p=new Builder(),top=jelling.meadowTop,z=jelling.moundZ;
 for(const [x,radius,height] of [[jelling.northMoundX,15,8],[jelling.southMoundX,16,7.2]] as const){s.add(new T.SphereGeometry(1,low?14:24,low?8:12,0,Math.PI*2,0,Math.PI/2),C.mound,[x,top,z],[0,0,0],[radius,height,radius*.8]);s.add(new T.CylinderGeometry(radius*.34,radius*.5,.3,low?10:16),C.meadowDark,[x,top+height*.93,z],[0,0,0],[1,1,.8]);
  // A worn path winds up each mound.
  for(let k=0;k<(low?8:16);k++){const t=k/(low?8:16),a=Math.PI*(.2+t*.5),d=1-t*.75;p.add(new T.CylinderGeometry(.5,.5,.06,8),'#c9b98a',[x+Math.cos(a)*radius*d*.98,top+height*Math.sqrt(Math.max(0,1-d*d))+.05,z+Math.sin(a)*radius*.8*d*.98]);}}
 s.mesh(group,vertexMaterial(.97),'north-and-south-mounds');p.mesh(group,vertexMaterial(.95),'mound-paths');group.userData={landmark:'Jelling Mounds',mounds:2};
}

function church(root:T.Object3D,flag:T.Material){
 const group=new T.Group();group.name='jelling-church';root.add(group);const s=new Builder(),p=new Builder(),x=jelling.churchX,y=jelling.meadowTop,z=-30;
 // A Romanesque nave and chancel in whitewashed stone, with the west tower under its stepped gables.
 box(s,5.4,4.4,11,C.white,x,y,z-5.5);roof(p,5.7,2.6,11.3,C.roof,x,y+4.4,z-5.5,Math.PI/2);box(s,4.2,3.6,4,C.white,x,y,z-13);roof(p,4.5,2,4.3,C.roof,x,y+3.6,z-13,Math.PI/2);
 for(const dz of [-2,-5,-8])for(const side of [-1,1])p.add(new T.BoxGeometry(.06,1.5,.7),C.glass,[x+side*2.72,y+2.2,z+dz]);box(s,4.6,7.4,4.4,C.white,x,y,z+2.2);roof(p,4.4,2.2,4.9,C.roof,x,y+7.4,z+2.2);
 for(const side of [-1,1])for(let k=0;k<4;k++)box(s,.5,.55*(4-k)/1,4.4-k*1.05,C.white,x+side*2.3,y+7.4,z+2.2);for(let k=0;k<4;k++)for(const side of [-1,1])box(s,.52,.12,(4.4-k*1.05),C.roof,x+side*2.3,y+7.4+.55*(4-k),z+2.2);
 archedWindow(s,p,x,y,z+4.42,1.3,2.4,{frame:C.trim,glass:'#3a2a20'});for(const level of [3.4,5.4])archedWindow(s,p,x,y+level,z+4.42,.7,1.2,{frame:C.trim,glass:C.glass});
 // The churchyard wall, and the flag on its white pole.
 for(const [wx,wz,w,d] of [[x,z+8,16,.5],[x-8,z-3,.5,22],[x+8,z-3,.5,22]] as const)box(s,w,.9,d,C.white,wx,y,wz);cyl(p,.06,.09,7,C.white,x+6,y,z+6.6,6);p.add(new T.SphereGeometry(.12,6,5),C.gold,[x+6,y+7.06,z+6.6]);
 s.mesh(group,vertexMaterial(.95),'whitewashed-church-and-tower');p.mesh(group,vertexMaterial(.7),'church-red-roofs-and-windows');wavingFlag(group,flag,x+6.06,y+6.2,z+6.6,2.4,'denmark-flag',.76);group.userData={landmark:'Jelling Church'};
}

/** A rune stone: a granite boulder bound with carved ribbons and lines of runes. */
function runeStone(b:Builder,p:Builder,x:number,y:number,z:number,h:number,ribbons:boolean){
 b.add(new T.DodecahedronGeometry(1,0),C.granite,[x,y+h*.5,z],[.2,.5,.1],[h*.42,h*.56,h*.34]);
 if(ribbons){for(const [dy,color] of [[.34,C.rune],[.6,C.runeBlue]] as const)p.add(new T.TorusGeometry(h*.3,.05,5,12,Math.PI*1.2),color,[x,y+h*dy,z+h*.3],[0,0,dy*4]);for(let k=0;k<5;k++)p.add(new T.BoxGeometry(h*.06,h*.12,.04),C.rune,[x-h*.24+k*h*.12,y+h*.82,z+h*.24],[-.3,0,(k%2?.3:-.3)]);}
 else for(let row=0;row<3;row++)for(let k=0;k<4;k++)p.add(new T.BoxGeometry(h*.07,h*.14,.04),C.timber,[x-h*.2+k*h*.13,y+h*(.3+row*.2),z+h*.3],[-.1,0,(k+row)%2?.3:-.3]);
}

function monument(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='jelling-runestones';root.add(group);const b=new Builder(),p=new Builder(),white=new Builder(),y=jelling.meadowTop,[big,small]=jelling.stonesX;
 runeStone(b,p,big,y,-21.5,2.9,true);runeStone(b,p,small,y,-21.8,1.7,false);box(b,6.4,.12,3,'#d9d2bf',(big+small)/2,y,-21.6);
 // White posts trace the royal palisade, and low stones the outline of the ship.
 for(let x=-40;x<jelling.northMoundX+90;x+=low?4:2)cyl(white,.14,.14,1.3,C.white,x,y,-18.6-Math.abs(x-jelling.churchX)*.035,8);
 for(let k=0;k<(low?16:32);k++){const t=k/(low?16:32)*Math.PI*2,sx=jelling.northMoundX+Math.cos(t)*26,sz=jelling.moundZ+8+Math.sin(t)*6.5;if(sz>-34)b.add(new T.DodecahedronGeometry(.45,0),C.graniteDark,[sx,y+.3,sz],[t,t*2,0],[1,.8+((k*7)%5)*.12,1]);}
 b.mesh(group,vertexMaterial(.95),'granite-rune-stones-and-ship-setting');p.mesh(group,vertexMaterial(.7),'carved-ribbons-and-runes');white.mesh(group,vertexMaterial(.9),'palisade-marker-posts');group.userData={landmark:'Jelling Runestones',stones:2};
}

function farms(root:T.Object3D,finish:number,flag:T.Material){
 const group=new T.Group();group.name='danish-farms';root.add(group);const s=new Builder(),p=new Builder(),y=jelling.meadowTop;
 // A thatched farmhouse, its walls framed in dark timber.
 const fx=14,fz=-27;box(s,11,2.6,5,C.yellow,fx,y,fz-2.5);for(let k=0;k<=8;k++)box(p,.14,2.6,.06,C.timber,fx-5.4+k*1.35,y,fz+.03);for(const level of [0,1.3,2.5])box(p,11,.12,.06,C.timber,fx,y+level,fz+.03);for(const dx of [-3.4,-.7,3.4])box(p,.8,.9,.07,C.glass,fx+dx,y+1,fz+.05);box(p,.9,1.9,.07,'#2f5f4a',fx+1.3,y,fz+.05);
 roof(p,11.8,3,5.9,C.thatch,fx,y+2.6,fz-2.5);box(p,12,.3,6.1,C.thatchDark,fx,y+2.5,fz-2.5);box(p,.8,1.2,.8,C.white,fx-3,y+4.6,fz-2.5);
 // A red barn, and a white windmill whose cap turns its sails to the wind.
 const bx=Math.max(finish-2,jelling.southMoundX+23),bz=-27;box(s,9,3.4,6,C.barn,bx,y,bz-3);roof(p,9.4,2.6,6.4,C.timber,bx,y+3.4,bz-3);box(p,2.2,2.6,.08,C.white,bx,y,bz+.04);for(const dx of [-3,3])box(p,.9,.9,.08,C.white,bx+dx,y+1.6,bz+.04);
 for(const px of [fx+8,bx-6.4])cyl(p,.06,.09,6.4,C.white,px,y,fz+1.4,6);
 s.mesh(group,vertexMaterial(.93),'farmhouse-and-barn-walls');p.mesh(group,vertexMaterial(.75),'thatch-timber-frames-and-doors');for(const px of [fx+8,bx-6.4])wavingFlag(group,flag,px+.06,y+5.6,fz+1.4,2.2,px<50?'farm-flag':'barn-flag',.76);group.userData={feature:'Thatched farmhouse and red barn'};
}

function windmill(root:T.Object3D,finish:number){
 const group=new T.Group();group.name='white-windmill';root.add(group);const b=new Builder(),x=finish+16,y=jelling.meadowTop,z=-34;
 cyl(b,2.6,3.4,2.4,C.granite,x,y,z,8);cyl(b,1.5,2.5,5.6,C.white,x,y+2.4,z,8);cyl(b,2.9,2.9,.16,C.wood,x,y+2.4,z,8);b.add(new T.SphereGeometry(1.7,10,8,0,Math.PI*2,0,Math.PI/2),C.timber,[x,y+8,z],[0,0,0],[1,.9,1]);for(const level of [3.4,5.4])box(b,.5,.7,.06,C.glass,x,y+level,z+2.2-(level-2.4)*.18);
 b.mesh(group,vertexMaterial(.9),'windmill-tower-and-cap');
 const sails=new T.Group();sails.name='windmill-sails';sails.position.set(x,y+8.4,z+1.9);group.add(sails);const sb=new Builder();for(let k=0;k<4;k++){const a=k*Math.PI/2,c=Math.cos(a),sn=Math.sin(a);sb.strut(new T.Vector3(0,0,0),new T.Vector3(c*4.6,sn*4.6,0),.07,C.timber,5,1);sb.add(new T.BoxGeometry(3.4,.9,.05),C.white,[c*2.7-sn*.5,sn*2.7+c*.5,0],[0,0,a]);}sb.add(new T.SphereGeometry(.3,8,6),C.timber,[0,0,0]);sb.mesh(sails,vertexMaterial(.85),'sail-frames');group.userData={feature:'Windmill',animated:true};return sails;
}

/** Red with a white Nordic cross. */
const danishFlag=()=>pixelTexture(64,(u,v)=>(u>.3&&u<.43)||(v>.42&&v<.58)?[255,255,255,255]:[200,16,46,255],true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
function fence(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.4)box(b,.12,.9,.12,C.wood,x,y,z);for(const level of [.35,.7])box(b,to-from,.08,.06,C.wood,(from+to)/2,y+level,z);}
function wildflowers(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<8;k++){const dx=((seed*7+k*13)%10)/10*1.2-.6,dz=((seed*3+k*7)%10)/10*.5-.25;box(b,.025,.3,.025,C.leaf,x+dx,y,z+dz);b.add(new T.SphereGeometry(.07,6,4),k%3?C.poppy:C.daisy,[x+dx,y+.33,z+dz],[0,0,0],[1,.5,1]);}}
function smallStone(b:Builder,p:Builder,x:number,y:number,z:number,h:number){b.add(new T.DodecahedronGeometry(1,0),C.granite,[x,y+h*.5,z],[.2,.5,.1],[h*.4,h*.56,h*.3]);for(let k=0;k<4;k++)p.add(new T.BoxGeometry(h*.07,h*.14,.03),C.rune,[x-h*.18+k*h*.12,y+h*.6,z+h*.27],[-.1,0,k%2?.3:-.3]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'two-royal-grass-mounds','runestones-with-carved-ribbons','whitewashed-church-stepped-gable-tower','palisade-posts-and-stone-ship','thatched-farmhouse-and-red-barn','white-windmill-turning-sails','dannebrog-on-white-poles']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(45208),detail=new T.Group();detail.name='jelling-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);const flag=flagMaterial(danishFlag());
  meadow(detail,finish,r,low);mounds(detail,low);church(detail,flag);monument(detail,low);farms(detail,finish,flag);const sails=windmill(detail,finish);
  const beeches:Placement[]=[];for(let k=0;k<(low?14:32);k++){const x=-50+r()*(finish+150);if(Math.abs(x-jelling.northMoundX)>17&&Math.abs(x-jelling.southMoundX)>18&&Math.abs(x-jelling.churchX)>10)beeches.push({x,y:jelling.meadowTop,z:-28-r()*22,scale:.9+r()*.5,rotation:r()*6});}plantGrove(detail,'plane',beeches,{low,name:'beech-trees'});
  const larks=createFlock(detail,{name:'jelling-larks',count:low?6:12,centre:[jelling.churchX,9,-30],radius:[40,3,8],speed:.3,size:.45,color:'#7a6a58',wing:'#5c4f42',seed:101,glide:false});
  let reduced=context.reducedMotion;larks.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sails.rotation.z=time*.5;larks.update(time);},setReducedMotion(value){reduced=value;larks.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*61+Math.round(definition.x),from=-w/2+.3,to=w/2-.3;
  if(t==='ground'){fence(b,from,to,Math.min(surface(from),surface(to)),rear);smallStone(b,b,from+1,surface(from+1),-1.7,1.1+seed%3*.2);wildflowers(b,to-1.2,surface(to-1.2),-1.4,seed);if(w>5)bench(b,0,surface(0),-1.9);if(w>8){lampPost(b,glow,to-.3,surface(to-.3),-1.3);wildflowers(b,from+2.6,surface(from+2.6),-1.5,seed+5);cyl(b,.12,.12,1.2,C.white,to-2.6,surface(to-2.6),-2.2,8);}}
  else if(t==='rock'){wildflowers(b,0,surface(0),rear+.3,seed);if(w>3.2)b.add(new T.DodecahedronGeometry(.4,0),C.graniteDark,[from+.4,surface(from+.4)+.25,rear+.2],[seed,seed*2,0]);}
  finishProps(root,b,glow,'jelling-fences-stones-and-flowers');
 },
};
