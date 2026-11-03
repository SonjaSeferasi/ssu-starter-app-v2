import * as T from 'three';
import {fbm,valueNoise,vertexMaterial} from '../../kit/common';
import type {LevelDefinition} from '../../../../lib/world-explorer/game-types';

/** The height of the main route at x, smoothed: used to hang cliffs and banks
 * just below the route so they never rise into it. */
export function routeHeight(level:LevelDefinition,smooth=3){
 const main=level.platforms.filter(p=>p.route!=='upper'&&!p.motion).sort((a,b)=>a.x-b.x);
 const at=(x:number)=>{let best=main[0];for(const p of main){if(x>=p.x-1&&x<=p.x+p.width+1)return p.y+(p.slope||0)*Math.max(0,Math.min(1,(x-p.x)/p.width));if(Math.abs(p.x+p.width/2-x)<Math.abs(best.x+best.width/2-x))best=p;}return best.y;};
 return(x:number)=>{let s=0;for(let k=-smooth;k<=smooth;k++)s+=at(x+k*1.2);return s/(smooth*2+1);};
}

export type CliffColors={rock:string;light:string;streak:string;moss:string;scree:string;stain?:string};
/** A cliff band along the course: a fluted, jointed face with bedding planes
 * that falls from `rim(x)` to `floor`, set back at `z`, with a talus apron.
 * Joints shade in proportion to their depth (never to black) and the face
 * does not receive shadows, so close views stay readable. */
export function createEscarpment(parent:T.Object3D,o:{name:string;x0:number;x1:number;rim:(x:number)=>number;floor:number;z:number|((x:number)=>number);colors:CliffColors;seed:number;low:boolean;flute?:number;recede?:number}){
 const zAt=typeof o.z==='number'?(()=>o.z as number):o.z;
 const cols=Math.max(24,Math.round((o.x1-o.x0)*(o.low?.7:1.5))),rows=o.low?14:30,positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const rock=new T.Color(o.colors.rock),light=new T.Color(o.colors.light),streakC=new T.Color(o.colors.streak),moss=new T.Color(o.colors.moss),scree=new T.Color(o.colors.scree),stain=new T.Color(o.colors.stain||'#2a2420'),flute=o.flute??1,recede=o.recede??6,seed=o.seed;
 for(let j=0;j<=rows;j++){const t=j/rows;for(let i=0;i<=cols;i++){
  const x=o.x0+(o.x1-o.x0)*i/cols,collapse=Math.max(0,fbm(x*.06,4,seed,3)-.62)*10,rim=o.rim(x)-collapse*(1-Math.min(1,t*4)),y=rim+(o.floor-rim)*Math.pow(t,.85);
  const buttress=Math.max(0,fbm(x*.11,2,seed+3,2)-.55)*4,joint=Math.max(0,Math.sin(x*.47+fbm(x*.15,0,seed+5,2)*4)-.9)*12,bed=Math.abs(Math.sin(y*.6+fbm(x*.1,0,seed+7,2)*2))<.1;
  const fl=(Math.sin(x*2.4+fbm(x*.2,t,seed+9,2)*4)*.3+fbm(x*.5,y*.15,seed+11,3)*1.4)*flute,talus=Math.pow(Math.max(0,(t-.78)/.22),1.5)*6;
  const z=zAt(x)-fl-Math.pow(t,1.6)*recede-valueNoise(x*.08,1,seed)*2.5+buttress*Math.min(1,t*6)-joint-(bed?.4:0)+talus;positions.push(x,y,z);
  const streak=fbm(x*.9,y*.08,seed+13,3),runoff=fbm(x*2.4,y*.02,seed+15,2),c=rock.clone().lerp(streak>.52?streakC:light,Math.max(0,streak-.36)*1.1);
  if(runoff>.64)c.lerp(stain,.25);c.multiplyScalar(1-Math.min(.2,joint*.1));if(bed||t<.03)c.lerp(moss,.5);if(talus>0)c.lerp(scree,Math.min(.7,talus*.12));if(t>.86)c.lerp(moss,(t-.86)*4);colors.push(c.r,c.g,c.b);
 }}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1;indices.push(a,c,b,b,c,c+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 const mesh=new T.Mesh(g,vertexMaterial(.95));mesh.name=o.name;mesh.receiveShadow=false;parent.add(mesh);return mesh;
}
