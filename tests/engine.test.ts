import { describe, expect, it } from 'vitest';
import { HEROES, RULES, hero } from '../src/game/data.ts';
import { createGame, reduceGame, startSpectating } from '../src/game/engine.ts';
import {
  canPlay,
  canPledge,
  canSkill,
  responses,
  skillCost,
  validTargets,
} from '../src/game/rules.ts';
import { FOE, type State } from '../src/game/types.ts';
import {
  checkInvariants,
  emptyHand,
  gameWith,
  give,
  setTurn,
  toFinal,
} from './helpers.ts';

const take = (s: State) => reduceGame(s, { type: 'respond' });

describe('setup', () => {
  it('seats six distinct heroes with the chosen one in seat 0', () => {
    const s = createGame('zork', 'normal', 1);
    expect(s.players[0].hero).toBe('zork');
    expect(new Set(s.players.map((p) => p.hero)).size).toBe(6);
    expect(s.players[0].hp).toBe(hero('zork').hp);
    expect(s.players[0].hand.length).toBe(RULES.startHand + RULES.early.draw);
    expect(s.players[1].hand.length).toBe(RULES.startHand);
    expect(s.players[0].blood).toBe(RULES.startBlood + RULES.early.blood);
    expect(s.ap).toBe(RULES.early.ap);
    checkInvariants(s);
  });

  it('shuffles opponent seats between matches', () => {
    const tables = new Set<string>();
    for (let seed = 1; seed <= 20; seed++)
      tables.add(
        createGame('albert', 'normal', seed)
          .players.map((p) => p.hero)
          .join(),
      );
    expect(tables.size).toBeGreaterThan(5);
  });

  it('is deterministic for a seed', () => {
    expect(createGame('lanh', 'normal', 42)).toEqual(
      createGame('lanh', 'normal', 42),
    );
  });
});

