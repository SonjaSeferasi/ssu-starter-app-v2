import * as T from 'three';
import type {Platform} from './levels';
import {landingHeight} from './landing-geometry';
import {flowerBed,type Flower} from './toon-props';
import {fringeTexture,grassTexture,rng,styleFor,vineTexture} from './toon-textures';

// A gridded cap preserves every sampled walking height along z=0. The eroded
// side rings meet that cap exactly, rather than hiding a cylindrical collider.
// `edge` is the cap outline (a closed loop of x,y,z), used for the grass lip and vines.
// `moss` tints the stone just under the lip.
export function cliffGeometry(p:Platform,bottom:number,seed=1,moss?:[number,number,number],resolution=1){
  const w=p.width/100,depth=p.depth||3.2,nx=Math.max(resolution<1?6:12,Math.ceil(w*10*resolution)),nz=resolution<1?4:8;
  const top:number[]=[],uv:number[]=[],colors:number[]=[],indices:number[]=[];
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const v=j/nz*2-1,along=w*i/nx;
    const x=w/2+(along-w/2)*(1-.20*Math.pow(Math.abs(v),3));
    const edge=1+.10*Math.sin(x*.63+seed)+.04*Math.sin(x*1.8+seed*.4);
    const z=v*depth*.5*edge;
    const relief=Math.max(0,Math.abs(v)-.28)*(.025*Math.sin(x*9+v*4+seed));
    top.push(x,-landingHeight(p,p.x+x*100)/100+relief,z);
    uv.push(x/1.8,z/1.8);const light=.88+Math.sin(x*3+seed+v)*.08;colors.push(light,light,light);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute(top,3));cap.setAttribute('uv',new T.Float32BufferAttribute(uv,2));cap.setAttribute('color',new T.Float32BufferAttribute(colors,3));cap.setIndex(indices);cap.computeVertexNormals();
  const rim:number[]=[];
  for(let i=0;i<=nx;i++)rim.push(i);
  for(let j=1;j<=nz;j++)rim.push(j*(nx+1)+nx);
  for(let i=nx-1;i>=0;i--)rim.push(nz*(nx+1)+i);
  for(let j=nz-1;j>0;j--)rim.push(j*(nx+1));
  const side:number[]=[],su:number[]=[],sc:number[]=[],si:number[]=[],rings=Math.max(8,Math.round(24*resolution));
  const grounded=bottom>=1599,low=-bottom/100;
  for(let row=0;row<=rings;row++)for(let k=0;k<=rim.length;k++){
    const index=rim[k%rim.length],x=top[index*3],y=top[index*3+1],z=top[index*3+2],t=row/rings;
    const strata=Math.sin(t*23+seed*.7+x*.4)*.035+Math.sin(t*63+seed+x*2)*.026;
    const scale=row===0?1:grounded?1+t*.09+strata:(1-Math.pow(t,1.8)*.86)*(1+strata);
    const fracture=(Math.sin(x*3.15+seed+Math.floor(row/5)*.55)*.21+Math.sin(x*8.7+row*.7)*.065)*Math.sin(t*Math.PI);
    side.push(w/2+(x-w/2)*scale+fracture,y+(low-y)*t,z*scale+(Math.sin(x*3.7+row*.34+seed)*.15+Math.sin(x*8.1+seed)*.065)*Math.sin(t*Math.PI));
    su.push(k/rim.length*(w+depth)/1.7+seed*.13,(y+(low-y)*t)/1.7+seed*.17);
    const light=.82+(1-t)*.16+Math.sin(k*.8+row*2.1+seed)*.025,green=moss&&t<.09?(1-t/.09)*(.6+.4*Math.sin(k*1.7+seed)**2):0;
    sc.push(light*(1+(moss?moss[0]-1:0)*green),light*.99*(1+(moss?moss[1]-1:0)*green),light*.97*(1+(moss?moss[2]-1:0)*green));
  }
  const count=rim.length+1;
  for(let row=0;row<rings;row++)for(let k=0;k<rim.length;k++){const a=row*count+k,b=a+1,c=a+count,d=c+1;si.push(a,b,c,b,d,c);}
  // Close the underside so a jumping/flying camera cannot see through islands.
  for(let k=1;k<rim.length-1;k++)si.push(rings*count,rings*count+k,rings*count+k+1);
  const rock=new T.BufferGeometry();rock.setAttribute('position',new T.Float32BufferAttribute(side,3));rock.setAttribute('uv',new T.Float32BufferAttribute(su,2));rock.setAttribute('color',new T.Float32BufferAttribute(sc,3));rock.setIndex(si);rock.computeVertexNormals();
  const edge=rim.flatMap(i=>[top[i*3],top[i*3+1],top[i*3+2]]);
  return{cap,rock,edge};
}

