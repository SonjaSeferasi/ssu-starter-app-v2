import { resolveDormAvatar, type PixelAvatarLook } from './dormspace-avatar';
import type { GameRoomData } from './game-room';
import type { Direction } from './dormspace-movement';
import type { Placement } from './dormspace-rules';

export const LIVE_UPDATE_MS = 150;
export const LIVE_SYNC_MS = 2000;
export const LIVE_LEASE_MS = 15000;
export const SPEECH_MS = 6000;
export const CHAT_LIMIT = 200;
export type LiveLocation = { kind: 'hall'; floor: number } | { kind: 'room'; owner: string };
export type LiveState = { x: number; y: number; facing: Direction; moving: boolean; sprinting: boolean; restItemId: string | null };
export type LivePlayer = { id: string; connectionId: string; username: string; space: string; state: LiveState; look: PixelAvatarLook; updatedAt: string };
export type LiveMessage = { id: string; playerId: string; username: string; space: string; text: string; sentAt: string };
export type LiveRoom = { version: number; placements: Placement[]; wallItemId: string | null; floorItemId: string | null };
export type LiveReply = { space: string; serverTime: string; self?: unknown; players?: unknown[]; messages?: LiveMessage[]; message?: LiveMessage; room?: LiveRoom | null };
export type LiveEvent = { space: string } & ({ type: 'player'; player: unknown } | { type: 'message'; message: LiveMessage }
  | { type: 'leave'; id: string; connectionId: string; updatedAt: string });
export const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const liveId = (value: unknown): value is string => typeof value === 'string' && /^[1-9]\d{0,17}$/.test(value);
export function validLiveState(value: unknown): value is LiveState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return Object.keys(s).every(key => ['x','y','facing','moving','sprinting','restItemId'].includes(key))
    && typeof s.x === 'number' && Number.isFinite(s.x) && s.x >= 0 && s.x <= 100
    && typeof s.y === 'number' && Number.isFinite(s.y) && s.y >= 0 && s.y <= 100
    && ['up','down','left','right'].includes(s.facing as string) && typeof s.moving === 'boolean' && typeof s.sprinting === 'boolean'
    && (s.restItemId === null || liveId(s.restItemId));
}
export function liveLocationKey(location: LiveLocation | null) {
  return !location ? '' : location.kind === 'hall' ? `hall:${location.floor}` : `room:${location.owner}`;
}
export function readLivePlayer(value: unknown): LivePlayer | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, any>;
  if (!liveId(p.id) || !uuid(p.connectionId) || typeof p.username !== 'string' || p.username.length > 100
    || typeof p.space !== 'string' || !validLiveState(p.state) || !Number.isFinite(Date.parse(p.updatedAt))) return null;
  const avatar = p.avatar as GameRoomData | undefined;
  if (!avatar || !Array.isArray(avatar.faces) || !Array.isArray(avatar.outfits)) return null;
  return { id: p.id, connectionId: p.connectionId, username: p.username, space: p.space, state: p.state,
    updatedAt: p.updatedAt, look: resolveDormAvatar(avatar).look };
}
export function validLiveMessage(value: unknown): value is LiveMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as LiveMessage;
  return liveId(m.id) && liveId(m.playerId) && typeof m.username === 'string' && m.username.length <= 100
    && typeof m.space === 'string' && typeof m.text === 'string' && m.text.length > 0 && [...m.text].length <= CHAT_LIMIT
    && Number.isFinite(Date.parse(m.sentAt));
}
