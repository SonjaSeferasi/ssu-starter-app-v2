Owner: Sonja Seferasi (SS)
Parent requirement: #42 — SRS-607.2.
Traces to: UR-607.

## Task
Connect the Game Room's Game 1 opening control to the supplied authenticated Game 1 entry view, without requiring avatar editing or a photograph upload.

## Verified implementation
- [x] activityEntrypoints.game1 maps to /game-1.
- [x] The Game Room uses a real Play Game 1 link.
- [x] The entry page reuses the verified account session, displays Game 1, and supplies Back to Game Room controls.
- [x] No customized-avatar check, upload form or mandatory editor sits between the opening control and entry view (code review).
- [x] In the signed-in integrated browser, Play opened Game 1; global navigation was hidden; return restored the Game Room shell.

## Code and submitted work
[Entry registry](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/lib/game-room.ts), [Game Room links](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/game-room/game-room.tsx), [Game 1 entry view](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/game-1/page.tsx).
Merged code: [PR #336](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/336); branch [feature/srs-600-1-navigation-destinations](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/feature/srs-600-1-navigation-destinations).

## Acceptance evidence and limits
Parent #42 contains real Game 1 and DormSpace entry screenshots and the 13 October review. A separate new account with no avatar was not created; the no-editor prerequisite was verified through code and the direct normal-page flow. Game 1 explicitly says gameplay is not available yet. This task completes entry wiring only; it does not complete three playable levels, movement/jumping, pause, attempts, coins, completion storage, participation or points.

## Dependency update
#41's activity-card presentation and the /game-1 entry view now exist in merged main. The earlier plan-only wording is replaced with current implementation evidence. Task verification closes on the audit date, without inventing prior development history.
