import {
  Droplet,
  Flame,
  Gem,
  Hand,
  Layers,
  Link as LinkIcon,
  Moon,
  Shield,
  Sword,
  Swords,
  Users,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { CARDS } from '../game/data.ts';
import type { Card, Player } from '../game/types.ts';

const SYMBOLS: Record<string, LucideIcon> = {
  sword: Sword,
  swords: Swords,
  moon: Moon,
  drop: Droplet,
  gem: Gem,
  shield: Shield,
  wind: Wind,
  flame: Flame,
  hand: Hand,
  cards: Layers,
  kin: Users,
  link: LinkIcon,
};

export function CardSymbol({
  name,
  size = 30,
}: {
  name: string;
  size?: number;
}) {
  const Icon = SYMBOLS[name] ?? Moon;
  return <Icon size={size} strokeWidth={1.15} aria-hidden />;
}

/** Breaks long names like 萨米尔·帕特雷斯 at the interpunct. */
export function HeroName({ name }: { name: string }) {
  const [first, ...rest] = name.split('·');
  if (!rest.length) return <span className="hero-name">{name}</span>;
  return (
    <span className="hero-name">
      {first}·<wbr />
      {rest.join('·')}
    </span>
  );
}

export function Health({
  p,
  compact = false,
}: {
  p: Player;
  compact?: boolean;
}) {
  return (
    <div className={`health ${compact ? 'compact' : ''}`}>
      <span className="pips" aria-hidden>
        {Array.from({ length: p.maxHp }, (_, i) => (
          <i key={i} className={i < p.hp ? 'full' : ''} />
        ))}
      </span>
      <span className="value">
        <span className="sr-only">体力 </span>
        {p.hp}/{p.maxHp}
      </span>
    </div>
  );
}

export const isAttackCard = (type: Card['type']) =>
  type === 'slash' || type === 'fire' || type === 'duel';

export function PlayingCard({
  card,
  selected = false,
  disabled = false,
  hinted = false,
  onClick,
  shortcut,
  style,
}: {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  hinted?: boolean;
  onClick?: () => void;
  shortcut?: string;
  style?: CSSProperties;
}) {
  const c = CARDS[card.type];
  const red = card.suit === '♥' || card.suit === '♦';
  return (
    <button
      type="button"
      className={[
        'playing-card',
        `cat-${c.category === '基本' ? 'basic' : c.category === '谋略' ? 'trick' : 'gear'}`,
        isAttackCard(card.type) ? 'attack' : '',
        c.reaction ? 'reaction' : '',
        selected ? 'chosen' : '',
        disabled ? 'unavailable' : '',
        hinted ? 'hinted' : '',
      ].join(' ')}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${c.name}（${c.sub}）：${c.text}`}
      style={style}
    >
      <span className="card-top">
        <span className={`card-corner ${red ? 'red' : ''}`}>
          {card.rank}
          <br />
          {card.suit}
        </span>
        <span className="card-kind">{c.category}</span>
      </span>
      <span className="card-emblem">
        <CardSymbol name={c.symbol} size={32} />
      </span>
      <strong className="card-name">{c.name}</strong>
      <span className="card-text">{c.short}</span>
      <span className="card-foot">
        <span>{c.reaction ? '响应' : c.target ? '选择目标' : '对自己'}</span>
        {shortcut && <kbd>{shortcut}</kbd>}
      </span>
    </button>
  );
}

export function Stat({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  tone?: string;
}) {
  return (
    <span
      className={`stat ${tone ?? ''}`}
      title={label}
      aria-label={`${label} ${value}`}
    >
      {icon}
      {value}
    </span>
  );
}
