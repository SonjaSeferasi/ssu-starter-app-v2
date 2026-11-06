# DormSpace audio

The 3D DormSpace follow-up covers shared MP3 playback for opted-in listeners in the same dorm room and opt-in voice chat in rooms and the shared DormHall. The 3D integration is the prerequisite. Implementation and acceptance are pending.

## Review and task board

- [SocialU Product Backlog](https://github.com/users/SonjaSeferasi/projects/2)
- [DormSpace 3D integration](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1144)
- [UR-530 and its MP3 requirements](SocialU_SRS_Editable.md#ur-530)
- [UR-531 and its voice requirements](SocialU_SRS_Editable.md#ur-531)

Each SRS item has an independent requirements branch based on `feature/dormspace-3d-integration`. The audio SRS branch brings the requirements and user stories together. Implementation branches can build on these scopes after review.

| SRS | Requirement branch |
| --- | --- |
| [SRS-530.1](SocialU_SRS_Editable.md#srs-530.1) | `srs-530.1-room-music-host-controls` |
| [SRS-530.2](SocialU_SRS_Editable.md#srs-530.2) | `srs-530.2-room-music-opt-in` |
| [SRS-530.3](SocialU_SRS_Editable.md#srs-530.3) | `srs-530.3-room-music-sync` |
| [SRS-530.4](SocialU_SRS_Editable.md#srs-530.4) | `srs-530.4-room-music-boundary` |
| [SRS-531.1](SocialU_SRS_Editable.md#srs-531.1) | `srs-531.1-voice-location-opt-in` |
| [SRS-531.2](SocialU_SRS_Editable.md#srs-531.2) | `srs-531.2-voice-authorization` |
| [SRS-531.3](SocialU_SRS_Editable.md#srs-531.3) | `srs-531.3-voice-microphone` |
| [SRS-531.4](SocialU_SRS_Editable.md#srs-531.4) | `srs-531.4-voice-participants` |
| [SRS-531.5](SocialU_SRS_Editable.md#srs-531.5) | `srs-531.5-voice-session-lifecycle` |
| [SRS-531.6](SocialU_SRS_Editable.md#srs-531.6) | `srs-531.6-voice-media-privacy` |

## Open decisions

- Confirm whether the room owner controls the soundtrack, and approve the proposed MP3 catalog and redistribution terms before enabling music.
- Choose the voice provider and deployment settings. Confirm hall capacity, supported browsers, access revocation timing, and the block/report policy before acceptance. Same-university hall voice is the scope. Whether busy halls need multiple voice groups is open.

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
