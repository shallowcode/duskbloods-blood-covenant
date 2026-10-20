// Sanity checks for the offline package: it must run from file:// with no
// network, so no module scripts, split chunks or remote resources.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = 'offline';
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const css = read('game.css');
const js = read('game.js');

assert(
  !html.includes('type="module"'),
  'index.html must load a classic script for file://',
);
assert(
  !/<(?:script|link)[^>]+(?:src|href)="https?:/i.test(html),
  'no external code or styles',
);
new vm.Script(js, { filename: 'game.js' });
assert(!/\bimport\(/.test(js), 'no split chunks');
assert(!/url\(["']?https?:/.test(css), 'no external image or font dependency');
assert(css.length < 200_000, 'stylesheet should not inline large images');

for (const file of [
  'game.js',
  'game.css',
  'favicon.svg',
  '启动游戏.command',
  '启动游戏.bat',
  '启动游戏.sh',
  '开始游玩.md',
])
  assert(fs.existsSync(path.join(root, file)), `missing ${file}`);
assert(
  fs.statSync(path.join(root, '启动游戏.command')).mode & 0o111,
  'macOS launcher must be executable',
);

const manifest = JSON.parse(
  fs.readFileSync('public/media/sources.json', 'utf8'),
);
for (const asset of manifest.assets)
  assert(
    fs.existsSync(path.join(root, 'media', asset.filename)),
    asset.filename,
  );
assert.equal(
  manifest.assets.filter((a) => a.kind === 'character_artwork').length,
  6,
);

// Every relative media path referenced by the bundle must exist.
for (const [, file] of `${js}\n${css}`.matchAll(
  /media\/([\w.-]+\.(?:png|jpg))/g,
))
  assert(
    fs.existsSync(path.join(root, 'media', file)),
    `bundle references missing media/${file}`,
  );

console.log(
  `PASS offline package: classic IIFE (${(js.length / 1024).toFixed(0)} KB), stylesheet ${(css.length / 1024).toFixed(0)} KB, no remote dependencies, 6 official artworks, launchers present.`,
);
