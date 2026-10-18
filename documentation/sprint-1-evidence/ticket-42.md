Owner: Sonja Seferasi (SS)
Backlog priority: 5 — depends on #41 and the supplied activity entry routes.

## Exact SRS requirement
When a student activates an available activity's opening control, the system shall open that activity.

Traces to: UR-607.

## Exact acceptance criterion
Given each activity included in the release, when its opening control is selected, then that named activity opens without requiring avatar customization.

## Current submitted implementation
- [x] Game 1 Play links to /game-1 using the activityEntrypoints registry.
- [x] /game-1 is an authenticated Game 1 entry view with return controls. It does not require a face upload or opening the avatar editor.
- [x] DormSpace Open links to /game-room/dormspace, which now exists on main and renders DP's DormSpaceGame.
- [x] The earlier "DP entry not supplied" dependency is no longer accurate: the route and the integration are now in the integrated code.
- [x] Activity opening controls are independent of the avatar-edit/save controls.

## Important completion boundary
The Game 1 screen explicitly says gameplay is not available yet. This issue and child #43 cover opening the Game 1 entry view, not completing UR-615–622 platform gameplay. Do not present its menu as three playable levels. Sonja integrates the DormSpace entry; DP retains ownership of dorm rendering, persistence, purchases and interactions. Wordle is excluded from the current release; its entry integration is required only if it is later included. Opening-failure recovery is SRS-607.3, not silently completed here.

## Vertical slice
Reuse the existing authenticated Game Room/account APIs and activity configuration. The Game Room renders only included activities, resolves their supplied route, and opens the matching entry page. Each destination checks the existing account session. This opening requirement requires no new SQL tables and no points award. Opening Game 1's menu does not start an attempt or count as qualifying participation.

## Existing child tasks
- #43 — Connect the Game Room control to Game 1.
- #44 — Connect the Game Room control to DormSpace.
A separate verification sub-issue records the integrated route/return/no-editor acceptance evidence, rather than burying it in a checklist.

## Code locations
[Entry registry](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/lib/game-room.ts), [activity opening links](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/game-room/game-room.tsx), [Game 1 entry](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/game-1/page.tsx), [DP DormSpace route](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/game-room/dormspace/page.tsx).

## Demo steps
From a signed-in Game Room, open Game 1 and return, then open DormSpace and return. Do not enter the avatar editor first. Show that Game 1 has an entry screen and be explicit that gameplay is not implemented. A completely new account with no avatar was not created by this audit; the no-editor dependency is checked by source and by opening directly from the normal page.

## Submission and audit evidence
- Original navigation/account integration: [merged PR #305](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/305), 8 October 2026.
- Navigation preferences, Game Room account loading/saving and activity entry integration: [merged PR #336](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/336), 13 October 2026.
- Additional avatar editor work: [merged PR #337](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/337), 13 October 2026. Avatar editing is supporting work; it is not silently added to this card's requirement.
- Submitted branch: [feature/srs-600-1-navigation-destinations](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/feature/srs-600-1-navigation-destinations).
- Code review baseline: [main at 3727169](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/3727169).
- Current validation on 13 October: 48 tests passed across navigation (25), Game Room API (18) and session API (5). These are automated component/API-handler tests, not a claim that all 48 used the hosted database.

## Completion rule
A merged PR and passing unit tests are evidence of implementation. The requirement is accepted after its stated behavior is verified in the integrated signed-in application. Keep the task history honest: these sub-issues were added during this board reconciliation; their creation/closure dates do not claim the code was written today.

## Course scope note
All five of Sonja's existing SRS cards are being reviewed and separated into sub-issues at her request. The supplied assignment says exactly one SRS item is the formal Sprint 1 selection; including all five here does not erase that instruction. Confirm the formal demo/submission item with the instructor. No teammate's issue or feature ownership is changed.
