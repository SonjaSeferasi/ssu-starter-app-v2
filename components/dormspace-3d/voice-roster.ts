import { RoomEvent, Track, type RemoteTrack, type Room } from 'livekit-client';

export type VoicePeer = { id: string; name: string; speaking: boolean; muted: boolean };

export function voiceRoster(room: Room, container: HTMLElement, changed: () => void) {
  const audio = new Map<RemoteTrack, { id: string; element: HTMLMediaElement }>();
  const muted = new Set<string>();
  const events = [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.ActiveSpeakersChanged,
    RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.AudioPlaybackStatusChanged] as const;
  for (const event of events) room.on(event, changed);
  function detach(track: RemoteTrack) {
    const item = audio.get(track);
    if (!item) return;
    item.element.pause();
    track.detach(item.element);
    item.element.remove();
    audio.delete(track);
  }
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind !== Track.Kind.Audio || publication.source !== Track.Source.Microphone) return;
    if (audio.has(track)) return;
    const element = track.attach();
    element.muted = muted.has(participant.identity);
    container.appendChild(element);
    audio.set(track, { id: participant.identity, element });
    changed();
  });
  room.on(RoomEvent.TrackUnsubscribed, track => {
    if (track.kind === Track.Kind.Audio) detach(track);
  });
  room.on(RoomEvent.ParticipantDisconnected, participant => {
    muted.delete(participant.identity);
    for (const [track, item] of audio) if (item.id === participant.identity) detach(track);
    changed();
  });
  return {
    peers(): VoicePeer[] {
      return [...room.remoteParticipants.values()].map(participant => ({
        id: participant.identity, name: participant.name || 'Student',
        speaking: participant.isSpeaking, muted: muted.has(participant.identity),
      })).sort((a, b) => a.name.localeCompare(b.name));
    },
    mute(id: string) {
      if (muted.has(id)) muted.delete(id);
      else muted.add(id);
      for (const item of audio.values()) if (item.id === id) item.element.muted = muted.has(id);
      changed();
    },
    clear() { for (const track of audio.keys()) detach(track); },
  };
}
