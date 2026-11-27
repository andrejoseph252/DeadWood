# CLAUDE.md — working notes for Claude Code

Read `docs/world.md` first: it is the source of truth for what exists in the world (place, habitats, species, interactions) and holds the current task, the **Setting Build, steps S0–S8** (its section 10). If the code and `world.md` disagree, the document wins; if `world.md` looks ecologically wrong, flag it rather than quietly fixing it in code. `docs/design.md` (game design) and `docs/roadmap.md` (the longer plan) give the context.

Work on one step per session unless told otherwise, and don't start a step until the previous one passes its "done when" checks.

## What this is
A forest ecology game with an academic feel. The player directs a small field station on one research plot (1 world unit = 1 m). The plot is 60 × 60 m (Stage B in `world.md` section 3); the prototype's 28 m scene is its canopy gap. Field agents carry out jobs the player sets up physically on the map (drag a fence line, drop a quadrat, aim a camera trap, paint-mark trees). The ecosystem is simulated and the player only learns its state through measurement.

## Rules
- Keep the **simulation** separate from **rendering**. The sim must run headless (no three.js imports) so it can be tested and fast-forwarded. Rendering reads sim state.
- Ecology should be grounded in real models and published parameters (gap models such as JABOWA/ForClim for trees). Note sources for parameters in the species data files.
- Real Central European species with scientific names. Be honest where science is contested (for example the "wood wide web").
- Visual style: 3D scene rendered at low resolution as pixel art (banded toon light, crisp shadows, depth outlines, nearest-neighbour upscale). Keep silhouettes readable; avoid floating or noisy elements.
- Animals are rigs built facing −x, with pivot joints (neck, head, ears, tail, legs, wings) for animation.
- Deterministic randomness (seeded) so a plot can be regenerated identically.
- After each change: `npm test`, `npm run build`, then `npm run screens -- <set> --compare <previous set>` (see below).

## Quality gate: screenshots
`npm run screens -- <set>` loads the estate in headless Chromium with `?still` (time frozen), waits for every tile in view, saves a fixed set of viewpoints to `docs/screens/<set>/`, fails on any console error, checks that a fresh load renders the same view identically, and prints Plot 01's scene fingerprint. Add `--compare <base>` to diff each shot against an earlier set.
- A **pure refactor** must report `same` for every shot.
- A step that **changes the look** will report `DIFF`: then look at the shots against the baseline yourself, and commit the new set (e.g. `docs/screens/s2/`) as the next baseline.
- The viewpoint list lives in `tools/screens.cjs`. Add viewpoints as the world grows; don't change existing ones.