/** Outward horizontal normals along a closed outline, plus the distance walked around it. */
function outline(edge:number[]){
  const n=edge.length/3,normals:number[]=[],along:number[]=[];let cx=0,cz=0,walked=0;
  for(let i=0;i<n;i++){cx+=edge[i*3];cz+=edge[i*3+2];}cx/=n;cz/=n;
  for(let i=0;i<n;i++){
    const prev=(i-1+n)%n,next=(i+1)%n;let nx=edge[next*3+2]-edge[prev*3+2],nz=edge[prev*3]-edge[next*3];const length=Math.hypot(nx,nz)||1;nx/=length;nz/=length;
    if((edge[i*3]-cx)*nx+(edge[i*3+2]-cz)*nz<0){nx=-nx;nz=-nz;}
    if(i)walked+=Math.hypot(edge[i*3]-edge[prev*3],edge[i*3+2]-edge[prev*3+2]);normals.push(nx,nz);along.push(walked);
  }
  return{n,normals,along};
}
/** Turf rolling over the cliff lip: a strip of hanging blades around the whole cap. */
export function grassLip(edge:number[],material:T.Material,seed=1){
  const {n,normals,along}=outline(edge),positions:number[]=[],uvs:number[]=[],index:number[]=[];
  const total=along[n-1]+Math.hypot(edge[0]-edge[(n-1)*3],edge[2]-edge[(n-1)*3+2]);
  for(let k=0;k<=n;k++){
    const i=k%n,x=edge[i*3],y=edge[i*3+1],z=edge[i*3+2],nx=normals[i*2],nz=normals[i*2+1],d=k===n?total:along[i];
    const drop=.2+.12*Math.sin(d*2.3+seed)+.07*Math.sin(d*5.9+seed*.3);
    positions.push(x-nx*.035,y+.03,z-nz*.035,x+nx*.075,y-drop,z+nz*.075);uvs.push(d/1.1,1,d/1.1,0);
    if(k<n){const a=k*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(index);geometry.computeVertexNormals();
  const lip=new T.Mesh(geometry,material);lip.receiveShadow=true;return lip;
}
/** Ivy strands hanging down the visible front wall. */
export function hangingVines(edge:number[],material:T.Material,seed:number,count:number,maxLength:number,offset:number){
  const {n,normals}=outline(edge),front:number[]=[];for(let i=0;i<n;i++)if(normals[i*2+1]>.6)front.push(i);
  const vines=new T.InstancedMesh(vinePlane,material,Math.max(1,count)),dummy=new T.Object3D(),r=rng(seed*13+5);
  for(let v=0;v<vines.count;v++){
    const i=front[Math.floor(r()*front.length)]??0,length=.35+r()*maxLength;
    dummy.position.set(edge[i*3]+(r()-.5)*.2,edge[i*3+1]-.08,edge[i*3+2]+offset);dummy.rotation.set(0,(r()-.5)*.5,(r()-.5)*.12);dummy.scale.set(.2+r()*.1,length,1);dummy.updateMatrix();vines.setMatrixAt(v,dummy.matrix);
  }
  vines.receiveShadow=true;return vines;
}
const vinePlane=new T.PlaneGeometry(1,1).translate(0,-.5,0);

export type FringeMaterials={grass:T.Material;fern:T.Material;lip:T.Material;vine:T.Material;turf:T.Material;petals:T.Material;centers:T.Material};
export function fringeMaterials(world:number):FringeMaterials{
  const lip=new T.MeshStandardMaterial({map:fringeTexture(world),alphaTest:.42,side:T.DoubleSide,roughness:1});
  return{
    grass:new T.MeshStandardMaterial({color:'#ffffff',side:T.DoubleSide,roughness:1}),fern:new T.MeshStandardMaterial({color:styleFor(world).lip[3],side:T.DoubleSide,roughness:1}),
    lip,vine:new T.MeshStandardMaterial({map:vineTexture(world),alphaTest:.45,side:T.DoubleSide,roughness:1}),
    turf:new T.MeshStandardMaterial({map:grassTexture(world),vertexColors:true,roughness:1}),
    petals:new T.MeshStandardMaterial({side:T.DoubleSide,roughness:.65}),centers:new T.MeshStandardMaterial({color:'#ffc928',roughness:.6,side:T.DoubleSide}),
  };
}
export type FringeDetail='lane'|'near'|'far';

const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.025,0,0,.025,0,0,-.014,.12,.018,.014,.12,.018,0,.24,.06],3));blade.setIndex([0,2,1,1,2,3,2,4,3]);blade.computeVertexNormals();
const fernLeaf=(()=>{
  const leaf=new T.BufferGeometry(),v:number[]=[],ix:number[]=[];
  for(let j=0;j<7;j++){const y=j*.055,bend=y*y*.8,half=(1-j/7)*.16;for(const sign of [-1,1]){const at=v.length/3;v.push(0,y,bend,sign*half,y+.05,bend+.025,0,y+.04,bend);ix.push(at,at+1,at+2);}}
  leaf.setAttribute('position',new T.Float32BufferAttribute(v,3));leaf.setIndex(ix);leaf.computeVertexNormals();return leaf;
})();
/** Short bright turf, ferns at the back and the world's flowers. Front blades stay
 * low so the hero's feet remain visible; `detail` thins distant islands. */
