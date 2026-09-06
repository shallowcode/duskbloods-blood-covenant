# 黄昏血族 · 血誓牌局

基于 The Duskbloods 网络测试六名角色的非官方单人策略卡牌游戏。一名玩家对战五名 AI，包含美德竞逐、狩猎、同盟、血誓和最终三人决战。

## 下载游玩

在本仓库 **Releases** 下载对应平台 ZIP，完整解压后运行：

- **Windows**：双击 `Start-Game.bat` 或 `启动游戏.bat`。
- **macOS**：双击 `Start-Game.command` 或 `启动游戏.command`。
- 两个平台也都可以直接双击 `index.html`。

游戏使用默认浏览器离线运行，无需安装、Node.js 或服务器。请保留完整文件夹。更新前可从暂停菜单导出存档，再在新版导入。

完整玩法见 [玩家说明](README-玩家说明.md)。

## v0.2.0

- 统一使用“美德”，简化重生提示，修复手牌文字重叠及窄屏排版。
- 三人决战入场补给 3 张牌与 3 血晶。
- 决战每回合 5 行动点、摸 4 张牌、获得 2 血晶；技能 2 次，基础血袭 2 次。
- 决战留牌上限为体力 +2，至少 5 张；兼容旧存档。

## 本地开发与打包

安装 Node.js 22.13+，运行：

```sh
npm ci
npm run dev
npm test
npm run build:local
node scripts/verify-package.mjs
python3 scripts/package-release.py
```

离线产物位于 `offline/`；Windows 和 macOS 发布包及 SHA-256 校验值位于 `releases/`。两个平台共享同一离线游戏，仅启动脚本和说明不同。

## 素材与权利

本项目为非官方同人改编，与 FromSoftware 无隶属关系。角色、世界观及原作美术属于相应权利方，©2026 FromSoftware, Inc.。美术取自官方网络测试网站，来源见 [素材清单](public/media/sources.json)。本仓库不授予原作素材的再许可；中文名称与桌游规则为本作改编。
