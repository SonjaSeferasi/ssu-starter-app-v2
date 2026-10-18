Owner: Sonja Seferasi (SS)
Backlog priority: 2 — depends on the shared destinations in #38.

## Exact SRS requirement
When a student selects a navigation destination, the system shall open its corresponding page from the navigation destination table.

Traces to: UR-600.

## Exact acceptance criterion
Given each destination in the navigation table, when it is selected, then its corresponding page opens; Profile opens the signed-in student's own profile.

## Implemented route mapping
| Required destination | Current control | Route | Existing page integration |
| --- | --- | --- | --- |
| Home | Campus Feed / SocialU home | / | Existing campus feed supplied by MS |
| Messages | Messages | /messages | Existing conversation list supplied by LP |
| Game Room | Game Room | /game-room | Sonja's authenticated Game Room |
| Profile | Your profile header icon | /profile | Signed-in student's own profile supplied by LN |
| Events and Trending | Events and Trending | /events | Combined section page; links to KB's event-creation workflow |

- [x] Real Next.js links use the mapped routes rather than dead # links.
- [x] Profile uses /profile, not another student's URL or a hard-coded profile ID.
- [x] Page access reuses the integrated session/profile checks.

## Scope boundaries
This card connects navigation to supplied pages. It does not claim completion of all chat, feed, profile, event or Trending internals. In particular the /events page still states that campus events and Trending content will be available as those features are implemented; /events/create exists separately. Those teammates' features must not be marked complete through this ticket.

## Vertical slice
Reuse existing account/profile data and /api/auth/session; add no routing table to SQL. Shared UI links open the existing App Router pages. Verify the five targets in one signed-in browser session and confirm that Profile is the current account. Tests check route targets and shared-shell eligibility. The own-profile data boundary remains enforced by LN's profile API, not a user-supplied student ID in navigation.

## Code and dependencies
[Navigation](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/navigation/social-navigation.tsx), [destination registry](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/lib/navigation.ts), [own Profile page](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/profile/page.tsx), [Messages](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/messages/page.tsx), [Home](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/page.tsx), [Events and Trending](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/events/page.tsx).
Dependencies: #38 and the supplied route entry pages. Sonja owns linking, not their full feature implementation.

## Demo steps
Start from Game Room, select each required destination, show its route and named view, and return. Select the Profile header icon and verify it opens the signed-in student's own profile. Record any actual destination error separately; do not call unrelated unfinished content a navigation success or failure.

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