export function meadowFringe(p:Platform,seed:number,world:number,detail:FringeDetail,mats:FringeMaterials){
  const root=new T.Group(),w=p.width/100,depth=p.depth||3.2,style=styleFor(world),r=rng(seed>>>0),dummy=new T.Object3D(),scale=detail==='lane'?1:.45;
  const blades=style.blades.map(color=>new T.Color(color)),count=Math.floor(Math.min(3000,w*420)*scale);
  const grass=new T.InstancedMesh(blade,mats.grass,Math.max(1,count));grass.receiveShadow=true;
  for(let i=0;i<count;i++){
    const x=.035+r()*(w-.07),front=r()>.5,z=(front?1:-1)*depth*(.17+r()*.31),y=-landingHeight(p,p.x+x*100)/100;
    dummy.position.set(x,y-.015,z);dummy.rotation.set(0,r()*Math.PI*2,(r()-.5)*.6);dummy.scale.setScalar(front?.3+r()*.4:.45+r()*.6);dummy.updateMatrix();
    grass.setMatrixAt(i,dummy.matrix);grass.setColorAt(i,blades[Math.floor(r()*blades.length)].clone().multiplyScalar(.85+r()*.3));
  }
  root.add(grass);
  if(detail==='lane'){
    const ferns=new T.InstancedMesh(fernLeaf,mats.fern,Math.max(8,Math.floor(w*8)));
    for(let i=0;i<ferns.count;i++){const x=.1+r()*(w-.2);dummy.position.set(x,-landingHeight(p,p.x+x*100)/100,depth*(-.36-r()*.1));dummy.rotation.set(-.4+r()*.6,r()*Math.PI*2,0);dummy.scale.setScalar(.6+r()*.65);dummy.updateMatrix();ferns.setMatrixAt(i,dummy.matrix);}
    root.add(ferns);
  }
  // Flowers grow behind the route and along the front lip, never in the walking line.
  const flowers:Flower[]=[],density=world===1?15:world===2?6:3;
  for(let i=0;i<Math.floor(w*density*scale);i++){
    const x=.12+r()*(w-.24),front=r()<.35,z=front?depth*(.2+r()*.24):-depth*(.14+r()*.32),y=-landingHeight(p,p.x+x*100)/100;
    flowers.push({x,y,z,color:style.flowers[Math.floor(r()*style.flowers.length)],size:(front?.65:.8)+r()*.5,stem:front?.04+r()*.07:.08+r()*.16,yaw:(r()-.5)*.9});
  }
  flowerBed(root,flowers,{petals:mats.petals,center:mats.centers});
  return root;
}
