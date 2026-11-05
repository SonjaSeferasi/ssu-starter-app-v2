'use client';

import Link from 'next/link';
import { accessToken, storedAccessToken } from '../../../lib/account/session';

import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { SessionNotice } from '../../../components/navigation/section-page';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import { subscribeToChat, type ChatConversationEvent, type ChatDeletedEvent, type ChatLiveStatus, type ChatMessageEvent, type ChatReactionEvent } from '../../../lib/realtime-client';
import { sortReactions, type ChatReaction } from '../../../lib/chat-reactions';
import { CHAT_ACTIVITY_EVENT, ConversationListPanel } from '../conversation-list';
import { EmojiPicker } from '../emoji-picker';
import { GroupNameForm } from '../group-name';
import { GroupMemberList } from '../group-members';
import { InvitePicker } from '../invite-picker';
import { ReactionChips, ReactionPicker } from '../message-reactions';
import { SnipePanel } from '../../../components/snipe/snipe-panel';
import { canSelectForReply, findReplyTarget, keepReplyTarget, replyIndication, replyPreview, replyQuote, toggleReplyTarget, type ReplyTargets } from '../../../lib/chat-reply';
import { PHOTO_ACCEPT, PHOTO_SEND_FAILED, choosePhoto, describeChosenPhoto, photoError, type ChosenPhoto } from '../../../lib/chat-photo';
import { PHOTO_DELETED, PHOTO_DELETE_CONFIRM, PHOTO_UNAVAILABLE, canDeletePhoto, markPhotoDeleted, mergePhotoUrl, photoLinkRefreshDelay, photoLinksExpired } from '../../../lib/chat-photo-links';
import styles from '../messages.module.css';

const liveLabels: Record<ChatLiveStatus, string> = {
  connecting: 'Connecting to live updates…',
  live: 'Live updates on',
  offline: 'Live updates paused',
  'signed-out': 'Sign in again for live updates',
  unavailable: 'Live updates unavailable',
};

export default function ConversationPage() {
  const session = useNavigationSession();
  const { conversationId } = useParams<{ conversationId: string }>();
  // The key starts each conversation with empty state when moving from one chat to another.
  return session === 'signed-in' ? <Conversation key={conversationId} /> : <SessionNotice state={session} />;
}

// Saved history and live events can overlap; keep one copy of each message, oldest first.
function mergeMessages(current: ChatMessageEvent[], incoming: ChatMessageEvent[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  // SRS-201.7 (#1029): a live photo arrives with no signed link, so merging keeps the one already known
  // rather than blanking out a photo the student is looking at. A newer link still wins.
  for (const message of incoming) byId.set(message.id, mergePhotoUrl(byId.get(message.id), message));
  return [...byId.values()].sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at) || Number(a.id) - Number(b.id));
}

