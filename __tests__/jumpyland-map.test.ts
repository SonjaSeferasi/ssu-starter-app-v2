import {describe,expect,it} from 'vitest';
import {MAP_WIDTH,MAP_HEIGHT,mapView,constrainPan} from '../components/jumpyland/map-layout';
import {worlds} from '../components/jumpyland/worlds';

describe('World-map framing across screen sizes',()=>{
 it('shows the full landscape on a 16:9 desktop without blank edges',()=>{
  expect(mapView(1920,1080,{x:368,y:531})).toEqual({scale:1.2,x:0,y:0});
 });
 it('keeps each selected world visible on a portrait phone',()=>{
  for(const world of worlds){
   const focus={x:world.x*MAP_WIDTH/100,y:world.y*MAP_HEIGHT/100};
   const view=mapView(390,844,focus);
   const x=view.x+focus.x*view.scale;
   expect(x).toBeGreaterThan(60);expect(x).toBeLessThan(330);
   expect(view.x).toBeLessThanOrEqual(0);
   expect(view.x+MAP_WIDTH*view.scale).toBeGreaterThanOrEqual(390);
   expect(MAP_HEIGHT*view.scale).toBeGreaterThanOrEqual(844);
  }
 });
 it('limits dragging at all four landscape edges',()=>{
  expect(constrainPan({x:900,y:900},390,844,1)).toEqual({x:0,y:0});
  expect(constrainPan({x:-9000,y:-9000},390,844,1)).toEqual({x:-1210,y:-56});
 });
 it('reframes the current world after rotating the phone',()=>{
  const world=worlds[2],focus={x:world.x*16,y:world.y*9};
  const view=mapView(844,390,focus);
  expect(view.x+focus.x*view.scale).toBeGreaterThan(60);
  expect(view.x+focus.x*view.scale).toBeLessThan(844-60);
  expect(view.y+focus.y*view.scale).toBeGreaterThan(60);
  expect(view.y+focus.y*view.scale).toBeLessThan(390-60);
 });
});
