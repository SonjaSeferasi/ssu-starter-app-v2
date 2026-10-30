# SRS-124.1 — My Board implementation

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Traces to: [UR-124 and SRS-124.1](srs-addendum.md).
Status: In progress; prototype implemented and tested, live acceptance, screenshot and reviewed integration pending.

The profile has a My Board tab with photos, notes, catalog stickers, project cards and Spotify links. Students can move items by drag or keyboard, change their width/rotation, remove items, and publish the arrangement using Save board. Failed saves retain the draft. The authenticated PATCH merges the board into the latest profile look and confirms the persisted board before reporting success. Private Saved remains owner-only, and Posts/Tagged are preserved.

Existing profile-space JSON and pinned-memory storage are reused; no board migration is required. A PostgreSQL test proves owner save/read, fractional positions/rotations, authorized visitor read and denial of cross-owner saves. API tests include JSONB key-order handling and reject unconfirmed storage. Text and links are validated. Spotify playback uses the existing click-to-load player; no OAuth account connection is claimed.

Actual implementation is committed on `linh/srs-124.1-save-my-board`. The branch includes the earlier separate photo/layout fix commit as its dependency. Prototype coding began locally on the photo-polish branch before SRS-124.1 was registered. This is recorded as a process finding, not disguised as pre-coding SRS compliance. All further board changes and acceptance work belong on this SRS branch.

## Actual verification

- `npm test`: 1,077 tests pass across 124 files.
- `npm run build`: passes compilation, type checks and production route generation.
- `git diff --check`: passes.
- Running-app preview: http://localhost:3003/profile → My Board.
- Real save/reload and visitor acceptance screenshot: pending. Browser connection commands time out. The user's design reference is not implementation evidence.

## Before Done

Create the SRS issue and four assigned task sub-issues from the [published sprint package](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/sprint-3-my-board-traceability/documentation/sprint3/my-board). Link the actual code commit and PR. Capture the genuine running application's Save board → reload behavior and authorized visitor view. Complete review and merge through a PR. Only then close accepted tasks and move the card to Done.
