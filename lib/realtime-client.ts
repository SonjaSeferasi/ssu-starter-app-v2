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

export function subscribeToChat(onMessage: (message: ChatMessageEvent) => void, onStatus: (status: ChatLiveStatus) => void,
  onConversation?: (update: ChatConversationEvent) => void, onInvitation?: (invitation: ChatInvitationEvent) => void,
  onReaction?: (update: ChatReactionEvent) => void) {
  const supabase = browserClient();
  if (!supabase) { onStatus('unavailable'); return () => {}; }
  const token = storedAccessToken();
  const userId = token ? tokenUserId(token) : null;
  if (!token || !userId) { onStatus('signed-out'); return () => {}; }

  onStatus('connecting');
  let disposed = false;
  const channel = supabase.channel(`student:${userId}`, { config: { private: true } })
    .on('broadcast', { event: 'message_created' }, ({ payload }) => onMessage(payload as ChatMessageEvent))
    .on('broadcast', { event: 'conversation_updated' }, ({ payload }) => onConversation?.(payload as ChatConversationEvent))
    .on('broadcast', { event: 'group_invitation_created' }, ({ payload }) => onInvitation?.(payload as ChatInvitationEvent))
    .on('broadcast', { event: 'reaction_updated' }, ({ payload }) => onReaction?.(payload as ChatReactionEvent));

  void supabase.realtime.setAuth(token).then(() => {
    if (disposed) return;
    channel.subscribe((status) => {
      // Status is SUBSCRIBED, or CLOSED / CHANNEL_ERROR / TIMED_OUT when live updates stop.
      if (!disposed) onStatus(status === 'SUBSCRIBED' ? 'live' : 'offline');
    });
  });

  return () => { disposed = true; void supabase.removeChannel(channel); };
}
