# Roadmap — one step at a time

Depth on one plot before going bigger. Play each step before starting the next.

- [ ] **0. Project structure** — split `src/main.js` into modules: `render/` (renderer, pixel post pass, camera), `world/` (terrain, plot, layout), `flora/`, `fauna/` (rigs + behaviours), `ui/`, and an empty `sim/` that imports nothing from three.js. Species parameters in `data/*.json`. GitHub Pages deploy.
- [ ] **1. Time and growth** — clock with pause / play / fast-forward; seasons; trees grow, compete for light and die; saplings fill the gap; seasonal colour.
- [ ] **2. Station and first agent** — tent and one agent; the agent walks the plot and carries out one physically set-up job (e.g. measure the trees you mark); results recorded in a field journal.
- [ ] **3. Click to inspect** — select any tree, plant or animal: what it is, its state, and why ("beech sapling, 1.2 m, shaded, browsed last spring").
- [ ] **4. Animals that matter** — browsing affects saplings, boar rooting turns soil, populations respond to food and cover.
- [ ] **5. Physical tools** — fence lines, quadrats, camera traps, planting, marking and felling; costs in agent time and budget.
- [ ] **6. Build the field cabin** — first construction goal and tutorial; then shed, lab bench, nursery, weather station, hide, boardwalk.
- [ ] **7. Overlays** — light, soil water, deer pressure, beetle risk; field-notebook map style.
- [ ] **8. Disturbances** — drought years, storms, bark-beetle outbreaks.
- [ ] **9. Research layer** — measurement error, hypotheses, experiments, findings that narrow parameters, forecasts with fan charts.
- [ ] **10. Go bigger** — neighbouring plots, animals moving between them, a valley with level-of-detail rendering.
