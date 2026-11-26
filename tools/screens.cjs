// Quality gate: fixed-viewpoint screenshots of the estate, console errors, determinism, and a pixel comparison
// against a saved baseline set.
//   npm run screens -- <set>                     capture into docs/screens/<set>/
//   npm run screens -- <set> --compare <base>    also compare each shot with docs/screens/<base>/
// Needs `npm run build` first and Playwright with Chromium. Shots use ?still (time frozen) and wait until every
// tile in view is built, so two runs of the same build give the same pixels. Also prints Plot 01's scene
// fingerprint (tools/scene-fingerprint.js) once the plot has been built inside the estate.
// Exit code 1 on a console error, a non-identical repeat frame, or (with --compare) any shot that differs.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('Playwright not found: npm i -g playwright && npx playwright install chromium'); process.exit(2); }
const ROOT = path.resolve(__dirname, '..'), PUBLIC = path.join(ROOT, 'public');

// The fixed viewpoint set: [name, x, z, zoom, canopy, viewport]. Add as the world grows; never change existing entries.
const VIEWS = [
  ['start', -40, 20, 0.42, true], ['plot01', 31, 31, 0.42, true], ['plot01-floor', 31, 31, 0.6, false],
  ['spruce', 140, -150, 0.42, true], ['calamity', 318, -292, 0.6, true], ['meadow', -250, 400, 0.6, true],
  ['ravine', -246, -200, 0.42, true], ['pond', 238, 246, 0.6, true], ['crags', -300, -330, 0.42, true],
  ['ancient-floor', -40, -60, 0.6, false], ['phone', -40, 20, 0.42, true, [390, 844]],
];
const args = process.argv.slice(2), set = args.find((a, k) => !a.startsWith('--') && args[k - 1] !== '--compare'), base = args.includes('--compare') ? args[args.indexOf('--compare') + 1] : null;
if (!set) { console.error('usage: npm run screens -- <set> [--compare <baseline set>]'); process.exit(2); }
if (!fs.existsSync(path.join(PUBLIC, 'estate.js'))) { console.error('public/estate.js missing: run npm run build first'); process.exit(2); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const server = http.createServer((req, res) => { const f = path.join(PUBLIC, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html')); if (!f.startsWith(PUBLIC) || !fs.existsSync(f)) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f)); });

(async () => {
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/?still`, outDir = path.join(ROOT, 'docs/screens', set); fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = []; let failed = false;
  async function open(size = [1280, 800]) {
    const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 }); page.setDefaultTimeout(1800000);
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(url); await page.waitForFunction(() => document.body.classList.contains('ready'));
    await page.addStyleTag({ content: '.toast,.pill{display:none!important}' });   // transient interface bits
    return page;
  }
  const shoot = async (page, v) => { await page.evaluate(([x, z, zoom, canopy]) => window.__view(x, z, zoom, canopy), v.slice(1, 5)); await page.waitForTimeout(600); return page.screenshot({ path: path.join(outDir, v[0] + '.png') }); };
  const shots = {};
  for (const size of [...new Set(VIEWS.map((v) => (v[5] || [1280, 800]).join('x')))]) {
    const page = await open(size.split('x').map(Number));
    for (const v of VIEWS.filter((q) => (q[5] || [1280, 800]).join('x') === size)) shots[v[0]] = await shoot(page, v);
    if (size === '1280x800') { const fp = await page.evaluate(fs.readFileSync(path.join(__dirname, 'scene-fingerprint.js'), 'utf8')).catch(() => null); if (fp) console.log(`Plot 01 fingerprint: n=${fp.n} hash=${fp.hash}`); }
    await page.close();
  }
  console.log(`saved ${VIEWS.length} shots to docs/screens/${set}/`);
  async function diff(a, b) {
    const p = await browser.newPage();
    const r = await p.evaluate(async ([x, y]) => { const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; }); const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { changed: -1, total: 0 };
      const read = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const da = read(ia), db = read(ib); let changed = 0; for (let k = 0; k < da.length; k += 4) if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) changed++; return { changed, total: da.length / 4 }; }, [a.toString('base64'), b.toString('base64')]);
    await p.close(); return r;
  }
  // determinism: a fresh page, the same view, the same pixels
  { const page = await open(), again = await shoot(page, ['start-repeat', ...VIEWS[0].slice(1)]); await page.close(); fs.unlinkSync(path.join(outDir, 'start-repeat.png'));
    const d = await diff(shots.start, again); if (d.changed) { failed = true; console.log(`FAIL a repeat of the same view differs in ${d.changed} pixels`); } else console.log('ok   the same view renders identically on a fresh load'); }
  if (base) for (const v of VIEWS) { const f = path.join(ROOT, 'docs/screens', base, v[0] + '.png'); if (!fs.existsSync(f)) { console.log(`new  ${v[0]}`); continue; } const r = await diff(shots[v[0]], fs.readFileSync(f)); if (!r.changed) console.log(`same ${v[0]}`); else { failed = true; console.log(`DIFF ${v[0]}: ${r.changed < 0 ? 'size changed' : (100 * r.changed / r.total).toFixed(2) + '% of pixels'}`); } }
  if (errors.length) { failed = true; console.log('FAIL console errors:\n  ' + errors.slice(0, 8).join('\n  ')); } else console.log('ok   no console errors');
  await browser.close(); server.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
