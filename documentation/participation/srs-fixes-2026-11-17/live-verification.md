# Signed-in publication checks — November 17, 2026

Environment: original working checkout at `http://127.0.0.1:3027`, using the existing hosted Supabase project. The user signed into their own account. These checks did not use intercepted API fixtures or manually alter participation/point records.

## Observed results

- Game Room loaded a two-day shared streak, qualified today, three forgiven misses remaining, and the America/New_York calendar for November 15–21. November 16 and 17 were Played; future dates were Upcoming.
- The flame celebration displayed the confirmed `+10 points earned today` and return-tomorrow message. The header balance remained 20 points during preference checks. This verifies reading an existing reward, not newly issuing a reward for this test.
- The World Explorer leaderboard showed the signed-in account with two days. No new leaderboard/participation rows were manufactured for verification.
- Appearance initially loaded Light. Choosing Dark finished without an error; after a full reload, Dark was selected and enabled. The original Light choice was restored and verified after another reload. Navigation remained Top.
- Adventure Sky survived a full reload. The original Campus Day background was restored.
- Screenshots: `live-account-streak.jpg` and the appearance folder's `live-dark-restored.jpg`. The Dark screenshot was taken while the independent streak fetch was still loading; subsequent reads completed as described above.

## Hosted installation

- `socialu_appearance(uuid,text)` and `socialu_participation_calendar(uuid,date)` were missing, then installed using the published migrations through the signed-in SQL editor. Both queries completed successfully.
- The live daily reward was already 10 points. The hosted participation function matched the published function body after removing comments/whitespace. It already included idempotent recovery and `earnedPointsToday`; it was not replaced unnecessarily.
- All three public functions allow `service_role` execution and block `anon` and direct `authenticated` execution. Screenshot: `hosted-function-permissions.jpg`.

## Limits and separate findings

- These are local application checks against hosted storage, not a production web deployment or a main-branch merge.
- A second physical device, real midnight rollover, an actually at-risk account's dismissal, a new live daily reward, and full World Explorer completion/retry remain acceptance checks. Automated fixtures cover those selected state transitions without pretending to be live evidence.
- The existing Friends playing now panel reports that its separate database update is missing. This is the presence batch (#1312), not a failure of the appearance/calendar migrations.
- At the observed approximately 1080-pixel viewport, Top navigation visually overlaps the Create label with Game Room. Record this as a navigation layout follow-up; it does not prevent the demonstrated appearance save/reload or streak read.
- The user confirmed that World Explorer is the active game focus and Jumpyland development has stopped. Further game verification should prioritize World Explorer.
