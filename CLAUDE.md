# CLAUDE.md — working notes for Claude Code

Read `docs/design.md` and `docs/roadmap.md` before starting a task. Work on one roadmap step per session unless told otherwise.

## What this is
A forest ecology game with an academic feel. The player directs a small field station on one 28 × 28 m plot (1 world unit = 1 m). Field agents carry out jobs the player sets up physically on the map (drag a fence line, drop a quadrat, aim a camera trap, paint-mark trees). The ecosystem is simulated and the player only learns its state through measurement.

## Rules
- Keep the **simulation** separate from **rendering**. The sim must run headless (no three.js imports) so it can be tested and fast-forwarded. Rendering reads sim state.
- Ecology should be grounded in real models and published parameters (gap models such as JABOWA/ForClim for trees). Note sources for parameters in the species data files.
- Real Central European species with scientific names. Be honest where science is contested (for example the "wood wide web").
- Visual style: 3D scene rendered at low resolution as pixel art (banded toon light, crisp shadows, depth outlines, nearest-neighbour upscale). Keep silhouettes readable; avoid floating or noisy elements.
- Animals are rigs built facing −x, with pivot joints (neck, head, ears, tail, legs, wings) for animation.
- Deterministic randomness (seeded) so a plot can be regenerated identically.
- After each change: `npm run build`, open the page, check the console for errors.

## Gotcha from the prototype phase
When published as a claude.ai artifact, the page's content-security policy blocks `fetch` of `data:` URIs. Load assets as separate same-origin files. (Not an issue on GitHub Pages, but keep assets as normal files anyway.)
