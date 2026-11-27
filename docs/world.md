# Plot 01 — World Document

**Version 1 · 26 Nov 2026**

This document is the single source of truth for what exists in the world: the place, its history, its habitats, its species and how they affect each other. The renderer reads from it now and the simulation will read from it later.

**Working rule:** if the code and this document disagree, the document wins. To change the world, change this document first, then the code.

---

## 0. For Claude Code

**Read first:** `CLAUDE.md`, then this file.

**The task:** the Setting Build, steps **S0–S8** in section 10. Do one step per session, and finish its "done when" checks before moving on.

**Hard constraints:**

- Keep the current look: 3D rendered as pixel art. That means the low-res render target, depth-edge outlines, the toon gradient and the colour grade in the post shader. Don't change the post-shader parameters unless asked.
- No ambient floating particles: no motes, pollen dots or random falling leaves. Anything that moves in the air must be a real thing with a cause, such as a butterfly or a seed falling from a specific plant.
- All randomness is seeded. The same seed must give the same world.
- World state is data, and the renderer draws that state. Every tree, log and animal is a record with an id before it becomes a mesh, because the simulation will take ownership of those records later.
- Species, habitats and interactions live in `src/data/*.json`, transcribed from this document. Never hard-code species facts inside render code.
- Ecological facts must stay real. If something here looks wrong, flag it; don't quietly "fix" it in code.

---

## 1. The place in one paragraph

A **60 × 60 m research plot (0.36 ha)** sits in a Central European low-mountain forest at about 380 m above sea level. The slope falls gently from north-west to south-east. The soil is a slightly acidic loam over sandstone and shale. The climate is temperate, with about 800 mm of rain a year, which is beech's home climate.

The plot straddles an old boundary:

- **The west half** is ancient woodland that has been forest for centuries.
- **The east half** was pasture until the 1960s.

A spring rises at the foot of a small rock outcrop and runs out through the south side. A 2018 storm and the drought years since have left visible marks.

This is a real forest, not a fantasy one. Every species belongs in this kind of place, and every feature has a cause you could discover.

---

## 2. Coordinates and scale

- **Units and axes:** metres. Origin at the plot centre. **+x = east, +z = south, +y = up.** The plot spans x, z ∈ [−30, +30].
- **Height:** about 6 m of fall from the NW corner (y ≈ 6) to the SE corner (y ≈ 0). There is local relief on top of that; see section 3.
- **Chunks:** 10 × 10 m, so 36 in total. Instanced vegetation is batched per chunk so that off-screen chunks can be culled.
- **Existing scene:** the current 28 × 28 m scene becomes the **canopy gap** zone near the centre. Its trees, log, stump, puddle, path and research kit carry over, shifted to fit the new map.
- **Research kit:** corner stakes with orange flags at (±30, ±30), with the boundary string between them. Numbered aluminium tags go on every tree with a trunk thicker than 7 cm at chest height (DBH ≥ 7 cm). The camera trap moves to the badger path (section 3).

---

## 3. Map

The sketch below uses one character per 5 × 5 m cell. Real boundaries are noise-perturbed masks that blend over 3–6 m, not hard lines.

```
  x →     -30         -15          0          15          30
  z ↓     c0 c1 c2 c3 c4 c5 ║ c6 c7 c8 c9 c10 c11
 -30  r0   B  B  B  B  B  B ║ S  S  S  S  S  S
 -25  r1   B  B  C  C  B  B ║ S  S  S  S  S  S
 -20  r2   B  B  C  C  B  B ║ S  S  S  S  S  S
 -15  r3   B  B  B  B  B  b ║ S  S  S  S  S  W
 -10  r4   O  B  B  B  G  G ║ G  G  S  S  W  W
  -5  r5   O  O  B  G  G  G ║ G  G  G  W  W  W
   0  r6   O  O  B  G  G  G ║ G  G  G  W  W  W
   5  r7   O  O  A  B  G  G ║ G  G  P  P  W  W
  10  r8   O  A  ~  A  B  B ║ P  P  P  P  P  P
  15  r9   B  B  A  ~  A  B ║ P  P  P  P  P  P
  20  r10  B  B  B  A  ~  A ║ H  H  H  H  H  H
  25  r11  B  B  B  B  A  ~ ║ ~  M  M  M  M  M
```

| Code | Zone | Habitat (section 5) |
|---|---|---|
| B | Old beech–oak stand | H1 |
| C | Charcoal platform, inside H1 | H1 feature |
| b | Badger sett, dug into the bank beside the wall | H1 feature |
| S | Spruce plantation | H2 |
| G | Canopy gap | H3 |
| A / ~ | Spring flush with alder / stream channel | H4 |
| P / H / M | Pioneer belt / hedge / meadow strip | H5 forest edge |
| O | Rock outcrop | H6 |
| W | Windthrow and dead wood | H7 |
| ║ | Old stone wall, roughly along x ≈ 0, wobbling ±1.5 m | Boundary feature |

### Key features

**The wall**
- A low, collapsed dry-stone ridge 30–60 cm high and about 1 m wide, fully mossed. It runs N–S from z = −30 to z ≈ 26, where the stream has cut through it.
- It is the boundary between ancient woodland to the west and former pasture to the east.

**The outcrop**
- Sandstone along the west edge, at x −30 to −20 and z −12 to +12.
- Its east face is a 1.5–2.5 m step with ledges, crevices and a sunny top. A few boulders have rolled to the foot.

**The spring**
- It rises at (−19, 8), at the outcrop's foot, as a seep and a small pool of about 1 × 0.6 m.

**The stream**
- It runs from the spring along (−19, 8) → (−12, 12) → (−5, 18) → (1, 24) → (4, 30) and exits south.
- The channel is 40–80 cm wide and 20–40 cm deep, with gravel, stones, small riffles and one backwater pool at about (−8, 15).
- It runs year-round but is low in late summer.

**The charcoal platform**
- A flat, roughly circular terrace about 12 m across, centred near (−17, −22) and cut into the slope with a small bank uphill.
- The soil is black and charcoal-flecked. Vegetation on it is sparser and different from the surrounding stand.

**The gap**
- Centred near (0, −2) with an irregular radius of about 9 m. It formed when a veteran beech died; see section 4.
- The fallen trunk lies E–W across the gap, and the stump with honey fungus stands at its west end.

**The puddle and boar wallow**
- At about (5, 3), in a compacted low spot on the path. In the current scene this is the existing puddle.

**The badger sett**
- Five to seven entrances dug into the bank where the wall crosses the slope, near (−3, −15).
- Large spoil heaps sit outside the entrances, with a worn path leading to latrine pits near the wall.

**The windthrow**
- Seven to nine fallen spruces lie roughly NE–SW, which is the storm's direction.
- Their upturned root plates stand 2–3 m tall. Beside each plate is a pit that holds water in spring; this pit-and-mound pattern is typical of windthrow.
- Several grey snags of beetle-killed spruce stand at the plantation's edge.

**The deer path**
- A meandering trail from W to E that crosses the gap. It continues the current `pathZ`.
- A second path runs from the gap down to the stream crossing at about (−5, 18).

**The forest edge**
This is the south-east margin. From the inside out:
- **Pioneer belt (P):** birch, rowan and sycamore.
- **Shrub mantle and hedge (H):** hawthorn, blackthorn, hazel and dog rose, about 4 m deep.
- **Herb fringe:** a strip of nettles and tall herbs along the hedge.
- **Meadow (M):** the last 5 m of the plot. The meadow continues beyond the boundary string.

### Stage A: the 40 × 40 m map (built now)

The plot grows in stages. **Stage A** is a 40 × 40 m map, x, z ∈ [−20, 20], with the canopy gap at the centre. It keeps the land, history and habitats above but rearranges them to fit a smaller square, so it is a sibling of the 60 m sketch, not a window onto it. Positions are in `src/data/map.json`, and the brief for the small details of each habitat is `docs/stage-a-details.md`.

