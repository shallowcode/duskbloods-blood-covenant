import type { Difficulty, HeroId, State } from '../game/types.ts';
import { parseSave, serialize } from '../game/save.ts';

/** localStorage can throw (private mode, blocked storage); never let it crash the game. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

const SAVE_KEY = 'duskbloods-covenant-v2';
const LEGACY_SAVE_KEY = 'duskbloods-covenant-v1';
const SETTINGS_KEY = 'duskbloods-settings';
const STATS_KEY = 'duskbloods-stats';

export function loadSave(): State | null {
  const raw = read(SAVE_KEY) ?? read(LEGACY_SAVE_KEY);
  return raw ? parseSave(raw) : null;
}

export const storeSave = (s: State) => write(SAVE_KEY, serialize(s));

export type Speed = 'slow' | 'normal' | 'fast';

export interface Settings {
  difficulty: Difficulty;
  speed: Speed;
  sound: boolean;
  hero: HeroId;
  tutorialSeen: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  difficulty: 'normal',
  speed: 'normal',
  sound: true,
  hero: 'albert',
  tutorialSeen: false,
};

export function loadSettings(): Settings {
  try {
    const raw = read(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const storeSettings = (s: Settings) =>
  write(SETTINGS_KEY, JSON.stringify(s));

export interface HeroRecord {
  games: number;
  wins: number;
  finals: number;
  bestVirtue: number;
}

export interface Stats {
  games: number;
  wins: number;
  heroes: Partial<Record<HeroId, HeroRecord>>;
  /** Seeds already recorded, so reloading a finished match never double counts. */
  recent: number[];
}

const EMPTY_STATS: Stats = { games: 0, wins: 0, heroes: {}, recent: [] };

export function loadStats(): Stats {
  try {
    const raw = read(STATS_KEY);
    return raw ? { ...EMPTY_STATS, ...JSON.parse(raw) } : EMPTY_STATS;
  } catch {
    return EMPTY_STATS;
  }
}

/** Record a finished match once. `id` identifies the match (its starting seed). */
export function recordResult(id: number, s: State): Stats {
  const stats = loadStats();
  if (stats.recent.includes(id) || !s.result) return stats;
  const me = s.players[0];
  const won = s.result.winner === 0;
  const prev = stats.heroes[me.hero] ?? {
    games: 0,
    wins: 0,
    finals: 0,
    bestVirtue: 0,
  };
  const reachedFinal = s.phase === 3 && !s.eliminated.slice(0, 3).includes(0);
  const next: Stats = {
    games: stats.games + 1,
    wins: stats.wins + (won ? 1 : 0),
    heroes: {
      ...stats.heroes,
      [me.hero]: {
        games: prev.games + 1,
        wins: prev.wins + (won ? 1 : 0),
        finals: prev.finals + (reachedFinal ? 1 : 0),
        bestVirtue: Math.max(prev.bestVirtue, me.virtue),
      },
    },
    recent: [...stats.recent, id].slice(-50),
  };
  write(STATS_KEY, JSON.stringify(next));
  return next;
}
