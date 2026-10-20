import { CARDS, FOES, hero } from './data.ts';
import { cloneState, pname, reduceGame } from './engine.ts';
import {
  actorOf,
  canLamp,
  canPlay,
  canPledge,
  canSkill,
  canUpgrade,
  handLimit,
  isFinal,
  responses,
  upcomingCut,
  validTargets,
} from './rules.ts';
import {
  FOE,
  type Action,
  type Card,
  type CardType,
  type Difficulty,
  type Player,
  type Seat,
  type State,
} from './types.ts';

/**
 * The AI is a one-ply searcher over determinized worlds: hidden information
 * (the deck order and every hand but its own) is reshuffled before each
 * simulation, so it never profits from cards it could not know about.
 * Each candidate action is played out, pending responses are settled with a
 * cheap policy, and the result is scored by `evaluate`.
 */

interface Profile {
  /** Determinized worlds averaged per candidate action. */
  samples: number;
  /** Uniform noise added to each candidate score. */
  noise: number;
  /** Play out the rest of the own turn greedily before scoring. */
  rollout: boolean;
}

const PROFILES: Record<Difficulty, Profile> = {
  novice: { samples: 1, noise: 30, rollout: false },
  normal: { samples: 2, noise: 3, rollout: false },
  tactical: { samples: 2, noise: 0, rollout: true },
};

// ------------------------------------------------------------ action lists

/** Every legal action for whoever must act. Cards are deduplicated by type. */
export function legalActions(s: State): Action[] {
  if (s.result) return [];
  if (s.pending) {
    const seen = new Set<CardType>();
    const out: Action[] = [{ type: 'respond' }];
    for (const c of responses(s)) {
      if (seen.has(c.type)) continue;
      seen.add(c.type);
      out.push({ type: 'respond', cardId: c.id });
    }
    return out;
  }
  const out: Action[] = [{ type: 'end' }];
  const p = s.players[s.turn];
  const seen = new Set<CardType>();
  for (const c of p.hand) {
    if (seen.has(c.type) || canPlay(s, c)) continue;
    seen.add(c.type);
    if (CARDS[c.type].target) {
      for (const t of validTargets(s, c.type))
        out.push({ type: 'card', cardId: c.id, target: t });
    } else {
      out.push({ type: 'card', cardId: c.id });
    }
  }
  if (!canSkill(s))
    for (const t of validTargets(s, 'skill'))
      out.push({ type: 'skill', target: t });
  if (!canLamp(s)) out.push({ type: 'lamp' });
  if (!canPledge(s)) out.push({ type: 'pledge' });
  if (!canUpgrade(s)) out.push({ type: 'upgrade' });
  return out;
}

// --------------------------------------------------------------- rollouts

function makeRng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/** Reshuffle everything `me` cannot see, keeping every hand size intact. */
function determinize(s: State, me: Seat, rnd: () => number): State {
  const d = cloneState(s);
  d.spectate = true; // a fallen human must not end the imagined game
  const hidden = d.players.filter((p) => p.id !== me);
  const pool: Card[] = [...d.deck];
  for (const p of hidden) pool.push(...p.hand);
  // Canonical order first: the sampled world depends only on which cards are
  // hidden, never on where they actually sit.
  pool.sort((x, y) => x.id - y.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const p of hidden) p.hand = pool.splice(0, p.hand.length);
  d.deck = pool;
  d.seed = Math.floor(rnd() * 4294967296);
  return d;
}

/** Cheap response policy used inside simulations and by the novice AI. */
export function quickResponse(s: State): Action {
  const pending = s.pending!;
  const options = responses(s);
  if (!options.length) return { type: 'respond' };
  const p = s.players[pending.target];
  if (pending.kind === 'duel')
    return { type: 'respond', cardId: options[0].id };
  const soaked = pending.ignoreArmor ? 0 : Math.min(p.armor, pending.amount);
  const through = pending.amount - soaked;
  if (through <= 0) return { type: 'respond' };
  const lethal = through >= p.hp;
  const worthIt =
    lethal || isFinal(s) || through >= 2 || p.hp <= 2 || options.length >= 2;
  if (!worthIt) return { type: 'respond' };
  const attacker = s.players[pending.source];
  const pick =
    options.find((c) => c.type === 'howl' && attacker.blood > 0) ??
    options.find((c) => c.type === 'dodge') ??
    options[0];
  return { type: 'respond', cardId: pick.id };
}

