// Portals in 2D (?pkm=1): every picture, drawn from numbers into small canvases. No image file is loaded.
import { KINDS } from './data.js';

export const rng = (seed) => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
export const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// A creature: a body grown from a seed inside an oval, mirrored left to right, with an outline, a lit side, a belly and two
// eyes. Kept for the visit.
const made = new Map();
export function creature(sp) {
  if (made.has(sp.id)) return made.get(sp.id);
  const N = sp.big ? 24 : 16, half = N / 2, r = rng(sp.look * 7919 + 13), K = KINDS[sp.kind], g = [];
  const tall = 0.75 + r() * 0.5, cy = N * (0.5 + r() * 0.08), ry = (N * 0.36) * tall, rx = (N * 0.36) / Math.max(0.8, tall) + r() * 1.5;
  for (let y = 0; y < N; y++) { g.push([]); for (let x = 0; x < half; x++) { const dx = (half - 0.5 - x) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy; g[y].push(d < 0.55 || (d < 1 && r() < 1.25 - d) ? 1 : 0); } }
  // ears, horns or a crest: a few columns grown upward from the top of the body
  const horns = 1 + Math.floor(r() * 3);
  for (let k = 0; k < horns; k++) { const x = Math.floor(r() * (half - 1)); let y = 0; while (y < N && !g[y][x]) y++; const len = 1 + Math.floor(r() * (N / 5)); for (let i = 1; i <= len && y - i >= 0; i++) g[y - i][x] = 1; }
  // feet, and a tail or fin at the side
  for (const x of [half - 2, half - 3]) { let y = N - 1; while (y > 0 && !g[y][x]) y--; if (y < N - 1) g[y + 1][x] = 1; }
  if (r() < 0.7) { const y = Math.floor(cy + r() * ry * 0.5); let x = 0; while (x < half && !g[y][x]) x++; for (let i = 1; i <= 2 && x - i >= 0; i++) g[Math.max(0, y - (i - 1))][x - i] = 1; }
  // smooth once: lone cells go, holes fill
  const at = (x, y) => (y >= 0 && y < N && x >= 0 ? g[y][Math.min(x, half - 1)] : 0);
  const s = g.map((row, y) => row.map((v, x) => { const n = at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1); return n >= 3 ? 1 : n === 0 ? 0 : v; }));
  const full = (x, y) => (y >= 0 && y < N && x >= 0 && x < N ? s[y][x < half ? x : N - 1 - x] : 0);
  const c = canvas(N, N), q = c.getContext('2d'), eyeY = Math.round(cy - ry * 0.25), eyeX = Math.max(1, Math.round(half - 1 - rx * 0.45));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (full(x, y)) {
      const edge = !full(x - 1, y) || !full(x + 1, y) || !full(x, y - 1) || !full(x, y + 1);
      const belly = Math.abs(x - half + 0.5) < rx * 0.45 && y > cy + ry * 0.1 && y < cy + ry * 0.75;
      q.fillStyle = edge ? K.dark : belly ? K.light : (x + y * 0.6 < N * 0.62 ? K.main : shade(K.main, K.dark, 0.35));
      q.fillRect(x, y, 1, 1);
    }
  }
  const e = sp.big ? 2 : 1;
  for (const x of [eyeX, N - 1 - eyeX - (e - 1)]) { q.fillStyle = '#fff'; q.fillRect(x, eyeY, e + (sp.big ? 0 : 0), e + 1); q.fillStyle = '#15121c'; q.fillRect(x + (x < half ? e - 1 : 0), eyeY + 1, 1, e); }
  made.set(sp.id, c); return c;
}
function shade(a, b, k) { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }

