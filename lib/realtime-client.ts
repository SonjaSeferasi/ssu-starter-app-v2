import { storedAccessToken } from './account/session';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ChatReaction } from './chat-reactions';

// SRS-201.1 (#298): browser side of Supabase Realtime. Uses only the public URL and anon key;
// the realtime.messages policy limits each student to their own student:<auth uid> channel.
// SRS-201.9 (#799): emoji messages also carry kind 'emoji' (the emoji is in text); text messages have no kind.
export type ChatMessageEvent = { id: string; conversation_id: string; sender_id: string; text: string; sent_at: string; kind?: 'emoji' };
// SRS-202.6 (#844): sent to each current member when a group is named or renamed.
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

// The channel topic must equal the token's user ID; the server-side policy rejects any other topic.
function tokenUserId(token: string) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch { return null; }
}

type ChatListener = {
  onMessage: (message: ChatMessageEvent) => void;
  onStatus: (status: ChatLiveStatus) => void;
  onConversation?: (update: ChatConversationEvent) => void;
  onInvitation?: (invitation: ChatInvitationEvent) => void;
  onReaction?: (update: ChatReactionEvent) => void;
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
  const channel = supabase.channel(`student:${userId}`, { config: { private: true } })
    .on('broadcast', { event: 'message_created' }, ({ payload }) => each((l) => l.onMessage(payload as ChatMessageEvent)))
    .on('broadcast', { event: 'conversation_updated' }, ({ payload }) => each((l) => l.onConversation?.(payload as ChatConversationEvent)))
    .on('broadcast', { event: 'group_invitation_created' }, ({ payload }) => each((l) => l.onInvitation?.(payload as ChatInvitationEvent)))
    .on('broadcast', { event: 'reaction_updated' }, ({ payload }) => each((l) => l.onReaction?.(payload as ChatReactionEvent)));
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
  onReaction?: (update: ChatReactionEvent) => void) {
  const supabase = browserClient();
  if (!supabase) { onStatus('unavailable'); return () => {}; }
  const token = storedAccessToken();
  const userId = token ? tokenUserId(token) : null;
  if (!token || !userId) { onStatus('signed-out'); return () => {}; }

  clearTimeout(closeTimer);
  // A different student signed in on this tab: their own channel replaces the old one.
  if (shared && shared.userId !== userId) { shared.close(); shared = null; }
  const listener: ChatListener = { onMessage, onStatus, onConversation, onInvitation, onReaction };
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
