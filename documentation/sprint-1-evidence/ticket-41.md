Owner: Sonja Seferasi (SS)
Backlog priority: 4 — activity presentation depends on signed-in navigation and Game Room access.

## Exact SRS requirement
When a signed-in student opens the Game Room, the system shall display an entry for each included activity containing its name, description, and opening control.

Traces to: UR-607.

## Exact acceptance criterion
Given Game 1, Wordle, and DormSpace are included, when the Game Room opens, then each has a correctly labeled description and opening control.

## Already implemented
- [x] GameRoom loads account-bound data from GET /api/game-room.
- [x] The API derives the provider identity from the token and requires a linked eligible account.
- [x] Activity records supply the name, description and included flag; the component filters entries by included.
- [x] Included Game 1 and DormSpace have activity cards and labeled opening controls.
- [x] The opening-control registry is separate from the card content.
- [x] Wordle is optional and excluded from the current default activity list. The conditional acceptance criterion applies to Wordle only if the release config includes it.

## Vertical slice
Database: existing socialu.activities contains activity_code, name, description, instructions and included. Server: service-role-only Game Room RPCs return this configuration after verifying account linkage; the browser never chooses the acting student. API: GET /api/game-room returns the room/configuration and handles account/storage failures. UI: GameRoomContent maps included records into named cards with descriptions and links. Tests: Game Room API handlers cover session/linkage/permission boundaries and missing-setup handling.

A missing integration can show a prominently labeled temporary sample design. Such a preview is not evidence that hosted account data was returned. The live review must show the authenticated normal page, without relying on an unsaved preview notice. Database deployment claims in the implementation notes are historical records; this issue audit does not rerun migrations or modify the shared project.

## Code and data evidence
[Game Room component](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/game-room/game-room.tsx), [GET API](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/api/game-room/route.ts), [server bridge](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/lib/game-room-server.ts), [activity/control types](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/lib/game-room.ts), [Game Room integration migration](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/supabase/migrations/20261009000100_game_room_navigation.sql), [API tests](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/__tests__/api/game-room.test.ts).

## Demo and exclusions
Sign in, open Game Room, show each included activity's name/description/control and explain why excluded Wordle is absent. Presentation is this card; actual entry integration is #42. Avatar customization, photograph processing, three playable levels, participation, rewards and purchases are separate requirements; none is claimed complete merely because this page renders.

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
