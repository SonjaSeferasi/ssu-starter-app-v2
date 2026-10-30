# SocialU Sprint 3 — SS requirements addendum

Date: 29 October 2026. Owner: Sonja Seferasi (SS).

This addendum extends documentation/SocialU_SRS_Editable.md for Sonja's requested country-adventure direction. Existing identifiers and exact statements remain unchanged. The original 2D three-level baseline under UR-616/UR-618 is a legacy specification; the requirements below describe the new 3D World Explorer mode. No earlier work is retroactively claimed complete.

## UR-628, SS — Explore country adventures.

User requirement: As a student, I want to choose country-themed Jumpyland adventures, play distinctive platform courses, and retain my completed country progress, so that I can explore different countries while progressing through the game.

Traces to stakeholder input: Sonja's 29 October 2026 Sprint 3 planning request to finish the avatar, add dark mode, and develop Jumpyland with a game for each country.

### SRS-628.1, SS — Select a country adventure.

When a student opens Jumpyland World Explorer, the system shall display country destinations with their names and availability, and shall start the selected country's authored level only when that level is available to play.

Acceptance criterion: Given Japan has an available authored level and another country is a preview, when Japan is selected, then the Japan level starts; selecting the preview does not start a playable attempt.

Traces to: UR-628.

### SRS-628.2, SS — Play the Japan platform adventure.

When a student starts the Japan adventure, the system shall present a single-player, three-dimensional Japan-themed platform course with a starting position, solid platforms, gaps, hazards, optional coins, a checkpoint, and a finish goal, supporting directional movement and jumping by keyboard and on-screen controls.

Acceptance criterion: Given a Japan attempt starts, when the student moves, jumps, lands, collects a coin, reaches the checkpoint, and reaches the finish goal, then platforms support the character, the coin is counted once, the checkpoint is recorded for the current attempt, and reaching the goal ends the attempt as completed.

Traces to: UR-628.

### SRS-628.3, SS — Restore country adventure progress.

When a student returns to World Explorer, the system shall restore that account's successfully saved country-level completions and earned results without treating an unfinished or unconfirmed attempt as a saved completion.

Acceptance criterion: Given Japan completion has been saved, when the student signs out and returns, then Japan remains completed; another account and an abandoned attempt do not receive that completion.

Traces to: UR-628.

### SRS-628.4, SS — Keep unfinished countries as previews.

When a country does not have an authored and verified playable level, the system shall label that destination Preview and prevent starting a playable attempt for it.

Acceptance criterion: Given a destination has scenery but no verified playable level, when it is opened, then Preview is visible and no playable attempt begins.

Traces to: UR-628.

### SRS-628.5, SS — Provide distinctive country environments.

When an additional country adventure becomes available, the system shall present scenery reflecting that country's architecture, terrain, vegetation, or landmarks rather than distinguishing the course solely by its name or flag.

Acceptance criterion: Given Japan and another implemented country adventure are available, when their courses are compared, then each has identifiable country-specific environmental features beyond its label and flag.

Traces to: UR-628.

## Sprint 3 plan

Selected: SRS-627.3 (apply theme), SRS-627.9 (save theme), SRS-627.4 (restore theme), existing SRS-610.1 (restore saved avatar), and SRS-628.2 (Japan adventure). Implement saving before testing cross-device restoration. All other new requirements remain Product Backlog. The broader goal is a game for each country; this week targets one complete playable country.

Source inspection: World Explorer contains a Japan prototype and country scenery previews. The manifest marks visualReviewed and releaseReady false. Existing avatar cards document previous integration, with hosted acceptance outstanding. These are source observations, not current live-test results.

Reconciliation needed: SRS-608.3/608.5 request automatic avatar saving while the current editor uses explicit Save avatar. Those requirements are not selected or silently rewritten.

Each selected parent has real task sub-issues covering persistence/API where applicable, user interaction, and tests/live evidence. Assign all to SonjaSeferasi. Create an SRS-named branch before new implementation; link the eventual PR and close completed tasks through it. Add actual running-app screenshots before Done. This planning update does not claim new feature implementation, new passing tests, live persistence, merged feature PRs, or demo evidence.