describe('cards and actions', () => {
  it('rejects illegal actions by returning the same state', () => {
    const s = gameWith('albert', 2);
    expect(reduceGame(s, { type: 'card', cardId: -1 })).toBe(s);
    const slash = give(s, 'slash');
    expect(reduceGame(s, { type: 'card', cardId: slash.id, target: 0 })).toBe(
      s,
    );
    expect(reduceGame(s, { type: 'card', cardId: slash.id })).toBe(s);
    expect(reduceGame(s, { type: 'respond' })).toBe(s);
  });

  it('a slash spends an action, opens a response window and deals damage when taken', () => {
    let s = gameWith('albert', 3);
    const slash = give(s, 'slash');
    s = reduceGame(s, { type: 'card', cardId: slash.id, target: 1 });
    expect(s.ap).toBe(2);
    expect(s.slashes).toBe(1);
    expect(s.pending).toMatchObject({ source: 0, target: 1, amount: 1 });
    const hp = s.players[1].hp;
    s = take(s);
    expect(s.players[1].hp).toBe(hp - 1);
    expect(s.pending).toBeNull();
    expect(canPlay(s, give(s, 'slash'))).toMatch('次数');
    checkInvariants(s);
  });

  it('a dodge cancels the attack', () => {
    let s = gameWith('albert', 4);
    const slash = give(s, 'slash');
    const dodge = give(s, 'dodge', 1);
    s = reduceGame(s, { type: 'card', cardId: slash.id, target: 1 });
    const hp = s.players[1].hp;
    s = reduceGame(s, { type: 'respond', cardId: dodge.id });
    expect(s.players[1].hp).toBe(hp);
    expect(s.pending).toBeNull();
  });

  it('howl also drains a blood from the attacker', () => {
    let s = gameWith('albert', 5);
    const fire = give(s, 'fire');
    const howl = give(s, 'howl', 3);
    s = reduceGame(s, { type: 'card', cardId: fire.id, target: 3 });
    const blood = s.players[0].blood;
    s = reduceGame(s, { type: 'respond', cardId: howl.id });
    expect(s.players[0].blood).toBe(blood - 1);
  });

  it('slash range follows seat distance; fire ignores it', () => {
    const s = gameWith('albert', 6);
    expect(validTargets(s, 'slash').sort((a, b) => a - b)).toEqual([FOE, 1, 5]);
    expect(validTargets(s, 'fire').length).toBe(6);
  });

  it('armor soaks damage first', () => {
    let s = gameWith('albert', 7);
    s.players[1].armor = 2;
    s = reduceGame(s, { type: 'card', cardId: give(s, 'duel').id, target: 1 });
    emptyHand(s, 1);
    const hp = s.players[1].hp;
    s = take(s);
    expect(s.players[1].armor).toBe(0);
    expect(s.players[1].hp).toBe(hp);
  });

  it('duels alternate slashes until someone cannot answer', () => {
    let s = gameWith('albert', 8);
    emptyHand(s, 0);
    emptyHand(s, 2);
    const duel = give(s, 'duel');
    const mine = give(s, 'slash', 0);
    const theirs = give(s, 'slash', 2);
    s = reduceGame(s, { type: 'card', cardId: duel.id, target: 2 });
    expect(s.pending).toMatchObject({ kind: 'duel', source: 0, target: 2 });
    s = reduceGame(s, { type: 'respond', cardId: theirs.id });
    expect(s.pending).toMatchObject({ kind: 'duel', source: 2, target: 0 });
    s = reduceGame(s, { type: 'respond', cardId: mine.id });
    expect(s.pending).toMatchObject({ source: 0, target: 2 });
    expect(responses(s)).toEqual([]);
    const hp = s.players[2].hp;
    s = take(s);
    expect(s.players[2].hp).toBe(hp - 2);
  });

  it('drains a blood the first time each turn a Bloodsworn is wounded', () => {
    let s = gameWith('albert', 14);
    emptyHand(s, 1);
    emptyHand(s, 2);
    const blood = s.players[0].blood;
    s = take(
      reduceGame(s, { type: 'card', cardId: give(s, 'fire').id, target: 1 }),
    );
    expect(s.players[0].blood).toBe(blood + RULES.drainBlood);
    s = take(
      reduceGame(s, { type: 'card', cardId: give(s, 'fire').id, target: 2 }),
    );
    expect(s.players[0].blood).toBe(blood + RULES.drainBlood);
  });

  it('alliances forbid attacks between allies and hold through the next round', () => {
    let s = gameWith('albert', 9);
    s = reduceGame(s, { type: 'card', cardId: give(s, 'oath').id, target: 1 });
    expect(s.players[0].ally).toBe(1);
    expect(s.players[1].ally).toBe(0);
    expect(s.players[0].allianceUntil).toBe(2);
    expect(validTargets(s, 'slash')).not.toContain(1);
    expect(validTargets(s, 'skill')).not.toContain(1);
  });

  it('hunting the foe grants its reward to the finishing blow', () => {
    let s = gameWith('layla', 10);
    s.foe.hp = 1;
    const virtue = s.players[0].virtue;
    s = reduceGame(s, {
      type: 'card',
      cardId: give(s, 'fire').id,
      target: FOE,
    });
    expect(s.players[0].virtue).toBe(virtue + 2);
    expect(s.foe.kind).toBe(1);
  });

  it('lamps can be lit once per turn and never in the final', () => {
    let s = gameWith('albert', 11);
    s = reduceGame(s, { type: 'lamp' });
    expect(s.players[0].virtue).toBe(1);
    expect(reduceGame(s, { type: 'lamp' })).toBe(s);
    toFinal(s, [0, 1, 2]);
    expect(reduceGame(s, { type: 'lamp' })).toBe(s);
  });
});

