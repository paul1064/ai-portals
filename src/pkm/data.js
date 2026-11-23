// Portals in 2D (?pkm=1): the creatures, their kinds and their moves. Everything here is this game's own: the names, the
// kinds and the numbers were made for it, and every picture is drawn from a number by sprites.js.

// The kinds (KIND.id is what creatures and moves carry) and which kind hits which harder (2) or weaker (0.5).
export const KINDS = {
  glut: { name: 'GLUT', dark: '#7a2413', main: '#e8552d', light: '#ffb347' },
  welle: { name: 'WELLE', dark: '#1c3f78', main: '#3b8fe0', light: '#a8dcff' },
  spross: { name: 'SPROSS', dark: '#1f5a2a', main: '#4caf50', light: '#c1ea72' },
  funke: { name: 'FUNKE', dark: '#7a5a05', main: '#f2c81e', light: '#fff7a8' },
  stein: { name: 'STEIN', dark: '#4a4238', main: '#9a8f80', light: '#ded5c5' },
  schatten: { name: 'SCHATTEN', dark: '#2c1d5c', main: '#6a4fb3', light: '#c2adf5' },
  wind: { name: 'WIND', dark: '#2b6a62', main: '#7fcfc2', light: '#e6fffa' },
  normal: { name: 'NORMAL', dark: '#4d4d4d', main: '#b9b3a6', light: '#eeeae0' },
};
const STRONG = { glut: ['spross', 'wind'], welle: ['glut', 'stein'], spross: ['welle', 'stein'], funke: ['welle', 'wind'], stein: ['glut', 'funke'], schatten: ['schatten', 'wind'], wind: ['spross', 'schatten'] };
const WEAK = { glut: ['welle', 'stein', 'glut'], welle: ['spross', 'welle'], spross: ['glut', 'spross', 'wind'], funke: ['stein', 'spross', 'funke'], stein: ['welle', 'spross'], schatten: ['stein'], wind: ['funke', 'stein'], normal: ['stein'] };
export const effect = (move, target) => ((STRONG[move] || []).includes(target) ? 2 : (WEAK[move] || []).includes(target) ? 0.5 : 1);

// Moves: three of each kind (learned at levels 1, 8 and 16) and two plain ones.
export const MOVES = {
  rempler: { name: 'Rempler', kind: 'normal', pow: 35, acc: 100 },
  ansturm: { name: 'Ansturm', kind: 'normal', pow: 60, acc: 95 },
  glut1: { name: 'Funkenflug', kind: 'glut', pow: 40, acc: 100 }, glut2: { name: 'Lohe', kind: 'glut', pow: 65, acc: 95 }, glut3: { name: 'Feuersturm', kind: 'glut', pow: 90, acc: 85 },
  welle1: { name: 'Spritzer', kind: 'welle', pow: 40, acc: 100 }, welle2: { name: 'Sturzbach', kind: 'welle', pow: 65, acc: 95 }, welle3: { name: 'Springflut', kind: 'welle', pow: 90, acc: 85 },
  spross1: { name: 'Blattschnitt', kind: 'spross', pow: 40, acc: 100 }, spross2: { name: 'Rankenhieb', kind: 'spross', pow: 65, acc: 95 }, spross3: { name: 'Wurzelbruch', kind: 'spross', pow: 90, acc: 85 },
  funke1: { name: 'Knistern', kind: 'funke', pow: 40, acc: 100 }, funke2: { name: 'Lichtbogen', kind: 'funke', pow: 65, acc: 95 }, funke3: { name: 'Gewitter', kind: 'funke', pow: 90, acc: 85 },
  stein1: { name: 'Kieselwurf', kind: 'stein', pow: 40, acc: 100 }, stein2: { name: 'Steinschlag', kind: 'stein', pow: 65, acc: 90 }, stein3: { name: 'Bergsturz', kind: 'stein', pow: 90, acc: 80 },
  schatten1: { name: 'Zwielicht', kind: 'schatten', pow: 40, acc: 100 }, schatten2: { name: 'Nachtgriff', kind: 'schatten', pow: 65, acc: 95 }, schatten3: { name: 'Finsternis', kind: 'schatten', pow: 90, acc: 85 },
  wind1: { name: 'Windstoss', kind: 'wind', pow: 40, acc: 100 }, wind2: { name: 'Wirbel', kind: 'wind', pow: 65, acc: 95 }, wind3: { name: 'Orkan', kind: 'wind', pow: 90, acc: 85 },
};

