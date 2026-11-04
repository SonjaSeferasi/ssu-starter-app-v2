# SRS-124.1, LN — Save My Board.

The system shall persist the signed-in student's personal profile board when the student selects Save board.

Acceptance criterion: Given the student has valid board edits, when Save board succeeds and the profile is reloaded, then the saved card contents, positions, sizes, and rotations are displayed on that student's My Board.

Traces to: UR-124

Owner: Linh Nguyen (LN), Dieulinhh23. Sprint: 3.

## Verified checkpoint — November 4, 2026

- [Parent #1038](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1038) and tasks #1039–#1042 remain open.
- [Implementation PR #1043](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1043) is merged into main at ea33d782296cd66da05f965807ed308dbcd02c75. Old descriptions calling it a draft are historical.
- Linh reports team acceptance of the new UR/SRS scope.
- Previously observed save/reload evidence: [saved board](my-board-save-reload-evidence.png). This was Linh's own account, not a separate-student permission check.
- Fresh command: `npx vitest run __tests__/profile-board.test.ts __tests__/api/profile-space.test.ts __tests__/database/profile-space.test.ts`.
- Result: **46 tests passed in 3 files**. Tested local checkout: badfbde50e83525c80c10a259f9d0e593a68bcca, branch `linh/srs-110.1-profile-photo-upload-limit`. No new code changes or full production build were made for this checkpoint.

Automated checks verify validation, preservation of unrelated profile settings, authenticated saves with confirmation, stored coordinates/width/rotation, authorized visitor reads and denied cross-owner writes. Database checks use disposable PostgreSQL; they are not live browser screenshots.

## Student-supplied save/reload confirmation — November 4, 2026

Linh supplied two screenshots in the conversation: an editor view with a selected smaller laptop sticker, followed by a viewing-mode image with the same smaller laptop and surrounding arrangement. Linh explicitly confirmed that the second screenshot was taken after selecting Save board and refreshing the page.

This is student-reported live save/reload evidence, not an independently operated browser check. The pair supports retention of the smaller sticker and the visible arrangement after reload. It does not clearly demonstrate a changed rotation, a separate student's account, or blocked access. The screenshots are visible in the conversation but are not attached to this repository document because their source image files were not available in the attachment directory.

## Remaining live evidence

1. Resize/save/reload: Linh has supplied the screenshot pair and confirmed the refresh. Attach the original image files to #1038 when available.
2. Rotation: select an item, press Rotate so its angle visibly changes, save, reload and capture the result. The current pair does not clearly establish a changed angle.
3. Have a classmate open your profile → My Board from their own signed-in account. Capture the saved arrangement without Edit board or Save board controls. The same-account viewing screen is insufficient for this check.
4. In a controlled test with a willing classmate/test account, verify that a blocked account cannot open the profile/board. Record the result and restore the relationship if appropriate.

Move the mouse outside the screenshot area before capturing. Do not include passwords, tokens or unrelated private information.

## Task completion mapping

| Task | Evidence already available | Remaining closeout |
| --- | --- | --- |
| #1039 Data contract and ownership | Database save/read, dimensions and ownership checks pass; implementation merged | Attach this current checkpoint to the task and confirm team acceptance |
| #1040 Authenticated save and confirmation | API validation, ownership, preserved fields and confirming-read checks pass; implementation merged | Attach this current checkpoint to the task and confirm team acceptance |
| #1041 Board editor and profile tab | UI code merged; saved board returns on fresh load | Live changed size/rotation reload and separate-student view |
| #1042 Verification and evidence | Genuine own-account save/reload image and automated checks | Complete remaining live checks, attach evidence, and verify integrated app |

Close each task only when its acceptance is satisfied. Close the parent and move it to Done after all four tasks are accepted. Existing prototype-before-SRS process finding remains unchanged.

## GitHub update limitation

Updating #1038 returned HTTP 403, “Resource not accessible by integration.” Browser inventory succeeded, but connecting to the project tab failed. This checkpoint is published as repository documentation; it does not claim that the issue bodies or board status were changed.
