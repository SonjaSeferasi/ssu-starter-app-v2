import {afterEach,expect,it,vi} from 'vitest';
import {DormLiveStore} from '../lib/dormspace-live-store';
import {SPEECH_MS} from '../lib/dormspace-multiplayer';
import {gameRoomSamples} from '../lib/game-room';
const stamp='2026-10-20T06:00:00.000Z';
const player=(id='1',x=20,at=stamp)=>({id,connectionId:`22222222-2222-4222-8222-${id.padStart(12,'0')}`,username:`dorm${id}`,space:'hall:1',state:{x,y:20,facing:'right',moving:true,sprinting:false,restItemId:null},updatedAt:at,avatar:gameRoomSamples});
const message=(id='1')=>({id,playerId:'2',username:'dorm2',space:'hall:1',text:'Hello everyone!',sentAt:stamp});
afterEach(()=>vi.useRealTimers());
it('updates position packets without replacing React visual or roster snapshots',()=>{
  vi.useFakeTimers();vi.setSystemTime(stamp);const store=new DormLiveStore();store.reply({space:'hall:1',serverTime:stamp,self:player(),players:[player(),player('2')]});
  const visual=store.getVisual('2'),roster=store.getRoster();const wake=vi.fn();store.subscribePlayer('2',wake);
  store.event({type:'player',space:'hall:1',player:player('2',25,'2026-10-20T06:00:00.150Z')});
  expect(store.players.get('2')!.state.x).toBe(25);expect(store.getVisual('2')).toBe(visual);expect(store.getRoster()).toBe(roster);expect(wake).toHaveBeenCalled();store.dispose();
});
it('deduplicates chat, expires speech, isolates rooms and rejects stale movement and leave packets',()=>{
  vi.useFakeTimers();vi.setSystemTime(stamp);const store=new DormLiveStore();store.reply({space:'hall:1',serverTime:stamp,self:player(),players:[player(),player('2')]});
  store.addMessage(message());store.addMessage(message());expect(store.getMessages()).toHaveLength(1);expect(store.getVisual('2')!.speech?.text).toBe('Hello everyone!');
  store.event({type:'message',space:'room:1',message:{...message('2'),space:'room:1'}});expect(store.getMessages()).toHaveLength(1);
  store.event({type:'player',space:'hall:1',player:player('2',30,'2026-10-20T06:00:01.000Z')});
  store.event({type:'player',space:'hall:1',player:player('2',10,stamp)});expect(store.players.get('2')!.state.x).toBe(30);
  store.event({type:'leave',space:'hall:1',id:'2',connectionId:'different-tab',updatedAt:'2026-10-20T06:00:02.000Z'});expect(store.players.has('2')).toBe(true);
  vi.advanceTimersByTime(SPEECH_MS+1);expect(store.getVisual('2')!.speech).toBeNull();expect(store.getMessages()).toHaveLength(1);store.dispose();
});
it('reconciles access-filtered snapshots, clearing blocked messages and expired players',()=>{
  vi.useFakeTimers();vi.setSystemTime(stamp);const store=new DormLiveStore();store.reply({space:'hall:1',serverTime:stamp,self:player(),players:[player(),player('2')]});store.addMessage(message());
  store.reply({space:'hall:1',serverTime:'2026-10-20T06:00:01.000Z',self:player(),players:[player()],messages:[]});
  expect(store.players.has('2')).toBe(false);expect(store.getMessages()).toHaveLength(0);vi.advanceTimersByTime(16000);store.prune();expect(store.getRoster()).toHaveLength(0);store.dispose();
});
