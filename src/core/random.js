// Seeded random numbers (Park–Miller minimal standard generator).
// Pure: no three.js, no DOM. Safe for both the simulation and rendering.
//
// The scene is built from ONE shared stream, so the order in which builders draw numbers
// decides where every plant lands. Changing the build order in main.js, or adding or removing
// a draw in a builder, rearranges everything built after it.

export function createRng(seed = 9) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  return { rnd, rr, pick };
}
