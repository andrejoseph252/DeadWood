import sharp from 'sharp';
const layers = ['sparse_grass', 'forest_leaves_04', 'forest_ground_04', 'rocky_trail'];
const short = { sparse_grass: 'grass', forest_leaves_04: 'litter', forest_ground_04: 'dirt', rocky_trail: 'trail' };
const S = 2048;
for (const n of layers) {
  const p = (m) => `/tmp/ph/tex/${n}_${m}.jpg`;
  const raw = async (m) => (await sharp(p(m)).resize(S, S).removeAlpha().raw().toBuffer());
  const [diff, nor, arm, disp] = await Promise.all(['diff', 'nor_gl', 'arm', 'disp'].map(raw));
  const c = Buffer.alloc(S * S * 4), d = Buffer.alloc(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    c[i * 4] = diff[i * 3]; c[i * 4 + 1] = diff[i * 3 + 1]; c[i * 4 + 2] = diff[i * 3 + 2]; c[i * 4 + 3] = disp[i * 3];
    d[i * 4] = nor[i * 3]; d[i * 4 + 1] = nor[i * 3 + 1]; d[i * 4 + 2] = arm[i * 3 + 1]; d[i * 4 + 3] = arm[i * 3];
  }
  await sharp(c, { raw: { width: S, height: S, channels: 4 } }).webp({ quality: 78, alphaQuality: 80 }).toFile(`public/tex_${short[n]}_c.webp`);
  await sharp(d, { raw: { width: S, height: S, channels: 4 } }).resize(1024, 1024).webp({ quality: 68, alphaQuality: 70 }).toFile(`public/tex_${short[n]}_n.webp`);
  console.log(n, 'done');
}
