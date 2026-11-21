// The portal gun: a hand-held rift projector drawn over the flight, and the controls that go with it.
//   left click     open a portal where the crosshair points; the flight turns into it. Held and let go: a charged shot,
//                  whose portal stands further off, is wider and is flown to faster
//   right click    the push: a white hole where the crosshair points hurls you back and up, to a portal at the end of the throw
//   wheel, Q / E   turn the dial: which kind of world waits behind the next portal
//   1 .. 6         the dial's positions by number
//   first click    takes the mouse (Esc gives it back): from then on the mouse looks round, as in a first-person game
//   W A S D, arrows  fly: W pushes on, S (or Shift) brakes to a hover, A and D slip sideways; space rises, C sinks
//   looking         the flight goes where the middle of the picture points, inside a tube round the world's route (engine._steer)
//   cores           golden energy cores hang beside the route of every world: flown into, each loads one push (three at the most)
//   B / the count   the workshop: cores are spent there, on the dial's FREMD and BIZARR, a stronger charged shot, room for five pushes
// On a touch screen: tap to shoot where you tap, drag to look round, and buttons at the lower left: the dial, a brake to hold,
// and NEIGEN, which lets the phone itself be turned to look round (its orientation sensor).
// On a phone the gun is drawn straight into the picture by the engine's own renderer, after the frame is finished (INLINE below):
// a second graphics context cost phones their smooth flight. On a desktop:
// The gun is drawn by a small renderer of its own on a transparent canvas above the picture, so no world's fog, grade or
// near plane touches it; the world's key light is borrowed so that it still sits in the scene. The portal itself, the
// curve of the flight into it and the crossing are the engine's (core/engine.js shoot(), core/portal.js 'vortex').
import * as THREE from 'three';
import { tierOf } from '../core/pick.js';
import { dimCode } from './dim.js';

const MODES = [
  { id: 'any', name: 'ZUFALL', hint: 'irgendeine Dimension', color: '#6dff3b' },
  { id: 'earth', name: 'IRDISCH', hint: 'vertraute Welten', color: '#35d8ff', tier: 0 },
  { id: 'alien', name: 'FREMD', hint: 'fremde Welten', color: '#a97bff', tier: 1 },
  { id: 'bizarre', name: 'BIZARR', hint: 'das ganz Seltsame', color: '#ff4fd8', tier: 2 },
  { id: 'fav', name: 'FAVORIT', hint: 'deine gemerkten Welten', color: '#ffb62e' },
  { id: 'back', name: 'ZURÜCK', hint: 'die Welt davor', color: '#ff6a3a' },
];
const COOLDOWN = 1.15;

export { dimCode };   // (its home is dim.js, which the page reads without loading the gun)

const CSS = `
#gun { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }
body.gun #view { cursor: none; }
#gun-x { position: fixed; left: 0; top: 0; width: 44px; height: 44px; margin: -22px 0 0 -22px; pointer-events: none; z-index: 4; opacity: 0; transition: opacity .25s ease; color: var(--gun, #6dff3b); filter: drop-shadow(0 0 5px var(--gun, #6dff3b)) drop-shadow(0 0 1px #000); will-change: transform; }
#gun-x.on { opacity: .95; }
#gun-x.cold svg { opacity: .35; }
#gun-x .ring { transform-origin: 22px 22px; transition: transform .18s ease; }
#gun-x.kick .ring { transform: scale(1.7); transition: none; }
#gun-stamp { position: fixed; left: 50%; top: clamp(18px, 7vh, 70px); transform: translateX(-50%); pointer-events: none; z-index: 3; font: 600 clamp(12px, 1.25vw, 17px)/1 ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; letter-spacing: .42em; text-indent: .42em; color: var(--gun, #6dff3b); text-shadow: 0 0 12px var(--gun, #6dff3b), 0 0 2px #000; opacity: 0; transition: opacity 1.6s ease; white-space: nowrap; }
#gun-stamp.show { opacity: .95; transition-duration: .25s; }
#gun-stamp b { font-weight: 700; color: #fff; }
#gun-flash { position: fixed; inset: 0; pointer-events: none; z-index: 2; opacity: 0; background: radial-gradient(ellipse at center, transparent 30%, var(--gun, #6dff3b) 130%); transition: opacity .9s ease; mix-blend-mode: screen; }
#gun-flash.on { opacity: .85; transition-duration: .05s; }
#gun-flash.big { background: radial-gradient(ellipse at center, #fff 0%, var(--gun, #6dff3b) 45%, var(--gun, #6dff3b) 130%); }
#gun-flash.big.on { opacity: 1; }
body.notitles #gun-stamp { display: none; }
#gun-pad { position: fixed; left: calc(14px + env(safe-area-inset-left, 0px)); bottom: calc(96px + env(safe-area-inset-bottom, 0px)); display: none; flex-direction: column; gap: 12px; z-index: 4; opacity: 0; transition: opacity .4s ease; pointer-events: none; -webkit-user-select: none; user-select: none; }
body.gun-touch #gun-pad { display: flex; }
#gun-pad.on { opacity: 1; pointer-events: auto; }
#gun-pad button { all: unset; box-sizing: border-box; min-width: 92px; height: 54px; padding: 0 14px; border-radius: 27px; border: 1.5px solid var(--gun, #6dff3b); background: rgba(6, 10, 8, .5); color: #fff; font: 700 13px/1 ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; letter-spacing: .14em; text-align: center; text-shadow: 0 0 8px var(--gun, #6dff3b); box-shadow: 0 0 14px -4px var(--gun, #6dff3b); touch-action: none; -webkit-tap-highlight-color: transparent; }
#gun-pad button small { display: block; margin-bottom: 5px; font-size: 9px; font-weight: 600; letter-spacing: .22em; opacity: .7; }
#gun-pad button.down { background: var(--gun, #6dff3b); color: #04120a; text-shadow: none; }
#gun-pad #gun-b-push { border-color: #fff; box-shadow: 0 0 16px -3px #fff; text-shadow: 0 0 8px #fff; }
#gun-pad #gun-b-push.down { background: #fff; }
#gun-pad #gun-b-push.empty { opacity: .45; box-shadow: none; }
#gun-pad #gun-b-push small { color: #ffd24a; opacity: 1; letter-spacing: .3em; font-size: 11px; }
#gun-x.over { color: #fff; }
#gun-cores { position: fixed; right: calc(16px + env(safe-area-inset-right, 0px)); top: calc(14px + env(safe-area-inset-top, 0px)); pointer-events: none; z-index: 3; font: 600 15px/1 ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; letter-spacing: .18em; color: #ffd24a; text-shadow: 0 0 10px #ffa800, 0 0 2px #000; opacity: 0; transition: opacity .5s ease, transform .25s ease; white-space: nowrap; }
#gun-cores.on { opacity: .95; pointer-events: auto; cursor: pointer; }
#gun-shop { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(430px, calc(100vw - 28px)); max-height: calc(100vh - 40px); overflow: auto; box-sizing: border-box; padding: 18px 18px 14px; z-index: 7; border-radius: 16px; border: 1.5px solid #ffd24a; background: rgba(8, 9, 6, .97); box-shadow: 0 0 40px -8px #ffa800; color: #fff; font: 600 13px/1.35 ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; letter-spacing: .06em; }
#gun-shop[hidden] { display: none; }
#gun-shop h2 { margin: 0 0 4px; font-size: 17px; letter-spacing: .3em; color: #ffd24a; text-shadow: 0 0 10px #ffa800; }
#gun-shop p { margin: 0 0 12px; opacity: .75; font-weight: 500; }
#gun-shop .row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(255, 210, 74, .22); }
#gun-shop .row div { flex: 1; min-width: 0; }
#gun-shop .row b { display: block; letter-spacing: .14em; }
#gun-shop .row span { display: block; opacity: .7; font-weight: 500; font-size: 12px; }
#gun-shop button { all: unset; box-sizing: border-box; min-width: 104px; height: 44px; padding: 0 12px; border-radius: 22px; border: 1.5px solid #ffd24a; color: #ffd24a; text-align: center; font-weight: 700; letter-spacing: .12em; cursor: pointer; }
#gun-shop button:hover:not(:disabled) { background: #ffd24a; color: #171200; }
#gun-shop button:disabled { opacity: .38; cursor: default; }
#gun-shop button.done { border-color: transparent; color: #7dff8f; opacity: .9; }
#gun-shop .close { display: block; margin: 12px auto 0; border-color: rgba(255, 255, 255, .5); color: #fff; }
#gun-cores.got { transform: scale(1.35); }
#gun-cores small { font-size: 11px; opacity: .75; margin-left: .7em; }
body.notitles #gun-cores { display: none; }
@media (max-height: 480px) { #gun-pad { bottom: calc(74px + env(safe-area-inset-bottom, 0px)); flex-direction: row; } }
`;

