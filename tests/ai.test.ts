import { describe, expect, it } from 'vitest';
import {
  chooseAI,
  describeAction,
  legalActions,
  suggest,
} from '../src/game/ai.ts';
import { HEROES } from '../src/game/data.ts';
import { cloneState, createGame, reduceGame } from '../src/game/engine.ts';
import { actorOf } from '../src/game/rules.ts';
import type { Difficulty, State } from '../src/game/types.ts';
import { checkInvariants, give, setTurn } from './helpers.ts';

describe('legal actions', () => {
  it('every listed action is accepted by the engine', () => {
    for (let seed = 1; seed <= 25; seed++) {
      let s = createGame(HEROES[seed % 6].id, 'normal', seed);
      s.spectate = true;
      for (let step = 0; step < 60 && !s.result; step++) {
        for (const a of legalActions(s))
          expect(reduceGame(s, a), JSON.stringify(a)).not.toBe(s);
        s = reduceGame(s, chooseAI(s));
      }
    }
  });
});

describe('AI behaviour', () => {
  it('finishes off a foe it can kill', () => {
    const s = createGame('layla', 'tactical', 3);
    setTurn(s, 0);
    s.foe.hp = 1;
    s.players[0].hand = [];
    give(s, 'fire');
    const a = chooseAI(s);
    expect(a).toMatchObject({ type: 'card', target: -1 });
  });

  it('dodges a lethal hit', () => {
    let s = createGame('albert', 'tactical', 4);
    s.players[2].hp = 1;
    s.players[2].hand = [];
    const dodge = give(s, 'dodge', 2);
    s = reduceGame(s, { type: 'card', cardId: give(s, 'fire').id, target: 2 });
    expect(chooseAI(s)).toEqual({ type: 'respond', cardId: dodge.id });
  });

  it('never looks at the human hand', () => {
    // Two worlds that differ only in which hidden cards the human holds.
    const a = createGame('samir', 'tactical', 5);
    for (let i = 0; i < 6; i++) setTurn(a, 3);
    const b = cloneState(a);
    const human = b.players[0];
    const swap = b.deck.splice(0, human.hand.length, ...human.hand);
    human.hand = swap;
    expect(b.players[0].hand).not.toEqual(a.players[0].hand);
    for (let k = 0; k < 3; k++) {
      a.serial = b.serial = k;
      expect(chooseAI(b)).toEqual(chooseAI(a));
    }
  });

  it('offers the human a hint only on the human move', () => {
    const s = createGame('zork', 'normal', 6);
    const hint = suggest(s);
    expect(hint).not.toBeNull();
    expect(describeAction(s, hint!.action)).toBeTypeOf('string');
    setTurn(s, 2);
    expect(suggest(s)).toBeNull();
  });
});

function playOut(
  seed: number,
  difficulty: Difficulty,
): { state: State; steps: number } {
  let s = createGame(HEROES[seed % 6].id, difficulty, seed);
  s.spectate = true;
  let steps = 0;
  while (!s.result && steps < 3000) {
    const actor = actorOf(s);
    const next = reduceGame(s, chooseAI(s));
    expect(next, `stalled seed ${seed} actor ${actor}`).not.toBe(s);
    s = next;
    checkInvariants(s);
    steps++;
  }
  return { state: s, steps };
}

describe('complete matches', () => {
  it('120 seeded matches across difficulties stay legal and terminate', () => {
    const difficulties: Difficulty[] = ['novice', 'normal', 'tactical'];
    let finals = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const { state, steps } = playOut(seed, difficulties[seed % 3]);
      expect(state.result).not.toBeNull();
      expect(state.result!.winner).not.toBeNull();
      expect(steps).toBeLessThan(800);
      if (state.phase === 3) finals++;
    }
    expect(finals).toBeGreaterThan(100);
  });
});
