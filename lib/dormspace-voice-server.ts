import { createHmac, timingSafeEqual } from 'node:crypto';
import { AccessToken, RoomConfiguration, RoomServiceClient, TrackSource, TwirpError } from 'livekit-server-sdk';
import { AccountError, accountClient } from './socialu-account';
import { uuid } from './dormspace-multiplayer';

const CHANNEL = /^socialu-voice-(hall|room)-[a-f0-9]{32}$/;
const TICKET_LIFETIME_MS = 2 * 60 * 60 * 1000;
const CAPACITY = 24;
const unavailable = () => new AccountError('Voice chat is temporarily unavailable. Nearby text chat is still available.', 503);
const ended = () => new AccountError('You are no longer eligible for that voice channel. Join again from your current location.', 403);

type Config = { url: string; apiKey: string; apiSecret: string; sweepSecret: string };
type Owner = { authId: string; sessionId: string };
type Ticket = Owner & { channel: string; identity: string; expires: number };
type Scope = { channel: string; username: string };
type Members = Record<string, string[]>;

export function voiceConfig(): Config {
  const { DORMSPACE_VOICE_URL: endpoint, DORMSPACE_VOICE_API_KEY: apiKey, DORMSPACE_VOICE_API_SECRET: apiSecret,
    DORMSPACE_VOICE_SWEEP_SECRET: sweepSecret } = process.env;
  if (!endpoint || !apiKey || !apiSecret || !sweepSecret || sweepSecret.length < 32) throw unavailable();
  try {
    const url = new URL(endpoint);
    const cloud = url.protocol === 'wss:' && url.hostname.endsWith('.livekit.cloud');
    const local = process.env.NODE_ENV !== 'production' && url.protocol === 'ws:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (!(cloud || local) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw unavailable();
    return { url: url.origin, apiKey, apiSecret, sweepSecret };
  } catch {
    throw unavailable();
  }
}

function roomService(config: Config) {
  const httpUrl = config.url.replace(/^ws/, 'http');
  return new RoomServiceClient(httpUrl, config.apiKey, config.apiSecret, { requestTimeout: 4, failover: false });
}

function signature(config: Config, value: string) {
  return createHmac('sha256', config.apiSecret).update('dormspace-voice-control:').update(value).digest('base64url');
}

function equal(first: string, second: string) {
  const a = Buffer.from(first), b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}

function connectionOf(identity: string) {
  const [connection, attempt, extra] = identity.split('.');
  return !extra && uuid(connection) && uuid(attempt) ? connection : null;
}

function encode(config: Config, ticket: Ticket) {
  const value = Buffer.from(JSON.stringify(ticket)).toString('base64url');
  return `${value}.${signature(config, value)}`;
}

function decode(config: Config, owner: Owner, ticket: unknown): Ticket {
  if (typeof ticket !== 'string' || ticket.length > 1024) throw ended();
  const [value, mac, extra] = ticket.split('.');
  if (!value || !mac || extra !== undefined || !equal(mac, signature(config, value))) throw ended();
  const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Ticket;
  if (decoded.authId !== owner.authId || decoded.sessionId !== owner.sessionId ||
      !CHANNEL.test(decoded.channel) || !connectionOf(decoded.identity) || decoded.expires <= Date.now()) throw ended();
  return decoded;
}

async function lease(owner: Owner, identity: string, action: 'join' | 'renew' | 'leave'): Promise<Scope> {
  const [connection, attempt] = identity.split('.');
  const { data, error } = await accountClient().rpc('socialu_dorm_voice_lease', {
    p_auth_id: owner.authId, p_session: owner.sessionId, p_connection: connection, p_attempt: attempt, p_action: action,
  });
  if (error) throw unavailable();
  if (action === 'leave') return data;
  if (data?.error === 'blocked') throw new AccountError('This voice channel is unavailable to you right now.', 403);
  if (data?.error === 'active') throw new AccountError('Your previous voice connection is closing. Try again shortly.', 409);
  if (data?.error === 'full') throw new AccountError('This voice channel is full. Try again when someone leaves.', 409);
  if (!data || typeof data.channel !== 'string' || !CHANNEL.test(data.channel) || typeof data.username !== 'string') throw ended();
  return data;
}

