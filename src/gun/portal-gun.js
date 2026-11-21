// The portal gun: a hand-held rift projector drawn over the flight, and the controls that go with it.
//   left click     open a portal where the crosshair points; the flight turns into it
//   wheel, Q / E   turn the dial: which kind of world waits behind the next portal
//   1 .. 6         the dial's positions by number
//   first click    takes the mouse (Esc gives it back): from then on the mouse looks round, as in a first-person game
//   Shift / W      brake to a hover / push on
// The gun is drawn by a small renderer of its own on a transparent canvas above the picture, so no world's fog, grade or
// near plane touches it; the world's key light is borrowed so that it still sits in the scene. The portal itself, the
// curve of the flight into it and the crossing are the engine's (core/engine.js shoot(), core/portal.js 'vortex').
import * as THREE from 'three';
import { tierOf } from '../core/pick.js';

const MODES = [
  { id: 'any', name: 'ZUFALL', hint: 'irgendeine Dimension', color: '#6dff3b' },
  { id: 'earth', name: 'IRDISCH', hint: 'vertraute Welten', color: '#35d8ff', tier: 0 },
  { id: 'alien', name: 'FREMD', hint: 'fremde Welten', color: '#a97bff', tier: 1 },
  { id: 'bizarre', name: 'BIZARR', hint: 'das ganz Seltsame', color: '#ff4fd8', tier: 2 },
  { id: 'fav', name: 'FAVORIT', hint: 'deine gemerkten Welten', color: '#ffb62e' },
  { id: 'back', name: 'ZURÜCK', hint: 'die Welt davor', color: '#ff6a3a' },
];
const COOLDOWN = 1.15;

