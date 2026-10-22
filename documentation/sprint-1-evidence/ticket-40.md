Owner: Sonja Seferasi (SS)
Backlog priority: 3 — depends on #38 and #39.

## Exact SRS requirement
When a navigation destination becomes the current section, the system shall mark only that destination as selected.

Traces to: UR-600.

## Exact acceptance criterion
Given Home is selected, when Events and Trending opens, then Events and Trending is selected and Home is no longer selected.

## Already implemented
- [x] isCurrentDestination derives selection from the actual pathname.
- [x] Home matches only /; other sections support their own nested routes.
- [x] Similar names such as /events-other do not accidentally select /events.
- [x] Selected links use aria-current="page" and the shared selected styling.
- [x] The header Profile action is selected on /profile; sidebar destinations are not simultaneously selected for Profile.
- [x] Unit tests verify one selected sidebar item, nested routes, the header Profile indicator and the transition to Events and Trending.

## Vertical slice
This is transient route-derived UI state, not a persisted database setting. The database/API requirement is the existing authenticated shell, shared with #38; no selected-section column or new backend endpoint should be invented. The router supplies the current path; the navigation component updates the visual and accessible state; the test suite checks exact/prefix matching and exclusive selection.

## Code locations
[Selection helper](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/lib/navigation.ts), [rendered link state](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/navigation/social-navigation.tsx), [navigation styling](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/navigation/social-shell.module.css), [tests](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/__tests__/navigation.test.ts).

## Integrated acceptance checks
Open Home, switch to Events and Trending, and confirm the old indicator is removed. Open Messages and Game Room, then Profile, and confirm exactly one destination indicates the current section across the sidebar/header. Enter Game 1 and return to Game Room; the shared indicator should be Game Room again. A passing source-level test is not a screenshot of this integrated browser behavior.

## Excluded work
Theme preferences, navigation position persistence, unread badges, gameplay and teammate page internals are not added to this requirement.

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
