/* Dependency-light smoke test for the authoritative TypeScript core.
 * Requires TypeScript (npm install), or KYN_TSC_PATH set to a global TS path.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require(process.env.KYN_TSC_PATH || 'typescript');
require.extensions['.ts'] = function (mod, filename) {
  const raw = fs.readFileSync(filename, 'utf8');
  const js = ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  mod._compile(js, filename);
};
const root = path.resolve(__dirname, '../src');
const { Simulation } = require(path.join(root, 'sim/Simulation.ts'));
const { damageEnemy, damagePlayer } = require(path.join(root, 'sim/CombatSystem.ts'));
const { addEnemy } = require(path.join(root, 'sim/EntityRegistry.ts'));
const { validateContent } = require(path.join(root, 'content/validateContent.ts'));
const { migrateSave } = require(path.join(root, 'sim/SaveSystem.ts'));
const idle = { x: 0, y: 0, dash: false, q: false, f: false };
assert.deepEqual(validateContent(), []);
const sim = new Simulation(1234);
for (let i = 0; i < 500; i++) sim.step(1 / 60, idle);
assert(sim.state.time > 8 && sim.state.enemies.length > 0);
sim.forcePause(); const elapsed = sim.state.time;
for (let i = 0; i < 10; i++) sim.step(1 / 60, idle);
assert.equal(elapsed, sim.state.time);
const s = new Simulation(4);
const enemy = addEnemy(s.state, { kind: 'pursuer', x: 1100, y: 790, hp: 10, maxHp: 10, speed: 20, radius: 17, damage: 5, touchCooldown: 0 });
damageEnemy(s.state, enemy, 25);
assert.equal(s.state.pickups.length, 1);
assert.equal(s.state.kills, 1);
assert.equal(damagePlayer(s.state, 30), true);
assert.equal(damagePlayer(s.state, 30), false);
assert.equal(migrateSave({ settings: { mute: true } }).settings.mute, true);
const a = new Simulation(71), b = new Simulation(71);
for (let i = 0; i < 240; i++) { a.step(1 / 60, idle); b.step(1 / 60, idle); }
assert.deepEqual(a.state.enemies, b.state.enemies);
console.log('B00 core smoke: 8 groups of checks PASSED');
