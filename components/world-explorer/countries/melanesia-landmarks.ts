import * as T from 'three';
import {Builder,vertexMaterial,v3,pixelTexture} from '../kit/common';
import {createRockMass,type LandmassPalette} from '../kit/landmass';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import type {MelanesiaCode} from '../../../lib/world-explorer/melanesia';

/** One dimensional landmark composition per country. Repeated plants and
 * houses form a landscape; the complete named destination is never cloned. */
export function melanesiaLandmarks(parent:T.Group,code:MelanesiaCode,finish:number,low:boolean,palette:LandmassPalette){
 const root=new T.Group();root.name=code.toLowerCase()+'-single-destination-study';root.userData.landmarkComposition=true;parent.add(root);
 const center=finish*.5,b=new Builder(.13);
 const box=(w:number,h:number,d:number,c:string,x:number,y:number,z:number)=>b.add(new T.BoxGeometry(w,h,d),c,[x,y,z]);
 const gable=(x:number,y:number,z:number,w:number,d:number,color:string)=>{const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,w*.2);shape.lineTo(w/2,0);shape.closePath();b.add(new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false}),color,[x,y,z-d/2]);};
 const features:Record<string,T.Group>={};
 const feature=(name:string)=>{const group=new T.Group();group.name=name;root.add(group);features[name]=group;return group;};
 const animated:{update:(t:number)=>void}[]=[];
 if(code==='FJI'){
  const town=feature('levuka-weatherboard-waterfront');
  for(let i=0;i<10;i++){
   const x=center-28+i*5.6,y=-4.5,z=-19-i%3*.8,h=3.4+(i%3===0?1.6:0),color=['#e3d9b9','#d8c8ac','#b8c6b3','#d6c4ab'][i%4];
   box(5.3,h,4.6,color,x,y+h/2,z);gable(x,y+h,z,5.8,5.2,i%3?'#b06b59':'#64857e');
   for(let k=0;k<14;k++)box(.018,h,.04,'#a6ad97',x-2.45+k*.37,y+h/2,z+2.34);
   box(5.5,.15,2.2,'#d8d0b2',x,y+2.8,z+3.1);
   for(const side of [-1,1]){b.add(new T.CylinderGeometry(.075,.095,2.8,8),'#ddd3b6',[x+side*2.3,y+1.4,z+3.9]);box(.8,1.1,.1,'#41615c',x+side*1.25,y+1.5,z+2.4);}
   box(.85,1.8,.1,'#655e4d',x,y+.9,z+2.42);
  }
  b.mesh(town,vertexMaterial(.92),'single-beach-street-row');
  const quay=feature('levuka-seawall-and-cargo-wharf'),q=new Builder(.1);
  q.add(new T.BoxGeometry(76,1.1,4),'#b3b5a1',[center,-4.8,-13]);
  for(let i=0;i<11;i++){const x=center-33+i*6;q.add(new T.CylinderGeometry(.18,.24,3,9),'#78664c',[x,-5.5,-10]);q.add(new T.BoxGeometry(4.8,.3,4),'#a48b62',[x,-3.9,-9]);}
  for(const x of [finish*.19,finish*.75]){q.add(new T.BoxGeometry(.25,10,.25),'#8f9d7a',[x,-.2,-11]);q.add(new T.BoxGeometry(5,.2,.25),'#a7b190',[x+2,4.7,-11]);q.add(new T.CylinderGeometry(.024,.024,6,5),'#676d57',[x+4,1.7,-11]);}
  q.mesh(quay,vertexMaterial(.9),'wharf-piles-and-service-cranes');
 }else if(code==='PNG'){
  const gardens=feature('kuk-cultivation-mounds-and-drains'),crop=new Builder(.1);
  for(let row=0;row<5;row++){
   const z=-12-row*4.3;
   createRockMass(gardens,{name:'cultivation-bed-'+row,x:center,y:-3.8,z,width:70,depth:2.8,height:2,palette:{...palette,top:row%2?'#75984d':'#607d43'},low,seed:981+row});
   const ditch=createWaterSurface(gardens,{name:'kuk-drainage-channel-'+row,x:center,y:-4.2,z:z-2.05,width:74,depth:1,shallow:'#729779',deep:'#3e6550',segments:low?8:16,flow:[.004,0]});animated.push(ditch);
   for(let col=0;col<(low?12:20);col++){
    const x=center-33+col*3.4;
    for(let leaf=0;leaf<3;leaf++){const angle=leaf*2.094+col*.2;crop.strut(v3(x,-3.8,z),v3(x+Math.sin(angle)*.35,-2.7,z+Math.cos(angle)*.35),.025,'#679059',5);crop.add(new T.SphereGeometry(1,10,6),leaf%2?'#5d984d':'#79a759',[x+Math.sin(angle)*.5,-2.65,z+Math.cos(angle)*.5],[.3,angle,.15],[.4,.055,.65]);}
   }
  }
  crop.mesh(gardens,vertexMaterial(.96),'taro-leaf-gardens');
  const bananas=feature('wahgi-valley-banana-grove'),plants=new Builder(.1);
  for(let i=0;i<12;i++){const x=center-40+i*7,z=-36-(i%3)*3;plants.add(new T.CylinderGeometry(.13,.28,3.5,8),'#839b59',[x,-2,z]);for(let leaf=0;leaf<6;leaf++){const a=leaf*1.047;plants.add(new T.SphereGeometry(1,12,7),'#51874f',[x+Math.cos(a),-.5,z+Math.sin(a)],[.2,-a,.2],[2.2,.09,.7]);}}
  plants.mesh(bananas,vertexMaterial(.95),'broad-banana-fronds');
 }else if(code==='SLB'){
  const cliffs=feature('tegano-raised-coral-cliffs');
  for(let i=0;i<9;i++){
   const x=center-45+i*11,y=-3.6+(i%3)*.4,z=-35-i%2*4;
   createRockMass(cliffs,{name:'porous-coral-buttress-'+i,x,y,z,width:15,depth:12,height:6+i%3,palette:{...palette,top:'#6e8e58',face:'#b5b59e',faceDark:'#768573',rough:.4,strata:.55},low,seed:1800+i});
  }
  const islets=feature('tegano-limestone-lake-islets');
  for(let i=0;i<5;i++)createRockMass(islets,{name:'lake-islet-'+i,x:finish*.18+i*finish*.16,y:-5.9,z:-16-i%2*6,width:5+i%3,depth:5,height:2.6,palette,low,seed:1900+i});
 }else{
  const island=feature('artok-eretoka-hat-island');island.userData.completeLandmark=true;
  createRockMass(island,{name:'artok-coral-brim',x:center,y:-5.3,z:-46,width:29,depth:18,height:2.5,palette:{...palette,top:'#aeb397',face:'#c0bda7'},low,seed:2001});
  const crown=new T.SphereGeometry(1,low?20:36,low?12:20,0,Math.PI*2,0,Math.PI/2),p=crown.getAttribute('position');
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x*(1+.06*Math.sin(z*9)),Math.min(.65,y*1.45)*(1+.025*Math.cos(x*7)),z);}crown.computeVertexNormals();
  const mound=new T.Mesh(crown,vertexMaterial(.98));mound.material.color.set('#527c5c');mound.position.set(center,-4.9,-46);mound.scale.set(8.5,7,6.4);mound.name='single-artok-forested-crown';island.add(mound);
  const cave=feature('lelepa-fels-cave-coast'),rock=new Builder(.15);
  for(const side of [-1,1])rock.add(new T.DodecahedronGeometry(1,1),'#8c9981',[finish*.82+side*3,-2.5,-24],[0,side*.3,0],[2.5,4.5,3]);
  rock.add(new T.TorusGeometry(3,1.3,8,20,Math.PI),'#a4ad91',[finish*.82,.8,-24]);rock.add(new T.CircleGeometry(2.4,20),'#3d584a',[finish*.82,-1.1,-25]);rock.mesh(cave,vertexMaterial(.98),'cave-mouth-study-no-rock-art-reproduction');
  const efate=feature('efate-coastal-terraces');createRockMass(efate,{name:'efate-mainland-shore',x:finish*.1,y:-4.5,z:-29,width:45,depth:20,height:7,palette,low,seed:2002});
 }
 // Small groves occur on land; they never clone the complete destination.
 if(code==='FJI'||code==='VUT')plantGrove(root,'coconut-palm',Array.from({length:low?12:22},(_,i)=>({x:-8+i*(finish+16)/(low?12:22),y:-4.4,z:-25-(i%4)*5,scale:.62+(i%3)*.09,rotation:i*.7})),{low,name:'local-coastal-palms'});
 if(code==='SLB')plantGrove(root,'kapok',Array.from({length:low?12:24},(_,i)=>({x:center-55+i*110/(low?12:24),y:-3.5,z:-42-i%3*4,scale:.5+(i%4)*.05,rotation:i*.8})),{low,name:'east-rennell-dense-forest'});
 return{root,animated};
}
