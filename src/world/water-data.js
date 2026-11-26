// Water surfaces as plain arrays (for src/render/water.js): ribbons that follow a stream and grids over still
// water. Pure: no three.js, so tiles can build their water in a worker.
//
// A vertex is [x, y, z, s, across, speed, rough, depth, foam] (see water.js for what each means).
export function waterBuf() { return { P: [], F: [], W: [], I: [], n: 0 }; }

// rows of vertices (each row the same length, across the flow), joined into a strip; quads lying wholly under the
// bank (every corner deeper than `hidden` below ground) are left out
export function addStrip(B, rows, hidden = -0.3) {
  if (rows.length < 2) return;
  const base = B.n, K = rows[0].length;
  for (const row of rows) for (const v of row) { B.P.push(v[0], v[1], v[2]); B.F.push(v[3], v[4], v[5], v[6]); B.W.push(v[7], v[8]); B.n++; }
  for (let r = 1; r < rows.length; r++) for (let c = 1; c < K; c++) {
    const a = base + (r - 1) * K + c - 1, b = a + 1, d = a + K, e = d + 1;
    if (rows[r - 1][c - 1][7] < hidden && rows[r - 1][c][7] < hidden && rows[r][c - 1][7] < hidden && rows[r][c][7] < hidden) continue;
    B.I.push(a, d, b, b, d, e);
  }
}

// a grid of still water at height y over [x0, x1] x [z0, z1], cell size st; depthAt(x, z) is the water depth there
// (negative on dry ground) and keep(x, z) says whether the water may reach that point at all
export function addPool(B, x0, z0, x1, z1, st, y, depthAt, keep = () => true) {
  const nx = Math.max(1, Math.round((x1 - x0) / st)), nz = Math.max(1, Math.round((z1 - z0) / st)), dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
  const id = new Int32Array((nx + 1) * (nz + 1)).fill(-1), dep = new Float32Array((nx + 1) * (nz + 1)), ok = new Uint8Array((nx + 1) * (nz + 1));
  for (let b = 0; b <= nz; b++) for (let a = 0; a <= nx; a++) { const x = x0 + a * dx, z = z0 + b * dz, k = b * (nx + 1) + a; ok[k] = keep(x, z) ? 1 : 0; dep[k] = ok[k] ? depthAt(x, z) : -9; }
  const vert = (a, b) => { const k = b * (nx + 1) + a; if (id[k] < 0) { const x = x0 + a * dx, z = z0 + b * dz; B.P.push(x, y, z); B.F.push(x, z, 0, 0); B.W.push(dep[k], 0); id[k] = B.n++; } return id[k]; };
  for (let b = 0; b < nz; b++) for (let a = 0; a < nx; a++) {
    const k = b * (nx + 1) + a, ks = [k, k + 1, k + nx + 1, k + nx + 2];
    if (!ks.every((q) => ok[q]) || !ks.some((q) => dep[q] > 0)) continue;
    const v00 = vert(a, b), v10 = vert(a + 1, b), v01 = vert(a, b + 1), v11 = vert(a + 1, b + 1);
    B.I.push(v00, v01, v10, v10, v01, v11);
  }
}

// a vertical cross-section of water (where a stream runs out through a cut face): pts are [x, z, ground y] along
// the face, y the water surface
export function addSection(B, pts, y) {
  for (let k = 1; k < pts.length; k++) {
    const [xa, za, ga] = pts[k - 1], [xb, zb, gb] = pts[k]; if (ga >= y && gb >= y) continue;
    const base = B.n, A = Math.min(ga, y), Bb = Math.min(gb, y);
    for (const [x, z, yy, d] of [[xa, za, y, 0], [xb, zb, y, 0], [xa, za, A, y - A], [xb, zb, Bb, y - Bb]]) { B.P.push(x, yy, z); B.F.push(0, 0, 0, 0); B.W.push(d, -1); B.n++; }
    B.I.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
}

export function finish(B) {
  if (!B.I.length) return null;
  return { pos: new Float32Array(B.P), flow: new Float32Array(B.F), wet: new Float32Array(B.W), idx: new Uint32Array(B.I) };
}
