# Roadmap — one step at a time

Depth on one plot first, then the 1 km² estate around it (`world.md` section 12). Play each step before starting the next.

- [x] **0. Project structure** — split `src/main.js` into modules: `render/` (renderer, pixel post pass, camera), `world/` (terrain, plot, layout), `flora/`, `fauna/` (rigs + behaviours), `ui/`, and an empty `sim/` that imports nothing from three.js. Species parameters in `data/*.json`. GitHub Pages deploy. *(Done: scene verified identical to the prototype by fingerprint; headless boundary enforced by `npm test`. Pages workflow is in place and goes live once the repo is pushed to GitHub.)*
- [ ] **Setting Build (S0–S8)** — build the full 60 × 60 m world from `docs/world.md` before the simulation: data files, terrain and seven habitats, trees as data records, ground flora and signs, animals with routes and scripted interactions, time of day, seasons, review. Steps and "done when" checks are in `world.md` section 10. *(S0 done; next: S1 data files.)*
- [ ] **Estate (E1–E5)** — the 1 km² forest block around Plot 01: 256 tiles of 62.5 m viewed at today's aesthetic, 64 compartments for management, a patch-based headless simulation, an estate map view, streaming 3D, and the visibility tools. Plan and landscape in `world.md` section 12.
- [ ] **1. Time and growth** *(first pass built: `src/sim/forest.js`, a JABOWA/ForClim-style gap model over the estate's patches with sourced species parameters (to be checked against the original tables); play, pause and three speeds; the 3D world rebuilds from the simulation each year; click any tree to inspect it. Seasons, browsing and Plot 01's trees are still to join.)* — clock with pause / play / fast-forward; seasons; trees grow, compete for light and die; saplings fill the gap; seasonal colour.
- [ ] **2. Station and first agent** — tent and one agent; the agent walks the plot and carries out one physically set-up job (e.g. measure the trees you mark); results recorded in a field journal.
- [ ] **3. Click to inspect** *(trees done: species, diameter, height, age, light, growth against potential, and why)* — select any tree, plant or animal: what it is, its state, and why ("beech sapling, 1.2 m, shaded, browsed last spring").
- [ ] **4. Animals that matter** — browsing affects saplings, boar rooting turns soil, populations respond to food and cover.
- [ ] **5. Physical tools** — fence lines, quadrats, camera traps, planting, marking and felling; costs in agent time and budget.
- [ ] **6. Build the field cabin** — first construction goal and tutorial; then shed, lab bench, nursery, weather station, hide, boardwalk.
- [ ] **7. Overlays** — light, soil water, deer pressure, beetle risk; field-notebook map style.
- [ ] **8. Disturbances** — drought years, storms, bark-beetle outbreaks.
- [ ] **9. Research layer** — measurement error, hypotheses, experiments, findings that narrow parameters, forecasts with fan charts.
- [ ] **10. Go bigger** — neighbouring plots, animals moving between them, a valley with level-of-detail rendering.
