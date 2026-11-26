# Plot 01

A forest ecology game. You run a small field station on a 28 × 28 m plot of Central European mixed forest: you send field agents out to survey, experiment and manage the forest, and the ecosystem responds over seasons and decades.

The current build is the visual prototype: the plot as a 3D scene rendered as crisp pixel art, with animals that move, wind, and a map-style camera.

## Run it

```bash
npm install
npm run dev      # serves public/ at http://localhost:8000 and rebuilds on change
npm run build    # one-off minified build into public/main.js
npm test         # headless tests (sim boundary, determinism)
```

Then open the printed local address. URL options: `?lite` (fewer grass blades, smaller shadow map), `?pix=N` (screen pixels per art pixel), `?zoom=N`, `?look=x,z`.

Pushing to `main` on GitHub runs the tests, builds, and deploys `public/` to GitHub Pages (`.github/workflows/pages.yml`; set Settings → Pages → Source to "GitHub Actions" once).

## Controls

- Drag to pan · right-drag (two fingers on a trackpad) to rotate and tilt · scroll to zoom toward the cursor
- WASD / arrow keys move · Q/E rotate · +/− zoom
- Toolbar: Overview, or follow the roe deer, fox, wild boar, hare or squirrel

## Where things are

- `src/` — the game, split into `core/`, `world/`, `flora/`, `fauna/`, `render/`, `ui/`, `sim/` and `data/` (module map in `CLAUDE.md`)
- `test/` — Node tests for the headless parts
- `public/index.html` — page shell, label and camera toolbar
- `docs/design.md` — the game design as decided so far
- `docs/roadmap.md` — the step-by-step build plan
- `docs/history.md` — what was tried, what worked, and lessons learned
- `prototypes/realistic-browser/` — the earlier realistic (non-pixel) version, kept for reference

## Credits

- three.js (MIT)
- Earlier realistic prototype: EZ-Tree by Dan Greenheck (MIT); ground textures and scanned models from Poly Haven (CC0)