- **Origin:** the gap centre at (0.5, 1), which is where the prototype's gap already was, so the whole hand-placed heart (log, stump, puddle, saplings, animals) keeps its coordinates.
- **The wall** runs N–S at x ≈ 11 (±1 m), so the ancient-woodland side (west) is larger than the former-pasture side (east). The stream cuts through it near the south edge.
- **West of the wall (H1):** the beech–oak stand around the gap, the charcoal platform at (−13, −13) and the badger sett in a bank at (7.4, −15.8) close to the wall.
- **South-west:** the outcrop (H6) along x < −15.5, z > 2; the spring at its foot (−14.5, 8); the stream (H4) runs south-east with alder and ash, and a backwater at (−5, 15.9).
- **East of the wall:** the spruce plantation (H2) north of z ≈ −2.6, the windthrow (H7) from there to z ≈ 10.5 with three root plates, and the pioneer edge (H5) in the south-east. The hedge and meadow strip come with the 60 m map.
- **The deer path** keeps its prototype course through the gap, then bends west along the outcrop's north foot and east between the plantation and the windthrow.
- **Ant mound** at (14.9, −2.5), on the plantation's sunny south edge.
- **Vertical scale:** trees keep the prototype's compressed heights (veteran beech ~10 m, plantation spruce ~12 m) so crowns stay readable from the map camera; ground features (wall, step, channel, pits) are at true scale.
- **Known differences from the 60 m text:** the fallen log and the honey-fungus stump are ~10 m apart (section 3 has the stump at the log's west end); the prototype's three spruces were removed from the beech stand.

### Stage B: the full 60 × 60 m map (built now)

Stage B grows Stage A outward by 10 m on every side, x, z ∈ [−30, 30]. Everything inside the 40 m square keeps its position.

- **South-east, the forest edge from the inside out:** pioneer belt (z ≈ 10.5–21), then the **hedge** or shrub mantle (z ≈ 21–25.5: hawthorn, blackthorn, hazel, dog rose and elder, with a nettle fringe on its inner side), then the **meadow strip** (the last ~4.5 m, with yarrow, knapweed, ribwort plantain and molehills). The buzzard hunts over it.
- **East:** the windthrow continues with three more root plates (six in all), and the trunks now lie at full length.
- **West:** the outcrop continues north along the west edge (x < ≈ −22 north of z ≈ 2), clear of the charcoal platform; the deer path fades out at its foot.
- **South:** the stream runs on through the wall breach and leaves the plot through the south side at x ≈ 18.5.
- **North:** more of the beech–oak stand west of the wall and of the plantation east of it.
- **Performance:** instanced plants are split into 15 m chunks with bounding spheres, so chunks outside the view are not drawn.
- **Still different from the original sketch:** the charcoal platform stays at (−13, −13), and the outcrop covers the whole west edge rather than z −12 to 12, because Stage A had already placed the spring at its foot.

---

## 4. Land history

The forest carries its past, and each event leaves something you can still see.

| When | Event | What you can see today |
|---|---|---|
| Before 1700 → | The west half is continuously wooded (ancient woodland). | Slow-spreading **ancient-woodland indicators**: wood anemone, ramsons and wood sorrel carpets. They are present west of the wall and **almost absent east of it**. |
| ~1700–1860 | **Charcoal burning.** The beeches are cut on a short rotation (coppiced) and burned on the platform. | The charcoal terrace and its black soil. **Multi-stemmed old beeches**, which are grown-out coppice stools. |
| ~1800–1955 | The east half is cleared for **cattle pasture**, and the stone wall marks the line. | The wall. Former-field soil that is more nitrogen-rich and lacks the ancient-woodland flora. |
| 1962 | The east half is **planted with Norway spruce** in rows at 2 m spacing. The wet south-east corner is left out. | Ruler-straight rows of trees all the same age. The pioneer belt colonised the unplanted corner. |
| 1990s | **Thinning** of the spruce. | Rows of old cut stumps. A hidden consequence is that fresh stumps let **root rot** (*Heterobasidion*) into the stand. |
| 2003, 2018–20, 2022 | **Drought years.** | Thin crowns on spruce. Dead tops on some beeches. |
| Jan 2018 | **A winter storm** throws the spruce edge over in the south-east corner. The roots were shallow and partly rotted, on wet soil. | The windthrow zone: root plates, pits and logs all lying in one direction. |
| 2018–21 | **Spruce bark beetle** (*Ips typographus*) breeds in the windthrow and spreads into drought-stressed standing spruce. | Grey snags. Bark flaked off by woodpeckers. Old beetle galleries under loose bark. |
| 2019–20 | **The veteran beech** in the centre (~220 years old) is stressed by drought and decayed by tinder fungus, and it snaps in a 2020 gale. | **The gap**, the fallen trunk with tinder-fungus brackets, and the stump with honey fungus. |
| Study year 1 | **The research plot is established**: stakes, tags, camera trap. | The research kit. The current scene is "June, study year 3". |

**Why this matters later:** most future mysteries are seeded here. Examples include the root rot introduced by the thinning, why oak regenerates only in the gap, why the east half's flora is poor, and what is killing the ash.

---

## 5. Habitats

Area shares are approximate.

### H1 — Old beech–oak stand (~34%)

- **Canopy and light:** closed canopy of veteran beeches (DBH 60–110 cm, 30–35 m tall) with scattered old sessile oaks and holly in the understorey. Dark in summer, at about 2–5% of full light on the floor; bright in spring before beech leaf-out.
- **Ground:** deep beech leaf litter that is coppery and dry. Ground flora is sparse in summer and forms a carpet in spring.
- **Structure:** smooth grey beech trunks, some multi-stemmed. Mossy root buttresses, standing dead wood, woodpecker holes, ivy on the oaks.
- **Signature details:**
  - spring carpets of wood anemone and ramsons
  - a black woodpecker's oval hole in a large beech, with stock doves using it
  - tinder-fungus brackets on a dead limb
  - beech mast husks in the litter
  - the charcoal platform
  - the badger sett and its paths

### H2 — Spruce plantation (~20%)

- **Canopy and light:** dense, dark, uniform rows. Trunks are 30–45 cm DBH and about 25 m tall, with dead lower branches (a self-pruning "branch zone").
- **Ground:** a brown needle floor, almost bare. Bilberry, wavy hair-grass and *Polytrichum* moss grow in the lighter patches. The soil is acidic.
- **Structure:** cut stumps from the thinning, some with small rot brackets at the base. Resin flows. Beard lichen on dead branches. A red wood ant mound at the sunny southern edge.
- **Signature details:**
  - straight rows, with gaps where beetle-killed trees were
  - stripped cones and cone cores under squirrel feeding perches
  - a woodpecker cone anvil
  - a boar rubbing tree with a mud band at knee height
  - fly agarics in autumn

### H3 — Canopy gap (~10%)

- **Canopy and light:** open sky, about 30–60% of full light, with a sun patch that moves through the day.
- **Ground:** dense regrowth. Beech saplings dominate, with rowan, sycamore, birch, a few oaks (jay-planted) and silver fir. There is bramble, foxglove, rosebay willowherb, grasses and sedges.
- **Structure:** the fallen veteran trunk, the stump, the boar wallow and puddle, and the crossing deer paths.
- **Signature details:**
  - browsed saplings (torn shoot tips) next to protected ones
  - fresh boar rooting
  - butterflies in the sun patch
  - shelf fungi on the log
  - this is the busiest place in the plot

### H4 — Spring and stream (~8%)

- **Canopy and light:** black alder and ash along the banks, with a lighter, broken canopy.
- **Ground:** saturated soil at the spring flush, with marsh marigold, opposite-leaved golden saxifrage, lady fern, mosses and liverworts on wet stones. Ramsons grow on the moist banks.
- **Structure:** gravel, riffles and the backwater pool. Alder roots in the water. Some ash with dieback symptoms.
- **Signature details:**
  - beautiful demoiselles in the shaded stretches
  - fire salamander larvae in the pool
  - frog spawn in spring
  - alder cones
  - the gap in the wall where the stream cuts through

### H5 — Forest edge (~15%)

- **Pioneer belt:** birch, rowan, sycamore and young oak, with bramble underneath.
- **Hedge (shrub mantle):** hawthorn, blackthorn, hazel, dog rose, elder and honeysuckle.
- **Herb fringe:** nettles, foxglove and other tall herbs.
- **Meadow strip:** grasses and flowers, with molehills.
- **Light and warmth:** the warmest, sunniest and most insect-rich part of the plot.
- **Signature details:**
  - the hazel dormouse in the hedge (shown through signs: nuts with a neat round hole)
  - blackcaps
  - peacock caterpillars in webs on the nettles
  - a buzzard perching to hunt voles in the meadow
  - blackthorn blossom before the leaves
  - autumn berries

### H6 — Rock outcrop (~5%)

- **Canopy and light:** open to partly shaded. The top is dry and warm.
- **Ground:** thin soil, crusts of lichen, cushions of moss, polypody fern in crevices, bilberry, and a stunted oak or two.
- **Structure:** the rock face with ledges, crevices, boulders at the foot, and leaf litter piled against the face.
- **Signature details:**
  - a common lizard basking
  - a slow worm under a sun-warmed stone
  - lichen colour variety
  - the spring at the foot

### H7 — Windthrow and dead wood (~8%)

- **Canopy and light:** open, with standing grey snags.
- **Ground:** pits holding water in spring, and the root plates with soil and stones still in them. Fallen trunks at every stage of decay.
- **Regrowth:** birch, rowan, willowherb and bramble.
- **Structure:** beetle galleries, woodpecker-flaked bark and fungi.
- **Signature details:**
  - a wren nesting in a root plate
  - a robin's song post
  - frog spawn in the pit pools
  - bracket fungi and slime moulds on the logs
  - resin and frass (beetle boring dust)

---

## 6. Species roster

The **Build** column sets when each species appears:

- **S1:** modelled in the first setting build.
- **S2:** later polish.
- **Sign:** shown only through signs and sounds, never as a model.

Habitat codes match section 5.

### 6.1 Trees

| Species | Where | Look at pixel scale | Role and notes | Build |
|---|---|---|---|---|
| **European beech** *Fagus sylvatica* | H1, H3 saplings | Smooth silver-grey trunk; dense flat leaf layers. Copper litter. Young beech keeps dead leaves in winter. | Dominant and shade-tolerant: it wins the long game. Its mast (beech nuts) feeds mice, boar, jays and squirrels. | S1 |
| **Sessile oak** *Quercus petraea* | H1, H5, H3 seedlings | Rugged furrowed bark, open crown, lobed leaves, ivy. | Light-demanding and browse-sensitive. **Regenerates only where jays plant it and deer don't eat it.** Its acorns are key mast. | S1 |
| **Norway spruce** *Picea abies* | H2, H7 | Dark conical crown, drooping twigs, scaly red-brown bark. | Planted, shallow-rooted and drought-stressed. Host to the bark beetle. | S1 |
| **Silver fir** *Abies alba* | H1/H3 saplings | Flat needles with white undersides; saplings in tiers. | Very shade-tolerant, and **the deer's favourite browse**. It is rare here because of browsing. | S1 |
| **Silver birch** *Betula pendula* | H5, H7, H3 | White bark with black diamonds; airy drooping crown. | Pioneer: first into gaps and windthrow. Hosts fly agaric. | S1 |
| **Black alder** *Alnus glutinosa* | H4 | Dark bark, rounded leaves, small woody cones. | **Fixes nitrogen** through its root nodules. Shades and stabilises the stream banks. | S1 |
| **Ash** *Fraxinus excelsior* | H4 | Grey bark, feathery compound leaves, black buds. | **Ash dieback**: wilting, bark lesions, thinning crowns. | S1 |
| **Rowan** *Sorbus aucuparia* | H3, H5, H7 | Slender; feathery leaves; orange-red berries Aug–Oct. | Bird-dispersed and a favourite deer browse. Its berries feed thrushes and blackcaps. | S1 |
| **Sycamore** *Acer pseudoplatanus* | H5, H3 | Large lobed leaves, winged seed pairs. | Fast and moderately shade-tolerant. Browsed by deer. | S2 |

### 6.2 Shrubs and climbers

| Species | Where | Look | Role | Build |
|---|---|---|---|---|
| **Hazel** *Corylus avellana* | H5 | Multi-stemmed; catkins Feb–Mar; nuts Sep. | Food for dormice and squirrels. The **opened nuts are diagnostic signs** (section 8). | S1 |
| **Holly** *Ilex aquifolium* | H1 | Glossy dark evergreen; red berries in winter. | Evergreen shelter. A roost spot for the owl. | S1 |
| **Elder** *Sambucus nigra* | H5, near the sett | Flat cream umbels in June; black berries Aug–Sep. | Thrives on nitrogen-rich soil (near the sett and old pasture). A **badger scratching tree**. | S1 |
| **Hawthorn** *Crataegus monogyna* | H5 | Thorny; white blossom in May; red haws Sep–Oct. | Hedge core; nesting cover; winter berries. | S1 |
| **Blackthorn** *Prunus spinosa* | H5 | Dark thorny twigs; **white blossom on bare wood** Mar–Apr; sloes. | Spreads by suckers into the meadow, so the edge advances. | S1 |
| **Dog rose** *Rosa canina* | H5 | Arching stems; pale pink flowers in June; rosehips. | Hedge filler. | S2 |
| **Ivy** *Hedera helix* | H1 oaks, wall | Dark lobed leaves climbing trunks; flowers in autumn. | Late nectar for insects; winter berries; owl and wren cover. | S1 |
| **Honeysuckle** *Lonicera periclymenum* | H5 | Twining; cream-pink flowers in summer. | **Dormice strip its bark for nest material.** | S2 |
| **Bramble** *Rubus fruticosus* agg. | H3, H5, H7 | Arching thorny canes; white flowers; blackberries. | Winter browse for deer and nectar for fritillaries. **Protects saplings** from browsing. | S1 |

### 6.3 Ground flora, ferns and mosses

| Species | Where | When it shows | Look | Role | Build |
|---|---|---|---|---|---|
| **Wood anemone** *Anemone nemorosa* | H1 (west of wall) | Flowers Mar–Apr, gone by June | White starry carpets | **Ancient-woodland indicator**; spreads about 1–2 m per decade | S1 |
| **Ramsons** *Allium ursinum* | H1 moist, H4 banks | Leaves Mar, flowers Apr–May, dies back June | Broad bright-green leaves, white globes | Spring carpet; dies back under beech shade | S1 |
| **Lesser celandine** *Ficaria verna* | H4, H1 | Mar–Apr | Glossy yellow stars | Early nectar for bumblebee queens | S2 |
| **Wood sorrel** *Oxalis acetosella* | H1, H2 edges | Leaves all year, flowers Apr–May | Clover-like leaves, small white flowers | Deep-shade specialist | S1 |
| **Common dog-violet** *Viola riviniana* | H3, H5, H1 | Flowers Apr–May | Small violet flowers, heart-shaped leaves | **Food plant for silver-washed fritillary caterpillars** | S1 |
| **Bilberry** *Vaccinium myrtillus* | H2, H6 | Flowers Apr–May, berries Jul–Aug | Low bright-green shrublets, blue-black berries | Acid-soil indicator; food for bumblebees, birds and boar | S1 |
| **Foxglove** *Digitalis purpurea* | H3, H5 | Rosette in year 1, spike Jun–Jul | Tall pink-purple spikes | Gap opportunist from the seed bank; pollinated by long-tongued bumblebees | S1 |
| **Rosebay willowherb** *Chamaenerion angustifolium* | H3, H7 | Flowers Jul–Aug, seed fluff Aug–Sep | Magenta spikes | Disturbance pioneer | S1 |
| **Stinging nettle** *Urtica dioica* | H5 fringe, wall, sett, puddle | Spring–autumn | Dark-green clumps | **Nitrogen indicator** that marks old pasture, the sett and wallows. Food plant for peacock caterpillars. | S1 |
| **Male fern** *Dryopteris filix-mas* | H1, H3 | Unfurls May, browns in autumn | Shuttlecocks of fronds | Shade cover | S1 |
| **Lady fern** *Athyrium filix-femina* | H4 | May–Oct | Lacy bright fronds | Wet-ground indicator | S1 |
| **Common polypody** *Polypodium vulgare* | H6, mossy logs | Evergreen | Small leathery fronds in crevices | Rock and bark epiphyte | S2 |
| **Wood sedge** *Carex sylvatica* | H1, H3 paths | All year | Arching grass-like tufts | Path-side | S1 |
| **Wavy hair-grass** *Deschampsia flexuosa* | H2 | All year | Fine wiry tufts | Acid-soil grass | S1 |
| **Marsh marigold** *Caltha palustris* | H4 spring | Flowers Mar–May | Big glossy leaves, golden cups | Spring-flush indicator | S1 |
| **Opposite-leaved golden saxifrage** *Chrysosplenium oppositifolium* | H4 spring | Apr–Jun | Lime-gold mats on wet ground | **Classic spring indicator** | S1 |
| **Mosses** (*Polytrichum*, *Thuidium*, *Plagiomnium*, *Hypnum*) | Everywhere; shade and wet | All year | Cushions, feathery mats, star-tufts | Moisture indicators; mats on logs and the wall | S1 |
| **Grasses and meadow herbs** (cock's-foot, Yorkshire fog, yarrow, knapweed, ribwort plantain) | H5 meadow | Spring–autumn | Mixed sward with seedheads | Vole habitat; nectar | S1 |

### 6.4 Fungi, lichens and slime moulds

| Species | Where | When | Look | Role | Build |
|---|---|---|---|---|---|
| **Tinder fungus** *Fomes fomentarius* | Dead and dying beech, the gap log | All year (perennial) | Grey hoof-shaped brackets | Decays beech wood. Helped bring down the veteran beech. | S1 |
| **Honey fungus** *Armillaria* spp. | The gap stump, stressed trees | Fruits Sep–Nov | Clusters of honey-coloured mushrooms; black "bootlace" strands under bark | Kills stressed trees and decays stumps | S1 |
| **Root rot** *Heterobasidion annosum* | H2 stumps and roots | Small brackets all year | Small brown-white crusty brackets at stump bases | **Hidden cause:** rots spruce roots → instability → windthrow | S1 (small) |
| **Fly agaric** *Amanita muscaria* | Under birch and spruce | Aug–Oct | Red cap with white spots | Mycorrhizal partner of birch and spruce | S1 |
| **Turkey tail** *Trametes versicolor* | Dead branches, logs | All year | Thin banded fan tiers | Decomposer | S1 |
| **Brittlegills and chanterelles** (*Russula*, *Cantharellus*) | H1 | Jul–Oct | Coloured caps; yellow funnels | Show the underground mycorrhizal network | S2 |
| **Ash dieback** *Hymenoscyphus fraxineus* | H4 ash | Symptoms in summer | Wilting leaflets, diamond bark lesions, crown dieback; tiny white cups on leaf stalks in the litter | **Hidden cause:** gradually opens the stream canopy | Sign |
| **Wolf's milk slime mould** *Lycogala epidendrum* | Rotting logs (H7, gap) | Summer–autumn | Pea-sized pink-to-grey blobs | Decomposer-adjacent detail | S2 |
| **Lichens** (map lichen on rock, *Parmelia* on bark, beard lichen *Usnea* on spruce twigs) | H6, H2, branches | All year | Grey-green and yellow crusts; hanging tufts | Air-quality and microclimate indicators | S1 |

### 6.5 Mammals

| Species | Where | When active | Look | Diet and role | Eaten or used by | Signs | Build |
|---|---|---|---|---|---|---|---|
| **Roe deer** *Capreolus capreolus* | Everywhere; beds in H5 and H3 | Dawn and dusk | Red-brown in summer, grey-brown in winter, white rump patch. Buck has short 3-tine antlers. Kids are spotted (May–Jun). | **Selective browser:** prefers oak, fir, rowan, sycamore and ash over beech and spruce. Eats bramble in winter. | Fox takes young kids | **Torn** shoot tips; fraying on saplings (Apr–May); slots; pellet groups; beds | S1 (have) |
| **Wild boar** *Sus scrofa* | H1 mast, H3 wallow, H2 rubbing tree | Night and dusk | Dark bristly sow. Piglets **striped** until ~4 months (born Mar–May). | Mast, roots, bulbs, worms, larvae, mice, eggs, amphibians. **Roots up soil.** | — | Rooted patches; wallow; mud band on the rubbing tree; tracks | S1 (have) |
| **Red fox** *Vulpes vulpes* | Everywhere; earth in the sett's spare entrances | Night, dusk, sometimes day | Russet, white-tipped tail | Voles, mice, beetles, berries, carrion, leverets | — | Scat on raised spots; trails | S1 (have) |
| **European badger** *Meles meles* | Sett (H1); forages in H3, H5 | Night | Grey body; black-and-white striped face | **Earthworms**, wasp and bumblebee nests, bulbs, fruit | — | Spoil heaps, bedding trails, latrine pits, claw marks on the elder, snuffle holes | S1 |
| **Red squirrel** *Sciurus vulgaris* | H1, H2 | Day | Red-brown, ear tufts in winter | Beech nuts, hazelnuts, spruce seeds. **Caches seeds**, and forgotten caches germinate. | Pine marten, buzzard | **Stripped spruce cones** (ragged core); hazelnuts split in half; drey | S1 (have) |
| **European hare** *Lepus europaeus* | H5 meadow, H3 | Dusk and night | Long black-tipped ears | Grasses, herbs, shoots (cuts them **cleanly at 45°**) | Fox, buzzard (leverets) | Clean-cut shoots; forms; round droppings | S1 (have) |
| **Wood mouse** *Apodemus sylvaticus* | H1, H3, H7 | Night | Small, big ears and eyes, long tail | Seeds, mast, buds, insects. **Eats acorns and seedlings.** | Tawny owl, fox, badger | Gnawed nuts (tooth marks on the outer surface), seed caches | S2 |
| **Bank vole** *Myodes glareolus* | H5, H3 bramble | Day and night | Chestnut back, short tail | Seeds, fruit, fungi, **sapling bark** | Owl, fox, buzzard | Gnawed bark at the base of saplings; runs | S2 |
| **Hazel dormouse** *Muscardinus avellanarius* | H5 hedge | Night; **hibernates Oct–Apr** | Golden-orange, fluffy tail | Hazelnuts, flowers, insects, berries | Owl | **Hazelnut with a smooth round hole**; woven nests of honeysuckle bark | Sign |
| **Pine marten** *Martes martes* | H1 (dens in tree holes) | Night | Chocolate-brown, cream throat bib | Squirrels, voles, birds, berries | — | Twisted scats on paths and logs | Sign → S2 |
| **Mole** *Talpa europaea* | H5 meadow | Underground | — | Earthworms | — | Molehills | Sign |
| **Bats** (brown long-eared *Plecotus auritus*; noctule *Nyctalus noctula*) | Roost in woodpecker holes; hunt over the gap, meadow and stream | Dusk and night; hibernate Nov–Mar | Small dark fluttering shapes | Moths and flying insects | Tawny owl (rarely) | Droppings below roost holes | S2 |

### 6.6 Birds

| Species | Where | When | Look | Role | Signs | Build |
|---|---|---|---|---|---|---|
| **Eurasian jay** *Garrulus glandarius* | Everywhere | All year; caching Sep–Oct | Pinkish-brown, blue wing patch, black moustache | **Plants oaks:** buries thousands of acorns per autumn in gaps and edges. Also eats eggs and nestlings. Raises alarms. | Acorn caches; harsh alarm call | S1 (have) |
| **Great spotted woodpecker** *Dendrocopos major* | H1, H2, H7 | All year; drums Feb–Apr | Black and white, red under the tail | Insect larvae, spruce seeds, nestlings. **Excavates holes** that nuthatches, tits and bats reuse. | **Cone anvils**; ~5 cm holes; drumming | S1 (have) |
| **Black woodpecker** *Dryocopus martius* | H1 big beeches, H2 | All year | Crow-sized, all black, red crown | Carpenter ants and wood ants (digs into mounds in winter), beetle larvae. **Its large oval holes house stock doves, bats and pine martens.** | Oval holes ~9×12 cm; long rectangular feeding excavations; ant mounds dug into | S1 |
| **Tawny owl** *Strix aluco* | Roosts in holly, ivy and spruce; nests in a cavity | Night | Mottled brown, round head | Wood mice and voles; its breeding tracks rodent numbers | **Pellets** under the roost; mobbed by small birds by day | S1 |
| **Common buzzard** *Buteo buteo* | Nests at the edge (H5/H1); hunts the meadow | Day | Broad-winged brown raptor, pale chest band | Voles, mice, young rabbits and hares, worms | Soaring and mewing; perches on the hedge | S1 |
| **European robin** *Erithacus rubecula* | H3, H7, H1 | All year | Orange breast | Ground invertebrates. **Follows boar and badger** to pick up exposed prey. | Song from root plates | S1 |
| **Wren** *Troglodytes troglodytes* | H7 root plates, H4, H6 | All year | Tiny, brown, cocked tail | Small invertebrates | **Nests in root plates**; very loud song | S1 |
| **Eurasian nuthatch** *Sitta europaea* | H1, H4 | All year | Blue-grey back, orange belly, black eye-stripe | Seeds and insects; caches seeds. **Climbs head-down.** | **Mud-plastered** entrances on old woodpecker holes | S1 |
| **Stock dove** *Columba oenas* | H1 | Spring–summer | Grey dove, iridescent neck | Seeds | Uses black woodpecker holes | S2 |
| **Blackcap** *Sylvia atricapilla* | H5 hedge | Apr–Sep | Grey, black cap (male), brown cap (female) | Insects; **elderberries and other berries** in autumn | Rich song | S2 |
| **Treecreeper** *Certhia familiaris* | H1, H2 | All year | Brown, mouse-like, spirals up trunks | Bark insects | — | S2 |

### 6.7 Amphibians and reptiles

| Species | Where | When | Look | Role | Build |
|---|---|---|---|---|---|
| **Fire salamander** *Salamandra salamandra* | Adults under logs in H1 and H4; **larvae in the spring pool and backwater** | Rainy nights Mar–Oct; larvae deposited Mar–May | Glossy black with yellow blotches. Larvae have a yellow spot at the leg base. | Indicator of clean springs. Vulnerable to the chytrid fungus **Bsal**, which is spreading in western Germany: a possible future storyline. | S1 |
| **Common frog** *Rana temporaria* | Spawns in windthrow pits, the backwater and the wallow; forages everywhere | Spawn Feb–Mar; froglets June | Brown to olive, dark ear patch | Eats invertebrates; eaten by boar, fox, buzzard, owl | S1 |
| **Common lizard** *Zootoca vivipara* | H6, sunny logs | Apr–Sep, basking | Small, brown, striped | Insects and spiders | S1 |
| **Slow worm** *Anguis fragilis* | H6, H5 fringe, under warm stones | Apr–Sep, dusk and after rain | Smooth bronze legless lizard | **Slugs** | S1 |

### 6.8 Invertebrates

| Species | Where | When | Look | Role | Build |
|---|---|---|---|---|---|
| **European spruce bark beetle** *Ips typographus* | H2, H7 | Swarms Apr–May; 2nd generation Jul–Aug | Shown only through signs | Breeds in fresh windthrow and stressed spruce, and kills them | Sign: **brown boring dust** at bark crevices and trunk base; resin drops; **bark flaked off by woodpeckers**; crowns turning red-brown, then grey |
| **Red wood ant** *Formica rufa* | Mound at the sunny H2/H3 edge | Mar–Oct; "sunning" clusters in early spring | Mound of needles and twigs; trails up trees | **Tends aphids for honeydew**; predator; **disperses violet and anemone seeds** | S1 (mound + trails as moving specks along defined paths) |
| **Spruce aphids** *Cinara* spp. | Spruce twigs | Summer | Signs only | Make honeydew → ants, and forest honey | Sign |
| **Stag beetle** *Lucanus cervus* | **Old oak stump** in H1 (larvae spend 3–6 years in the rotting wood) | Adults fly June–July at dusk | Large dark beetle; male has antler-like jaws | Dead-oak specialist | S2 |
| **Silver-washed fritillary** *Argynnis paphia* | H3 sun patch, H5 | Jul–Aug | Large orange butterfly, gliding flight | Nectars on bramble; **lays eggs on tree bark near violets** | S1 |
| **Peacock** *Aglais io* | H5 nettles, H3 | Mar–May and Jul–Sep; adults overwinter | Red with eye-spots | Caterpillars in black webs on sunny nettles | S1 |
| **Speckled wood** *Pararge aegeria* | H1/H3 sunflecks | Apr–Oct | Brown with cream spots | Males defend individual sunflecks | S1 |
| **Golden-ringed dragonfly** *Cordulegaster boltonii* | H4 stream | Jun–Aug | Big black-and-yellow dragonfly, patrols low over water | Larvae live 2–5 years in the sandy stream bed | S1 |
| **Beautiful demoiselle** *Calopteryx virgo* | H4 shaded stretches | May–Aug | Metallic blue-green body, dark wings, fluttering flight | Indicator of clean, shaded streams | S1 |
| **Bumblebees** (*Bombus terrestris*, *B. hortorum*) | H5, H3, H6 | Queens Mar; workers Apr–Sep | Fuzzy black, yellow and white | Pollinate foxglove (long-tongued *B. hortorum*), bilberry and bramble. Nest in old mouse holes. | S1 |
| **Earthworms** | Moist soils, especially former pasture | All year | Signs only | Main badger food; mix the soil | Sign (casts) |
| **Sheep tick** *Ixodes ricinus* | Vegetation everywhere | Spring–autumn | — | Parasite on mice and deer. Reserved for a later storyline. | — |

**Total:** about 75 species. About 50 are modelled (S1/S2) and the rest appear through signs.

---

## 7. Interaction web

These links turn decoration into a living system. The **Visible as** column is what the setting build shows now, as scripted behaviour or static signs. The **Later sim hook** column is what each link becomes once the gap-model simulation exists.

| # | Who | Does | To what | Where / when | Visible as (setting build) | Later sim hook |
|---|---|---|---|---|---|---|
| 1 | Roe deer | browses | Oak, fir, rowan, sycamore saplings (beech much less) | H3, H5; winter–spring | Torn shoot tips; stunted "bonsai" saplings; deer nibbling animation | Species browse preference × deer density → sapling height growth and death |
| 2 | Bramble | shelters | Saplings | H3, H5 | Oak and fir saplings unbrowsed inside bramble clumps | Browse pressure reduced in bramble cover |
| 3 | Jay | caches | Acorns → new oaks | Sep–Oct; buries in gaps and edges | Jay flying with an acorn, hopping and burying it | Oak seed rain located in gaps and edges, not under the parent |
| 4 | Squirrel | caches | Beech nuts, hazelnuts | Autumn | Squirrel digging; later, seedling clusters | Dispersal kernel; cache loss rate |
| 5 | Wood mouse, bank vole | eat | Acorns, beech nuts, seedlings, sapling bark | All year | Gnawed nuts; bark-ringed saplings | Seed predation scales with rodent density |
| 6 | Beech and oak mast | drive | Rodents → owls, boar numbers, jays | Mast year → rodent boom next year | Mast carpet in the litter in mast years | Mast-year generator → lagged population pulses |
| 7 | Tawny owl | hunts | Wood mice, voles | Night | Owl flying from its roost at dusk; pellets | Predation term on rodents |
| 8 | Buzzard | hunts | Voles, mice in the meadow | Day | Perching on the hedge, dropping into the grass | Predation term |
| 9 | Fox | hunts | Voles, leverets, beetles | Night and dusk | Mousing pounce in the meadow | Predation term |
| 10 | Wild boar | roots | Soil, bulbs, larvae, mast | H1, H3; autumn–winter | Fresh rooted patches | Bare soil → **germination boost** for light seeds (birch, foxglove); mast removal; ground-flora damage |
| 11 | Robin | follows | Boar and badger | H3, H7 | Robin hopping in rooted soil behind the boar | (Flavour) |
| 12 | Wild boar | wallows, rubs | Puddle; spruce trunk | Summer | Muddy wallow; mud band on the rubbing tree | (Signs for the clue system) |
| 13 | Badger | digs | Sett, earthworms, wasp and bee nests | Night | Spoil heaps; snuffle holes; dug-out nests | Soil disturbance; nest loss for bumblebees |
| 14 | Badger sett | enriches | Soil (nitrogen) | Around the sett | Nettle and elder patches at the sett | Local nitrogen → nettle and elder |
| 15 | Fox | uses | Spare sett entrances | Spring (cubs) | Fox at the sett | (Flavour) |
| 16 | Great spotted woodpecker | excavates | Holes in dead and soft wood | Spring | Fresh holes; wood chips below | Cavity supply |
| 17 | Black woodpecker | excavates | Large holes in big beeches | Spring | Big oval hole | Large-cavity supply (rare, slow) |
| 18 | Cavities | house | Nuthatch, stock dove, bats, tawny owl, pine marten | Breeding season | Nuthatch mud-plastering; doves at holes; bats leaving at dusk | Secondary cavity users limited by cavity supply |
| 19 | Woodpeckers | flake bark from | Beetle-infested spruce | H2, H7 | Pale patches where bark has been flaked off | Signal of an active beetle infestation |
| 20 | Woodpecker | wedges cones in | Cone anvils | Winter | Pile of hacked cones under a crevice | (Sign) |
| 21 | Drought | stresses | Spruce, beech | Dry summers | Thin crowns, early leaf yellowing | Growth reduction; raises beetle and fungal susceptibility |
| 22 | Spruce bark beetle | kills | Stressed spruce | Breeds in windthrow | Boring dust, resin, red crowns → grey snags | Outbreak dynamics: windthrow and drought → beetle → mortality |
| 23 | Root rot | weakens | Spruce roots | Hidden; entered via 1990s thinning stumps | Small brackets at stump bases | Raises windthrow probability |
| 24 | Storm | throws | Weakened spruce | Winter | Windthrow zone | Disturbance event → gap and dead wood |
| 25 | Windthrow | creates | Pits (pools), root plates, dead wood | H7 | Pools, wren nest, frog spawn | Microhabitat and seedbed creation |
| 26 | Dead wood | feeds | Fungi → beetles → woodpeckers | All | Brackets, slime moulds, galleries | Decay classes → saproxylic community |
| 27 | Honey fungus | kills, decays | Stressed trees, stumps | Autumn fruiting | Mushroom clusters, bootlaces | Mortality term for stressed trees |
| 28 | Tinder fungus | decays | Dead and dying beech | — | Brackets on the log and snags | Raises snap risk |
| 29 | Mycorrhizae | trade with | Beech, birch, spruce roots | Underground | Mushrooms in autumn | (Later: nutrient and seedling support) |
| 30 | Alder | fixes | Nitrogen at the stream | H4 | Lush banks | Local nitrogen |
| 31 | Ash dieback | kills | Ash | H4 | Wilting crowns | Ash mortality → stream canopy opens → warmer water |
| 32 | Stream shade and water quality | supports | Salamander larvae, demoiselles, golden-ringed dragonfly | H4 | Larvae in the pool; demoiselles in shade | Shade and temperature thresholds for aquatic species |
| 33 | Wood ants | tend | Spruce aphids (honeydew) | Summer | Ant trails up spruce trunks | (Flavour; later ant–aphid–bird links) |
| 34 | Wood ants | disperse | Violet and anemone seeds | Spring–summer | Ants carrying seeds along trails | Short-range dispersal of ant-spread plants |
| 35 | Black woodpecker, boar | dig into | Ant mound | Winter | Excavated mound | Mound damage |
| 36 | Violets | host | Silver-washed fritillary | H3, H5 | Fritillaries in the sun patch | Butterfly presence tied to violets and light |
| 37 | Nettles | host | Peacock caterpillars | H5 fringe | Black caterpillar webs | (Flavour) |
| 38 | Foxglove, bilberry, bramble | feed | Bumblebees | Spring–summer | Bees on flowers | Pollination → seed set |
| 39 | Gap light | releases | Saplings, flowers from the seed bank | H3 | The gap's vigour versus the dark stand | Light-dependent growth: the core of the gap model |
| 40 | Wall and land history | sets | Ancient-woodland flora west, nitrogen flora east | Permanent | Anemone carpet stops at the wall; nettles east | Initial soil and seed-bank conditions |
| 41 | Slow worm | eats | Slugs | H6, H5 | (Basking, rarely seen eating) | — |
| 42 | Buzzard, fox, owl, boar | eat | Frogs, lizards | — | (Rare scripted moment) | Predation term |

---

## 8. Signs and clues catalogue

These are the most diagnostic traces. They are the physical evidence a field agent will find later, so render them carefully: each must be **recognisable at the plot's pixel scale when zoomed in**.

| Sign | Means | Where |
|---|---|---|
| Ragged, torn shoot tip | Deer browsing (deer have no upper incisors) | Saplings, H3 and H5 |
| Clean 45° cut on a shoot | Hare | H5, H3 |
| Frayed bark strips on a sapling | Roe buck marking territory (Apr–May) | H3, H5 |
| Rooted-up soil patches | Wild boar | H1, H3 |
| Mud band at knee height on a trunk | Boar rubbing tree | H2 |
| Spoil heaps with dragged bedding | Active badger sett | Sett |
| Dung pits (latrines) | Badger territory edge | Near the wall |
| Stripped spruce cone with a ragged core | Squirrel | H2 |
| Gnawed cone, neat and smooth | Mouse | H2, H1 |
| Cones wedged in a crevice, pile below | Woodpecker anvil | H2 |
| Hazelnut split in half | Squirrel | H5 |
| Hazelnut with a smooth round hole, angled tooth marks around the rim | **Hazel dormouse** | H5 |
| Hazelnut with a rough hole, tooth marks on the outer surface | Wood mouse | H5 |
| Brown boring dust at bark crevices | **Active bark beetle** | H2 |
| Pale patches of flaked-off bark | Woodpeckers feeding on beetles | H2, H7 |
| Small crusty brackets at a spruce stump base | **Root rot** | H2 |
| Black bootlace strands under bark | Honey fungus | The gap stump |
| Diamond-shaped bark lesions; wilting leaflets | **Ash dieback** | H4 |
| Mud-plastered hole entrance | Nuthatch | H1, H4 |
| Owl pellets below dense cover | Tawny owl roost | Holly, ivy |
| Anemone carpet ending sharply at the wall | Ancient versus former-pasture land | The wall |
| Black, charcoal-flecked terrace soil | Charcoal platform | H1 |
| Multi-stemmed old beech | Former coppice | H1 |
| Root plates all pointing one way | Storm direction | H7 |

---

## 9. Seasons and time of day

### Seasons

| | Spring (Mar–May) | Summer (Jun–Aug) | Autumn (Sep–Nov) | Winter (Dec–Feb) |
|---|---|---|---|---|
| **Canopy** | Beech bare → leaf-out late Apr–early May (bright lime). Blackthorn blossom on bare twigs. | Full, dark green. The gap is the bright spot. | Beech copper, birch yellow, rowan red. Leaf fall Oct–Nov. | Bare broadleaves. Spruce, fir, holly and ivy stay green. Young beeches keep dead leaves. |
| **Ground** | **Wood anemone and ramsons carpets** before leaf-out. Celandine, violets, marsh marigold, golden saxifrage. | Ramsons gone. Ferns unfurled. Foxglove and willowherb spikes. Bramble flowers. | **Mast fall** (beech husks, acorns). Fungi fruiting (fly agaric, honey fungus). Berries. | Litter, moss and ferns browning. **Snow** some weeks, with tracks. |
| **Water** | High flow. Frog spawn in the pits and backwater. Salamander larvae. | Low flow. Demoiselles and golden-ringed dragonflies. | Rising flow. Leaves in the stream. | Highest flow; ice at the edges. |
| **Animals** | Woodpeckers drumming. Fawns (May–Jun). Striped piglets. Badger cubs emerge. Dormouse wakes in late April. | Butterflies. Deer rut (Jul–Aug). Stag beetles at dusk. Bats over the gap. | **Jays caching acorns.** Squirrels caching. Boar on the mast. Dormouse hibernates in October. | Tracks in snow. Owl calling. Deer in winter grey. Bats hibernating. |

### Time of day

| | Dawn | Day | Dusk | Night |
|---|---|---|---|---|
| **Who is active** | Deer, robin song, wren | Squirrel, jay, woodpeckers, butterflies, lizard, buzzard | Deer, hare, bats emerging, stag beetle (June) | Boar, badger, fox, owl, mice, salamander (rain) |
| **Light** | Low, warm, long shadows | Neutral; sun patch moves across the gap | Warm to blue | Cool blue, very low; moonlit outlines |

---

## 10. Setting Build: steps S0–S8

Each step ends with screenshots from a fixed set of viewpoints, and with a check that nothing earlier has regressed. Don't start a step until the previous one passes.

### S0 — Restructure, no visual change

- Split `src/main.js` into modules:
  - `render/post.js` (pixel pipeline and post shader)
  - `render/camera.js`
  - `world/terrain.js`
  - `world/flora/*`
  - `world/fauna/*` (rigs and behaviours)
  - `world/kit.js` (research kit)
  - `util/rng.js` (seeded mulberry32 or similar)
- Replace every `Math.random()` with the seeded RNG.
- Keep the debug URL parameters (`?pix`, `?zoom`, `?look`) and add `?seed=`.
- **Done when:** screenshots match the current build closely, and the same seed gives identical frames.
- **Status: done** (roadmap step 0 plus a close-out commit). The split used different names from the list above; these are the real ones, and later steps should use them:
  - pixel pipeline and post shader: `src/render/pipeline.js`
  - terrain: `src/world/plot.js` (fields, pure) and `src/world/ground.js` (meshes)
  - flora: `src/flora/*`; fauna: `src/fauna/*` (`rigs.js`, `behaviours.js`)
  - research kit: `src/world/kit.js`
  - seeded RNG: `src/core/random.js` (Park–Miller, not mulberry32)
  - data files: `src/data/*.json`
- URL parameters: `?pix`, `?zoom`, `?look`, `?lite`, plus `?seed=N` and `?still` (frozen time, for comparable screenshots).
- Checked with `npm run screens`: the scene fingerprint matches the prototype exactly, and the same seed gives pixel-identical frames. Baseline shots are in `docs/screens/s0/`.

### S1 — Data files

- Transcribe sections 3–9 into data files:
  - `data/habitats.json`
  - `data/species.json`
  - `data/interactions.json`
  - `data/history.json`
  - `data/map.json` (zone shapes and feature positions)
- Add `scripts/validate-data.mjs`. It checks that ids are unique, every interaction references existing species and habitats, months are 1–12, and every S1 species has a look entry.
- **Done when:** `npm run validate` passes and the build imports the data.

### S2 — The 60 × 60 m terrain

*Built as Stage A (40 × 40 m), then Stage B (60 × 60 m, with chunked instancing); see section 3. The 60 fps check on an M2 still has to be done on real hardware.*


- **Heightmap:** the NW → SE fall, plus:
  - the outcrop step
  - the stream channel and spring pool
  - the charcoal terrace
  - the wall ridge
  - the sett bank and spoil heaps
  - windthrow pits and root-plate mounds
  - path compaction
- **Habitat mask:** per-habitat weights at each ground point, with noise-perturbed boundaries that blend over 3–6 m.
- **Ground colour and litter:** driven by the habitat mask (copper beech litter, brown needles, wet dark soil, black charcoal soil, meadow sward).
- **Stream water:** a surface that fits the pixel look, with glints and subtle flow.
- **Diorama sides:** extend the existing soil-side strata to the new size.
- **Debug overlays:** `?debug=habitats` colours the zones; `?debug=chunks` shows chunk bounds.
- **Camera:** update the clamp to the new bounds. Follow buttons still work. Add **habitat jump buttons**, one per H1–H7.
- **Performance:** chunked instancing with frustum culling. Target **60 fps on an M2** at the default pixel size.
- **Done when:** the plot reads clearly as seven zones from overview, with the gap, the wall, the stream and the outcrop each recognisable at a glance.

### S3 — Trees and shrubs as data

- Generate a **tree list** deterministically from the habitat rules. Each record has `{id, species, x, z, dbh, height, age, status: alive|snag|log|stump, crownRadius, tagNo}`.
- Placement rules:
  - spruce in rows at 2 m spacing, with gaps where trees died
  - veteran beech spacing, plus 2–3 multi-stemmed coppice beeches
  - old oaks with ivy
  - holly under the canopy
  - an alder and ash line along the stream
  - the hedge mantle
  - the pioneer belt
  - snags at the edge of the beetle zone
  - windthrow logs aligned NE–SW
- The renderer draws from the list, so changing a record changes the world.
- Tag every tree with DBH ≥ 7 cm.
- **Done when:** a JSON dump of the tree list reproduces the forest exactly, and each habitat's tree character is unmistakable.

### S4 — Ground flora, fungi, dead wood and signs

- **Flora density:** driven by habitat × light. Compute a canopy-cover map from the tree list and use it as light.
- **The wall:** respect the ancient/former-pasture contrast (section 4).
- **Stream details:** stones, moss, golden saxifrage, marsh marigold, ferns, the backwater.
- **Dead wood:** in decay classes (fresh → soft → moss-covered mound), with the fungi from section 6.4 on the right hosts.
- **Static signs layer:** everything in section 8.
- **Done when:** a zoomed-in tour of each habitat shows its signature details from section 5, and every sign in section 8 can be found somewhere.

### S5 — Animals in the bigger world

- **Existing rigs** (deer, fox, boar with piglets, hare, squirrel, jay, woodpecker) get **home ranges and routes** across the larger plot.
- **New rigs, in this order:**
  - badger
  - tawny owl (roost, then flight)
  - robin and wren (ground hopping)
  - nuthatch (head-down climbing)
  - buzzard (soaring and perching)
  - frog
  - fire salamander
  - common lizard and slow worm
  - butterflies and dragonflies (small rigs with real flight patterns)
  - bats
  - wood ants (moving specks constrained to trails)
- **Scripted interactions** from section 7:
  - #1: deer browsing a sapling
  - #3: jay caching an acorn
  - #8: buzzard hunting the meadow
  - #10–11: boar rooting with a robin following
  - #13: badger foraging
  - #18: nuthatch at a hole, bats leaving at dusk
  - #20: woodpecker at a cone anvil
- Behaviours are driven by data where reasonable: activity times, habitats and routes.
- **Done when:** a five-minute unattended camera tour shows at least eight species moving with believable behaviour, and no animal walks through trees, rocks or water.
- **Status (Stage A, 40 m): first pass built.** The scene is set on a **June evening, about 20:30**, the hour when most of the cast is plausibly out (`src/data/fauna.json` says what each animal is doing then). Built:
  - home ranges and routes for the existing rigs: the deer walks the path from the outcrop's foot to the windthrow and browses an oak sapling (#1); the fox patrols over the wall into the pioneer edge and pounces in the grass; the woodpecker flies between the dead beech and its cone anvil (#20);
  - new rigs: badger (out of the sett, scratching, foraging along its trail, #13), tawny owl (roosting in a holly), robin (following the rooting boar, #10–11), wren (at its root plate), nuthatch (head-down on the oak), buzzard (soaring, then perching on a snag to watch the grass, #8), common frog, fire-salamander larvae in the backwater, common lizard (basking stone), slow worm, speckled wood, beautiful demoiselles, golden-ringed dragonfly, bumblebees on the foxgloves (#38) and wood ants up a spruce (#33);
  - `src/world/obstacles.js` and `test/fauna.test.js`: every route is checked against trunks, rocks, the wall, root plates, logs and water.
- **Not in June:** the jay caches acorns in September–October (#3) and peacock and fritillary adults fly from July, so they wait for the seasons step; bats emerge after sunset and come with S6.

### S6 — Time of day

- Lighting presets in the existing grade: dawn, day, dusk and night. Use `?time=` plus a debug slider.
- Activity schedules per species (section 9).
- At night the scene is still readable: moonlit edge highlights and a lower-saturation grade.
- **Done when:** the cast visibly changes between day and night (badger and owl out at night; squirrel and butterflies by day).

### S7 — Seasons

- Use `?season=` plus a debug slider.
- **Trees:** leaf state per species, including beech leaf-out timing and the dead leaves young beeches keep.
- **Flowers:** windows from the phenology in section 6.
- **Animals:** presence (dormouse hibernation, butterflies, piglets, fawns).
- **Other changes:** mast in the litter, fungi fruiting, snow cover with tracks, ice at the stream edge, and a palette shift.
- **Done when:** four screenshots from the same viewpoint are unmistakably four seasons.

### S8 — Review

- Fixed screenshot set: 12 viewpoints, 4 seasons and 2 times of day, saved to `docs/screens/`.
- Checklist: every habitat shows its signature details, every S1 species appears somewhere, and every section 8 sign can be found.
- Performance check on the M2.
- Then update this document with anything that changed during the build.

---

## 11. Data shape (examples)

```json
// data/species.json (one entry)
{
  "id": "quercus_petraea",
  "common": "Sessile oak",
  "group": "tree",
  "habitats": ["H1", "H5", "H3"],
  "build": "S1",
  "phenology": { "leafOut": 5, "leafFall": 11, "seedFall": [9, 10], "mastInterval": [2, 4] },
  "look": { "maxHeight": 30, "bark": "furrowed grey-brown", "crown": "open, irregular", "notes": "ivy common" },
  "role": { "shadeTolerance": "low", "browsePreference": "high" },
  "signs": [],
  "sim": {}
}
```

```json
// data/interactions.json (one entry)
{
  "id": 3,
  "from": "garrulus_glandarius",
  "verb": "caches",
  "to": "quercus_petraea",
  "where": ["H3", "H5"],
  "months": [9, 10],
  "visible": "jay flies with acorn, hops, buries it",
  "simHook": "oak seed rain placed in gaps and edges, not under the parent"
}
```

The `sim` fields stay empty during the setting build. Real parameters, such as growth curves and shade tolerance from the gap-model literature (JABOWA/ForClim), are filled in when the simulation work starts.

---

## 12. The estate (1 km²)

Plot 01 is the field station's permanent research plot. Around it lies the forest block the station manages: a **1 × 1 km estate (100 ha)**. That is large enough for real populations (a roe deer herd of 10–20, one or two badger setts, a boar sounder passing through), for the full mosaic of forest phases, and for management choices that can differ between stands and be replicated.

### Scale and view

- **The look is set by metres per pixel.** The home view keeps today's overview, where one pixel covers about 15–20 cm and a screen holds about 60–100 m. The world is larger than the screen: you pan across it.
- **Tiles:** the estate is **16 × 16 tiles of 62.5 m** (256 tiles). The tiles around the camera (3 × 3 to 5 × 5) are built at full detail; others are not built.
- **Compartments:** **2 × 2 tiles (125 m, about 1.56 ha)**, 64 in all. A compartment is the unit of management: thinning, fencing, planting and culling are planned per compartment.
- **Patches:** the simulation divides the estate into **32 × 32 patches of 31.25 m** (about 980 m²), close to the patch size of forest gap models such as ForClim, about 833 m². Each patch holds its trees as records.
- **The land is seamless.** The diorama's cut soil edge appears only at the estate border and around the selected compartment, which lifts slightly as its own block.
- **The estate map** is a separate view: a field-notebook map of compartments, used for planning and for jumping into 3D anywhere.

### Coordinates

- Estate metres with the origin at the estate centre: x, z ∈ [−500, 500], **+x east, +z south**, +y up.
- Tile (i, j) spans x ∈ [−500 + 62.5 i, −500 + 62.5 (i + 1)], and likewise for z with j.
- **Plot 01 sits in tile (8, 8)**, whose centre is (31.25, 31.25). Plot-local coordinates are estate coordinates minus (31.25, 31.25).

### Landscape

The ground rises to a sandstone ridge in the north-west and falls to a brook valley that crosses the estate towards the south-east. Relief is about 90 m, from about 440 m above sea level on the ridge to about 350 m where the brook leaves.

| Unit | Where (approx.) | What it is | Why it is there |
|---|---|---|---|
| **Crag ridge** | NW corner, x < −150, z < −250 | Sandstone cliff band along the ridge's south-east face, boulder field below, dry sessile oak and Scots pine on the crest | Hard sandstone beds outcropping; thin acid soil |
| **Ancient beech–oak wood** | West and centre, roughly x −300…45, z −250…170 | Veteran beech, sessile oak, holly; dozens of charcoal platforms; ancient-woodland flora | Continuously wooded for centuries (section 4) |
| **The old wall line** | N–S at x ≈ 42 through Plot 01, then along field edges | Collapsed dry-stone walls | The 1800–1955 pasture boundary |
| **Spruce plantations** | East of the wall line, north of the brook | Rows planted 1962 and 1985; thinning stumps; root rot | Former pasture planted up |
| **Calamity clearing** | NE, x 180…460, z −420…−160 | Several hectares where a 1962 plantation died in the 2019–22 bark-beetle years: salvage-logged ground, log piles at the road, birch and rowan regrowth, one block of grey snags left standing | The real Central European spruce dieback |
| **Brook valley** | W edge → SE corner | The main brook with gravel bars and alder; side brooks from springs, one of them Plot 01's stream | Spring line where sandstone meets shale |
| **Beaver pond** | Flat valley stretch, about (250, 250) | Dam, open water, drowned standing trees, a wet meadow below | Eurasian beaver (*Castor fiber*), returning to these hills |
| **Alder carr** | Wet valley floor, either side of the pond | Black alder on tussocks, standing water in spring | Waterlogged soil |
| **Ravine forest** | Side gorge, x ≈ −250, from the ridge down to the brook | Steep, rocky, shaded: sycamore, ash, small-leaved lime, hart's-tongue fern | Cool, moist, unstable slopes |
| **Oak coppice-with-standards** | Warm south-facing slope below the ridge, about x −460…−250, z 40…200 | Hornbeam and oak coppice under scattered big oaks | Former firewood coppice; warm, dry |
| **Farmstead clearing** | SW, about x −380…−90, z 250…470 | The field station's buildings, hay meadows, an old orchard (apple, pear), hedges and old field walls | The last farm, given up in the 1950s; the station took it over |
| **Old quarry** | East, about (360, −40) | Abandoned sandstone quarry: rock faces, spoil, a pond | Building stone, until 1930 |
| **Roads and trails** | Network | A gravel forest road along the valley and up to the plantations; skid trails; a hunting high seat; boundary stones | Management access |

### Species the estate adds

These are in the roster for the estate only. Build them when their unit is built in 3D:
- **Trees:** hornbeam (*Carpinus betulus*), small-leaved lime (*Tilia cordata*), Scots pine (*Pinus sylvestris*), goat willow (*Salix caprea*), and orchard apple and pear (*Malus domestica*, *Pyrus communis*).
- **Other plants:** hart's-tongue fern (*Asplenium scolopendrium*).
- **Animals:** Eurasian beaver (*Castor fiber*), now on the pond (rig in `src/fauna/rigs.js`).

Sycamore (6.1) is common here.

### Build steps (E1–E5)

1. **E1 — The estate in data.** A seeded, headless generator: terrain, brooks, the landscape units, the land-use history, compartments, patches and initial tree records. Tests, plus a rendered map image for review.
   *Done: `src/estate/` (terrain, cover, generator) and `src/data/estate.json`; `test/estate.test.js`; `node tools/estate-map.cjs` renders `docs/estate/estate-map.png`. About 38,000 starting trees. Densities and sizes per cover are an illustrative starting state, not yet sourced parameters; growth with published gap-model parameters comes with the simulation.*
2. **E2 — The estate map view.** Compartments, stand types and history, with a click to jump into 3D.
   *Map iteration 2: distinct tints per stand type with fine stand outlines, firmer contours (5 m, index every 25 m labelled with its height), spot heights on the ridge top and at the pond, brook and road names (Mühlbach, Klingenbach and Quellbach are names given here; the brooks had none), a colour legend in the side panel, and the hovered compartment outlined.*
   *Redrawn as a hand-tinted survey map: soft watercolour stand tints with hillshade, every tree crown as stipple, smooth contour lines (every 5 m, firmer every 25 m), the pond's shoreline traced from the terrain, smooth tapering brooks and cased roads, serif place names with paper halos, a compass, a scale bar, and a blue location dot with a view cone. The land-cover shapes themselves became organic (domain-warped lobes and bays) and the old wall line wanders beyond Plot 01, in the world as on the map.*
   *Built: `src/estate-render/map.js`. A minimap in the corner (click to jump) and a full field-notebook map (M or the Map button): cover, contours every 5 m, brooks, pond, roads, charcoal platforms, compartment grid and labels, place names, flags on the bespoke places, the camera's footprint and facing; hovering shows a compartment's area, stems, cover shares and history; a click flies the camera there.*
3. **E3 — Streaming 3D.** Tiles built around the camera from the estate data; full detail near, impostor trees further out; animals as populations, spawned as rigs near the camera.
   *First pass built: `estate.html`. `src/estate/tile-plan.js` turns the 2D design into a per-tile plan (seeded from the tile's coordinates); `src/estate-render/tile.js` builds it (near: leaf-clump crowns and ground cover; far: crown blobs and cones); `src/estate-render/stream.js` keeps a 5 × 5 block of tiles around the camera. The bespoke places (Plot 01, the station, the quarry, the pond and dam) are built from the generic rules and flagged with survey stakes until their templates exist. Detail: near tiles are built at Plot 01's density from per-tile field grids (height every 0.5 m; cover, canopy shade and spruce nearness every 1 m; each stand type has a canopy closure lowered in its real gaps): litter, grass, moss, wood sorrel, ferns, sedges, twigs and limbs, cones, bilberry, bramble, willowherb, stumps, logs, meadow flowers, molehills, rocks; trees with full crowns, branches, root flares and buttresses, moss collars, ivy, birch lenticels, dead branch stubs on spruce. Every tree varies in height, crown, lean and tint; stands thin out in clumps and gaps; planted spruce has dominant, co-dominant and suppressed trees, and some are dying back. `?detail=0.5` thins the ground cover. Animals: `src/estate/fauna.js` holds 42 animals as data (13 roe deer in groups, a boar sounder, 3 badgers at a second sett, a fox pair, 4 hares, 6 squirrels, a beaver family on the pond, 2 buzzards), each with a home range on walkable ground; `src/estate-render/fauna.js` gives them rigs near the camera. Follow picks the nearest of a kind.*
4. **E4 — Plot 01 as the anchor tile.** The hand-authored plot drops into tile (8, 8) and blends with its neighbours.
   *Built: the plot scene (`src/world/build-plot.js`) is built into tile (8, 8) when it comes into range, raised by `PLOT.C`; the estate ground eases into the plot's terrain over 16 m (a test keeps the edge step under 8 cm) and into its ground colours over 8 m; the plot's stream continues into the estate brook. Known seam: the plot's rock shelf along its west edge ends at the plot boundary.*
5. **E5 — Visibility.** Zoom-based dithered canopy fade, a cursor cutaway, and crown outlines on the ground.
   *Built: `src/render/cutaway.js`. Crowns dissolve with an ordered-dither edge inside a circle whose radius grows with zoom (none at the home zoom, ~10 m at zoom 1.3, ~15 m close up), centred on the mouse cursor, the followed animal, or the view centre on touch; shadows stay. Crown outlines (pale rings at each crown's radius) show on the ground inside the cut. Low shrubs and saplings are never cut. Following an animal no longer switches the canopy off.*
