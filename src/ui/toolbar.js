// Camera toolbar in index.html: [data-view] Overview, [data-follow] menu of animals to follow, [data-rot] rotate by 45°,
// [data-canopy] show or hide the tree crowns, [data-goto] jump to a habitat.
// followable: { key: [label, Object3D] }; crowns: tree-crown meshes
export function bindToolbar(rig, followable, crowns = []) {
  const viewButtons = document.querySelectorAll('[data-view]'), follow = document.querySelector('[data-follow]');
  const press = (active) => viewButtons.forEach((x) => x.setAttribute('aria-pressed', x === active ? 'true' : 'false'));
  viewButtons.forEach((b) => b.addEventListener('click', () => { press(b); if (follow) follow.value = ''; rig.overview(); }));
  if (follow) {
    for (const [key, [label]] of Object.entries(followable)) { const o = document.createElement('option'); o.value = key; o.textContent = label; follow.append(o); }
    follow.addEventListener('change', () => { if (!follow.value) return; press(null); rig.follow(followable[follow.value][1]); });
  }
  document.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => rig.rotateBy(+b.dataset.rot)));
  rig.onFollowReleased(() => { press(null); if (follow) follow.value = ''; });   // dragging the map stops following
  const canopy = document.querySelector('[data-canopy]');
  if (canopy) canopy.addEventListener('click', () => { const on = canopy.getAttribute('aria-pressed') !== 'true'; canopy.setAttribute('aria-pressed', String(on)); crowns.forEach((m) => { m.visible = on; }); });
  const go = document.querySelector('[data-goto]');   // habitat jump menu: option values are "x,z,zoom"
  if (go) go.addEventListener('change', () => { if (!go.value) return; const [x, z, zoom] = go.value.split(',').map(Number); press(null); rig.goTo(x, z, zoom); go.value = ''; });
}
