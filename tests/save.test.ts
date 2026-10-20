import { describe, expect, it } from 'vitest';
import { chooseAI } from '../src/game/ai.ts';
import { createGame, reduceGame } from '../src/game/engine.ts';
import { canSkill } from '../src/game/rules.ts';
import { parseSave, serialize } from '../src/game/save.ts';
import type { State } from '../src/game/types.ts';

function midGame(): State {
  let s = createGame('lanh', 'tactical', 77);
  for (let i = 0; i < 200 && !s.result; i++) s = reduceGame(s, chooseAI(s));
  return s;
}

/** Recreate the shape v0.2 wrote to disk from a v2 state. */
function toV1(s: State) {
  const {
    matchId: _m,
    order: _o,
    starter: _st,
    lit,
    fx: _f,
    eliminated: _e,
    spectate: _sp,
    ...rest
  } = s;
  return {
    ...rest,
    version: 1,
    nextId: 105,
    explored: lit,
    skillUsed: s.skillUses > 0,
    players: s.players.map(({ moonstep: _ms, falls: _fa, ...p }) => p),
    log: [
      ...s.log,
      { text: '失去 2 功绩，在夜之馆重生。', round: s.round, type: 'normal' },
    ],
  };
}

describe('saves', () => {
  it('round-trips a match in progress', () => {
    const s = midGame();
    const loaded = parseSave(serialize(s));
    expect(loaded).toEqual({ ...s, fx: [] });
  });

  it('rejects malformed or tampered data', () => {
    const s = midGame();
    expect(parseSave('not json')).toBeNull();
    expect(parseSave('{}')).toBeNull();
    expect(parseSave(JSON.stringify({ ...s, version: 3 }))).toBeNull();
    const dup = JSON.parse(serialize(s));
    dup.deck.push(dup.deck[0]);
    expect(parseSave(JSON.stringify(dup))).toBeNull();
    const rich = JSON.parse(serialize(s));
    rich.players[0].blood = 99;
    expect(parseSave(JSON.stringify(rich))).toBeNull();
    const ap = JSON.parse(serialize(s));
    ap.ap = 9;
    expect(parseSave(JSON.stringify(ap))).toBeNull();
    const phase = JSON.parse(serialize(s));
    phase.phase = (phase.phase + 1) % 4;
    expect(parseSave(JSON.stringify(phase))).toBeNull();
  });

  it('migrates v0.2 saves and keeps playing', () => {
    const s = createGame('albert', 'tactical', 78);
    const spent = reduceGame(
      {
        ...s,
        players: s.players.map((p, i) => (i === 0 ? { ...p, blood: 9 } : p)),
      },
      {
        type: 'skill',
        target: -1,
      },
    );
    let loaded = parseSave(JSON.stringify(toV1(spent)));
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(2);
    expect(canSkill(loaded!)).toMatch('次数');
    expect(loaded!.log.at(-1)!.text).toBe('失去 2 美德，重生。');
    for (let i = 0; i < 100 && !loaded!.result; i++)
      loaded = reduceGame(loaded!, chooseAI(loaded!));
  });
});
