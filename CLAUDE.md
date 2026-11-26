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
- After each change: `npm test`, `npm run build`, open the page, check the console for errors.

## Module map (`src/`)
- `main.js` — wires everything together and runs the builders **in a fixed order** (see below).
- `core/` — seeded random (`random.js`) and noise (`noise.js`). Pure.
- `world/plot.js` — layout and ground fields (`height`, `gapW`, `pathW`, `puddleD`, `canopyShade`…). Pure; the sim may import it.
- `world/` (other files) — meshes: `ground.js` (terrain, cut sides, puddle), `props.js` (rocks, log, stump, ant mound), `kit.js` (stakes, string, quadrat, tags, camera trap).
- `flora/` — `trees.js` (trees, saplings, ivy, foliage clumps), `shrubs.js`, `grass.js`, `herbs.js`, `litter.js` (chips, cones, twigs, moss), `fungi.js`.
- `fauna/` — `parts.js` (ellipsoid / segment / pivot helpers), `rigs.js` (one `makeX()` per animal), `behaviours.js` (motion state machines), `index.js` (placement).
- `render/` — `pipeline.js` (renderer, low-res target, pixel post pass), `camera.js` (map controls, follow, keyboard), `lights.js`, `materials.js` (toon ramp), `wind.js`, `textures.js`, `instancing.js`.
- `ui/` — keyboard state, camera toolbar.
- `sim/` — the headless simulation (empty until roadmap step 1).
- `data/` — `plot01.json` (hand-placed starting layout), `species.json` (names, render params; growth params with sources from step 1).

**Headless boundary:** `sim/`, `world/plot.js` and `core/` must not import three.js or any package. `test/boundaries.test.js` walks their import graphs and fails if they do.

**Seeded build order:** every builder draws from one shared random stream. Reordering builders in `main.js`, or adding or removing random draws in one, moves everything built after it. That's fine when intended, but a pure refactor should leave the scene identical. To check: before and after, paste `tools/scene-fingerprint.js` into the browser console (hash of every static mesh's geometry, transform, material and instance data, skipping animal rigs) and compare.

## Gotcha from the prototype phase
When published as a claude.ai artifact, the page's content-security policy blocks `fetch` of `data:` URIs. Load assets as separate same-origin files. (Not an issue on GitHub Pages, but keep assets as normal files anyway.)
