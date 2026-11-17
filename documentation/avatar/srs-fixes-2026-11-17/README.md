# Avatar SRS fixes — November 17, 2026

Owner: Sonja Seferasi. Original working folder: `C:\Csc 351\ssu-starter-app-v2`.
Branch: `sonja/game-room-change-descriptions`; baseline commit: `8b37f9a3743d4bef3758cf760f691f8bb2efad22`.
Status: implementation and validation prepared for the user-authorized branch publication. The publication comment on #1309 records the resulting commit and verified push. Publication does not establish deployment or hosted acceptance.

GitHub record: [#1309](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1309), assigned to SonjaSeferasi and added to SocialU Product Backlog. Its description and final comment document requirements, code locations, verification and pending acceptance. The initial browser attachment failed. The publication commit includes the evidence files below so the issue can link directly to immutable GitHub copies, including inline screenshots.

## Requirement coverage

| SRS | Implemented behavior |
| --- | --- |
| 608.3, 608.5 | Outfit and default-face selections save automatically. One request at a time; controls disabled while saving. Preview-only mode explicitly remains unsaved. |
| 608.6 | Failed save restores the last confirmed appearance, explains the failure, and retains the attempted selection for Retry. |
| 609.1–609.2 | Choose Photograph and Take Photograph enter the same editor. Camera tracks stop on cancel, capture or unmount. |
| 609.3–609.4 | JPG/JPEG, PNG, WebP and HEIC; empty files and files above exactly 10,000,000 bytes rejected. Decode errors offer another selection. Local decoding also limits images to 80 million pixels. |
| 609.5–609.7 | Square crop with size, horizontal and vertical controls; live image preview on the avatar, without cartoon conversion. Avatar head position is measured from its artwork. |
| 609.8–609.9 | Explicit Save Photograph; retain candidate and crop after failure for Retry. Only a successful response updates the editor's confirmed face. |
| 609.10–609.12 | Close/Escape with a candidate offers Keep Editing or Discard Changes. Page unload has a browser-native unsaved-change warning. The modal prevents interacting with underlying navigation. |
| 609.13 | Camera denial/unavailability offers file selection with an explanation. |

Optional background removal in 609.14–609.16 is outside this request and is not claimed. Navigation fixes remain separately tracked in #1301, #1302 and #1305.

## Implementation and data handling

- `components/game-room/game-room.tsx`: automatic saves, previous-state recovery, Retry and photo editor entry. Outfit changes preserve the saved photo; default-face changes replace it.
- `components/game-room/photo-face-editor.tsx` and its CSS: native modal, local decode/camera/crop, preview, explicit Save, failure retry and discard recovery; responsive 390px layout.
- `lib/avatar-photo.ts`: input bounds, dynamically loaded `heic2any` 0.0.4, normalized crop coordinates and 512x512 JPEG preparation. The original image is not uploaded.
- `app/api/game-room/photo/route.ts`: verified account and linked profile, bounded 600,000-byte request stream, real JPEG decoding and dimensions checked using Sharp, metadata-stripped JPEG stored under the authenticated owner in the existing media bucket.
- `lib/avatar-photo-server.ts` and `lib/game-room-server.ts`: account-scoped photo lookup, one-hour signed URLs; missing database setup is an explicit failure rather than a saved-state claim.
- `supabase/migrations/20261117060000_avatar_photo_faces.sql`: service-only RPC reuses existing media_assets, avatar_photo_faces and student_avatars; validates owner/key/bytes/crop and atomically replaces the face. Anonymous/authenticated SQL roles cannot call the privileged RPC directly. No public-bucket change.
- `complete-avatar.tsx`, `figure-image.ts`, `avatar-preview.tsx`: shared photographic face rendering and artwork-specific head placement.

An upload that fails URL preparation is removed before any face transaction. Once the transaction starts, an uncertain network outcome retains the private upload so a possibly committed face is never deleted. This may leave an unreferenced private object; no automatic history cleanup is introduced. The UI describes the last confirmed face accurately when confirmation is lost. Crop metadata describes the original source selection; storage contains the processed crop, so rendering does not crop twice.

## Verification

**80 tests passed in 7 files**. Tests cover formats/size boundaries/crop bounds, authenticated ownership, request and image validation, pre-commit failure cleanup, ambiguous transaction outcome, signed URLs/setup errors, actual schema/migration behavior in disposable PGlite, previous Game Room API behavior, editor compatibility and World Explorer avatar contracts.

```powershell
& .\node_modules\.bin\vitest.cmd run __tests__/avatar-photo.test.ts __tests__/avatar-photo-server.test.ts __tests__/api/avatar-photo.test.ts __tests__/database/avatar-photo.test.ts __tests__/api/game-room.test.ts __tests__/avatar-editor.test.ts __tests__/world-explorer-avatar.test.ts --maxWorkers=2 --minWorkers=1 --reporter=dot
```

**11 local Edge browser checks passed, zero uncaught page errors**; exact assertions in `results.json`. They cover autosave/reload, rollback/Retry, default face, crop/preview/explicit save, Keep Editing/Discard, photo failure/Retry, restoration and outfit/default-face interaction, simulated-camera capture, denied-camera fallback, mobile sizing, and genuine HEIC decoding.

Run `scripts/tests/avatar-srs.browser.cjs` against a local Next server using `SOCIALU_TEST_URL`, `SOCIALU_PLAYWRIGHT_MODULE`, `SOCIALU_BROWSER_EXECUTABLE` and `SOCIALU_EVIDENCE_DIR`. Optional `SOCIALU_HEIC_FIXTURE` enables the genuine HEIC check. The final run used the maintainer's public [demo/1.heic](https://github.com/alexcorvi/heic2any/blob/master/demo/1.heic), downloaded to the temporary local test directory; it is not redistributed here. This establishes that sample's decoding, not compatibility with every phone HEIC variant.

The browser intercepts API requests with account fixtures. Its reload checks validate UI behavior against those fixtures, not hosted persistence. The camera uses Edge's synthetic media source. The smiley test image is deliberately synthetic, not a student's photograph and not AI conversion of a portrait. No hosted data was changed. The test server on port 3037 was stopped after testing.

**Focused TypeScript check: 0 diagnostics** for the changed avatar UI/API/server dependency graph. Targeted diff whitespace check passed. No full-project production build or whole-repository test pass is claimed. A broad TypeScript attempt was stopped because it traversed unrelated temporary copies; the focused check avoids them.

## Evidence files

- `unit-tests.txt`: original 80-test run.
- `pre-push-tests.txt`: fresh publication check, 80 tests passed in 7 files.
- `typecheck.txt`: focused TypeScript result.
- `results.json`: final 11 browser checks.
- `autosave-recovery.png`: actual local editor after an intentionally failed fixture save.
- `photo-crop.png`: actual local photo editor with a synthetic image and measured avatar placement.
- `camera-fallback-mobile.png`: actual 390px dialog with camera-denial guidance.
- `github-record.jpg`: published GitHub implementation/evidence record.

An early browser run stopped because the test's Retry selector also matched the unrelated streak widget. The selector was corrected and final runs passed. Initial photo placement was adjusted after visual inspection. An early failure screenshot may remain as diagnostic material; use the named final screenshots above for presentation.

## Remaining release acceptance

- Publication scope: only the intended avatar changes and evidence. Unrelated pending streak/Japan/World Explorer/SRS work is preserved.
- Apply the new migration to the intended hosted database, after existing avatar/customization migrations, and verify media storage configuration.
- Verify a real signed-in save/reload/sign-out/return, real portrait placement and physical camera on supported devices. Confirm the shared gameplay render with a saved photograph.
- The publication comment links the commit and evidence. Attach deployed acceptance evidence to #1309 before closing it. File existence, local tests and publication do not establish deployment.
