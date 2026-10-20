import { CARDS, DECK_SIZE, EVENTS, FOES, HEROES, RULES } from './data.ts';
import { phaseOfRound } from './rules.ts';
import type {
  Card,
  Difficulty,
  LogEntry,
  Pending,
  Player,
  State,
} from './types.ts';

/**
 * Save files are untrusted input: validate every field and the card
 * conservation invariant before handing a state to the engine.
 * Version 1 saves (v0.2.x) are migrated forward.
 */

const SUITS = ['♠', '♥', '♣', '♦'];
const DIFFICULTIES: Difficulty[] = ['novice', 'normal', 'tactical'];
const LOG_TYPES: LogEntry['type'][] = [
  'normal',
  'turn',
  'phase',
  'gain',
  'damage',
  'skill',
];
const PLAYER_FLAGS = [
  'weapon',
  'kin',
  'alive',
  'revenge',
  'counter',
  'veil',
  'moonstep',
  'sigilDone',
] as const;
const STATE_FLAGS = [
  'lit',
  'pledged',
  'upgraded',
  'bonusUsed',
  'drained',
  'spectate',
] as const;

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const seat = (v: unknown): v is number => int(v, 0, RULES.seats - 1);

function migrateV1(s: Raw): Raw | null {
  if (!Array.isArray(s.players)) return null;
  const turn = s.turn as number;
  const players: Raw[] = (s.players as Raw[]).map((p) => ({
    ...p,
    moonstep: false,
    falls: 0,
  }));
  const alive = players.filter((p) => p.alive).map((p) => p.id as number);
  const pending = isObject(s.pending)
    ? { ...s.pending, kind: s.pending.kind === 'duel' ? 'duel' : 'attack' }
    : null;
  return {
    ...s,
    version: 2,
    matchId: s.seed,
    players,
    // v1 always started rounds at seat 0; continue that round in seat order.
    order: alive,
    starter: 0,
    skillUses: s.skillUses ?? (s.skillUsed ? 1 : 0),
    lit: s.explored ?? false,
    drained: false,
    difficulty: s.difficulty === 'tactical' ? 'tactical' : 'normal',
    eliminated: players.filter((p) => !p.alive).map((p) => p.id),
    spectate: false,
    fx: [],
    pending,
    turn,
    log: Array.isArray(s.log)
      ? (s.log as Raw[]).map((e) => ({
          ...e,
          text: String(e.text)
            .replace(/功绩|功迹/g, '美德')
            .replace(/在夜之馆重生/g, '重生'),
          type: LOG_TYPES.includes(e.type as LogEntry['type'])
            ? e.type
            : 'normal',
        }))
      : [],
  };
}

function validPlayer(p: unknown, i: number): p is Player {
  if (!isObject(p)) return false;
  if (
    p.id !== i ||
    !HEROES.some((h) => h.id === p.hero) ||
    !Array.isArray(p.hand)
  )
    return false;
  if (!int(p.maxHp, 1, 12) || !int(p.hp, 0, p.maxHp)) return false;
  if (
    !int(p.blood, 0, RULES.maxBlood) ||
    !int(p.virtue, 0, 10000) ||
    !int(p.armor, 0, RULES.maxArmor)
  )
    return false;
  if (
    !int(p.level, 0, 2) ||
    !int(p.lives, 0, RULES.final.lives) ||
    !int(p.kills, 0, 10000) ||
    !int(p.falls, 0, 10000)
  )
    return false;
  if (!seat(p.sigil) || !int(p.allianceUntil, 0, RULES.lastRound + 1))
    return false;
  if (!(p.ally === null || seat(p.ally))) return false;
  return PLAYER_FLAGS.every((k) => typeof p[k] === 'boolean');
}

function validCard(c: unknown): c is Card {
  return (
    isObject(c) &&
    typeof c.type === 'string' &&
    c.type in CARDS &&
    int(c.id, 0, DECK_SIZE - 1) &&
    SUITS.includes(c.suit as string) &&
    typeof c.rank === 'string'
  );
}

function validPending(p: unknown): p is Pending {
  return (
    isObject(p) &&
    (p.kind === 'attack' || p.kind === 'duel') &&
    seat(p.source) &&
    seat(p.target) &&
    p.source !== p.target &&
    int(p.amount, 1, 20) &&
    typeof p.label === 'string' &&
    typeof p.ignoreArmor === 'boolean'
  );
}

export function parseSave(raw: string): State | null {
  let s: unknown;
  try {
    s = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(s)) return null;
  if (s.version === 1) {
    const migrated = migrateV1(s);
    if (!migrated) return null;
    s = migrated;
  }
  if (!isObject(s) || s.version !== 2) return null;

  if (!Array.isArray(s.players) || s.players.length !== RULES.seats)
    return null;
  if (!s.players.every(validPlayer)) return null;
  const players = s.players as Player[];
  if (new Set(players.map((p) => p.hero)).size !== RULES.seats) return null;

  if (!int(s.round, 1, RULES.lastRound) || s.phase !== phaseOfRound(s.round))
    return null;
  if (
    !seat(s.turn) ||
    !seat(s.starter) ||
    !int(s.seed, 0, 4294967295) ||
    !int(s.matchId, 0, 4294967295) ||
    !int(s.serial, 0, 1e7)
  )
    return null;
  if (
    !Array.isArray(s.order) ||
    !s.order.every(seat) ||
    !s.order.includes(s.turn)
  )
    return null;
  const final = s.phase === 3;
  const lim = final ? RULES.final : RULES.early;
  if (
    !int(s.ap, 0, lim.ap) ||
    !int(s.skillUses, 0, lim.skills) ||
    !int(s.slashes, 0, lim.slashes + 1)
  )
    return null;
  if (!int(s.event, 0, EVENTS.length - 1)) return null;
  if (!isObject(s.foe) || !int(s.foe.kind, 0, FOES.length - 1)) return null;
  if (!int(s.foe.hp, 1, FOES[s.foe.kind as number].hp)) return null;
  if (!(s.pillar === null || seat(s.pillar))) return null;
  if (!DIFFICULTIES.includes(s.difficulty as Difficulty)) return null;
  if (!STATE_FLAGS.every((k) => typeof (s as Raw)[k] === 'boolean'))
    return null;
  if (!Array.isArray(s.eliminated) || !s.eliminated.every(seat)) return null;
  if (!players[s.turn as number].alive && !s.result) return null;

  if (!Array.isArray(s.log)) return null;
  for (const e of s.log) {
    if (
      !isObject(e) ||
      typeof e.text !== 'string' ||
      !int(e.round, 1, RULES.lastRound)
    )
      return null;
    if (!LOG_TYPES.includes(e.type as LogEntry['type'])) return null;
  }

  if (!Array.isArray(s.deck) || !Array.isArray(s.discard)) return null;
  const cards = [...s.deck, ...s.discard, ...players.flatMap((p) => p.hand)];
  if (cards.length !== DECK_SIZE || !cards.every(validCard)) return null;
  if (new Set(cards.map((c) => (c as Card).id)).size !== DECK_SIZE) return null;

  if (s.pending !== null && !validPending(s.pending)) return null;
  if (s.result !== null) {
    if (!isObject(s.result) || typeof s.result.reason !== 'string') return null;
    if (!(s.result.winner === null || seat(s.result.winner))) return null;
  }
  return { ...(s as unknown as State), fx: [] };
}

export const serialize = (s: State) => JSON.stringify({ ...s, fx: [] });
