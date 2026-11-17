# Game Room, World Explorer, and navigation change descriptions

Recorded November 17, 2026. This document covers the three recent updates requested by Sonja. It separates implementation, database installation, automated checks, and live acceptance. A published description does not mean all described code has been released.

## Release status at the time of this report

| Change | Application code | Database | Remaining acceptance |
| --- | --- | --- | --- |
| World Explorer uses the saved Game Room avatar | Pushed and merged into `main`; implementation `69140990`, merge `9db8a1ad` | Uses the existing avatar data; no new migration | Signed-in visual comparison with the student's saved appearance |
| Top navigation preference | Implemented locally; not yet committed, pushed, or merged | The Top constraint/function update was applied and verified in the connected Supabase project | Signed-in browser save and reload, then publication of application changes |
| Daily reward and flame celebration follow-up | Initial streak feature has PR #1276; the later celebration, reward-response, and error-handling changes remain local | The 10-point daily reward update was applied and verified earlier in this session | Publish the remaining application changes and confirm the complete signed-in play/reward flow |

This documentation commit publishes descriptions only. It does not include the pending navigation or streak application changes.

## 1. World Explorer: use the saved Game Room avatar

### Problem and resulting behavior

World Explorer previously created the same fixed student character for every player. Selecting and saving a different avatar in the Game Room did not change the character used in a country level.

Signed-in runs now load the saved Game Room appearance before creating the level. The actual controllable character uses the existing shared 3D avatar renderer, and the route-progress portrait uses the saved appearance too. This is a 3D interpretation of the Game Room figure, rather than the painted figure being pasted into the level.

### Implementation

- `lib/world-explorer/avatar.ts` loads the account's Game Room data for each attempt without caching another account's appearance. Visitors can still play with the existing guest character.
- `components/world-explorer/country-run.tsx` waits for the avatar, scenery, and renderer before mounting the run. Abandoned or timed-out avatar requests are cancelled. A failed signed-in avatar load produces an error and retry flow instead of silently substituting the fixed character.
- `components/world-explorer/explorer-character.ts` reuses the shared 3D model and its saved outfit, hair or hijab, skin, body shape, and supported face details.
- `components/world-explorer/country-scene.ts` keeps the existing movement joints and normalizes visual height to the gameplay height. Cleanup removes the avatar safely without disposing geometry shared with another run or DormSpace.
- The pause dialog displays notices when a saved feature has no supported 3D equivalent. Photo faces are not converted into custom 3D faces.

### How to use and verify

1. Sign in and open the Game Room.
2. Choose an appearance and select **Save Look**.
3. Start or restart a World Explorer level.
4. Compare the playable character and route portrait with the saved selection.
5. Save a different look and begin another attempt; the new attempt should load the new selection.

Appearance changes take effect on the next attempt, rather than rebuilding the player during an active run.

### Validation and evidence limits

68 focused tests passed across avatar loading, avatar model/style, World Explorer simulation, and session-refresh coverage. The tests cover representative male, female, and hijab selections, saved skin/body overrides, animated joints, account changes, request errors, cancellation, and shared-geometry cleanup. TypeScript checks passed with zero diagnostics, including a check of the isolated staged version.

The local Japan level rendered successfully in a guest browser session. That is evidence that the level still opens, not proof of a live signed-in avatar comparison. That comparison remains outstanding.

Implementation: [69140990](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/69140990e37145a40123ddad9b5a102b267e11d3). Merge into main: [9db8a1ad](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/9db8a1ad9dc8917e49f2df0fe049fde5fe8000f3).

## 2. Preferences: add Top navigation placement

### Problem and resulting behavior

Preferences previously offered only **Side** and **Bottom**. The new **Top** choice places the campus navigation horizontally below the header, removes the sidebar space from the content area, and keeps the menu visible at the top after the header scrolls away.

On narrower screens, icons and labels form a compact row. The Preferences panel opens below that row and remains within the viewport. Existing background themes continue to style the navigation.

### Implementation

- Extend `NavigationPosition` in `lib/game-room.ts` to include `top`.
- Add the Top button and its selected state in `components/navigation/social-navigation.tsx`.
- Restore `top` from the saved account response in `components/navigation/social-shell.tsx`.
- Accept only `side`, `bottom`, or `top` in `app/api/preferences/route.ts`. The authenticated account still determines whose preference changes; caller-supplied student IDs are not used.
- Add desktop and mobile layout rules in `components/navigation/social-shell.module.css`, including overrides so mobile profile layout rules do not override an explicit Top selection.
- Add `supabase/migrations/20261117050000_top_navigation_preference.sql` and update the schema definition to allow the new value.