## Module map (`src/`)
- `estate-main.js` — the one page (`public/index.html`): the estate, streamed tile by tile, with Plot 01 built into its tile. Plot 01's scene comes from `world/build-plot.js`, which runs the builders **in a fixed order** (see below).
- `core/` — seeded random (`random.js`) and noise (`noise.js`). Pure.
- `world/fields.js` — ground fields of the map (`height`, `habitatW`, `streamD`, `wallX`, `outcropW`, `pathW`, `gapW`…). Pure.
- `world/layout.js` — the seeded tree layout (records with ids) from the habitat rules. Pure; uses its own random stream (`map.layoutSeed`), so builder changes don't move the forest.
- `world/plot.js` — re-exports the fields and layout, plus tree-dependent fields (`canopyShade`, `nearKind`). Pure; the sim may import it.
- `world/` (other files) — meshes: `ground.js` (terrain coloured by habitat, cut sides, water), `features.js` (wall, outcrop, stream stones, windthrow, sett, stumps), `props.js` (rocks, log, stump, ant mound), `kit.js` (stakes, string, quadrat, tags, camera trap).
- `flora/` — `trees.js` (trees, saplings, ivy, foliage clumps), `shrubs.js`, `grass.js`, `herbs.js`, `litter.js` (chips, cones, twigs, moss), `fungi.js`.
- `fauna/` — `parts.js` (ellipsoid / segment / pivot helpers), `rigs.js` (mammals), `rigs-birds.js`, `rigs-small.js` (amphibians, reptiles, insects), `motion.js` (steering, flight arcs, wing lift), `behaviours.js` (the prototype's animals), `behaviours-more.js` (the rest), `index.js` (placement and the Follow list).
- `world/obstacles.js` — where animals can't walk (trunks, water, wall, rocks, root plates, logs). Pure; `test/fauna.test.js` checks every route in `data/fauna.json` against it.
- `render/` — `pipeline.js` (renderer, low-res target, pixel post pass), `camera.js` (map controls, follow, keyboard), `lights.js`, `materials.js` (toon ramp), `wind.js`, `textures.js`, `instancing.js` (splits instanced meshes into 15 m chunks for frustum culling), `cutaway.js` (canopy cutaway shader patch: crowns dissolve around the cursor / followed animal as you zoom in; crown-outline rings).
- `ui/` — keyboard state; `hud.js` (place card, dock of icon buttons, popover menus, loading pill; styles in `public/index.html`).
- `estate/` — the 1 km² estate (`world.md` section 12): `terrain.js` (relief, brooks with downhill beds, beaver pond), `cover.js` (land cover and its history), `index.js` (`generateEstate()`: tiles, compartments, patches, ~38k tree records, charcoal platforms). Pure. Map image: `node tools/estate-map.cjs`.
- `estate/fauna.js` — the estate's animals as data (home ranges on walkable ground), `walkable()`. Pure.
- `estate/tile-plan.js` — `planTile(i, j)`: what goes where in one tile, from the estate's 2D design, seeded per tile; `tileFields(i, j)`: per-tile grids of height, cover, canopy shade and spruce nearness for fast dense ground cover. Pure.
- `estate-render/` — `tile-build.js` (tile data as typed arrays: the plot's rules, no scene objects; runs in `src/estate-worker.js`), `tile-mesh.js` (arrays → GPU buffers with shared geometry and materials), `stream.js` (worker pool, near/far tiles around the camera, cache, prefetch, main-thread fallback), `map.js` (minimap and full estate map; DOM/canvas), `fauna.js` (estate animals: rigs near the camera). Entry: `src/estate-main.js` → `public/estate.html`.
- `sim/` — the headless simulation: `forest.js` (gap model: light by patch, JABOWA growth, mortality, snags, regeneration; `describe()` for the inspect card). Parameters in `data/species.json` `growth`, with sources.
- `data/` — `estate.json` (the estate: relief, brooks, pond, units, roads), `fauna.json` (species, what each is doing on the June evening, routes), `map.json` (the 60 m map: wall, stream, outcrop, sett, windthrow…), `plot01.json` (hand-placed heart around the gap), `species.json` (names, render params). Setting Build S1 adds `habitats.json`, `interactions.json`, `history.json` and `map.json`, transcribed from `world.md`.

**Headless boundary:** `sim/`, `estate/`, `world/plot.js` (with `fields.js` and `layout.js`) and `core/` must not import three.js or any package. `test/boundaries.test.js` walks their import graphs and fails if they do.

**Seeded build order:** every builder draws from one shared random stream. Reordering builders in `world/build-plot.js`, or adding or removing random draws in one, moves everything built after it. That's fine when intended, but a pure refactor should leave the scene identical. To check: `npm run screens` prints the scene fingerprint (`tools/scene-fingerprint.js`: a hash of every static mesh's geometry, transform, material and instance data, skipping animal rigs; you can also paste it into the browser console). Compare before and after.

## Debug URL parameters
Estate page: `?at=x,z` · `?detail=0.5` (thinner ground cover) · `?canopy=off`. Plot page: `?seed=N` · `?still` (freeze time) · `?canopy=off` (hide tree crowns) · `?debug=habitats` (colour the ground by habitat) · `?pix=N` · `?zoom=N` · `?look=x,z` · `?lite`

## Gotcha from the prototype phase
When published as a claude.ai artifact, the page's content-security policy blocks `fetch` of `data:` URIs. Load assets as separate same-origin files. (Not an issue on GitHub Pages, but keep assets as normal files anyway.)
