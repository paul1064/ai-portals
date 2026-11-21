// A world's dimension code: two letters and three digits from its id, the same on every visit. (A file of its own, so the
// page can read a code out of a link, ?dim=, without loading the gun.)
export function dimCode(id) {
  let h = 2166136261; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h >>>= 0; const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return A[h % 24] + A[Math.floor(h / 24) % 24] + '-' + String(Math.floor(h / 576) % 1000).padStart(3, '0');
}
// the world a code names, or undefined ('kx204' and 'KX-204' are the same code)
export function worldOfCode(code, defs) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 5) return undefined;
  return defs.find((d) => dimCode(d.id).replace('-', '') === c);
}
