import { pixelLookKey } from './dormspace-avatar';
import { LIVE_LEASE_MS, SPEECH_MS, readLivePlayer, validLiveMessage, type LiveEvent, type LiveMessage, type LivePlayer, type LiveReply } from './dormspace-multiplayer';

type Listener = () => void;
export type LiveStatus = 'connecting' | 'online' | 'offline' | 'replaced' | 'unavailable';
export type LiveVisual = Pick<LivePlayer,'id'|'username'|'look'> & { facing: LivePlayer['state']['facing']; moving: boolean; sprinting: boolean; restItemId: string | null; speech: LiveMessage | null };
const EMPTY_IDS: readonly string[] = [];
const EMPTY_MESSAGES: readonly LiveMessage[] = [];
export const SERVER_LIVE_UI = { status: 'connecting' as LiveStatus, notice: '', selfId: '' };

// Coordinates live outside React. A position packet wakes the animation loop, not the room tree.
export class DormLiveStore {
  players = new Map<string,LivePlayer>();
  private visuals = new Map<string,LiveVisual>();
  private roster: readonly string[] = EMPTY_IDS;
  private messages: readonly LiveMessage[] = EMPTY_MESSAGES;
  private ui = SERVER_LIVE_UI;
  private rosterListeners = new Set<Listener>();
  private uiListeners = new Set<Listener>();
  private chatListeners = new Set<Listener>();
  private playerListeners = new Map<string,Set<Listener>>();
  private speech = new Map<string,LiveMessage>();
  private timers = new Map<string,ReturnType<typeof setTimeout>>();
  private clockOffset = 0;
  space = '';
  subscribeRoster = (fn: Listener) => { this.rosterListeners.add(fn); return () => { this.rosterListeners.delete(fn); }; };
  subscribeUI = (fn: Listener) => { this.uiListeners.add(fn); return () => { this.uiListeners.delete(fn); }; };
  subscribeChat = (fn: Listener) => { this.chatListeners.add(fn); return () => { this.chatListeners.delete(fn); }; };
  subscribePlayer = (id: string, fn: Listener) => {
    const set = this.playerListeners.get(id) ?? new Set<Listener>(); set.add(fn); this.playerListeners.set(id,set);
    return () => { set.delete(fn); if (!set.size) this.playerListeners.delete(id); };
  };
  getRoster = () => this.roster;
  getUI = () => this.ui;
  getMessages = () => this.messages;
  getVisual = (id: string) => this.visuals.get(id) ?? null;
  now = () => Date.now()+this.clockOffset;
  setStatus(status: LiveStatus,notice = '') {
    if (this.ui.status === status && this.ui.notice === notice) return;
    this.ui = {...this.ui,status,notice}; this.uiListeners.forEach(fn=>fn());
  }
  private changedRoster() { this.roster = [...this.players.keys()]; this.rosterListeners.forEach(fn=>fn()); }
  private refreshVisual(id: string) {
    const player = this.players.get(id), previous = this.visuals.get(id);
    if (!player) { this.visuals.delete(id); this.playerListeners.get(id)?.forEach(fn=>fn()); return; }
    const speech = this.speech.get(id) ?? null, moving = player.state.moving && this.now()-Date.parse(player.updatedAt)<4500;
    if (previous && previous.username===player.username && pixelLookKey(previous.look)===pixelLookKey(player.look)
      && previous.facing===player.state.facing && previous.moving===moving && previous.sprinting===player.state.sprinting
      && previous.restItemId===player.state.restItemId && previous.speech?.id===speech?.id) return;
    this.visuals.set(id,{ id,username:player.username,look:player.look,facing:player.state.facing,moving,
      sprinting:player.state.sprinting,restItemId:player.state.restItemId,speech });
    this.playerListeners.get(id)?.forEach(fn=>fn());
  }
  private upsert(player: LivePlayer) {
    if (player.space!==this.space) return;
    const previous=this.players.get(player.id);
    if (previous && Date.parse(previous.updatedAt)>Date.parse(player.updatedAt)) return;
    this.players.set(player.id,player); this.refreshVisual(player.id);
    this.playerListeners.get(player.id)?.forEach(fn=>fn());
    if (!previous || previous.connectionId!==player.connectionId || previous.state.restItemId!==player.state.restItemId
      || pixelLookKey(previous.look)!==pixelLookKey(player.look)) this.changedRoster();
  }
  private remove(id: string) {
    if (!this.players.delete(id)) return;
    clearTimeout(this.timers.get(id)); this.timers.delete(id); this.speech.delete(id);
    this.refreshVisual(id); this.changedRoster();
  }
  addMessage(message: LiveMessage) {
    if (!validLiveMessage(message) || message.space!==this.space || this.messages.some(m=>m.id===message.id)) return;
    this.messages=[...this.messages,message].sort((a,b)=>Date.parse(a.sentAt)-Date.parse(b.sentAt)||Number(BigInt(a.id)-BigInt(b.id))).slice(-40);
    this.chatListeners.forEach(fn=>fn());
    const remaining=Date.parse(message.sentAt)+SPEECH_MS-this.now();
    const previous=this.speech.get(message.playerId);
    if (remaining<=0 || previous && Date.parse(previous.sentAt)>Date.parse(message.sentAt)) return;
    this.speech.set(message.playerId,message); clearTimeout(this.timers.get(message.playerId));
    this.refreshVisual(message.playerId);
    this.timers.set(message.playerId,setTimeout(()=>{ this.speech.delete(message.playerId); this.refreshVisual(message.playerId); this.timers.delete(message.playerId); },Math.min(remaining,SPEECH_MS)));
  }
  reply(reply: LiveReply) {
    const self=readLivePlayer(reply.self);
    if (self) {
      this.space=reply.space;
      if (this.ui.selfId!==self.id) { this.ui={...this.ui,selfId:self.id}; this.uiListeners.forEach(fn=>fn()); }
      this.upsert(self);
    }
    if (reply.space!==this.space) return;
    const serverTime=Date.parse(reply.serverTime);
    if (Number.isFinite(serverTime)) this.clockOffset=serverTime-Date.now();
    if (Array.isArray(reply.players)) {
      const ids=new Set<string>();
      for (const raw of reply.players) { const player=readLivePlayer(raw); if (player) { ids.add(player.id); this.upsert(player); } }
      for (const [id,player] of this.players) if (!ids.has(id) && Date.parse(player.updatedAt)<=serverTime) this.remove(id);
    }
    if(reply.messages) {
      const ids=new Set(reply.messages.map(message=>message.id));
      const kept=this.messages.filter(message=>ids.has(message.id)||Date.parse(message.sentAt)>serverTime);
      if(kept.length!==this.messages.length){this.messages=kept;this.chatListeners.forEach(fn=>fn());
        for(const [id,message] of this.speech)if(!ids.has(message.id)&&Date.parse(message.sentAt)<=serverTime){this.speech.delete(id);clearTimeout(this.timers.get(id));this.timers.delete(id);this.refreshVisual(id);}}
    }
    for (const message of reply.messages??[]) this.addMessage(message);
    if (reply.message) this.addMessage(reply.message);
  }
  event(event: LiveEvent) {
    if (!event || event.space!==this.space) return;
    if (event.type==='player') { const player=readLivePlayer(event.player); if (player) this.upsert(player); }
    if (event.type==='message') this.addMessage(event.message);
    if (event.type==='leave') {
      const previous=this.players.get(event.id);
      if (previous?.connectionId===event.connectionId && Date.parse(previous.updatedAt)<=Date.parse(event.updatedAt)) this.remove(event.id);
    }
  }
  prune() {
    for (const [id,player] of this.players) {
      if (this.now()-Date.parse(player.updatedAt)>LIVE_LEASE_MS) this.remove(id);
      else this.refreshVisual(id);
    }
  }
  dispose() { for (const timer of this.timers.values()) clearTimeout(timer); this.timers.clear(); }
  clear() { this.dispose();this.speech.clear();for(const id of [...this.players.keys()])this.remove(id);this.messages=EMPTY_MESSAGES;this.chatListeners.forEach(fn=>fn()); }
}
export const emptyLiveRoster = () => EMPTY_IDS;
export const emptyLiveMessages = () => EMPTY_MESSAGES;
