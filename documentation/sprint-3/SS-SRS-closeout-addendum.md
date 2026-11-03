# SocialU Sprint 3: avatar and country-adventure closeout addendum

Owner: Sonja Seferasi (SS). Recorded 3 November 2026.

The owner requested SRS-named branches for all current local avatar and country work and authorized adding missing backlog requirements. This addendum extends the existing Sprint 3 addendum and canonical SRS. It does not replace earlier exact requirements, rewrite the selected theme requirements, backdate development, or certify release readiness. Requirements describe requested behavior; implementation and acceptance remain separate.

## SRS-611.2, SS - Adjust the avatar body shape.

When a student selects an available body shape in avatar customization, the system shall preview that shape while preserving the selected face, hairstyle and coordinated outfit, with the head retaining its proportions.

Acceptance: Select Slim, Average, Broad and Plus size for the same complete avatar. The torso and limbs change together, the head remains proportionate, and the face, hair and outfit selections remain unchanged.

Traces to UR-611. Supporting existing requirements: SRS-608.1, 608.2 and 610.1. Implementation candidate present; human visual and hosted persistence acceptance pending.

## SRS-611.3, SS - Adjust the avatar skin tone.

When a student selects an available skin tone in avatar customization, the system shall preview that tone on exposed skin while retaining facial shading, the coordinated outfit and the selected hairstyle; a confirmed save shall retain the selected tone for that account.

Acceptance: Preview light and deep tones on the same avatar, verify clothing and hair remain unchanged, then save and return to the same account to verify restoration. Another account must not inherit the selection.

Traces to UR-611 and UR-610. The current editor retains explicit Save avatar; this does not silently reconcile the older automatic-save requirements SRS-608.3/608.5. Hosted acceptance remains pending.

## SRS-616.9, SS - Present three-dimensional scenery for the themed challenge.

When the student plays an existing three-world Jumpyland challenge, the system shall present its themed terrain and environmental scenery in three dimensions with a camera that follows the playable character and keeps the next traversal area visible.

Acceptance: Start each existing themed world, traverse its opening section and compare desktop and phone-width views. The environment changes with the selected world and the camera follows movement without changing authored collision surfaces.

Traces to UR-616. This extends the legacy three-world mode; it is separate from World Explorer under UR-628 and does not replace the original two-dimensional baseline statement.

## SRS-628.6, SS - Play authored regional country adventures.

When a student starts an available authored country testing adventure, the system shall load that country's defined route, calibrated challenge, collectibles, checkpoint recovery and finish condition, including the defined optional reward route where provided, using the shared keyboard and on-screen movement controls.

Acceptance: For each implemented country, complete its main and optional routes at the runtime challenge settings, verify unique collectible counting and checkpoint recovery, and verify its own course loads rather than another country's template. Human playtests remain a separate acceptance item.

Traces to UR-628. Extends SRS-628.2 beyond Japan; complements SRS-628.5. Existing regional prototypes are TESTING candidates, not release-approved countries.

## SRS-628.7, SS - Operate country-specific traversal mechanisms.

When a student operates a country's authored traversal mechanism, the system shall change the corresponding traversal state and display feedback matching that state; its controls, pause behavior and recovery shall remain consistent with the shared attempt.

Acceptance: In Oman, activating the fictional sluice changes visible water and the linked crossing height. In Saudi Arabia, a mirror beam must align with and charge its receiver to open the fictional gate; standing on the former pressure plate alone must not open it. Verify both routes, collectibles, pause, timing changes and checkpoint recovery. Protected heritage models remain decorative.

Traces to UR-628 and the 47-country Asia specification. The water/light changes are a separate candidate with targeted tests; final rendered/build acceptance was interrupted at the owner's sprint cutoff and remains pending.

## SRS-628.8, SS - Match country guides and photographs to the playable place.

When a student opens a country card or its guide, the system shall identify the same geographic setting used by that country's authored adventure and present an appropriate photograph with its source and license information; unavailable or rejected photographs shall use an identified fallback rather than misidentify another place.

Acceptance: Compare the selected country's level title, card, guide, landmark photograph and attribution. Exercise missing-image and mismatched-image cases. Retain the actual source/author/license records for bundled photographs.

Traces to UR-628. Complements SRS-628.1 and SRS-628.5; source and per-country visual acceptance must be supported by evidence.

## SRS-628.9, SS - Keep gameplay responsive while scenery finishes loading.

When optional scenery textures arrive after play has started, the system shall retain a usable rendered environment and uninterrupted attempt state, preparing the visual upgrade at startup or while paused before applying it.

Acceptance: Delay surface-image responses until active gameplay, release them, verify the attempt continues with the fallback art, pause to allow the upgrade, then resume without resetting position, rewards or checkpoint state. Verify cancellation when the stage closes. This requirement does not imply a verified frame-rate target.

Traces to UR-628. The late-upgrade queue is a separately tracked candidate; final delayed-load browser and production-build validation remain pending at sprint cutoff.

## Existing requirement coverage and acceptance boundary

- SRS-610.1: saved appearance restoration; live sign-out/return acceptance remains pending.
- SRS-610.2: saved appearance in the existing game character; hosted account-to-game acceptance remains pending.
- SRS-628.1/628.2/628.3/628.4/628.5: country selection, Japan gameplay, saved progress, unfinished previews, distinctive environments. Reuse their existing issues and exact titles.
- SRS-627.3/627.4/627.9: keep the existing theme backlog and main-branch work; do not assign avatar/country changes to these requirements merely to close a sprint card.
- The six Southeast Asia and nine South Asia art tasks have developer review evidence. Further enhancement is deferred to the next sprint.
- Every country remains unreleased. Queued human playtests, hosted account-save checks, physical-phone testing and confirmed-refresh-rate performance remain pending until actually performed.

Branch and commit traceability is recorded in `SRS-BRANCH-MAP.json`. Existing working files, raw review captures and local tools remain preserved; temporary builds, credentials and duplicate review snapshots are excluded from publication.
