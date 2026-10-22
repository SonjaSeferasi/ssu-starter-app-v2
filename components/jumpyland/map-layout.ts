export const MAP_WIDTH=1600;
export const MAP_HEIGHT=900;
export type MapPoint={x:number;y:number};

export function constrainPan(point:MapPoint,width:number,height:number,scale:number):MapPoint{
 return{x:Math.min(0,Math.max(width-MAP_WIDTH*scale,point.x)),y:Math.min(0,Math.max(height-MAP_HEIGHT*scale,point.y))};
}

export function mapView(width:number,height:number,focus:MapPoint){
 const scale=Math.max(width/MAP_WIDTH,height/MAP_HEIGHT);
 return{scale,...constrainPan({x:width/2-focus.x*scale,y:height/2-focus.y*scale},width,height,scale)};
}
