import { useEffect, useRef, useState } from 'react';
import { CARDS, EVENTS, FOES, PHASES, hero } from '../game/data.ts';
import type { CardType, Fx, State } from '../game/types.ts';
import { play, type Cue } from './sound.ts';

export type FloaterTone =
  | 'dmg'
  | 'heal'
  | 'virtue'
  | 'blood'
  | 'block'
  | 'veil'
  | 'down';

export interface Floater {
  id: number;
  /** Seat, or -1 for the foe. */
  seat: number;
  text: string;
  tone: FloaterTone;
}

export interface Banner {
  id: number;
  who: number;
  title: string;
  detail: string;
  target?: number;
  card?: CardType;
  tone: 'attack' | 'skill' | 'defend' | 'gain' | 'neutral';
}

export interface Overlay {
  id: number;
  title: string;
  sub: string;
  kind: 'round' | 'phase' | 'cut' | 'turn';
}

const FLOAT_MS = 1700;
const BANNER_MS = 2200;

const name = (s: State, seat: number) =>
  seat < 0 ? FOES[s.foe.kind].name : hero(s.players[seat].hero).name;

/** Merge a batch of effects into per-seat floating numbers. */
function floatersFor(fx: Fx[]): Omit<Floater, 'id'>[] {
  const sums = new Map<
    string,
    { seat: number; tone: FloaterTone; amount: number }
  >();
  const add = (seat: number, tone: FloaterTone, amount: number) => {
    const key = `${seat}:${tone}`;
    const cur = sums.get(key);
    if (cur) cur.amount += amount;
    else sums.set(key, { seat, tone, amount });
  };
  const out: Omit<Floater, 'id'>[] = [];
  for (const f of fx) {
    if (f.t === 'damage') add(f.who, 'dmg', f.amount);
    else if (f.t === 'heal') add(f.who, 'heal', f.amount);
    else if (f.t === 'virtue') add(f.who, 'virtue', f.amount);
    else if (f.t === 'blood') add(f.who, 'blood', f.amount);
    else if (f.t === 'block') add(f.who, 'block', f.amount);
    else if (f.t === 'veil')
      out.push({ seat: f.who, tone: 'veil', text: '暗月' });
    else if (f.t === 'down')
      out.push({ seat: f.who, tone: 'down', text: '倒下' });
  }
  for (const { seat, tone, amount } of sums.values()) {
    if (!amount) continue;
    const sign = amount > 0 ? '+' : '−';
    const n = Math.abs(amount);
    const text =
      tone === 'dmg'
        ? `−${n}`
        : tone === 'heal'
          ? `+${n} 体力`
          : tone === 'virtue'
            ? `${sign}${n} 美德`
            : tone === 'blood'
              ? `${sign}${n} 血晶`
              : `护甲 −${n}`;
    out.push({ seat, tone, text });
  }
  return out;
}

function bannerFor(s: State, fx: Fx[]): Omit<Banner, 'id'> | null {
  for (const f of fx) {
    switch (f.t) {
      case 'card': {
        const c = CARDS[f.card];
        const at = f.target === undefined ? '' : `→ ${name(s, f.target)}`;
        return {
          who: f.who,
          title: c.name,
          detail: at || c.short,
          target: f.target,
          card: f.card,
          tone: c.target ? 'attack' : 'neutral',
        };
      }
      case 'skill':
        return {
          who: f.who,
          title: hero(s.players[f.who].hero).skill,
          detail: `→ ${name(s, f.target)}`,
          target: f.target,
          tone: 'skill',
        };
      case 'defend':
        return {
          who: f.who,
          title: CARDS[f.card].name,
          detail: '化解攻击',
          card: f.card,
          tone: 'defend',
        };
      case 'lamp':
        return {
          who: f.who,
          title: '点燃遗骸之灯',
          detail: '+1 美德 · +1 血晶 · 摸牌',
          tone: 'gain',
        };
      case 'pledge':
        return {
          who: f.who,
          title: '血誓立誓',
          detail: '持有血誓之柱',
          tone: 'gain',
        };
      case 'upgrade':
        return {
          who: f.who,
          title: `血脉 Lv.${f.level}`,
          detail: '强化血脉',
          tone: 'gain',
        };
      default:
        break;
    }
  }
  return null;
}

