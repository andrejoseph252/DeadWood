// Camera toolbar in index.html: [data-view] buttons pick overview or an animal to follow; [data-rot] rotate by 45°.
// followable: { view name: Object3D }
// crowns: tree-crown meshes toggled by the [data-canopy] button
export function bindToolbar(rig, followable, crowns = []) {
  const viewButtons = document.querySelectorAll('[data-view]');
  const press = (active) => viewButtons.forEach((x) => x.setAttribute('aria-pressed', x === active ? 'true' : 'false'));
  viewButtons.forEach((b) => b.addEventListener('click', () => {
    press(b);
    const v = b.dataset.view;
    if (v === 'overview') rig.overview(); else rig.follow(followable[v]);
  }));
  document.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => rig.rotateBy(+b.dataset.rot)));
  rig.onFollowReleased(() => press(null));   // dragging the map stops following
  const canopy = document.querySelector('[data-canopy]');
  if (canopy) canopy.addEventListener('click', () => { const on = canopy.getAttribute('aria-pressed') !== 'true'; canopy.setAttribute('aria-pressed', String(on)); crowns.forEach((m) => { m.visible = on; }); });
  const go = document.querySelector('[data-goto]');   // habitat jump menu: option values are "x,z,zoom"
  if (go) go.addEventListener('change', () => { if (!go.value) return; const [x, z, zoom] = go.value.split(',').map(Number); press(null); rig.goTo(x, z, zoom); go.value = ''; });
}
