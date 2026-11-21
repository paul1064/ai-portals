// Writes version.json: a short fingerprint of every script and style sheet a visit loads apart from the worlds themselves.
// The page reads it on every visit, uncached (the small script in index.html), and fetches afresh the files whose
// fingerprint has changed since this visitor was last here. Without it a returning visitor flies on a mix of old and
// new files for as long as the host lets the browser keep each one (ten minutes on GitHub Pages).
// Usage: node tools/stamp.mjs      (npm run stamp; run it before every push that changes anything under src/)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = {};
const walk = (dir) => {
  for (const name of fs.readdirSync(path.join(root, dir)).sort()) {
    const rel = dir + '/' + name, st = fs.statSync(path.join(root, rel));
    if (st.isDirectory()) { if (rel !== 'src/parts' && rel !== 'src/worlds') walk(rel); continue; }
    if (/\.(js|css)$/.test(name)) files[rel] = crypto.createHash('sha1').update(fs.readFileSync(path.join(root, rel))).digest('hex').slice(0, 10);
  }
};
walk('src');
// of the worlds only the list of them and the hall a visit opens in: the worlds' own files do not change
for (const rel of ['src/worlds/index.js', 'src/worlds/_antechamber.js']) files[rel] = crypto.createHash('sha1').update(fs.readFileSync(path.join(root, rel))).digest('hex').slice(0, 10);
const build = crypto.createHash('sha1').update(JSON.stringify(files)).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ build, files }, null, 1) + '\n');
console.log('version.json: build ' + build + ', ' + Object.keys(files).length + ' files');
