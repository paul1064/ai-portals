// PORTALS IN 2D (?pkm=1). A small game of its own beside the flight: the same journey seen from above, on a grid. You walk
// through one dimension after another (each carries the name and code of one of the journey's worlds), meet creatures in the
// tall grass, fight them in turns with your own, catch them with golden cores, and pass the keeper that stands before each
// portal. The genre is the old one of collecting and training creatures; every creature, name, picture and number here is this
// game's own (data.js, sprites.js). Nothing of the 3D page is loaded: index.html starts this file instead of main.js.
//   arrows / WASD   walk, move in a menu          Enter, Space, Z   yes, go on          X, Esc, Backspace   back; the menu
//   M               sound on and off              a touch screen gets a cross and two buttons
import { WORLDS } from '../worlds/index.js';
import { dimCode } from '../gun/dim.js';
import { KINDS, MOVES, SPECIES, byId, BIOMES, BIOME_OF, effect } from './data.js';
import { rng, hash, creature as spriteOf, traveller, tiles as makeTiles } from './sprites.js';

const TS = 16, VW = 15, VH = 11, W = VW * TS, H = VH * TS, MW = 44, MH = 30, SAVE = 'portals.pkm.save';
const GROUND = 0, PATH = 1, GRASS = 2, WATER = 3, BLOCK = 4, FIRE = 5, CHEST = 6, OPEN = 7, PORTAL = 8, KEEPER = 9;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- the page ----------
document.title = 'Portals 2D';
document.body.innerHTML = '';
const css = document.createElement('style');
css.textContent = `
html, body { margin: 0; height: 100%; background: #0b0d12; overflow: hidden; touch-action: none; -webkit-user-select: none; user-select: none; }
#pkm { position: fixed; left: 50%; top: 0; transform: translateX(-50%); image-rendering: pixelated; image-rendering: crisp-edges; background: #000; }
#pkm-pad { position: fixed; left: 0; right: 0; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); display: none; justify-content: space-between; align-items: flex-end; padding: 0 14px; pointer-events: none; font: 700 15px/1 ui-monospace, Menlo, Consolas, monospace; }
body.touch #pkm-pad { display: flex; }
#pkm-pad .cross { display: grid; grid-template: repeat(3, 52px) / repeat(3, 52px); pointer-events: auto; }
#pkm-pad button { all: unset; box-sizing: border-box; display: grid; place-items: center; border-radius: 12px; border: 1.5px solid #6dff3b; background: rgba(12, 20, 14, .72); color: #eaffd8; pointer-events: auto; -webkit-tap-highlight-color: transparent; }
#pkm-pad button.down { background: #6dff3b; color: #06140a; }
#pkm-pad .ab { display: grid; grid-template-columns: 62px 62px; gap: 10px; align-items: end; }
#pkm-pad .ab button { height: 62px; border-radius: 31px; }
#pkm-pad .ab .m { grid-column: 1 / 3; height: 34px; border-radius: 17px; font-size: 12px; letter-spacing: .18em; border-color: rgba(255, 255, 255, .5); }
#pkm-back { position: fixed; right: 10px; top: 8px; font: 600 11px/1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .14em; color: #9fb3a4; text-decoration: none; opacity: .7; }
#pkm-back:hover { opacity: 1; color: #6dff3b; }
`;
document.head.appendChild(css);
const cv = document.createElement('canvas'); cv.id = 'pkm'; document.body.appendChild(cv);
const back = document.createElement('a'); back.id = 'pkm-back'; back.href = './'; back.textContent = 'ZUM 3D-FLUG'; document.body.appendChild(back);
const pad = document.createElement('div'); pad.id = 'pkm-pad';
pad.innerHTML = '<div class="cross"><i></i><button data-k="up">▲</button><i></i><button data-k="left">◀</button><i></i><button data-k="right">▶</button><i></i><button data-k="down">▼</button><i></i></div><div class="ab"><button class="m" data-k="b2">MENÜ</button><button data-k="b">B</button><button data-k="a">A</button></div>';
document.body.appendChild(pad);
const g = cv.getContext('2d');
let S = 3;
function fit() {
  const touch = document.body.classList.contains('touch'), availH = window.innerHeight - (touch && window.innerHeight > window.innerWidth ? 200 : 0);
  const k = Math.min(window.innerWidth / W, availH / H), dpr = window.devicePixelRatio || 1;
  S = clamp(Math.ceil(k * dpr), 2, 8); cv.width = W * S; cv.height = H * S;
  cv.style.width = Math.floor(W * k) + 'px'; cv.style.height = Math.floor(H * k) + 'px';
  cv.style.top = touch && window.innerHeight > window.innerWidth ? '0' : Math.floor((availH - H * k) / 2) + 'px';
}
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
window.addEventListener('resize', fit); fit();

// ---------- sound: a few square-wave blips ----------
let ac = null, mute = false; try { mute = localStorage.getItem('portals.pkm.mute') === '1'; } catch (e) {}
function blip(freq, len = 0.07, type = 'square', vol = 0.05, slide = 0) {
  if (mute) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), v = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + len);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(v).connect(ac.destination); o.start(t); o.stop(t + len + 0.02);
  } catch (e) { /* no sound on this machine */ }
}
const tune = (notes, step = 0.09) => notes.forEach((f, i) => setTimeout(() => blip(f, step * 1.4, 'square', 0.045), i * step * 1000));

