# Plan

A static toy, no backend, relative assets so it can live at `/tartan/` later. Nothing here sets up Pages or a deploy.

- **Logic** in plain modules: Register palette (`CODE=NAME;` or `CODE=#HEX#NAME;`), threadcount (slash pivots are the full count, woven once; `...` repeats with no mirror), and the 2/2 twill rule `(x+y) mod 4` is 0 or 1.
- **One default hex per Register code**, copied from the colour sheet, named in a comment. Name-only entries use that shade. `WW`, `A`, and `OG` get an explicit hex on the preset, marked unverified.
- **UI:** full-bleed cloth, phone pull-up editor (palette swatches, threadcount stripes with stepper and drag), zoom, thread texture, presets, PNG/SVG/copy, hash-only share link. System font stack, so the page makes no requests after load.
- **Presets** use the archived Scottish Tartans Authority counts from Koios’s research (section 5). Dress Stewart, MacLeod of Lewis, MacDonald, and Isle of Skye stay “not available”.
- **Tests** in `node --test` on CI: round-trip the Register examples, 288 and 424 thread totals, Hunting Stewart unmirrored, the twill rule at every crossing, presets, and a Royal Stewart SVG under 1 MB.
