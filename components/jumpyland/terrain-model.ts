import * as T from 'three';
import type {Platform} from './levels';
import {landingHeight} from './landing-geometry';

// A gridded cap preserves every sampled walking height along z=0. The eroded
// side rings meet that cap exactly, rather than hiding a cylindrical collider.
export function cliffGeometry(p:Platform,bottom:number,seed=1){
  const w=p.width/100,depth=p.depth||3.2,nx=Math.max(12,Math.ceil(w*10)),nz=8;
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
  const side:number[]=[],su:number[]=[],sc:number[]=[],si:number[]=[],rings=24;
  const grounded=bottom>=1599,low=-bottom/100;
  for(let row=0;row<=rings;row++)for(let k=0;k<=rim.length;k++){
    const index=rim[k%rim.length],x=top[index*3],y=top[index*3+1],z=top[index*3+2],t=row/rings;
    const strata=Math.sin(t*23+seed*.7+x*.4)*.07+Math.sin(t*63+seed+x*2)*.045;
    const scale=row===0?1:grounded?1+t*.22+strata:(1-Math.pow(t,1.8)*.86)*(1+strata);
    const fracture=(Math.sin(x*4.15+seed+Math.floor(row/3)*.8)*.15+Math.sin(x*9.7+row*1.3)*.045)*Math.sin(t*Math.PI);
    side.push(w/2+(x-w/2)*scale+fracture,y+(low-y)*t,z*scale+Math.sin(x*3.7+row*.9+seed)*.10*Math.sin(t*Math.PI));
    su.push(k/rim.length*(w+depth)/1.7+seed*.13,(y+(low-y)*t)/1.7+seed*.17);
    const light=.82+(1-t)*.16+Math.sin(k*.8+row*2.1+seed)*.025;sc.push(light,light*.99,light*.97);
  }
  const count=rim.length+1;
  for(let row=0;row<rings;row++)for(let k=0;k<rim.length;k++){const a=row*count+k,b=a+1,c=a+count,d=c+1;si.push(a,b,c,b,d,c);}
  // Close the underside so a jumping/flying camera cannot see through islands.
  for(let k=1;k<rim.length-1;k++)si.push(rings*count,rings*count+k,rings*count+k+1);
  const rock=new T.BufferGeometry();rock.setAttribute('position',new T.Float32BufferAttribute(side,3));rock.setAttribute('uv',new T.Float32BufferAttribute(su,2));rock.setAttribute('color',new T.Float32BufferAttribute(sc,3));rock.setIndex(si);rock.computeVertexNormals();
  return{cap,rock};
}

export function meadowFringe(p:Platform,seed=1){
  const root=new T.Group(),w=p.width/100,depth=p.depth||3.2;
  let value=seed>>>0;const r=()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};
  const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.025,0,0,.025,0,0,-.014,.12,.018,.014,.12,.018,0,.24,.06],3));blade.setIndex([0,2,1,1,2,3,2,4,3]);blade.computeVertexNormals();
  const count=Math.min(4200,Math.floor(w*650)),grass=new T.InstancedMesh(blade,new T.MeshStandardMaterial({color:'#a0bf64',side:T.DoubleSide,roughness:1}),count),dummy=new T.Object3D();grass.receiveShadow=true;
  for(let i=0;i<count;i++){const x=.035+r()*(w-.07),z=(r()>.5?1:-1)*depth*(.16+r()*.32),y=-landingHeight(p,p.x+x*100)/100;dummy.position.set(x,y-.015,z);dummy.rotation.set(0,r()*Math.PI*2,(r()-.5)*.6);dummy.scale.setScalar(.42+r()*.8);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);grass.setColorAt(i,new T.Color().setHSL(.19+r()*.055,.32+r()*.15,.3+r()*.2));}
  root.add(grass);
  // Small fern fans stay on the rear rim, leaving the walking lane readable.
  const leaf=new T.BufferGeometry(),v:number[]=[],ix:number[]=[];
  for(let j=0;j<7;j++){const y=j*.055,bend=y*y*.8,half=(1-j/7)*.16;for(const sign of [-1,1]){const at=v.length/3;v.push(0,y,bend,sign*half,y+.05,bend+.025,0,y+.04,bend);ix.push(at,at+1,at+2);}}
  leaf.setAttribute('position',new T.Float32BufferAttribute(v,3));leaf.setIndex(ix);leaf.computeVertexNormals();
  const ferns=new T.InstancedMesh(leaf,new T.MeshStandardMaterial({color:'#627c3c',side:T.DoubleSide,roughness:1}),Math.max(8,Math.floor(w*9)));
  for(let i=0;i<ferns.count;i++){const x=.1+r()*(w-.2);dummy.position.set(x,-landingHeight(p,p.x+x*100)/100,depth*(-.36-r()*.1));dummy.rotation.set(-.4+r()*.6,r()*Math.PI*2,0);dummy.scale.setScalar(.6+r()*.65);dummy.updateMatrix();ferns.setMatrixAt(i,dummy.matrix);}root.add(ferns);
  // Trailing moss and ivy follow the lip, confined to the visible front wall.
  const mossGeometry=leaf.clone(),moss=new T.InstancedMesh(mossGeometry,new T.MeshStandardMaterial({color:'#78903c',roughness:1,side:T.DoubleSide}),Math.max(16,Math.floor(w*55)));
  for(let i=0;i<moss.count;i++){
    const x=.1+r()*(w-.2),edge=1+.10*Math.sin(x*.63+seed-91)+.04*Math.sin(x*1.8+(seed-91)*.4);
    dummy.position.set(x,-landingHeight(p,p.x+x*100)/100-.035-r()*.17,depth*.5*edge);
    dummy.scale.set(.5+r()*.4,.8+r()*1.1,.6);dummy.rotation.set(0,r()*6,Math.PI);dummy.updateMatrix();moss.setMatrixAt(i,dummy.matrix);moss.setColorAt(i,new T.Color().setHSL(.2+r()*.04,.4,.32+r()*.1));
  }root.add(moss);
  // Tiny white meadow flowers cluster behind the route rather than in jump gaps.
  const blooms=new T.InstancedMesh(new T.SphereGeometry(.025,5,3),new T.MeshStandardMaterial({color:'#fff5cc',roughness:1}),Math.floor(w*8));
  for(let i=0;i<blooms.count;i++){const x=.1+r()*(w-.2),z=-depth*(.24+r()*.2);dummy.position.set(x,-landingHeight(p,p.x+x*100)/100+.13+r()*.08,z);dummy.scale.set(1.4,.45,1.4);dummy.updateMatrix();blooms.setMatrixAt(i,dummy.matrix);}root.add(blooms);
  return root;
}