// ---------- the state ----------
const st = { scene: 'title', seed: 1, depth: 1, team: [], box: [], cores: 5, seen: new Set(), caught: new Set(), opened: [], keeperDown: false, busy: false, time: 0, banner: null, fade: 0 };
let map = null, T = null, world = null, biome = null, modal = null, battle = null;
const player = { x: 3, y: 15, dir: 'down', move: 0, fx: 3, fy: 15, steps: 0 }, me = traveller();
const held = { up: false, down: false, left: false, right: false };

const statsOf = (c) => { const s = byId[c.sp], L = c.lvl, f = (b) => Math.floor(b * 2 * L / 100) + 5; return { hp: Math.floor(s.hp * 2 * L / 100) + L + 10, atk: f(s.atk), def: f(s.def), spd: f(s.spd) }; };
const movesFor = (sp, L) => { const k = byId[sp].kind, m = ['rempler', k + '1']; if (L >= 8) m.push(k + '2'); if (L >= 12) m.push('ansturm'); if (L >= 16) { m.push(k + '3'); m.shift(); } return m; };
const xpAt = (L) => L * L * L;
const make = (sp, lvl) => { const c = { sp, lvl, xp: xpAt(lvl), hp: 0 }; c.hp = statsOf(c).hp; return c; };
const nameOf = (c) => byId[c.sp].name, alive = () => st.team.filter((c) => c.hp > 0);

function save() {
  try { localStorage.setItem(SAVE, JSON.stringify({ v: 1, seed: st.seed, depth: st.depth, team: st.team, box: st.box, cores: st.cores, seen: [...st.seen], caught: [...st.caught], opened: st.opened, keeperDown: st.keeperDown })); } catch (e) { /* private window: the game goes on unsaved */ }
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(SAVE)); if (!d || d.v !== 1 || !Array.isArray(d.team) || !d.team.length || !d.team.every((c) => byId[c.sp])) return false;
    Object.assign(st, { seed: d.seed, depth: d.depth, team: d.team, box: (d.box || []).filter((c) => byId[c.sp]), cores: d.cores | 0, seen: new Set(d.seen), caught: new Set(d.caught), opened: d.opened || [], keeperDown: !!d.keeperDown }); return true;
  } catch (e) { return false; }
}

// ---------- a dimension ----------
// Which world of the journey this depth is, the place it becomes, and its map: a winding path from the camp fire at the left
// to the portal at the right, tall grass and water laid by noise, three chests, and the keeper on the path's last stretch.
function enter(fresh) {
  const pool = WORLDS.filter((w) => !w.member), r0 = rng(hash(st.seed + ':' + st.depth));
  world = pool[Math.floor(r0() * pool.length)];
  const names = Object.keys(BIOMES), key = BIOME_OF[world.placeKind] || names[Math.floor(r0() * names.length)];
  biome = BIOMES[world.weirdness >= 0.78 ? 'fremd' : key]; T = makeTiles(biome, hash(world.id));
  const r = rng(hash(world.id + ':' + st.seed)), lat = (s) => { const v = []; for (let i = 0; i < 12 * 9; i++) v.push(s()); return (x, y) => { const gx = x / 5, gy = y / 5, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0, a = (i, j) => v[(j % 9) * 12 + (i % 12)], sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return (a(x0, y0) * (1 - sx) + a(x0 + 1, y0) * sx) * (1 - sy) + (a(x0, y0 + 1) * (1 - sx) + a(x0 + 1, y0 + 1) * sx) * sy; }; };
  const n1 = lat(r), n2 = lat(r), m = [];
  for (let y = 0; y < MH; y++) { m.push([]); for (let x = 0; x < MW; x++) m[y].push(x < 1 || y < 1 || x > MW - 2 || y > MH - 2 ? BLOCK : n2(x, y) > 0.7 ? WATER : n1(x, y) > 0.56 ? GRASS : r() < 0.07 ? BLOCK : GROUND); }
  // the path
  let py = Math.floor(MH / 2) + Math.floor((r() - 0.5) * 8); const sy = py, path = [];
  for (let x = 3; x <= MW - 5; x++) {
    path.push([x, py]);
    if (x < MW - 11 && x > 5 && r() < 0.45) { const dy = r() < 0.5 ? -1 : 1, n = 1 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const ny = clamp(py + dy, 4, MH - 5); if (ny === py) break; py = ny; path.push([x, py]); } }
  }
  for (const [x, y] of path) { m[y][x] = PATH; for (const d of [-1, 1]) if (m[y + d][x] === BLOCK || m[y + d][x] === WATER) m[y + d][x] = GROUND; }
  // the portal's gate: the last five cells run straight between two rows of blocks, the keeper in the middle of them
  const ex = MW - 5, ey = py;
  for (let x = ex - 4; x <= ex + 1; x++) { m[ey - 1][x] = BLOCK; m[ey + 1][x] = BLOCK; } m[ey][ex + 1] = BLOCK;
  m[ey][ex] = PORTAL; m[ey][ex - 2] = st.keeperDown && !fresh ? PATH : KEEPER;
  // the camp: a fire above the start, open ground round it, and a first patch of tall grass close by
  for (let y = sy - 2; y <= sy + 2; y++) for (let x = 2; x <= 6; x++) if (m[y][x] !== PATH) m[y][x] = GROUND;
  m[sy - 1][3] = FIRE;
  for (let y = sy + 2; y <= sy + 4 && y < MH - 1; y++) for (let x = 8; x <= 12; x++) if (m[y][x] !== PATH) m[y][x] = GRASS;
  // chests on ground that can be walked to, far from the start and from each other
  const dist = m.map((row) => row.map(() => -1)), q = [[3, sy]]; dist[sy][3] = 0;
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = m[y + dy]?.[x + dx]; if ((t === GROUND || t === PATH || t === GRASS) && dist[y + dy][x + dx] < 0) { dist[y + dy][x + dx] = dist[y][x] + 1; q.push([x + dx, y + dy]); } } }
  const spots = []; for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) if (m[y][x] === GROUND && dist[y][x] > 10 && Math.abs(y - ey) + Math.abs(x - ex) > 6) spots.push([x, y]);
  const chests = []; for (let i = 0; i < 400 && chests.length < 3 && spots.length; i++) { const s = spots[Math.floor(r() * spots.length)]; if (chests.every((c) => Math.abs(c[0] - s[0]) + Math.abs(c[1] - s[1]) > 12)) chests.push(s); }
  if (fresh) { st.opened = []; st.keeperDown = false; }
  chests.forEach(([x, y], i) => { m[y][x] = st.opened.includes(i) ? OPEN : CHEST; });
  map = { m, chests, start: [3, sy], keeper: [ex - 2, ey] };
  // who lives here
  const base = 1 + st.depth * 2, wild = SPECIES.filter((s) => s.rare && s.rare <= (st.depth >= 3 ? 3 : 2)).map((s) => { const i = biome.kinds.indexOf(s.kind); return [s, (i < 0 ? 0.25 : i < 2 ? 3 : 1.5) / s.rare]; });
  const strong = SPECIES.filter((s) => biome.kinds.includes(s.kind) && (s.rare >= 2 && (s.rare < 9 || st.depth >= 4)));
  map.base = base; map.wild = wild; map.keeperSp = strong[Math.floor(r() * strong.length)].id;
  Object.assign(player, { x: 3, y: sy, fx: 3, fy: sy, dir: 'right', move: 0 });
  st.banner = { t: 0, a: 'DIMENSION ' + dimCode(world.id) + ' · ' + st.depth, b: world.name, c: biome.name };
  st.scene = 'world'; save();
}
const pickWild = () => { let tot = 0; for (const w of map.wild) tot += w[1]; let x = Math.random() * tot; for (const [s, w] of map.wild) { x -= w; if (x <= 0) return s.id; } return map.wild[0][0].id; };

