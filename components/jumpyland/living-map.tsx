'use client';
import {useEffect,useRef,useState} from 'react';
import type {MapSceneOptions} from './map-scene';
export function LivingMap({options}:{options:MapSceneOptions}){
 const ref=useRef<HTMLCanvasElement>(null),[unavailable,setUnavailable]=useState(false),[ready,setReady]=useState(false);
 const latest=useRef(options);latest.current=options;
 useEffect(()=>{
  let disposed=false,cleanup:(()=>void)|undefined;
  const canvas=ref.current;
  const fallback=()=>{if(!disposed){setUnavailable(true);latest.current.onError();}};
  const contextLost=(event:Event)=>{event.preventDefault();cleanup?.();cleanup=undefined;fallback();};
  canvas?.addEventListener('webglcontextlost',contextLost);
  void import('./map-scene').then(({mountMap})=>{if(!disposed&&canvas)cleanup=mountMap(canvas,{selected:()=>latest.current.selected(),cloud:()=>latest.current.cloud(),onProject:p=>latest.current.onProject(p),onReady:()=>{if(!disposed){setReady(true);latest.current.onReady();}},onError:fallback});}).catch(fallback);
  return()=>{disposed=true;canvas?.removeEventListener('webglcontextlost',contextLost);cleanup?.();};
 },[]);
 return <canvas ref={ref} aria-hidden="true" data-fallback={unavailable||undefined} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:ready?1:0,visibility:unavailable?'hidden':'visible'}}/>;
}
