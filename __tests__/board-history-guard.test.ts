import { expect, it } from 'vitest';
import { createBoardHistoryTracker, boardHistoryBootstrapSource, type BoardHistoryDecision } from '../lib/board-history-guard';
import { runInNewContext } from 'node:vm';

function browserHistory() {
  const target = new EventTarget();
  const entries = [{state:{__NA:true,tree:'home'} as any,url:'/'}];
  let position = 0;
  const location = {href:'/'};
  const history = {
    get state() { return entries[position].state; },
    get length() { return entries.length; },
    pushState(state:any,_title:string,url?:string|URL|null) {
      entries.splice(position+1); entries.push({state,url:String(url||location.href)});
      position++; location.href=entries[position].url;
    },
    replaceState(state:any,_title:string,url?:string|URL|null) {
      entries[position]={state,url:String(url||location.href)};location.href=entries[position].url;
    },
    go(delta:number) {
      const next=position+delta;
      if(next<0||next>=entries.length)return;
      queueMicrotask(()=>{
        position=next;location.href=entries[position].url;
        target.dispatchEvent(Object.assign(new Event('popstate'),{state:history.state}));
      });
    },
  };
  const win={history,location,addEventListener:target.addEventListener.bind(target),removeEventListener:target.removeEventListener.bind(target)} as unknown as Window;
  return {win,history,location};
}
const settled=()=>new Promise(resolve=>setTimeout(resolve,0));

it('boots the same tracker before routing and shares it with later board code',()=>{
  const {win,history}=browserHistory();
  const source=boardHistoryBootstrapSource();
  runInNewContext(source,{window:win});
  const first=win.__socialuBoardHistoryTracker;
  expect(first).toBeDefined();
  runInNewContext(source,{window:win});
  expect(win.__socialuBoardHistoryTracker).toBe(first);
  history.pushState({__NA:true},'','/profile');
  expect(history.length).toBe(2);
  expect(history.state).toMatchObject({__NA:true,__socialuBoardHistoryIndex:1});
  first!.dispose();
});

it('preserves router metadata and normal Back/Forward without adding entries',async()=>{
  const {win,history,location}=browserHistory();
  const tracker=createBoardHistoryTracker(win);
  try{
    history.pushState({__NA:true,tree:'profile'},'','/profile');
    history.replaceState({__NA:true,tree:'updated-profile'},'');
    expect(history.length).toBe(2);
    expect(history.state).toMatchObject({__NA:true,tree:'updated-profile'});
    history.go(-1);await settled();expect(location.href).toBe('/');
    history.go(1);await settled();expect(location.href).toBe('/profile');
    expect(history.state).toMatchObject({__NA:true,tree:'updated-profile'});
  }finally{tracker.dispose();}
});

it('restores dirty Back/Forward before routing, keeps Stay repeatable, and replays Leave once',async()=>{
  const {win,history,location}=browserHistory();
  const tracker=createBoardHistoryTracker(win);
  let choice:BoardHistoryDecision|undefined;
  const routed:string[]=[];
  win.addEventListener('popstate',()=>routed.push(location.href));
  try{
    history.pushState({__NA:true,tree:'profile'},'','/profile');
    history.pushState({__NA:true,tree:'events'},'','/events');
    history.go(-1);await settled();routed.length=0;
    const unregister=tracker.register({shouldBlock:()=>true,onBlocked:value=>{choice=value;}});
    for(const delta of [-1,1,-1]){
      choice=undefined;history.go(delta);await settled();
      expect(location.href).toBe('/profile');expect(routed).toEqual([]);
      expect(choice).toBeDefined();choice!.stay();
      expect(history.length).toBe(3);
      expect(history.state).toMatchObject({__NA:true,tree:'profile'});
    }
    history.go(-1);await settled();choice!.leave();await settled();
    expect(location.href).toBe('/');expect(routed).toEqual(['/']);
    unregister();history.go(1);await settled();
    expect(location.href).toBe('/profile');expect(routed).toEqual(['/','/profile']);
    expect(history.length).toBe(3);
  }finally{tracker.dispose();}
});

it('allows navigation when clean and unregisters a board guard without affecting other routes',async()=>{
  const {win,history,location}=browserHistory();
  const tracker=createBoardHistoryTracker(win);
  let dirty=false,prompts=0;
  const unregister=tracker.register({shouldBlock:()=>dirty,onBlocked:()=>{prompts++;}});
  try{
    history.pushState({__NA:true},'','/profile');
    history.go(-1);await settled();expect(location.href).toBe('/');
    dirty=true;unregister();history.go(1);await settled();
    expect(location.href).toBe('/profile');expect(prompts).toBe(0);
  }finally{tracker.dispose();}
});
