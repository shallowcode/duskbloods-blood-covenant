import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  Home,
  Play,
  RotateCcw,
  Shield,
  Swords,
  Trophy,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CARDS, EVENTS, FOES, HEROES, RULES, hero } from '../game/data.ts';
import { ranking, responses } from '../game/rules.ts';
import type { Action, State } from '../game/types.ts';
import { Modal } from './Modal.tsx';
import { CardSymbol, PlayingCard } from './parts.tsx';
import type { Settings, Speed } from './storage.ts';

// --------------------------------------------------------------- response

export function ResponseDialog({
  s,
  onAct,
}: {
  s: State;
  onAct: (a: Action) => void;
}) {
  const pending = s.pending;
  const open = !!pending && pending.target === 0 && !s.result;
  const options = open ? responses(s) : [];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[1-9]$/.test(e.key)) {
        const c = responses(s)[Number(e.key) - 1];
        if (c) onAct({ type: 'respond', cardId: c.id });
      } else if (e.key === 't' || e.key === 'T' || e.key === ' ') {
        e.preventDefault();
        onAct({ type: 'respond' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, s, onAct]);

  if (!pending) return null;
  const me = s.players[0];
  const attacker = hero(s.players[pending.source].hero);
  const duel = pending.kind === 'duel';
  const soaked = pending.ignoreArmor ? 0 : Math.min(me.armor, pending.amount);
  const through = pending.amount - soaked;
  const lethal = through >= me.hp;

  return (
    <Modal
      open={open}
      locked
      onClose={() => {}}
      size="wide"
      className="response-modal"
      title={duel ? '血之决斗' : `${pending.label}袭来`}
      description={
        duel
          ? `${attacker.name}与你拼血袭：打出「血袭」迎战，或承受 ${pending.amount} 点伤害。`
          : `${attacker.name}以「${pending.label}」攻击你，将造成 ${pending.amount} 点伤害。`
      }
    >
      <div className="response-body">
        <div className="response-attacker">
          <img src={`./media/${attacker.id}.jpg`} alt="" />
          <Swords size={26} />
          <img src={`./media/${me.hero}.jpg`} alt="" />
        </div>
        <p className={`response-forecast ${lethal ? 'lethal' : ''}`}>
          {soaked > 0 && <>护甲吸收 {soaked} 点 · </>}
          {pending.ignoreArmor && me.armor > 0 && <>此次攻击无视护甲 · </>}
          承受将失去 <b>{through}</b> 点体力（当前 {me.hp}）
          {lethal &&
            (s.phase === 3
              ? ' —— 将燃尽一条生命！'
              : ' —— 你会倒下并失去 2 美德！')}
        </p>
        <div className="response-cards">
          {options.map((c, i) => (
            <PlayingCard
              key={c.id}
              card={c}
              shortcut={String(i + 1)}
              onClick={() => onAct({ type: 'respond', cardId: c.id })}
            />
          ))}
          {!options.length && (
            <p className="muted">
              <Shield size={16} /> 手中没有可用的响应牌。
            </p>
          )}
        </div>
        <button
          type="button"
          className="danger-button"
          onClick={() => onAct({ type: 'respond' })}
        >
          承受伤害 <kbd>T</kbd>
        </button>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------- result

export function ResultDialog({
  s,
  ready,
  onReplay,
  onSpectate,
  onHome,
}: {
  s: State;
  /** False while a cut or phase overlay is still telling the story. */
  ready: boolean;
  onReplay: () => void;
  onSpectate: () => void;
  onHome: () => void;
}) {
  const result = s.result;
  const me = s.players[0];
  const won = result?.winner === 0;
  const order = ranking(s);
  const placement = order.findIndex((p) => p.id === 0) + 1;
  const canSpectate = !!result && result.winner === null && !me.alive;
  const winner = result?.winner ?? null;
  const title = !result
    ? ''
    : won
      ? '你成为了赐血者'
      : winner === null
        ? '黄昏已尽'
        : `${hero(s.players[winner].hero).name}获得月血`;

  return (
    <Modal
      open={!!result && ready}
      locked
      onClose={() => {}}
      title={title}
      description={result?.reason}
      size="wide"
    >
      {result && (
        <div className="result-body">
          <div className={`result-crest ${won ? 'won' : ''}`}>
            <Trophy size={44} strokeWidth={1} />
            <span className="eyebrow">
              {won ? 'MOON BLOOD BESTOWAL' : 'THE DUSK REMEMBERS'}
            </span>
            <strong>第 {placement} 名</strong>
          </div>
          <div className="result-stats">
            <div>
              <strong>{me.virtue}</strong>
              <span>美德</span>
            </div>
            <div>
              <strong>{me.kills}</strong>
              <span>击倒</span>
            </div>
            <div>
              <strong>{me.falls}</strong>
              <span>倒下</span>
            </div>
            <div>
              <strong>{s.round}</strong>
              <span>轮数</span>
            </div>
          </div>
          <ol className="result-ranking">
            {order.map((p, i) => (
              <li key={p.id} className={p.id === 0 ? 'you' : ''}>
                <span>
                  {result.winner === p.id
                    ? '♜'
                    : String(i + 1).padStart(2, '0')}
                </span>
                <img src={`./media/${p.hero}.jpg`} alt="" />
                <strong>
                  {hero(p.hero).name}
                  {p.id === 0 ? ' · 你' : ''}
                </strong>
                <small>
                  击倒 {p.kills} · 倒下 {p.falls}
                </small>
                <b>
                  {p.virtue}
                  <small>美德</small>
                </b>
              </li>
            ))}
          </ol>
          <div className="result-actions">
            <button type="button" className="primary" onClick={onReplay}>
              <RotateCcw size={16} /> 再次赴宴
            </button>
            {canSpectate && (
              <button type="button" className="quiet" onClick={onSpectate}>
                <Eye size={16} /> 观战至终局
              </button>
            )}
            <button type="button" className="quiet" onClick={onHome}>
              <Home size={16} /> 返回夜之馆
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------ hero detail

export function HeroDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const h = id ? hero(id) : null;
  return (
    <Modal
      open={!!h}
      onClose={onClose}
      title={h?.name ?? ''}
      description={h ? `${h.en} · ${h.title}` : ''}
    >
      {h && (
        <div className="hero-detail">
          <img src={`./media/${h.id}-full.png`} alt={h.en} />
          <p className="eyebrow">
            {h.weapon} · 体力 {h.hp} · 距离{' '}
            {h.range === Infinity ? '∞' : h.range}
          </p>
          <div className="ability">
            <div className="ability-head">
              <h3>{h.skill}</h3>
              <span>{h.cost} 血晶</span>
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
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- archive

const TABS = [
  { id: 'rules', name: '牌局规则' },
  { id: 'cards', name: '卡牌图鉴' },
  { id: 'heroes', name: '六道血脉' },
  { id: 'credits', name: '关于与来源' },
] as const;

export function ArchiveDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('rules');
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title="血誓档案"
      description="规则为桌游改编；角色和美术来自网络测试官方资料。"
    >
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            key={t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="tab-body" role="tabpanel">
        {tab === 'rules' && (
          <div className="rules-grid">
            <article>
              <h3>01 / 目标</h3>
              <p>
                美德决定去留。第 {RULES.cuts[0].round} 轮开始时只保留美德前{' '}
                {RULES.cuts[0].keep} 名，第 {RULES.cuts[1].round} 轮保留前{' '}
                {RULES.cuts[1].keep}{' '}
                名进入月血决战，最后存活者获胜。排名依次比较美德、体力、血晶、击倒数。
              </p>
              <h3>02 / 回合</h3>
              <p>
                每轮按美德从高到低依次行动：领先者先手，落后者压轴；同分时按每轮轮换的座次。回合开始摸{' '}
                {RULES.early.draw} 张牌、获得 {RULES.early.blood} 血晶，有{' '}
                {RULES.early.ap} 个行动点：出牌、技能、点灯、立誓、强化各花 1
                点。每回合限用 {RULES.early.slashes} 张「血袭」、1
                次技能。回合结束弃牌至体力值（至少 3
                张），优先留下治疗、防御与血袭。
              </p>
              <h3>03 / 攻击与响应</h3>
              <p>
                「血袭」「夜行」「金血针」对应杀、闪、桃。受到攻击时可打出夜行或震慑之啸抵消，响应不耗行动点。护甲先于体力吸收伤害。体力归零时自动使用手中的金血针。决斗中双方轮流打出血袭，先停手的一方受伤。
              </p>
              <h3>04 / 倒下</h3>
              <p>
                决战前倒下会满血重生，但失去 {RULES.deathPenalty}{' '}
                美德；击倒者获得 {RULES.killVirtue} 美德、{RULES.killBlood}{' '}
                血晶并摸 1 张牌。首次击倒自己的宿敌额外 +{RULES.sigilVirtue}{' '}
                美德。
              </p>
            </article>
            <article>
              <h3>05 / 美德的来源</h3>
              <p>
                点灯：每回合一次，+1 美德、+1 血晶、摸 1
                张牌。吸血：每回合首次伤害其他血族时 +{RULES.drainBlood}{' '}
                血晶。狩猎：对中央强敌造成伤害，最后一击获得 1–4
                美德与战利品。血誓：第 3–6 轮可在血誓之柱立誓（
                {RULES.pledgeCost} 血晶，已有人持誓时多 1），立即 +
                {RULES.pledgeVirtue} 美德；若一直守到自己下个回合开始，再得 +
                {RULES.pillarEcho}
                。只有美德不高于持誓者的血族才能覆写，盟友的血誓不可覆写。
              </p>
              <h3>06 / 同盟与成长</h3>
              <p>
                「暂时同盟」持续到下一轮结束，双方不能互相攻击。距离按存活者围坐的较短路径计算，血袭受距离限制，技能与谋略无视距离。强化血脉每次{' '}
                {RULES.upgradeCost} 血晶：一级血袭伤害 +1，二级技能消耗 −1。
              </p>
              <h3>07 / 月血决战</h3>
              <p>
                同盟与血誓解散；三人满血，每 10 美德额外 +1 体力上限（至多
                +2），各有 {RULES.final.lives} 条生命，立即补给 3 张牌、3
                血晶。此后每回合 {RULES.final.ap} 行动点、摸 {RULES.final.draw}{' '}
                张、+
                {RULES.final.blood} 血晶，技能 {RULES.final.skills} 次、基础血袭{' '}
                {RULES.final.slashes} 次，留牌上限为体力 +2（至少
                5）。燃尽一条生命后以半数体力 +1 重返。第 {RULES.frenzyRound}{' '}
                轮起血月狂潮：所有攻击伤害 +1。若第 {RULES.lastRound}{' '}
                轮仍未分胜负，按「生命 ×20 + 体力 + 美德」裁决。
              </p>
              <h3>08 / 操作</h3>
              <p>
                数字 1–9 选牌，S 技能，L 点灯，P 立誓，U 强化，H 低语建议，E
                结束回合，Esc 取消。响应时数字键出牌、T
                承受。浏览器会自动保存，暂停菜单可导出、导入存档。
              </p>
            </article>
          </div>
        )}
        {tab === 'cards' && (
          <div className="codex-cards">
            {Object.entries(CARDS).map(([key, c]) => (
              <article key={key}>
                <CardSymbol name={c.symbol} />
                <div>
                  <h3>
                    {c.name}{' '}
                    <small>
                      {c.sub} · {c.category} · ×{c.count}
                    </small>
                  </h3>
                  <p>{c.text}</p>
                </div>
              </article>
            ))}
            <h4 className="codex-sub">异象</h4>
            {EVENTS.slice(1).map((e) => (
              <article key={e.name}>
                <div>
                  <h3>{e.name}</h3>
                  <p>{e.text}</p>
                </div>
              </article>
            ))}
            <h4 className="codex-sub">游荡强敌</h4>
            {FOES.map((f) => (
              <article key={f.name}>
                <div>
                  <h3>
                    {f.name}{' '}
                    <small>
                      体力 {f.hp} · +{f.reward} 美德
                    </small>
                  </h3>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        )}
        {tab === 'heroes' && (
          <div className="codex-heroes">
            {HEROES.map((h) => (
              <article key={h.id}>
                <img src={`./media/${h.id}.jpg`} alt={h.en} />
                <div>
                  <h3>
                    {h.name}
                    <small>
                      {h.en} · 体力 {h.hp} · 距离{' '}
                      {h.range === Infinity ? '∞' : h.range}
                    </small>
                  </h3>
                  <p>
                    <b>
                      {h.skill} · {h.cost} 血晶：
                    </b>
                    {h.skillText}
                  </p>
                  <p>
                    <b>{h.passive}：</b>
                    {h.passiveText}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
        {tab === 'credits' && (
          <div className="credits">
            <p className="eyebrow">A FAN-MADE CARD GAME</p>
            <h3>黄昏血族 · 血誓牌局</h3>
            <p>
              基于《The Duskbloods》网络测试六名 Bloodsworn
              制作的非官方单人桌游改编。保留杀、闪、桃式手牌响应，同时迁移狩猎、美德筛选、同盟、眷属与宿敌刻印。数值、技能结算及中文名称为本作改编，不代表原作规则或官方译名。
            </p>
            <p>
              角色立绘与环境图直接采用 FromSoftware
              官方网络测试网站原图，随本地游戏提供。角色、世界观和原作美术 ©2026
              FromSoftware, Inc.；相关权利归原权利方所有。
            </p>
            <p>
              AI
              对手使用信息集采样：它们看不到你的手牌和牌堆顺序，只根据公开信息推演。六名角色的数值经数千局自对弈模拟调校。
            </p>
            <a
              href="https://campaign.theduskbloods.jp/p/event/networktest/gameplayguide/?lang=en-uk&locate=NL&region=europe"
              target="_blank"
              rel="noreferrer"
            >
              官方网络测试玩法指南 ↗
            </a>
            <a
              href="https://campaign.theduskbloods.jp/manual/en-uk/houseofnight.html"
              target="_blank"
              rel="noreferrer"
            >
              官方网络测试在线手册 ↗
            </a>
            <p className="muted">
              本地离线版本 · 无账户 · 无联网 · 所有 AI 决策在本机运行。
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ pause

const SPEEDS: { id: Speed; name: string }[] = [
  { id: 'slow', name: '从容' },
  { id: 'normal', name: '标准' },
  { id: 'fast', name: '迅疾' },
];

export function PauseDialog({
  open,
  settings,
  message,
  onSettings,
  onClose,
  onExport,
  onImport,
  onTutorial,
  onHome,
}: {
  open: boolean;
  settings: Settings;
  message: string;
  onSettings: (patch: Partial<Settings>) => void;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onTutorial: () => void;
  onHome: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="narrow"
      title="夜之暂歇"
      description="对局已暂停。你的血誓仍在等待。"
    >
      <div className="pause-menu">
        <button type="button" className="primary" onClick={onClose}>
          <Play size={17} /> 继续牌局
        </button>
        <div className="setting-row">
          <span>AI 速度</span>
          <div className="segmented">
            {SPEEDS.map((sp) => (
              <button
                type="button"
                key={sp.id}
                className={settings.speed === sp.id ? 'on' : ''}
                onClick={() => onSettings({ speed: sp.id })}
              >
                {sp.name}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span>音效</span>
          <button
            type="button"
            className="quiet small"
            onClick={() => onSettings({ sound: !settings.sound })}
          >
            {settings.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}{' '}
            {settings.sound ? '开启' : '关闭'}
          </button>
        </div>
        <button type="button" className="quiet" onClick={onTutorial}>
          玩法速览
        </button>
        <button type="button" className="quiet" onClick={onExport}>
          <Download size={17} /> 导出存档
        </button>
        <button type="button" className="quiet" onClick={onImport}>
          <Upload size={17} /> 导入存档
        </button>
        <button type="button" className="quiet" onClick={onHome}>
          <Home size={17} /> 返回夜之馆（保留存档）
        </button>
        {message && <p className="pause-message">{message}</p>}
      </div>
    </Modal>
  );
}

// --------------------------------------------------------------- tutorial

const STEPS = [
  {
    title: '美德决定去留',
    text: `六名血族争夺圣杯。第 ${RULES.cuts[0].round} 轮只留美德前 ${RULES.cuts[0].keep} 名，第 ${RULES.cuts[1].round} 轮只留前 ${RULES.cuts[1].keep} 名进入决战。右侧排名的「筛选线」告诉你离危险有多近。`,
  },
  {
    title: '每回合 3 个行动点',
    text: '出牌、发动技能、点燃遗骸之灯、在血誓之柱立誓、强化血脉，各花 1 点。点灯是每回合最稳的美德来源；第 3 轮起可在血誓之柱立誓，守到你的下个回合还能再得 2 美德——但只有美德不高于持誓者的人才能覆写它。',
  },
  {
    title: '选牌，然后点目标',
    text: '点一张手牌，可选的目标会亮起，直接点击即可出牌。中央的游荡强敌可以狩猎——谁打出最后一击，谁拿走美德。无需目标的牌再点一次就会打出。',
  },
  {
    title: '攻击与倒下',
    text: '每回合首次伤害其他血族可吸取 1 血晶。被攻击时会弹出响应：打出「夜行」或「震慑之啸」抵消，或承受伤害。决战前倒下会满血重生但 −2 美德，击倒你的人 +3；击倒自己的宿敌另有奖励。',
  },
  {
    title: '月血决战',
    text: '第 7 轮起三人决战：每人两条生命、每回合 5 行动点。拿不定主意时按 H 或点「低语」，它会用最强 AI 的眼光给你一条建议。',
  },
];

export function TutorialDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const close = () => {
    setStep(0);
    onClose();
  };
  const last = step === STEPS.length - 1;
  return (
    <Modal
      open={open}
      onClose={close}
      size="narrow"
      title="玩法速览"
      description={`${step + 1} / ${STEPS.length}`}
    >
      <div className="tutorial">
        <div className="tutorial-dots" aria-hidden>
          {STEPS.map((_, i) => (
            <i key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />
          ))}
        </div>
        <h3>{STEPS[step].title}</h3>
        <p>{STEPS[step].text}</p>
        <div className="tutorial-actions">
          <button
            type="button"
            className="quiet"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={15} /> 上一步
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => (last ? close() : setStep(step + 1))}
          >
            {last ? '开始狩猎' : '下一步'} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