async function getMembers(channel: string, connections: string[]): Promise<Members> {
  if (!connections.length) return {};
  const { data, error } = await accountClient().rpc('socialu_dorm_voice_members', {
    p_channel: channel, p_connections: [...new Set(connections)],
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) throw unavailable();
  return data;
}

async function list(service: RoomServiceClient, channel: string) {
  try { return await service.listParticipants(channel); }
  catch (error) {
    if (error instanceof TwirpError && error.status === 404) return [];
    throw error;
  }
}

async function revoke(service: RoomServiceClient, channel: string, identity: string) {
  try {
    await service.removeParticipant(channel, identity, { revokeTokenTs: BigInt(Math.ceil(Date.now() / 1000) + 1) });
  } catch (error) {
    if (!(error instanceof TwirpError && error.status === 404)) throw error;
  }
}

async function reconcile(service: RoomServiceClient, channel: string) {
  const participants = await list(service, channel);
  const ids = participants.flatMap(({ identity }) => connectionOf(identity) ?? []);
  const members = await getMembers(channel, ids);
  const allowed = new Set<string>();
  // If a new block separates people already in voice, keep the earlier admission.
  participants.sort((a, b) => Number(a.joinedAtMs - b.joinedAtMs) || a.identity.localeCompare(b.identity));
  for (const { identity } of participants) {
    const blocks = members[identity];
    if (blocks && !blocks.some(blocked => allowed.has(blocked))) allowed.add(identity);
  }
  await Promise.all(participants.filter(({ identity }) => !allowed.has(identity))
    .map(({ identity }) => revoke(service, channel, identity)));
  return allowed;
}

export async function joinVoice(config: Config, owner: Owner, connectionId: string, attempt: string) {
  const identity = `${connectionId}.${attempt}`;
  const scope = await lease(owner, identity, 'join');
  try {
    await reconcile(roomService(config), scope.channel);
    const token = new AccessToken(config.apiKey, config.apiSecret, { identity, name: scope.username, ttl: '20s' });
    token.addGrant({
      room: scope.channel, roomJoin: true, canSubscribe: true, canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE], canPublishData: false, canUpdateOwnMetadata: false,
    });
    token.roomConfig = new RoomConfiguration({ maxParticipants: CAPACITY, emptyTimeout: 30 });
    return {
      url: config.url, token: await token.toJwt(),
      ticket: encode(config, { ...owner, channel: scope.channel, identity, expires: Date.now() + TICKET_LIFETIME_MS }),
    };
  } catch (error) {
    await lease(owner, identity, 'leave').catch(() => {});
    throw error;
  }
}

export async function checkVoice(config: Config, owner: Owner, raw: unknown) {
  const ticket = decode(config, owner, raw);
  const service = roomService(config);
  try {
    const scope = await lease(owner, ticket.identity, 'renew');
    if (scope.channel !== ticket.channel || !(await reconcile(service, ticket.channel)).has(ticket.identity)) throw ended();
  } catch (error) {
    if (error instanceof AccountError && error.status === 403) await revoke(service, ticket.channel, ticket.identity);
    throw error;
  }
}

export async function leaveVoice(config: Config, owner: Owner, raw: unknown) {
  const ticket = decode(config, owner, raw);
  await Promise.all([lease(owner, ticket.identity, 'leave'), revoke(roomService(config), ticket.channel, ticket.identity)]);
}

export async function sweepVoice(config: Config, bearer: string | null) {
  if (!bearer || !equal(bearer, `Bearer ${config.sweepSecret}`)) throw new AccountError('Unauthorized.', 401);
  const service = roomService(config);
  const rooms = (await service.listRooms()).filter(room => CHANNEL.test(room.name));
  // Bound the number of simultaneous provider and database calls during scheduled cleanup.
  for (let index = 0; index < rooms.length; index += 6) {
    await Promise.all(rooms.slice(index, index + 6).map(room => reconcile(service, room.name)));
  }
}
