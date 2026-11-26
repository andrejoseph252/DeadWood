// Camera toolbar in index.html: [data-view] buttons pick overview or an animal to follow; [data-rot] rotate by 45°.
// followable: { view name: Object3D }
export function bindToolbar(rig, followable) {
  const viewButtons = document.querySelectorAll('[data-view]');
  const press = (active) => viewButtons.forEach((x) => x.setAttribute('aria-pressed', x === active ? 'true' : 'false'));
  viewButtons.forEach((b) => b.addEventListener('click', () => {
    press(b);
    const v = b.dataset.view;
    if (v === 'overview') rig.overview(); else rig.follow(followable[v]);
  }));
  document.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => rig.rotateBy(+b.dataset.rot)));
  rig.onFollowReleased(() => press(null));   // dragging the map stops following
}
