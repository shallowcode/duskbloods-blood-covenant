# Validation record

- TypeScript compilation: passed.
- Vinext production build and static prerender: passed.
- Standalone offline build: passed; classic IIFE and ordinary stylesheet load from file URLs without a server.
- Engine: 12 test groups including 600 seeded complete matches. Every simulation terminated within 247 actions; checked card conservation (105 unique cards), valid health/resources, save round-trips, skill costs, armor, responses, alliances, revival, final lives, victory, and pledge replacement.
- Offline package check: six authentic official large artworks, all referenced portrait/environment files, launch scripts, JavaScript syntax, no remote code/style/font/image dependencies, no dynamic module imports.
- macOS and Linux launcher syntax: checked.
- Official artwork identity and composition: visually inspected as source image files.
- At initial delivery, no browser interaction or screenshot QA had been performed (subsequent typography QA is recorded below). The local preview route compiled and returned HTTP 200; production prerender also completed.
- Optional WebMCP read interface is feature-detected. No supported WebMCP validation context was available, so registration/execution in a supporting browser is not claimed as verified.

## Typography repair — 2026-09-06

- Reproduced the reported card subtitle/footer collision in the real browser.
- Replaced absolute footer positioning with content-sized grid rows; labels no longer share space.
- Verified all 13 card types at 390px and 1440px viewport widths: title/subtitle/footer bounding boxes do not intersect; footers remain inside cards; no card text overflows.
- Also checked the 695px working viewport, long character names, action panels, skill controls, battlefield heading, and mobile rule/character archive dialogs.
- Captured and visually inspected browser screenshots of the repaired layouts.
- Production build, TypeScript check and offline packaging checks pass. No game-engine rules changed in this repair.

## 2026-09-06 — 美德与最终三人补给

统一美德用语，简化重生提示，兼容旧存档日志。最终阶段入场补给 3 牌/3 血晶，每回合 5 行动/4 牌/2 血晶，技能上限 2 次，基础血袭 2 次，留牌 max(5, hp+2)。玩家和 AI 共用规则。

验证：TypeScript、Web 与离线构建通过；600 个种子对局均正常结束（424 局进入决战，最多 257 步）；四组新增检查覆盖补给、六角色两次技能及存档/重置、血袭与留牌上限、旧存档迁移。离线包校验通过。

## v0.2.0 platform release packaging

Windows and macOS ZIP integrity, embedded game bundle identity, Windows ASCII launcher/CRLF content, and archived macOS executable permission verified. Both are offline browser editions, not native executables. Windows execution has not been tested on a Windows host.
