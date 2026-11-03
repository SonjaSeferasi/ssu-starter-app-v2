# Vietnam and Singapore — phone heading correction

The identity panel has a full row in narrow portrait layouts. Landscape uses a compact identity/counter arrangement with a separate progress row. Country names remain whole; subtitles wrap inside the panel. The CSS is scoped to these two environments and the new South Asia batch, preserving East Asia's existing presentation rules.

[Before measurements](before.json) and [after measurements](after.json) retain actual screenshots at six sizes for each country: 320×568, 360×640, 390×844, 568×320, 667×375 and 844×390. The after checks require a single text rectangle for each country name, fitting text and subtitles, visible identity bounds, separate counters and no horizontal page overflow. Before records retain raw text/line-height measurements; their single-line diagnostic is inferred from those original glyph boxes. Review the images alongside the measurements.

The twelve after cases pass. These are emulated viewports. Physical-phone and 60 FPS acceptance remain pending, and no country is released by this fix.
