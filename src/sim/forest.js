// The forest simulation: an individual-tree gap model in the JABOWA / ForClim family (Botkin et al. 1972;
// Bugmann 1996). Headless and seeded, so it can be tested and fast-forwarded.
//
// Each year, in every patch (31.25 m, about ForClim's 833 m² patch size):
//  1. light: trees are ranked by height; each gets exp(-k * LAI of taller trees), Beer-Lambert with k = 0.4;
//  2. growth: JABOWA diameter growth (optimal for the species' size) times a light response that blends the
//     shade-tolerant and shade-intolerant curves by the species' tolerance class;
//  3. mortality: intrinsic (1 % survive to the maximum age) and stress (two slow years in a row);
//  4. dead trees stand as snags for some years, then fall;
//  5. regeneration: species with seed trees in or next to the patch establish if the light on the floor is
//     enough for them.
// Managed open ground (meadows, the orchard, the station) is not simulated: those trees keep their size.
import species from '../data/species.json' with { type: 'json' };
import { createRng } from '../core/random.js';

const K = 0.4, PATCH_AREA = 31.25 * 31.25, SIMULATED = new Set(['ancient', 'mixedSouth', 'spruce1962', 'spruce1985', 'calamity', 'snags', 'ravine', 'coppice', 'crag', 'alderCarr']);
const P = {};
for (const [k, s] of Object.entries(species.trees)) if (s.growth?.hmax) P[k] = { ...s.growth, name: s.common, sci: s.scientific };

// JABOWA allometry and growth for one species (heights in cm inside the equations, as in the original)
for (const p of Object.values(P)) {
  const H = p.hmax * 100; p.b2 = 2 * (H - 137) / p.dmax; p.b3 = (H - 137) / (p.dmax * p.dmax); p.H = H;
  // G: calibrated so that a tree in full light reaches two thirds of its maximum diameter at half its maximum age
  let lo = 1, hi = 2000;
  for (let it = 0; it < 40; it++) { p.G = (lo + hi) / 2; let d = 1.27; for (let y = 0; y < p.amax / 2; y++) d += optimal(p, d); if (d > p.dmax * 2 / 3) hi = p.G; else lo = p.G; }
}
export function heightOf(p, d) { return Math.max(1.37, (137 + p.b2 * d - p.b3 * d * d) / 100); }   // m
function optimal(p, d) { const h = 137 + p.b2 * d - p.b3 * d * d; return Math.max(0, p.G * d * (1 - (d * h) / (p.dmax * p.H)) / (274 + 3 * p.b2 * d - 4 * p.b3 * d * d)); }
// light response (Botkin et al. 1972): shade-tolerant species saturate early (1 - e^(-4.64 (AL - 0.05))); shade-
// intolerant ones start later but keep climbing to a higher rate in full sun (2.24 (1 - e^(-1.136 (AL - 0.08))))
const rTol = (al) => Math.max(0, 1 - Math.exp(-4.64 * (al - 0.05)));
const rInt = (al) => Math.max(0, 2.24 * (1 - Math.exp(-1.136 * (al - 0.08))));
export function lightResponse(p, al) { const w = (p.shade - 1) / 4; return w * rTol(al) + (1 - w) * rInt(al); }
const leafArea = (p, d) => p.la * Math.pow(d, 1.6);   // m²
const establishLight = (p) => 0.42 - (p.shade - 1) * 0.09;   // floor light a species needs to establish: 0.42 (intolerant) .. 0.06 (very tolerant)

export const SPECIES = P;

