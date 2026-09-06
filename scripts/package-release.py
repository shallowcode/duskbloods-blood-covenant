"""Package the built offline game for Windows and macOS (Python 3)."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
output = root / 'releases'
output.mkdir(exist_ok=True)
checksums = []
for platform, launcher in [('Windows', '启动游戏.bat'), ('macOS', '启动游戏.command')]:
    name = f'Duskbloods-Blood-Covenant-v{version}-{platform}'
    stage = output / name
    if stage.exists():
        shutil.rmtree(stage)
    shutil.copytree(root / 'offline', stage)
    for candidate in ['启动游戏.bat', '启动游戏.command', '启动游戏.sh']:
        if candidate != launcher:
            (stage / candidate).unlink()
    alias = 'Start-Game.bat' if platform == 'Windows' else 'Start-Game.command'
    shutil.copy2(stage / launcher, stage / alias)
    instructions = (
        f'黄昏血族 · 血誓牌局 v{version} — {platform}\n\n'
        '1. 请先将 ZIP 完整解压到普通文件夹，不要在压缩包内直接运行。\n'
        f'2. 双击 {alias} 或 {launcher}，使用系统默认浏览器游玩。\n'
        '3. 也可直接双击 index.html；请保留同目录的 game.js、game.css 和 media。\n\n'
        '这是免安装的本地 Web 游戏，不需要 Node.js、服务器或联网。\n'
        '建议使用支持现代 JavaScript 的 Edge、Chrome、Firefox 或 Safari。\n'
        '更新前可在暂停菜单导出存档，新版本内导入即可继续。\n'
        '完整规则见「开始游玩.md」及游戏内「血誓档案」。\n'
    )
    (stage / 'README.txt').write_text(instructions, encoding='utf-8-sig')
    archive = output / f'{name}.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for file in sorted(stage.rglob('*')):
            if file.is_file():
                z.write(file, Path(name) / file.relative_to(stage))
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert z.read(f'{name}/game.js') == (root / 'offline/game.js').read_bytes()
        assert z.read(f'{name}/game.css') == (root / 'offline/game.css').read_bytes()
        if platform == 'Windows':
            assert z.read(f'{name}/{alias}') == b'@echo off\r\nstart "" "%~dp0index.html"\r\n'
        else:
            assert (z.getinfo(f'{name}/{alias}').external_attr >> 16) & 0o111
    checksums.append(f'{hashlib.sha256(archive.read_bytes()).hexdigest()}  {archive.name}')
(output / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n')
print('\n'.join(checksums))