describe('blood pledge pillar', () => {
  it('opens in round 3, costs more when occupied and echoes for its holder', () => {
    let s = gameWith('albert', 12);
    expect(canPledge(s)).toMatch('第 3 轮');
    s.round = 3;
    s.phase = 1;
    s = reduceGame(s, { type: 'pledge' });
    expect(s.pillar).toBe(0);
    expect(s.players[0].virtue).toBe(RULES.pledgeVirtue);

    setTurn(s, 1);
    s.players[1].blood = 5;
    s = reduceGame(s, { type: 'pledge' });
    expect(s.pillar).toBe(1);
    expect(s.players[1].blood).toBe(5 - RULES.pledgeCost - 1);

    // Seat 1 keeps the pillar until its next turn begins: the echo pays out.
    const virtue = s.players[1].virtue;
    s.order = [1];
    s.turn = 1;
    s.round = 3;
    s.players.forEach((p) => (p.alive = p.id === 1 || p.id === 2));
    s.order = [2, 1];
    s.turn = 2;
    s = reduceGame(s, { type: 'end' });
    expect(s.turn).toBe(1);
    expect(s.players[1].virtue).toBe(virtue + RULES.pillarEcho);
  });

  it('can only be overwritten by players whose virtue does not exceed the holder', () => {
    const s = gameWith('albert', 15);
    s.round = 3;
    s.phase = 1;
    s.pillar = 2;
    s.players[2].virtue = 4;
    s.players[0].virtue = 5;
    expect(canPledge(s)).toMatch('美德高于');
    s.players[0].virtue = 4;
    expect(canPledge(s)).toBeNull();
  });

  it('cannot be overwritten by an ally of the holder', () => {
    let s = gameWith('albert', 13);
    s.round = 3;
    s.phase = 1;
    s = reduceGame(s, { type: 'card', cardId: give(s, 'oath').id, target: 1 });
    s.pillar = 1;
    expect(canPledge(s)).toMatch('盟友');
  });
});

