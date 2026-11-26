# Stage A (40 × 40 m): habitat detail brief

This is a design brief for the person who builds the Stage A map. It lists what to place in each habitat, how to build it with the existing techniques, and in which colours. The scene is **June, study year 3**. Coordinates are in metres, with the origin at the centre of the gap, +x east and +z south. The plot spans x, z ∈ [−20, 20].

This brief does not override `docs/world.md`. Where the two differ, the flags in section 13 say so; settle each difference in `world.md` first.

## 0. Conventions

**Build techniques.** These are the names used in the tables. All of them exist in the code already.

| Name | What it is | Where it lives now |
|---|---|---|
| `chip` | Instanced flat quad lying on the ground | `litter.js` |
| `sprite` | Camera-facing dot or clover sprite (`tex.dot`, `tex.clover`, `tex.umbel`) | `herbs.js` |
| `clump` | Leaf or needle billboard (`clumps.leaf`, `clumps.needle`) | `trees.js` |
| `cushion` | Half-sphere, instanced | `buildMoss` |
| `stone` | Icosahedron (detail 0), with vertex colours: moss on top, stone at the sides | `props.js` rocks |
| `stick` | Thin tapered cylinder (`addBranch`, or instanced `twig`) | `trees.js`, `litter.js` |
| `blade` | Grass and sedge fans, coloured from the ground | `grass.js` |
| `frond` | The fern frond strip | `buildFerns` |
| `mesh` | Simple low-poly mesh built for this feature | — |

**What can be seen at which zoom.** In the 40 m overview, one low-res pixel covers roughly 10–15 cm of ground.
- **O** (overview): the detail must still read in the overview, so its smallest dimension should be at least 0.3 m, or it should come in large numbers.
- **Z** (zoom): the detail is meant for close-up views only. Keep these sparse, because each one can only turn into a stray pixel when zoomed out.

**Densities** are given per 100 m² of the habitat's mask, after the existing path and puddle exclusions.

**Base palette.** The ground and objects in the current code use these colours. Reuse them before adding new ones.

| Use | Colours |
|---|---|
| Ground: litter | `#5a4029` `#6e4f30` `#86643c` |
| Ground: grass | `#5f7d2c` `#7f9636` `#9aa543` |
| Ground: needles | `#4d3222` `#5e3d29` |
| Ground: moss | `#3f6b22` `#56862a` |
| Ground: path | `#8a7454` `#a28b66` |
| Ground: mud | `#3e3022` |
| Stone | `#7d807a` `#8a8c85` `#6e716c` |
| Lichen | `#a7b38f` |
| Snag wood | `#8a857a` |
| Bark | beech `#8d917f`, oak `#5b4935`, spruce `#6a3f28`, birch `#e7e3d6` |
| Spruce needles | `#2f5a3c` `#2a5236` |
| Dead spruce needles | `#a5622f` `#b8763c` |
| Water | `#3d6676`, glint `#a9d4dc` |
| Soil strata | `#2a1d14` `#4a3324` `#6b4b33` `#7d6448` |

**Edge blending.** Habitat masks blend over 3–6 m (world.md §3). For the ground colour:
- Use `out.lerp(habitatColour, sstep(a, b, mask + (n2 − 0.5) * 0.3))`, as `groundColor` already does for the gap.
- Noise is what stops a blend from looking like a gradient. Always add the `n2` term, and offset the noise per habitat.

---

## 1. H1: old beech–oak stand (west and north-west of the gap, x < ~10)

**How it should feel in June.** The floor is dark and mostly bare copper-brown litter. The canopy is closed, at 2–5 % of full light.
- The spring carpets have gone. **Wood anemone** has no leaves above ground by June, so render nothing for it; it is data only. **Ramsons** is collapsing yellow.
- What reads as "ancient woodland" in June is restraint: big grey trunks, a sparse floor, and dark islands of holly.

