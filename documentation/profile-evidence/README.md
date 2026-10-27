# Linh Nguyen — profile improvements and evidence

Recorded October 27, 2026. Owner: Linh Nguyen (`Dieulinhh23`). Application: SocialU.

## Review links

| Record | Link |
| --- | --- |
| Latest merged profile implementation | [PR #855](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/855) |
| Implementation branch | [`linh/srs-109-113-profile-campus-polish`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-109-113-profile-campus-polish) |
| Exact implementation snapshot | [`e4bf2db58b9d2a30bd4bec5ae27f95a409b1af08`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/e4bf2db58b9d2a30bd4bec5ae27f95a409b1af08) |
| Merge into main | [`caa9112`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/caa911274b9c1901a4b6153ceb6c543f3d63b9bd) |
| Existing profile implementation/evidence issue | [#342](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/342) |
| Documentation branch | `linh/srs-109-113-profile-evidence` |

The [prepared GitHub description update](github-update.md) supplies the feature summary for PR #855. GitHub denied the connector's edit request, so that replacement still needs to be applied from Linh's account.

## Relationship to the graded sprints

This is a dated follow-up record of the profile changes in PR #855. It does not assign those changes to an earlier sprint or claim new sprint credit. The instructor determines their sprint classification.

| Existing submission | Selected item and original evidence |
| --- | --- |
| [Sprint 1 submission](../sprint1/submission.md) | SRS-100.1, full-name registration: [issue #45](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/45), [PR #363](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/363), [running registration screenshot](../sprint1/full-name-required.png) and [board screenshot](../sprint1/sprint1-board.png). |
| [Sprint 2 submission](../sprint2/submission.md) | SRS-114.7, friend-request notification: [issue #506](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/506), implementation [PR #501](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/501), follow-ups [#512](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/512) and [#514](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/514), and its [received-request screenshot](https://github.com/user-attachments/assets/e362dae0-b3c1-4c53-9d79-43ae42a051ea). |

Linh supplied professor feedback reporting **48/50 for Sprint 2, including 15/15 for the demo**, with two points deducted because PR #501's implementation branch was not originally SRS-named. This is the supplied assessment, not a new independently checked grade. Renaming a branch afterward cannot change that development history. For subsequent work, create the SRS-named branch before coding and use it for implementation, tests and evidence.

The old Sprint 2 file is a historical readiness snapshot: it still says the demo/fresh-delivery check was pending. At this audit, GitHub issues #506 and #511 also remain open. The received-request screenshot demonstrates older pending requests; it does not establish fresh notification delivery. The reported demo grade alone is not used to close that technical acceptance task.

## What changed in PR #855

| Feature | Result | Main implementation |
| --- | --- | --- |
| Profile layout | Refined spacing, responsive layout, About me and connections; Posts, Tagged and owner-private Saved remain available. | [profile-view.tsx](../../components/profile/profile-view.tsx), [profile.module.css](../../components/profile/profile.module.css) |
| Themes and decorations | Six themes; sticker placement on cover, About me and hello-note cards; position, size, rotation and stacking; avatar frames and card finishes. | [profile-decorator.tsx](../../components/profile/profile-decorator.tsx), [profile-space.ts](../../lib/profile-space.ts), [profile-themes.ts](../../lib/profile-themes.ts) |
| Uploaded cover | Owner can upload a JPG/PNG/WebP cover up to 5 MB; private storage keys are saved and signed URLs are returned for authorized reads. These cover rules are separate from profile-avatar requirements. | [profile-space API](../../app/api/profiles/space/route.ts) |
| About me | Editable prompts, interests, optional country flag and hometown, and public Spotify song/album/playlist links. Spotify uses public embeds; it does not connect a Spotify account or request listening history. | [personality model](../../lib/profile-personality.ts), [country options](../../lib/profile-countries.ts), [personality API](../../app/api/profiles/personality/route.ts) |
| Campus cards | Saved vibes and goals, two-option polls, study plans, joining/leaving plans and selectable poll/plan stickers. | [corner model](../../lib/profile-corner.ts), [corner API](../../app/api/profiles/corner/route.ts) |
| Hello notes | Classmates can leave short notes with supported colors/doodles; note presentation can be decorated by the profile owner. | [profile-space API](../../app/api/profiles/space/route.ts) |
| Save feedback | Confirmed saves, bounded requests, visible errors and local draft recovery instead of silently reporting success. | [profile-look-save.ts](../../lib/profile-look-save.ts) |
| Pinned memories | UI, API and migration included; hosted saving still requires the memories migration. | [memories API](../../app/api/profiles/memories/route.ts), [migration](../../supabase/migrations/20261027080000_profile_memories.sql) |
| Shared integration | Avatar extracted so chat notifications can display profile photos without importing the customization editor. | [profile-avatar.tsx](../../components/profile/profile-avatar.tsx) |

## Requirement traceability

The [canonical SRS](../SocialU_SRS_Editable.md#ur-109) is unchanged. A requirement-area reference is not a claim that every acceptance criterion in that area is complete.

| Existing requirement | Relationship to this change |
| --- | --- |
| UR-109, add profile information; UR-110, edit my profile | Existing photo/major/class-year/bio flows are reused. New decoration saves are an extension of profile editing, not proof of all original setup requirements. |
| UR-111, activity summary | Profile activity and connection counts remain visible. |
| SRS-112.1–112.7, profile categories | Posts and Tagged controls remain in the profile. Saved is an additional owner-only control. |
| UR-113, view another student's profile | The saved presentation is consumed by the student-profile view, subject to its access rules. |
| Proposed extensions | Themes, stickers, frames, country flags, prompts, Spotify embeds, hello notes, vibes, goals, polls, study plans and memories have no newly approved SRS numbers in this record. They require team/instructor scope review before being treated as new formal requirements. |

## Automated evidence

The exact PR #855 implementation head (`e4bf2db`) was checked in an isolated source copy, excluding the three local-only unfriend files. Before publication, the full application suite passed **957 tests across 109 files** and `npm run build` passed. These are the implementation checks recorded during the merge work, not a claim that screenshots or hosted acceptance were performed.

The accompanying [validation.txt](validation.txt) records a fresh test run of the same snapshot for this evidence package. API tests mock Supabase; database suites execute migrations in disposable PostgreSQL. Neither automatically proves saving in the hosted application.

Coverage includes:

- [Space API](../../__tests__/api/profile-space.test.ts) and [real-schema space tests](../../__tests__/database/profile-space.test.ts): authenticated ownership and persisted look data.
- [Cover API](../../__tests__/api/profile-cover.test.ts): private upload ownership, format/size checks and failed-save cleanup.
- [Card decorations](../../__tests__/database/profile-card-decorations.test.ts): saved card placement and presentation data.
- [Corner API](../../__tests__/api/profile-corner.test.ts) and [database corner tests](../../__tests__/database/profile-corner.test.ts): goals, polls, votes, plans and participation.
- [Corner artwork](../../__tests__/api/profile-corner-artwork.test.ts): independent poll/plan stickers, hometown and country flags.
- [Personality API](../../__tests__/api/profile-personality.test.ts) and [database personality tests](../../__tests__/database/profile-personality.test.ts): prompts, interests and validated public Spotify links.
- [Hello-note tests](../../__tests__/database/profile-about-and-hello-notes.test.ts), [theme tests](../../__tests__/profile-themes.test.ts) and [save tests](../../__tests__/profile-look-save.test.ts).

## Running-application evidence still needed

Current profile screenshots have not been attached to this record. Browser capture was unavailable during this documentation pass. The design reference pictures in chat are not used as proof that the application works.

| Capture | Reproduction and what it demonstrates |
| --- | --- |
| 1. Saved profile | Sign in, open `/profile/decorate`, select a theme and place stickers on the cover, About me and notes cards. Save, return to `/profile`, reload, then capture the full profile. Shows the actual saved design after reload. |
| 2. Visitor view | With a consenting verified same-school account, open `/students/<username>`. Capture the saved design and Posts/Tagged controls; verify owner-private Saved and edit controls are absent. |
| 3. About me | Save a prompt, interest, optional hometown/country and a public Spotify link. Reload the profile and capture the resulting card. |
| 4. Campus interaction | Save a vibe and goal. Use consenting test accounts for a poll vote or study-plan join; reload both profiles and capture actual counts. Do not use invented votes or a mockup. |

Record the date, source commit, route, steps and observed result with each screenshot. If a save fails, retain the error and leave that acceptance item incomplete. Do not upload credentials, session tokens or classmates' private content as evidence.

## Setup and remaining limitations

Use the repository setup in [README](../../README.md) and [Supabase setup](../../supabase/README.md). A code merge does not install database migrations.

PR #855 includes additive profile migrations `20261027020000` through `20261027080000`. The prompt, space and campus-card functions were previously found in the shared database. That function-presence check does not establish every hosted save/visitor workflow. The memories function was missing at the last check, so pinned-memory saving remains in preview until its migration is applied and verified. This documentation pass does not modify the shared database.

The local unfriend migration (`20261027010000`), its confirmation wording and test edits were deliberately excluded from PR #855 at Linh's request. They are not claimed as shared functionality or completed profile work here.

## Submission walkthrough

1. Open PR #855 and show the implementation branch, merged state and source snapshot.
2. Open this record and explain which features extend the original SRS and which graded sprint records they follow.
3. Show `validation.txt` and distinguish automated tests from live hosted evidence.
4. Demonstrate a decoration save and reload in the actual app, then the visitor view. Attach the screenshots above before claiming that acceptance is complete.
5. Link this record from the profile issue and provide the GitHub links requested by the professor. Canvas submission and the professor's acceptance are not claimed by this document.
