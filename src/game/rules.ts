import { CARDS, EVENT, RULES, hero } from './data.ts';
import {
  FOE,
  type Card,
  type CardType,
  type Player,
  type Seat,
  type State,
} from './types.ts';

/** Phase index for a round: 0–1–2 grow and compete, 3 is the final duel. */
export function phaseOfRound(round: number): number {
  if (round <= 2) return 0;
  if (round <= 4) return 1;
  if (round < RULES.finalRound) return 2;
  return 3;
}

export const isFinal = (s: State) => s.phase === 3;
const limits = (s: State) => (isFinal(s) ? RULES.final : RULES.early);

/** Who must act next: the responder to a pending attack, else the turn player. */
export function actorOf(s: State): Seat {
  return s.pending ? s.pending.target : s.turn;
}

export const alivePlayers = (s: State) => s.players.filter((p) => p.alive);

/** Seats sit in a ring; distance is the shorter way round among the living. */
export function distance(s: State, a: Seat, b: Seat): number {
  const ring = alivePlayers(s).map((p) => p.id);
  const d = Math.abs(ring.indexOf(a) - ring.indexOf(b));
  return Math.min(d, ring.length - d);
}

export function attackRange(s: State, p: Player): number {
  if (s.event === EVENT.ash) return Infinity;
  return hero(p.hero).range + (p.weapon ? 1 : 0);
}

export function isAlly(s: State, a: Seat, b: Seat): boolean {
  const p = s.players[a];
  return !isFinal(s) && p.ally === b && p.allianceUntil >= s.round;
}

export const turnAP = (s: State) => limits(s).ap;
export const skillLimit = (s: State) => limits(s).skills;
export const slashLimit = (s: State, p: Player) =>
  limits(s).slashes + (p.weapon ? 1 : 0);
export const skillCost = (p: Player) =>
  Math.max(1, hero(p.hero).cost - (p.level >= 2 ? 1 : 0));

export function handLimit(s: State, p: Player): number {
  return isFinal(s) ? Math.max(5, p.hp + 2) : Math.max(3, p.hp);
}

export function slashDamage(s: State, p: Player): number {
  let dmg = 1;
  if (p.counter) dmg++;
  if (p.level >= 1) dmg++;
  if (s.event === EVENT.bloodMoon) dmg++;
  return dmg;
}

/** Blood-moon frenzy: late in the final every attack on a Bloodsworn hits harder. */
export const frenzy = (s: State) => isFinal(s) && s.round >= RULES.frenzyRound;

/** Cost in blood to claim the blood pledge pillar. */
export function pledgeCost(s: State): number {
  return RULES.pledgeCost + (s.pillar === null ? 0 : 1);
}

/** Legal targets for a card type or the hero skill, for the turn player. */
export function validTargets(s: State, kind: CardType | 'skill'): number[] {
  const me = s.players[s.turn];
  const others = s.players.filter((t) => t.alive && t.id !== me.id);
  let result: number[];
  switch (kind) {
    case 'oath':
      if (isFinal(s)) return [];
      result = others.filter((t) => !isAlly(s, me.id, t.id)).map((t) => t.id);
      break;
    case 'steal':
      result = others
        .filter(
          (t) => !isAlly(s, me.id, t.id) && (t.hand.length > 0 || t.blood > 0),
        )
        .map((t) => t.id);
      break;
    case 'slash':
      result = others
        .filter(
          (t) =>
            !isAlly(s, me.id, t.id) &&
            distance(s, me.id, t.id) <= attackRange(s, me),
        )
        .map((t) => t.id);
      break;
    case 'fire':
    case 'duel':
    case 'skill':
      result = others.filter((t) => !isAlly(s, me.id, t.id)).map((t) => t.id);
      break;
    default:
      return [];
  }
  if (!isFinal(s) && (kind === 'slash' || kind === 'fire' || kind === 'skill'))
    result.push(FOE);
  return result;
}

const mainPhaseBlock = (s: State): string | null => {
  if (s.result) return '对局已经结束';
  if (s.pending) return '请先响应攻击';
  if (s.ap <= 0) return '行动点已耗尽';
  return null;
};

