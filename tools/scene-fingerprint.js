// Scene fingerprint: paste into the browser console on the running page (needs window.__rigs).
// Hashes every static mesh (geometry, transform, materials, instance matrices and colours) and the lights,
// skipping the animal rigs since they move. Equal hashes before and after a change mean the built scene is identical.
// Reference (prototype as exported, default URL, no ?lite): { n: 311, hash: 2007053567 }
(() => {
  const R = window.__rigs, scene = R.deer.root.parent;
  const rigRoots = new Set([R.deer.root, R.fox.root, R.boar.root, R.hare.root, R.squirrel.root, R.jay.root, R.woodpecker.root, ...R.piglets.map((p) => p.root)]);
  const out = [];
  const sum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * ((i % 7) + 1); return s; };
  const walk = (o) => {
    if (rigRoots.has(o)) { out.push('RIG'); return; }
    if (o.isMesh) {
      const g = o.geometry, m = Array.isArray(o.material) ? o.material : [o.material];
      out.push([
        o.type, g.attributes.position.count, sum(g.attributes.position.array).toFixed(3), g.attributes.color ? sum(g.attributes.color.array).toFixed(3) : '-',
        o.position.toArray().map((v) => v.toFixed(4)).join(','), o.rotation.toArray().slice(0, 3).map((v) => v.toFixed(4)).join(','), o.scale.toArray().map((v) => v.toFixed(4)).join(','),
        m.map((x) => x.type + (x.color ? x.color.getHexString() : '')).join('|'),
        o.isInstancedMesh ? o.count + ':' + sum(o.instanceMatrix.array).toFixed(3) + ':' + (o.instanceColor ? sum(o.instanceColor.array).toFixed(3) : '-') : '',
        o.castShadow, o.receiveShadow,
      ].join(' '));
    }
    if (o.isLight) out.push(o.type + o.color.getHexString() + o.intensity);
    o.children.forEach(walk);
  };
  walk(scene);
  let h = 0; const s = out.join('\n'); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return { n: out.length, hash: h, lines: out };
})();
