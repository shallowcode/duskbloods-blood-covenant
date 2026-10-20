import { expect } from 'vitest';
import { DECK_SIZE, RULES } from '../src/game/data.ts';
import { createGame } from '../src/game/engine.ts';
import type { Card, CardType, HeroId, State } from '../src/game/types.ts';

/** A fresh match where seat `seat` holds `hero` (seat 0 is always the chosen hero). */
export function gameWith(hero: HeroId = 'albert', seed = 1): State {
  return createGame(hero, 'normal', seed);
}


/** Move one card of `type` into a player's hand from wherever it is. */
export function give(s: State, type: CardType, seat = 0): Card {
  for (const pile of [s.deck, s.discard, ...s.players.map((p) => p.hand)]) {
    if (pile === s.players[seat].hand) continue;
    const i = pile.findIndex((c) => c.type === type);
    if (i >= 0) {
      const [card] = pile.splice(i, 1);
      s.players[seat].hand.push(card);
      return card;
    }
  }
  throw new Error(`no ${type} left to give`);
}

/** Strip every card from a hand into the discard pile. */
export function emptyHand(s: State, seat: number) {
  s.discard.push(...s.players[seat].hand.splice(0));
}

/** Make `seat` the turn player with fresh turn resources. */
export function setTurn(s: State, seat: number) {
  s.turn = seat;
  if (!s.order.includes(seat)) s.order = [...s.order, seat];
  s.ap = s.phase === 3 ? RULES.final.ap : RULES.early.ap;
  s.slashes = 0;
  s.skillUses = 0;
  s.lit = false;
  s.pledged = false;
  s.upgraded = false;
  s.bonusUsed = false;
  s.drained = false;
}

/** Jump straight into the final with the given seats alive. */
export function toFinal(s: State, alive: number[]) {
  s.round = RULES.finalRound;
  s.phase = 3;
  s.pillar = null;
  for (const p of s.players) {
    p.alive = alive.includes(p.id);
    p.ally = null;
    p.allianceUntil = 0;
  }
  s.eliminated = s.players.filter((p) => !p.alive).map((p) => p.id);
  s.order = alive.slice();
  setTurn(s, alive[0]);
}

export function checkInvariants(s: State) {
  const cards = [...s.deck, ...s.discard, ...s.players.flatMap((p) => p.hand)];
  expect(cards.length).toBe(DECK_SIZE);
  expect(new Set(cards.map((c) => c.id)).size).toBe(DECK_SIZE);
  const lim = s.phase === 3 ? RULES.final : RULES.early;
  expect(s.ap).toBeGreaterThanOrEqual(0);
  expect(s.ap).toBeLessThanOrEqual(lim.ap);
  for (const p of s.players) {
    expect(p.hp).toBeGreaterThanOrEqual(0);
    expect(p.hp).toBeLessThanOrEqual(p.maxHp);
    if (p.alive) expect(p.hp).toBeGreaterThan(0);
    expect(p.blood).toBeGreaterThanOrEqual(0);
    expect(p.blood).toBeLessThanOrEqual(RULES.maxBlood);
    expect(p.virtue).toBeGreaterThanOrEqual(0);
    expect(p.armor).toBeGreaterThanOrEqual(0);
    expect(p.armor).toBeLessThanOrEqual(RULES.maxArmor);
  }
}
