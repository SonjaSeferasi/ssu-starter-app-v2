Owner: Sonja Seferasi (SS)
Backlog priority: 1 — shared navigation is the entry point the other four cards depend on.

## Exact SRS requirement
When a signed-in student opens a page outside Game 1 or Wordle, the system shall display the five destinations in the navigation destination table.

Traces to: UR-600.

## User requirement
As a student, I want the navigation bar to identify my current section and provide access to Home, Messages, Game Room, Profile, and Events and Trending, so that I can recognize where I am and move to the section I need.

## Exact acceptance criterion
Given the student opens the Game Room, when navigation appears, then all five destinations are present, with Events and Trending represented by one item.

## What is already implemented
- [x] Shared shell and navigation are committed and merged; this is not merely an uncommitted Visual Studio preview.
- [x] The application has links for Home/Campus Feed (/), Messages (/messages), Game Room (/game-room), Events and Trending (/events), and own Profile (/profile).
- [x] The shell uses the existing verified, linked-account session check; no new navigation table or duplicate login mechanism is needed.
- [x] Game 1 and Wordle routes hide the global shell.

Current layout detail: Home is labeled Campus Feed in the sidebar, and Profile is a header icon labeled Your profile. Sniping and Invitations are non-navigable placeholders. These details are recorded rather than pretending the current layout has five literal sidebar rows. The running-application review must show all five required destinations; any request to change the exact naming/layout should be coordinated with the SRS rather than silently changing its text.

## Vertical slice and ownership
Database layer: reuse the existing auth.users-to-socialu.students/profile linkage. API layer: /api/auth/session verifies the signed-in account; the shared shell consumes it. UI layer: SocialShell, NavigationFrame and SocialNavigation display the shared controls. Test layer: navigation rendering/route eligibility and session authorization checks. No schema change is required by this read-only navigation requirement. Sonja owns the navigation integration; LN retains account feature ownership.

## Code locations
- [lib/navigation.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/lib/navigation.ts)
- [shared navigation](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/navigation/social-navigation.tsx)
- [session-aware shell](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/components/navigation/social-shell.tsx)
- [session API](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/app/api/auth/session/route.ts)
- [navigation tests](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/3727169/__tests__/navigation.test.ts)

## Demo steps
1. Sign in with a verified university account.
2. Open Game Room in the integrated app.
3. Point out all five destinations, including the header Profile icon and the single combined Events and Trending item.
4. Open Game 1 and confirm the global navigation disappears; return to Game Room and confirm it returns.
5. Show the linked merged PR and the screenshot attached to this issue.

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