// A world's dimension code: two letters and three digits from its id, the same on every visit.
export function dimCode(id) {
  let h = 2166136261; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h >>>= 0; const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return A[h % 24] + A[Math.floor(h / 24) % 24] + '-' + String(Math.floor(h / 576) % 1000).padStart(3, '0');
}

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
body.notitles #gun-stamp { display: none; }
`;

export function setupGun({ engine, hearts, toast, soundOn }) {
  const $ = (id) => document.getElementById(id), view = $('view');
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const canvas = document.createElement('canvas'); canvas.id = 'gun'; view.after(canvas);
  const cross = document.createElement('div'); cross.id = 'gun-x';
  cross.innerHTML = '<svg viewBox="0 0 44 44" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><g class="ring"><circle cx="22" cy="22" r="11"/><path d="M22 4v7M22 33v7M4 22h7M33 22h7"/></g><circle cx="22" cy="22" r="1.4" fill="currentColor" stroke="none"/></svg>';
  const stamp = document.createElement('div'); stamp.id = 'gun-stamp';
  const flash = document.createElement('div'); flash.id = 'gun-flash';
  document.body.append(flash, cross, stamp); document.body.classList.add('gun');

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { console.warn('portal gun: no second graphics context', e); canvas.remove(); cross.remove(); document.body.classList.remove('gun'); return null; }
  renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.02, 400);
  scene.add(cam);

  // ---------- light: a small studio, mirrored in the metal, and the world's own key ----------
  {
    const env = new THREE.Scene(), box = (w, h, x, y, z, c, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ color: 0x3a4150, side: THREE.BackSide })));
    box(16, 10, -9, 11, 5, '#eaf2ff', 14); box(7, 14, 12, 3, 4, '#fff1dc', 8); box(22, 5, 0, 6, -14, '#9fd0ff', 5); box(14, 14, 0, -12, 0, '#6a7080', 1.6); box(4, 4, -6, -2, 12, '#ffffff', 10); box(24, 2, 0, 1, 15, '#cfe0ff', 7); box(6, 16, -14, 0, -3, '#dfe8ff', 6);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.035).texture; pm.dispose();
    env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
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
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.2, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false });
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
  const vialLight = new THREE.PointLight(MODES[0].color, 0.012, 0.4, 2); vialLight.position.set(0, VY + 0.01, VZ); body.add(vialLight);
  const muzzleLight = new THREE.PointLight(MODES[0].color, 0, 0.8, 2); muzzleLight.position.copy(MUZZLE); body.add(muzzleLight);
  const bolt = sprite(scene, 0.1, 0); const boltCore = sprite(scene, 0.04, 0); boltCore.material.color.set(0xffffff);
  const trail = Array.from({ length: 14 }, () => sprite(scene, 0.05, 0));
  const burst = sprite(scene, 1, 0);
  const tinted = [glow.emissive, fluidMat.uniforms.uColor.value, tipGlow.material.color, vialGlow.material.color, vialLight.color, muzzleLight.color, bolt.material.color, burst.material.color, ...trail.map((t) => t.material.color)];

  // ---------- state ----------
  let mode = 0; try { const m = Number(localStorage.getItem('portals.gun.mode')); if (m >= 0 && m < MODES.length) mode = Math.floor(m); } catch (e) {}
  const colNow = new THREE.Color(MODES[mode].color), colTo = new THREE.Color(MODES[mode].color);
  const worldsById = new Map(engine.registry.map((d) => [d.id, d])), trailIds = [];
  let charge = 1, raise = 0, recoil = 0, recoilV = 0, heat = 0, slosh = 0, sloshV = 0, knobAng = 0, mx = 0.25, my = -0.1, aimX = 0, aimY = 0, hover = false, note = '', noteUntil = 0, shot = null, lastShotWorld = null, dispKey = '', swayX = 0, swayY = 0;
  const lastQ = new THREE.Quaternion(); let lastQSet = false;

  const pickFor = (m) => {
    const cur = engine.cur && engine.cur.def.id;
    if (m.id === 'any') return null;
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

  const say = (text, ms = 1600) => { note = text; noteUntil = performance.now() + ms; };
  const setMode = (i, quiet) => {
    i = ((i % MODES.length) + MODES.length) % MODES.length; if (i === mode && !quiet) return;
    mode = i; const m = MODES[mode]; colTo.set(m.color);
    document.documentElement.style.setProperty('--gun', m.color);
    try { localStorage.setItem('portals.gun.mode', String(mode)); } catch (e) {}
    if (quiet) return;
    click(); slosh += 0.4;
    if (m.id === 'fav' && !(hearts && hearts.size)) { say('KEINE FAVORITEN', 2600); toast('Noch keine Favoriten: mit H merkst du dir eine Welt'); return; }
    if (m.id === 'back' && trailIds.length < 2) { say('KEIN VERLAUF', 2600); toast('Zurück geht erst nach dem ersten Sprung'); return; }
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
  const bang = (delay) => {
    const a = audio(); if (!a) return; const t = a.currentTime;
    const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(95, t + 0.34);
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(380, t + 0.36); o.connect(f); f.connect(env(a, t, 0.22, 0.42)); o.start(t); o.stop(t + 0.45);
    const s = a.createOscillator(); s.type = 'sine'; s.frequency.setValueAtTime(150, t); s.frequency.exponentialRampToValueAtTime(38, t + 0.3); s.connect(env(a, t, 0.5, 0.36)); s.start(t); s.stop(t + 0.4);
    const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.25); bp.Q.value = 1.2; n.connect(bp); bp.connect(env(a, t, 0.2, 0.28)); n.start(t);
    // the rift tearing open where the bolt lands: a rising chord with a slow beat in it
    const t2 = t + delay; for (const [fr, det] of [[110, 0], [165, 3], [220.5, -4], [331, 5]]) { const p = a.createOscillator(); p.type = 'sine'; p.frequency.setValueAtTime(fr * 0.5, t2); p.frequency.exponentialRampToValueAtTime(fr, t2 + 0.5); p.detune.value = det; p.connect(env(a, t2, 0.07, 1.5)); p.start(t2); p.stop(t2 + 1.6); }
  };

  // ---------- the display ----------
  const hexA = (c, a) => { const k = new THREE.Color(c); return `rgba(${Math.round(k.r * 255)},${Math.round(k.g * 255)},${Math.round(k.b * 255)},${a})`; };
  function drawDisplay(now) {
    const m = MODES[mode], A = engine.cur, n = engine.next, ante = !A || A.def.antechamber, ready = !!(n && n.ready);
    const noteOn = now < noteUntil, blink = Math.floor(now / 320) % 2;
    const status = noteOn ? note : ante ? 'KALIBRIERE' : charge < 1 ? 'LADE' : !ready ? 'SUCHE ZIEL' : 'BEREIT';
    const code = n && n.def && !ante ? dimCode(n.def.id) : '··-···', name = ready && n.def ? String(n.def.name || '').toUpperCase() : '';
    const bars = Math.round(charge * 12), sig = [mode, status, code, name, bars, status === 'SUCHE ZIEL' || status === 'KALIBRIERE' ? blink : 0].join('|');
    if (sig === dispKey) return; dispKey = sig;
    const g = dg, W = 512, H = 340, c = m.color, mono = 'ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace';
    g.fillStyle = '#020604'; g.fillRect(0, 0, W, H);
    const bgG = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 330); bgG.addColorStop(0, hexA(c, 0.16)); bgG.addColorStop(1, hexA(c, 0.02)); g.fillStyle = bgG; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic'; g.shadowColor = c; g.shadowBlur = 14;
    g.fillStyle = hexA(c, 0.75); g.font = `600 22px ${mono}`; g.textAlign = 'left'; g.fillText('MODUS ' + (mode + 1) + '/' + MODES.length, 24, 40);
    g.textAlign = 'right'; g.fillText(status, W - 24, 40);
    g.fillStyle = '#ffffff'; g.shadowBlur = 22; g.textAlign = 'left'; g.font = `800 84px ${mono}`; g.fillText(m.name, 22, 128);
    g.shadowBlur = 10; g.fillStyle = hexA(c, 0.7); g.font = `600 22px ${mono}`; g.fillText('ZIEL-DIMENSION', 24, 176);
    g.fillStyle = c; g.shadowBlur = 20; g.font = `800 66px ${mono}`; g.fillText(code, 22, 244);
    g.shadowBlur = 8; g.fillStyle = hexA(c, 0.85); g.font = `600 21px ${mono}`;
    let nm = name; while (nm && g.measureText(nm).width > W - 48) nm = nm.slice(0, -2); if (nm !== name) nm = nm.trimEnd() + '…';
    g.fillText(nm || (status === 'SUCHE ZIEL' ? (blink ? '▮' : ' ') : ''), 24, 280);
    g.shadowBlur = 8; for (let i = 0; i < 12; i++) { g.fillStyle = i < bars ? c : hexA(c, 0.16); g.fillRect(24 + i * 39, 300, 32, 18); }
    g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,.26)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.5);
    dTex.needsUpdate = true;
    lamps[0].emissive.set(status === 'BEREIT' ? 0x39ff6a : 0x000000); lamps[1].emissive.set(status === 'LADE' || status === 'SUCHE ZIEL' || status === 'KALIBRIERE' ? 0xffb000 : 0x000000); lamps[2].emissive.set(noteOn ? 0xff3020 : 0x000000);
  }

  // ---------- firing ----------
  const blocked = () => document.body.classList.contains('atlas-open') || !!$('about') || !$('veil').classList.contains('gone');
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  function fire(cx, cy) {
    if (blocked() || raise < 0.6) return;
    const A = engine.cur;
    if (!A || A.def.antechamber) { say('KALIBRIERE', 1200); dry(); return; }
    if (engine.settings.paused) { say('PAUSE', 1000); dry(); return; }
    if (charge < 1) { dry(); return; }
    const res = engine.shoot((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1, MODES[mode].color);
    if (!res) { say('ZU NAH', 1200); dry(); return; }
    charge = 0; recoilV += 5.2; heat = 1; sloshV += 9; lastShotWorld = A;
    shot = { t: 0, delay: res.delay, point: res.point, radius: res.radius, landed: false, from: body.localToWorld(_v.copy(MUZZLE)).clone(), hist: [] };
    cross.classList.add('kick'); requestAnimationFrame(() => requestAnimationFrame(() => cross.classList.remove('kick')));
    bang(res.delay);
  }
  const canLock = !!view.requestPointerLock && !matchMedia('(pointer: coarse)').matches;
  view.addEventListener('pointerdown', (e) => {
    if (e.button === 2) { if (!blocked()) setMode(mode + 1); return; }
    if (e.button !== 0) return;
    if (locked) return fire(window.innerWidth / 2, window.innerHeight / 2);
    if (canLock && e.pointerType === 'mouse' && !blocked()) { try { const p = view.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* the click fires instead */ } }
    fire(e.clientX, e.clientY);
  });
  view.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === view; document.body.classList.toggle('gun-look', locked);
    if (locked) { cross.style.transform = `translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px)`; if (!lockTip) { lockTip = true; toast('Maus schaut sich um · Shift bremst · W gibt Schub · Esc gibt die Maus frei', 6500); } }
  });
  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    const k = 0.0021 * Math.min(1, engine.camera.fov / 60);
    look.yaw = (look.yaw - e.movementX * k) % (Math.PI * 2); look.pitch = THREE.MathUtils.clamp(look.pitch - e.movementY * k, -1.35, 1.35);
  });
  const setKey = (e, on) => { if (e.key === 'Shift') keys.brake = on; else if (e.key === 'w' || e.key === 'W' || e.code === 'ArrowUp') keys.push = on; else return; engine.throttle = keys.brake ? 0.06 : keys.push ? 2.4 : 1; };
  window.addEventListener('keydown', (e) => { const tag = e.target && e.target.tagName; if (tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'INPUT' || blocked()) return; setKey(e, true); });
  window.addEventListener('keyup', (e) => setKey(e, false));
  window.addEventListener('blur', () => { keys.brake = keys.push = false; engine.throttle = 1; });
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

  // ---------- arrivals: the stamp, the flash of a crossing through a shot portal, the trail for 'ZURÜCK' ----------
  const onWorld = engine.events.world; let stampT = 0;
  engine.events.world = (W, n) => {
    onWorld(W, n);
    const id = W.def.id, code = dimCode(id);
    if (trailIds[trailIds.length - 2] === id) trailIds.pop(); else { trailIds.push(id); if (trailIds.length > 40) trailIds.shift(); }
    const meta = $('title-meta'); if (meta) meta.textContent += ' · Dimension ' + code;
    stamp.innerHTML = 'DIMENSION <b>' + code + '</b>'; stamp.classList.add('show'); clearTimeout(stampT); stampT = setTimeout(() => stamp.classList.remove('show'), 3200);
    if (lastShotWorld && lastShotWorld.shot) { flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), 70); }
    lastShotWorld = null; shot = null;
    // on 'ZURÜCK' the world just left is now the one before: nothing to do, the trail has it. On a tier with nothing left the dial says so.
  };

  // ---------- frame ----------
  const BASE = new THREE.Vector3(0.5, -0.118, -0.5), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  let last = performance.now(), w = 0, h = 0, cleared = false, t = 0, firstUp = false;
  function frame(now) { requestAnimationFrame(frame); step(now); }
  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const W = window.innerWidth, H = window.innerHeight;
    if (W !== w || H !== h) { w = W; h = H; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
    const A = engine.cur, live = !!A && !A.def.antechamber && !blocked();
    if (locked && blocked()) { try { document.exitPointerLock(); } catch (e) {} }
    raise += ((live ? 1 : 0) - raise) * (1 - Math.exp(-dt * (live ? 3.2 : 7)));
    if (live && !firstUp && raise > 0.5) { firstUp = true; toast('Linksklick: Portal schießen · Mausrad oder Q/E: Ziel wählen', 6000); }
    cross.classList.toggle('on', live && (hover || locked) && raise > 0.6); cross.classList.toggle('cold', charge < 1 || !(engine.next && engine.next.ready));
    if (raise < 0.004 && !shot) { if (!cleared) { renderer.clear(); cleared = true; } return; }
    cleared = false;

    // charge, heat, colour
    charge = Math.min(1, charge + dt / COOLDOWN); heat = Math.max(0, heat - dt * 1.6);
    colNow.lerp(colTo, 1 - Math.exp(-dt * 7)); for (const c of tinted) c.copy(colNow);
    const ready = charge >= 1 && !!(engine.next && engine.next.ready), pulse = 0.5 + 0.5 * Math.sin(t * (ready ? 2.2 : 9));
    glow.emissiveIntensity = 1.2 + 1.6 * charge * (0.7 + 0.3 * pulse) + 7 * heat;
    fluidMat.uniforms.uTime.value = t; fluidMat.uniforms.uLevel.value = 0.3 + 0.62 * charge; fluidMat.uniforms.uHot.value = heat;
    tipGlow.material.opacity = 0.18 + 0.4 * charge * (0.6 + 0.4 * pulse) + heat; tipGlow.scale.setScalar(0.035 + 0.03 * charge + 0.22 * heat * heat);
    tipCore.scale.setScalar(0.4 + 0.8 * charge + 2.5 * heat); tipCore.visible = charge > 0.25 || heat > 0;
    vialGlow.material.opacity = 0.1 + 0.16 * charge; vialLight.intensity = 0.006 + 0.012 * charge + 0.03 * heat; muzzleLight.intensity = 0.5 * heat * heat;
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
    gun.position.set(bx + aimX * 0.016 + swayX * 0.5 + 0.0016 * Math.sin(t * 0.9), BASE.y * (0.55 + 0.45 * fit) + aimY * 0.012 - down * 0.34 + 0.0022 * Math.sin(t * 1.3 + 1) + 0.0012 * sp * Math.sin(t * 7.3), BASE.z + recoil * 0.05 + swayX * 0.1);
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
        const b = (shot.t - shot.delay) / 0.45;
        if (b < 1) { burst.position.copy(_v); burst.scale.setScalar((0.3 + 1.5 * Math.sqrt(b)) * shot.radius * 2.2); burst.material.opacity = (1 - b) * (1 - b) * 0.9; }
        else { burst.material.opacity = 0; if (shot.t > shot.delay + 1.2) shot = null; }
      }
    } else { bolt.material.opacity = 0; boltCore.material.opacity = 0; burst.material.opacity = 0; }

    drawDisplay(now);
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);

  return { setMode, fire, step, get mode() { return MODES[mode].id; }, modes: MODES };
}
