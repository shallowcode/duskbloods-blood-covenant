# Validation record

## v1.0.0 — 2026-10-20 · Rework

### Why the rules changed: measurements on v0.2

All-AI self-play on the v0.2 engine (3,000 matches, seat 0 played by the same AI as everyone else, match continued past seat 0's elimination):

| Problem | Measurement |
| --- | --- |
| Hero imbalance | Trang Lanh won 32.8%, Zork 20.9%, Samir 19.4%, Jan 12.6%, Albert 8.0%, Layla 6.3% (fair share 16.7%) |
| The human's seat was structurally handicapped | Seat 0 won **1.7%**; it was cut at round 5 in 30.5% of matches versus 8–22% for other seats. It always acted first, and overwriting the pillar stripped the previous holder's virtue, rewarding whoever acted after it |
| No decision in the economy | Lighting a lamp was free and taken almost every turn |
| AI | Fixed priority script; always dodged when it could |

### What was measured on v1.0.0

`npm run simulate` (seat 0 also played by the AI; opponents seated randomly; chosen hero rotated):

| Hero | Win, normal AI (1,800 matches) | Win, tactical AI (900 matches) |
| --- | --- | --- |
| Albert | 18.8% | 14.2% |
| Bloodhand Jan | 13.9% | 15.9% |
| Trang Lanh | 19.5% | 18.1% |
| Sniper Layla | 14.6% | 19.8% |
| Senator Samir | 16.3% | 17.1% |
| Zork | 16.9% | 14.9% |

Seat win rates: 14.1–18.8% (normal), 15.1–18.6% (tactical). Seat 0, the human's seat, won 18.8% and 18.6%. Standard error is about ±0.9 points at 1,800 matches and ±1.25 at 900. Hero arcs differ by design: Albert reaches the final most often (≈ 60–68%) but converts least, while Lanh reaches it least (≈ 40%) but converts best.

Match length: 11.0 rounds on average under normal AI. 3–4% of matches reach the round-14 judgement under normal AI, 0.1% under tactical. The longest match was 356 actions.

Difficulty ladder (seat 0 played at the listed level, the other five at normal, 900 matches each):

| Seat 0 plays | Wins | Reaches final |
| --- | --- | --- |
| 深谋 tactical (plans the whole turn) | 29.2% | 68.2% |
| 标准 normal | 18.0% | 52.3% |
| 新血 novice | 10.3% | 32.9% |

On v0.2, by comparison, the two settings differed only in target choice. The hint button uses the tactical searcher.

Early-game interaction (rounds 1–6, 300 matches, normal AI): 25.1 damage between Bloodsworn, 3.2 knockdowns, and 10.9 pledges per match. Before draining blood, the pillar catch-up rule and virtue order were added, the same measurement on the intermediate v1 engine gave 12.3 damage, 1.3 knockdowns and 20.6 pledges: the early game was mostly "light, pledge, end".

Balance changes were made one lever at a time, each followed by a 1,200–1,800 match run. The levers were draining blood, the pillar catch-up rule, virtue-ordered turns, the final-phase pacing (respawn at half HP + 1, frenzy for all attacks), and per-hero numbers. The seat-order rule was chosen by experiment: clockwise rotation left seats 1–2 at about 20.5% and seat 0 at 12.8%; ordering by virtue flattened that.

### Automated checks

- `npm test` (Vitest): 40 tests.
  - Engine rules: setup, illegal-action rejection, slash, dodge, howl, range, armor, duel exchange, alliances, hunting, lamps, drain, the pillar's cost, echo, catch-up and ally rules, all six skills and passives, respawn and sigil, virtue turn order, both cuts, the final transition, lives and victory, the round-14 judgement, human elimination, and spectating.
  - AI: every listed legal action is accepted, it finishes a killable foe, it dodges a lethal hit, it gives a hint only on the human's move, and its choice is identical when the human's hidden hand is swapped for other cards (it never peeks).
  - Complete matches: 120 seeded matches across all three difficulties, checking invariants after every action (card conservation 105/105 with unique ids, HP/blood/armor/AP bounds, no stalls), each ending with a winner.
  - Saves: round-trip, rejection of tampered data (duplicate card, blood 99, AP 9, phase/round mismatch), and migration of a v0.2 save that then keeps playing.
- `npm run lint`: oxlint with type-aware and React Compiler rules, 0 findings.
- `npm run typecheck`: strict TypeScript, 0 errors.
- `npm run build` runs the typecheck, the Vite IIFE build, packaging, and `verify-package.mjs`. The package check confirms a classic script (no module, no dynamic import), no remote URLs, a stylesheet under 200 KB, all six official artworks, every media file the bundle references, and the launchers with their executable bits.
- `python3 scripts/package-release.py`: the Windows and macOS ZIPs pass `testzip`, the embedded bundle bytes match, the Windows launcher is CRLF, and the macOS launcher is executable. SHA-256 sums were written.

### Browser QA (Chromium via Playwright, from `file://`)

- Viewports: 1920×1080, 1440×900, 1366×768, 1024×768, 390×844. The match screen fits each desktop viewport without page scroll. The mobile layout scrolls the board and keeps the hand and toolbar fixed.
- Passive full matches (the human only ends turns and takes hits) at 1440×900 and 390×844. Both ran through the round 3/5/7 overlays, the cut, the result screen, spectating, the final and frenzy, and a winner.
- Hint-driven full matches through the UI (press H, then click the hinted card, target or tool, and answer attacks with response cards) as Albert at 1440×900 and Trang Lanh at 390×844, both to a result.
- Zero console errors or page errors across all runs. One crash was found during this QA and fixed: the result dialog read a null result after "spectate" was pressed.
- Screenshots of every screen were inspected.

### Not verified

- Real Windows or macOS hosts. The launchers are verified as files inside the ZIPs only.
- Screen readers. Native `<dialog>`, ARIA pressed states and labelled stats are in place, but no assistive-technology pass was run.
- Sound, which is synthesized with Web Audio. It was not checked by ear in headless Chromium.
- Hero balance under human play. The tables above are AI self-play.

---

## Earlier records (v0.2.0 and before)

### Typography repair — 2026-09-06

Reproduced and fixed a card subtitle/footer collision. All 13 card types were checked at 390 px and 1440 px.

### 2026-09-06 — 美德与最终三人补给

Unified the 美德 terminology and added the final supply rules (3 cards and 3 blood on entry; 5 actions, 4 cards and 2 blood per turn). 600 seeded matches all ended (424 reached the final; the longest was 257 actions).

### v0.2.0 platform release packaging

Windows and macOS ZIP integrity was verified. Both are offline browser editions, not native executables.
