import { ArrowRight, Play, Trophy } from 'lucide-react';
import type { CSSProperties } from 'react';
import { HEROES, hero } from '../game/data.ts';
import type { Difficulty, HeroId, State } from '../game/types.ts';
import { HeroName } from './parts.tsx';
import type { Settings, Stats } from './storage.ts';

const DIFFICULTIES: { id: Difficulty; name: string; note: string }[] = [
  { id: 'novice', name: '新血', note: 'AI 时有失误，适合熟悉规则' },
  { id: 'normal', name: '标准', note: '逐步推演每一手的得失' },
  { id: 'tactical', name: '深谋', note: '规划整回合连招，压制领先者' },
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const RATING_LABELS = ['进攻', '生存', '上手'];

export function Selection({
  settings,
  stats,
  saved,
  onSettings,
  onStart,
  onContinue,
}: {
  settings: Settings;
  stats: Stats;
  saved: State | null;
  onSettings: (patch: Partial<Settings>) => void;
  onStart: () => void;
  onContinue: () => void;
}) {
  const h = hero(settings.hero);
  const index = HEROES.indexOf(h);
  const record = stats.heroes[h.id];
  const resumable = saved && !saved.result;

  return (
    <section
      className="selection"
      style={{ backgroundImage: 'url(./media/dusk-landscape.jpg)' }}
    >
      <div className="selection-veil" />
      <div className="selection-inner">
        <div className="selection-heading">
          <span className="eyebrow">I · THE BLOODSWORN</span>
          <h1>选择你的血族</h1>
          <p>六道血脉，一个圣杯。在两次筛选中守住美德，于月血之下活到最后。</p>
        </div>

        <div className="hero-stage">
          <div className="hero-art-space" key={h.id}>
            <span className="hero-roman">{ROMAN[index]}</span>
            <div
              className="portrait-aura"
              style={{
                background: `radial-gradient(ellipse, ${h.color}55, transparent 65%)`,
              }}
            />
            <img
              className="hero-art"
              src={`./media/${h.id}-full.png`}
              alt={h.en}
            />
            <span className="weapon-caption">{h.weapon}</span>
          </div>

          <div className="hero-info">
            <p className="eyebrow">{h.title}</p>
            <h2>{h.name}</h2>
            <p className="english-name">{h.en}</p>
            <p className="hero-quote">“{h.quote}”</p>
            <div className="hero-stats">
              <span>
                体力 <strong>{h.hp}</strong>
              </span>
              <span>
                距离 <strong>{h.range === Infinity ? '∞' : h.range}</strong>
              </span>
              <span>
                定位 <strong>{h.style.split(' · ')[0]}</strong>
              </span>
              <div className="ratings">
                {h.ratings.map((r, i) => (
                  <span key={RATING_LABELS[i]} className="rating">
                    <small>{RATING_LABELS[i]}</small>
                    <span className="rating-bar">
                      {Array.from({ length: 5 }, (_, k) => (
                        <i key={k} className={k < r ? 'on' : ''} />
                      ))}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div className="ability">
              <div className="ability-head">
                <h3>{h.skill}</h3>
                <span>主动 · {h.cost} 血晶</span>
              </div>
              <p>{h.skillText}</p>
            </div>
            <div className="ability">
              <div className="ability-head">
                <h3>{h.passive}</h3>
                <span>血统特性</span>
              </div>
              <p>{h.passiveText}</p>
            </div>
            <p className="hero-tip">✦ {h.tip}</p>

            <fieldset className="difficulty">
              <legend className="sr-only">AI 难度</legend>
              {DIFFICULTIES.map((d) => (
                <button
                  type="button"
                  aria-pressed={settings.difficulty === d.id}
                  key={d.id}
                  className={settings.difficulty === d.id ? 'on' : ''}
                  onClick={() => onSettings({ difficulty: d.id })}
                >
                  <strong>{d.name}</strong>
                  <small>{d.note}</small>
                </button>
              ))}
            </fieldset>

            <div className="start-row">
              <button type="button" className="primary" onClick={onStart}>
                进入黄昏 <ArrowRight size={18} />
              </button>
              {resumable && (
                <button type="button" className="quiet" onClick={onContinue}>
                  <Play size={15} /> 继续第 {saved.round} 轮 ·{' '}
                  {hero(saved.players[0].hero).name}
                </button>
              )}
            </div>
            {record && (
              <p className="hero-record">
                <Trophy size={13} /> 此血脉 {record.games} 局 · {record.wins} 胜
                · 进入决战 {record.finals} 次 · 最高美德 {record.bestVirtue}
              </p>
            )}
          </div>
        </div>

        <fieldset className="hero-roster">
          <legend className="sr-only">选择血族</legend>
          {HEROES.map((x, i) => {
            const r = stats.heroes[x.id as HeroId];
            return (
              <button
                type="button"
                aria-pressed={settings.hero === x.id}
                className={`roster-card ${settings.hero === x.id ? 'selected' : ''}`}
                key={x.id}
                onClick={() => onSettings({ hero: x.id })}
                style={{ '--hero': x.color } as CSSProperties}
              >
                <img src={`./media/${x.id}.jpg`} alt="" />
                <span className="roster-index">0{i + 1}</span>
                {r && r.wins > 0 && (
                  <span className="roster-wins" title="胜场">
                    ♜ {r.wins}
                  </span>
                )}
                <div>
                  <strong>
                    <HeroName name={x.name} />
                  </strong>
                  <small>{x.en}</small>
                </div>
              </button>
            );
          })}
        </fieldset>

        <footer className="selection-footer">
          <span>
            单人 · 5 位 AI 对手 · 约 20 分钟
            {stats.games > 0 &&
              ` · 总战绩 ${stats.wins} 胜 / ${stats.games} 局`}
          </span>
          <span>非官方同人卡牌游戏 · OFFLINE EDITION</span>
        </footer>
      </div>
    </section>
  );
}
