# Navigation and Game Room: first implementation

Branch: `feature/navigation-game-room`. Sources: `SocialU_SRS_Editable.md`, `user_requirements.md`, `database/schema.sql`, `database/schema_review.md`, and `UI design/WhatsApp Image 2026-09-22 at 12.04.13 PM (9).jpeg` (with (2) as an alternate reference).

## Review locally

Run `npm run dev` and open `http://localhost:3000/dev/game-room`. The development-only page contains temporary cartoon faces and complete outfits approved by Sonja for visual review. Select Face/Outfits to preview an appearance; open Preferences to switch Side/Bottom. Samples do not write account data or grant catalog ownership. The preview returns 404 in production.

The authenticated page is `http://localhost:3000/game-room`. It uses the verified student identity and existing SocialU tables rather than the preview samples.

The sample characters use three generated, transparent, semi-realistic sprite sheets inspired by the supplied campus avatar design: `public/avatars/student-realistic-v1.png`, `student-female-v1.png`, and `student-hairstyles-v1.png`. Columns represent the three complete outfits; rows represent face/hairstyle variants. The Face editor has Male styles and Female styles filters and enlarged head previews. Male choices include short waves, full curls, waves with glasses, crew cut, side part and locs. Female choices include long waves, high ponytail and curly bob. All nine styles work with every sample outfit. These are presentation choices, not account gender fields. No schema, ownership or catalog seed data changed; these remain development samples pending catalog approval.

## Requirement coverage

| Requirement | This increment |
| --- | --- |
| SRS-600.1–600.3 | Retains all five destinations, page routing and one current-section indicator. |
| SRS-601.1–601.7 | Adds Side/Bottom control, immediate placement, account storage bridge, load failure and save Retry. Durable storage requires the new migration. |
| SRS-602.1–602.2 | Existing game routes hide the shared shell; returning to the Game Room reloads account placement. The Game 1 entry view is now built; gameplay views remain separate tasks. |
| SRS-607.1 | Activity names/descriptions read from existing configuration. Only included activity cards are shown. The Game 1 control opens `/game-1`; DormSpace waits for DP's supplied entry route. Wordle remains optional and has no entry integration in the selected GitHub scope. |
| SRS-608.1–608.6; 610.1; 611.1 | Face/outfit selectors, immediate preview, automatic saves, last confirmed appearance on failure and Retry. The server only accepts owned outfits and provided faces. |
| SRS-607.4; 610.2 | Default and saved avatar interfaces prepared; application to Game 1 awaits gameplay implementation. |

## Database integration

`supabase/migrations/20261009000100_game_room_navigation.sql` adds one narrow, service-role-only RPC over the existing tables. It creates no tables, alters no columns and seeds no catalog items, default faces, prices or rewards. It reuses the account bridge for verified university identity and account eligibility. It can grant only the catalog's explicitly configured initial outfit; other outfits require existing ownership.

This migration has not been applied to the shared Supabase project. Until applied, the signed-in Game Room opens the existing sample design with a prominent preview notice and temporary face/outfit selections. The server identifies a missing Game Room RPC as GAME_ROOM_SETUP_REQUIRED; only that outcome allows the preview. Permission, account and unrelated network/storage failures remain errors. Retry account connection reloads real account data and restores normal saves when the integration becomes available. Preview changes never send avatar-save requests, grant item ownership or update participation. Actual initial faces/outfits and their approved artwork must be configured before avatar persistence can be reviewed end to end. Cartoon sample keys are development artwork, not approved shared catalog data. Other asset keys currently render a generic character placeholder; saved photograph rendering is not connected.

## Still to implement

Unread-message integration (UR-603), team-supplied creation workflows (UR-604), photograph/camera/cropping (UR-609), the real shared participation status (UR-612–614), Game 1 (UR-615–622), and optional Wordle (UR-623–626). The Game Room contains no invented streak count, player totals, points balance, prices, leaderboard or rewards. Gameplay movement/jumping/pause will run in the browser. Opening the Game Room or preview does not count as qualifying participation. DP retains ownership of points and purchases.

## Validation

API boundary tests cover verified identity, missing linked accounts, unowned outfit rejection, invalid IDs and navigation placement validation. TypeScript checking and the Next.js 16.4.0 production build pass. The local development preview returns HTTP 200; an unauthenticated Game Room API request returns HTTP 401. Browser automation is currently unavailable, so visual layout and click-through verification remain pending. The SQL migration has not been executed or validated against PostgreSQL in this increment.

