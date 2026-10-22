export type InputState={left:boolean;right:boolean;jump:boolean;power:boolean;down:boolean;defend?:boolean;jumpQueued?:boolean;powerQueued?:boolean;defendQueued?:boolean};
export type Action='left'|'right'|'jump'|'power'|'down'|'defend';
export function keyboardAction(code:string):Action|'pause'|undefined{
 const actions:Record<string,Action|'pause'>={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',ArrowDown:'down',KeyS:'down',KeyX:'power',KeyC:'defend',ShiftLeft:'defend',ShiftRight:'defend',Escape:'pause',KeyP:'pause'};
 return actions[code];
}
export function queueAction(input:InputState,action:Action){if(action==='jump')input.jumpQueued=true;else if(action==='power')input.powerQueued=true;else if(action==='defend')input.defendQueued=true;}
export function readInput(input:InputState,keys:Set<string>):Record<Action,boolean>{
 const actions=new Set([...keys].map(keyboardAction));
 return {left:input.left||actions.has('left'),right:input.right||actions.has('right'),jump:input.jump||!!input.jumpQueued||actions.has('jump'),down:input.down||actions.has('down'),power:input.power||!!input.powerQueued||actions.has('power'),defend:!!input.defend||!!input.defendQueued||actions.has('defend')};
}
/** Each finger owns its action; cancelling Jump never releases Move. */
export class PointerInputs{
 private pointers=new Map<number,Action>();
 constructor(private state:InputState){}
 press(id:number,action:Action){this.release(id);this.pointers.set(id,action);this.state[action]=true;queueAction(this.state,action);}
 release(id:number){const action=this.pointers.get(id);this.pointers.delete(id);if(action)this.state[action]=[...this.pointers.values()].includes(action);}
 clear(){this.pointers.clear();for(const action of ['left','right','jump','down','power','defend'] as Action[])this.state[action]=false;this.state.jumpQueued=this.state.powerQueued=this.state.defendQueued=false;}
}
