# Navigation SRS fixes — November 17, 2026

Owner: Sonja Seferasi (SS). Original working folder: C:\Csc 351\ssu-starter-app-v2.
Branch at implementation: sonja/game-room-change-descriptions; baseline HEAD feffee7e.
Status: implementation and evidence prepared for the user-authorized branch publication. This record describes local validation; pushing does not establish deployment or live acceptance. The GitHub issue publication comments record the resulting commit. Other pending changes were preserved.

## GitHub records

All three issues are assigned to SonjaSeferasi and included in the SocialU project. Each includes the requirement, original problem, expected behavior, local implementation, testing evidence, and remaining acceptance. Final results and screenshots are appended as comments. Issues remain open.

| SRS | Issue | Change |
| --- | --- | --- |
| 601.3 | https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1301 | Remove Profile-only mobile navigation geometry overrides so shared Side/Bottom/Top placement and content clearance apply. |
| 603.1; regression 603.2 | https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1302 | Messages navigation sums unread_count across private/group conversations; excludes invitations; displays full total; hides at zero. Header notification semantics preserved. |
| 604.1–604.3 | https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1305 | Shared Create dialog with Text Post, Photo Post, Event, Cancel; existing publishing workflows reused. |

## Code locations and rationale

- components/navigation/social-shell.module.css: remove Profile mobile position/layout overrides, keep compact visual styling; add responsive Create dialog styles and focus indicators.
- components/chat/message-notifications.tsx: countUnreadMessages helper and opt-in unreadMessagesOnly mode. Other callers retain existing notification-count behavior.
- components/navigation/social-navigation.tsx: use unread-only mode on Messages; native modal dialog for Create, keyboard Escape/focus behavior, links to /#create-text-post, /#create-photo-post, and /events/create.
- components/feed/FeedPage.tsx: creation fragments select the public feed composer even when another tab was active.
- components/feed/PostComposer.tsx: text/photo fragment focus targets; keyboard-accessible photo button activates existing file input. Same-page choice switching preserves the draft. Publishing, privacy selection, image processing, and Event submission are unchanged.
- __tests__/navigation.test.ts: scope destination assertions to navigation list; verify creation links and initially closed dialog.
- __tests__/navigation-unread-messages.test.ts: totals, zero/null, and updates.
- scripts/tests/navigation-srs.browser.cjs: isolated browser regression using intercepted API fixtures.

## Verification

Final focused Vitest run: **76 passed, 5 files** (28 navigation, 3 unread totals, 4 message-notification API, 1 navigation database constraint, 40 game-room API). Existing negative-case game-room error logs are expected fixtures.

```powershell
& .\node_modules\.bin\vitest.cmd run __tests__/navigation.test.ts __tests__/navigation-unread-messages.test.ts __tests__/api/message-notifications.test.ts __tests__/database/navigation-placement.test.ts __tests__/api/game-room.test.ts --maxWorkers=2 --minWorkers=1 --reporter=dot
```

Focused TypeScript check of the changed navigation/chat/feed components and their dependency graph: **0 diagnostics**. This is not a claim of a full production build or entire repository test pass. Targeted git diff whitespace check passed.

Local Microsoft Edge browser: **9 checks passed, zero uncaught page errors**, recorded verbatim in results.json:

1. Bottom fixed to viewport bottom on Profile at 390px.
2. Same at 640px.
3. Same at 1280px.
4. Side/Top/Bottom switching and reload using fixture preference.
5. Four private plus seven group unread messages produces 11; invitation excluded; bell remains three entries.
6. Zero unread messages hides badge despite pending invitation.
7. Escape and Cancel retain page; Escape returns focus to Create.
8. Text composer focus, working photo chooser, and draft retention when switching choices.
9. Event opens existing creation form.

The browser test requires a running local Next server. Set SOCIALU_TEST_URL, SOCIALU_PLAYWRIGHT_MODULE to an installed Playwright module, and optionally SOCIALU_BROWSER_EXECUTABLE to Edge; run `node scripts/tests/navigation-srs.browser.cjs`. It intercepts API requests and supplies dummy account data; no real post/event is submitted. Local test server used port 3036 and was stopped after the run.

Early browser attempts failed because test fixtures omitted campus-member and event-invitation response fields. Fixtures were corrected, and the final run passed. The screenshot files depict the actual locally rendered application after the fixes, not a production or before-fix reproduction.

## Evidence files

- profile-bottom.png: 390px Profile view, navigation at bottom; Messages 11 and separate bell 3.
- create-menu.png: actual open Create menu.
- results.json: all nine successful browser assertions.
- github-verification.jpg: published GitHub verification comment with its screenshot.

## Remaining release acceptance

- Publish only the intended implementation changes with a reviewed commit/PR and link it on each issue.
- Verify deployed preference persistence with a signed-in account.
- Coordinate real private/group message arrival and read-state testing with the chat owner; no hosted two-account test was performed.
- Verify deployed Text Post, Photo Post, and Event workflows before closing the issues.

## Publication scope

The commit includes the previously requested Top-placement support needed to preserve the tested navigation behavior: preference API validation, client preference loading, NavigationPosition type, fresh schema constraint, and 20261117050000_top_navigation_preference.sql. The migration preserves the deployed function body and fails atomically for unfamiliar validation. Its presence in Git is not proof it ran in production.

Unrelated streak, Japan, World Explorer, and SRS-document edits remain outside this commit. The test logs below record a fresh pre-push run.
