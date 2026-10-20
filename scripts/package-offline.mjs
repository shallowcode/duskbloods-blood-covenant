// Writes the offline index.html and launchers next to the built bundle.
// The page loads game.js as a classic script so it runs from file:// URLs.
import fs from 'node:fs';
import path from 'node:path';

const dir = 'offline';
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="description" content="黄昏血族六名角色的离线策略卡牌对战">
<title>黄昏血族 · 血誓牌局</title>
<link rel="icon" href="./favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="./game.css">
</head>
<body>
<div id="root"></div>
<noscript>请启用 JavaScript 以开始牌局。</noscript>
<script src="./game.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), html);

const launchers = {
  '启动游戏.command':
    '#!/bin/zsh\n# Double-click to play. No server, Node.js, or network required.\nGAME_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"\nopen "$GAME_DIR/index.html"\n',
  '启动游戏.bat': '@echo off\r\nstart "" "%~dp0index.html"\r\n',
  '启动游戏.sh':
    '#!/bin/sh\nGAME_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nxdg-open "$GAME_DIR/index.html"\n',
};
for (const [name, body] of Object.entries(launchers)) {
  fs.writeFileSync(path.join(dir, name), body);
  if (!name.endsWith('.bat')) fs.chmodSync(path.join(dir, name), 0o755);
}
fs.copyFileSync('README-玩家说明.md', path.join(dir, '开始游玩.md'));
console.log('Offline edition ready: offline/index.html');
