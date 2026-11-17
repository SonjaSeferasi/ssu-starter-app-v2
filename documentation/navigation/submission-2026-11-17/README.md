# Navigation layout verification — November 17, 2026

SRS-601.3 (navigation placement), SRS-604.1–604.3 (Create entry point); follow-up to #1333.

## Reproduction and fix

The side-navigation button's full width was also applied to Create in horizontal navigation. This squeezed the destination list into neighboring actions. Bottom navigation additionally rendered a sidebar-only leaderboard card and did not constrain the widths of narrow-screen destination items.

Reproduction: open Campus Feed, choose Top or Bottom in Preferences, and resize the viewport. The baseline reproduced overlap/overflow in 5 of 16 combinations: Top at 1080/1280/1440 pixels and Bottom at 320/768 pixels. `before/results.json` and the before screenshots preserve the actual local rendering.

The CSS now sizes horizontal actions to their content, hides the sidebar-only card in Bottom, and divides narrow-screen destinations into bounded flexible columns. No navigation destinations or saved preferences were removed.

## Validation

- `scripts/tests/navigation-layout.browser.cjs`: **16/16 layouts passed**, zero overlaps, zero viewport overflow, zero uncaught page errors. Top and Bottom at 320, 390, 640, 768, 1000, 1080, 1280, and 1440 pixels. Create opens and Escape restores focus to Create.
- Real local Next UI in headless Edge; API calls use synthetic fixtures. No hosted user records were modified by the browser runner. See `after/results.json`; desktop Top and phone Bottom screenshots were visually inspected.
- **78/78 tests in 8 files passed**: navigation, navigation preference client, database navigation placement, World Explorer progress, avatar, account progress, API progress, and database progress. Raw results: `tests.json`.
- Focused whitespace check passed. No full-project build, full-suite, production deployment, physical-device, or screen-reader acceptance is claimed.

Run the browser check with `SOCIALU_TEST_URL=http://127.0.0.1:3027`, `SOCIALU_PLAYWRIGHT_MODULE` pointing to the installed Playwright module, `SOCIALU_BROWSER_EXECUTABLE` pointing to Edge, and `SOCIALU_EVIDENCE_DIR` pointing to an output folder. Use `--baseline` only when checking the historical faulty CSS.
