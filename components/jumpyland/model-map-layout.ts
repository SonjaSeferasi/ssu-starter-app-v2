import * as T from 'three';
import model from '../../public/jumpyland/models/landing-world-v1.json';
import {MAP_HEIGHT,MAP_WIDTH,type MapPoint} from './map-layout';

export function createModelCamera(){
 const camera=new T.PerspectiveCamera(model.camera.verticalFov,MAP_WIDTH/MAP_HEIGHT,.1,1500);
 camera.position.fromArray(model.camera.position);camera.lookAt(new T.Vector3().fromArray(model.camera.target));camera.updateMatrixWorld();return camera;
}
export const modelAnchors=model.anchors.map(anchor=>new T.Vector3().fromArray(anchor.position));
export function projectModelPoint(point:T.Vector3,camera:T.Camera):MapPoint{const p=point.clone().project(camera);return{x:(p.x+1)*MAP_WIDTH/2,y:(1-p.y)*MAP_HEIGHT/2};}
const home=createModelCamera();
export const modelWorldPoints=modelAnchors.map(point=>projectModelPoint(point,home));
export function modelTrails(){return modelAnchors.slice(1).map((end,i)=>{
 const start=modelAnchors[i],direction=end.clone().sub(start);
 return new T.CubicBezierCurve3(start,start.clone().addScaledVector(direction,.25).add(new T.Vector3(0,4,0)),start.clone().addScaledVector(direction,.72).add(new T.Vector3(0,4,0)),end).getPoints(48);
});}
export function projectedTrail(points:T.Vector3[],camera:T.Camera){return points.map((point,i)=>{const p=projectModelPoint(point,camera);return `${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;}).join(' ');}