function settle(s: State): State {
  for (let i = 0; i < 12 && s.pending && !s.result; i++) {
    const next = reduceGame(s, quickResponse(s));
    if (next === s) break;
    s = next;
  }
  return s;
}

// -------------------------------------------------------------- evaluation

const DEFENSIVE: ReadonlySet<CardType> = new Set(['dodge', 'howl', 'heal']);

function handScore(s: State, p: Player, perCard: number): number {
  const keep = handLimit(s, p) + 1;
  let score = 0;
  let counted = 0;
  for (const c of p.hand) {
    if (counted >= keep) {
      score += 0.4;
      continue;
    }
    counted++;
    score +=
      perCard +
      (DEFENSIVE.has(c.type) ? 1.2 : 0) +
      (p.hero === 'lanh' && c.type === 'slash' ? 1 : 0);
  }
  return score;
}

function strength(s: State, p: Player): number {
  if (!p.alive) return -400;
  if (isFinal(s)) {
    return (
      p.lives * 70 +
      p.hp * 10 +
      (p.hp <= 2 ? -8 : 0) +
      p.armor * 7 +
      handScore(s, p, 2.5) +
      p.blood * 1.6 +
      (p.weapon ? 5 : 0) +
      p.level * 5
    );
  }
  // A respawn refills health, so falls are charged explicitly or the
  // searcher would happily die to get its health back.
  return (
    p.virtue * 10 -
    p.falls * 18 +
    p.hp * 2.6 +
    (p.hp <= 1 ? -9 : p.hp <= 2 ? -4 : 0) +
    p.armor * 2.6 +
    handScore(s, p, 3) +
    p.blood * 2.2 +
    (p.weapon ? 4 : 0) +
    (p.kin ? 3 : 0) +
    p.level * 7 +
    (s.pillar === p.id ? 9 : 0)
  );
}

/** Position value from `me`'s point of view. */
export function evaluate(s: State, me: Seat): number {
  if (s.result) {
    if (s.result.winner === me) return 10000;
    if (s.result.winner !== null) return -10000;
  }
  const self = s.players[me];
  if (!self.alive) return -10000 + s.round;
  const others = s.players
    .filter((p) => p.id !== me && p.alive)
    .map((p) => strength(s, p));
  const mine = strength(s, self);
  if (!others.length) return mine;
  const best = Math.max(...others);
  const mean = others.reduce((a, b) => a + b, 0) / others.length;
  let value = mine - 0.45 * best - 0.55 * mean;

  // Before a cut, standing relative to the cut line matters more than raw virtue.
  const cut = upcomingCut(s);
  if (cut && !isFinal(s)) {
    const rivals = s.players
      .filter((p) => p.alive && p.id !== me)
      .map((p) => p.virtue)
      .sort((a, b) => b - a);
    const line = rivals[cut.keep - 1] ?? 0;
    const margin = Math.max(-6, Math.min(6, self.virtue - line));
    const urgency = cut.round - s.round <= 2 ? 6 : 3;
    value += margin * urgency;
  }
  return value;
}

/** Credit for chipping the foe this action (the last hit takes the reward). */
function huntCredit(s: State, me: Seat): number {
  let credit = 0;
  for (const f of s.fx)
    if (f.t === 'damage' && f.who === FOE && f.source === me)
      credit += f.amount * 2.2;
  return credit;
}

/** Apply an action and settle any responses it provokes. Null if illegal. */
function step(
  s: State,
  action: Action,
  me: Seat,
): { state: State; credit: number } | null {
  const next = reduceGame(s, action);
  if (next === s) return null;
  return { state: settle(next), credit: huntCredit(next, me) };
}

