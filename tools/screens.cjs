// Quality gate for every build step: fixed-viewpoint screenshots, console errors, determinism, and a
// pixel comparison against a saved baseline set.
//
//   npm run screens -- <set>                     capture into docs/screens/<set>/
//   npm run screens -- <set> --compare <base>    also compare each shot with docs/screens/<base>/
//
// Needs `npm run build` first and Playwright with Chromium (pre-installed in Claude Code cloud sessions;
// elsewhere: `npm i -g playwright && npx playwright install chromium`).
// Shots use ?still, so time is frozen and two runs of the same build give the same pixels. The page loads once per
// viewport size and the camera moves between viewpoints through the page's window.__view hook.
// Exit code 1 if the page logs an error, the same seed builds a different scene, or (with --compare)
// any shot differs from its baseline. A difference is not always wrong: a step that is meant to change
// the scene will differ, and then the shots are for a person to look at.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('Playwright not found: npm i -g playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const plot = require(path.join(ROOT, 'src/data/plot01.json'));

// The fixed viewpoint set. Add to it as the world grows (world.md S8 asks for 12); never silently change an
// existing entry, or old baselines stop being comparable.
const VIEWS = [
  // s0 (28 m prototype); kept as they were
  { name: 'overview' },
  { name: 'overview-phone', size: [390, 780] },
  { name: 'gap', look: [plot.gap.x, plot.gap.z], zoom: 2.2 },
  { name: 'puddle', look: [plot.puddle.x, plot.puddle.z], zoom: 3.5 },
  { name: 'log', look: [-3, 6.8], zoom: 3.5 },
  { name: 'corner-nw', look: [-11, -11], zoom: 2.4 },
  // Stage A (40 m)
  { name: 'overview-floor', canopy: false },
  { name: 'beech-wood', look: [-8, -6], zoom: 1.6, canopy: false },
  { name: 'charcoal', look: [-12, -13], zoom: 2.4 },
  { name: 'sett', look: [7.4, -14], zoom: 2.8 },
  { name: 'wall', look: [11, -6], zoom: 2.4 },
  { name: 'plantation', look: [16, -11], zoom: 1.8 },
  { name: 'windthrow', look: [16, 5], zoom: 2 },
  { name: 'pioneer-edge', look: [15, 15], zoom: 2 },
  { name: 'stream', look: [-8, 13], zoom: 2 },
  { name: 'outcrop', look: [-17, 11], zoom: 2.2 },
  // Stage A detail (close-ups of the micro-scenes; crowns hidden so the ground shows)
  { name: 'spring', look: [-13.5, 9], zoom: 3.6, canopy: false },
  { name: 'backwater', look: [-5, 16], zoom: 3.6, canopy: false },
  { name: 'root-plate', look: [15.2, 6], zoom: 3.4, canopy: false },
  { name: 'anvil', look: [13.8, -4.8], zoom: 4, canopy: false },
  { name: 'latrines', look: [10, -12], zoom: 3.4, canopy: false },
  // animals (frozen at their starting poses under ?still)
  { name: 'sett-badger', look: [7.4, -13.4], zoom: 4.5, canopy: false },
  { name: 'boar-robin', look: [6.8, 10], zoom: 4, canopy: false },
];

const args = process.argv.slice(2);
const set = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--compare');
const base = args.includes('--compare') ? args[args.indexOf('--compare') + 1] : null;
if (!set) { console.error('usage: npm run screens -- <set> [--compare <baseline set>]'); process.exit(2); }
if (!fs.existsSync(path.join(PUBLIC, 'main.js'))) { console.error('public/main.js missing: run npm run build first'); process.exit(2); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const file = path.join(PUBLIC, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(fs.readFileSync(file));
});

const fingerprintSrc = fs.readFileSync(path.join(__dirname, 'scene-fingerprint.js'), 'utf8');

(async () => {
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const outDir = path.join(ROOT, 'docs/screens', set);
  fs.mkdirSync(outDir, { recursive: true });
  const errors = [];
  let failed = false;

  async function open(q, size = [1280, 800]) {
    const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${q || '(default)'}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${q || '(default)'}: ${e}`));
    await page.goto(url + '?still' + (q ? '&' + q : ''));
    await page.waitForFunction(() => window.__rigs && document.body.classList.contains('ready'));
    await page.waitForTimeout(1200);   // let a few frames render and the shadow map settle
    return page;
  }

  // 1. shots: one page per viewport size; the camera moves through window.__view
  const shots = {};
  for (const size of [...new Set(VIEWS.map((v) => (v.size || [1280, 800]).join('x')))]) {
    const [w, h] = size.split('x').map(Number), page = await open('', [w, h]);
    for (const v of VIEWS.filter((v) => (v.size || [1280, 800]).join('x') === size)) {
      await page.evaluate(([look, zoom, canopy]) => window.__view(look ? look[0] : null, look ? look[1] : null, zoom, canopy), [v.look || null, v.zoom ?? null, v.canopy !== false]);
      await page.waitForTimeout(800);
      shots[v.name] = await page.screenshot({ path: path.join(outDir, v.name + '.png') });
    }
    await page.close();
  }
  // 2. determinism: the same seed must build the same scene, and frozen frames must match pixel for pixel
  const fp = async (q) => { const p = await open(q); const r = await p.evaluate(fingerprintSrc); const img = await p.screenshot(); await p.close(); return { ...r, img }; };
  const a = await fp(''), b = await fp('');
  const other = await fp('seed=12345');
  console.log(`scene fingerprint (seed 9): n=${a.n} hash=${a.hash}`);
  if (a.hash !== b.hash) { failed = true; console.log('FAIL same seed built two different scenes'); }
  else console.log('ok   same seed → same scene');
  const pix = await diff(a.img, b.img);
  if (pix.changed) { failed = true; console.log(`FAIL same seed, frozen time, but ${pix.changed} pixels differ between loads`); }
  else console.log('ok   same seed → identical frame');
  if (other.hash === a.hash) { failed = true; console.log('FAIL ?seed=12345 built the same scene as seed 9 (seed is ignored)'); }
  else console.log('ok   another seed → another scene');

  // 3. compare with a baseline set
  async function diff(bufA, bufB) {
    const p = await browser.newPage();
    const r = await p.evaluate(async ([x, y]) => {
      const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { changed: -1, total: 0 };
      const read = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const da = read(ia), db = read(ib); let changed = 0;
      for (let k = 0; k < da.length; k += 4) if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) changed++;
      return { changed, total: da.length / 4 };
    }, [bufA.toString('base64'), bufB.toString('base64')]);
    await p.close();
    return r;
  }
  if (base) {
    for (const v of VIEWS) {
      const f = path.join(ROOT, 'docs/screens', base, v.name + '.png');
      if (!fs.existsSync(f)) { console.log(`new  ${v.name} (not in ${base})`); continue; }
      const r = await diff(shots[v.name], fs.readFileSync(f));
      if (r.changed === 0) console.log(`same ${v.name}`);
      else { failed = true; console.log(`DIFF ${v.name}: ${r.changed < 0 ? 'size changed' : (100 * r.changed / r.total).toFixed(2) + '% of pixels'}`); }
    }
  }

  if (errors.length) { failed = true; console.log('FAIL console errors:\n  ' + errors.join('\n  ')); }
  else console.log('ok   no console errors');
  await browser.close(); server.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