// The traveller, 16 by 16: four ways to face, two steps each. A green coat (the colour of a shot portal) and a white cap.
const P = { o: '#1b1a24', s: '#f2c9a0', c: '#35c35a', d: '#1f8a3c', w: '#f4f4f4', h: '#5a3a22', b: '#2b3350', k: '#151520' };
export function traveller() {
  const out = {};
  for (const dir of ['down', 'up', 'left', 'right']) for (const step of [0, 1]) {
    const c = canvas(16, 16), q = c.getContext('2d'), px = (x, y, w, h, col) => { q.fillStyle = P[col]; q.fillRect(x, y, w, h); };
    px(4, 1, 8, 7, 'o'); px(5, 2, 6, 5, 's'); px(4, 1, 8, 3, 'w'); px(4, 3, 8, 1, 'o');                 // head and cap
    if (dir === 'down') { px(6, 5, 1, 1, 'k'); px(9, 5, 1, 1, 'k'); }
    else if (dir === 'up') { px(5, 4, 6, 3, 'h'); }
    else { const x = dir === 'left' ? 5 : 10; px(x, 5, 1, 1, 'k'); px(dir === 'left' ? 9 : 5, 4, 2, 3, 'h'); }
    px(4, 8, 8, 5, 'o'); px(5, 8, 6, 4, 'c'); px(5, 11, 6, 1, 'd');                                      // coat
    if (dir === 'left' || dir === 'right') px(7, 9, 2, 2, 'd'); else { px(3, 9, 1, 3, 's'); px(12, 9, 1, 3, 's'); }
    px(5, 13, 2, step ? 2 : 3, 'b'); px(9, 13, 2, step ? 3 : 2, 'b');                                    // legs, one step ahead
    out[dir + step] = c;
  }
  return out;
}