export function setupGun({ engine, hearts, toast, soundOn, flash: FLASH = true }) {
  const cooldown = FLASH ? 0.5 : COOLDOWN;
  const $ = (id) => document.getElementById(id), view = $('view');
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const canvas = document.createElement('canvas'); canvas.id = 'gun'; view.after(canvas);
  const cross = document.createElement('div'); cross.id = 'gun-x';
  cross.innerHTML = '<svg viewBox="0 0 44 44" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><g class="ring"><circle cx="22" cy="22" r="11"/><path d="M22 4v7M22 33v7M4 22h7M33 22h7"/></g><circle cx="22" cy="22" r="1.4" fill="currentColor" stroke="none"/></svg>';
  const stamp = document.createElement('div'); stamp.id = 'gun-stamp';
  const flash = document.createElement('div'); flash.id = 'gun-flash';
  const pad = document.createElement('div'); pad.id = 'gun-pad';
  pad.innerHTML = '<button id="gun-b-mode" aria-label="Ziel wählen"><small>ZIEL</small><span></span></button><button id="gun-b-brake" aria-label="Bremsen (halten)"><small>HALTEN</small>BREMSE</button><button id="gun-b-tilt" aria-label="Umschauen durch Drehen des Handys" aria-pressed="false"><small>HANDY</small>NEIGEN</button><button id="gun-b-push" aria-label="Push: ein weißes Loch schleudert dich weg"><small>WEISSES LOCH</small>PUSH</button>';
  const chip = document.createElement('div'); chip.id = 'gun-cores';
  document.body.append(flash, cross, stamp, pad, chip); document.body.classList.add('gun');

  // INLINE: no canvas and no context of the gun's own. The engine calls draw() at the end of each of its frames (engine.overlay)
  // and the gun's scene goes over the finished picture: one context, one layer on the screen, nothing to blend.
  const INLINE = engine.opts.gunInline != null ? !!engine.opts.gunInline : !!engine.mobile;
  let renderer;
  if (INLINE) { renderer = engine.renderer; canvas.remove(); }
  else {
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { console.warn('portal gun: no second graphics context', e); canvas.remove(); cross.remove(); document.body.classList.remove('gun'); return null; }
    renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  }
  // (the engine's renderer writes linear colour and leaves tone mapping to its last pass: for the gun it is lent ours, and given back)
  const draw = () => {
    if (!INLINE) { renderer.render(scene, cam); return; }
    const r = renderer, tm = r.toneMapping, te = r.toneMappingExposure, ac = r.autoClear;
    r.setRenderTarget(null); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.autoClear = false;
    try { r.clearDepth(); r.render(scene, cam); } finally { r.toneMapping = tm; r.toneMappingExposure = te; r.autoClear = ac; }
  };
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.02, 400);
  scene.add(cam);

  // ---------- light: a small studio, mirrored in the metal, and the world's own key ----------
  const makeEnv = () => {
    const env = new THREE.Scene(), box = (w, h, x, y, z, c, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ color: 0x3a4150, side: THREE.BackSide })));
    box(16, 10, -9, 11, 5, '#eaf2ff', 14); box(7, 14, 12, 3, 4, '#fff1dc', 8); box(22, 5, 0, 6, -14, '#9fd0ff', 5); box(14, 14, 0, -12, 0, '#6a7080', 1.6); box(4, 4, -6, -2, 12, '#ffffff', 10); box(24, 2, 0, 1, 15, '#cfe0ff', 7); box(6, 16, -14, 0, -3, '#dfe8ff', 6);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.035).texture; pm.dispose();
    env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  };
  makeEnv();
  // the browser may take this second graphics context away (many tabs, a driver hiccup): it is asked to give it back, and the
  // studio light and the display are made again when it does. Without this the gun stayed gone for the rest of the visit.
  let lostAt = 0;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lostAt = performance.now(); });
  canvas.addEventListener('webglcontextrestored', () => { lostAt = 0; try { makeEnv(); } catch (err) { console.warn('portal gun', err); } dispKey = ''; w = 0; });
  const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(-0.5, 1, 0.6); cam.add(key); cam.add(key.target); key.target.position.set(0, 0, -0.5);
  const hemi = new THREE.HemisphereLight(0xe6eeff, 0x3a3f4a, 1.1); scene.add(hemi);

  // ---------- materials ----------
  const tex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  // fine machining marks and wear for the bare metal, a stipple for the grip: both as roughness / bump maps
  const brushed = tex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const y = Math.random() * h, l = 20 + Math.random() * 120, v = 100 + Math.random() * 70; g.strokeStyle = `rgba(${v},${v},${v},.22)`; g.lineWidth = Math.random() * 1.1; g.beginPath(); const x = Math.random() * w; g.moveTo(x, y); g.lineTo(x + l, y + (Math.random() - .5) * 1.5); g.stroke(); } for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(40,40,40,${Math.random() * .25})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 5, 0, 7); g.fill(); } }, false);
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping; brushed.repeat.set(3, 3);
  const stipple = tex(128, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const cx = x * 16 + (y % 2 ? 8 : 0) + 4, cy = y * 16 + 8, gr = g.createRadialGradient(cx, cy, 0, cx, cy, 6.5); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(cx - 7, cy - 7, 14, 14); } }, false);
  stipple.wrapS = stipple.wrapT = THREE.RepeatWrapping; stipple.repeat.set(26, 26);
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const alu = M({ color: 0xd9dde3, metalness: 0.9, roughness: 0.4, roughnessMap: brushed, envMapIntensity: 1.25 });
  const dark = M({ color: 0x2a2e35, metalness: 0.7, roughness: 0.4, roughnessMap: brushed, envMapIntensity: 1.2 });
  const steel = M({ color: 0x8c9099, metalness: 1, roughness: 0.22 });
  const copper = M({ color: 0xd07a45, metalness: 1, roughness: 0.24 });
  const brass = M({ color: 0xc9a04a, metalness: 1, roughness: 0.3, roughnessMap: brushed });
  const rubber = M({ color: 0x18191c, metalness: 0, roughness: 0.82, bumpMap: stipple, bumpScale: 1.4 });
  const hose = M({ color: 0x0b0b0c, metalness: 0.1, roughness: 0.55 });
  const orange = M({ color: 0xff5a14, metalness: 0.55, roughness: 0.34 });
  const hoseO = M({ color: 0xe8540f, metalness: 0, roughness: 0.5 });
  const glass = engine.mobile ? new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.2, envMapIntensity: 2.2, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.2, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false });
  const glow = M({ color: 0x050805, emissive: new THREE.Color(MODES[0].color), emissiveIntensity: 2.4, roughness: 0.4, metalness: 0 });   // every lit strip and lens follows the dial's colour

  // ---------- geometry helpers: the gun points along -Z, up is +Y ----------
  const gun = new THREE.Group(), body = new THREE.Group(); gun.add(body); cam.add(gun);
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = body) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  // a side profile [[forward, up], ...] given thickness and a bevelled edge
  const prof = (pts, width, bevel = 0.003) => {
    const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 8 });
    g.translate(0, 0, -(width - bevel * 2) / 2); g.rotateY(Math.PI / 2); return g;
  };
  const cylZ = (rFront, rBack, len, seg = 40, open = false) => { const g = new THREE.CylinderGeometry(rBack, rFront, len, seg, 1, open); g.rotateX(Math.PI / 2); return g; };
  const cylX = (r, len, seg = 24) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); return g; };

  // receiver, top rail, grip, trigger
  add(prof([[-0.088, -0.028], [0.086, -0.028], [0.106, -0.012], [0.106, 0.026], [0.093, 0.04], [-0.058, 0.04], [-0.097, 0.012], [-0.097, -0.012]], 0.05, 0.004), alu);
  add(prof([[-0.05, 0.0385], [0.088, 0.0385], [0.094, 0.044], [0.088, 0.05], [-0.044, 0.05], [-0.05, 0.044]], 0.03, 0.002), dark);
  add(prof([[-0.076, -0.024], [-0.02, -0.024], [-0.033, -0.07], [-0.05, -0.15], [-0.1, -0.142], [-0.092, -0.07]], 0.037, 0.007), rubber);
  add(prof([[-0.046, -0.152], [-0.102, -0.143], [-0.104, -0.152], [-0.048, -0.162]], 0.04, 0.002), dark);
  { const g = new THREE.TorusGeometry(0.03, 0.0032, 10, 28, Math.PI); g.rotateZ(Math.PI); g.rotateY(Math.PI / 2); add(g, dark, 0, -0.027, -0.014); }
  add(prof([[0.006, -0.026], [0.016, -0.026], [0.02, -0.04], [0.016, -0.052], [0.008, -0.05], [0.012, -0.04]], 0.009, 0.0015), orange, 0, 0, 0.012);
  // THE HAND: a right hand in a work glove, closed round the grip. It is seen from behind and to the left, so what shows
  // is the thumb lying along the left flank, the three fingers coming round the front of the grip with their tips on the
  // left, the forefinger through the guard on the trigger, the web of the hand under the receiver's tail, and the wrist
  // and sleeve running back out of the picture. All of it is tubes and balls, on the gun's own body so it kicks with it.
  {
    const glove = M({ color: 0x14161a, metalness: 0, roughness: 0.74, bumpMap: stipple, bumpScale: 0.6 });
    const pad = M({ color: 0x2b2f36, metalness: 0, roughness: 0.55 });
    const cuff = M({ color: 0xe8540f, metalness: 0, roughness: 0.62 });
    const sleeve = M({ color: 0x15171a, metalness: 0, roughness: 0.9 });
    const hand = new THREE.Group(); body.add(hand);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const ball = (c, r, mat, sx = 1, sy = 1, sz = 1) => { const m = add(new THREE.SphereGeometry(r, 18, 12), mat, c.x, c.y, c.z, hand); m.scale.set(sx, sy, sz); return m; };
    // a finger: a tube through the points, closed with a ball at each end, a paler pad at the tip
    const finger = (pts, r, tip = true) => {
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 28, r, 12), glove, 0, 0, 0, hand);
      ball(pts[0], r, glove); ball(pts[pts.length - 1], r * 1.02, tip ? pad : glove);
    };
    // the grip's own axis (it leans back) and the direction square to it that points to its front
    const top = V(0, -0.026, 0.048), ax = V(0, -0.976, 0.216), fw = V(0, -0.216, -0.976);
    const round = (d, r, a0, a1, rx = 0.0275, rf = 0.0385) => {   // round the grip at d metres down it, from angle a0 to a1 (0 right, 90 degrees front, 180 left)
      const c = top.clone().addScaledVector(ax, d).addScaledVector(fw, -0.004), pts = [];
      for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; pts.push(c.clone().add(V(Math.cos(a) * rx, 0, 0)).addScaledVector(fw, Math.sin(a) * rf)); }
      finger(pts, r);
    };
    round(0.046, 0.0102, -0.5, 3.75); round(0.0665, 0.0100, -0.5, 3.85); round(0.0865, 0.0092, -0.5, 3.9, 0.0265, 0.0365);
    // the forefinger: along the right flank, through the guard, its tip on the trigger showing at the left
    finger([V(0.027, -0.04, 0.05), V(0.0285, -0.037, 0.012), V(0.022, -0.039, -0.02), V(0.008, -0.041, -0.031), V(-0.008, -0.042, -0.027)], 0.0088);
    // the thumb: from the web forward along the left flank, under the dial
    finger([V(-0.006, -0.034, 0.1), V(-0.024, -0.037, 0.078), V(-0.0295, -0.036, 0.048), V(-0.0295, -0.033, 0.02)], 0.0108);
    ball(V(-0.016, -0.04, 0.092), 0.017, glove, 1, 0.95, 1.2);                       // the ball of the thumb
    // the web under the receiver's tail, the heel of the palm behind the grip, the back of the hand on the right, the knuckles
    ball(V(0.002, -0.036, 0.103), 0.021, glove, 1.15, 0.8, 1);
    ball(top.clone().addScaledVector(ax, 0.07).addScaledVector(fw, -0.05).add(V(0.004, 0, 0)), 0.03, glove, 0.82, 1.75, 0.8).rotation.x = 0.22;
    ball(top.clone().addScaledVector(ax, 0.066).addScaledVector(fw, -0.012).add(V(0.031, 0, 0)), 0.03, glove, 0.5, 1.65, 1.35).rotation.x = 0.22;
    for (const [d, r] of [[0.046, 0.0125], [0.0665, 0.0122], [0.0865, 0.0112]]) ball(top.clone().addScaledVector(ax, d).addScaledVector(fw, 0.024).add(V(0.03, 0, 0)), r, pad, 1, 1, 1.1);
    ball(V(0.031, -0.04, 0.046), 0.0125, pad);
    // wrist, the glove's orange cuff, and the sleeve, back and down out of the picture
    const w0 = V(0.008, -0.118, 0.118), w1 = V(-0.012, -0.165, 0.2), w2 = V(-0.07, -0.27, 0.56);
    const limb = (a, b, r0, r1, mat) => { const m = add(new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), 22, 1), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, hand); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); return m; };
    limb(w0, w1, 0.03, 0.033, glove).scale.set(1.12, 1, 0.86); ball(w0, 0.03, glove, 1.12, 1, 0.86);
    limb(w1.clone().lerp(w0, 0.22), w1, 0.036, 0.037, cuff).scale.set(1.12, 1, 0.9);
    limb(w1, w2, 0.04, 0.052, sleeve).scale.set(1.1, 1, 0.92);
  }
  // a milled window in the left flank with the mode-coloured light bar behind it, and the bolts that hold the flank on
  add(prof([[-0.04, -0.012], [0.07, -0.012], [0.076, -0.006], [0.07, 0], [-0.04, 0], [-0.046, -0.006]], 0.0514, 0.0008), dark);
  add(new THREE.BoxGeometry(0.0006, 0.004, 0.1), glow, -0.0259, -0.006, -0.012);
  const hex = new THREE.CylinderGeometry(0.0034, 0.0034, 0.004, 6); hex.rotateZ(Math.PI / 2);
  for (const [f, y] of [[-0.08, 0.004], [-0.07, -0.02], [0.09, -0.016], [0.095, 0.022], [0.0, 0.03], [-0.045, 0.03], [0.05, 0.03], [0.03, -0.021]]) for (const sx of [-1, 1]) add(hex, steel, sx * 0.0252, y, -f);
  // maker's plate and hazard band
  const plate = tex(512, 160, (g, w, h) => {
    g.fillStyle = '#23262b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8f949c'; g.lineWidth = 3; g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = '#d7dbe2'; g.font = '700 40px ui-sans-serif, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('RIFT PROJECTOR', 26, 46);
    g.font = '600 22px ui-monospace, Consolas, monospace'; g.fillStyle = '#9aa0aa'; g.fillText('MK IV  ·  SN 07F3-A21  ·  9.2 TeV', 26, 92);
    g.fillStyle = '#ffb000'; g.beginPath(); g.moveTo(404, 124); g.lineTo(480, 124); g.lineTo(442, 60); g.closePath(); g.fill(); g.fillStyle = '#23262b'; g.font = '900 40px Arial'; g.fillText('!', 434, 104);
    g.fillStyle = '#ffb000'; g.font = '700 18px ui-sans-serif, Arial'; g.fillText('CLASS 4 SPACETIME APERTURE', 26, 128);
  });
  { const m = add(new THREE.PlaneGeometry(0.064, 0.02), M({ map: plate, metalness: 0.7, roughness: 0.45 }), -0.0256, 0.018, -0.03); m.rotation.y = -Math.PI / 2; }
  const hazard = tex(256, 32, (g, w, h) => { g.fillStyle = '#f2b705'; g.fillRect(0, 0, w, h); g.fillStyle = '#121212'; for (let x = -32; x < w + 32; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.closePath(); g.fill(); } });
  hazard.wrapS = THREE.RepeatWrapping; hazard.repeat.set(2, 1);

  // barrel: collar with the hazard band, core tube, cooling fins, the copper winding, the muzzle
  const BY = 0.008;
  add(cylZ(0.031, 0.031, 0.02, 48), dark, 0, BY, -0.116);
  add(cylZ(0.0314, 0.0314, 0.008, 48, true), M({ map: hazard, metalness: 0.3, roughness: 0.5 }), 0, BY, -0.116);
  add(cylZ(0.0165, 0.0165, 0.125, 32), dark, 0, BY, -0.168);
  for (let i = 0; i < 7; i++) add(cylZ(0.0265, 0.0265, 0.0028, 48), alu, 0, BY, -0.132 - i * 0.0072);
  {
    const pts = [], turns = 11, z0 = -0.184, z1 = -0.222; for (let i = 0; i <= turns * 28; i++) { const a = (i / 28) * Math.PI * 2, t = i / (turns * 28); pts.push(new THREE.Vector3(Math.cos(a) * 0.0195, BY + Math.sin(a) * 0.0195, z0 + (z1 - z0) * t)); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 28, 0.00185, 7), copper);
    add(cylZ(0.0235, 0.0235, 0.004, 40), brass, 0, BY, -0.1805); add(cylZ(0.0235, 0.0235, 0.004, 40), brass, 0, BY, -0.2255);
  }
  add(cylZ(0.024, 0.027, 0.014, 48), dark, 0, BY, -0.2345);
  { const g = new THREE.CircleGeometry(0.0185, 40); g.rotateY(Math.PI); add(g, glow, 0, BY, -0.2418); }
  add(new THREE.TorusGeometry(0.0205, 0.0022, 10, 40), steel, 0, BY, -0.2415);
  // three focusing rails round the barrel, their tips closing on the point where the rift is struck
  const railG = prof([[0, 0.0265], [0.105, 0.036], [0.158, 0.031], [0.181, 0.0135], [0.174, 0.0105], [0.153, 0.023], [0.104, 0.0295], [0, 0.021]], 0.0085, 0.0014);
  const stripG = prof([[0.03, 0.0225], [0.104, 0.0289], [0.15, 0.0226], [0.15, 0.0214], [0.104, 0.0277], [0.03, 0.0213]], 0.0036, 0);
  const tipG = prof([[0.16, 0.031], [0.183, 0.0135], [0.174, 0.009], [0.151, 0.0235]], 0.0096, 0.0012);
  for (let i = 0; i < 3; i++) { const g = new THREE.Group(); g.position.set(0, BY, -0.112); g.rotation.z = i * Math.PI * 2 / 3; body.add(g); add(railG, alu, 0, 0, 0, g); add(stripG, glow, 0, 0, 0, g); add(tipG, dark, 0, 0, 0, g); }
  const MUZZLE = new THREE.Vector3(0, BY, -0.298);
  // capacitor pack under the barrel
  for (const sx of [-1, 1]) { add(cylZ(0.0085, 0.0085, 0.052, 24), dark, sx * 0.0105, -0.024, -0.142); add(cylZ(0.0088, 0.0088, 0.006, 24), orange, sx * 0.0105, -0.024, -0.126); add(cylZ(0.004, 0.004, 0.006, 12), brass, sx * 0.0105, -0.024, -0.1705); }
  add(new THREE.BoxGeometry(0.034, 0.005, 0.012), alu, 0, -0.0135, -0.15);

  // the reservoir on top: a glass tube of working fluid in two knurled brass caps, strapped to the rail
  const VY = 0.0745, VZ = -0.004, VL = 0.096, VR = 0.0198;
  const fluidMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(MODES[0].color) }, uLevel: { value: 1 }, uSlosh: { value: 0 }, uHot: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vP, vN, vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */`precision highp float; uniform float uTime, uLevel, uSlosh, uHot; uniform vec3 uColor; varying vec3 vP, vN, vV;
      float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*n(p); p=p*2.03+7.1; a*=.5; } return s; }
      void main(){
        float top=mix(-.0175,.018,uLevel)+uSlosh*vP.z*.35+.0012*sin(vP.z*210.+uTime*5.)+.0008*sin(vP.x*380.-uTime*7.);
        if(vP.y>top) discard;
        float ang=atan(vP.y,vP.x);
        float sw=fbm(vec2(vP.z*46.-uTime*.9, ang*1.3+uTime*.35)+fbm(vec2(vP.z*20.+uTime*.3, ang))*1.8);
        float bub=smoothstep(.83,.9,n(vec2(vP.z*310., vP.y*310.-uTime*2.6)+ang));
        float f=pow(clamp(dot(normalize(vN),normalize(vV)),0.,1.),1.4);
        float surf=smoothstep(.004,0.,top-vP.y);
        vec3 col=uColor*(.25+1.9*sw*sw+.9*f)+vec3(1.,1.,.85)*(pow(sw,5.)*2.2+bub*.8+surf*.9);
        col*=1.+2.5*uHot; if(!gl_FrontFacing) col*=.55;
        gl_FragColor=vec4(col*1.25,1.);
      }`, side: THREE.DoubleSide, toneMapped: true,
  });
  add(cylZ(0.0168, 0.0168, VL - 0.004, 40), fluidMat, 0, VY, VZ).renderOrder = 1;
  add(cylZ(VR, VR, VL, 48, true), glass, 0, VY, VZ).renderOrder = 3;
  for (const sz of [-1, 1]) {
    const z = VZ + sz * (VL / 2 + 0.004);
    add(cylZ(0.0226, 0.0226, 0.014, 28), brass, 0, VY, z); add(cylZ(0.0236, 0.0236, 0.003, 28), dark, 0, VY, z - sz * 0.0085);
    add(cylZ(0.011, 0.011, 0.008, 6), steel, 0, VY, z + sz * 0.01);
    for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; if (k % 2) add(new THREE.BoxGeometry(0.0011, 0.0011, 0.0125), brass, Math.cos(a) * 0.0229, VY + Math.sin(a) * 0.0229, z).rotation.z = a; }
  }
  for (const z of [VZ - 0.028, VZ + 0.028]) { add(new THREE.TorusGeometry(VR + 0.0008, 0.0013, 8, 48), steel, 0, VY, z); add(new THREE.BoxGeometry(0.026, 0.011, 0.01), dark, 0, 0.055, z); }
  const tube = (pts, r, mat) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, r, 10), mat);
  tube([[0, VY, VZ - VL / 2 - 0.016], [0, VY + 0.004, VZ - VL / 2 - 0.034], [0.004, 0.066, -0.094], [0.008, 0.047, -0.107], [0.008, 0.036, -0.112]], 0.0034, hoseO);
  tube([[-0.012, 0.05, 0.03], [-0.03, 0.05, 0.02], [-0.034, 0.03, -0.02], [-0.03, 0.018, -0.07], [-0.026, 0.012, -0.108]], 0.0026, hose);
  tube([[0.012, 0.05, 0.03], [0.031, 0.048, 0.02], [0.034, 0.02, -0.03], [0.03, 0.0, -0.09], [0.0195, -0.02, -0.114]], 0.0026, hose);
  add(cylZ(0.0052, 0.0052, 0.008, 12), brass, 0, VY, VZ - VL / 2 - 0.016); add(cylZ(0.0046, 0.0046, 0.006, 12), brass, 0.008, 0.038, -0.112);

  // the display at the back, leaning toward the eye, three status lamps and the dial
  const disp = new THREE.Group(); disp.position.set(0, 0.0445, 0.084); disp.rotation.x = -0.62; body.add(disp);
  add(new THREE.BoxGeometry(0.066, 0.046, 0.012), dark, 0, 0, 0, disp);
  add(new THREE.BoxGeometry(0.07, 0.006, 0.016), alu, 0, 0.025, -0.001, disp);
  const dc = document.createElement('canvas'); dc.width = 512; dc.height = 340; const dg = dc.getContext('2d');
  const dTex = new THREE.CanvasTexture(dc); dTex.colorSpace = THREE.SRGBColorSpace; dTex.anisotropy = 8;
  add(new THREE.PlaneGeometry(0.058, 0.0385), new THREE.MeshBasicMaterial({ map: dTex, toneMapped: false }), 0, -0.0005, 0.0062, disp);
  add(new THREE.PlaneGeometry(0.058, 0.0385), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.03, metalness: 0, envMapIntensity: 1.6, depthWrite: false }), 0, -0.0005, 0.0066, disp).renderOrder = 2;
  const lamps = [0, 1, 2].map((i) => { const m = M({ color: 0x111111, emissive: 0x000000, emissiveIntensity: 3, roughness: 0.3 }); add(new THREE.SphereGeometry(0.0022, 12, 8), m, 0.018 + i * 0.0075, 0.0252, 0.0072, disp); return m; });
  const dial = new THREE.Group(); dial.position.set(-0.0262, 0.012, 0.045); body.add(dial);
  add(cylX(0.0165, 0.004, 40), dark, -0.002, 0, 0, dial);
  const knob = new THREE.Group(); dial.add(knob);
  add(cylX(0.0128, 0.011, 30), alu, -0.0085, 0, 0, knob);
  for (let k = 0; k < 30; k++) { const a = (k / 30) * Math.PI * 2; add(new THREE.BoxGeometry(0.011, 0.001, 0.001), dark, -0.0085, Math.cos(a) * 0.0129, Math.sin(a) * 0.0129, knob); }
  add(new THREE.BoxGeometry(0.0008, 0.011, 0.0022), glow, -0.0142, 0.006, 0, knob);
  for (let k = 0; k < MODES.length; k++) { const a = (k / MODES.length) * Math.PI * 2; add(new THREE.BoxGeometry(0.0006, 0.0034, 0.0012), M({ color: 0x000000, emissive: new THREE.Color(MODES[k].color), emissiveIntensity: 1.6 }), -0.0042, Math.cos(a) * 0.0146, -Math.sin(a) * 0.0146, dial).rotation.x = -a; }
  // a guarded arming switch on the right, for the look of the thing
  add(new THREE.BoxGeometry(0.004, 0.012, 0.018), orange, 0.0262, 0.016, 0.05); add(cylX(0.0022, 0.012, 10), steel, 0.031, 0.02, 0.05);

  // ---------- glows, the bolt, the light the gun throws on itself ----------
  const dot = tex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.75)'); r.addColorStop(0.45, 'rgba(255,255,255,.18)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const sprite = (parent, size, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: MODES[0].color, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity })); s.scale.setScalar(size); s.renderOrder = 10; parent.add(s); return s; };
  const tipGlow = sprite(body, 0.05, 0.5); tipGlow.position.copy(MUZZLE);
  const tipCore = add(new THREE.SphereGeometry(0.0038, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MUZZLE.x, MUZZLE.y, MUZZLE.z);
  const vialGlow = sprite(body, 0.11, 0.22); vialGlow.position.set(0, VY, VZ);
  // (a phone goes without the two small lamps: each light is paid for in every material's shader; the glows stand in for them)
  const lamp = (i, d) => (engine.mobile ? { intensity: 0, color: new THREE.Color(), position: new THREE.Vector3() } : body.add(new THREE.PointLight(MODES[0].color, i, d, 2)).children[body.children.length - 1]);
  const vialLight = lamp(0.012, 0.4); vialLight.position.set(0, VY + 0.01, VZ);
  const muzzleLight = lamp(0, 0.8); muzzleLight.position.copy(MUZZLE);
  const bolt = sprite(scene, 0.1, 0); const boltCore = sprite(scene, 0.04, 0); boltCore.material.color.set(0xffffff);
  const trail = Array.from({ length: 14 }, () => sprite(scene, 0.05, 0));
  const burst = sprite(scene, 1, 0);
  // the loud effects (FLASH): a shock ring where the portal opens, sparks wound into it, and streaks of light on the way in
  const ringTex = tex(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.72, 'rgba(255,255,255,0)'); r.addColorStop(0.86, 'rgba(255,255,255,1)'); r.addColorStop(0.93, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const ring = sprite(scene, 1, 0); ring.material.map = ringTex;
  const NS = 90, sparkPos = new Float32Array(NS * 3), sparkSeed = Array.from({ length: NS }, () => [Math.random() * Math.PI * 2, Math.random(), 0.6 + Math.random() * 0.8]);
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: dot, color: MODES[0].color, size: 0.1, sizeAttenuation: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
  sparks.frustumCulled = false; sparks.renderOrder = 9; sparks.visible = false; scene.add(sparks);
  const NL = 170, linePos = new Float32Array(NL * 6), lineSeed = Array.from({ length: NL }, () => { const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 2.4; return [Math.cos(a) * r, Math.sin(a) * r * 0.75, -Math.random() * 44, 0.6 + Math.random() * 0.9]; });
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const streaks = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: MODES[0].color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
  streaks.frustumCulled = false; streaks.renderOrder = 8; streaks.visible = false; cam.add(streaks);
  // the push's white hole: a blinding core, a halo in the dial's colour, three rings thrown off one after another, and matter
  // flying out of it (the portal's sparks wind in; these go the other way)
  const holeCore = sprite(scene, 1, 0); holeCore.material.color.set(0xffffff);
  const holeHalo = sprite(scene, 1, 0);
  const holeRings = [0, 1, 2].map(() => { const r = sprite(scene, 1, 0); r.material.map = ringTex; r.material.color.set(0xffffff); return r; });
  const NE = 80, ejPos = new Float32Array(NE * 3), ejSeed = Array.from({ length: NE }, () => [Math.random() * Math.PI * 2, Math.random(), 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 0.9]);
  const ejGeo = new THREE.BufferGeometry(); ejGeo.setAttribute('position', new THREE.BufferAttribute(ejPos, 3));
  const ejecta = new THREE.Points(ejGeo, new THREE.PointsMaterial({ map: dot, color: 0xffffff, size: 0.1, sizeAttenuation: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
  ejecta.frustumCulled = false; ejecta.renderOrder = 9; ejecta.visible = false; scene.add(ejecta);
  // the energy cores: a white heart, a golden halo and a ring round it
  const NC = 5, GOLD = 0xffc23a, cores = Array.from({ length: NC }, () => {
    const halo = sprite(scene, 1, 0), heart = sprite(scene, 1, 0), rg = sprite(scene, 1, 0);
    halo.material.color.set(GOLD); heart.material.color.set(0xfff6d8); rg.material.map = ringTex; rg.material.color.set(GOLD);
    return { pos: new THREE.Vector3(), on: false, gone: 0, pick: 2, halo, heart, rg, ph: Math.random() * 6.28 };
  });
  const tinted = [holeHalo.material.color, ring.material.color, sparks.material.color, streaks.material.color, glow.emissive, fluidMat.uniforms.uColor.value, tipGlow.material.color, vialGlow.material.color, vialLight.color, muzzleLight.color, bolt.material.color, burst.material.color, ...trail.map((t) => t.material.color)];

  // ---------- state ----------
  let mode = 0; try { const m = Number(localStorage.getItem('portals.gun.mode')); if (m >= 0 && m < MODES.length) mode = Math.floor(m); } catch (e) {}
  const colNow = new THREE.Color(MODES[mode].color), colTo = new THREE.Color(MODES[mode].color);
  const worldsById = new Map(engine.registry.map((d) => [d.id, d])), trailIds = [];
  let shake = 0, warp = 0, arrived = 0, rift = null, ringT = 9, blast = null;
  // HOW MUCH THE GUN MAY COST. Three levels: 2 the whole show; 1 a coarser picture and half the sparks and streaks; 0 a coarse
  // picture drawn every other frame with no sparks or streaks. A phone starts low (0 where the engine guessed 'low'), a desktop
  // at 2. The frame rate decides from there: under 40 a second for a few seconds takes a level away; a steady 56 gives one
  // back, once, and never to a phone the engine put on 'low'.
  // (INLINE there is no picture of the gun's own to coarsen: the levels then only thin the sparks and streaks, and a phone starts a level higher)
  let level = INLINE ? (engine.mobile && engine.tier === 'low' ? 1 : 2) : engine.mobile ? (engine.tier === 'low' ? 0 : 1) : 2, levelOn = -1, fpsE = 60, lowT = 0, highT = 0, noRaise = 0, drops = 0, frameNo = 0, prevNow = 0;
  const pixelRatio = () => { const d = window.devicePixelRatio || 1; return level === 2 ? Math.min(d, engine.mobile ? 1.25 : 1.5) : level === 1 ? Math.min(d, engine.mobile ? 0.85 : 1) : Math.min(d, 0.9); };   // (level 0 draws a third of the screen, so it can afford to be less coarse)
  let charge = 1, raise = 0, recoil = 0, recoilV = 0, heat = 0, slosh = 0, sloshV = 0, knobAng = 0, mx = 0.25, my = -0.1, aimX = 0, aimY = 0, hover = false, note = '', noteUntil = 0, shot = null, lastShotWorld = null, dispKey = '', swayX = 0, swayY = 0;
  const lastQ = new THREE.Quaternion(); let lastQSet = false;

  const pickFor = (m) => {
    const cur = engine.cur && engine.cur.def.id;
    if (m.id === 'any' || lockedMode(m)) return null;   // (a position not yet bought behaves as ZUFALL)
    if (m.id === 'back') { const id = trailIds[trailIds.length - 2]; return (id && worldsById.get(id)) || null; }
    let pool;
    if (m.id === 'fav') pool = engine.registry.filter((d) => hearts && hearts.has(d.id) && d.id !== cur);
    else { const recent = engine.recent.slice(-8); pool = engine._pool().filter((d) => d.id !== cur && !recent.includes(d.id) && tierOf(d) === m.tier); }
    if (!pool.length) return null;
    const fresh = engine.seen && m.id !== 'fav' ? pool.filter((d) => !engine.seen[d.id]) : [];
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(Math.random() * from.length)];
  };
  engine.chooser = () => pickFor(MODES[mode]);
  const look = engine.look = { yaw: 0, pitch: 0 }; engine.throttle = 1;
  let locked = false, lockTip = false; const keys = { brake: false, push: false };
  // charging (a shot held back), and the cores: how many pushes are loaded (one to begin with), how many cores were ever caught
  let mHold = 0, over = 0, hum = null, restT = 0, cells = 1, total = 0, coreWorld = null, coreTipAt = 0, cellTip = false, chipT = 0;
  try { total = Math.max(0, parseInt(localStorage.getItem('portals.gun.cores'), 10) || 0); } catch (e) {}
  // What the cores buy (the workshop, further down): the dial's FREMD and BIZARR, three steps of a stronger charged shot, room
  // for five pushes. bank is what is left to spend; total, every core ever caught.
  let bank = total, shopOpen = false, shopTip = false; const up = { alien: false, bizarre: false, charge: 0, cells: false };
  try { const b = localStorage.getItem('portals.gun.bank'); if (b != null) bank = Math.max(0, parseInt(b, 10) || 0); Object.assign(up, JSON.parse(localStorage.getItem('portals.gun.up') || '{}')); up.charge = Math.max(0, Math.min(3, up.charge | 0)); } catch (e) {}
  const saveUp = () => { try { localStorage.setItem('portals.gun.bank', String(bank)); localStorage.setItem('portals.gun.up', JSON.stringify(up)); localStorage.setItem('portals.gun.cores', String(total)); } catch (e) {} };
  const lockedMode = (m) => (m.id === 'alien' && !up.alien) || (m.id === 'bizarre' && !up.bizarre);
  const maxPower = () => 0.4 + 0.2 * up.charge, maxCells = () => (up.cells ? 5 : 3);
  const powerOf = (at) => THREE.MathUtils.clamp((performance.now() - at - 250) / 1000, 0, maxPower());   // a quarter second is still a plain shot; a second more is all there is (less, until the charge is built up)
  const setCells = (n) => {
    cells = Math.max(0, Math.min(maxCells(), n)); const marks = '\u25C6'.repeat(cells) + '\u25C7'.repeat(maxCells() - cells);
    chip.innerHTML = marks + '<small>' + bank + '</small>'; const b = pad.querySelector('#gun-b-push'); b.querySelector('small').textContent = marks; b.classList.toggle('empty', cells < 1);
  };
  setCells(cells);

  const say = (text, ms = 1600) => { note = text; noteUntil = performance.now() + ms; };
  const setMode = (i, quiet) => {
    i = ((i % MODES.length) + MODES.length) % MODES.length; if (i === mode && !quiet) return;
    mode = i; const m = MODES[mode]; colTo.set(m.color);
    document.documentElement.style.setProperty('--gun', m.color); pad.querySelector('span').textContent = m.name;
    try { localStorage.setItem('portals.gun.mode', String(mode)); } catch (e) {}
    if (quiet) return;
    click(); slosh += 0.4;
    if (m.id === 'fav' && !(hearts && hearts.size)) { say('KEINE FAVORITEN', 2600); toast('Noch keine Favoriten: mit H merkst du dir eine Welt'); return; }
    if (m.id === 'back' && trailIds.length < 2) { say('KEIN VERLAUF', 2600); toast('Zurück geht erst nach dem ersten Sprung'); return; }
    if (lockedMode(m)) { say('GESPERRT', 2600); toast(m.name + ' ist noch gesperrt: in der Werkstatt freischalten (' + (document.body.classList.contains('gun-touch') ? 'oben rechts auf die Kerne tippen' : 'Taste B') + ')', 4200); if (engine.cur && !engine.cur.def.antechamber) engine.requeue(); return; }
    if (engine.cur && !engine.cur.def.antechamber && !engine.requeue()) say('ZU SPÄT', 1400);
    toast('Ziel: ' + m.name + ' · ' + m.hint, 1800);
  };
  setMode(mode, true);

  // ---------- sound: a small synth of its own, heard only while the page's sound is on ----------
  let ac = null;
  const audio = () => { if (!soundOn || !soundOn()) return null; if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; };
  const env = (a, t, peak, len) => { const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len); g.connect(a.destination); return g; };
  const click = () => { const a = audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.04); o.connect(env(a, t, 0.05, 0.06)); o.start(t); o.stop(t + 0.08); };
  const dry = () => { const a = audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.12); o.connect(env(a, t, 0.12, 0.16)); o.start(t); o.stop(t + 0.2); };
  const boom = () => {   // the push: a deep drop, a crack of noise sweeping up, and a ring that falls away
    const a = audio(); if (!a) return; const t = a.currentTime;
    const s1 = a.createOscillator(); s1.type = 'sine'; s1.frequency.setValueAtTime(120, t); s1.frequency.exponentialRampToValueAtTime(26, t + 0.7); s1.connect(env(a, t, 0.7, 0.9)); s1.start(t); s1.stop(t + 1);
    const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = b; const hp = a.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.setValueAtTime(300, t); hp.frequency.exponentialRampToValueAtTime(6000, t + 0.35); hp.Q.value = 0.8; n.connect(hp); hp.connect(env(a, t, 0.32, 0.5)); n.start(t);
    for (const [fr, det] of [[880, 0], [1318, 7], [1760, -6]]) { const o = a.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(fr, t + 0.05); o.frequency.exponentialRampToValueAtTime(fr * 0.35, t + 1.3); o.detune.value = det; o.connect(env(a, t + 0.05, 0.05, 1.3)); o.start(t + 0.05); o.stop(t + 1.4); }
  };
  const chime = () => { const a = audio(); if (!a) return; const t = a.currentTime; for (const [fr, at] of [[1318, 0], [1976, 0.07], [2637, 0.14]]) { const o = a.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(fr, t + at); o.connect(env(a, t + at, 0.11, 0.3)); o.start(t + at); o.stop(t + at + 0.34); } };
  const bang = (delay, power = 0) => {
    const a = audio(); if (!a) return; const t = a.currentTime;
    const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(95, t + 0.34);
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(380, t + 0.36); o.connect(f); f.connect(env(a, t, 0.22, 0.42)); o.start(t); o.stop(t + 0.45);
    const s = a.createOscillator(); s.type = 'sine'; s.frequency.setValueAtTime(150, t); s.frequency.exponentialRampToValueAtTime(38, t + 0.3); s.connect(env(a, t, 0.5, 0.36)); s.start(t); s.stop(t + 0.4);
    if (power > 0.15) { const d = a.createOscillator(); d.type = 'sine'; d.frequency.setValueAtTime(95, t); d.frequency.exponentialRampToValueAtTime(24, t + 0.8); d.connect(env(a, t, 0.7 * power, 0.95)); d.start(t); d.stop(t + 1); }   // a charged shot: a deep thump under it
    const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.25); bp.Q.value = 1.2; n.connect(bp); bp.connect(env(a, t, 0.2, 0.28)); n.start(t);
    // the rift tearing open where the bolt lands: a rising chord with a slow beat in it
    const t2 = t + delay; for (const [fr, det] of [[110, 0], [165, 3], [220.5, -4], [331, 5]]) { const p = a.createOscillator(); p.type = 'sine'; p.frequency.setValueAtTime(fr * 0.5, t2); p.frequency.exponentialRampToValueAtTime(fr, t2 + 0.5); p.detune.value = det; p.connect(env(a, t2, 0.07, 1.5)); p.start(t2); p.stop(t2 + 1.6); }
  };

  // ---------- the display ----------
  const hexA = (c, a) => { const k = new THREE.Color(c); return `rgba(${Math.round(k.r * 255)},${Math.round(k.g * 255)},${Math.round(k.b * 255)},${a})`; };
  const blur = (px) => (engine.mobile ? 0 : px);   // a glow round every letter is dear on a phone's 2D canvas
  function drawDisplay(now) {
    const m = MODES[mode], A = engine.cur, n = engine.next, ante = !A || A.def.antechamber, ready = !!(n && n.ready);
    const noteOn = now < noteUntil, blink = Math.floor(now / 320) % 2;
    const status = noteOn ? note : ante ? 'KALIBRIERE' : lockedMode(m) ? 'GESPERRT' : over >= maxPower() ? (up.charge >= 3 ? '\u00DCBERLADEN' : 'VOLL') : over > 0 ? 'LADE AUF' : charge < 1 ? 'LADE' : !ready ? 'SUCHE ZIEL' : 'BEREIT';
    const code = n && n.def && !ante ? dimCode(n.def.id) : '··-···', name = ready && n.def ? String(n.def.name || '').toUpperCase() : '';
    const bars = engine.mobile ? Math.round(charge * 4) * 3 : Math.round(charge * 12), sig = [mode, status, code, name, bars, status === 'SUCHE ZIEL' || status === 'KALIBRIERE' ? blink : 0].join('|');
    if (sig === dispKey) return; dispKey = sig;
    const g = dg, W = 512, H = 340, c = m.color, mono = 'ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace';
    g.fillStyle = '#020604'; g.fillRect(0, 0, W, H);
    const bgG = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 330); bgG.addColorStop(0, hexA(c, 0.16)); bgG.addColorStop(1, hexA(c, 0.02)); g.fillStyle = bgG; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic'; g.shadowColor = c; g.shadowBlur = blur(14);
    g.fillStyle = hexA(c, 0.75); g.font = `600 22px ${mono}`; g.textAlign = 'left'; g.fillText('MODUS ' + (mode + 1) + '/' + MODES.length, 24, 40);
    g.textAlign = 'right'; g.fillText(status, W - 24, 40);
    g.fillStyle = '#ffffff'; g.shadowBlur = blur(22); g.textAlign = 'left'; g.font = `800 84px ${mono}`; g.fillText(m.name, 22, 128);
    g.shadowBlur = blur(10); g.fillStyle = hexA(c, 0.7); g.font = `600 22px ${mono}`; g.fillText('ZIEL-DIMENSION', 24, 176);
    g.fillStyle = c; g.shadowBlur = blur(20); g.font = `800 66px ${mono}`; g.fillText(code, 22, 244);
    g.shadowBlur = blur(8); g.fillStyle = hexA(c, 0.85); g.font = `600 21px ${mono}`;
    let nm = name; while (nm && g.measureText(nm).width > W - 48) nm = nm.slice(0, -2); if (nm !== name) nm = nm.trimEnd() + '…';
    g.fillText(nm || (status === 'SUCHE ZIEL' ? (blink ? '▮' : ' ') : ''), 24, 280);
    g.shadowBlur = blur(8); for (let i = 0; i < 12; i++) { g.fillStyle = i < bars ? c : hexA(c, 0.16); g.fillRect(24 + i * 39, 300, 32, 18); }
    g.shadowBlur = blur(0); g.fillStyle = 'rgba(0,0,0,.26)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.5);
    dTex.needsUpdate = true;
    lamps[0].emissive.set(status === 'BEREIT' ? 0x39ff6a : 0x000000); lamps[1].emissive.set(status === 'LADE' || status === 'SUCHE ZIEL' || status === 'KALIBRIERE' ? 0xffb000 : 0x000000); lamps[2].emissive.set(noteOn ? 0xff3020 : 0x000000);
  }

  // ---------- firing ----------
  const blocked = () => { const ab = $('about'); return shopOpen || document.body.classList.contains('atlas-open') || (!!ab && !ab.hidden) || !$('veil').classList.contains('gone'); };   // (the About stays in the page once opened, hidden: only an open one counts)
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  function fire(cx, cy, push, power = 0) {
    if (blocked() || raise < 0.6) return;
    const A = engine.cur;
    if (!A || A.def.antechamber) { say('KALIBRIERE', 1200); dry(); return; }
    if (engine.settings.paused) { say('PAUSE', 1000); dry(); return; }
    if (charge < 1) { dry(); return; }
    if (push && cells < 1) { say('KEIN KERN', 1400); dry(); if (!cellTip) { cellTip = true; toast('Der Push braucht einen Energiekern: flieg in die goldenen Kerne neben der Route', 4600); } return; }
    const res = engine.shoot((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1, MODES[mode].color, !!push, push ? 0 : power);
    if (res && push) setCells(cells - 1);
    if (!res) { say('ZU NAH', 1200); dry(); return; }
    charge = 0; recoilV += (FLASH ? 8 : 5.2) + 7 * power; heat = 1; sloshV += 9; lastShotWorld = A; rift = null; if (FLASH) shake = Math.max(shake, 0.45 + 0.9 * power);
    // (a push: the bolt goes to where the white hole is struck, a short way off; the portal, at the far end of the throw, opens by itself)
    shot = { t: 0, delay: res.push ? 0.09 : res.delay, point: res.push ? res.origin : res.point, exit: res.point, radius: res.radius, push: res.push, landed: false, from: body.localToWorld(_v.copy(MUZZLE)).clone(), hist: [] };
    cross.classList.add('kick'); requestAnimationFrame(() => requestAnimationFrame(() => cross.classList.remove('kick')));
    if (res.push) { boom(); say('PUSH', 900); recoilV += 5; } else { bang(res.delay, power); if (power > 0.3) say(power >= maxPower() ? 'VOLLE LADUNG' : 'AUFGELADEN', 900); }
  }
  const canLock = !!view.requestPointerLock;
  // A finger: a short tap shoots where it lands, a drag turns the view with it (the picture follows the finger). The first
  // touch also brings up the two buttons. A mouse: the first click takes the pointer, as before.
  const fingers = new Map(); let touchTip = false;
  const touchOn = () => { if (!document.body.classList.contains('gun-touch')) document.body.classList.add('gun-touch'); };
  if (matchMedia('(pointer: coarse)').matches) touchOn();
  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') { touchOn(); fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, at: performance.now(), moved: false }); try { view.setPointerCapture(e.pointerId); } catch (err) {} return; }
    if (e.button === 2) { if (locked) fire(window.innerWidth / 2, window.innerHeight / 2, true); else fire(e.clientX, e.clientY, true); return; }
    if (e.button !== 0) return;
    if (locked) { mHold = performance.now(); return; }
    if (canLock && !blocked()) { try { const p = view.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* the click fires instead */ } }
    fire(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0 || !mHold) return; const pw = powerOf(mHold); mHold = 0; if (locked) fire(window.innerWidth / 2, window.innerHeight / 2, false, pw); });
  view.addEventListener('pointermove', (e) => {
    const f = fingers.get(e.pointerId); if (!f) return;
    const dx = e.clientX - f.x, dy = e.clientY - f.y; f.x = e.clientX; f.y = e.clientY;
    if (!f.moved && Math.hypot(e.clientX - f.x0, e.clientY - f.y0) > 12) f.moved = true;
    if (!f.moved || blocked()) return;
    const k = (engine.camera.fov * Math.PI / 180) / window.innerHeight;   // one screen height of drag is one field of view
    look.yaw = (look.yaw + dx * k) % (Math.PI * 2); look.pitch = THREE.MathUtils.clamp(look.pitch + dy * k, -1.35, 1.35);
  });
  const lift = (e, tap) => {
    const f = fingers.get(e.pointerId); if (!f) return; fingers.delete(e.pointerId);
    if (!tap || f.moved) return;   // (a finger held still charges the shot)
    cross.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; tapAt = performance.now();
    fire(e.clientX, e.clientY, false, powerOf(f.at));
  };
  let tapAt = -1e9;
  view.addEventListener('pointerup', (e) => lift(e, true)); view.addEventListener('pointercancel', (e) => lift(e, false));
  const bMode = pad.querySelector('#gun-b-mode'), bBrake = pad.querySelector('#gun-b-brake');
  bMode.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); bMode.classList.add('down'); setTimeout(() => bMode.classList.remove('down'), 140); if (!blocked()) setMode(mode + 1); });
  const brake = (on) => (e) => { e.preventDefault(); e.stopPropagation(); bBrake.classList.toggle('down', on); keys.brake = on; engine.throttle = keys.brake ? 0.06 : keys.push ? 2.4 : 1; if (on) { try { bBrake.setPointerCapture(e.pointerId); } catch (err) {} } };
  bBrake.addEventListener('pointerdown', brake(true)); for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bBrake.addEventListener(ev, brake(false));
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
  // NEIGEN: the phone's own orientation turns the view. The sensor's three angles are made into the way the back of the phone
  // points (the arithmetic every such control uses); what counts is how far that has turned, left-right and up-down, from
  // where it pointed when the button was pressed or a portal was last shot. Dragging still works on top of it.
  const bPush = pad.querySelector('#gun-b-push');
  bPush.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); bPush.classList.add('down'); setTimeout(() => bPush.classList.remove('down'), 160); fire(window.innerWidth / 2, window.innerHeight * 0.42, true); });
  const bTilt = pad.querySelector('#gun-b-tilt'), tilt = { on: false, ref: null, now: null, got: 0, heard: null };
  const _te = new THREE.Euler(), _tq = new THREE.Quaternion(), _tq1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), _tz = new THREE.Vector3(0, 0, 1), _tq0 = new THREE.Quaternion(), _tf = new THREE.Vector3();
  const onTilt = (e) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    const rad = Math.PI / 180, turn = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * rad;
    _te.set(e.beta * rad, e.alpha * rad, -e.gamma * rad, 'YXZ'); _tq.setFromEuler(_te).multiply(_tq1).multiply(_tq0.setFromAxisAngle(_tz, -turn));
    _tf.set(0, 0, -1).applyQuaternion(_tq);
    tilt.now = [Math.atan2(-_tf.x, -_tf.z), Math.asin(Math.max(-1, Math.min(1, _tf.y)))]; tilt.got++;
    if (!tilt.ref) tilt.ref = tilt.now.slice();
  };
  look.absorbed = () => { tilt.ref = tilt.now ? tilt.now.slice() : null; look.gy = look.gp = 0; };   // the flight took the view over: the phone's present pose is the new middle
  const setTilt = (on, quiet) => {
    tilt.on = on; bTilt.classList.toggle('down', on); bTilt.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('portals.gun.tilt', on ? '1' : '0'); } catch (e) {}
    window.removeEventListener('deviceorientation', onTilt);
    tilt.ref = tilt.now = null; tilt.got = 0; look.gy = look.gp = 0; clearTimeout(tilt.heard);
    if (!on) return;
    window.addEventListener('deviceorientation', onTilt);
    tilt.heard = setTimeout(() => { if (tilt.on && !tilt.got) { setTilt(false, true); if (!quiet) toast('Dieses Gerät meldet keine Lage: Neigen geht hier nicht', 3600); } }, 1800);
    if (!quiet) toast('Neigen an: Handy drehen zum Umschauen', 2600);
  };
  bTilt.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
  // (on an iPhone the sensor has to be asked for, and only a tap may ask: hence 'click', not 'pointerdown')
  bTilt.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (tilt.on) { setTilt(false); toast('Neigen aus', 1600); return; }
    const D = window.DeviceOrientationEvent;
    if (!D) { toast('Dieses Gerät meldet keine Lage: Neigen geht hier nicht', 3600); return; }
    if (typeof D.requestPermission === 'function') { let ok = false; try { ok = (await D.requestPermission()) === 'granted'; } catch (err) {} if (!ok) { toast('Ohne Freigabe des Bewegungssensors geht Neigen nicht', 3600); return; } }
    setTilt(true);
  });
  // chosen on an earlier visit: on again by itself where the sensor needs no asking (an iPhone has to be tapped each time)
  try { if (localStorage.getItem('portals.gun.tilt') === '1' && window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== 'function' && matchMedia('(pointer: coarse)').matches) setTilt(true, true); } catch (e) {}
  view.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === view; document.body.classList.toggle('gun-look', locked); mHold = 0;
    if (locked) { cross.style.transform = `translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px)`; if (!lockTip) { lockTip = true; toast('Du fliegst, wohin du schaust · WASD, Leertaste, C: steuern · Esc gibt die Maus frei', 6500); } }
  });
  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    const k = 0.0021 * Math.min(1, engine.camera.fov / 60);
    look.yaw = (look.yaw - e.movementX * k) % (Math.PI * 2); look.pitch = THREE.MathUtils.clamp(look.pitch - e.movementY * k, -1.35, 1.35);
  });
  const steer = engine.steer = { x: 0, y: 0, look: 1 };
  const setKey = (e, on) => {
    const c = e.code;
    // X held and let go is the charged shot too (a touchpad's tap cannot be held)
    if (c === 'KeyX') { if (on) { if (!e.repeat && !mHold) mHold = performance.now(); } else if (mHold) { const pw = powerOf(mHold); mHold = 0; fire(locked ? window.innerWidth / 2 : (mx + 1) / 2 * window.innerWidth, locked ? window.innerHeight / 2 : (1 - my) / 2 * window.innerHeight, false, pw); } return; }
    if (e.key === 'Shift' || c === 'KeyS' || c === 'ArrowDown') keys.brake = on; else if (c === 'KeyW' || c === 'ArrowUp') keys.push = on;
    else if (c === 'KeyA' || c === 'ArrowLeft') keys.left = on; else if (c === 'KeyD' || c === 'ArrowRight') keys.right = on;
    else if (c === 'Space') keys.up = on; else if (c === 'KeyC') keys.down = on; else return;
    if (on && (c === 'Space' || c.startsWith('Arrow'))) e.preventDefault();
    engine.throttle = keys.brake ? 0.06 : keys.push ? 2.4 : 1; steer.x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); steer.y = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  };
  window.addEventListener('keydown', (e) => { const tag = e.target && e.target.tagName; if (tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'INPUT' || blocked()) return; setKey(e, true); });
  window.addEventListener('keyup', (e) => setKey(e, false));
  window.addEventListener('blur', () => { mHold = 0; keys.brake = keys.push = keys.left = keys.right = keys.up = keys.down = false; engine.throttle = 1; steer.x = steer.y = 0; });
  let wheelAt = 0;
  window.addEventListener('wheel', (e) => { if ((e.target !== view && !locked) || blocked() || e.ctrlKey) return; const now = performance.now(); if (now - wheelAt < 170 || Math.abs(e.deltaY) < 4) return; wheelAt = now; setMode(mode + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || blocked()) return;
    const tag = e.target && e.target.tagName; if (tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'INPUT') return;
    if (e.key === 'q' || e.key === 'Q') setMode(mode - 1); else if (e.key === 'e' || e.key === 'E') setMode(mode + 1);
    else if (e.key >= '1' && e.key <= String(MODES.length)) setMode(Number(e.key) - 1);
  });
  window.addEventListener('pointermove', (e) => {
    if (locked) { hover = true; mx = 0; my = 0; return; }
    hover = e.target === view && e.pointerType !== 'touch';
    mx = (e.clientX / window.innerWidth) * 2 - 1; my = -(e.clientY / window.innerHeight) * 2 + 1;
    cross.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { hover = false; });

  // ---------- the workshop: where cores are spent ----------
  const ITEMS = [
    { name: () => 'FREMD', text: 'Das Ziel FREMD am Drehknopf: fremde Welten gezielt anw\u00E4hlen', cost: () => 4, done: () => up.alien, buy: () => { up.alien = true; } },
    { name: () => 'BIZARR', text: 'Das Ziel BIZARR am Drehknopf: das ganz Seltsame gezielt anw\u00E4hlen', cost: () => 8, done: () => up.bizarre, buy: () => { up.bizarre = true; } },
    { name: () => 'LADUNG ' + Math.min(3, up.charge + 1) + '/3', text: 'Der aufgeladene Schuss wird st\u00E4rker: gr\u00F6\u00DFeres Portal, weiter weg, schneller', cost: () => [3, 6, 10][Math.min(2, up.charge)], done: () => up.charge >= 3, buy: () => { up.charge++; } },
    { name: () => 'PUSH-SPEICHER', text: 'F\u00FCnf statt drei Pushes laden', cost: () => 6, done: () => up.cells, buy: () => { up.cells = true; } },
  ];
  const shop = document.createElement('div'); shop.id = 'gun-shop'; shop.hidden = true; shop.setAttribute('role', 'dialog'); shop.setAttribute('aria-label', 'Werkstatt'); document.body.appendChild(shop);
  const drawShop = () => {
    shop.innerHTML = '<h2>WERKSTATT</h2><p>\u25C6 ' + bank + (bank === 1 ? ' Kern' : ' Kerne') + ' zum Ausgeben. Kerne h\u00E4ngen golden neben der Route.</p>' + ITEMS.map((it, i) => '<div class="row"><div><b>' + it.name() + '</b><span>' + it.text + '</span></div>' +
      (it.done() ? '<button class="done" disabled>\u2713 GEBAUT</button>' : '<button data-i="' + i + '"' + (bank < it.cost() ? ' disabled' : '') + '>\u25C6 ' + it.cost() + '</button>') + '</div>').join('') + '<button class="close" data-i="x">SCHLIESSEN</button>';
  };
  const openShop = (on) => {
    shopOpen = on; shop.hidden = !on; engine.throttle = on ? 0.06 : keys.brake ? 0.06 : keys.push ? 2.4 : 1;   // (the flight all but stands while the workshop is open)
    if (on) { mHold = 0; drawShop(); try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} }
  };
  shop.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return; if (b.dataset.i === 'x') return openShop(false);
    const it = ITEMS[Number(b.dataset.i)]; if (!it || it.done() || bank < it.cost()) return;
    bank -= it.cost(); it.buy(); saveUp(); setCells(cells); dispKey = ''; chime(); drawShop();
    if (engine.cur && !engine.cur.def.antechamber) engine.requeue();   // a position of the dial just bought counts from this portal on
  });
  chip.addEventListener('click', () => openShop(!shopOpen));
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; const tag = e.target && e.target.tagName; if (tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'INPUT') return;
    if (e.key === 'b' || e.key === 'B') { if (shopOpen || !blocked()) openShop(!shopOpen); } else if (e.key === 'Escape' && shopOpen) openShop(false);
  });

  // ---------- the energy cores ----------
  // Up to five hang beside the route of each world, to the side of it and above, inside the tube the steering allows, so each
  // can be reached and none is met by flying straight on. They are drawn by the gun (its own sprites, laid where the place
  // stands in the engine's picture), so nothing of the world hides them: a core behind a hill still shows where to steer.
  const _cs = new THREE.Vector3(), _cu = new THREE.Vector3(), _ct = new THREE.Vector3();
  // A core looked at is marked: held near the middle of the picture for a moment, by the viewer's own turning, it is the
  // flight's aim from then on (engine steer.target) until it is caught or passed. The flight's own view turns as it goes,
  // so without this a core had to be chased across the picture all the way.
  let lock = null, lockC = null, lockT = 0;
  const unlock = () => { lock = null; steer.target = null; };
  const spawnCores = (A) => {
    const path = A.path, L = path.length; let n = 0;
    for (const c of cores) { c.on = false; c.gone = 0; } unlock(); lockC = null;
    for (let i = 0; i < NC; i++) {
      const d = L * (0.16 + 0.62 * (i + 0.2 + 0.6 * Math.random()) / NC), room = engine.steerRoom(A, L - d);
      if (room.lim < 2.5) continue;
      path.tangentAtDist(d, _ct); _cs.crossVectors(_ct, _cu.set(0, 1, 0)); if (_cs.lengthSq() < 1e-4) _cs.set(1, 0, 0); _cs.normalize(); _cu.crossVectors(_cs, _ct).normalize();
      const a = (0.04 + 0.92 * Math.random()) * Math.PI, rho = room.lim * (0.6 + 0.28 * Math.random()), c = cores[n++];
      path.posAtDist(d, c.pos).addScaledVector(_cs, Math.cos(a) * rho).addScaledVector(_cu, Math.sin(a) * rho);
      c.on = true; c.rho = rho; c.pick = THREE.MathUtils.clamp(room.wide * 0.18, 1, 4.2);
    }
  };
  const caught = (c) => {
    c.on = false; c.gone = 0.4; total++; bank++; saveUp(); if (c === lock) unlock();
    if (!shopTip && bank >= 3) { shopTip = true; setTimeout(() => toast(document.body.classList.contains('gun-touch') ? 'Kerne ausgeben: oben rechts auf die Kerne tippen' : 'Kerne ausgeben: Taste B \u00F6ffnet die Werkstatt', 5200), 1400); }
    const full = cells >= maxCells(); setCells(cells + 1); chime(); say(full ? 'KERN +1' : 'PUSH GELADEN', 1000); charge = 1; heat = Math.max(heat, 0.55); sloshV += 5;
    chip.classList.add('got'); clearTimeout(chipT); chipT = setTimeout(() => chip.classList.remove('got'), 260);
    try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) {}
  };

  // ---------- arrivals: the stamp, the flash of a crossing through a shot portal, the trail for 'ZURÜCK' ----------
  const onWorld = engine.events.world; let stampT = 0;
  engine.events.world = (W, n) => {
    onWorld(W, n);
    const id = W.def.id, code = dimCode(id);
    if (trailIds[trailIds.length - 2] === id) trailIds.pop(); else { trailIds.push(id); if (trailIds.length > 40) trailIds.shift(); }
    const meta = $('title-meta'); if (meta) meta.textContent += ' · Dimension ' + code;
    stamp.innerHTML = 'DIMENSION <b>' + code + '</b>'; stamp.classList.add('show'); clearTimeout(stampT); stampT = setTimeout(() => stamp.classList.remove('show'), 3200);
    if (lastShotWorld && lastShotWorld.shot) { flash.classList.toggle('big', FLASH); flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), FLASH ? 110 : 70); if (FLASH) { arrived = 0.5; shake = Math.max(shake, 0.7); } }
    lastShotWorld = null; shot = null; rift = null; blast = null;
    // on 'ZURÜCK' the world just left is now the one before: nothing to do, the trail has it. On a tier with nothing left the dial says so.
  };

  // ---------- frame ----------
  const BASE = new THREE.Vector3(0.5, -0.078, -0.58), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  let last = performance.now(), w = 0, h = 0, cleared = false, t = 0, firstUp = false;
  function frame(now) { requestAnimationFrame(frame); step(now); }
  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const gap = prevNow ? now - prevNow : 16.7; prevNow = now;
    if (level !== levelOn) { levelOn = level; w = 0; sparkGeo.setDrawRange(0, level === 2 ? NS : NS >> 1); lineGeo.setDrawRange(0, level === 2 ? NL * 2 : (NL >> 1) * 2); }
    const W = window.innerWidth, H = window.innerHeight;
    if (W !== w || H !== h) {
      // On level 0 the canvas is only the corner the gun stands in, not the whole screen: a see-through layer over the whole
      // picture is itself a cost on a phone, every frame, whether or not anything is drawn into it. The camera is told
      // which part of the full picture that corner is, so the gun stands exactly where it did.
      w = W; h = H; const part = level === 0 && !INLINE, cw = part ? Math.round(W * 0.66) : W, ch = part ? Math.round(H * 0.5) : H;
      Object.assign(canvas.style, { left: (W - cw) + 'px', top: (H - ch) + 'px', right: 'auto', bottom: 'auto', width: cw + 'px', height: ch + 'px' });
      if (!INLINE) { renderer.setPixelRatio(pixelRatio()); renderer.setSize(cw, ch, false); } cam.aspect = W / H;
      if (part) cam.setViewOffset(W, H, W - cw, H - ch, cw, ch); else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    }
    const A = engine.cur, live = !!A && !A.def.antechamber && !blocked();
    if (locked && blocked()) { try { document.exitPointerLock(); } catch (e) {} }
    raise += ((live ? 1 : 0) - raise) * (1 - Math.exp(-dt * (live ? 3.2 : 7)));
    if (live && !firstUp && raise > 0.5) { firstUp = true; toast(document.body.classList.contains('gun-touch') ? 'Tippen: Portal (halten l\u00E4dt auf) · PUSH: wegschleudern · Wischen oder NEIGEN: umschauen' : 'Linksklick: Portal (halten oder X halten l\u00E4dt auf) · Rechtsklick: Push · WASD: fliegen · Mausrad: Ziel', 6000); }
    cross.classList.toggle('on', live && (hover || locked || now - tapAt < 500) && raise > 0.6); pad.classList.toggle('on', live); cross.classList.toggle('cold', charge < 1 || !(engine.next && engine.next.ready)); chip.classList.toggle('on', live && raise > 0.6);
    if (lostAt) return;
    if (engine.stats) { engine.stats.gunLevel = level; engine.stats.gunFps = Math.round(fpsE); }   // for the debug panel (?debug=1)
    if (raise > 0.9 && gap < 250 && !engine.settings.paused && document.visibilityState === 'visible') {
      fpsE += (1000 / Math.max(gap, 1) - fpsE) * 0.05;
      if (fpsE < 40) { lowT += dt; highT = 0; } else if (fpsE > 56) { highT += dt; lowT = 0; } else lowT = highT = 0;
      if (lowT > 2.5 && level > 0) { level--; lowT = 0; drops++; noRaise = drops > 1 ? Infinity : now + 45000; }
      else if (highT > 6 && level < 2 && now > noRaise && !(engine.mobile && engine.tier === 'low')) { level++; highT = 0; }
    }
    if (raise < 0.004 && !shot) { if (!cleared && !INLINE) renderer.clear(); cleared = true; return; }
    cleared = false;

    // charge, heat, colour
    charge = Math.min(1, charge + dt / cooldown); heat = Math.max(0, heat - dt * 1.6);
    // a shot held back: the mouse button, or a finger that has not moved
    { let at = mHold; for (const f of fingers.values()) if (!f.moved && (!at || f.at < at)) at = f.at;
      over = at && live && charge >= 1 ? powerOf(at) : 0; cross.classList.toggle('over', over > 0);
      if (over > 0 && !hum) { const a = audio(); if (a) { const o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1100; g.gain.value = 0.03; o.connect(f); f.connect(g); g.connect(a.destination); o.start(); hum = o; } }
      if (hum) { if (over > 0) hum.frequency.value = 70 + 320 * over; else { try { hum.stop(); } catch (e) {} hum = null; } } }
    colNow.lerp(colTo, 1 - Math.exp(-dt * 7)); for (const c of tinted) c.copy(colNow);
    const ready = charge >= 1 && !!(engine.next && engine.next.ready), pulse = 0.5 + 0.5 * Math.sin(t * (ready ? 2.2 : 9));
    glow.emissiveIntensity = 1.2 + 1.6 * charge * (0.7 + 0.3 * pulse) + 7 * heat + 6 * over;
    fluidMat.uniforms.uTime.value = t; fluidMat.uniforms.uLevel.value = 0.3 + 0.62 * charge; fluidMat.uniforms.uHot.value = heat;
    tipGlow.material.opacity = 0.18 + 0.4 * charge * (0.6 + 0.4 * pulse) + heat + over; tipGlow.scale.setScalar(0.035 + 0.03 * charge + 0.22 * heat * heat + 0.13 * over * (1 + 0.15 * Math.sin(t * 60)));
    tipCore.scale.setScalar(0.4 + 0.8 * charge + 2.5 * heat); tipCore.visible = charge > 0.25 || heat > 0;
    vialGlow.material.opacity = 0.1 + 0.16 * charge; vialLight.intensity = 0.006 + 0.012 * charge + 0.03 * heat; muzzleLight.intensity = 0.5 * heat * heat;
    if (tilt.on && tilt.ref && tilt.now) {
      let dy = tilt.now[0] - tilt.ref[0]; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const dp = tilt.now[1] - tilt.ref[1], kt = 1 - Math.exp(-dt * 18);
      let gy = look.gy || 0; gy += Math.atan2(Math.sin(dy - gy), Math.cos(dy - gy)) * kt; look.gy = gy; look.gp = (look.gp || 0) + (dp - (look.gp || 0)) * kt;
    }
    // The view comes back to the flight's own once it is let go: with no finger down (and the mouse not taken, the phone
    // not turned to look) a view left aside would drift the viewer to the wall of the tube and hold them there.
    if (!locked && !tilt.on && fingers.size === 0 && (look.yaw || look.pitch)) {
      restT += dt;
      if (restT > 0.5) { const kr = Math.exp(-dt * 1.7); let y = Math.atan2(Math.sin(look.yaw), Math.cos(look.yaw)) * kr, pt = look.pitch * kr; look.yaw = Math.abs(y) < 0.002 ? 0 : y; look.pitch = Math.abs(pt) < 0.002 ? 0 : pt; }
    } else restT = 0;
    // springs: recoil and the fluid's slosh
    recoilV += (-recoil * 190 - recoilV * 17) * dt; recoil += recoilV * dt;
    sloshV += (-slosh * 60 - sloshV * 4.5) * dt; slosh += sloshV * dt; fluidMat.uniforms.uSlosh.value = THREE.MathUtils.clamp(slosh, -1, 1) * 0.12;
    knobAng += (mode * (Math.PI * 2 / MODES.length) - knobAng) * (1 - Math.exp(-dt * 14)); knob.rotation.x = -knobAng;

    // the world's key light, turned into the eye's space, and how fast the eye is turning (the gun lags a little behind)
    const ec = engine.camera, L = A && A.light;
    if (L && L.has && L.keyIntensity > 0) { _v.copy(L.keyDir).applyQuaternion(_q.copy(ec.quaternion).invert()); if (_v.y < 0.15) _v.y = 0.15; key.position.lerp(_v.normalize(), 1 - Math.exp(-dt * 3)); _w.set(L.key.r, L.key.g, L.key.b); const mxc = Math.max(_w.x, _w.y, _w.z, 1e-3); key.color.lerp(new THREE.Color(_w.x / mxc, _w.y / mxc, _w.z / mxc).lerp(new THREE.Color(1, 1, 1), 0.45), 1 - Math.exp(-dt * 2)); }
    else { key.position.lerp(_v.set(-0.5, 1, 0.6), 1 - Math.exp(-dt * 3)); key.color.lerp(new THREE.Color(1, 1, 1), 1 - Math.exp(-dt * 2)); }
    if (lastQSet && dt > 0) { _q.copy(lastQ).invert().multiply(ec.quaternion); _e.setFromQuaternion(_q, 'YXZ'); swayX += (THREE.MathUtils.clamp(_e.y / dt, -2, 2) * 0.03 - swayX) * (1 - Math.exp(-dt * 6)); swayY += (THREE.MathUtils.clamp(_e.x / dt, -2, 2) * 0.03 - swayY) * (1 - Math.exp(-dt * 6)); }
    lastQ.copy(ec.quaternion); lastQSet = true;

    // pose: at the lower right, pointing where the crosshair is, breathing, kicked by recoil, lowered when not in use
    const k = 1 - Math.exp(-dt * 9); aimX += ((hover ? mx : 0.15) - aimX) * k; aimY += ((hover ? my : 0) - aimY) * k;
    const sp = Math.min(1, engine.speed / 20), down = (1 - raise) * (1 - raise);
    const fit = THREE.MathUtils.clamp(cam.aspect / 1.3, 0.45, 1); gun.scale.setScalar(fit);   // a tall, narrow window gets a smaller gun, so its display stays in the picture
    const bx = Math.min(0.2, BASE.x * Math.tan(cam.fov * Math.PI / 360) * cam.aspect * -BASE.z);   // half way to the right edge, whatever the window's shape
    gun.position.set(bx + aimX * 0.016 + swayX * 0.5 + 0.0016 * Math.sin(t * 0.9) + over * 0.0025 * Math.sin(t * 83), BASE.y * (0.55 + 0.45 * fit) + aimY * 0.012 - down * 0.34 + 0.0022 * Math.sin(t * 1.3 + 1) + 0.0012 * sp * Math.sin(t * 7.3), BASE.z + recoil * 0.05 + swayX * 0.1);
    gun.rotation.set(0.07 + aimY * 0.17 + recoil * 0.5 - down * 0.9 - swayY * 1.2, 0.4 - aimX * 0.24 + swayX * 2.2, -0.06 - aimX * 0.05 + 0.008 * Math.sin(t * 0.7) + swayX * 1.5, 'YXZ');
    gun.updateMatrixWorld(true);

    // the bolt: from the muzzle to the place the portal opens, then a burst there
    for (const s of trail) s.material.opacity = 0;
    if (shot) {
      shot.t += dt;
      // where the target is in this camera's picture: the engine's camera places it, ours gives the ray
      _v.copy(shot.point).project(ec); const behind = _v.z > 1; const depth = _w.copy(shot.point).sub(ec.position).length();
      _v.set(behind ? 0 : _v.x, behind ? 0 : _v.y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(Math.max(0.6, depth));
      const u = Math.min(1, shot.t / shot.delay), e = u * u * (3 - 2 * u), size = 0.02 + 0.013 * e * depth;
      if (u < 1) {
        bolt.position.lerpVectors(shot.from, _v, e); boltCore.position.copy(bolt.position);
        bolt.scale.setScalar(size * 3.2); boltCore.scale.setScalar(size * 1.1); bolt.material.opacity = 1; boltCore.material.opacity = 1;
        shot.hist.unshift(bolt.position.clone()); if (shot.hist.length > trail.length) shot.hist.pop();
        shot.hist.forEach((p, i) => { const s = trail[i], f = 1 - i / trail.length; s.position.copy(p); s.scale.setScalar(size * 2.2 * f); s.material.opacity = 0.55 * f * f; });
      } else {
        bolt.material.opacity = 0; boltCore.material.opacity = 0;
        if (!shot.landed) {
          shot.landed = true; rift = { point: shot.exit, radius: shot.radius }; if (FLASH) { shake = 1; ringT = shot.push ? 9 : 0; }
          if (shot.push) { blast = { point: shot.point, radius: shot.radius, t: 0 }; shake = 1.5; flash.classList.add('big'); flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), 90); }
        }
        const b = (shot.t - shot.delay) / 0.45;
        if (b < 1) { burst.position.copy(_v); burst.scale.setScalar((0.3 + 1.5 * Math.sqrt(b)) * shot.radius * 2.2); burst.material.opacity = (1 - b) * (1 - b) * 0.9; }
        else { burst.material.opacity = 0; if (shot.t > shot.delay + 1.2) shot = null; }
      }
    } else { bolt.material.opacity = 0; boltCore.material.opacity = 0; burst.material.opacity = 0; }
    if (level === 0 && !INLINE) { bolt.material.opacity = boltCore.material.opacity = burst.material.opacity = 0; for (const s of trail) s.material.opacity = 0; }   // (the bolt would leave the corner the canvas covers)

    if (FLASH) {
      // the shake (a turn of the head the engine lays over the view), dying away; none on a gentle flight
      shake = Math.max(0, shake - dt * 2.4); const sa = engine.gentle ? 0 : shake * shake * 0.03;
      look.sy = sa * (Math.sin(t * 67) + 0.6 * Math.sin(t * 113 + 1)); look.sp = sa * (Math.sin(t * 59 + 2) + 0.6 * Math.sin(t * 97));
      // the way in: over the second half of the flight to a shot portal the lens widens and light streaks past; it lingers a moment after the crossing
      const sh = A && A.shot, left = sh ? (A.path.length - A.dist) / Math.max(1, A.path.length) : 1; arrived = Math.max(0, arrived - dt);
      const to = arrived > 0 || (sh && sh.push && sh.t < 1.1) ? 1 : sh && sh.t > sh.delay ? THREE.MathUtils.clamp((0.7 - left) / 0.45, 0, 1) : 0;   // (hurled by a push: streaks at once)
      warp += (to - warp) * (1 - Math.exp(-dt * (to > warp ? 3 : 5))); engine.fovKick = engine.gentle || engine.mobile ? 0 : 0.16 * warp * warp;   // (a wider lens is more to draw: not on a phone)
      streaks.visible = warp > 0.02 && level > 0;
      if (streaks.visible) {
        const sp = 26 + 90 * warp, len = 0.4 + 7 * warp;
        for (let i = 0; i < NL; i++) { const q = lineSeed[i]; q[2] += dt * sp * q[3]; if (q[2] > 2) q[2] -= 46; const o = i * 6; linePos[o] = linePos[o + 3] = q[0]; linePos[o + 1] = linePos[o + 4] = q[1]; linePos[o + 2] = q[2]; linePos[o + 5] = q[2] - len * q[3]; }
        lineGeo.attributes.position.needsUpdate = true; streaks.material.opacity = 0.75 * warp;
      }
      // the shock ring and the sparks, where the portal stands in this camera's picture
      sparks.visible = false; ring.material.opacity = 0;
      if (rift && A && (level > 0 || INLINE)) {
        _v.copy(rift.point).project(ec); const depth = _w.copy(rift.point).sub(ec.position).length();
        if (_v.z < 1 && depth > 0.5) {
          _v.set(_v.x, _v.y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(depth);
          const R = rift.radius; ringT += dt; const rb = ringT / 0.6;
          if (rb < 1) { ring.position.copy(_v); ring.scale.setScalar((0.6 + 5.5 * Math.sqrt(rb)) * R * 2); ring.material.opacity = (1 - rb) * (1 - rb); }
          sparks.visible = level > 0; sparks.material.size = R * 0.34; sparks.material.opacity = 0.85 * Math.min(1, ringT * 3);
          for (let i = 0; i < NS; i++) { const q = sparkSeed[i], f = (t * 0.55 * q[2] + q[1]) % 1, rr = R * (2.6 - 2.3 * f), a = q[0] + 5.5 * f * f; sparkPos[i * 3] = _v.x + Math.cos(a) * rr; sparkPos[i * 3 + 1] = _v.y + Math.sin(a) * rr; sparkPos[i * 3 + 2] = _v.z + R * 0.3 * (1 - f); }
          sparkGeo.attributes.position.needsUpdate = true;
        }
      }
    }
    // the cores: set out when a world is new, caught when flown into (the last metres they come to meet the viewer), drawn where they stand
    if (live && A !== coreWorld) { coreWorld = A; spawnCores(A); if (!coreTipAt) coreTipAt = now + 9000; }
    if (coreTipAt > 0 && now > coreTipAt && live) { coreTipAt = -1; toast('Goldene Kerne neben der Route: kurz anschauen, dann fliegst du von selbst hin', 5200); }
    let cand = null, candA = 9; _cs.set(0, 0, -1).applyQuaternion(ec.quaternion); _cu.set(0, 0, -1).applyQuaternion(engine.camQuat); const turnedBy = Math.hypot(Math.atan2(Math.sin(look.yaw + (look.gy || 0)), Math.cos(look.yaw + (look.gy || 0))), look.pitch + (look.gp || 0));   // how far the viewer has turned the view themselves
    for (const c of cores) {
      c.halo.material.opacity = c.heart.material.opacity = c.rg.material.opacity = 0;
      if (!c.on && c.gone <= 0) continue;
      if (!A || A !== coreWorld) { c.on = false; c.gone = 0; continue; }
      let dist = _w.copy(c.pos).sub(ec.position).length();
      if (c.on && !lock && turnedBy > 0.02 && dist > 1 && dist < 320) { const aV = Math.acos(Math.min(1, _w.dot(_cs) / dist)), aG = Math.acos(Math.min(1, _w.dot(_cu) / dist)); if (aV < Math.min(0.22, Math.max(0.1, c.pick * 3 / dist)) && aV < aG - 0.015 && aV < candA) { cand = c; candA = aV; } }   // (within some six degrees of the middle of the picture, and nearer to it than the flight's own view had it: the viewer turned toward it)
      if (c.on && dt > 0 && !engine.settings.paused) { if (dist < c.pick * 2.1) { c.pos.lerp(ec.position, 1 - Math.exp(-dt * 6)); dist = _w.copy(c.pos).sub(ec.position).length(); } if (dist < c.pick) caught(c); }
      if (c.gone > 0 && !c.on) c.gone -= dt;
      if (level === 0 && !INLINE) continue;
      _v.copy(c.pos).project(ec); if (_v.z >= 1 || dist < 0.05) continue;
      const dd = Math.min(dist, 300), g = c.on ? 0 : 1 - Math.max(0, c.gone) / 0.4, al = (c.on ? THREE.MathUtils.clamp(1.5 - dist / 260, 0.3, 1) : 1 - g) * raise;
      _v.set(_v.x, _v.y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(dd);
      const sz = Math.min(Math.max(c.pick * 0.55 * dd / Math.max(dist, 1e-3), dd * 0.011), dd * 0.05) * (1 + 0.14 * Math.sin(t * 4 + c.ph)) * (1 + 3 * g);
      c.halo.position.copy(_v); c.halo.scale.setScalar(sz * 5.5); c.halo.material.opacity = 0.5 * al;
      c.heart.position.copy(_v); c.heart.scale.setScalar(sz * 1.5); c.heart.material.opacity = al;
      const lk = c === lock ? 1 : 0; c.rg.material.color.set(lk ? 0xffffff : GOLD);
      c.rg.position.copy(_v); c.rg.scale.setScalar(sz * (lk ? 4.2 + 0.9 * Math.sin(t * 9) : 3 + 0.5 * Math.sin(t * 2.3 + c.ph))); c.rg.material.opacity = (lk ? 1 : 0.75) * al;
    }
    if (cand === lockC && cand) lockT += dt; else { lockC = cand; lockT = 0; }
    if (!lock && lockC && lockT > 0.18 && live) { lock = lockC; steer.target = lock.pos; lockC = null; click(); say('ZIEL ERFASST', 900); }
    if (lock) { if (!lock.on || !A || A !== coreWorld) unlock(); else { A.path.tangentAtDist(A.dist, _ct); if (_w.copy(lock.pos).sub(ec.position).dot(_ct) < -3) unlock(); } }
    // the white hole of a push, for a little over two seconds, where it stands in this camera's picture
    holeCore.material.opacity = holeHalo.material.opacity = 0; for (const r of holeRings) r.material.opacity = 0; ejecta.visible = false;
    if (blast) {
      blast.t += dt; const bt = blast.t, R = blast.radius;
      if (bt > 2.4) blast = null;
      else {
        _v.copy(blast.point).project(ec); const depth = _w.copy(blast.point).sub(ec.position).length();
        if (_v.z < 1 && depth > 0.5 && !(level === 0 && !INLINE)) {
          _v.set(_v.x, _v.y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(depth);
          const life = bt < 1.5 ? 1 : Math.max(0, 1 - (bt - 1.5) / 0.9), born = Math.min(1, bt / 0.12), flick = 1 + 0.12 * Math.sin(t * 43) + 0.08 * Math.sin(t * 71);
          holeCore.position.copy(_v); holeCore.scale.setScalar(R * 2.6 * born * flick); holeCore.material.opacity = life;
          holeHalo.position.copy(_v); holeHalo.scale.setScalar(R * 7 * born * (1 + 0.3 * bt)); holeHalo.material.opacity = 0.55 * life;
          holeRings.forEach((r, i) => { const b = (bt - i * 0.2) / 0.7; if (b > 0 && b < 1) { r.position.copy(_v); r.scale.setScalar((0.8 + 8 * Math.sqrt(b)) * R * 2); r.material.opacity = (1 - b) * (1 - b); } });
          ejecta.visible = true; ejecta.material.size = R * 0.3; ejecta.material.opacity = 0.9 * life;
          for (let i = 0; i < NE; i++) { const q = ejSeed[i], f = (bt * 1.3 * q[2] + q[1]) % 1, rr = R * (0.4 + 6.5 * f); ejPos[i * 3] = _v.x + Math.cos(q[0]) * rr; ejPos[i * 3 + 1] = _v.y + Math.sin(q[0]) * rr; ejPos[i * 3 + 2] = _v.z + R * q[3] * 2 * f; }
          ejGeo.attributes.position.needsUpdate = true;
        }
      }
    }
    if (INLINE || level > 0 || shot || blast || (frameNo++ & 1) === 0) { drawDisplay(now); draw(); }   // (level 0: every other frame, but every frame while a bolt flies)
  }
  if (INLINE) {
    // the gun's materials are made ready before the first frame that shows it, as the engine does for its worlds
    try { const r = renderer, tm = r.toneMapping; r.setRenderTarget(null); r.toneMapping = THREE.ACESFilmicToneMapping; try { r.compile(scene, cam); } finally { r.toneMapping = tm; } } catch (e) { console.warn('portal gun', e); }
    engine.overlay = () => step(performance.now());
  } else requestAnimationFrame(frame);

  return { setMode, fire, step, cores, get cells() { return cells; }, set cells(v) { setCells(v); }, get total() { return total; }, get lock() { return lock; }, get bank() { return bank; }, set bank(v) { bank = Math.max(0, v | 0); saveUp(); setCells(cells); }, up, openShop, get over() { return over; }, get mode() { return MODES[mode].id; }, get level() { return level; }, set level(v) { level = Math.max(0, Math.min(2, v | 0)); }, modes: MODES };
}
