import { Room, RoomEvent } from 'livekit-client';
import { voiceMicrophone } from './voice-microphone';
import { voiceRoster, type VoicePeer } from './voice-roster';

export type VoiceMediaState = { peers: VoicePeer[]; mic: boolean; canPlay: boolean; speaking: boolean };
export type VoiceMedia = ReturnType<typeof createVoiceMedia>;

/** The transport attaches live audio elements only. It never buffers or records media. */
export function createVoiceMedia(container: HTMLElement, onChange: (state: VoiceMediaState) => void, onLost: () => void) {
  const room = new Room({ reconnectPolicy: { nextRetryDelayInMs: () => null } });
  let closed = false;
  function changed() {
    if (!closed) onChange({ peers: roster.peers(), mic: microphone.enabled, canPlay: room.canPlaybackAudio, speaking: room.localParticipant.isSpeaking });
  }
  const microphone = voiceMicrophone(room, changed);
  const roster = voiceRoster(room, container, changed);
  const lost = () => { if (!closed) onLost(); };
  room.on(RoomEvent.Disconnected, lost).on(RoomEvent.Reconnecting, lost).on(RoomEvent.SignalReconnecting, lost);

  function close() {
    if (closed) return;
    closed = true;
    microphone.close();
    roster.clear();
    room.removeAllListeners();
    void room.disconnect(true).catch(() => {});
  }

  return {
    async connect(url: string, token: string) {
      await room.connect(url, token, { autoSubscribe: true, maxRetries: 0 });
      if (closed) { await room.disconnect(true); return; }
      changed();
    },
    close,
    enableMicrophone: () => microphone.enable(),
    muteMicrophone: () => microphone.stop(),
    mutePeer: (id: string) => roster.mute(id),
    startAudio: () => room.startAudio(),
  };
}