/** Why a card cannot be played now, or null if it can. */
export function canPlay(s: State, card: Card): string | null {
  const block = mainPhaseBlock(s);
  if (block) return block;
  const p = s.players[s.turn];
  const data = CARDS[card.type];
  if (data.reaction) return '仅在受到攻击时打出';
  if (card.type === 'slash' && s.slashes >= slashLimit(s, p))
    return '本回合血袭次数已用完';
  if (card.type === 'heal' && p.hp >= p.maxHp) return '体力已满';
  if (card.type === 'weapon' && p.weapon) return '已装备武器';
  if (card.type === 'armor' && p.armor >= RULES.maxArmor) return '护甲已满';
  if (card.type === 'oath' && isFinal(s)) return '最终阶段不能结盟';
  if (data.target && validTargets(s, card.type).length === 0)
    return '没有合法目标';
  return null;
}

export function canSkill(s: State): string | null {
  const block = mainPhaseBlock(s);
  if (block) return block;
  const p = s.players[s.turn];
  if (s.skillUses >= skillLimit(s)) return '本回合技能次数已用完';
  if (p.blood < skillCost(p)) return `需要 ${skillCost(p)} 血晶`;
  if (p.hero === 'jan' && p.hp <= 1) return '体力为 1 时不可发动';
  return null;
}

export function canLamp(s: State): string | null {
  const block = mainPhaseBlock(s);
  if (block) return block;
  if (isFinal(s)) return '月血已至，灯火熄灭';
  if (s.lit) return '本回合已点过灯';
  return null;
}

export function canPledge(s: State): string | null {
  const block = mainPhaseBlock(s);
  if (block) return block;
  if (s.phase === 0) return '血誓之柱将在第 3 轮开启';
  if (isFinal(s)) return '月血已至，誓言消散';
  const p = s.players[s.turn];
  if (s.pledged) return '本回合已立誓';
  if (s.pillar === p.id) return '你已持有血誓';
  if (s.pillar !== null && isAlly(s, p.id, s.pillar))
    return '不能覆写盟友的血誓';
  if (s.pillar !== null && p.virtue > s.players[s.pillar].virtue)
    return '美德高于持誓者，无法覆写';
  if (p.blood < pledgeCost(s)) return `需要 ${pledgeCost(s)} 血晶`;
  return null;
}

export function canUpgrade(s: State): string | null {
  const block = mainPhaseBlock(s);
  if (block) return block;
  const p = s.players[s.turn];
  if (p.level >= 2) return '血脉已完全觉醒';
  if (s.upgraded) return '本回合已强化';
  if (p.blood < RULES.upgradeCost) return `需要 ${RULES.upgradeCost} 血晶`;
  return null;
}

/** Cards the pending target may answer with. */
export function responses(s: State): Card[] {
  const pending = s.pending;
  if (!pending) return [];
  const p = s.players[pending.target];
  if (pending.kind === 'duel') return p.hand.filter((c) => c.type === 'slash');
  return p.hand.filter(
    (c) =>
      c.type === 'dodge' ||
      c.type === 'howl' ||
      (p.hero === 'lanh' && !p.moonstep && c.type === 'slash'),
  );
}

/** Standing order used for cuts and the leaderboard. Ties: hp, blood, kills, seat. */
export function compareStanding(a: Player, b: Player): number {
  return (
    b.virtue - a.virtue ||
    b.hp - a.hp ||
    b.blood - a.blood ||
    b.kills - a.kills ||
    a.id - b.id
  );
}

export function ranking(s: State): Player[] {
  const out = s.eliminated.map((id) => s.players[id]).reverse();
  const alive = alivePlayers(s).sort(compareStanding);
  return [...alive, ...out.filter((p) => !p.alive)];
}

/** The next cut still ahead of the table, if any. */
export function upcomingCut(s: State): { round: number; keep: number } | null {
  return RULES.cuts.find((c) => c.round > s.round) ?? null;
}

/** Extra max HP granted on entering the final, earned through virtue. */
export const finalHpBonus = (p: Player) =>
  Math.min(2, Math.floor(p.virtue / 10));

/** HP a finalist returns with after spending a life. */
export const respawnHp = (p: Player) =>
  Math.min(p.maxHp, Math.ceil(p.maxHp / 2) + 1);

/** Final-round scoring used if the night runs out. */
export const judgeScore = (p: Player) => p.lives * 20 + p.hp + p.virtue;