describe('heroes', () => {
  it('every hero skill resolves and costs its blood', () => {
    for (const h of HEROES) {
      let s = createGame(h.id, 'normal', 20);
      s.players[0].blood = 9;
      const cost = skillCost(s.players[0]);
      expect(canSkill(s)).toBeNull();
      s = reduceGame(s, { type: 'skill', target: FOE });
      expect(s.skillUses).toBe(1);
      expect(s.players[0].blood).toBeLessThanOrEqual(9 - cost + 3);
      expect(canSkill(s)).toMatch('次数');
      checkInvariants(s);
    }
  });

  it('Zork rockets through armor', () => {
    let s = gameWith('zork', 21);
    s.players[1].armor = 3;
    s.players[0].blood = 5;
    s = reduceGame(s, { type: 'skill', target: 1 });
    expect(s.pending?.ignoreArmor).toBe(true);
    const hp = s.players[1].hp;
    s = take(s);
    expect(s.players[1].hp).toBe(hp - 2);
    expect(s.players[1].armor).toBe(3);
  });

  it('Albert strikes harder at players whose virtue is not below his', () => {
    let s = gameWith('albert', 22);
    s.players[0].blood = 9;
    s.players[0].virtue = 5;
    s.players[1].virtue = 2;
    s = reduceGame(s, { type: 'skill', target: 1 });
    expect(s.pending?.amount).toBe(1);
    s = take(s);
    s.skillUses = 0;
    s.players[2].virtue = 9;
    s = reduceGame(s, { type: 'skill', target: 2 });
    expect(s.pending?.amount).toBe(2);
    const virtue = s.players[0].virtue;
    s = take(s);
    expect(s.players[0].virtue).toBe(virtue + 1); // 起义者
  });

  it('Jan pays health for a three-damage blow and heals it back on a hit', () => {
    let s = gameWith('jan', 23);
    s.players[0].blood = 5;
    const hp = s.players[0].hp;
    s = reduceGame(s, { type: 'skill', target: 1 });
    expect(s.players[0].hp).toBe(hp - 1);
    expect(s.pending?.amount).toBe(3);
    s = take(s);
    expect(s.players[0].hp).toBe(hp);
    s.players[0].hp = 1;
    s.skillUses = 0;
    expect(canSkill(s)).toMatch('体力');
  });

  it('Lanh may answer with a slash once per round, and her veil softens a hit', () => {
    let s = gameWith('lanh', 24);
    emptyHand(s, 0);
    give(s, 'slash', 0);
    give(s, 'slash', 0);
    s.players[0].veil = true;
    setTurn(s, 1);
    s = reduceGame(s, {
      type: 'card',
      cardId: give(s, 'fire', 1).id,
      target: 0,
    });
    expect(responses(s).length).toBe(2);
    s = reduceGame(s, { type: 'respond', cardId: responses(s)[0].id });
    expect(s.players[0].moonstep).toBe(true);
    s = reduceGame(s, {
      type: 'card',
      cardId: give(s, 'duel', 1).id,
      target: 0,
    });
    // Duels always accept a slash, but ordinary attacks no longer do this round.
    s = reduceGame(s, { type: 'respond' });
    expect(s.players[0].veil).toBe(false);
    expect(s.players[0].hp).toBe(4 - 1);
  });

  it('Samir counters with a stronger slash after defending', () => {
    let s = gameWith('samir', 25);
    setTurn(s, 1);
    s = reduceGame(s, {
      type: 'card',
      cardId: give(s, 'fire', 1).id,
      target: 0,
    });
    s = reduceGame(s, { type: 'respond', cardId: give(s, 'dodge', 0).id });
    expect(s.players[0].counter).toBe(true);
    setTurn(s, 0);
    s = reduceGame(s, {
      type: 'card',
      cardId: give(s, 'slash').id,
      target: FOE,
    });
    expect(s.foe.hp).toBe(3 - 2);
  });

  it('Layla regenerates a point of health when her turn begins', () => {
    let s = gameWith('layla', 26);
    s.players[0].hp = 1;
    s.order = s.players.map((p) => p.id);
    s.turn = 5;
    s = reduceGame(s, { type: 'end' });
    expect(s.round).toBe(2);
    // Round 2 starts with seat 1; play around to seat 0.
    while (s.turn !== 0) s = reduceGame(s, { type: 'end' });
    expect(s.players[0].hp).toBeGreaterThanOrEqual(2);
  });
});

