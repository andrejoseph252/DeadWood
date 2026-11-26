# How we got here — ideas tried and lessons

## Idea path
Strategy/factory game ideas → economics-flavoured production → urban planning → a "Retro Bowl formula" (simple core action + season management) → abstract questions settled the goal: feel powerful by making a complex, interconnected system work; endless sandbox; complexity as progress → mixed systems → a forest ecosystem instead of people → real ecological modelling (gap models), starting small and deep → player as researcher/steward with an academic feel → physical actions rather than buttons → director with field agents rather than one playable character → field-station building.

## Visual path
1. **Stylized low-poly diorama** (three.js, browser): pleasant but too simple.
2. **Realistic browser scene**: EZ-Tree procedural trees, Poly Haven ground textures (4 layers, height-blended, anti-tiling), scanned rocks/ferns/logs/stumps, GTAO, physical sky. Looked good for a browser but far from desktop-engine photorealism, ~30 MB, heavy on phones. Kept in `prototypes/realistic-browser/` (assets not included; the tools/ scripts show how they were processed).
3. **Hand-coded 2D pixel art** (Python): looked dated and was abandoned. Lesson: per-pixel procedural drawing can't reach modern HD pixel art.
4. **3D rendered as pixel art** (current): low-res render target, toon gradient map, depth outlines, colour grade. This is the direction.

## Decisions on visuals
- Simulation-first, with a readable view; a beautiful view renders the same simulation.
- High-res pixel art with lots of detail and a modern feel; tilted overview camera; not first person, not flat top-down.
- Clarity: finer pixels (≈2 screen px per art pixel on a laptop), lighter shade bands, softer outlines, no floating particles, flowers on stems, animals in cleared spots, slightly larger than life.

## Technical lessons
- claude.ai artifacts block `fetch` of `data:` URIs (content-security policy): glTF with embedded data URIs failed to load. Fix: textures as separate files, geometry unpacked to GLB in JS. Prefer plain files everywhere.
- Platform: the browser held up well on an M2. Stay on the web (TypeScript, local + GitHub Pages) until real performance limits appear; Godot is the fallback, and the pixel-art render approach ports.