| # | Detail | How to build it | Size | Per 100 m² | Colours |
|---|---|---|---|---|---|
| 1 | Beech leaf litter (*Fagus sylvatica*), last autumn's leaves, flat and coppery | `chip`, as now, biased to copper | 0.15 × 0.1 m | ~1500 | `#a87a45` `#8a6034` `#6e4a2c` `#bf9258` |
| 2 | Wood sorrel (*Oxalis acetosella*), leaves only: **it flowered Apr–May**, so no white dots | `sprite` (clover) in fbm patches 1–3 m across | 0.16–0.24 m | 30–60, in patches only | `#5f9a38` `#56902f` |
| 3 | Male fern (*Dryopteris filix-mas*), full shuttlecocks | `frond` × 8–9 per clump. Favour moist hollows and the ground towards H4. | 0.8–1.1 m | 1–2 clumps | `#4f8a2e` `#447a28` `#5b9834` |
| 4 | Holly (*Ilex aquifolium*) understorey, glossy and evergreen. Its flowers are tiny; **no red berries in June**. | `clump` (leaf) domes on a short `stick`. Group them in 2–4s. | 1.5–4 m tall, 1–2 m wide | 0.5–1 | `#24451f` `#2f5628` `#3a6630` |
| 5 | Beech root buttresses with moss collars | 4–6 `stick`s radiating from each beech base, laid almost flat (y-dir 0.1), in beech bark colour. Moss `cushion`s on top (there are already 5 per tree). | 1–1.5 m long, r 0.12 | per veteran | `#8d917f`; moss `#4f7c2a` `#5d8b30` |
| 6 | Multi-stemmed coppice stools (former charcoal coppice): 3–5 beech stems from one swollen, mossy base | One `mesh` base (squashed cylinder), then `addTrunk` per stem, leaning out 5–10° | base 1.2–1.8 m wide, 0.4 m tall | 0.3 (5–8 in the whole H1) | `#8d917f`, base `#7a7e6e`, moss `#56862a` |
| 7 | Fallen limbs and branches | `stick`, half bark and half greyed. The top half takes moss vertex colour after 2+ years. | 2–6 m long, r 0.08–0.2 | 1–2 | `#5a4632` `#8a857a`; moss `#4f7c2a` |
| 8 | Turkey tail (*Trametes versicolor*) tiers on the limbs | 3–6 small flattened half-discs per limb, stacked | 0.06–0.1 m (Z) | on a third of the limbs | `#6b5a4a` `#a89a84` `#3e3a36` |
| 9 | Tinder fungus (*Fomes fomentarius*) on one dead beech limb or standing dead beech: **grey** hooves | The existing bracket half-sphere, scale (1, 0.6, 0.7) | 0.15–0.3 m | 3–5 in all | `#8a8a80` `#a6a397`, rim `#5f5b53` |
| 10 | Ivy (*Hedera helix*) on the 2–3 oaks (*Quercus*), plus a ground mat of sterile ivy around the oak bases | `sprite` (clover): the trunk ivy as now, and a 2–3 m ground patch | 0.18–0.28 m | 40–70 per oak | `#24451f` `#2f5628` `#3a6630` |
| 11 | Old beech husks (cupules) from last autumn's mast | `chip` with a dark 4-point star texture, or a tiny dark quad. Only under beech crowns. (Z) | 0.04 m | 20–40, under crowns | `#4a3626` `#5c4532` |
| 12 | Black woodpecker (*Dryocopus martius*) hole: one oval in one big beech, 6–10 m up | Dark vertical quad on the trunk, with no chips below (the hole is old) | 0.09 × 0.12 m (Z) | 1 | `#1a1410`, rim `#a9a896` |

**Ground.**
- Base: litter `#5a4029`, `#6e4f30`, and `#7a5634` for highlights.
- Darken by about 8 % where `canopyShade` > 0.7.
- Moss `#3f6b22` only in fbm pockets, around trunk bases, and on the north side of roots.
- **Edge with H3:** grass comes in over 3 m as tufts (density = `gapW`), never as a green ring.
- **Edge with H4:** the ground gets wetter and darker, `#4a3a28`, over 2–4 m from the bank.

**Avoid.**
- Flowers of any kind under the closed canopy in June.
- Wood-sorrel flower dots.
- Blue bilberry dots: bilberry is acid ground, so it belongs in H2 and H6.
- Uniform moss speckle all over the floor: moss belongs on wood, roots and stone, not as random green pixels on litter.
- Spruce trees west of the wall (see flags).

---

## 2. H2: Norway spruce plantation (east of the wall, z < ~−2)

**How it should feel.** Rows planted in 1962, now about 3–4 m apart after the 1990s thinning.
- The rows run N–S, parallel to the wall, which is how a field gets planted.
- Gaps in the rows where trees were thinned or died. Dark and uniform.

| # | Detail | How to build it | Size | Per 100 m² | Colours |
|---|---|---|---|---|---|
| 1 | Needle floor | Smaller `chip` (0.08 × 0.04 m) | — | ~1800 | `#6a4429` `#7d5232` `#59381f` |
| 2 | Fallen cones (*Picea abies*) | The existing capsule cone | 0.12 m | 30–50 | `#7b4e2e` `#6a4026` |
| 3 | Dead lower branches (the self-pruned "branch zone"), grey spikes from 0 to ~8 m on every trunk. **This is the key silhouette.** | Instanced `stick`, nearly horizontal and drooping 10–20° | 0.6–1.4 m, r 0.015–0.025 | 10–20 per trunk | `#6e6458` `#8a8070` |
| 4 | 1990s thinning stumps, flat-cut and weathered, standing in row positions | `mesh` (8-sided cylinder): grey top cap, brown sides, moss caps on about half | Ø 0.3–0.4 m, 0.2–0.4 m tall | 2–4 | top `#7a6a58`, sides `#5a3a24`, moss `#4a7d26` |
| 5 | Root rot brackets (*Heterobasidion annosum*) at the base of a few stumps | 1–3 small flattened half-discs per stump. (Z) | 0.06–0.12 m | on 1 stump in 4 | `#6a4a30`, margin `#e8e0cc` |
| 6 | *Polytrichum* moss carpets in the lighter spots | Low flat `cushion` patches (sy 0.3) | 0.5–1.5 m | 3–6 | `#2f5a2a` `#3d6a2c` |
| 7 | Wavy hair-grass (*Deschampsia flexuosa*) tufts in the light gaps, **flowering in June**: purplish-bronze haze at the top | `blade` (sedge fan), thinner and shorter. Put a `sprite` haze on the top 20 % only. | 0.25–0.4 m | 5–15, in light gaps only | `#6f7a3a` `#8a8f48`; panicle `#8a6a5a` |
| 8 | Bilberry (*Vaccinium myrtillus*) patches at the lighter southern edge. **Berries are green in June** and ripen in July. | Existing bramble/bilberry `clump` code. Drop the berry dots, or make them `#8aa04a`. | 0.25–0.4 m tall | 2–4 patches | `#4c7d34` `#5a8c3a` |
| 9 | Resin flows at wounds | Short vertical quads on the trunk, 1–3 per tree on 1 tree in 8 | 0.2–0.4 m | — | `#d9b25a` `#f0d58a` |
| 10 | Bark beetle signs (*Ips typographus*) on 2–3 edge trees. **Leave interior trees clean.** | Boring dust: a `chip` scatter at the trunk base. Woodpecker flaking: pale patches as quads. | 0.5 m patch | — | dust `#9a6a3c`; flaked bark `#b0703a` `#c98a4a` |
| 11 | Boar rubbing tree: one spruce near the deer path (§6) | A mud band ring around the trunk 0.3–0.8 m above the ground, with trampled ground at its foot | ring height 0.5 m | 1 | `#6a5a44` `#4e4030`; ground `#4e3825` |
| 12 | Beard lichen (*Usnea*) on dead branch tips, **at the edge rows only** | One `sprite` hanging below the branch tip | 0.1–0.15 m (Z) | 1 tuft per 3 edge trees | `#a7b38f` `#b8c29a` |

