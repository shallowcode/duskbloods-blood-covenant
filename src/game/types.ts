export type HeroId = 'albert' | 'jan' | 'lanh' | 'layla' | 'samir' | 'zork';

export type CardType =
  | 'slash'
  | 'dodge'
  | 'heal'
  | 'howl'
  | 'duel'
  | 'steal'
  | 'supply'
  | 'fire'
  | 'weapon'
  | 'armor'
  | 'kin'
  | 'blood'
  | 'oath';

export type Suit = '♠' | '♥' | '♣' | '♦';

export interface Card {
  id: number;
  type: CardType;
  suit: Suit;
  rank: string;
}

export type Difficulty = 'novice' | 'normal' | 'tactical';

/** Seat index 0–5. Seat 0 is always the human player. */
export type Seat = number;

/** Target id: a seat, or FOE for the wandering foe in the centre of the table. */
export const FOE = -1;

export interface Player {
  id: Seat;
  hero: HeroId;
  hp: number;
  maxHp: number;
  virtue: number;
  blood: number;
  hand: Card[];
  armor: number;
  weapon: boolean;
  kin: boolean;
  alive: boolean;
  /** Lives in the final duel. */
  lives: number;
  ally: Seat | null;
  /** Last round (inclusive) the alliance holds. */
  allianceUntil: number;
  /** Bloodhand Jan: heal on next damage dealt. */
  revenge: boolean;
  /** Senator Samir: next slash +1 after a successful defence. */
  counter: boolean;
  /** Trang Lanh: dark-moon veil blocks the next attack. */
  veil: boolean;
  /** Trang Lanh: already used a slash as a dodge since her last turn. */
  moonstep: boolean;
  level: number;
  kills: number;
  /** Times knocked down (respawns and spent lives). */
  falls: number;
  /** Seat of the rival whose first defeat grants bonus virtue. */
  sigil: Seat;
  sigilDone: boolean;
}

/**
 * An interruption awaiting a response from `target`.
 * attack: target may dodge; otherwise `source` deals `amount`.
 * duel:   target must answer with a slash; on success the roles swap.
 */
export interface Pending {
  kind: 'attack' | 'duel';
  source: Seat;
  target: Seat;
  amount: number;
  label: string;
  ignoreArmor: boolean;
}

export type Fx =
  | { t: 'card'; who: Seat; card: CardType; target?: number }
  | { t: 'skill'; who: Seat; target: number }
  | { t: 'damage'; who: number; amount: number; source: number }
  | { t: 'block'; who: Seat; amount: number }
  | { t: 'heal'; who: Seat; amount: number }
  | { t: 'defend'; who: Seat; card: CardType }
  | { t: 'veil'; who: Seat }
  | { t: 'virtue'; who: Seat; amount: number }
  | { t: 'blood'; who: Seat; amount: number }
  | { t: 'down'; who: Seat; source: number }
  | { t: 'out'; who: Seat }
  | { t: 'foe'; who: Seat; kind: number }
  | { t: 'lamp'; who: Seat }
  | { t: 'pledge'; who: Seat }
  | { t: 'upgrade'; who: Seat; level: number }
  | { t: 'ally'; who: Seat; with: Seat }
  | { t: 'steal'; who: Seat; from: Seat }
  | { t: 'round'; round: number; phase: number; event: number }
  | { t: 'cut'; who: Seat[] }
  | { t: 'turn'; who: Seat };

export interface LogEntry {
  text: string;
  round: number;
  type: 'normal' | 'turn' | 'phase' | 'gain' | 'damage' | 'skill';
}

export interface State {
  version: 2;
  /** Starting seed; identifies the match. */
  matchId: number;
  seed: number;
  players: Player[];
  deck: Card[];
  discard: Card[];
  /** Seat whose turn it is. */
  turn: Seat;
  round: number;
  phase: number;
  /** Seats acting this round, starting with the round's first player. */
  order: Seat[];
  /** First player of the current round; rotates clockwise every round. */
  starter: Seat;
  ap: number;
  slashes: number;
  skillUses: number;
  lit: boolean;
  pledged: boolean;
  upgraded: boolean;
  bonusUsed: boolean;
  /** The turn player already drained blood from a Bloodsworn this turn. */
  drained: boolean;
  event: number;
  foe: { kind: number; hp: number };
  pillar: Seat | null;
  pending: Pending | null;
  log: LogEntry[];
  /** Effects produced by the most recent action, consumed by the UI. */
  fx: Fx[];
  /** Seats in the order they left the game (earliest first). */
  eliminated: Seat[];
  result: null | { winner: Seat | null; reason: string };
  /** After the human falls, the AI may play the match to its end. */
  spectate: boolean;
  difficulty: Difficulty;
  serial: number;
}

export type Action =
  | { type: 'card'; cardId: number; target?: number }
  | { type: 'skill'; target: number }
  | { type: 'lamp' | 'pledge' | 'upgrade' | 'end' }
  | { type: 'respond'; cardId?: number };
