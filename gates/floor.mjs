// Floor gate: installs the lowest engine version the declared peer range admits, runs the three
// gates that need no device against it, and puts the dev version back whichever way they went.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ENGINE = '@altpsyche/engine';
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const range = manifest.peerDependencies?.[ENGINE];
if (!range) throw new Error(`package.json declares no ${ENGINE} peer range`);

// A caret, tilde or lower-bounded range admits nothing below the version it names, so that version is the floor.
const match = /^(?:\^|~|>=)?\s*(\d+\.\d+\.\d+)$/.exec(range.trim());
if (!match) throw new Error(`peer range ${range} is not one this gate reads a floor out of`);
const floor = match[1];

const installed = () => JSON.parse(readFileSync(`node_modules/${ENGINE}/package.json`, 'utf8')).version;
const npm = (...args) => spawnSync('npm', args, { stdio: 'inherit' }).status === 0;
const devVersion = installed();

// Registry check first: an exact version npm cannot find fails here rather than leaving the dev version in place.
const view = spawnSync('npm', ['view', `${ENGINE}@${floor}`, 'version', '--json'], { encoding: 'utf8' });
if (view.status !== 0 || ![JSON.parse(view.stdout)].flat().includes(floor)) throw new Error(`${ENGINE}@${floor} is the floor of ${range} and the registry does not carry it`);

const results = [];
try {
  if (!npm('install', '--no-save', `${ENGINE}@${floor}`)) throw new Error(`installing ${ENGINE}@${floor} failed`);
  if (installed() !== floor) throw new Error(`${ENGINE} reads ${installed()} after installing ${floor}`);
  console.log(`\n${ENGINE} ${floor} installed, the floor of ${range}`);
  for (const script of ['test', 'type-check', 'build']) results.push([script, npm('run', script)]);
} finally {
  npm('install', '--no-save', `${ENGINE}@${devVersion}`);
  console.log(`\n${ENGINE} ${installed()} restored, against ${devVersion} before the run`);
}

for (const [script, passed] of results) console.log(`${passed ? 'pass' : 'FAIL'}  npm run ${script} at ${floor}`);
const failed = results.length < 3 || results.some(([, passed]) => !passed) || installed() !== devVersion;
process.exit(failed ? 1 : 0);