/**
 * Greedy continuation of `me`'s own turn: keep taking the best single action
 * while it improves on stopping here. Lets the searcher see combos such as
 * equipping a weapon before a second slash, or chipping the foe before the kill.
 */
function rolloutTurn(s: State, me: Seat): number {
  let credit = 0;
  for (let depth = 0; depth < 8; depth++) {
    if (s.result || s.pending || s.turn !== me) break;
    let best: { state: State; credit: number } | null = null;
    let bestValue = evaluate(s, me);
    for (const a of legalActions(s)) {
      if (a.type === 'end') continue;
      const next = step(s, a, me);
      if (!next) continue;
      const value = evaluate(next.state, me) + next.credit;
      if (value > bestValue) {
        bestValue = value;
        best = next;
      }
    }
    if (!best) break;
    s = best.state;
    credit += best.credit;
  }
  return evaluate(s, me) + credit;
}

function scoreAction(
  s: State,
  action: Action,
  me: Seat,
  profile: Profile,
  rnd: () => number,
): number {
  let total = 0;
  for (let i = 0; i < profile.samples; i++) {
    const world = determinize(s, me, rnd);
    // Ending the turn is scored as the position we stop in, so it compares
    // like-for-like with lines that keep acting and stop later.
    if (action.type === 'end') {
      total += evaluate(world, me);
      continue;
    }
    const next = step(world, action, me);
    if (!next) return -Infinity;
    const mine = !next.state.pending && next.state.turn === me;
    total +=
      profile.rollout && mine
        ? rolloutTurn(next.state, me) + next.credit
        : evaluate(next.state, me) + next.credit;
  }
  return total / profile.samples + (rnd() - 0.5) * profile.noise;
}

export interface Scored {
  action: Action;
  score: number;
}

/** Rank every legal action for the actor (best first). */
export function rankActions(
  s: State,
  difficulty: Difficulty = s.difficulty,
): Scored[] {
  const me = actorOf(s);
  const profile = PROFILES[difficulty];
  const rnd = makeRng(s.seed ^ Math.imul(s.serial + 1, 2654435761) ^ (me * 97));
  return legalActions(s)
    .map((action) => ({
      action,
      score: scoreAction(s, action, me, profile, rnd),
    }))
    .sort((a, b) => b.score - a.score);
}

export function chooseAI(s: State): Action {
  if (s.result) return { type: 'end' };
  if (s.pending && s.difficulty === 'novice') return quickResponse(s);
  const ranked = rankActions(s);
  return ranked[0]?.action ?? { type: 'end' };
}

/** Best move for the human, using the strongest profile. */
export function suggest(s: State): Scored | null {
  if (s.result || actorOf(s) !== 0) return null;
  return rankActions(s, 'tactical')[0] ?? null;
}

// ------------------------------------------------------------ descriptions

function targetName(s: State, target: number | undefined): string {
  if (target === undefined) return '';
  return target === FOE ? FOES[s.foe.kind].name : pname(s, target);
}

/** Human-readable phrasing of an action, used by hints and AI banners. */
export function describeAction(s: State, a: Action): string {
  const p = s.players[actorOf(s)];
  switch (a.type) {
    case 'end':
      return '结束回合';
    case 'lamp':
      return '点燃遗骸之灯';
    case 'pledge':
      return '在血誓之柱立誓';
    case 'upgrade':
      return `强化血脉至 ${p.level + 1} 级`;
    case 'skill':
      return `对${targetName(s, a.target)}发动「${hero(p.hero).skill}」`;
    case 'respond': {
      if (a.cardId === undefined) return '承受伤害';
      const c = p.hand.find((x) => x.id === a.cardId);
      return c ? `打出「${CARDS[c.type].name}」响应` : '响应';
    }
    case 'card': {
      const c = p.hand.find((x) => x.id === a.cardId);
      if (!c) return '出牌';
      const name = `「${CARDS[c.type].name}」`;
      return a.target === undefined
        ? `使用${name}`
        : `对${targetName(s, a.target)}打出${name}`;
    }
  }
}