**Ground.**
- Base: `#4d3222`, `#5e3d29`, and `#3f2a1d` for the deepest shade.
- The edge is **sharp** on the planted sides: needle ground ends about 2 m beyond the last row.
- At the southern (sunny) edge, blend into `#6e4f30` and grass tufts over 3 m.
- At the wall, needles stop at the wall's foot: the wall is the old field line.

**Avoid.**
- Green ground speckle under the closed rows.
- Every trunk with the same branch-zone spikes: vary length and count by ±40 %, and give each tree its own random rotation.
- Lichen tufts deep in the stand (they read as floating pixels).
- Fly agaric (wrong season, see flags).

---

## 3. H3: canopy gap, the rim zone only (5–9 m from (0.5, 1))

The gap interior already exists, so this section is about the ring where gap meets stand.
- The north rim faces south: it is the sunniest edge and gets the most bramble and foxglove.
- The south rim is shaded: there the ferns and sedges move in.

| # | Detail | How to build it | Size | Per 100 m² of rim | Colours |
|---|---|---|---|---|---|
| 1 | Bramble (*Rubus fruticosus* agg.) mounds. **June: white to pale pink flowers and hard green fruit; no black or red berries.** | Existing `clump` mounds. Recolour the berry `sprite`s to flowers and green fruit. | 1–2 m wide, 0.6–1.0 m tall | 4–8 mounds (north rim) | leaves `#3f6a2a` `#365e25`; flowers `#f2e8ee` `#f4dce4`; fruit `#7a9a3a` |
| 2 | Foxglove (*Digitalis purpurea*) in flower: correct for June | Existing spikes. Put most of them in half-shade at the rim, plus first-year rosettes (flat `clump` rings). | spikes 1.0–1.5 m; rosette 0.3 m | 3–6 spikes, 4–8 rosettes | `#d0609f` `#e993c4`; rosette `#5f8a3a` |
| 3 | Rosebay willowherb (*Chamaenerion angustifolium*): **green spikes with dark bud tips; flowers come from July** | Existing spike, with buds coloured, not magenta | 1.0–1.5 m | 5–10 | stem `#4f7d2c`; buds `#7a4a5a` `#8a5a6a` |
| 4 | Beech advance regeneration crowding the rim | Existing saplings, denser at the rim | 0.5–2.5 m | 8–15 | existing beech sapling colours |
| 5 | Browsed "bonsai" saplings, for contrast: oak, fir and rowan outside bramble with torn tips; the same species inside bramble tall and intact | Sapling with a squat crown and a ragged top (the top 2 clumps removed, one pale torn tip `#c9b48a`) | 0.3–0.6 m | 2–4 | sapling colours; torn tip `#c9b48a` |
| 6 | Wood sedge (*Carex sylvatica*) tussocks lining the deer paths | Existing sedge `blade`. Raise the density within 1 m of `pathW`. | 0.4–0.6 m | 6–10 along paths | `#3f6626` `#4a7330` |
| 7 | Fresh boar rooting at the moist south rim | The existing `rootedW` field, plus turned clods: `stone` in soil colour | patches 1–3 m; clods 0.1 m | 1 patch | `#3b2a1c` `#4e3825` |
| 8 | Flowering grass tops (June is peak grass flowering) | A tint on the top vertex of the existing `blade`s in the gap: `offsetHSL` towards tan for about 30 % of blades | — | — | `#a89a6a` `#b0a070` |

**Ground.**
- Grass `#5f7d2c` and `#7f9636`, mixing into litter `#6e4f30` across the rim.
- Grass blade density should follow `gapW` with noise, so the gap edge breaks up into tongues.
- Never draw a circle: perturb the gap radius by ±1.5 m with low-frequency noise.

