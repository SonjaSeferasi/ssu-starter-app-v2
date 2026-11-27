import { storedAccessToken } from './account/session';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ChatReaction } from './chat-reactions';

// SRS-201.1 (#298): browser side of Supabase Realtime. Uses only the public URL and anon key;
// the realtime.messages policy limits each student to their own session:<auth uid>:<session id> channel.
// SRS-201.9 (#799): emoji messages also carry kind 'emoji' (the emoji is in text); text messages have no kind.
// SRS-209.3 (#991): a reply carries the id of the message it answers; an ordinary message leaves it out.
// SRS-201.6 (#1024): a photo message carries no text -- the schema forbids it -- so it arrives with kind
// 'photo' and the id of its stored asset. photo_url is only ever set locally, by the send that just happened
// or by the history (SRS-201.7); a signed link cannot be broadcast, because only the server can make one.
// SRS-211.8 (#1283): 'read' says whether the recipient has read this message. The history sets it, and only
// on the student's own messages in a private conversation; a live event never carries it, because a message
// that has only just arrived has not been read yet and the sender is told by the next load.
// SRS-201.15 (#1409): 'gif_upload' joins the kinds a message can be. A GIF arrives like a photo -- with an
// asset id and no text -- and is shown from a signed link the server makes, so it travels through the same
// fields. It is kept a separate kind rather than folded into 'photo' because the two are stored under
// different upload contexts and a GIF is never re-encoded (SRS-201.14).
// SRS-201.11: 'gif_library' is the other half -- a GIF this app ships, sent by reference. It carries
// 'gif_reference' and no asset id, and unlike every other image in a conversation its reference IS the
// src: there is no signed link, so it can be broadcast in full and shown the moment it arrives.
export type ChatMessageEvent = { id: string; conversation_id: string; sender_id: string; text: string; sent_at: string; kind?: 'emoji' | 'photo' | 'gif_upload' | 'gif_library'; gif_reference?: string; reply_to_id?: string | null; asset_id?: string; photo_url?: string | null; deleted?: boolean; read?: boolean | null };
// SRS-202.6 (#844): sent to each current member when a group is named or renamed.
// #1106: sent to each current participant when the sender deletes their photo, so it leaves their screen
// instead of lingering on a signed link that keeps working for up to an hour.
export type ChatDeletedEvent = { id: string; conversation_id: string };
export type ChatConversationEvent = { conversation_id: string; name: string | null };
// SRS-212.9 (#823): sent to a student when they are invited to a group.
export type ChatInvitationEvent = { invitation_id: string; conversation_id: string };
// SRS-210.4 (#812): sent to each participant who can read a message when a reaction on it is added, changed or
// removed. Each student's copy marks their own reaction.
export type ChatReactionEvent = { conversation_id: string; message_id: string; reactions: ChatReaction[] };
export type ChatLiveStatus = 'connecting' | 'live' | 'offline' | 'signed-out' | 'unavailable';

let client: SupabaseClient | null = null;

function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client ??= createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Claims select a topic only; the database verifies the user AND login session.
function tokenChannelIdentity(token: string) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    return typeof claims.sub === 'string' && typeof claims.session_id === 'string'
      ? `${claims.sub}:${claims.session_id}` : null;
  } catch { return null; }
}

type ChatListener = {
  onMessage: (message: ChatMessageEvent) => void;
  onStatus: (status: ChatLiveStatus) => void;
  onConversation?: (update: ChatConversationEvent) => void;
  onInvitation?: (invitation: ChatInvitationEvent) => void;
  onReaction?: (update: ChatReactionEvent) => void;
  onDeleted?: (event: ChatDeletedEvent) => void;
};

// SRS-212.9: one shared channel per browser tab. The header bell, the Messages link and the chat pages all listen
// at the same time, and Supabase allows only one channel per topic, so each subscriber is added to the same channel.
const listeners = new Set<ChatListener>();
let shared: { userId: string; status: ChatLiveStatus; close: () => void } | null = null;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function each(call: (listener: ChatListener) => void) {
  for (const listener of [...listeners]) call(listener);
}

function openChannel(supabase: SupabaseClient, token: string, userId: string) {
  const state = { userId, status: 'connecting' as ChatLiveStatus, close: () => {} };
  shared = state;
  const channel = supabase.channel(`session:${userId}`, { config: { private: true } })
    .on('broadcast', { event: 'message_created' }, ({ payload }) => each((l) => l.onMessage(payload as ChatMessageEvent)))
    .on('broadcast', { event: 'conversation_updated' }, ({ payload }) => each((l) => l.onConversation?.(payload as ChatConversationEvent)))
    .on('broadcast', { event: 'group_invitation_created' }, ({ payload }) => each((l) => l.onInvitation?.(payload as ChatInvitationEvent)))
    .on('broadcast', { event: 'reaction_updated' }, ({ payload }) => each((l) => l.onReaction?.(payload as ChatReactionEvent)))
    .on('broadcast', { event: 'message_deleted' }, ({ payload }) => each((l) => l.onDeleted?.(payload as ChatDeletedEvent)));
  state.close = () => { void supabase.removeChannel(channel); };

  void supabase.realtime.setAuth(token).then(() => {
    if (shared !== state) return;
    channel.subscribe((status) => {
      // Status is SUBSCRIBED, or CLOSED / CHANNEL_ERROR / TIMED_OUT when live updates stop.
      if (shared !== state) return;
      state.status = status === 'SUBSCRIBED' ? 'live' : 'offline';
      each((l) => l.onStatus(state.status));
    });
  });
}

export function subscribeToChat(onMessage: (message: ChatMessageEvent) => void, onStatus: (status: ChatLiveStatus) => void,
  onConversation?: (update: ChatConversationEvent) => void, onInvitation?: (invitation: ChatInvitationEvent) => void,
  onReaction?: (update: ChatReactionEvent) => void, onDeleted?: (event: ChatDeletedEvent) => void) {
  const supabase = browserClient();
  if (!supabase) { onStatus('unavailable'); return () => {}; }
  const token = storedAccessToken();
  const userId = token ? tokenChannelIdentity(token) : null;
  if (!token || !userId) { onStatus('signed-out'); return () => {}; }

  clearTimeout(closeTimer);
  // A different account or login session replaces the previous channel.
  if (shared && shared.userId !== userId) { shared.close(); shared = null; }
  const listener: ChatListener = { onMessage, onStatus, onConversation, onInvitation, onReaction, onDeleted };
  listeners.add(listener);
  if (shared) onStatus(shared.status);
  else { onStatus('connecting'); openChannel(supabase, token, userId); }

  return () => {
    if (!listeners.delete(listener) || listeners.size) return;
    // The last listener left. Wait a moment, so moving between pages keeps the same channel open.
    closeTimer = setTimeout(() => {
      if (listeners.size || !shared) return;
      shared.close();
      shared = null;
    }, 1000);
  };
}
