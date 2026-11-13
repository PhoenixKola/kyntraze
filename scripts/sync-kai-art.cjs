// Copies each Kai direction's manifest + sheets byte-for-byte from the art tree into public/art/kai/<dir>/ (manifest paths stay relative).
// Usage: node scripts/sync-kai-art.cjs        (idempotent; prints a sha256 line per file)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const base = path.join(__dirname, '..', 'art', 'characters', 'kai', 'base');
const SRC = { south: path.join(base, 'production-south-candidate'), north: path.join(base, 'production-other-directions-candidate', 'north'),
  east: path.join(base, 'production-other-directions-candidate', 'east'), west: path.join(base, 'production-other-directions-candidate', 'west') };
for (const [dir, root] of Object.entries(SRC)) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'sheets', 'manifest.json'), 'utf8'));
  const files = ['sheets/manifest.json', ...Object.values(manifest.animations).map(a => a.sheet)];
  for (const f of files) {
    const out = path.join(__dirname, '..', 'public', 'art', 'kai', dir, f === 'sheets/manifest.json' ? 'manifest.json' : f);
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.copyFileSync(path.join(root, f), out);
    console.log(dir, f, crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex').slice(0, 12));
  }
}
