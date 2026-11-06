# DormSpace audio

The 3D DormSpace follow-up covers shared MP3 playback for opted-in listeners in the same dorm room and opt-in voice chat in rooms and the shared DormHall. The 3D integration is the prerequisite. The voice implementation is on `feature/dormspace-voice`. Shared MP3 playback remains planned.

## Review and task board

- [SocialU Product Backlog](https://github.com/users/SonjaSeferasi/projects/2)
- [DormSpace 3D integration](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1144)
- [UR-530 and its MP3 requirements](SocialU_SRS_Editable.md#ur-530) · [Parent card #1152](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1152)
- [UR-531 and its voice requirements](SocialU_SRS_Editable.md#ur-531) · [Parent card #1153](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1153)

Each SRS item has an independent requirements branch based on `feature/dormspace-3d-integration`. The audio SRS branch brings the requirements and user stories together. Implementation branches can build on these scopes after review.

| SRS | Requirement branch | Product Backlog card |
| --- | --- | --- |
| [SRS-530.1](SocialU_SRS_Editable.md#srs-530.1) | [`srs-530.1-room-music-host-controls`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-530.1-room-music-host-controls) | [#1154](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1154) |
| [SRS-530.2](SocialU_SRS_Editable.md#srs-530.2) | [`srs-530.2-room-music-opt-in`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-530.2-room-music-opt-in) | [#1155](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1155) |
| [SRS-530.3](SocialU_SRS_Editable.md#srs-530.3) | [`srs-530.3-room-music-sync`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-530.3-room-music-sync) | [#1157](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1157) |
| [SRS-530.4](SocialU_SRS_Editable.md#srs-530.4) | [`srs-530.4-room-music-boundary`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-530.4-room-music-boundary) | [#1159](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1159) |
| [SRS-531.1](SocialU_SRS_Editable.md#srs-531.1) | [`srs-531.1-voice-location-opt-in`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-531.1-voice-location-opt-in) | [#1156](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1156) |
| [SRS-531.2](SocialU_SRS_Editable.md#srs-531.2) | [`srs-531.2-voice-authorization`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-531.2-voice-authorization) | [#1158](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1158) |
| [SRS-531.3](SocialU_SRS_Editable.md#srs-531.3) | [`srs-531.3-voice-microphone`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-531.3-voice-microphone) | [#1160](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1160) |
| [SRS-531.4](SocialU_SRS_Editable.md#srs-531.4) | [`srs-531.4-voice-participants`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-531.4-voice-participants) | [#1161](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1161) |
| [SRS-531.5](SocialU_SRS_Editable.md#srs-531.5) | [`srs-531.5-voice-session-lifecycle`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-531.5-voice-session-lifecycle) | [#1162](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1162) |
| [SRS-531.6](SocialU_SRS_Editable.md#srs-531.6) | [`srs-531.6-voice-media-privacy`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-531.6-voice-media-privacy) | [#1163](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1163) |

## Open decisions

- Confirm whether the room owner controls the soundtrack, and approve the proposed MP3 catalog and redistribution terms before enabling music.
- Voice uses LiveKit, with a provisional capacity of 24 students per channel. Same-university hall voice covers all floors. Existing account blocks prevent sharing a channel. Release browser support, capacity and report handling remain open.

## Integrated acceptance

| Scenario | Expected behavior |
| --- | --- |
| Room owner, two opted-in listeners, one opted-out visitor | Listeners hear the same track and position. Changing volume or opting out affects only that student. A visitor cannot change the owner's playback state. |
| Late join, pause, track change, failed load | New or recovering listeners follow the latest room state. Music recovery does not interrupt movement or other chat controls. |
| Same-university non-friends in hall | They can choose to join hall voice. Room access still requires ownership or current friendship. |
| Unauthorized room, cross-university hall, guessed channel | The service denies admission and media delivery. A room cannot hear another room or the hall. |
| Microphone denied, absent, enabled, muted | Voice starts listen-only. Only an explicit enable action requests capture. Local or device mute behaves as shown, and text remains available. |
| Room exit, floor movement, sign-out, access revocation, network loss | Crossing a voice boundary or losing access ends the previous session. A reconnect attempt starts muted. Room music stops on room exit or revocation. |
| Keyboard and touch | Audio controls, labels, focus and state are usable while the 3D scene is active. Capture state is visible without relying on color. |
| Provider privacy | Verify encrypted media and inspect settings and data stores for recordings, transcripts and retained audio. |

Record results from separate signed-in browser sessions, including a supported mobile browser and a denied-access account. Capture running UI evidence with synthetic accounts. Keep implementation cards in Product Backlog until selected, and use the team's Definition of Done before closing them.


## Voice deployment

1. Apply the DormSpace 3D directory and `20261106075900_dormspace_voice.sql` migrations to the environment's database.
2. Set `DORMSPACE_VOICE_URL`, `DORMSPACE_VOICE_API_KEY`, `DORMSPACE_VOICE_API_SECRET` and a separate random `DORMSPACE_VOICE_SWEEP_SECRET` of at least 32 characters on the app server. Production uses a dedicated LiveKit Cloud project at its `wss://…livekit.cloud` endpoint so participant removal also revokes media tokens. Loopback LiveKit development servers are supported in development.
3. Keep recording, egress and agent integrations off in the provider project. The app requests microphone-only publish permission and uses encrypted WebRTC transport. Neither the app nor the configured project records or transcribes voice.
4. Run `node scripts/dormspace-voice-sweep.mjs` as a supervised worker. Set its `DORMSPACE_VOICE_SWEEP_ENDPOINT` to the app's `/api/dorm/voice/sweep` URL and give it the same sweep secret. It scans provider rooms about every five seconds. Monitor failures and keep the worker running whenever voice is enabled. Keep the API secret and sweep secret out of browser-exposed settings.

Joining reserves one voice seat against the current authenticated DormSpace presence. The browser checks access about every five seconds while joined. Each successful check renews a 15-second lease. The worker removes expired, unauthorized and blocked sessions from the provider, including when a browser disappears without sending Leave. Media admission tokens expire after 20 seconds. There is no background microphone capture on entry, reconnect or location change. Sign-out, leave, denied access and a disconnected transport release capture and playback.

The implementation includes separate SRS review branches under `impl/srs-531.*`. These are stacked on the 3D block-style branch and audio SRS. Existing Product Backlog links above remain the source of task tracking.

For local integration tests, use a loopback LiveKit server in development mode, set the same four development variables, and run the existing DormSpace browser harness with `DORMSPACE_VOICE_TEST=1` and the test name `streams voice`. The test uses a disposable database, synthetic students and Chromium's synthetic microphone.