// The creatures. look: the number its picture is drawn from; big: drawn a size larger (the grown ones).
// rare: how seldom it is met (1 common .. 3 rare); grows: [level, into].
export const SPECIES = [
  { id: 'glimmling', name: 'Glimmling', kind: 'glut', hp: 44, atk: 52, def: 43, spd: 62, look: 11, starter: true, grows: [14, 'lohrik'] },
  { id: 'lohrik', name: 'Lohrik', kind: 'glut', hp: 70, atk: 82, def: 64, spd: 84, look: 12, big: true, rare: 9 },
  { id: 'tropfel', name: 'Tropfel', kind: 'welle', hp: 50, atk: 46, def: 58, spd: 46, look: 21, starter: true, grows: [14, 'flutling'] },
  { id: 'flutling', name: 'Flutling', kind: 'welle', hp: 80, atk: 72, def: 88, spd: 62, look: 22, big: true, rare: 9 },
  { id: 'keimchen', name: 'Keimchen', kind: 'spross', hp: 48, atk: 49, def: 50, spd: 48, look: 31, starter: true, grows: [14, 'rankor'] },
  { id: 'rankor', name: 'Rankor', kind: 'spross', hp: 82, atk: 80, def: 78, spd: 60, look: 32, big: true, rare: 9 },
  { id: 'zischel', name: 'Zischel', kind: 'funke', hp: 36, atk: 50, def: 36, spd: 80, look: 41, rare: 1 },
  { id: 'blitzfloh', name: 'Blitzfloh', kind: 'funke', hp: 42, atk: 64, def: 40, spd: 96, look: 42, rare: 2, grows: [18, 'donnerbock'] },
  { id: 'donnerbock', name: 'Donnerbock', kind: 'funke', hp: 68, atk: 92, def: 60, spd: 108, look: 43, big: true, rare: 9 },
  { id: 'brockel', name: 'Brockel', kind: 'stein', hp: 54, atk: 60, def: 84, spd: 22, look: 51, rare: 1 },
  { id: 'kieselkauz', name: 'Kieselkauz', kind: 'stein', hp: 60, atk: 52, def: 70, spd: 44, look: 52, rare: 2 },
  { id: 'rostpanzer', name: 'Rostpanzer', kind: 'stein', hp: 78, atk: 84, def: 104, spd: 30, look: 53, big: true, rare: 3 },
  { id: 'dusterling', name: 'Dusterling', kind: 'schatten', hp: 40, atk: 58, def: 38, spd: 70, look: 61, rare: 2 },
  { id: 'schattmotte', name: 'Schattmotte', kind: 'schatten', hp: 52, atk: 70, def: 50, spd: 82, look: 62, rare: 2 },
  { id: 'torwicht', name: 'Torwicht', kind: 'schatten', hp: 74, atk: 96, def: 70, spd: 90, look: 63, big: true, rare: 3 },
  { id: 'boeling', name: 'Böling', kind: 'wind', hp: 40, atk: 44, def: 40, spd: 74, look: 71, rare: 1 },
  { id: 'wirbelwicht', name: 'Wirbelwicht', kind: 'wind', hp: 56, atk: 62, def: 52, spd: 92, look: 72, rare: 2 },
  { id: 'aschmaul', name: 'Aschmaul', kind: 'glut', hp: 58, atk: 74, def: 52, spd: 58, look: 13, rare: 2 },
  { id: 'quellnix', name: 'Quellnix', kind: 'welle', hp: 46, atk: 44, def: 48, spd: 66, look: 23, rare: 1 },
  { id: 'glasqualle', name: 'Glasqualle', kind: 'welle', hp: 66, atk: 58, def: 66, spd: 70, look: 24, rare: 2 },
  { id: 'moosbart', name: 'Moosbart', kind: 'spross', hp: 62, atk: 54, def: 66, spd: 34, look: 33, rare: 1 },
  { id: 'dornling', name: 'Dornling', kind: 'spross', hp: 50, atk: 72, def: 56, spd: 60, look: 34, rare: 2 },
  { id: 'irrlicht', name: 'Irrlicht', kind: 'funke', hp: 48, atk: 68, def: 44, spd: 88, look: 44, rare: 3 },
  { id: 'sturmrochen', name: 'Sturmrochen', kind: 'wind', hp: 72, atk: 80, def: 60, spd: 100, look: 73, big: true, rare: 3 },
];
export const byId = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// The places: what a dimension of each sort is made of, and which kinds live there (the first two most of all).
export const BIOMES = {
  wiese: { name: 'Wiese', ground: '#6fbf5a', ground2: '#63b150', grass: '#2f8f3d', grass2: '#3fa64b', path: '#d9c38a', water: '#3f8fd8', water2: '#69aee8', block: 'tree', kinds: ['spross', 'wind', 'funke', 'glut'] },
  wueste: { name: 'Wüste', ground: '#e3c77a', ground2: '#d9bb6c', grass: '#b58a3a', grass2: '#c79a47', path: '#f1e0a8', water: '#3fb3c8', water2: '#7fd3df', block: 'rock', kinds: ['glut', 'stein', 'wind', 'funke'] },
  schnee: { name: 'Schnee', ground: '#eef4fb', ground2: '#e0eaf5', grass: '#9fc0dc', grass2: '#b5d1e8', path: '#cfd9e6', water: '#5b9fd8', water2: '#8fc2ec', block: 'pine', kinds: ['welle', 'wind', 'stein', 'schatten'] },
  hoehle: { name: 'Höhle', ground: '#5d5568', ground2: '#544c5f', grass: '#3b3350', grass2: '#4a4163', path: '#857a8f', water: '#2c6a8a', water2: '#3f8aa8', block: 'rock', kinds: ['stein', 'schatten', 'funke', 'glut'] },
  kueste: { name: 'Küste', ground: '#f0e2ae', ground2: '#e6d69c', grass: '#58b08a', grass2: '#6cc29b', path: '#fff3cf', water: '#2f86d6', water2: '#5aa8ea', block: 'palm', kinds: ['welle', 'spross', 'wind', 'funke'] },
  stadt: { name: 'Stadt', ground: '#9aa0a8', ground2: '#8f959d', grass: '#5d8f55', grass2: '#6da564', path: '#c9cdd3', water: '#3f7fb8', water2: '#69a0d0', block: 'wall', kinds: ['funke', 'schatten', 'stein', 'wind'] },
  fremd: { name: 'Fremde', ground: '#7a4fa3', ground2: '#6f4696', grass: '#d14f9a', grass2: '#e169ad', path: '#b79be0', water: '#2fd0b0', water2: '#6fe6cf', block: 'crystal', kinds: ['schatten', 'funke', 'glut', 'welle'] },
};
// which place a world of the journey becomes in 2D, by what kind of place it is in 3D
export const BIOME_OF = { wilderness: 'wiese', city: 'stadt', interior: 'hoehle', ocean: 'kueste', bizarre: 'fremd', sky: 'schnee', alien: 'fremd', domestic: 'stadt' };