// The tiles of a place, 16 by 16 each. B is a biome of data.js.
export function tiles(B, seed) {
  const r = rng(seed), T = {}, mk = (fn) => { const c = canvas(16, 16); fn(c.getContext('2d')); return c; };
  const speck = (q, a, b, n) => { q.fillStyle = a; q.fillRect(0, 0, 16, 16); q.fillStyle = b; for (let i = 0; i < n; i++) q.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1 + (r() < 0.3 ? 1 : 0), 1); };
  T.ground = [0, 1, 2].map(() => mk((q) => speck(q, B.ground, B.ground2, 10)));
  T.path = mk((q) => speck(q, B.path, shade(B.path, '#000000', 0.12), 8));
  T.grass = [0, 1].map((f) => mk((q) => { q.fillStyle = B.ground; q.fillRect(0, 0, 16, 16); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const x = i * 4 + (j % 2) * 2, y = 3 + j * 5 - (f && (i + j) % 2 ? 1 : 0); q.fillStyle = B.grass; q.fillRect(x, y, 1, 4); q.fillRect(x + 2, y + 1, 1, 3); q.fillStyle = B.grass2; q.fillRect(x + 1, y - 1, 1, 5); } }));
  T.water = [0, 1].map((f) => mk((q) => { q.fillStyle = B.water; q.fillRect(0, 0, 16, 16); q.fillStyle = B.water2; for (let j = 0; j < 4; j++) q.fillRect(((j * 5 + f * 3) % 12) + 1, 2 + j * 4, 4, 1); }));
  const base = (q) => q.drawImage(T.ground[0], 0, 0);
  const blocks = {
    tree: (q) => { base(q); q.fillStyle = '#5a3a1e'; q.fillRect(7, 10, 2, 5); q.fillStyle = '#14451f'; q.fillRect(2, 2, 12, 9); q.fillRect(4, 1, 8, 11); q.fillStyle = '#2a7a36'; q.fillRect(3, 3, 9, 6); q.fillStyle = '#4aa351'; q.fillRect(4, 3, 4, 3); },
    pine: (q) => { base(q); q.fillStyle = '#4a3320'; q.fillRect(7, 12, 2, 3); q.fillStyle = '#17463d'; for (let i = 0; i < 6; i++) q.fillRect(7 - i, 1 + i * 2, 2 + i * 2, 2); q.fillStyle = '#f4f9ff'; q.fillRect(6, 1, 3, 1); q.fillRect(4, 5, 3, 1); q.fillRect(2, 9, 4, 1); },
    palm: (q) => { base(q); q.fillStyle = '#7a5630'; q.fillRect(7, 6, 2, 9); q.fillStyle = '#1f7a3f'; q.fillRect(1, 3, 6, 2); q.fillRect(9, 3, 6, 2); q.fillRect(3, 1, 4, 2); q.fillRect(9, 1, 4, 2); q.fillRect(6, 2, 4, 4); q.fillStyle = '#44b060'; q.fillRect(2, 3, 4, 1); q.fillRect(10, 3, 4, 1); },
    rock: (q) => { base(q); q.fillStyle = '#3d362f'; q.fillRect(2, 5, 12, 9); q.fillRect(4, 3, 8, 12); q.fillStyle = '#8b8073'; q.fillRect(3, 6, 10, 7); q.fillRect(5, 4, 6, 9); q.fillStyle = '#b9ae9f'; q.fillRect(5, 5, 4, 3); },
    wall: (q) => { q.fillStyle = '#3c4048'; q.fillRect(0, 0, 16, 16); q.fillStyle = '#6a707a'; for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) q.fillRect(i * 8 + (j % 2 ? 4 : 0) - 3, j * 4 + 1, 7, 3); q.fillStyle = '#f6d36b'; q.fillRect(3, 5, 3, 3); q.fillRect(10, 9, 3, 3); },
    crystal: (q) => { base(q); q.fillStyle = '#1b6a78'; q.fillRect(5, 2, 6, 13); q.fillRect(2, 7, 4, 8); q.fillRect(10, 6, 4, 9); q.fillStyle = '#4fe0d0'; q.fillRect(6, 3, 4, 11); q.fillRect(3, 8, 2, 6); q.fillRect(11, 7, 2, 7); q.fillStyle = '#d6fffa'; q.fillRect(6, 3, 1, 8); q.fillRect(11, 7, 1, 4); },
  };
  T.block = mk(blocks[B.block] || blocks.rock);
  T.fire = [0, 1].map((f) => mk((q) => { base(q); q.fillStyle = '#4a3320'; q.fillRect(3, 12, 10, 2); q.fillRect(5, 11, 6, 1); q.fillStyle = '#e8552d'; q.fillRect(5, 6 - f, 6, 6 + f); q.fillRect(7, 3 - f, 2, 4); q.fillStyle = '#ffd24a'; q.fillRect(6, 8, 4, 4); q.fillRect(7, 6 + f, 2, 3); }));
  T.chest = mk((q) => { base(q); q.fillStyle = '#3a2412'; q.fillRect(2, 5, 12, 9); q.fillStyle = '#b5762c'; q.fillRect(3, 6, 10, 7); q.fillStyle = '#7a4a18'; q.fillRect(3, 9, 10, 1); q.fillStyle = '#ffd24a'; q.fillRect(7, 8, 2, 3); });
  T.open = mk((q) => { base(q); q.fillStyle = '#3a2412'; q.fillRect(2, 8, 12, 6); q.fillStyle = '#5a3a1e'; q.fillRect(3, 9, 10, 4); });
  // the portal: a green swirl, four frames, drawn larger than a tile (24 by 24, centred on its tile)
  T.portal = [0, 1, 2, 3].map((f) => { const c = canvas(24, 24), q = c.getContext('2d'); for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const dx = x - 11.5, dy = y - 11.5, d = Math.hypot(dx, dy); if (d > 11.5) continue; const a = Math.atan2(dy, dx) + d * 0.55 - f * Math.PI / 2, v = Math.sin(a * 2); q.fillStyle = d > 10 ? '#eaffd8' : d < 2 ? '#ffffff' : v > 0.3 ? '#6dff3b' : v > -0.4 ? '#2fae3a' : '#0d3a1c'; q.fillRect(x, y, 1, 1); } return c; });
  // a golden core (what creatures are caught with)
  T.core = mk((q) => { q.fillStyle = '#7a5a05'; q.fillRect(5, 4, 6, 8); q.fillRect(4, 5, 8, 6); q.fillStyle = '#ffc23a'; q.fillRect(5, 5, 6, 6); q.fillStyle = '#fff6d8'; q.fillRect(6, 6, 2, 2); });
  return T;
}
