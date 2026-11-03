# My Board — Sprint 3 package for Linh Nguyen

Recorded October 30, 2026. Status: **In progress; not Done**.

> **Published November 3, 2026:** [SRS-124.1 #1038](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1038) now exists in Linh Nguyen’s Sprint 3 board, with real sub-issues [#1039](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1039), [#1040](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1040), [#1041](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1041) and [#1042](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1042). Parent and tasks are assigned to Dieulinhh23, labeled sprint-3-ln, in SocialU and In progress. The parent shows 0/4 completed. [Draft PR #1043](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1043) targets main and is linked from the SRS body. Live application acceptance and screenshot, team review and merge remain pending. The earlier connector 403 was bypassed using the now-working authorized browser UI; no GitHub permissions were weakened.



One new SRS card is proposed, with four real task sub-issues. This keeps the new feature as one vertical slice alongside the existing Login Activity sprint work. Earlier sprint cards and other students' cards are unchanged.

## Requirement format

[SRS addendum and stakeholder/URD source](srs-addendum.md):

**SRS-124.1, LN — Save My Board.**

The system shall persist the signed-in student's personal profile board when the student selects Save board.

Acceptance criterion: Given the student has valid board edits, when Save board succeeds and the profile is reloaded, then the saved card contents, positions, sizes, and rotations are displayed on that student's My Board.

Traces to: UR-124

The addendum records the new UR-124 story without altering the original SRS or URD files. Team review of the new scope is pending. This feature is not relabeled as a login requirement or claimed as earlier sprint work.

## Actual code and verification

- [Actual SRS-named implementation branch](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-124.1-save-my-board).
- [Board implementation commit ccd4b3f](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/ccd4b3f).
- [Implementation and remaining acceptance record](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/linh/srs-124.1-save-my-board/documentation/sprint3/my-board/implementation.md).
- [Actual validation summary](validation.txt): 1,077 tests in 124 files pass; production build passes.
- Live save → reload → authorized visitor demonstration and running-app screenshot: pending. The reference mockup is not acceptance evidence.

Process finding: the local prototype was coded on the photo-polish branch before this new SRS was registered. The actual board commit is now on its SRS branch. This is a traceability correction, not a claim that the branch was created before coding.

## Published issues and remaining work

Use the actual issue and PR links above. The copyable issue payloads preserve the earlier preparation record and are not instructions to create duplicates. The GitHub sub-issue relationships were verified in the running project UI; they are not only Markdown checkboxes. The branch and commit links remain the implementation source.

Before Done: complete genuine Save board → reload → authorized visitor acceptance, attach its running-app screenshot to #1038, review and merge PR #1043, then close only actually accepted tasks. The saved narrow My Board filter is only a temporary URL filter; the Sprint 3 view definition was not changed.

## Draft PR description

See [pull-request.md](pull-request.md). [Existing draft PR #1043](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1043). Keep it in draft while live acceptance is pending. The prepared text intentionally has no fictitious issue numbers or closing references.
