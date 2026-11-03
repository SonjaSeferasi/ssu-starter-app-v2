import * as T from 'three';
import {Builder,random,v3,vertexMaterial} from '../kit/common';
import type {EnvironmentContext,MountedEnvironment} from './types';

/** Buildings are actual modeled geometry, placed inside the gameplay camera's
 * far plane. The fictional harbor compresses Lower Manhattan's visual cues. */
export function addNewYorkBuildings(mounted:MountedEnvironment,context:EnvironmentContext){
 const root=new T.Group();root.name='new-york-waterfront-buildings';root.userData={decorative:true,reference:'Lower Manhattan from New York Harbor'};mounted.root.add(root);
 const r=random(351),stone=new Builder(.5),glass=new Builder(.4),trim=new Builder(),windows=new Builder();
 const box=(b:Builder,w:number,h:number,d:number,color:string,x:number,y:number,z:number)=>b.add(new T.BoxGeometry(w,h,d),color,[x,y,z]);
 const windowGrid=(x:number,y:number,z:number,w:number,h:number,columns:number,rows:number)=>{
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const px=x-w*.41+col*w*.82/(columns-1),py=y+1.2+row*(h-2.3)/Math.max(1,rows-1),lit=(row*7+col*11)%9===0;
   box(windows,w/columns*.56,(h-2.3)/Math.max(1,rows)*.57,.06,lit?'#e2d3a2':'#789ba9',px,py,z);
   box(trim,w/columns*.68,.075,.2,'#c4c0ad',px,py-.38,z+.07);
  }
 };
 // Two streets of varied brick warehouses, brownstones, cornices and fire
 // escapes establish a city at the scale of the player, behind the lane.
 for(let i=0;i<(context.low?8:13);i++){
  const x=-12+i*(context.finish+26)/(context.low?8:13),z=-25-(i%3)*8,w=6.5+(i%3)*1.5,h=8+(i%4)*2.3,base=-6,d=5;
  box(stone,w,h,d,['#a96f58','#bd8c72','#9c705b','#c8b89c'][i%4],x,base+h/2,z);
  for(const y of [base+.4,base+h-.35,base+h+.12])box(trim,w+.5,.24,d+.4,'#c6bca6',x,y,z);
  windowGrid(x,base,z+d/2+.045,w,h,4,Math.max(3,Math.floor(h/2)));
  box(trim,1.2,2.3,.13,'#454e4b',x-w*.25,base+1.15,z+d/2+.14);
  for(let floor=1;floor<Math.floor(h/2.5);floor++){
   const y=base+floor*2.5;box(trim,2.2,.12,.8,'#3d4e53',x+w*.24,y,z+d/2+.42);
   for(const dx of [-1,1])box(trim,.055,.65,.06,'#3d4e53',x+w*.24+dx,y+.38,z+d/2+.8);
   trim.strut(v3(x+w*.24-1,y,z+d/2+.7),v3(x+w*.24+1,y+2.5,z+d/2+.7),.028,'#3d4e53');
  }
  if(i%3===0){
   for(const side of [-1,1])trim.strut(v3(x+side*.8,base+h,z),v3(x+side*.6,base+h+1.3,z),.06,'#465657');
   stone.add(new T.CylinderGeometry(.8,.8,1.6,12),'#846b50',[x,base+h+2,z]);stone.add(new T.ConeGeometry(.95,.6,12),'#536668',[x,base+h+3.1,z]);
  }
 }
 const towers=new T.Group();towers.name='lower-manhattan-near-skyline';root.add(towers);
 for(let i=0;i<(context.low?12:21);i++){
  const x=-35+i*(context.finish+85)/(context.low?12:21),z=-67-(i%3)*12,w=5+(i%4),h=14+Math.pow(r(),.6)*24,base=-7,d=5.5;
  const material=i%3===0?stone:glass,color=i%3===0?'#b4ae9d':i%2?'#87a1ad':'#6d8d9f';
  box(material,w,h,d,color,x,base+h/2,z);
  for(let floor=1;floor<h;floor+=1.4)box(trim,w+.08,.065,.07,'#b3c4c4',x,base+floor,z+d/2+.06);
  for(let column=1;column<5;column++)box(trim,.055,h,.08,'#c0c9c7',x-w/2+w*column/5,base+h/2,z+d/2+.08);
  if(i%4===0){box(stone,w*.7,2,d*.7,'#b4b5aa',x,base+h+1,z);box(trim,.16,3,.16,'#8d9e9e',x,base+h+3.5,z);}
 }
 // One World Trade Center's tall, tapering glass silhouette and antenna.
 const one=new T.Group();one.name='one-world-trade-center-study';root.add(one);one.position.set(context.finish*.62,-7,-86);
 const tower=new Builder(.45),height=46;
 for(let i=0;i<12;i++){
  const width=7.8-i*.22,y=i*height/12;tower.add(new T.BoxGeometry(width,height/12+.03,width),'#8eafbe',[0,y+height/24,0],[0,i/12*Math.PI/4,0]);
  for(let k=0;k<3;k++)tower.add(new T.BoxGeometry(width+.04,.07,width+.04),'#c9d6d6',[0,y+k*height/36,0],[0,i/12*Math.PI/4,0]);
 }
 tower.add(new T.CylinderGeometry(.04,.13,9,7),'#b7c5c6',[0,height+4.5,0]);tower.mesh(one,vertexMaterial(.36,{metalness:.28}),'one-world-glass-and-spire');
 stone.mesh(root,vertexMaterial(.92),'new-york-brick-and-stone-facades');glass.mesh(towers,vertexMaterial(.38,{metalness:.25}),'layered-glass-towers');trim.mesh(root,vertexMaterial(.72),'cornices-fire-escapes-and-mullions');windows.mesh(root,vertexMaterial(.4,{metalness:.2}),'waterfront-window-grids');
 // The older skyline was outside the gameplay clipping range. Keep it as a
 // farther silhouette, then suppress the old floating masonry scenery.
 const old=mounted.root.getObjectByName('lower-manhattan-skyline');if(old)old.position.z=75;
 const oldTerraces=mounted.root.getObjectByName('usa-static-scenery');if(oldTerraces)oldTerraces.visible=false;
 const foreground=mounted.root.getObjectByName('usa-low-foreground');if(foreground)foreground.visible=false;
 const liberty=mounted.root.getObjectByName('statue-of-liberty');if(liberty)liberty.position.z=-62;
 return root;
}
