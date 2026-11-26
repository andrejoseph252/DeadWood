# Game design — as decided so far

## Fantasy and feel
- **Feel:** powerful through understanding; satisfaction from making a complex system work, not from building big. Endless sandbox, with optional scenario briefs.
- **Progress:** the system you understand and manage gets more complex over time.
- **Tone:** academic, a proper ecology way of thinking: the scientific method as the core loop.

## Setting
- One 28 × 28 m plot of Central European mixed forest around a sunlit canopy gap, shown as a diorama block with soil horizons at the cut edges, corner stakes and a boundary string.
- Starting condition idea: a struggling plot (spruce under drought and bark-beetle stress, too many deer, little dead wood) to be turned into a resilient mixed forest. Alternative: an empty clearing. Not final.
- Species in the prototype:
  - Trees: Fagus sylvatica (beech), Quercus (oak, with ivy), Betula pendula (birch), Picea abies (spruce, healthy and beetle-killed), a standing dead snag; saplings including rowan and silver fir
  - Ground layer: bramble, bilberry, elder, foxglove, rosebay willowherb, nettles, ferns, sedges, wood sorrel, moss, fungi (fly agaric, honey fungus, bracket and shelf fungi)
  - Animals: roe deer (Capreolus capreolus), red fox, wild boar sow with piglets, brown hare, red squirrel, jay, great spotted woodpecker

## Player role: director of a field station
- The player is **not** a single walking character (judged likely to get boring). The player directs from the overview camera.
- **Field agents** do the work. The player sets jobs up physically on the map:
  - drag fence lines, drop quadrat frames, choose a tree and aim a camera trap's cone, paint-mark trees for thinning and set fall direction, choose planting spots
- Optional **take-over**: the player can directly perform a precision task (a count, a tape measurement) when they want to.
- Agents have skills (botany, birds, soils) that set measurement accuracy, limited hours, fatigue, and wear paths that compact soil over time. More agents are hired as grants grow.

## Field station (base building)
- Year 0: a tent and one assistant. First goal: build the field cabin (doubles as tutorial).
- Buildings unlock capabilities: tool shed (equipment), lab bench (soil/water analysis), plant nursery (grow local seedlings), weather station (climate data), wildlife hide (better observations), boardwalk (protects ground from trampling).
- Building: place footprint, agents build over days, consuming materials. Timber can come from the player's own thinning, tying construction to forest decisions. Where you build disturbs ground.

## Time
- A year of four seasons. Each season: **plan** (paused; set up jobs) → **watch** (season plays at chosen speed; agents work, animals move, events happen) → **report** (data and season summary arrive in the field journal).
- Fast-forward available for decades of growth.

## Resources
- **Agent time** (field hours/days) — what can physically be done
- **Budget** from research grants — materials, equipment, hiring
- **Reputation** from solid findings — bigger grants, new methods, eventually neighbouring plots

## Information is earned
- The plot is visible, the numbers are not. Every measurement returns an estimate with error; error comes from method, sample size and agent skill (or the player's own care in take-over mode).
- Imperfect detection: not seeing a species does not mean it is absent.
- Methods: tree inventory (species, height via clinometer, diameter via tape, crown health), sapling quadrats, browsing and dung transects, camera traps (review photos and identify), soil cores, bird point counts, beetle traps and bark checks.

## Experiments → knowledge
- Hypothesis in the journal (e.g. "deer browsing prevents oak regeneration") → design (fenced vs open quadrats, replicates, duration; before/after/control-impact) → result with an effect size and confidence range, confounders flagged (e.g. a drought year).
- Solid findings narrow the model's uncertain parameters → tighter forecasts, reputation, unlocks.

## Forecasts
- Before a big decision, the forecast tool runs the next ~20 years many times and shows a range of outcomes (fan chart) for chosen measures. Better knowledge → narrower range.

## Ecology engine (simulation)
- Ground grid of ~1–10 m cells: light at height layers, soil water, nitrogen, dead wood/litter, fungal network strength, compaction.
- Trees as individuals (species, height, diameter, age, crown, stress) with gap-model growth: max growth × light × water × nutrient × temperature factors; mortality from age/stress; regeneration from seed rain and dispersers.
- Other species as populations per cell or per plot, coupled: browsing, predation, seed caching (jay → oak), beetles following drought-stressed spruce, dead-wood chains (beetles → woodpeckers → cavities), trampling → compaction → fungi loss.
- Disturbances: drought, storm, beetle outbreak, invasive plants, slow climate shift.
- Success measures: species richness, evenness (Shannon), size-class structure (healthy "reverse-J"), functional diversity, and resilience (recovery after shocks).

## Visual direction
- 3D scene → low-res render → pixel art: 4-step toon light, crisp shadows, cool shade / warm sun grade, depth outlines. Billboard leaf clumps with sphere normals for crowns; instanced grass that takes the ground's light; wind as travelling gust waves.
- State visible on the plants: crown thinning, rust-brown dead spruce, seasonal colour.
- A second "field notebook" look for overlays and survey data (muted map, symbols, plot lines) is planned.

## Open questions
1. Starting condition: broken plantation vs empty clearing.
2. How harsh uncertainty should be (gentle ranges and hints vs hard-core misleading designs).
3. Scoring: researcher (knowledge), manager (forest outcomes), or both.
4. Name.
