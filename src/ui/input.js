// Keyboard state: the set of currently pressed keys (lower case). Keys typed while a button has focus are ignored.
export function createKeys() {
  const keys = new Set();
  addEventListener('keydown', (e) => { if (e.target.closest && e.target.closest('button')) return; keys.add(e.key.toLowerCase()); });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  return keys;
}
