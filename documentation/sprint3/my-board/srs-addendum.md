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
- Reuse the existing owner-authorized profile-space JSON storage and memory uploads. No new migration is required for this board.
- Board publication merges the board into the latest owner look, preserving the existing theme and decorations. A confirming read precedes a success response.
- Posts, Tagged and the owner's private Saved tab remain available. Existing active-account and block restrictions apply to viewers. Saving another student's board is not allowed.
- Draft controls support moving, rotation, size changes and removal. Leaving unsaved changes prompts a warning. A failed save retains the current draft.

These contract details describe this addition; they are not replacements for existing SRS-112 or SRS-113 requirements.

## Process finding

The functional prototype was written locally on `linh/srs-110.1-profile-photo-polish` before this new requirement was registered. The original Sprint 3 instructions require a branch named for the SRS before coding. This timing cannot be repaired retroactively, and no such compliance is claimed. Preserve this finding on the SRS issue. Commit and review the actual board implementation on `linh/srs-124.1-save-my-board`; use that branch for all further work on this item. Do not create an empty SRS branch as substitute evidence.

## Acceptance status

Local prototype tests and build passed. Browser connection timeouts prevented live save/reload/visitor acceptance and a running-application screenshot. The SRS card and verification task must remain open and In progress until the live criterion, evidence and reviewed PR integration are complete. Existing sprint cards and prior sprint records are unchanged by this addendum.
