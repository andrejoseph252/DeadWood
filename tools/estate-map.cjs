// Render the estate (world.md section 12) to a PNG for review: hillshaded terrain, land cover, brooks, the beaver
// pond, roads, every tree as a dot, charcoal platforms, the compartment grid and Plot 01.
//   node tools/estate-map.cjs [out.png]      (default docs/estate/estate-map.png; 1 px = 1 m, plus a legend)
// Needs Playwright with Chromium, like tools/screens.cjs.
const path = require('node:path');
const fs = require('node:fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('Playwright not found: npm i -g playwright && npx playwright install chromium'); process.exit(2); }

(async () => {
  const root = path.resolve(__dirname, '..');
  const M = await import(path.join(root, 'src/estate/index.js'));
  const E = JSON.parse(fs.readFileSync(path.join(root, 'src/data/estate.json'), 'utf8'));
  const est = M.generateEstate(), H = M.HALF, N = 250, cell = E.size / N;
  // 4 m grids of height and cover
  const hgt = new Float32Array((N + 1) * (N + 1)), cov = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hgt[j * (N + 1) + i] = M.height(-H + i * cell, -H + j * cell);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cov.push(M.coverAt(-H + (i + 0.5) * cell, -H + (j + 0.5) * cell));
  const data = {
    N, H, cell, hgt: Array.from(hgt), cov,
    covers: Object.fromEntries(Object.entries(M.COVERS).map(([k, v]) => [k, v.name])),
    brooks: Object.values(E.brooks).filter((b) => b.points).map((b) => ({ pts: b.points, w: b.halfWidth })),
    roads: Object.values(E.roads).filter(Array.isArray),
    pond: { ...E.pond }, trees: est.trees.map((t) => [Math.round(t.x), Math.round(t.z), t.kind, t.status === 'snag' ? 1 : 0]),
    charcoal: est.charcoal, comps: est.compartments.map((c) => [c.id, c.x, c.z]), plot: E.plot,
  };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1320, height: 1000 } });
  await page.setContent('<canvas id=c width=1320 height=1000></canvas>');
  await page.evaluate((d) => {
    const COL = { ancient: '#3f6a2c', mixedSouth: '#4f7436', spruce1962: '#24453a', spruce1985: '#2f5a44', calamity: '#9a8a52', snags: '#8a8270', ravine: '#4a7a54', coppice: '#6a8a34', crag: '#a39a86', alderCarr: '#3d6a5a', pond: '#3d6676', meadow: '#a7b55a', orchard: '#8fa84a', farmstead: '#c2a878', quarry: '#b8ab8e', plot01: '#5f8a3a' };
    const TREE = { spruce: '#173226', pine: '#2d4a2a', beech: '#24451c', oak: '#33501e', holly: '#132a14', hornbeam: '#3a5a22', sycamore: '#2e5a24', ash: '#4a6a2a', lime: '#3a6024', alder: '#1e3a24', birch: '#d8d4c4', rowan: '#5a7a2a', goatWillow: '#6a7a3a', apple: '#6a8a2a', pear: '#5a7a2a' };
    const cv = document.getElementById('c'), g = cv.getContext('2d'), S = 1000 / (2 * d.H), px = (x) => (x + d.H) * S, pz = (z) => (z + d.H) * S;
    g.fillStyle = '#f2ecdc'; g.fillRect(0, 0, 1320, 1000);
    const img = g.createImageData(1000, 1000), N = d.N, n1 = N + 1, hAt = (i, j) => d.hgt[Math.min(N, j) * n1 + Math.min(N, i)];
    const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    for (let y = 0; y < 1000; y++) for (let x = 0; x < 1000; x++) {
      const i = Math.floor(x / 4), j = Math.floor(y / 4), c = hex(COL[d.cov[j * N + i]] || '#888888');
      const dzdx = (hAt(i + 1, j) - hAt(Math.max(0, i - 1), j)) / (2 * d.cell), dzdy = (hAt(i, j + 1) - hAt(i, Math.max(0, j - 1))) / (2 * d.cell);
      const shade = Math.max(0.45, Math.min(1.35, 1 + (-dzdx - dzdy) * 1.6));   // light from the north-west
      const k = (y * 1000 + x) * 4; img.data[k] = c[0] * shade; img.data[k + 1] = c[1] * shade; img.data[k + 2] = c[2] * shade; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // contour every 10 m
    g.fillStyle = 'rgba(40,30,20,0.28)';
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = Math.floor(hAt(i, j) / 10), b = Math.floor(hAt(i + 1, j) / 10), c = Math.floor(hAt(i, j + 1) / 10); if (a !== b || a !== c) g.fillRect(i * 4, j * 4, 2, 2); }
    // trees
    for (const [x, z, k, snag] of d.trees) { g.fillStyle = snag ? '#d0c8b4' : TREE[k] || '#223'; g.fillRect(Math.round(px(x)), Math.round(pz(z)), 2, 2); }
    // water and roads
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const r of d.roads) { g.strokeStyle = '#e8dcc0'; g.lineWidth = 4; g.beginPath(); r.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z)))); g.stroke(); g.strokeStyle = '#8a7a5a'; g.lineWidth = 1; g.stroke(); }
    for (const b of d.brooks) { g.strokeStyle = '#2f6a8a'; g.lineWidth = Math.max(1.5, b.w * 1.4); g.beginPath(); b.pts.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z)))); g.stroke(); }
    { const p = d.pond; g.save(); g.translate(px(p.centre[0]), pz(p.centre[1])); g.rotate(p.yaw); g.fillStyle = '#3d6e8a'; g.beginPath(); g.ellipse(0, 0, p.rx * S, p.rz * S, 0, 0, 7); g.fill(); g.restore(); g.fillStyle = '#5a3a20'; g.fillRect(px(p.dam[0]) - 3, pz(p.dam[1]) - 6, 5, 12); }
    for (const [x, z] of d.charcoal) { g.fillStyle = '#111'; g.beginPath(); g.arc(px(x), pz(z), 4, 0, 7); g.fill(); }
    // compartments and Plot 01
    g.strokeStyle = 'rgba(30,20,10,0.55)'; g.lineWidth = 1; g.font = '12px sans-serif'; g.fillStyle = 'rgba(20,15,10,0.85)';
    for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(k * 125, 0); g.lineTo(k * 125, 1000); g.moveTo(0, k * 125); g.lineTo(1000, k * 125); g.stroke(); }
    for (const [id, x, z] of d.comps) g.fillText(id, px(x) - 60, pz(z) - 50);
    { const [ox, oz] = d.plot.origin; g.strokeStyle = '#ff6a1a'; g.lineWidth = 3; g.strokeRect(px(ox - 31.25), pz(oz - 31.25), 62.5, 62.5); g.fillStyle = '#ff6a1a'; g.font = 'bold 13px sans-serif'; g.fillText('Plot 01', px(ox - 31.25), pz(oz - 31.25) - 5); }
    // legend
    g.fillStyle = '#2a241c'; g.font = 'bold 16px sans-serif'; g.fillText('Estate, 1 × 1 km', 1015, 30); g.font = '12px sans-serif'; g.fillText('compartments 125 m · contours 10 m', 1015, 48);
    let y = 74; for (const [k, name] of Object.entries(d.covers)) { g.fillStyle = COL[k]; g.fillRect(1015, y - 10, 16, 12); g.fillStyle = '#2a241c'; g.fillText(name, 1038, y); y += 19; }
    y += 8; for (const [label, c, r] of [['brook / pond', '#2f6a8a', 0], ['forest road', '#8a7a5a', 0], ['charcoal platform', '#111', 4], ['standing dead spruce', '#d0c8b4', 0]]) { g.fillStyle = c; if (r) { g.beginPath(); g.arc(1023, y - 4, r, 0, 7); g.fill(); } else g.fillRect(1015, y - 7, 16, 4); g.fillStyle = '#2a241c'; g.fillText(label, 1038, y); y += 19; }
  }, data);
  const out = process.argv[2] || path.join(root, 'docs/estate/estate-map.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  await browser.close();
  console.log(`estate map: ${path.relative(root, out)} (${est.trees.length} trees, ${est.charcoal.length} charcoal platforms)`);
})().catch((e) => { console.error(e); process.exit(1); });