**Avoid.**
- Ripe berries.
- Magenta willowherb.
- Grass that reaches more than 1–2 m into the stand.
- A ring of flowers exactly on the gap edge.

---

## 4. H4: spring and stream (spring at (−14.5, 8), stream to (10.5, 19.5), backwater at (−5, 15.5))

**June conditions.** Low flow exposes gravel bars on the inside of bends.
- Golden saxifrage is past its flowers and now forms lime mats.
- Marsh marigold has no flowers: only big leaves remain.
- Ramsons on the banks is collapsing.

| # | Detail | How to build it | Size | Per 100 m² (or per 10 m of stream) | Colours |
|---|---|---|---|---|---|
| 1 | Channel water: a ribbon mesh following the polyline, 0.4–0.8 m wide, sunk 0.2–0.4 m into the terrain | `mesh` strip (MeshBasic like the puddle), with riffle glints as small quads where the slope is steeper | — | — | `#3d6676`; pools `#2f5260`; glints `#a9d4dc` |
| 2 | Gravel and stones in the bed and on bars | `stone`, small and flattened. Wet stones are darker, with moss above the water line. | 0.05–0.2 m | 30–50 per 10 m | `#8a867c` `#9b968a` `#76726a`; wet `#5e5c56` |
| 3 | Cut banks: small earth steps on the outer bends | Darkened terrain colour, or thin vertical `mesh` faces with root `stick`s | 0.2–0.4 m tall | 2–3 per 10 m | `#4a3324` `#6b4b33`; roots `#5a4030` |
| 4 | Spring pool and seep: pool about 1 × 0.6 m, with a saturated flush 3–4 m downslope | Water disc as for the puddle; dark wet ground in the flush | — | 1 | pool `#2f5260`; flush ground `#3e3022` `#4a3a28` |
| 5 | Opposite-leaved golden saxifrage (*Chrysosplenium oppositifolium*): lime-gold mats on the wet flush and on stones | Flat `chip` mats, very low (y + 0.01) | 0.2–0.6 m patches | dense on the flush, 10–20 | `#9aa83a` `#b8b84a` |
| 6 | Marsh marigold (*Caltha palustris*): leaves only in June, big, round and glossy | `sprite` (clover) scaled up, 5–9 leaves per clump | clump 0.3–0.4 m | 3–6 clumps at the spring | `#3f7a2a` `#4f8a30` |
| 7 | Lady fern (*Athyrium filix-femina*): lacy, brighter than male fern | `frond` with narrower, paler colours | 0.6–1.0 m | 1 clump per 2–3 m of bank | `#6aa83e` `#7ab448` |
| 8 | Black alder (*Alnus glutinosa*) with roots in the water, plus last year's black cones on the ground | Arching root `stick`s at the waterline. Cones as a tiny dark capsule (Z). | roots 0.5–1 m; cones 0.02 m | 1 alder per 6–8 m of bank | bark `#4a4238`; cones `#2a2420`; leaves `#3f6a2a` `#4a7a30` |
| 9 | Ash (*Fraxinus excelsior*) with dieback: thin crown, a few brown wilted clumps, bare twig tips, one diamond lesion | Remove 30–50 % of crown `clump`s and colour 10 % brown. Lesion as a dark quad on the trunk. | — | 2–4 ash in all | bark `#8a8a80`; wilted `#8a7a3a` `#a08a4a`; lesion `#4a3a30` |
| 10 | Ramsons (*Allium ursinum*) dying back on the moist banks: yellowing, flattened leaves and a few seed-head stalks | Leaves as flat `chip`s. Stalk `stick` with a dot `sprite` head. | leaves 0.2 m; stalks 0.3 m | 40–80 chips in bank patches only | `#a8a24a` `#8c8a3a` `#c2b55a`; heads `#9aa05a` |
| 11 | Backwater pool: still, darker, with a few floating leaves | Water disc 1.5 × 1 m; leaf `chip`s on the surface | — | 1 | `#2a4a58`; leaves `#6e4f30` |

**Ground.**
- Wet loam `#3e3022` and `#4a3a28`, banks greener `#4f7a2c`, gravel `#8a867c`.
- The wet band is 1–2 m each side of the channel and 3–4 m at the flush, blending into H1 litter.

**Avoid.**
- Frog spawn: by June it has become tadpoles.
- Bright yellow marigold cups.
- White ramsons globes.
- Glints that shimmer when the camera is still: they must be static under `?still`.
- Making the stream perfectly smooth: wobble its width by ±20 %.

---

## 5. H5: pioneer edge (east of the wall, z > 10)

