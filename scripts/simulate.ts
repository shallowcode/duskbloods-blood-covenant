/**
 * Balance harness: plays full all-AI matches and reports win rates per hero
 * and per seat. Seat 0 is played by the AI too, and the match continues past
 * its elimination, so every seat is measured on equal terms.
 *
 *   npm run simulate -- [games=300] [difficulty=normal] [firstSeed=1]
 */
import { chooseAI } from '../src/game/ai.ts';
import { HEROES } from '../src/game/data.ts';
import { createGame, reduceGame } from '../src/game/engine.ts';
import type { Difficulty, State } from '../src/game/types.ts';

const games = Number(process.argv[2] ?? 300);
const difficulty = (process.argv[3] ?? 'normal') as Difficulty;
const firstSeed = Number(process.argv[4] ?? 1);

const heroWins: Record<string, number> = Object.fromEntries(
  HEROES.map((h) => [h.id, 0]),
);
const heroFinals: Record<string, number> = Object.fromEntries(
  HEROES.map((h) => [h.id, 0]),
);
const seatWins = [0, 0, 0, 0, 0, 0];
const seatFinals = [0, 0, 0, 0, 0, 0];
const actions: Record<string, number> = {};
let rounds = 0;
let judged = 0;
let maxSteps = 0;
const started = performance.now();
let decisions = 0;

for (let g = 0; g < games; g++) {
  const seed = firstSeed + g;
  // Rotate heroes through seats so hero and seat effects separate.
  let s: State = createGame(HEROES[seed % 6].id, difficulty, seed);
  s.spectate = true;
  let steps = 0;
  let finalists: number[] | null = null;
  while (!s.result && steps < 5000) {
    const action = chooseAI(s);
    decisions++;
    actions[action.type] = (actions[action.type] ?? 0) + 1;
    const next = reduceGame(s, action);
    if (next === s)
      throw new Error(`stalled seed ${seed} ${JSON.stringify(action)}`);
    s = next;
    if (!finalists && s.phase === 3)
      finalists = s.players.filter((p) => p.alive).map((p) => p.id);
    steps++;
  }
  if (!s.result) throw new Error(`no result for seed ${seed}`);
  maxSteps = Math.max(maxSteps, steps);
  rounds += s.round;
  if (s.result.reason.startsWith('长夜')) judged++;
  for (const id of finalists ?? []) {
    seatFinals[id]++;
    heroFinals[s.players[id].hero]++;
  }
  const w = s.result.winner;
  if (w !== null) {
    seatWins[w]++;
    heroWins[s.players[w].hero]++;
  }
}

const pct = (n: number) => `${((n / games) * 100).toFixed(1)}%`;
const ms = performance.now() - started;
console.log(
  `games ${games} · ${difficulty} · avg rounds ${(rounds / games).toFixed(2)} · judged ${pct(judged)} · max steps ${maxSteps}`,
);
console.log(
  `ai ${(ms / decisions).toFixed(2)} ms/decision · ${(ms / 1000).toFixed(1)} s total`,
);
console.log('hero   win     final');
for (const h of HEROES)
  console.log(
    `${h.id.padEnd(7)}${pct(heroWins[h.id]).padEnd(8)}${pct(heroFinals[h.id])}`,
  );
console.log('seat   win     final');
seatWins.forEach((w, i) =>
  console.log(`${String(i).padEnd(7)}${pct(w).padEnd(8)}${pct(seatFinals[i])}`),
);
console.log('actions', actions);
