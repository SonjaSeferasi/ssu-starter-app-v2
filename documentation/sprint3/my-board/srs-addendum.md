# Sprint 3 SRS addendum — My Board

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Recorded: October 30, 2026.
Status: user-requested scope addition for team review. This adds identifiers; it does not renumber or replace the original SRS or URD. UR-124 and SRS-124.1 were absent from the repository baseline and the existing issue-title search when checked.

## Stakeholder request and URD addition

Source: Linh requested a scrapbook-style My Board on the profile, with uploaded photos, notes, stickers, a featured project and Spotify music, and then asked to include that work in the sprint using the SRS format. The supplied design is a reference, not evidence that the application passed acceptance.

### UR-124, LN - Personalize My Profile Board

As a student, I want to arrange photos, notes, stickers and favorite things on my profile board and save the result, so that classmates can learn more about me through a space I personalize.

<a id="srs-1241"></a>

#### SRS-124.1, LN — Save My Board.

The system shall persist the signed-in student's personal profile board when the student selects Save board.

Acceptance criterion: Given the student has valid board edits, when Save board succeeds and the profile is reloaded, then the saved card contents, positions, sizes, and rotations are displayed on that student's My Board.

Traces to: UR-124

## Data and integration contract

- Supported cards: uploaded/pinned photo, short note, catalog sticker, featured project, and Spotify song/album/playlist link.
- A board stores at most 20 items. Every item has a unique ID, kind, position, width and rotation. The existing board validator defines bounds and content lengths.
- Photo cards reference the owner's existing pinned-memory IDs; signed image URLs are resolved through the existing authorized memory API. Uploading a photo saves it as a pinned memory; Save board saves its placement.
- Note/project text is rendered as text. Project links use HTTPS; Spotify links use the existing canonical Spotify validator. No Spotify-account OAuth connection is claimed.
- Reuse the existing owner-authorized profile-space JSON storage and memory uploads. Follow-up defect fixes added migrations `20261116210000_atomic_profile_board_save.sql` (row-locked board merge, #1223) and `20261117020000_board_photo_ownership.sql` (owned-photo references, #1229). No additional migration is needed for tasks #1039–#1042.
- Board publication merges the board into the latest owner look, preserving the existing theme and decorations. A confirming read precedes a success response.
- Posts, Tagged and the owner's private Saved tab remain available. Existing active-account and block restrictions apply to viewers. Saving another student's board is not allowed.
- Draft controls support moving, rotation, size changes and removal. Leaving unsaved changes prompts a warning. A failed save retains the current draft.

These contract details describe this addition; they are not replacements for existing SRS-112 or SRS-113 requirements.

## Process finding

The functional prototype was written locally on `linh/srs-110.1-profile-photo-polish` before this new requirement was registered. The original Sprint 3 instructions require a branch named for the SRS before coding. This timing cannot be repaired retroactively, and no such compliance is claimed. Preserve this finding on the SRS issue. The actual implementation was committed on `linh/srs-124.1-save-my-board` and merged through PR #1043. Subsequent defect fixes and acceptance tasks use substantive SRS-124.1-named branches created before their own work. These branches do not repair the original timing finding. Do not create an empty SRS branch as substitute evidence.

## Acceptance status

The original prototype checkpoint had passing local tests/build but incomplete live acceptance. That checkpoint is superseded by the November 16, 2026 acceptance work, recorded separately:

- #1039 / PR #1280: real hosted Supabase Auth/PostgreSQL/private-storage round-trip through the configured local production app. Two explicitly approved QA accounts verified exact five-card persistence, read-only viewing, forged-owner protection and block denial. All cleanup stages passed; deactivated account/audit records may remain.
- #1040 / PR #1284: six real-handler/PostgreSQL integration checks cover authenticated ownership, validation, atomic merge and honest save confirmation.
- #1041 / PR #1286: actual editor interactions cover five card types, movement, width/rotation, removal, rejected-draft retention, Cancel warning, retry, exact reload and private Saved/visitor controls.
- #1042 and newly found #1291 (November 17): [integrated verification and current evidence](1042-integrated-verification.md) records the clean production build and rerun local database/API/browser checks on the integrated code base. Its PR closes the verification task only after checks and merge.

The #1039 hosted trace is reused explicitly for later tasks with core-board source hashes, rather than creating more hosted accounts. The shared server fetch transport now bypasses caching for #1291; that change is verified locally and postdates the hosted run. Local browser suites use fixture Auth/PostgREST/signing with actual SQL; their deliberately injected faults are labeled. Screenshots are genuine captures of the running app. Vercel's separately observed authentication-configuration issue and historical remote migration-version mismatch remain unresolved; local hosted acceptance does not establish that deployed demo readiness.

Technical task completion is separate from stakeholder/team approval of this addendum. Parent #1038 remains open for that sign-off; no peer approval or original process compliance is invented. Existing sprint records remain historical.
