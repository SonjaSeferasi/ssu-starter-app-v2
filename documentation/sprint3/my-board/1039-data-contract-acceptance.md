# Task #1039 — data contract and ownership acceptance

Parent SRS-124.1 #1038 → UR-124. Owner: Linh Nguyen / Dieulinhh23.
Branch `srs-124.1-task-1039-data-ownership-acceptance` was created before this acceptance work. The original implementation is already merged via PR #1043; this follow-up adds the missing reviewable acceptance evidence rather than inventing a production-code change.

## Status

Local and explicitly approved hosted acceptance both passed. The PR can now complete #1039 after review and merge. Original production implementation remains unchanged; this step completes the missing acceptance evidence.

Automatic approval review initially blocked the hosted operation. The user then explicitly approved exactly two private QA accounts, one test image and the described cleanup in project `sfrpokisjlwgknxlzllu`. The test ran only after that approval. All independent cleanup stages passed; synthetic deactivated audit/account records remain.

## Completed local verification

The actual Next production UI/API and repository SQL run with disposable PGlite and fixture Auth/PostgREST/media signing. Two independent browser contexts represent owner A and visitor B.

- Save a valid five-card board with unique IDs, bounded content, fractional positions, sizes and rotations. An exact PostgreSQL save/read matches the board; unrelated hometown/look data survives.
- Reload the owner profile and render the saved content with owner controls.
- Visitor B reads the exact saved values and rendered owner photo; no Edit board or Save board controls appear.
- A forged PATCH naming A still saves only authenticated B's own board; A's stored board remains unchanged. An explicitly targeted foreign SQL save is rejected with `42501`.
- Blocking B makes the owner-space read return 404 and removes the profile board from B's page. A still reads its unchanged board.
- 53 focused tests pass across board validation, API, PostgreSQL ownership, atomic persistence and photo ownership.

![Local owner: saved board contract](1039-evidence/01-owner-saved-contract.png)
![Local authorized visitor: read-only owner board](1039-evidence/02-authorized-visitor-readonly.png)
![Local blocked visitor: access denied](1039-evidence/03-blocked-visitor-denied.png)

[Executed local trace](1039-evidence/contract-ownership-trace.json). These screenshots use an existing public artwork image and simulated auth transport; they are not hosted-account acceptance.

## Approved hosted acceptance

`scripts/tests/board-contract-ownership.live.cjs` is opt-in only and verifies the project hostname is `sfrpokisjlwgknxlzllu.supabase.co`. It creates two random private `qa1039_*` accounts, signs in both, uploads one public test PNG into the owner's folder, and runs the same save/read/visitor/forged-owner/block checks through a configured local production app connected to real Supabase Auth, PostgreSQL and private storage. Existing students are never targets.

Cleanup independently attempts to clear both QA boards, remove the QA-only pinned photo and verified storage object, deactivate both QA accounts and revoke their app sessions. Each cleanup stage is recorded even if another fails. Provider/network failures can prevent complete cleanup; deactivated synthetic audit/account records can remain. Credentials and tokens are never written to the evidence trace.

To repeat, obtain explicit approval for a fresh hosted run, build the clean app, set `RUN_LIVE_BOARD_ACCEPTANCE=yes`, `BOARD_APP_ROOT`, `BOARD_EVIDENCE_DIR`, `SOCIALU_PLAYWRIGHT_MODULE` and `BOARD_BROWSER_EXECUTABLE`, then run the live script from a checkout with configured `.env.local`. The script uses local port 3139. Do not mark hosted acceptance passed before an actual successful result.

## Hosted results and screenshots

The configured local production UI/API connected to real hosted Supabase Auth, PostgreSQL and private storage. Two separate browser contexts used actual provider sessions. All five card types and exact fractional coordinates/widths/rotations matched the stored board. The viewer API returned that exact board and the visitor UI exposed no edit controls. A forged save changed only the verified caller's own board, an explicit foreign write failed, and blocking denied the visitor while owner access remained valid.

![Hosted-data owner board after save/read](1039-evidence/04-live-owner.png)
![Actual provider-authenticated visitor without editing controls](1039-evidence/05-live-viewer.png)
![Blocked provider-authenticated visitor denied](1039-evidence/06-live-blocked.png)

[Hosted acceptance and per-stage cleanup trace](1039-evidence/hosted-contract-ownership-trace.json). Both synthetic boards were cleared, the pinned photo and its verified QA-only storage object removed, both accounts deactivated and all their app sessions revoked. Every cleanup stage returned success. No existing students were test targets. Credentials/tokens are absent from the trace.

The frontend/API ran locally from the clean integrated production build; this is hosted Auth/database/storage acceptance, not proof that the separate Vercel authentication configuration error is resolved. Spotify playback is outside this task; its saved link is verified and no OAuth/playback claim is made. No new database migration or production behavior change was necessary.

## Class explanation

“The data contract was already implemented. I completed checks showing that the saved card contents, positions, sizes and rotations survive PostgreSQL save/read. A classmate can see the same board without edit controls, and naming someone else in a save request cannot overwrite their board. Blocking the classmate prevents further reads. Both local checks and the approved two-account test against real Supabase passed.”

Original SRS/team review and tasks #1040–#1042 remain separate. No branch timing or earlier planning history is backdated.
