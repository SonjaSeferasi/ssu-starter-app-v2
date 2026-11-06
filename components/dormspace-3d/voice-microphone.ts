import { ConnectionState, Track, createLocalAudioTrack, type LocalAudioTrack, type Room } from 'livekit-client';

/** Audio capture begins here, exclusively from the student's Enable microphone action. */
export function voiceMicrophone(room: Room, changed: () => void) {
  let track: LocalAudioTrack | undefined;
  let closed = false;
  let request = 0;

  function stop() {
    request++;
    const previous = track;
    track = undefined;
    if (!previous) return;
    // Release the device synchronously, even if unpublishing needs a network round trip.
    previous.stop();
    changed();
    void room.localParticipant.unpublishTrack(previous, true).catch(() => {});
  }

  return {
    get enabled() { return !!track && track.mediaStreamTrack.readyState === 'live' && track.mediaStreamTrack.enabled; },
    async enable() {
      const id = ++request;
      const candidate = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
      const current = () => !closed && id === request && room.state === ConnectionState.Connected;
      if (!current()) { candidate.stop(); return; }
      track = candidate;
      candidate.mediaStreamTrack.addEventListener('ended', () => { if (track === candidate) stop(); }, { once: true });
      try {
        await room.localParticipant.publishTrack(candidate, { source: Track.Source.Microphone });
        if (current() && candidate.mediaStreamTrack.readyState === 'live') changed();
        else {
          candidate.stop();
          await room.localParticipant.unpublishTrack(candidate, true);
        }
      } catch (error) {
        if (track === candidate) stop();
        else candidate.stop();
        if (current() || !closed) throw error;
      }
    },
    stop,
    close() { closed = true; stop(); },
  };
}