// ---------- talking and choosing ----------
const say = (text) => new Promise((resolve) => { modal = { type: 'msg', text, resolve }; });
const choose = (items, o = {}) => new Promise((resolve) => { modal = { type: 'menu', items, idx: clamp(o.idx || 0, 0, items.length - 1), cols: o.cols || 1, cancel: !!o.cancel, title: o.title || '', where: o.where || 'right', resolve }; });
function press(k) {
  if (k === 'm') { mute = !mute; try { localStorage.setItem('portals.pkm.mute', mute ? '1' : '0'); } catch (e) {} if (!mute) blip(880); return; }
  const md = modal;
  if (md && md.type === 'msg') { if (k === 'a' || k === 'b') { modal = null; blip(660, 0.04); md.resolve(); } return; }
  if (md && md.type === 'show') { if (k === 'a' || k === 'b') { modal = null; md.resolve(); } return; }
  if (md && md.type === 'menu') {
    const n = md.items.length, c = md.cols;
    if (k === 'up') md.idx = (md.idx - c + n) % n; else if (k === 'down') md.idx = (md.idx + c) % n;
    else if (k === 'left' && c > 1) md.idx = (md.idx - 1 + n) % n; else if (k === 'right' && c > 1) md.idx = (md.idx + 1) % n;
    else if (k === 'a') { const it = md.items[md.idx]; if (it.off) { blip(140, 0.1); return; } modal = null; blip(760, 0.05); md.resolve(it.value); return; }
    else if ((k === 'b' || k === 'b2') && md.cancel) { modal = null; blip(300, 0.05); md.resolve(null); return; }
    if (k !== 'a' && k !== 'b') blip(520, 0.025);
    return;
  }
  if (st.scene === 'world' && !st.busy && (k === 'b' || k === 'b2')) run(pause);
}
const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Enter: 'a', Space: 'a', KeyZ: 'a', KeyX: 'b', Escape: 'b', Backspace: 'b', KeyM: 'm' };
window.addEventListener('keydown', (e) => { const k = KEYS[e.code]; if (!k) return; e.preventDefault(); if (k in held) held[k] = true; if (!e.repeat || (modal && modal.type === 'menu' && k in held)) press(k); });
window.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k in held) held[k] = false; });
window.addEventListener('blur', () => { for (const k in held) held[k] = false; });
for (const b of pad.querySelectorAll('button')) {
  const k = b.dataset.k, down = (e) => { e.preventDefault(); b.classList.add('down'); if (k in held) held[k] = true; press(k); }, up = (e) => { e.preventDefault(); b.classList.remove('down'); if (k in held) held[k] = false; };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
}
window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !document.body.classList.contains('touch')) { document.body.classList.add('touch'); fit(); } });
cv.addEventListener('pointerdown', () => press('a'));
// one thing at a time: a walk into a fire, a chest, a fight
async function run(fn) { if (st.busy) return; st.busy = true; try { await fn(); } catch (e) { console.error(e); modal = null; } finally { st.busy = false; } }