function overlayFor(
  s: State,
  fx: Fx[],
  previousPhase: number,
): Omit<Overlay, 'id'> | null {
  const cut = fx.find((f) => f.t === 'cut');
  const round = fx.find((f) => f.t === 'round');
  if (round && round.t === 'round') {
    const phaseChanged = round.phase !== previousPhase;
    const cutText =
      cut && cut.t === 'cut'
        ? `${cut.who.map((id) => name(s, id)).join('、')}被圣杯筛除 · `
        : '';
    return {
      kind: cut ? 'cut' : phaseChanged ? 'phase' : 'round',
      title: phaseChanged
        ? `${['I', 'II', 'III', 'IV'][round.phase]} · ${PHASES[round.phase].name}`
        : `第 ${round.round} 轮`,
      sub: `${cutText}异象 · ${EVENTS[round.event].name}：${EVENTS[round.event].text}`,
    };
  }
  if (fx.some((f) => f.t === 'turn' && f.who === 0) && !s.pending) {
    return { kind: 'turn', title: '你的回合', sub: '' };
  }
  return null;
}

const CUES: Partial<Record<Fx['t'], Cue>> = {
  card: 'card',
  skill: 'card',
  damage: 'hit',
  block: 'block',
  heal: 'heal',
  defend: 'block',
  down: 'down',
  foe: 'gain',
};

function cuesFor(fx: Fx[]): Cue[] {
  const cues = new Set<Cue>();
  for (const f of fx) {
    const cue = CUES[f.t];
    if (cue) cues.add(cue);
    if (f.t === 'virtue' && f.who === 0 && f.amount > 0) cues.add('gain');
    if (f.t === 'turn' && f.who === 0) cues.add('turn');
    if (f.t === 'round') cues.add('phase');
  }
  if (cues.has('down')) cues.delete('hit');
  return [...cues];
}

export interface Effects {
  floaters: Floater[];
  banner: Banner | null;
  overlay: Overlay | null;
  /** The AI waits while a round or phase overlay is on screen. */
  holding: boolean;
  clear: () => void;
}

/** Turn the engine's per-action effect list into transient on-screen feedback. */
export function useEffects(game: State | null, sound: boolean): Effects {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const seen = useRef<{ match: number; serial: number; phase: number } | null>(
    null,
  );
  const ids = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!game) {
      seen.current = null;
      return;
    }
    const prev = seen.current;
    seen.current = {
      match: game.matchId,
      serial: game.serial,
      phase: game.phase,
    };
    // A freshly loaded match shows its state without replaying old effects.
    if (!prev || prev.match !== game.matchId) {
      if (game.serial === 0) {
        const o = overlayFor(game, game.fx, -1);
        if (o) {
          const id = ids.current++;
          setOverlay({ ...o, id });
          later(() => setOverlay((cur) => (cur?.id === id ? null : cur)), 1500);
        }
      }
      return;
    }
    if (prev.serial === game.serial) return;

    if (sound) for (const cue of cuesFor(game.fx)) play(cue);

    const fresh = floatersFor(game.fx).map((f) => ({
      ...f,
      id: ids.current++,
    }));
    if (fresh.length) {
      setFloaters((cur) => [...cur, ...fresh]);
      const gone = new Set(fresh.map((f) => f.id));
      later(
        () => setFloaters((cur) => cur.filter((f) => !gone.has(f.id))),
        FLOAT_MS,
      );
    }

    const b = bannerFor(game, game.fx);
    if (b) {
      const id = ids.current++;
      setBanner({ ...b, id });
      later(() => setBanner((cur) => (cur?.id === id ? null : cur)), BANNER_MS);
    }

    const o = overlayFor(game, game.fx, prev.phase);
    if (o) {
      const id = ids.current++;
      if (o.kind !== 'turn') setBanner(null);
      setOverlay({ ...o, id });
      const ms = o.kind === 'turn' ? 1100 : o.kind === 'round' ? 1700 : 2900;
      later(() => setOverlay((cur) => (cur?.id === id ? null : cur)), ms);
    }
  }, [game, sound]);

  return {
    floaters,
    banner,
    overlay,
    holding: !!overlay && overlay.kind !== 'turn',
    clear: () => {
      setOverlay(null);
      setBanner(null);
    },
  };
}
