// Value noise and easing helpers. Pure: no three.js, no DOM.

export const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (t) => t * t * (3 - 2 * t);

export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.03, y * 2.03) * 0.28 + vnoise(x * 4.1, y * 4.1) * 0.17;

// smoothstep from a to b (a may be greater than b for a falling edge)
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