// ---------- the walk ----------
const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function walk(dt) {
  if (player.move > 0) {
    player.move -= dt * 7.5;
    if (player.move <= 0) {
      player.move = 0; player.fx = player.x; player.fy = player.y; player.steps++;
      const t = map.m[player.y][player.x];
      if (t === PORTAL) return run(cross);
      if (t === GRASS && Math.random() < 0.13) return run(() => fight(make(pickWild(), map.base + Math.floor(Math.random() * 3)), false));
    } else { const d = DIR[player.dir]; player.fx = player.x - d[0] * player.move; player.fy = player.y - d[1] * player.move; return; }
  }
  const want = ['up', 'down', 'left', 'right'].find((k) => held[k]); if (!want) return;
  player.dir = want; const d = DIR[want], nx = player.x + d[0], ny = player.y + d[1], t = map.m[ny]?.[nx];
  if (t === GROUND || t === PATH || t === GRASS || t === PORTAL || t === OPEN) { player.x = nx; player.y = ny; player.move = 1; if (t === GRASS) blip(180 + Math.random() * 60, 0.03, 'triangle', 0.03); return; }
  held[want] = false;   // (a bump: the key has to be pressed again)
  if (t === FIRE) run(rest); else if (t === CHEST) run(() => chest(nx, ny)); else if (t === KEEPER) run(keeper); else blip(110, 0.05, 'square', 0.03);
}
async function rest() { for (const c of st.team) c.hp = statsOf(c).hp; tune([523, 659, 784, 1047]); save(); await say('Das Lagerfeuer wärmt dein Team. Alle sind wieder bei Kräften.'); }
async function chest(x, y) {
  const i = map.chests.findIndex((c) => c[0] === x && c[1] === y); map.m[y][x] = OPEN; if (i >= 0) st.opened.push(i);
  st.cores += 2; tune([784, 988, 1319]); save(); await say('In der Kiste liegen 2 goldene Kerne. Du hast jetzt ' + st.cores + '.');
}
async function keeper() {
  const c = make(map.keeperSp, map.base + 4);
  await say('Vor dem Portal steht sein Wächter: ' + nameOf(c) + ', Stufe ' + c.lvl + '.');
  const res = await fight(c, true);
  if (res === 'win' || res === 'caught') { st.keeperDown = true; map.m[map.keeper[1]][map.keeper[0]] = PATH; save(); await say('Der Weg zum Portal ist frei.'); }
}
async function cross() {
  tune([392, 523, 659, 784, 1047, 1319], 0.07);
  for (let i = 0; i <= 10; i++) { st.fade = i / 10; await sleep(35); }
  st.depth++; st.cores++; enter(true);
  for (let i = 10; i >= 0; i--) { st.fade = i / 10; await sleep(35); }
  await say('Eine neue Dimension: ' + world.name + '. Beim Durchflug hast du einen Kern aufgelesen.');
}
async function pause() {
  for (;;) {
    const v = await choose([{ label: 'Team', value: 'team' }, { label: 'Kartei ' + st.caught.size + '/' + SPECIES.length, value: 'dex' }, { label: 'Diese Welt in 3D', value: '3d' }, { label: 'Ton: ' + (mute ? 'aus' : 'an'), value: 'mute' }, { label: 'Neues Spiel', value: 'new' }, { label: 'Zurück', value: null }], { cancel: true, title: 'KERNE ' + st.cores });
    if (v === 'team') await teamMenu(false);
    else if (v === 'dex') await new Promise((resolve) => { modal = { type: 'show', what: 'dex', resolve }; });
    else if (v === 'mute') press('m');
    else if (v === '3d') { if ((await choose([{ label: 'Ja, hinfliegen', value: 1 }, { label: 'Nein', value: 0 }], { cancel: true, title: world.name })) === 1) { save(); location.href = './?start=' + encodeURIComponent(world.id); return; } }
    else if (v === 'new') { if ((await choose([{ label: 'Nein', value: 0 }, { label: 'Ja, alles löschen', value: 1 }], { cancel: true, title: 'Spielstand löschen?' })) === 1) { try { localStorage.removeItem(SAVE); } catch (e) {} location.reload(); return; } }
    else return;
  }
}
const row = (c) => nameOf(c).padEnd(12) + 'St' + String(c.lvl).padStart(2) + ' ' + String(Math.max(0, c.hp)).padStart(3) + '/' + statsOf(c).hp;
// the team: in a fight, choose who goes in (returns the creature, or null); on the walk, choose who leads
async function teamMenu(inFight, must) {
  for (;;) {
    const v = await choose(st.team.map((c, i) => ({ label: row(c), value: i, off: inFight && (c.hp <= 0 || c === battle.mine) })), { cancel: !must, title: inFight ? 'Wer soll kämpfen?' : 'Wer geht voran?', where: 'wide' });
    if (v == null) return null;
    if (inFight) return st.team[v];
    if (v > 0) { const c = st.team.splice(v, 1)[0]; st.team.unshift(c); save(); blip(880, 0.06); }
  }
}

