Owner: Sonja Seferasi (SS)
Parent requirement: #42 — SRS-607.2.
Traces to: UR-607.

## Task
Connect the Game Room's DormSpace opening control to the entry route supplied by DP. Allow entry without a mandatory avatar editing step.

## Verified implementation
- [x] activityEntrypoints.dormspace maps to /game-room/dormspace.
- [x] The Game Room displays a real Open DormSpace link for the included activity.
- [x] The supplied route renders DP's DormSpaceGame after the existing session gate.
- [x] The normal flow has no avatar-editing prerequisite (code review and direct opening).
- [x] In the signed-in integrated browser, Open DormSpace reached the working DormHall view, and the Game Room return link restored the Game Room.

## Code and submitted work
[Entry registry](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/lib/game-room.ts), [Game Room link](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/game-room/game-room.tsx), [DP entry route](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/game-room/dormspace/page.tsx).
Sonja's integration is in [merged PR #336](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/336). The supplied route is present on [reviewed main at 3727169](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/3727169). Parent #42 contains the running DormSpace entry screenshot.

## Resolved dependency
The old ticket said that DP's entry workflow had not been supplied. That is now outdated: the route and working DormHall are in integrated main. This review verified the actual supplied implementation, rather than a fake replacement route.

## Ownership and acceptance limits
Sonja owns this opening/handoff integration. DP owns DormSpace's rooms, decoration, saves, visits, guestbooks, purchases and other internals; none is marked complete by this task. A new empty-avatar account was not created during this audit. Participation recording belongs to SRS-613.1; shared points processing remains DP's responsibility. No schema, points or catalog changes are needed for this existing route handoff.