// est: the estate (generateEstate()); its trees are updated in place, added to and removed from
export function createForest(est, { seed = 1962, startYear = 3 } = {}) {
  const patches = new Map(est.patches.map((p) => [p.id, p])), byPatch = new Map(est.patches.map((p) => [p.id, []]));
  for (const t of est.trees) byPatch.get(t.patch)?.push(t);
  let year = startYear, nextId = est.trees.length;
  const events = [];   // recent notable events, for the interface

  // one year, as a generator that yields every few dozen patches, so the page can spread a year over frames
  function* yearSteps() {
    const { rnd, rr } = createRng((seed * 7919 + year * 104729) >>> 0 || 1);
    const born = [], died = new Set(); let done = 0;
    for (const [pid, list] of byPatch) {
      const patch = patches.get(pid); if (!SIMULATED.has(patch.cover)) continue;
      if (++done % 48 === 0) yield;
      const alive = list.filter((t) => t.status !== 'snag' && P[t.kind]);
      for (const t of alive) t.h = heightOf(P[t.kind], t.dbh);
      alive.sort((a, b) => b.h - a.h);
      // 1-3. light, growth, mortality
      let lai = 0;
      for (const t of alive) {
        const p = P[t.kind], al = Math.exp(-K * lai), opt = optimal(p, t.dbh), inc = opt * lightResponse(p, al);
        t.light = +al.toFixed(3); t.inc = +inc.toFixed(3); t.incOpt = +opt.toFixed(3);
        lai += leafArea(p, t.dbh) / PATCH_AREA;
        t.dbh = +(t.dbh + inc).toFixed(2); t.age += 1;
        t.stress = inc < Math.max(0.01, 0.1 * opt) ? (t.stress || 0) + 1 : 0;
        let pm = 4.605 / p.amax; if (t.stress >= 2) pm += 0.3; if (t.status === 'dying') pm += 0.3;
        if (rnd() < pm) { t.status = 'snag'; t.snagYears = 0; t.diedOf = t.status === 'dying' ? 'drought and bark beetles' : t.stress >= 2 ? 'suppression (too little light)' : 'age'; died.add(t); }
      }
      // 4. snags fall after some years
      for (const t of list) if (t.status === 'snag' && !died.has(t)) { t.snagYears = (t.snagYears || 0) + 1; if (rnd() < 0.08) { t.fallen = true; } }
      // 5. regeneration from seed trees here or in the neighbouring patches
      const floor = Math.exp(-K * lai), stems = alive.length;
      if (stems < 130) {
        const sources = new Set();
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (const t of byPatch.get(`p${patch.i + di}-${patch.j + dj}`) || []) if (t.status !== 'snag' && t.dbh > 15 && P[t.kind]) sources.add(t.kind);
        for (const kind of sources) {
          const need = establishLight(P[kind]); if (floor <= need) continue;
          const lambda = 0.5 * (floor - need) / (1 - need);
          let n = 0; for (let L = Math.exp(-lambda), q = rnd(); q > L; q *= rnd()) n++;   // Poisson
          for (let k = 0; k < n; k++) born.push({ id: `s${nextId++}`, kind, x: +(patch.x + rr(-0.48, 0.48) * 31.25).toFixed(2), z: +(patch.z + rr(-0.48, 0.48) * 31.25).toFixed(2), dbh: +rr(1.5, 3).toFixed(2), age: Math.round(rr(6, 12)), status: 'alive', v: +rnd().toFixed(3), patch: pid, recruit: year });
        }
      }
    }
    // apply removals and births
    for (const [pid, list] of byPatch) { const keep = list.filter((t) => !t.fallen); if (keep.length !== list.length) byPatch.set(pid, keep); }
    for (const t of born) byPatch.get(t.patch).push(t);
    est.trees = [...byPatch.values()].flat();
    year += 1;
    events.push({ year, died: died.size, born: born.length });
    return { died: died.size, born: born.length };
  }
  function stepYear() { const g = yearSteps(); for (;;) { const r = g.next(); if (r.done) return r.value; } }

  function stats() {
    let ba = 0, n = 0; const byKind = {};
    for (const t of est.trees) if (t.status !== 'snag' && P[t.kind] && t.dbh >= 7) { ba += Math.PI * (t.dbh / 200) ** 2; n++; byKind[t.kind] = (byKind[t.kind] || 0) + 1; }
    return { year, stems: n, basalArea: ba / (est.patches.length * PATCH_AREA / 1e4), byKind };   // basal area m²/ha
  }

  // a plain-language reading of one tree's state, for the inspect card
  function describe(t) {
    const p = P[t.kind], sp = species.trees[t.kind];
    const out = { name: sp?.common || t.kind, sci: sp?.scientific || '', dbh: t.dbh, age: t.age, height: p ? heightOf(p, t.dbh) : null, status: t.status, light: t.light, inc: t.inc, incOpt: t.incOpt };
    if (t.status === 'snag') out.why = t.diedOf ? `Died in the simulation (${t.diedOf}); standing dead wood until it falls.` : 'Standing dead wood.';
    else if (!p) out.why = 'Not part of the growth model yet.';
    else if (t.light == null) out.why = 'Press Next season: its light and growth are worked out each summer.';
    else {
      const pct = t.incOpt ? Math.round((t.inc / t.incOpt) * 100) : 0, lightPct = Math.round(t.light * 100);
      out.why = t.light > 0.7 ? `In the canopy with ${lightPct}% light: growing at ${pct}% of its potential.`
        : `Shaded by taller trees (${lightPct}% light). ${p.shade >= 4 ? 'A shade-tolerant species, it keeps growing' : 'Light-demanding, it struggles'}: ${pct}% of its potential.`;
      if (t.stress >= 1) out.why += ' Growth is very slow; if it stays this way it may die.';
      if (t.status === 'dying') out.why = 'Crown browning: drought stress and bark beetles. Likely to die soon.';
    }
    return out;
  }

  return { get year() { return year; }, stepYear, yearSteps, stats, describe, events };
}