// ---------- a fight ----------
async function fight(foe, isKeeper) {
  st.seen.add(foe.sp); st.scene = 'battle';
  battle = { foe, mine: alive()[0], keeper: isKeeper, fx: 0, mx: 0, fhit: 0, mhit: 0, fshow: foe.hp, mshow: 0, ball: null, in: 0 }; battle.mshow = battle.mine.hp;
  tune(isKeeper ? [196, 196, 262, 196, 311] : [330, 392, 494], 0.08);
  for (let i = 0; i <= 12; i++) { battle.in = i / 12; await sleep(22); }
  await say(isKeeper ? nameOf(foe) + ' stellt sich dir in den Weg!' : 'Ein wildes ' + nameOf(foe) + ' springt aus dem Gras!');
  let result = null;
  while (!result) {
    const B = battle, mine = B.mine;
    const act = await choose([{ label: 'Angriff', value: 'atk' }, { label: 'Kern ×' + st.cores, value: 'core', off: st.cores < 1 }, { label: 'Team', value: 'team', off: alive().length < 2 }, { label: 'Flucht', value: 'run' }], { cols: 2, where: 'battle', title: nameOf(mine) });
    let mv = null;
    if (act === 'atk') { const ids = movesFor(mine.sp, mine.lvl); mv = await choose(ids.map((id) => ({ label: MOVES[id].name.padEnd(13) + KINDS[MOVES[id].kind].name, value: id })), { cancel: true, where: 'wide', title: 'Welcher Angriff?' }); if (!mv) continue; }
    else if (act === 'team') { const c = await teamMenu(true); if (!c) continue; B.mine = c; B.mshow = c.hp; await say('Los, ' + nameOf(c) + '!'); }
    else if (act === 'run') {
      if (isKeeper) { await say('Vor dem Wächter gibt es kein Entkommen.'); continue; }
      if (Math.random() < (statsOf(mine).spd >= statsOf(foe).spd ? 0.95 : 0.6)) { blip(500, 0.15, 'square', 0.04, 500); await say('Du bist entkommen.'); result = 'fled'; break; }
      await say('Die Flucht misslingt!');
    } else if (act === 'core') { if (await throwCore()) { result = 'caught'; break; } }
    // the turns: the quicker one first when both attack
    const foeMove = () => { const ids = movesFor(foe.sp, foe.lvl), good = ids.filter((id) => effect(MOVES[id].kind, byId[B.mine.sp].kind) > 1); return good.length && Math.random() < 0.6 ? good[0] : ids[Math.floor(Math.random() * ids.length)]; };
    const first = mv && statsOf(B.mine).spd >= statsOf(foe).spd;
    if (mv && first) { await strike(B.mine, foe, mv, true); }
    if (foe.hp > 0) { await strike(foe, B.mine, foeMove(), false); if (B.mine.hp <= 0) { await say(nameOf(B.mine) + ' kann nicht mehr.'); if (!alive().length) { result = 'lost'; break; } B.mine = await teamMenu(true, true); B.mshow = B.mine.hp; await say('Los, ' + nameOf(B.mine) + '!'); continue; } }
    if (mv && !first && foe.hp > 0) await strike(B.mine, foe, mv, true);
    if (foe.hp <= 0) { tune([659, 784, 1047]); await say(nameOf(foe) + ' ist besiegt!'); await reward(B.mine, foe); result = 'win'; }
  }
  if (result === 'lost') {
    await say('Dein ganzes Team ist erschöpft. Du schleppst dich zum Lagerfeuer zurück.');
    for (const c of st.team) c.hp = statsOf(c).hp; Object.assign(player, { x: map.start[0], y: map.start[1], fx: map.start[0], fy: map.start[1], move: 0, dir: 'down' });
  }
  for (let i = 12; i >= 0; i--) { battle.in = i / 12; await sleep(16); }
  battle = null; st.scene = 'world'; save(); return result;
}
async function strike(a, d, id, mine) {
  const B = battle, mv = MOVES[id], A = statsOf(a), D = statsOf(d), kd = byId[d.sp].kind;
  await say((mine ? '' : (B.keeper ? 'Wächter ' : 'Wildes ')) + nameOf(a) + ' setzt ' + mv.name + ' ein!');
  if (Math.random() * 100 >= mv.acc) { blip(200, 0.12, 'sine', 0.04, -80); await say('Daneben!'); return; }
  for (let i = 0; i < 6; i++) { B[mine ? 'mx' : 'fx'] = (i < 3 ? i : 6 - i) * 5; await sleep(22); } B.mx = B.fx = 0;
  const eff = effect(mv.kind, kd), stab = mv.kind === byId[a.sp].kind ? 1.3 : 1, crit = Math.random() < 0.07 ? 1.6 : 1;
  const dmg = Math.max(1, Math.floor((((2 * a.lvl / 5 + 2) * mv.pow * A.atk / D.def) / 50 + 2) * eff * stab * crit * (0.85 + Math.random() * 0.15)));
  d.hp = Math.max(0, d.hp - dmg); blip(eff > 1 ? 240 : 160, 0.12, 'sawtooth', 0.06, -90);
  for (let i = 0; i < 8; i++) { B[mine ? 'fhit' : 'mhit'] = i % 2; await sleep(45); } B.fhit = B.mhit = 0;
  await sleep(260);
  if (crit > 1) await say('Ein Volltreffer!');
  if (eff > 1) await say('Das wirkt besonders stark!'); else if (eff < 1) await say('Das wirkt nur schwach.');
}
async function reward(c, foe) {
  c.xp += Math.floor(34 * foe.lvl * (battle.keeper ? 1.6 : 1)); await say(nameOf(c) + ' sammelt Erfahrung.');
  while (c.xp >= xpAt(c.lvl + 1) && c.lvl < 60) {
    const before = movesFor(c.sp, c.lvl), was = statsOf(c).hp; c.lvl++; c.hp += statsOf(c).hp - was; battle.mshow = c.hp;
    tune([523, 659, 784, 1047, 1319], 0.06); await say(nameOf(c) + ' erreicht Stufe ' + c.lvl + '!');
    const s = byId[c.sp];
    if (s.grows && c.lvl >= s.grows[0]) { const old = nameOf(c), w = statsOf(c).hp; c.sp = s.grows[1]; c.hp += statsOf(c).hp - w; battle.mshow = c.hp; st.seen.add(c.sp); st.caught.add(c.sp); tune([392, 523, 659, 784, 1047, 1319, 1568], 0.07); await say(old + ' wächst heran und wird zu ' + nameOf(c) + '!'); }
    for (const id of movesFor(c.sp, c.lvl)) if (!before.includes(id)) await say(nameOf(c) + ' lernt ' + MOVES[id].name + '.');
  }
  if (Math.random() < 0.18) { st.cores++; await say('Im Gras blinkt ein goldener Kern. Du hast jetzt ' + st.cores + '.'); }
}
async function throwCore() {
  const B = battle, foe = B.foe; st.cores--;
  await say('Du wirfst einen goldenen Kern!');
  for (let i = 0; i <= 14; i++) { B.ball = { t: i / 14, shut: false }; await sleep(24); }
  B.ball = { t: 1, shut: true }; blip(900, 0.08);
  const p = clamp((1 - 0.72 * foe.hp / statsOf(foe).hp) * (B.keeper ? 0.45 : byId[foe.sp].rare >= 3 ? 0.6 : 0.85), 0.05, 0.97);
  for (let i = 0; i < 3; i++) { await sleep(420); blip(300, 0.05); B.ball.rock = i + 1; if (Math.random() > Math.cbrt(p)) { B.ball = null; blip(160, 0.2, 'sawtooth', 0.05, -60); await say(nameOf(foe) + ' bricht wieder aus!'); return false; } }
  await sleep(350); tune([659, 784, 988, 1319, 1568], 0.08);
  st.caught.add(foe.sp); const full = st.team.length >= 6; (full ? st.box : st.team).push(foe);
  await say(nameOf(foe) + ' ist gefangen!' + (full ? ' Dein Team ist voll, es wartet im Lager.' : ' Es schließt sich deinem Team an.'));
  B.ball = null; return true;
}