### Database rollout

The deployed Game Room function differed from the repository's original copy. To preserve those existing changes, the migration modifies only its known navigation validation expression, rather than replacing the whole function with an older definition. It updates the table constraint in the same transaction and fails if the validation expression is unfamiliar.

The migration was applied to the connected database. Follow-up metadata checks confirmed:

- The function accepts Top.
- The table allows Side, Bottom, and Top.
- The rest of the deployed function body is unchanged.
- Existing function execution permissions remain unchanged.

The migration file must accompany the eventual code release so other environments can receive the same update. Its presence in the repository alone is not evidence that another environment has been migrated.

### Validation and how to verify

40 API tests and one real PostgreSQL-compatible database test passed; the database test was rerun successfully after refining the migration. These checks cover valid and invalid placements, authenticated ownership, preservation of existing preferences, reading back saved values, isolation between accounts, and database permission restrictions. TypeScript validation returned zero diagnostics.

The development preview was visually checked at desktop and 390-pixel phone widths. Top moved the menu and left all placement choices reachable. This preview intentionally does not save account data.

For live acceptance, sign in, select **Preferences → Navigation placement → Top**, reload, and verify Top remains selected. Repeat with Side and Bottom to confirm switching back works. The application changes are still local at the time of this report.

## 3. Daily participation: reward feedback and flame celebration

Related issue: [#1179 — Game Room participation streak](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1179). Initial implementation: [PR #1276](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1276). This section distinguishes that initial feature from the later local follow-up changes.

### Requested experience and implemented behavior

Qualifying participation should show a real streak and a 10-point daily reward, followed by a flame message inviting the student to return tomorrow. The values must come from confirmed account data rather than demonstration numbers.

The daily participation reward is shared across qualifying activities: repeated play or visiting both DormSpace and World Explorer on the same participation day must not award another daily reward. DormSpace and World Explorer have separate rankings based on their qualifying activity history; they are not separate daily point balances.

The World Explorer request currently runs when an authored level reports ready, not only when the player completes it. Review mode does not record participation. The celebration is shown in the Game Room streak card and, in the local World Explorer follow-up, on the completion panel after a successful reward-status response. It is not an immediate modal on every level start.

### Local follow-up changes

- `components/game-room/streak-celebration.tsx` and its stylesheet add the illustrated flame, confirmed streak count, earned-today points, and the invitation to return tomorrow.
- Celebration rendering requires both confirmed qualification and positive earned-today points. Pending or failed requests do not display a success reward.
- `lib/game-participation-client.ts` records participation, refreshes shared points listeners, then reads the confirmed participation status for the UI.
- `components/world-explorer/country-run.tsx` tracks saving, success, and failure states and exposes a daily-reward retry on the completion panel.
- `lib/game-participation-server.ts` reports a clearer setup error if the database participation function is missing.
- The local participation migration follow-up establishes the 10-point rule while retaining historical ledger entries. The existing daily uniqueness rule prevents duplicate daily rewards.

### Database evidence and release limitations

Earlier in this work session, the hosted reward update was applied and a transaction-scoped check verified a balance change from 0 to 10 with exactly one reward after three play requests. That check was rolled back; its test activity and points were not retained. This is database behavior evidence, not a claim that every browser flow has been accepted.

The current workspace includes client and database tests for these follow-up changes, but the later celebration and error-handling changes have not been included in the avatar merge. Do not mark them released solely because PR #1276 exists or the database update is installed.

Before publishing the follow-up, verify the exact committed version, then check the signed-in flow: qualifying play, confirmed points refresh, correct flame count, no duplicate reward on replay, and appropriate behavior on a failed save. Use the established account participation timezone when checking a later day.

## Description format for subsequent GitHub changes

Each subsequent change description should record the user-visible problem and result, the exact scope, affected screens or services, saved-data or migration effects, test commands/results, manual reproduction or acceptance steps, known limitations, and publication status. Link the relevant SRS or issue when it is verified; do not invent an SRS number for a new request. Attach screenshots only when they show the actual implemented behavior, and label development fixtures as previews.

Keep pending work distinct from what a commit or PR actually contains. Record branch, merge, database, and deployed application status separately so another team member can tell what is ready to use.
