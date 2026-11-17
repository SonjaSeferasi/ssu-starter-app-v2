# Sprint 5 DormSpace QA

DP / Darrin Phimphisane / TheRealRinRin — 17 November 2026.

## SRS-500.5: one placement per item

Parent #543; implementation #1287; acceptance #1288; defect #1214.
Branch `srs-500.5-duplicate-placement-validation` was created before the fix.

The save bridge compared JSON item IDs as text even though PostgreSQL stores
catalog IDs as BIGINT. It now compares the stored identity inside the existing
validation exception block. `7`, `07`, `0007` and `+7` identify the same item.
Malformed and overflowing IDs also return the normal arrangement validation
error. The existing owner/version checks and atomic rollback remain in place.
The API already maps SQLSTATE 22023 to status 400 and the 3D editor already
displays the returned rule while preserving the last saved room.

Validation: 15 tests passed across `database/dormspace-save-validation.test.ts`
and `api/dorm-rotation.test.ts`. Real PostgreSQL checks cover duplicate aliases,
unchanged room/version after rejection, valid movement of a single item,
malformed IDs and migration reapplication. The API regression verifies the
student-facing 400 response. Running-app acceptance evidence is recorded after
integration; these automated checks do not claim a live browser test.