// ---------- drawing ----------
const FONT = 'bold 8px ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace';
const text = (s, x, y, col = '#1b1a24', size = 8) => { g.font = size === 8 ? FONT : FONT.replace('8px', size + 'px'); g.fillStyle = col; g.fillText(s, x, y); };
const panel = (x, y, w, h) => { g.fillStyle = '#1b1a24'; g.fillRect(x, y, w, h); g.fillStyle = '#f7f4e6'; g.fillRect(x + 1, y + 1, w - 2, h - 2); g.fillStyle = '#6dbf4a'; g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + h - 3, w - 4, 1); };
function wrap(s, w) { g.font = FONT; const out = []; let line = ''; for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; } if (line) out.push(line); return out; }
function bar(x, y, w, v, max) { const k = clamp(v / max, 0, 1); g.fillStyle = '#1b1a24'; g.fillRect(x, y, w, 5); g.fillStyle = '#3a3a44'; g.fillRect(x + 1, y + 1, w - 2, 3); g.fillStyle = k > 0.5 ? '#39c24a' : k > 0.2 ? '#e8b923' : '#e0452f'; g.fillRect(x + 1, y + 1, Math.round((w - 2) * k), 3); }
const img = (c, x, y, k = 1) => g.drawImage(c, Math.round(x), Math.round(y), c.width * k, c.height * k);