| # | Detail | How to build it | Size | Per 100 m² | Colours |
|---|---|---|---|---|---|
| 1 | Silver birch (*Betula pendula*): mature pioneers in the unplanted corner since the 1960s | Existing birch | 12–18 m | 1–2 | existing |
| 2 | Rowan (*Sorbus aucuparia*) **in flower**: creamy flat heads (May–June) | Tree with feathery leaf `clump`s; `sprite` (umbel) smaller than elder's | 4–8 m; heads 0.15–0.2 m | 1–2 trees | leaves `#5f9a34` `#6faa3c`; flowers `#efe6c8` |
| 3 | Bramble thickets: bigger and continuous here, flowering | Mound `clump`s merged into 3–6 m swathes | 0.8–1.2 m tall | 30 % cover | as in H3 #1 |
| 4 | Stinging nettle (*Urtica dioica*) stands, dense and dark | Existing nettle geometry, in patches of 20–60 | 0.8–1.4 m | 2–3 patches | `#3f6e2a` `#355e24` |
| 5 | Peacock (*Aglais io*) caterpillar webs: grey silk tents at nettle tops, black larvae speckled in (correct for June) | A pale `sprite` cluster with 3–6 black dot `sprite`s on top | 0.15–0.3 m | 2–3 per nettle patch | silk `#d8d4c8`; larvae `#1a1a1a` |
| 6 | Tall grasses flowering (cock's-foot, *Dactylis glomerata*) | `blade`s 1.5× taller, with seedhead tips | 0.6–1.0 m | dense in open spots | `#7f9636` `#9aa543`; heads `#a89a6a` `#8a7a5a` |
| 7 | Foxglove at the shaded inner side | Existing | — | 2–4 | existing |
| 8 | Elder (*Sambucus nigra*) **in flower** (correct for June) | Existing elder at (12.2, 11.8) | — | 1 | existing |
| 9 | Young oak and sycamore saplings, browsed outside the bramble | Saplings | 0.5–2 m | 2–4 | sapling colours |

**Ground.**
- Grass `#5f7d2c`, `#7f9636`, `#6e8a34`.
- Nettle patches sit on darker ground, `#4e5a2a`.
- Thin birch litter `#a87a45` under the birches.
- Blend into H7 over 4 m: the ground goes from grass to grass mixed with bare plate soil.
- At the wall, the transition is sharp: litter on the west side, grass and nettles on the east (world.md §8, wall row).

**Avoid.**
- Hedge shrubs (hawthorn, blackthorn) and meadow flowers: they belong to the later 60 m ring.
- Ripe hips, haws or berries.
- Butterflies as static sprites: animals are rigs or nothing.

---

## 6. H6: rock outcrop (x < ~−15.5, z > 2)

| # | Detail | How to build it | Size | Per 100 m² | Colours |
|---|---|---|---|---|---|
| 1 | Sandstone face, 1.5–2 m: stacked horizontal beds with ledges | `mesh` of offset box slabs with jittered vertices, so the bedding planes read. Lighter tops, darker undersides. | beds 0.3–0.6 m thick; ledges 0.3–0.6 m deep | — | `#a8987a` `#8f7f66` `#b8a888`; shadowed `#6e6656` |
| 2 | Boulders at the foot, partly sunk | `stone`, scaled 0.4–1.2 m, sunk 30 % into the ground, mossy tops | 0.4–1.2 m | 4–6 in all | as row 1, with moss `#4e7a2a` |
| 3 | Lichen crusts: map lichen and grey crusts on sunlit tops and faces | Vertex-colour blotches on the rock mesh, **not separate sprites** | 0.1–0.4 m blotches | — | `#a7b38f` `#c2c46a` `#b8b8a8` |
| 4 | Moss cushions on ledges and the north-facing parts | `cushion` sitting on ledge tops | 0.2–0.5 m | 10–20 | `#3f6b22` `#56862a` |
| 5 | Common polypody (*Polypodium vulgare*) in crevices and on ledges | A small `frond` (scale 0.3), 4–6 per tuft | 0.15–0.3 m | 6–10 tufts | `#3f6e2a` `#4a7a30` |
| 6 | Bilberry on the thin soil on top (berries still green) | Existing bilberry `clump` | 0.2–0.35 m | 30–40 % cover on top | `#4c7d34` `#5a8c3a` |
| 7 | Wavy hair-grass tufts on top | As H2 #7 | 0.25–0.35 m | 10–20 | as H2 |
| 8 | Stunted sessile oak (*Quercus petraea*): twisted, with a low crown | Oak, h 4–6, r 2–3, trunk lean 0.08 | 4–6 m | 1–2 in all | oak colours |
| 9 | Beech litter drifted against the foot of the face | Extra litter `chip`s in a 0.5–1 m band at the base, raised 0.1–0.2 m | — | 2× H1 density | H1 litter colours |
| 10 | Flat sun-warmed basking stone on the sunny SE corner of the top (lizard spot; the slow worm lies under a stone) | One flat `stone` | 0.4–0.6 m | 1–2 | `#b8a888` |

**Ground.**
- Thin soil `#6e5a3e` and `#7d6448`, with bare rock showing through.
- On top, the soil blends into bilberry green. At the foot, it blends into H1 litter, or the H4 flush at the spring.

**Avoid.**
- Lichen as floating dot sprites.
- Ferns sticking out of a sheer face with nothing to hold them: put them in crevices only.
- Rock coloured like the cut-side strata (it would read as soil).

---

## 7. H7: windthrow (x > 12.5, z ~1.5–10)

**Timing.** The storm was in January 2018, so this is 8 summers later.
- The logs have mostly lost their bark and turned silver-grey.
- The root plates have shed soil, so their edges are ragged and root ends stick out.
- Birch has grown 2–5 m tall.
- Storm direction: trunks lie towards the NE, root plates stand at the SW end, and the pit lies on the plate's **SW (upwind) side**.

| # | Detail | How to build it | Size | Per 100 m² | Colours |
|---|---|---|---|---|---|
| 1 | Root plates: near-vertical discs (70–90°) | `mesh`: a flattened, ragged disc 0.4–0.6 m thick in strata colours, with embedded `stone`s and radiating root `stick`s. Grass, willowherb or moss on the top rim. | 2–3 m tall | 5–6 in all | soil `#4a3324` `#6b4b33`; roots `#5a4030` `#8a857a`; stones `#8a867c` |
| 2 | Pits beside the plates: mostly mud in June, with 1–2 still holding shallow water | Terrain depression 2 × 1.5 m, 0.4–0.6 m deep. Water disc as for the puddle. | — | one per plate | mud `#3e3022`; water `#3d6676` |
| 3 | Fallen trunks, all lying towards the NE: silver-grey with patches of remaining bark and branch stubs. Some are bridged on their stubs and some have sagged onto the ground. | Trunk cylinder (as the gap log) plus stub `stick`s | 10–20 m, r 0.15–0.22 | 5–6 in all | `#8a857a` `#9a958a`; bark `#6a3f28` |
| 4 | Grey snags at the plantation edge: tops broken, bark sloughing in sheets | Existing snag code, trunk only. Bark patches as quads. | 6–15 m | 3–4 in all | `#8a857a`; bark `#6a3f28` |
| 5 | One or two recently killed spruces (2025–26 beetle) with rust-brown crowns, standing **in the plantation edge row** | Existing `t.dead` spruce | full height | 1–2 | `#a5622f` `#b8763c` |
| 6 | Woodpecker flaking on snags: orange-brown inner bark on the recent kills, greyed on the old ones | Quads on the trunk | 0.3–0.8 m | 2–4 per snag | fresh `#b0703a` `#c98a4a`; old `#a89c88` |
| 7 | Birch regeneration (8 years old) | Sapling or small-tree birch | 2–5 m | 3–6 | birch colours |
| 8 | Rowan, browsed | Sapling with a torn tip | 1–2 m | 1–3 | rowan sapling colours |
| 9 | Rosebay willowherb stands (green with buds in June) and bramble draped over the logs | Existing spikes and `clump` | — | 2–3 patches | as in H3 |
| 10 | Brackets on the logs: turkey tail, plus a few **grey** tinder-like brackets (see flags about red-belted conk) | As in H1 #8 and #9 | 0.08–0.2 m | 1–3 per log | `#6b5a4a` `#a89a84`; `#8a8a80` |

**Ground.**
- A mix of: needle remnants `#5e3d29`, bare mineral soil `#6b4b33` at the plates and pits, and grass and regrowth `#5f7d2c` in the open.
- Use higher-frequency noise than other habitats, because the ground here is disturbed.
- Towards H2 the edge is sharp (row edge). Towards H5 it blends over 4 m.

**Avoid.**
- Plates facing random directions: keep ±15° around the storm axis.
- Fresh-looking orange plates. After 8 years they are dark soil, grey roots and green rims.
- Frog spawn. Boring dust on the old logs. Root plates hovering above their pits: sink the bottom edge 0.2 m.

---

## 8. The stone wall (x ≈ 11 ± 1, full N–S)

| # | Detail | How to build it | Size | Density | Colours |
|---|---|---|---|---|---|
| 1 | Core ridge: a low earth-and-stone hump | Terrain bump in the height field (smooth, 1 m wide, 0.3–0.6 m high) | — | continuous | moss ground `#3f6b22` `#56862a` |
| 2 | Wall stones, half-buried in the ridge | The existing rock `stone` code with vertex colours (moss on top, grey sides), flattened (sy 0.5) | 0.2–0.45 m | 6–10 per metre of wall | `#7d807a` `#8a8c85` `#6e716c`; moss `#4e7a2a` `#5d8a2f` |
| 3 | Tumbled stones spread 1–1.5 m out on each side, fewer with distance | `stone`, sunk into the ground | 0.15–0.35 m | 1–3 per metre | as row 2 |
| 4 | Ivy sheets over sections | `sprite` (clover), flat on the wall | 2–4 m sections | 2–3 in all | `#24451f` `#2f5628` |
| 5 | Polypody on the top in shaded stretches | As H6 #5 | — | 1 tuft per 3 m | as H6 |
| 6 | Breaches: the deer crossing (about x 11, z 0) and the stream (10.5, 19.5). The ridge drops to 0.1 m, with stones pushed aside or into the water. | Lower the height bump; fewer `stone`s | 1–1.5 m wide | 2 | — |
| 7 | The flora contrast across the wall: wood sorrel and litter to the west; needles (north) or grass and nettles (south) to the east | Masks keyed to which side of the wall line | — | — | — |

**Avoid.**
- A neat continuous fence of stones.
- Stones sitting on top of the ground: sink each by 20–40 %.
- Identical stone sizes.

---

## 9. Charcoal platform (centre (−13, −13), radius ~5)

| # | Detail | How to build it | Size | Density | Colours |
|---|---|---|---|---|---|
| 1 | Flat terrace cut into the slope: a bank 0.4–0.8 m high on the uphill NW side and a low lip on the downhill SE side | Height field: flatten inside the radius and blend over 1 m. The bank is a steep section. | — | — | bank `#4a3324` |
| 2 | Black, charcoal-flecked soil | Ground colour plus `chip` flecks (Z) | flecks 0.03–0.05 m | 300 per 100 m² | `#1a1816` `#2a2724` |
| 3 | Sparse, thin litter: about 40 % of the H1 density, so dark soil shows through | `chip` | — | ~600 | H1 litter colours |
| 4 | Moss cushions (*Polytrichum*, *Hypnum*), more than in the surrounding stand | `cushion`, low | 0.2–0.5 m | 8–12 | `#2f5a2a` `#3f6b22` |
| 5 | Wavy hair-grass tufts | As H2 #7 | — | 5–10 | as H2 |
| 6 | A few stunted beech seedlings | Saplings 0.2–0.5 m | — | 3–5 | beech sapling colours |
| 7 | One rotten old stake or kiln remnant: a short grey `stick` in the ground, optional | `stick` | 0.4 m | 1 | `#6e6458` |

**Ground.**
- Base `#2a2520`, `#33302a`, and `#3e3a30` at the rim.
- The edge is **sharper** than other habitats: blend over 1–1.5 m, not 3–6 m, because the terrace edge is physical.

**Avoid.**
- Pure black ground (under toon shading it reads as a hole): stay at or above `#2a2520`.
- Any green carpet on the terrace.

---

## 10. Badger sett (around (4, −15), dug into a bank; latrines at the wall foot around (10, −14))

| # | Detail | How to build it | Size | Density | Colours |
|---|---|---|---|---|---|
| 1 | 5–7 entrances: D-shaped, wider than tall, facing downhill (SE), each at the head of a short trough | Dark half-ellipse quads set into the bank, with the trough as a terrain groove | 0.25–0.35 m wide, 0.2 m high | 5–7 | `#1a120c` |
| 2 | Spoil heaps: fans of yellow-brown subsoil downhill of each entrance, with stones in them | Height bump in the terrain, ground colour, embedded `stone`s | 1.5–3 m long, 0.3–0.6 m high | one per entrance | `#8a6a44` `#9a7a50` `#7d6448` |
| 3 | Old bedding (dry grass and leaves) dragged out on 1–2 heaps | `chip`s in pale straw colour | 0.3–0.5 m patches | 1–2 | `#b8a070` `#a08a5a` |
| 4 | Badger paths: worn trails 0.25 m wide radiating out, one to the latrines and one to the gap | The `pathW`-style field, narrow | — | 3–4 | `#6e5a40` `#7a6448` |
| 5 | Latrine pits at the wall foot, with dark dung | Small dark terrain dents | 0.15–0.2 m | 3–5 | pit `#3e3022`; dung `#3a2a1c` |
| 6 | Nettles and elder on the nitrogen-rich spoil: an elder with claw-scratched bark | Existing nettles; elder `clump`, in flower. Scratches as pale vertical quads at 0.3–0.8 m. | — | 1 elder, 1–2 nettle patches | as before; scratches `#c9b48a` |
| 7 | Snuffle holes in the litter around the sett | Tiny dark ground dents (Z) | 0.05–0.1 m | 20–40 within 8 m | `#3b2a1c` |

**Avoid.**
- Round black circles flat on the ground: entrances must sit in a slope face.
- Spoil heaps in litter colour: they must read as fresh yellow-brown subsoil.

---

## 11. Five micro-scenes (hand-placed, each a few metres across)

1. **The woodpecker anvil, (14.5, −4)**, at the plantation's sunny edge just north of the deer path.
   - A thinning stump with a cone wedged in a crack, and 25–40 hacked cones in a heap below.
   - Two metres away, a second stump that squirrels use as a feeding perch, with stripped cores and a scatter of scales.
   - On the neighbouring trunk, a resin drip.
   - This puts three cone signs (§8) side by side so they can be told apart.

2. **The crossing, (11, 0)**: where the deer path breaches the wall.
   - Two wall stones knocked onto the east side, and a mud patch with slots.
   - A browsed rowan sapling at 0.5 m.
   - A tuft of red-brown summer hair caught on a bramble cane on the wall top.
   - One step west, the litter-and-sorrel floor; one step east, the needles.

3. **The latrine line, (10, −14)**.
   - Four latrine pits along the foot of the wall.
   - The badger path from the sett at (4, −15) arriving at them.
   - The **camera trap on a stake** at (8.5, −13.2), aimed along the path (world.md §2 moves it to the badger path).
   - A flowering elder with scratch marks at (6, −13.5).

4. **The wren's root plate, (15.5, 6)**: the biggest plate.
   - A moss nest ball (0.12 m, `#4a7d26`) in a hollow among the roots.
   - The pit on its SW side still holding a 1 × 0.8 m pool. Tadpoles are animation later; render the water only.
   - A grey snag at (17, 3.5) whose broken top is the robin's song post.
   - Bramble draped over the trunk running NE from the plate.

5. **The salamander backwater, (−5, 15.5)**.
   - A still pool under an alder whose roots arch into the water.
   - Last year's black cones caught at the edge.
   - A flat stone half in the water.
   - Lady fern on the bank.
   - A collapsed ramsons patch going yellow on the north bank.
   - The second deer path (gap to stream crossing) meets the water just upstream, at about (−6, 15).

Spare: **the charcoal clue, (−9.5, −11)**. A boar-rooted patch on the platform rim exposes black soil and two fist-sized charcoal lumps (`#1a1816`): the history is literally dug up.

---

## 12. Global "avoid" list

- **Single-pixel sprites** at overview: ants, larvae, husks and charcoal flecks are zoom-only. Cap their counts and do not scatter them everywhere.
- **Floating things:**
  - Everything ground-placed takes `height(x, z)` at its own x, z, not at the parent's centre. This matters on the 4 m slope, the stream banks and the sett bank.
  - Stones, plates and boulders sink 20–40 %.
- **Uniform noise speckle:** every scatter should be clumped (an fbm threshold), not uniform random.
- **Static butterflies or birds as sprites:** animals are rigs or nothing (world.md §0).
- **Colour drift:** new greens should stay inside `#24451f`–`#9aa543`. The only bright accents in June are foxglove pink, elder and rowan cream, and bramble white.
- **Hard habitat lines**, except the three physical ones: the wall, the planted row edge and the charcoal terrace.

---

## 13. Ecological sanity flags

The layout in the request is sound overall. The flags below are things to settle first, in `world.md` or the data files, not quietly in code.

**Already in the code, wrong for June:**
1. **Honey fungus mushrooms on the stump.** *Armillaria* fruits Sep–Nov. In June, show black bootlace strands (rhizomorphs) and a white mycelial fan under a lifted bark flap instead.
2. **Fly agarics.** They fruit Aug–Oct, so remove them in June.
3. **Bramble berries** (black and red): June has flowers and green fruit. **Bilberry berries** (blue): green until July.
4. **Rosebay willowherb in magenta bloom.** It flowers from July (world.md §6.3 says Jul–Aug); in June it has buds only.
5. **Wood sorrel flowers** (25 % of sprites): it flowers Apr–May.

**Data mismatches:**

6. **Oak species.** `species.json` says *Quercus robur*; world.md §6.1 says *Q. petraea*. The document wins, so update the data.
7. **Tinder fungus colour.** The log and snag brackets are ochre (`#d7b071`, `#c9a067`). *Fomes* is grey. Ochre reads more like *Fomitopsis*.

**Layout carried over from the 28 m scene:**

8. **Spruces at (−6.2, −11.6) and (−12, −0.5)** now fall in ancient-woodland H1, west of the wall. Mature Norway spruce is not native at 380 m here and was only planted east of the wall. Either replace them with beech or oak, or document them as self-seeded young trees (under 30 years old, from the 1962 plantation).
9. **Birch at (−2.5, −11.4)** sits in closed beech stand. It can stay only if it is on the gap rim.
10. **Snag at (6.2, −4.8)** in H1: it should be a dead *beech* (grey bark with tinder fungus), not spruce-looking.
11. **Ant mound at (9.6, −0.8)** is now west of the wall, in H1 and in the gap. Move it to the sunny southern edge of H2, for example (16.5, −4), clear of the deer path.
12. **The deer path continues `pathZ`**, which extrapolates north. It reaches z ≈ −4.5 at x = 18 and z ≈ −6 at x = 20, into the plantation. East of x ≈ 10 it needs re-shaping to stay in z −1 to +1.5 between H2 and H7.

**Inherited inconsistency:**

13. **Gap log and stump.** World.md says the stump stands at the west end of the fallen trunk. In the scene, the log is at (−3, 6.8) and the stump at (4.6, −0.6), about 10 m apart and not at a log end. Either the log is a broken-off upper section, which should be written down, or one of them moves.

**Layout choices to confirm:**

14. **Holly** is sub-Atlantic. It is fine if the plot is in western Germany, which the Bsal storyline suggests, but it should be rare further east. Worth one line in world.md.
15. **Windthrow age.** Rust-brown snags mean the trees died in the last 1–2 years. All 2018–21 beetle kills are grey by now. Keep rust-brown to 1–2 trees.

**Species world.md might add for realism** (not in the roster, so don't render them until the document lists them):
- **Red-belted conk** (*Fomitopsis pinicola*): the typical bracket on dead spruce.
- **Raspberry** (*Rubus idaeus*) and **foxglove** on windthrow.
- **Natural spruce seedlings** on the root plates and logs.
- A **wood melick or wood millet** grass for the gap rim.

**Stream and sett:**

16. **Stream exit.** The breach at (10.5, 19.5) is 0.5 m from the plot edge. Notch the cut side of the diorama at the exit so the water visibly leaves the block, rather than ending at a wall of soil.
17. **Badger sett at (4, −15).** It is 7 m from the wall, which is fine. Its entrances should face downhill (SE), and the "bank" must be real relief in the height field, at least 1–1.5 m of local rise. The general 4 m fall is too gentle to dig into.