describe('defeat, cuts and the final', () => {
  it('a pre-final defeat respawns the victim and rewards the attacker and sigil', () => {
    let s = gameWith('zork', 30);
    const victim = s.players[0].sigil;
    s.players[victim].hp = 1;
    s.players[victim].virtue = 4;
    emptyHand(s, victim);
    s.players[0].blood = 6;
    s = reduceGame(s, { type: 'skill', target: victim });
    s = take(s);
    expect(s.players[victim].hp).toBe(s.players[victim].maxHp);
    expect(s.players[victim].virtue).toBe(4 - RULES.deathPenalty);
    expect(s.players[0].virtue).toBe(RULES.killVirtue + RULES.sigilVirtue);
    expect(s.players[0].sigilDone).toBe(true);
    expect(s.players[0].maxHp).toBe(hero('zork').hp + 1);
  });

  it('orders each round by virtue, leader first, ties on a rotating ring', () => {
    let s = gameWith('albert', 31);
    s.players[4].virtue = 5;
    s.players[2].virtue = 3;
    for (let i = 0; i < 6; i++) s = reduceGame(s, { type: 'end' });
    expect(s.round).toBe(2);
    // Lamps and events may shift virtue, so compare against the live values.
    const v = s.players.map((p) => p.virtue);
    for (let i = 1; i < s.order.length; i++)
      expect(v[s.order[i - 1]]).toBeGreaterThanOrEqual(v[s.order[i]]);
    expect(s.order[0]).toBe(4);
    expect(s.starter).toBe(4);
    expect(s.turn).toBe(4);
    // With everyone level, round 2 begins its tie ring at seat 2.
    const t = gameWith('albert', 32);
    for (let i = 0; i < 6; i++) t.players[i].virtue = 0;
    let u = t;
    for (let i = 0; i < 6; i++) u = reduceGame(u, { type: 'end' });
    const tied = u.order.filter((id) => u.players[id].virtue === 0);
    expect(tied).toEqual(
      [...tied].sort((a, b) => ((a - 2 + 6) % 6) - ((b - 2 + 6) % 6)),
    );
  });

  it('cuts the table at round 5 and enters the final at round 7', () => {
    let s = gameWith('albert', 32);
    s.players.forEach((p, i) => (p.virtue = 30 - i * 4));
    while (s.round < 5) s = reduceGame(s, { type: 'end' });
    expect(s.players.filter((p) => p.alive).length).toBe(5);
    expect(s.players[5].alive).toBe(false);
    s.players.forEach((p, i) => (p.virtue = 30 - i * 4));
    while (s.round < 7 && !s.result) s = reduceGame(s, { type: 'end' });
    expect(s.phase).toBe(3);
    expect(s.players.filter((p) => p.alive).map((p) => p.id)).toEqual([
      0, 1, 2,
    ]);
    for (const p of s.players.filter((x) => x.alive)) {
      expect(p.lives).toBe(2);
      expect(p.hp).toBe(p.maxHp);
      expect(p.ally).toBeNull();
    }
    expect(s.pillar).toBeNull();
    expect(s.ap).toBe(RULES.final.ap);
    checkInvariants(s);
  });

  it('a human below the cut line loses, and spectating plays on to a winner', () => {
    let s = gameWith('albert', 33);
    s.players.forEach((p, i) => (p.virtue = i * 3));
    while (!s.result) s = reduceGame(s, { type: 'end' });
    expect(s.round).toBe(5);
    expect(s.result).toMatchObject({ winner: null });
    s = startSpectating(s);
    expect(s.result).toBeNull();
    expect(s.spectate).toBe(true);
    let guard = 0;
    while (!s.result && guard++ < 2000) s = reduceGame(s, { type: 'end' });
    expect(s.result?.winner).not.toBeNull();
  });

  it('two lives in the final, then elimination and victory', () => {
    let s = gameWith('zork', 34);
    toFinal(s, [0, 1]);
    s.players[0].blood = 9;
    s.players[1].hp = 1;
    emptyHand(s, 1);
    s = take(reduceGame(s, { type: 'skill', target: 1 }));
    expect(s.players[1].lives).toBe(1);
    expect(s.players[1].alive).toBe(true);
    s.players[1].hp = 1;
    s = take(reduceGame(s, { type: 'skill', target: 1 }));
    expect(s.players[1].alive).toBe(false);
    expect(s.result?.winner).toBe(0);
  });

  it('final turns grant two skills and two base slashes', () => {
    let s = gameWith('albert', 35);
    toFinal(s, [0, 1, 2]);
    s.players[0].blood = 9;
    s = take(reduceGame(s, { type: 'skill', target: 1 }));
    expect(canSkill(s)).toBeNull();
    s = take(reduceGame(s, { type: 'skill', target: 2 }));
    expect(canSkill(s)).toMatch('次数');
    s.slashes = 1;
    expect(canPlay(s, give(s, 'slash'))).toBeNull();
    s.slashes = 2;
    expect(canPlay(s, give(s, 'slash'))).toMatch('次数');
  });

  it('the night ends with a judgement if the final drags on', () => {
    let s = gameWith('zork', 36);
    toFinal(s, [0, 1, 2]);
    s.round = RULES.lastRound - 1;
    let guard = 0;
    while (!s.result && guard++ < 10) s = reduceGame(s, { type: 'end' });
    expect(s.result?.reason).toMatch('长夜');
  });
});