function drawWorld() {
  const cx = clamp(player.fx - (VW - 1) / 2, 0, MW - VW), cy = clamp(player.fy - (VH - 1) / 2, 0, MH - VH), f = Math.floor(st.time * 3) % 2, x0 = Math.floor(cx), y0 = Math.floor(cy);
  let portal = null, kp = null;
  for (let y = y0; y <= y0 + VH && y < MH; y++) for (let x = x0; x <= x0 + VW && x < MW; x++) {
    const t = map.m[y][x], px = Math.round((x - cx) * TS), py = Math.round((y - cy) * TS);
    const c = t === GROUND ? T.ground[(x * 7 + y * 13) % 3] : t === PATH || t === KEEPER ? T.path : t === GRASS ? T.grass[(f + x + y) % 2] : t === WATER ? T.water[(f + x) % 2] : t === BLOCK ? T.block : t === FIRE ? T.fire[f] : t === CHEST ? T.chest : t === OPEN ? T.open : T.path;
    g.drawImage(c, px, py);
    if (t === PORTAL) portal = [px, py]; if (t === KEEPER) kp = [px, py];
  }
  if (portal) img(T.portal[Math.floor(st.time * 8) % 4], portal[0] - 4, portal[1] - 6);
  if (kp) { const s = spriteOf(byId[map.keeperSp]); img(s, kp[0] + 8 - s.width / 2, kp[1] + 12 - s.height + Math.round(Math.sin(st.time * 4))); }
  const px = Math.round((player.fx - cx) * TS), py = Math.round((player.fy - cy) * TS), inGrass = map.m[player.y][player.x] === GRASS && player.move === 0;
  g.drawImage(me[player.dir + (player.move > 0 ? Math.floor(player.move * 2) % 2 : 0)], 0, 0, 16, inGrass ? 12 : 16, px, py - 3, 16, inGrass ? 12 : 16);
  // the corner: cores, and whose turn it would be
  g.fillStyle = 'rgba(15,18,24,.72)'; g.fillRect(2, 2, 118, 12); img(T.core, 1, 0, 1); text('×' + st.cores, 17, 4, '#ffd24a'); const lead = alive()[0] || st.team[0]; text(nameOf(lead) + ' St' + lead.lvl, 40, 4, '#eaffd8');
  if (st.banner) { const b = st.banner, a = clamp(Math.min(b.t * 3, (4.2 - b.t) * 2), 0, 1); if (a > 0) { g.globalAlpha = a; g.fillStyle = 'rgba(10,14,12,.82)'; g.fillRect(0, 34, W, 40); g.fillStyle = '#6dff3b'; g.fillRect(0, 34, W, 1); g.fillRect(0, 73, W, 1); g.textAlign = 'center'; text(b.a, W / 2, 39, '#6dff3b'); text(b.b.length > 28 ? b.b.slice(0, 27) + '…' : b.b, W / 2, 50, '#ffffff', 10); text(b.c.toUpperCase(), W / 2, 63, '#b9c7bd'); g.textAlign = 'left'; g.globalAlpha = 1; } }
}
function drawBattle() {
  const B = battle, k = B.in, foe = B.foe, mine = B.mine;
  g.fillStyle = biome.ground; g.fillRect(0, 0, W, H); g.fillStyle = biome.ground2; for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
  g.fillStyle = biome.grass; g.beginPath(); g.ellipse(176, 66, 46, 10, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(58, 124, 54, 12, 0, 0, 7); g.fill();
  const fs = spriteOf(byId[foe.sp]), ms = spriteOf(byId[mine.sp]), fk = fs.width > 16 ? 2 : 3, mk = ms.width > 16 ? 3 : 4;
  if (!(B.fhit) && foe.hp > 0 && !(B.ball && B.ball.shut)) img(fs, 176 - fs.width * fk / 2 - B.fx + (1 - k) * 120, 66 - fs.height * fk + 4, fk);
  if (!(B.mhit) && mine.hp > 0) img(ms, 58 - ms.width * mk / 2 + B.mx - (1 - k) * 120, 128 - ms.height * mk + 4, mk);
  if (B.ball) { const t = B.ball.t, x = 70 + (176 - 70) * t, y = 100 + (48 - 100) * t - Math.sin(t * Math.PI) * 40 + (B.ball.shut ? 8 : 0); img(T.core, x - 8 + (B.ball.rock ? Math.sin(st.time * 30) * 2 : 0), y - 8); }
  const box = (c, x, y, mineBox, shown) => { const s = statsOf(c); panel(x, y, 108, mineBox ? 30 : 24); text(nameOf(c), x + 5, y + 5); g.textAlign = 'right'; text('St' + c.lvl, x + 103, y + 5); g.textAlign = 'left'; text(KINDS[byId[c.sp].kind].name, x + 5, y + 14, KINDS[byId[c.sp].kind].dark, 6); bar(x + 44, y + 14, 59, shown, s.hp); if (mineBox) { text(Math.max(0, Math.round(shown)) + '/' + s.hp, x + 5, y + 21, '#1b1a24', 6); const a = xpAt(c.lvl), b = xpAt(c.lvl + 1); g.fillStyle = '#1b1a24'; g.fillRect(x + 44, y + 23, 59, 3); g.fillStyle = '#3b8fe0'; g.fillRect(x + 45, y + 24, Math.round(57 * clamp((c.xp - a) / (b - a), 0, 1)), 1); } };
  B.fshow += (foe.hp - B.fshow) * 0.2; B.mshow += (mine.hp - B.mshow) * 0.2;
  box(foe, 6 - (1 - k) * 130, 6, false, B.fshow); box(mine, 126 + (1 - k) * 130, 96, true, B.mshow);
}
function drawModal() {
  const md = modal; if (!md) { if (st.scene === 'battle') panel(0, 132, W, 44); return; }
  if (md.type === 'msg') { panel(0, 132, W, 44); wrap(md.text, W - 20).slice(0, 3).forEach((l, i) => text(l, 10, 140 + i * 11)); if (Math.floor(st.time * 3) % 2) text('▼', W - 14, 164, '#2f8f3d'); return; }
  if (md.type === 'show') return drawDex();
  const n = md.items.length;
  if (md.where === 'battle') {
    panel(0, 132, W, 44); text('Was soll', 10, 140); text(md.title, 10, 151); text('tun?', 10, 162);
    panel(108, 132, 132, 44); md.items.forEach((it, i) => { const x = 122 + (i % 2) * 60, y = 142 + Math.floor(i / 2) * 15; text(it.label, x, y, it.off ? '#a7a393' : '#1b1a24'); if (i === md.idx) text('▶', x - 9, y, '#2f8f3d'); });
    return;
  }
  const wide = md.where === 'wide', w = wide ? W - 16 : 116, h = n * 12 + 12 + (md.title ? 12 : 0), x = wide ? 8 : W - w - 6, y = wide ? Math.max(4, 128 - h) : 6;
  if (st.scene === 'battle') panel(0, 132, W, 44);
  panel(x, y, w, h); if (md.title) text(md.title, x + 8, y + 6, '#2f8f3d');
  md.items.forEach((it, i) => { const yy = y + 7 + (md.title ? 12 : 0) + i * 12; text(it.label, x + 16, yy, it.off ? '#a7a393' : '#1b1a24'); if (i === md.idx) text('▶', x + 7, yy, '#2f8f3d'); });
}
function drawDex() {
  g.fillStyle = '#10141a'; g.fillRect(0, 0, W, H); g.textAlign = 'center'; text('KARTEI  ' + st.caught.size + ' / ' + SPECIES.length + '  GEFANGEN', W / 2, 5, '#6dff3b');
  SPECIES.forEach((s, i) => {
    const x = 4 + (i % 6) * 39, y = 17 + Math.floor(i / 6) * 39, c = spriteOf(s), got = st.caught.has(s.id), seen = st.seen.has(s.id);
    g.fillStyle = got ? '#232b36' : '#171c24'; g.fillRect(x, y, 37, 37);
    if (seen || got) { if (!got) g.filter = 'brightness(0) invert(.28)'; img(c, x + 18 - c.width / 2, y + 15 - c.height / 2); g.filter = 'none'; text(got ? s.name.slice(0, 9) : '???', x + 18, y + 29, got ? KINDS[s.kind].light : '#6b7480', 6); }
    else text('?', x + 18, y + 12, '#39424e', 10);
  });
  g.textAlign = 'left';
}
function drawTitle() {
  g.fillStyle = '#0d1a14'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const a = i * 2.4 + st.time * 0.3, r = 20 + ((i * 37) % 90); g.fillStyle = i % 3 ? '#1f5a2a' : '#6dff3b'; g.fillRect(Math.round(W / 2 + Math.cos(a) * r * 1.2), Math.round(60 + Math.sin(a) * r * 0.5), 1, 1); }
  if (T) img(T.portal[Math.floor(st.time * 8) % 4], W / 2 - 24, 22, 2);
  g.textAlign = 'center'; text('PORTALS 2D', W / 2, 76, '#eaffd8', 16); text('Taschen-Dimensionen', W / 2, 96, '#6dff3b');
  if (st.pick) { SPECIES.filter((s) => s.starter).forEach((s, i) => { const c = spriteOf(s), x = 60 + i * 60; img(c, x - 16, 138 - (modal && modal.idx === i ? 5 : 0), 2); }); }
  g.textAlign = 'left';
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, 0.05); last = now; st.time += dt;   // (the first frame's clock can lie before the script's own: never a step back)
  if (st.scene === 'world' && !st.busy && !modal) walk(dt);
  if (st.banner) { st.banner.t += dt; if (st.banner.t > 4.3) st.banner = null; }
  g.setTransform(S, 0, 0, S, 0, 0); g.imageSmoothingEnabled = false; g.textBaseline = 'top';
  if (st.scene === 'title') drawTitle(); else if (st.scene === 'battle' && battle) drawBattle(); else drawWorld();
  drawModal();
  if (st.fade > 0) { g.fillStyle = 'rgba(234,255,216,' + st.fade + ')'; g.fillRect(0, 0, W, H); }
}