// SRS-201.1 (#302): send a text message in a conversation, laid out like the Messages UI design.
// SRS-201.2 (#318, #319): show the saved messages on open, then new messages live.
function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [text, setText] = useState('');
  const [peer, setPeer] = useState<{name:string;username:string}|null>(null);
  useEffect(() => {
    const controller = new AbortController(); setPeer(null);
    fetch(`/api/conversations/${encodeURIComponent(conversationId)}/peer`, {headers:{Authorization:`Bearer ${storedAccessToken() ?? ''}`},cache:'no-store',signal:controller.signal})
      .then(response => response.ok ? response.json() : null).then(data => { if (!controller.signal.aborted && data?.peer) setPeer(data.peer); }).catch(() => {});
    return () => controller.abort();
  }, [conversationId]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState<ChatLiveStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);
  // The signed-in student's ID (returned with the history) puts their own messages on the right.
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  // 'denied' (SRS-213.1, #324): the conversation is missing or the student is not a participant; both look the same.
  const [history, setHistory] = useState<'loading' | 'loaded' | 'failed' | 'denied'>('loading');
  const [historyError, setHistoryError] = useState('');
  const [reload, setReload] = useState(0);
  // #460: the conversation kind, the student's group role, and the member count come with the history.
  // SRS-202.6 (#840): a named group's name comes with the history too.
  const [info, setInfo] = useState<{ kind: 'private' | 'group'; name: string | null; role: string | null; memberCount: number | null } | null>(null);
  // SRS-205.1 (#483): the invite panel, offered only to the group's owner or administrator.
  const [inviting, setInviting] = useState(false);
  const canInvite = info?.kind === 'group' && (info.role === 'owner' || info.role === 'administrator');
  // SRS-202.5 (#836): the same owner or administrator can name the group from its header.
  const [naming, setNaming] = useState(false);
  // SRS-204.1 (#883): the group's members, where the owner selects one for administrator assignment, and
  // SRS-205.10 (#885) where the owner or administrator removes a regular member.
  const [showingMembers, setShowingMembers] = useState(false);
  // SRS-211.1 (#831): sender names by student ID, returned with the history.
  const [senders, setSenders] = useState<Record<string, { name: string; username: string }>>({});
  const sendersRef = useRef<Record<string, { name: string; username: string }> | null>(null);
  // SRS-210.4 (#811, #812): each message's reactions by message ID, from the history and then live.
  const [reactions, setReactions] = useState<Record<string, ChatReaction[]>>({});
  // SRS-209.5 (#997): the message each reply answers, as the history reports it.
  const [replyTargets, setReplyTargets] = useState<ReplyTargets>({});

  // SRS-212.5: mark the messages shown here as read, again when a message arrives while the student is looking
  // at this conversation, and when they come back to the tab. Nothing is marked while the page is hidden.
  const meRef = useRef<string | null>(null);
  const shownRef = useRef(false);
  const marking = useRef(false);
  const markAgain = useRef(false);
  async function markRead() {
    if (!shownRef.current || document.visibilityState !== 'visible') return;
    if (marking.current) { markAgain.current = true; return; }
    marking.current = true;
    try {
      do {
        markAgain.current = false;
        const token = await accessToken();
        const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token ?? ''}` } });
        // The list refreshes so this conversation's unread dot clears (SRS-212.4).
        if (response.ok) window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
      } while (markAgain.current);
    } catch {
      // Not marked this time; it is tried again on the next message, visit, or return to the tab.
    } finally {
      marking.current = false;
    }
  }

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void markRead(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId]);

  // #318: load the saved messages when the conversation opens, when Try again is pressed, and
  // every time live updates (re)connect, so messages sent while the page was offline still appear.
  useEffect(() => {
    const controller = new AbortController();
    setHistory((current) => (current === 'loaded' ? current : 'loading'));
    (async () => {
      try {
        const token = await accessToken();
        const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
          headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store', signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 404) { setHistory('denied'); return; }
        if (!response.ok) throw new Error(data.error || 'Messages could not be loaded.');
        setMyStudentId(String(data.student_id));
        meRef.current = String(data.student_id);
        if (data.kind) setInfo({ kind: data.kind, name: data.name ?? null, role: data.role ?? null, memberCount: data.member_count ?? null });
        if (data.senders) { sendersRef.current = data.senders; setSenders(data.senders); }
        const loaded: ChatMessageEvent[] = data.messages ?? [];
        // Reactions removed while the page was offline are cleared too: every loaded message gets its saved list.
        setReactions((current) => {
          const next = { ...current };
          for (const message of loaded) next[message.id] = data.reactions?.[message.id] ?? [];
          return next;
        });
        // SRS-209.5: merged rather than replaced, so a target learned earlier survives a reload that no
        // longer lists it among the fifty most recent messages.
        if (data.replies) setReplyTargets((current) => ({ ...current, ...data.replies }));
        // SRS-201.7 (#1030): when the signed links in this response stop working, so the page can ask for
        // new ones before they do rather than leaving broken images on screen.
        setPhotoLinksExpireAt(typeof data.photo_links_expire_at === 'number' ? data.photo_links_expire_at : null);
        setMessages((current) => mergeMessages(current, loaded));
        setHistory('loaded');
        shownRef.current = true;
        void markRead();
        setHistoryError('');
      } catch (err) {
        if (controller.signal.aborted) return;
        setHistory('failed');
        setHistoryError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Messages could not be loaded.');
      }
    })();
    return () => controller.abort();
  }, [conversationId, reload]);

  // SRS-201.7 (#1030): a signed photo link lasts an hour, and a conversation is exactly the page a student
  // leaves open all afternoon. The page asks for fresh links shortly before the ones it holds expire, so the
  // photos never quietly turn into broken images. A conversation with no photos never sets a timer.
  const [photoLinksExpireAt, setPhotoLinksExpireAt] = useState<number | null>(null);
  const hasPhotos = messages.some((message) => message.kind === 'photo');
  useEffect(() => {
    const delay = photoLinkRefreshDelay(photoLinksExpireAt, Date.now(), hasPhotos);
    if (delay === null) return;
    const timer = setTimeout(() => setReload((count) => count + 1), delay);
    return () => clearTimeout(timer);
  }, [photoLinksExpireAt, hasPhotos]);

  // SRS-201.7 (#1029, #1030): a link that fails to load anyway -- expired early, or a storage hiccup. The
  // first failure for a photo asks for fresh links once; if the new link fails too, the message says the photo
  // is unavailable rather than retrying forever. Cleared on every reload so a working link is shown again.
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({});
  const retriedPhotos = useRef(false);
  function photoFailed(messageId: string) {
    if (!retriedPhotos.current) {
      retriedPhotos.current = true;
      setReload((count) => count + 1);
      return;
    }
    setBrokenPhotos((current) => ({ ...current, [messageId]: true }));
  }
  useEffect(() => { setBrokenPhotos({}); retriedPhotos.current = false; }, [conversationId]);

  // Coming back to a tab that was asleep, or restored from the back button, can mean the links expired while
  // the page was away. A timer that was never going to fire on a sleeping tab is why this is checked here too.
  useEffect(() => {
    if (!hasPhotos) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && photoLinksExpired(photoLinksExpireAt, Date.now())) {
        setReload((count) => count + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [photoLinksExpireAt, hasPhotos]);

  // #1106: a photo deleted by its sender leaves everyone's screen at once. The link it was shown with keeps
  // working for up to an hour, so waiting for the next reload would leave the photograph on display after it
  // was deleted; dropping it here is what makes the deletion immediate.
  function photoDeleted(event: ChatDeletedEvent) {
    if (event.conversation_id !== conversationId) return;
    setMessages((current) => markPhotoDeleted(current, event.id));
  }

  // #1106: delete a photo this student sent. The confirmation is asked because there is no undo -- the
  // stored objects are removed, not hidden. The message is marked here as well as by the broadcast, so the
  // sender sees it go even if their own live connection is down.
  const deletingRef = useRef(false);
  async function deletePhoto(messageId: string) {
    if (deletingRef.current || !window.confirm(PHOTO_DELETE_CONFIRM)) return;
    deletingRef.current = true;
    setError('');
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/photos/${encodeURIComponent(messageId)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${storedAccessToken() ?? ''}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'That photo could not be deleted. Please try again.');
      setMessages((current) => markPhotoDeleted(current, messageId));
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'That photo could not be deleted. Please try again.');
    } finally {
      deletingRef.current = false;
    }
  }

  // #319: keep only this conversation's messages; merging by ID stops the send reply and live event both showing.
  function addMessage(message: ChatMessageEvent) {
    // Any sent or received message (in any conversation) refreshes the list's order and previews (#457).
    window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
    if (message.conversation_id !== conversationId) return;
    setMessages((current) => mergeMessages(current, [message]));
    if (message.sender_id !== meRef.current) void markRead();
    // SRS-201.7 (#1029): a photo arriving live carries no link -- realtime reaches the browser with no server
    // in between to sign one -- so the history is loaded again to fetch it. The sender's own send already
    // returned a link, so this only runs for photos from other people.
    if (message.kind === 'photo' && !message.photo_url) setReload((count) => count + 1);
    // SRS-211.1: a member whose name is not loaded yet (for example, someone who just joined) loads the names again.
    if (sendersRef.current && message.sender_id !== meRef.current && !sendersRef.current[message.sender_id]) setReload((count) => count + 1);
  }

  function liveStatus(status: ChatLiveStatus) {
    setLive(status);
    if (status === 'live') setReload((count) => count + 1);
  }

  // SRS-202.6 (#844): a group renamed by its owner or administrator shows the new name right away, here and in the list.
  function renamed(update: ChatConversationEvent) {
    window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
    if (update.conversation_id !== conversationId) return;
    setInfo((current) => current && { ...current, name: update.name });
  }

  // SRS-212.9 (#823): a new group invitation refreshes the list so it appears on the Groups tab.
  const invited = () => window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));

  // SRS-210.4 (#812): a reaction added, changed or removed by anyone in this conversation shows right away.
  function reacted(update: ChatReactionEvent) {
    if (update.conversation_id !== conversationId) return;
    setReactions((current) => ({ ...current, [update.message_id]: update.reactions }));
  }

  useEffect(() => subscribeToChat(addMessage, liveStatus, renamed, invited, reacted, photoDeleted), [conversationId]);


  // Show the latest message: on open, after the student's own message, and for new messages while they
  // are already at the bottom. If they scrolled up to read, keep their place and offer a button instead.
  const [atLatest, setAtLatest] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const atLatestRef = useRef(true);
  const shownCount = useRef(0);
  const opened = useRef(false);

  function scrollToLatest(behavior: ScrollBehavior = 'smooth') {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
    setUnseen(0);
  }

  useEffect(() => {
    const onScroll = () => {
      const at = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
      atLatestRef.current = at;
      setAtLatest(at);
      if (at) setUnseen(0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  useLayoutEffect(() => {
    const added = messages.length - shownCount.current;
    shownCount.current = messages.length;
    if (added <= 0) return;
    const mine = messages[messages.length - 1].sender_id === myStudentId;
    if (!opened.current) { opened.current = true; scrollToLatest('auto'); }
    else if (mine || atLatestRef.current) scrollToLatest();
    else setUnseen((count) => count + added);
  }, [messages, myStudentId]);

  // New reactions on the latest messages stay in view (above the message box) while the student is at the bottom.
  useLayoutEffect(() => {
    if (opened.current && atLatestRef.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [reactions]);

  // Text (SRS-201.1) and emoji (SRS-201.8) messages are sent the same way; the ref stops double-sends
  // before the disabled state shows. Returns whether the message was sent.
  const sendingRef = useRef(false);
  async function deliver(body: { text: string; replyTo?: string } | { kind: 'emoji'; emoji: string }) {
    if (sendingRef.current) return false;
    sendingRef.current = true;
    setSending(true);
    setError('');
    try {
      // No sender ID is sent: the server reads the sender from the token.
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedAccessToken() ?? ''}` },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404) { setHistory('denied'); return false; }
      if (!response.ok) throw new Error(data.error || 'Your message could not be sent. Please try again.');
      addMessage(data.message);
      setMyStudentId((current) => current ?? data.message.sender_id);
      return true;
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Your message could not be sent. Please try again.');
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    // SRS-201.6 (#1024): a chosen photo is what Send sends. The schema gives a photo message no text of its
    // own, so a photo and a caption are two messages; anything typed stays in the box and is sent next,
    // rather than being thrown away or quietly attached to something that cannot carry it.
    if (photo) { await sendPhoto(photo); return; }
    if (!text.trim()) return;
    // SRS-209.3 (#992): a chosen message is sent with the reply, so the two are associated (SRS-209.4).
    // The choice is only cleared once the reply is actually sent, so a failed send keeps it for a retry.
    if (await deliver(replyingTo ? { text, replyTo: replyingTo } : { text })) {
      setText('');
      setReplyingTo(null);
    }
  }

  // SRS-201.8 (#797): the emoji picker beside the message box; a chosen emoji is sent straight away.
  const [picking, setPicking] = useState(false);
  const emojiButton = useRef<HTMLButtonElement>(null);
  function closePicker() {
    setPicking(false);
    emojiButton.current?.focus();
  }
  function sendEmoji(emoji: string) {
    closePicker();
    void deliver({ kind: 'emoji', emoji });
  }

  // SRS-210.1 (#802): each message's React button opens the reaction set under it, one message at a time.
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const reactButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  function closeReactions() {
    if (reactingTo) reactButtons.current[reactingTo]?.focus();
    setReactingTo(null);
  }

  // SRS-210.3 / SRS-210.5 / SRS-210.6 (#809, #816, #819): choosing the student's current reaction removes it;
  // any other emoji adds it or replaces theirs. The ref stops double-clicks before the disabled state shows.
  const reactingRef = useRef(false);
  const [reactionBusy, setReactionBusy] = useState(false);

  // SRS-209.1 (#986): the group message the student has chosen to reply to. Only the choice lives here; the
  // composer shows it in SRS-209.2 and the reply is sent in SRS-209.3.
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const replyButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => { setReplyingTo((current) => keepReplyTarget(current, messages)); }, [messages]);
  // Escape abandons the choice and puts focus back on the message's Reply button, as the reaction picker does.
  useEffect(() => {
    if (!replyingTo) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') clearReply(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [replyingTo]);

  // SRS-201.3 (#1013): the photo the student has chosen to send. Choosing only; the formats are
  // SRS-201.4, the size limit SRS-201.5, and uploading and sending it SRS-201.6.
  // SRS-201.6 (#1024): the chosen file itself is kept, not only its name and size, because sending it uploads it.
  const [photo, setPhoto] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  // SRS-201.6 (#1025): the camera is a second input on the same handler. Clearing has to reach both, since a
  // photo taken with the camera is cleared by the same button as one chosen from the device.
  const cameraInput = useRef<HTMLInputElement>(null);
  function clearPhoto() {
    setPhoto(null);
    // Clearing the input's value matters: without it, choosing the same file again fires no change.
    if (photoInput.current) photoInput.current.value = '';
    if (cameraInput.current) cameraInput.current.value = '';
    photoInput.current?.focus();
  }

  // SRS-201.4 (#1015, #1016) and SRS-201.5 (#1018): a chosen file is kept only when its format is one the
  // conversation accepts and it is within the size limit.
  // The accept hint below filters what the picker offers, but a student can still pick "All files", so the
  // refusal has to happen here too. Saying why is better than silently ignoring the file.
  function reviewPhoto(files: FileList | null) {
    const chosen = choosePhoto(files);
    if (!chosen) { setPhoto(null); return; }
    const refusal = photoError(chosen);
    if (refusal) {
      setError(refusal);
      setPhoto(null);
      if (photoInput.current) photoInput.current.value = '';
      if (cameraInput.current) cameraInput.current.value = '';
      return;
    }
    setError('');
    setPhoto(chosen);
  }

  // SRS-201.6 (#1022, #1023, #1024): send the chosen photo. It goes as form data rather than JSON because the
  // file is sent as it is, with no re-encoding in the browser. The server reads the sender from the token, so
  // the form carries nothing but the photo.
  // The chosen photo is only cleared once it has actually been sent, so a failed send keeps it for a retry --
  // the same rule the reply target follows.
  async function sendPhoto(file: File) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError('');
    try {
      const form = new FormData();
      form.append('photo', file);
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/photos`, {
        method: 'POST', headers: { Authorization: `Bearer ${storedAccessToken() ?? ''}` }, body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404) { setHistory('denied'); return; }
      if (!response.ok) throw new Error(data.error || PHOTO_SEND_FAILED);
      addMessage(data.message);
      setMyStudentId((current) => current ?? data.message.sender_id);
      clearPhoto();
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : PHOTO_SEND_FAILED);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  // SRS-209.2 (#988): choosing a message moves the cursor to the message box, so the reply can be written at once.
  const messageInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (replyingTo) messageInput.current?.focus(); }, [replyingTo]);
  // The chosen message itself, and who sent it, for the bar above the composer.
  const replyTarget = findReplyTarget(messages, replyingTo);
  const replyTargetSender = replyTarget
    ? (replyTarget.sender_id === myStudentId ? 'you' : senders[replyTarget.sender_id]?.name ?? 'a member')
    : '';
  function clearReply() {
    if (replyingTo) replyButtons.current[replyingTo]?.focus();
    setReplyingTo(null);
  }
  async function react(messageId: string, emoji: string) {
    if (reactingRef.current) return;
    reactingRef.current = true;
    setReactionBusy(true);
    setError('');
    const remove = reactions[messageId]?.some((reaction) => reaction.mine && reaction.emoji === emoji) ?? false;
    try {
      // No student ID is sent: the server reads the student from the token.
      const token = await accessToken();
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/reaction`, {
        method: remove ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: remove ? undefined : JSON.stringify({ emoji }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Your reaction could not be saved. Please try again.');
      setReactions((current) => ({ ...current, [messageId]: data.reactions ?? [] }));
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Your reaction could not be saved. Please try again.');
    } finally {
      reactingRef.current = false;
      setReactionBusy(false);
    }
  }

  // SRS-213.1 (#324): outsiders see the same clear message as for a missing conversation, with no message box.
  if (history === 'denied') {
    return (
      <main className={`${styles.page} ${styles.withConversation}`}>
        <ConversationListPanel />
        <section className={`${styles.conversation} ${styles.unavailable}`} aria-label="Conversation">
          <span className={styles.avatar} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          </span>
          <h2 className={styles.emptyTitle}>This conversation isn’t available</h2>
          <p className={styles.emptyText}>It may not exist, or you may not be one of its participants.</p>
          <Link href="/messages" className={styles.backLink}>Back to Messages</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${styles.withConversation}`}>
      <ConversationListPanel />

      <section className={styles.conversation} aria-label="Conversation">
        <header className={styles.header}>
          {/* Tablets and phones show one panel at a time, so this returns to the Messages list there. */}
          <Link href="/messages" className={styles.backButton} aria-label="Back to Messages">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <span className={styles.avatar} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
          </span>
          <div className={styles.headerText}>
            {canInvite && naming ? (
              <GroupNameForm conversationId={conversationId} current={info.name} onCancel={() => setNaming(false)}
                onSaved={(name) => {
                  setInfo((current) => current && { ...current, name });
                  setNaming(false);
                  // The Messages list refreshes so it shows the new name too.
                  window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
                }} />
            ) : (
              <h2 className={styles.title}>
                {info?.kind === 'group'
                  ? <>
                      {info.name ?? 'Group chat'}
                      {canInvite && (
                        <button type="button" className={styles.renameButton} onClick={() => setNaming(true)} aria-label={info.name ? 'Rename group' : 'Name group'} title={info.name ? 'Rename group' : 'Name group'}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                        </button>
                      )}
                      {info.role === 'owner' && <span className={styles.roleBadge}>Owner</span>}
                    </>
                  : peer ? <Link href={`/students/${encodeURIComponent(peer.username)}`}>{peer.name}</Link> : 'Conversation'}
              </h2>
            )}
            <p className={styles.subtitle}>
              {info?.kind === 'group' && info.memberCount !== null && <>{info.memberCount} member{info.memberCount === 1 ? '' : 's'} ·</>}
              <span className={live === 'live' ? styles.dotLive : styles.dot} />{liveLabels[live]}
            </p>
          </div>
          {canInvite && (
            <button type="button" className={styles.inviteButton} onClick={() => setInviting((open) => !open)} aria-expanded={inviting}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></svg>
              Invite
            </button>
          )}
          {canInvite && inviting && <InvitePicker conversationId={conversationId} onClose={() => setInviting(false)} />}
          {/* SRS-204.1: any member can see who is in the group; only the owner gets the Make admin buttons. */}
          {info?.kind === 'group' && (
            <button type="button" className={styles.inviteButton} onClick={() => setShowingMembers((open) => !open)} aria-expanded={showingMembers}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Members
            </button>
          )}
          {showingMembers && info?.kind === 'group' && (
            <GroupMemberList conversationId={conversationId} viewerRole={info.role}
              onClose={() => { setShowingMembers(false); setReload((count) => count + 1); }} />
          )}
          {/* #847: on wide screens the Messages list sits beside the conversation, so this closes it and returns there.
              Tablets and phones use the back button instead. Nothing is changed or deleted. */}
          <Link href="/messages" className={styles.closeButton} aria-label="Close conversation" title="Close conversation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </Link>
        </header>

        {/* Snipe is available only after the server confirms group membership. */}
        {myStudentId !== null && info?.kind === 'group' && <SnipePanel conversationId={conversationId} />}

        <ol className={styles.messages} aria-live="polite">
          {messages.length === 0
            ? <li className={styles.emptyMessages}>{history === 'loading' ? 'Loading messages…' : history === 'loaded' ? 'Send a message to start the conversation.' : 'No messages to show yet.'}</li>
            : messages.map((message, index) => {
              const mine = message.sender_id === myStudentId;
              // SRS-201.9 (#800): an emoji message is shown larger, without a bubble, on the sender's side.
              // SRS-201.6 (#1024): a photo bubble holds the photo itself, so it drops the text padding.
              const bubble = `${styles.bubble}${mine ? ` ${styles.bubbleOwn}` : ''}${message.kind === 'emoji' ? ` ${styles.emojiBubble}` : ''}${message.kind === 'photo' ? ` ${styles.photoBubble}` : ''}`;
              // SRS-211.1 (#831): every message is read out with its sender's name; in groups the name is also
              // shown above each run of messages from another member.
              const sender = mine ? 'You' : senders[message.sender_id]?.name ?? (info?.kind === 'group' ? 'A member' : peer?.name ?? 'Them');
              const showName = info?.kind === 'group' && !mine && messages[index - 1]?.sender_id !== message.sender_id;
              const chips = sortReactions(reactions[message.id] ?? []);
              const picking = reactingTo === message.id;
              // SRS-209.1 (#986): a group message can be chosen as the target of a reply.
              const canReply = canSelectForReply(info?.kind, message);
              const replying = replyingTo === message.id;
              // SRS-209.5 (#998): what this message replies to, if anything still visible to this student.
              const quoted = replyQuote(message, replyTargets, messages, senders, myStudentId);
              const shows = replyIndication(message, quoted);
              return (
                <li key={message.id} aria-current={replying ? 'true' : undefined}
                  className={`${mine ? `${styles.message} ${styles.messageOwn}` : styles.message}${replying ? ` ${styles.messageReplyTarget}` : ''}`}>
                  {showName && <span className={styles.senderName} aria-hidden="true">{sender}</span>}
                  {shows === 'quote' && quoted && (
                    <span className={styles.quoted}>
                      <span className={styles.quotedWho}>{quoted.sender}</span>
                      {/* SRS-201.7: a reply to a photo has no text to quote, so the quote names what was
                          answered. The photo itself is already in the conversation just above. */}
                      <span className={styles.quotedText}>
                        {quoted.kind === 'photo' ? 'Photo' : quoted.kind === 'emoji' ? quoted.text : replyPreview(quoted.text, 60)}
                      </span>
                    </span>
                  )}
                  {/* SRS-209.6 (#1001): the message is a reply, but its target cannot be shown to this student.
                      Saying so is clearer than leaving the reply looking like an ordinary message, and it
                      reveals nothing about a message they are not allowed to read. */}
                  {shows === 'unavailable' && (
                    <span className={`${styles.quoted} ${styles.quotedGone}`}>
                      <span className={styles.quotedText}>Original message unavailable</span>
                    </span>
                  )}
                  <div className={styles.bubbleRow}>
                    <p className={bubble}>
                      <span className={styles.srOnly}>
                        {quoted ? `${sender}, replying to ${quoted.sender}: ` : `${sender}: `}
                      </span>
                      {/* SRS-201.6 (#1024): the sender sees the photo they just sent, from the signed link the
                          send returned. Everyone else sees that a photo is there until the history gives them
                          a link of their own, which is SRS-201.7 along with refreshing a link that has expired. */}
                      {message.kind === 'photo'
                        ? message.deleted
                          /* #1106: the message keeps its place so the conversation still reads in order and a
                             reply that answered it still points somewhere, but the photograph is gone. */
                          ? <span className={`${styles.photoPending} ${styles.photoDeleted}`}>{PHOTO_DELETED}</span>
                          : message.photo_url && !brokenPhotos[message.id]
                            ? <img className={styles.photoMessage} src={message.photo_url}
                                alt={mine ? 'Photo you sent' : `Photo from ${sender}`} loading="lazy"
                                onError={() => photoFailed(message.id)} />
                            : <span className={styles.photoPending}>{message.photo_url ? PHOTO_UNAVAILABLE : 'Photo'}</span>
                        : message.text}
                    </p>
                    {/* SRS-201.7: photos are now in the conversation, and socialu_react_to_message accepts
                        only text and emoji (SRS-210), so a React button on a photo would always fail. It is
                        hidden rather than left to refuse what it offers. */}
                    {message.kind !== 'photo' && (
                    <button ref={(button) => { reactButtons.current[message.id] = button; }} type="button" className={styles.reactButton}
                      onClick={() => setReactingTo(picking ? null : message.id)} aria-expanded={picking}
                      aria-label={mine ? 'React to your message' : `React to ${sender}’s message`} title="React">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11v1a10 10 0 1 1-9-10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /><path d="M16 5h6" /><path d="M19 2v6" /></svg>
                    </button>
                    )}
                    {/* #1106: only on this student's own photos, and only while it still has one. The database
                        refuses anyone else, so this hides a control that would always fail rather than
                        offering it. */}
                    {canDeletePhoto(message, myStudentId) && (
                      <button type="button" className={styles.deleteButton} onClick={() => void deletePhoto(message.id)}
                        aria-label="Delete your photo" title="Delete photo">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                      </button>
                    )}
                    {canReply && (
                      <button ref={(button) => { replyButtons.current[message.id] = button; }} type="button" className={styles.replyButton}
                        onClick={() => setReplyingTo((current) => toggleReplyTarget(current, message.id))} aria-pressed={replying}
                        aria-label={mine ? 'Reply to your message' : `Reply to ${sender}’s message`}
                        title={replying ? 'Chosen for reply' : 'Reply'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 17l-5-5 5-5" /><path d="M4 12h11a5 5 0 0 1 5 5v2" /></svg>
                      </button>
                    )}
                  </div>
                  {chips.length > 0 && <ReactionChips reactions={chips} disabled={reactionBusy} onPick={(emoji) => void react(message.id, emoji)} />}
                  {picking && (
                    <ReactionPicker current={chips.find((reaction) => reaction.mine)?.emoji ?? null} disabled={reactionBusy} onClose={closeReactions}
                      onPick={(emoji) => { closeReactions(); void react(message.id, emoji); }} />
                  )}
                </li>
              );
            })}
        </ol>

        <div className={styles.footer}>
          {!atLatest && !picking && (
            <button type="button" className={styles.jump} onClick={() => scrollToLatest()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
              {unseen > 0 ? `${unseen} new message${unseen === 1 ? '' : 's'}` : 'Jump to latest'}
            </button>
          )}
          {history === 'failed' && (
            <p className={`${styles.error} ${styles.errorAbove}`} role="alert">
              {historyError} <button type="button" className={styles.retry} onClick={() => setReload((count) => count + 1)}>Try again</button>
            </p>
          )}
          {picking && <EmojiPicker disabled={sending} onPick={sendEmoji} onClose={closePicker} />}
          {/* SRS-209.2 (#988): while a message is chosen, the composer says which message the reply answers.
              The choice can be abandoned here as well as with Escape. */}
          {replyTarget && (
            <div className={styles.replyBar}>
              <span className={styles.replyBarMark} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17l-5-5 5-5" /><path d="M4 12h11a5 5 0 0 1 5 5v2" /></svg>
              </span>
              <span className={styles.replyBarText}>
                <span className={styles.replyBarWho}>Replying to {replyTargetSender}</span>
                <span className={styles.replyBarQuote}>{replyPreview(replyTarget.text)}</span>
              </span>
              <button type="button" className={styles.replyCancel} onClick={clearReply} aria-label="Cancel reply" title="Cancel reply">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
          )}
          {/* SRS-201.3 (#1013): what the student has chosen, so they can see it before sending and
              change their mind. Sending it is SRS-201.6. */}
          {photo && (
            <div className={styles.chosenPhoto}>
              <span className={styles.chosenPhotoMark} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
              </span>
              <span className={styles.chosenPhotoText}>{describeChosenPhoto(photo)}</span>
              <button type="button" className={styles.chosenPhotoRemove} onClick={clearPhoto}
                aria-label="Remove the chosen photo" title="Remove photo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
          )}
          <form className={styles.composer} onSubmit={send}>
            <button ref={emojiButton} type="button" className={styles.emojiToggle} onClick={() => setPicking((open) => !open)}
              aria-expanded={picking} aria-label="Choose an emoji">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></svg>
            </button>
            {/* SRS-201.3 (#1013): a hidden file input, opened by the Photo button beside it. The
                accept hint is left wide here; narrowing it to the supported formats is SRS-201.4. */}
            <input ref={photoInput} id="message-photo" type="file" accept={PHOTO_ACCEPT} className={styles.srOnly}
              onChange={(event) => reviewPhoto(event.target.files)} disabled={sending} />
            <label htmlFor="message-photo" className={styles.photoToggle} title="Choose a photo">
              <span className={styles.srOnly}>Choose a photo</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
            </label>
            {/* SRS-201.6 (#1025): take the photo instead of choosing one. capture asks a phone for its camera
                directly; a browser that has none ignores the hint and opens the picker, which is a reasonable
                thing for this button to do rather than an error. What comes back is judged by the same rules. */}
            <input ref={cameraInput} id="message-camera" type="file" accept={PHOTO_ACCEPT} capture="environment"
              className={styles.srOnly} onChange={(event) => reviewPhoto(event.target.files)} disabled={sending} />
            <label htmlFor="message-camera" className={styles.photoToggle} title="Take a photo">
              <span className={styles.srOnly}>Take a photo</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3.5" /></svg>
            </label>
            <label htmlFor="message-text" className={styles.srOnly}>Message</label>
            <input ref={messageInput} id="message-text" className={styles.input} value={text} onChange={(event) => setText(event.target.value)}
              placeholder={replyTarget ? `Reply to ${replyTargetSender}…` : photo ? 'Photo ready to send…' : 'Message…'} maxLength={500} autoComplete="off" disabled={sending} />
            {/* SRS-201.6 (#1024): Send is available for a chosen photo as well as for typed text. */}
            <button type="submit" className={styles.send} disabled={sending || (!text.trim() && !photo)}
              aria-label={photo ? 'Send photo' : 'Send message'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></svg>
            </button>
          </form>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      </section>
    </main>
  );
}