## Navigation connection - 13 October 2026

The main Game Room link remains `/game-room`, inside the authenticated shared navigation. It now exposes the existing nine-style, three-outfit design when the account-saving bridge is missing, so the design is accessible from the normal application rather than only `/dev/game-room`. These are explicitly temporary sample choices, not a completed account-persistence feature. No SQL migration or catalog seed was applied. Read-only hosted function metadata confirmed that the account RPC exists and the Game Room RPC is absent.

Validation for this connection: 63 account/Game Room/navigation tests passed; TypeScript passed. An isolated browser test opened Game Room from the navigation, loaded the existing artwork, changed the female face and outfit, confirmed zero preview-save requests, and verified retry/recovery to real-ID account saves using mocked API responses. Permission and unrelated storage errors remained errors. This does not claim that hosted avatar persistence was tested.

## Selected GitHub project scope - 13 October 2026

Sonja clarified that this increment must implement only her posted GitHub project issues, rather than every SS requirement in the full SRS. Repository issue searches by assignee and by the owner text both returned #38-44. GitHub main was verified at 11c93d9. GitHub issue states were not changed; local validation is not a claim that teammates completed their dependencies.

| GitHub issue | Requirement | Local implementation and review boundary |
| --- | --- | --- |
| [#38](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/38) | SRS-600.1 | Shared five-destination navigation. Verified on authenticated application routes with isolated account fixtures. Game 1 has no global navigation. |
| [#39](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/39) | SRS-600.2 | Links open the existing Home, Messages, Game Room, Events and Trending, and own Profile routes. Home/Events internals remain their owners' placeholders; no replacement features were added. |
| [#40](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/40) | SRS-600.3 | Exactly one current section; correct selection returns after Game 1. |
| [#41](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/41) | SRS-607.1 | Included activities have names, descriptions and opening controls. Wordle is absent when excluded and presented when configured included. Hosted data still requires the existing Game Room integration. The fallback is visibly an unsaved design preview. |
| [#42](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/42) | SRS-607.2 | Partially integrated; keep open until every included activity's entry works. Game 1 entry is connected. DP's working DormSpace entry has not been supplied in this checkout/main. |
| [#43](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/43) | Task 607.2-1 | Game Room Play opens the authenticated Game 1 entry view at /game-1, including for an account with no avatar. Direct refresh checks the session; return restores Game Room navigation. Gameplay and default-character rendering are explicitly outside this issue. |
| [#44](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/44) | Task 607.2-2 | Blocked by DP's DormSpace entry workflow. The control remains unavailable with an explanation, without a fake route or a replacement DormSpace implementation. |

The integration registry is activityEntrypoints in lib/game-room.ts. When DP supplies the actual route, set its DormSpace href and verify the handoff with his implementation. Optional Wordle integration is added only if selected and implemented. Menus, notification badges, photo editing, streaks, full gameplay and theme work were not added to this increment because they are not in these seven project cards.

Sonja approved Campus hoodie as the initial outfit and the existing nine styles as provided faces. No catalog data was installed in this card-only increment; the approval is recorded for a future persistence increment.

Validation: 38 navigation/Game Room/session tests passed and TypeScript passed. Isolated browser checks verified all five destinations, inclusion-aware activity cards, Game 1 entry without an avatar, authenticated direct refresh, hidden global navigation inside Game 1, restored selection after returning, and denied signed-out access. APIs in that browser test were mocked; hosted saves and the missing DormSpace handoff are not claimed as passed.

## Hosted Game Room setup � 13 October 2026

Applied the server-only Game Room function and the approved starter collection to the existing Supabase project using SQL Editor. The deployed function is present in Data API metadata. No SocialU tables were reset or recreated. Starter configuration supplies one free Campus hoodie and nine default faces; other outfits were not granted.

The live app exposed a deferred ownership validation error (`42P01`, `point_transactions`). Added migrations to fix trusted schema lookup paths and qualify the purchase lookup explicitly. Free starter ownership now skips the purchase lookup; purchased ownership continues to require a matching student, item and purchase transaction. SQL Editor reported success for these corrections.

Validation: production build and TypeScript passed. Seven isolated database checks passed (persistence, account separation, unavailable selections, preferences, idempotency, 59-table preservation and server-only function permissions). Hosted SQL checks confirmed nine faces and server-role function execution. Full browser save-and-refresh verification remains pending because the browser session became signed out; a signed-in account is required. Changes are local and have not been committed or pushed.
