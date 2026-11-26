// Small procedural sprite textures (leaf clump, needle clump, dot, umbel, clover), nearest-filtered.
import * as THREE from 'three';

function canvasTex(size, draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createTextures({ rnd, rr }) {
  const leaf = canvasTex(32, (g, s) => {
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * s * 0.36;
      const x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d;
      const v = 150 + Math.round(((s - x) + (s - y)) / (2 * s) * 105 + rr(-20, 20));
      g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(x, y, rr(2.2, 3.6), rr(1.4, 2.4), rnd() * 3, 0, Math.PI * 2); g.fill();
    }
  });
  const needle = canvasTex(32, (g, s) => {
    for (let i = 0; i < 40; i++) {
      const x = rr(4, s - 4), y = rr(6, s * 0.7); const v = 140 + Math.round((1 - y / s) * 115);
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-2, 2), y + rr(4, 9)); g.stroke();
    }
    g.fillStyle = 'rgb(230,230,230)'; g.fillRect(3, s * 0.22, s - 6, 3);
  });
  const dot = canvasTex(16, (g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2); g.fill(); });
  const umbel = canvasTex(16, (g, s) => { g.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(s / 2 + rr(-5, 5), s / 2 + rr(-3, 3), 1.6, 0, 7); g.fill(); } });
  const clover = canvasTex(16, (g, s) => { g.fillStyle = '#fff'; for (const [x, y] of [[8, 5], [5, 10], [11, 10]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } });
  return { leaf, needle, dot, umbel, clover };
}
