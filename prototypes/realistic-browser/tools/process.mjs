// Optimise Poly Haven models and write each as a single self-contained .json (glTF with embedded data URIs).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, prune, dedup } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const jobs = {
  grass_medium_02: [0.4, 512], fern_02: [1, 1024], rock_moss_set_01: [0.3, 1024], rock_moss_set_02: [0.3, 1024],
  dry_branches_medium_01: [0.5, 512], bark_debris_01: [0.06, 512], dead_tree_trunk_02: [0.25, 1024],
  tree_stump_01: [0.35, 1024], boulder_01: [0.2, 1024], stone_01: [0.03, 512], pine_roots: [0.12, 1024], celandine_01: [1, 512],
};
await MeshoptSimplifier.ready;
fs.mkdirSync('public/models', { recursive: true });
const only = process.argv[2];
for (const f of fs.readdirSync('public/models')) if (!only) fs.unlinkSync(`public/models/${f}`);
for (const [name, [ratio, size]] of Object.entries(jobs)) {
  if (only && name !== only) continue;
  const doc = await io.read(`/tmp/ph/models/${name}/1k/${name}_1k.gltf`);
  const t = [dedup(), weld()];
  if (ratio < 1) t.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }));
  t.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 82 }), prune());
  await doc.transform(...t);
  const { json, resources } = await io.writeJSON(doc, { format: 'gltf' });
  for (const b of json.buffers || []) { b.uri = 'data:application/octet-stream;base64,' + Buffer.from(resources[b.uri]).toString('base64'); }
  (json.images || []).forEach((im, i) => {
    if (im.uri && resources[im.uri]) { const f = `${name}_${i}.webp`; fs.writeFileSync(`public/models/${f}`, Buffer.from(resources[im.uri])); im.uri = f; }
  });
  const out = `public/models/${name}.json`;
  fs.writeFileSync(out, JSON.stringify(json));
  console.log(name.padEnd(24), (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
}
