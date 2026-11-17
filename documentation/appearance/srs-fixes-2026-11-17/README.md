# Appearance and Game Room background — November 17, 2026

Owner: Sonja Seferasi. Original project: `C:\Csc 351\ssu-starter-app-v2`.
Branch: `sonja/game-room-change-descriptions`. Baseline: `b79152db6e8548af0c1978bb02fc99a14c7e08f8`.
Status: publication validation complete; see publication evidence below. Keep acceptance issues open pending signed-in and visual acceptance.

GitHub records: [appearance implementation and evidence on #923](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/923#issuecomment-6940957627), cross-referencing the existing SRS-627 issues; [background requirement #1310](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1310), assigned to SonjaSeferasi in SocialU Product Backlog. `github-record.jpg` confirms the created background issue. The text records were published; code and local screenshots have not been pushed/uploaded by this batch.

## Requirement traceability

| SRS | Implementation | Existing issue |
| --- | --- | --- |
| 627.1 | Preferences offers Light and Dark with selected-state indicators. | #926 |
| 627.2 | Accounts without a saved appearance receive Light. | #927 |
| 627.3 | Shared appearance changes immediately without replacing route content or losing its draft. | #924 |
| 627.4 | Authenticated GET restores the account's saved appearance; account changes abort obsolete requests and reset the displayed preference. Failed loads offer Retry. | #925 |
| 627.5 | One provider above route content retains appearance across authenticated pages, including standalone games. | #928 |
| 627.6 | Scoped CSS themes selected game menu/dialog/control surfaces. No rendering-engine changes, image filters, gameplay values, or artwork replacement. | #929 |
| 627.7 | A failed save identifies the displayed choice as unsaved and offers Retry. | #930 |
| 627.8 | Retry resubmits the failed Light/Dark choice. Overlapping interactions are disabled during requests. | #931 |
| 627.9 | Choosing appearance starts a save; no separate Save button. | #923 |
| 629.3 | Campus Day / Adventure Sky is remembered on this device; corrupted data falls back to Campus Day; unavailable browser storage produces an explanatory message. | #1310 |

## Implementation details

- `components/navigation/appearance-preferences.tsx`: stable provider, initial read, automatic save, failed-choice retry, account/storage events, cancellation, controls and root appearance attribute.
- `app/api/preferences/appearance/route.ts`: validated GET/PUT; verified email/session; owner derived from the verified token, never from a submitted student ID; no-store responses; missing migration returns an explicit setup error.
- `supabase/migrations/20261117070000_appearance_preferences.sql`: service-only `socialu_appearance` RPC, active-account check through `socialu_account`, existing `student_preferences.theme`, Light default, atomic upsert of theme only. Navigation placement is preserved. Anonymous and authenticated roles cannot execute the privileged bridge.
- `social-shell.tsx` / `social-navigation.tsx`: provider and Preferences integration. Explicit account appearance controls navigation colors independently of decorative screen backgrounds.
- Navigation, Game Room and scoped game CSS: readable Dark surfaces; Game Room illustrations and selected backgrounds retain their artwork. The shared CSS touches DormSpace controls only, not its gameplay logic.
- `components/game-room/room-background.tsx`: per-device localStorage key `socialu.game-room.background`. Only two allowlisted values; no account or gameplay requests. `game-room.tsx` connects its selector and background attribute. Adventure Sky reuses the repository's sky artwork.

## Verification

**86 tests passed in 5 files**, recorded in `unit-tests.txt`:

```
npx vitest run __tests__/api/appearance-preferences.test.ts __tests__/database/appearance-preferences.test.ts __tests__/api/game-room.test.ts __tests__/navigation.test.ts __tests__/database/navigation-placement.test.ts
```

The database tests apply the actual migration in disposable PGlite. They verify default Light, retained Dark, different-account isolation, preserved navigation placement in both update directions, invalid input rejection and role permissions. API tests cover verified ownership, revoked/unverified sessions, input validation, missing setup, storage failure and malformed storage output. Existing Game Room and navigation tests remain passing.

**11 browser checks passed with zero uncaught page errors**, in `results.json`. Runner: `scripts/tests/appearance-srs.browser.cjs`. This is the real local Next application in headless Microsoft Edge with intercepted API fixtures. The tests verify automatic saves, retained draft, failed-save Retry, route navigation, independent browser-context account preference loading, account switching, failed initial loading, device-local background restoration, corrupt-value fallback and a 390px layout. Jumpyland's instructions change colors without closing the dialog; the canvas dimension/filter check is limited and does not establish visual correctness for every gameplay state.

**Focused TypeScript: 0 diagnostics**, in `typecheck.txt`. Scope: new API/provider and the navigation/Game Room dependency graph. Targeted whitespace check passed. No full-repository build or full test-suite result is claimed.

An initial browser attempt had incomplete streak fixture data and failed before the Game Room checks. The fixture was corrected without changing streak code. Visual inspection then found low contrast on Game Room cards; scoped CSS was corrected and the final browser run passed. The temporary test server was stopped after each run.

## Screenshot evidence

- `dark-preferences.png`: real local Preferences with Dark selected and the retained draft.
- `save-failure.png`: intentionally failed local fixture request, unsaved Light message and Retry.
- `adventure-sky-dark.png`: selected Adventure Sky with Dark Game Room panels. The test fixture is not a full account/avatar or all-games acceptance record.
- `background-mobile.png`: chooser at 390px.
- `jumpyland-dark-menu.png`: actual local instructions dialog in Dark mode.

No screenshot represents hosted persistence, a student's account, or physical-device testing.

## Release checks still required

1. Review/publish this batch on the existing branch and link the resulting commit/PR. Do not include unrelated pending streak, Japan, World Explorer logic or SRS document changes.
2. Apply the appearance migration to the intended hosted database; verify the service-role bridge and normal signed-in GET/PUT. This batch did not use or modify hosted credentials/data.
3. Verify real account save, reload, sign-out/sign-in and a second physical device. The separate browser-context check uses a fixture, not hosted storage.
4. Finish visual acceptance of Light/Dark across Profile, Messages, Events and all menus/gameplay states in DormSpace and World Explorer, including keyboard/touch and contrast. Scoped game CSS alone is not evidence of every visual state.
5. Keep the SRS issues open until their deployment and acceptance requirements are met.

## Remaining work outside this batch

- SRS-612.4 weekly participation row and SRS-614.1–614.5 outside-game streak reminders/dismissal.
- SRS-630.1–630.4 accepted-friend presence and visibility controls, with friendship/block integration and a 90-second timeout.
- Existing gameplay/country items still require their recorded acceptance evidence; existing user edits were preserved.
- Wordle (623–626) and photo background removal (609.14–609.16) are conditional in the document and are not claimed as completed or included here.

Earlier navigation and avatar changes remain separate published batches. This report does not claim every remaining Sonja SRS is finished.

## Publication verification — November 17

- Re-ran all 86 focused tests: passed (`publication-unit-tests.json`).
- Re-ran 11 Edge checks: passed, no page errors (`publication/results.json`). Presence heartbeat requests are separately recorded as `presenceWrites`; background selection must still produce no account/game/points/avatar mutation. The initial rerun caught the new presence heartbeat in the old broad write counter; only the test fixture was updated.
- Indexed publication tree: zero TypeScript diagnostics (`publication-typecheck.txt`).
- Desktop Dark/Adventure Sky screenshot visually inspected. Calendar in this appearance fixture has no configured data; the visible retry is not a hosted failure. Full calendar coverage belongs to the streak batch.
- Hosted appearance migration installation and signed-in verification are recorded separately in GitHub; a branch push does not deploy the web application or satisfy physical-device acceptance.