// ---------- the beginning ----------
async function begin() {
  T = makeTiles(BIOMES.wiese, 1);
  st.busy = true;
  let cont = false;
  if (load()) cont = (await choose([{ label: 'Weiter', value: 1 }, { label: 'Neues Spiel', value: 0 }], { where: 'wide' })) === 1;
  if (!cont) {
    Object.assign(st, { seed: (Math.random() * 1e9) | 0, depth: 1, team: [], box: [], cores: 5, seen: new Set(), caught: new Set(), opened: [], keeperDown: false });
    await say('Hinter jedem Portal liegt eine Dimension, und in jeder leben Wesen. Eines begleitet dich von Anfang an.');
    const starters = SPECIES.filter((s) => s.starter); st.pick = true;
    const sp = await choose(starters.map((s) => ({ label: s.name + ' (' + KINDS[s.kind].name + ')', value: s.id })), { where: 'wide', title: 'Wähle deinen Begleiter', cols: 1 });
    st.pick = false; st.team = [make(sp, 5)]; st.seen.add(sp); st.caught.add(sp); tune([523, 659, 784, 1047]);
    await say(byId[sp].name + ' kommt mit. Im hohen Gras triffst du wilde Wesen, mit goldenen Kernen fängst du sie. Am Lagerfeuer erholt sich dein Team.');
    await say('Vor jedem Portal wartet ein Wächter. Bezwing ihn, dann geht es in die nächste Dimension.');
    enter(true);
  } else enter(false);
  st.busy = false;
}
requestAnimationFrame(frame);
begin();
// (for the page's own tests)
window.__pkm = { st, player, press, held, get map() { return map; }, get modal() { return modal; }, get battle() { return battle; }, get world() { return world; }, make, statsOf };
