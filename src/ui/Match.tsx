import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ChevronsUp,
  Droplet,
  Eye,
  Flag,
  Flame,
  Gem,
  Heart,
  Hourglass,
  Layers,
  Lightbulb,
  Moon,
  Shield,
  Skull,
  Sword,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { describeAction, suggest, type Scored } from '../game/ai.ts';
import {
  CARDS,
  EVENT,
  EVENTS,
  FOES,
  PHASES,
  RULES,
  hero,
} from '../game/data.ts';
import {
  attackRange,
  canLamp,
  canPlay,
  canPledge,
  canSkill,
  canUpgrade,
  distance,
  frenzy,
  isAlly,
  isFinal,
  pledgeCost,
  ranking,
  skillCost,
  skillLimit,
  slashDamage,
  slashLimit,
  turnAP,
  upcomingCut,
  validTargets,
} from '../game/rules.ts';
import { FOE, type Action, type Player, type State } from '../game/types.ts';
import type { Banner, Effects, Floater } from './effects.ts';
import { CardSymbol, HeroName, Health, PlayingCard, Stat } from './parts.tsx';

type Selection = { kind: 'card'; id: number } | { kind: 'skill' } | null;

function Floaters({ items }: { items: Floater[] }) {
  if (!items.length) return null;
  return (
    <span className="floaters" aria-hidden>
      {items.slice(-3).map((f, i) => (
        <span
          key={f.id}
          className={`floater ${f.tone}`}
          style={{ '--i': i } as CSSProperties}
        >
          {f.text}
        </span>
      ))}
    </span>
  );
}

// ------------------------------------------------------------------ seats

function SeatStatus({ s, p }: { s: State; p: Player }) {
  const tags: { label: string; tone: string }[] = [];
  if (!p.alive) tags.push({ label: '已离场', tone: 'out' });
  else {
    if (s.turn === p.id) tags.push({ label: '行动中', tone: 'turn' });
    if (s.pending?.target === p.id)
      tags.push({ label: '响应中', tone: 'turn' });
    if (isAlly(s, 0, p.id)) tags.push({ label: '同盟', tone: 'ally' });
    if (s.players[0].sigil === p.id && !s.players[0].sigilDone)
      tags.push({ label: '宿敌', tone: 'enemy' });
    if (s.pillar === p.id) tags.push({ label: '血誓', tone: 'pledge' });
    if (s.starter === p.id && !isFinal(s))
      tags.push({ label: '先手', tone: 'muted' });
  }
  return (
    <span className="seat-tags">
      {tags.map((t) => (
        <span key={t.label} className={`tag ${t.tone}`}>
          {t.label}
        </span>
      ))}
    </span>
  );
}

function Seat({
  s,
  p,
  targetable,
  hinted,
  floaters,
  hit,
  onClick,
  onInspect,
}: {
  s: State;
  p: Player;
  targetable: boolean;
  hinted: boolean;
  floaters: Floater[];
  hit: boolean;
  onClick: () => void;
  onInspect: () => void;
}) {
  const h = hero(p.hero);
  const final = isFinal(s);
  return (
    <div
      className={`seat-wrap ${p.alive ? '' : 'eliminated'}`}
      style={{ '--hero': h.color } as CSSProperties}
    >
      <button
        type="button"
        className={[
          'seat',
          s.turn === p.id && p.alive ? 'acting' : '',
          s.pending?.target === p.id ? 'responding' : '',
          targetable ? 'targetable' : '',
          hinted ? 'hinted' : '',
          hit ? 'hit' : '',
        ].join(' ')}
        onClick={onClick}
        aria-label={`${h.name}，体力 ${p.hp}/${p.maxHp}，美德 ${p.virtue}${targetable ? '，点击选为目标' : ''}`}
      >
        <img src={`./media/${p.hero}.jpg`} alt="" />
        <span className="seat-top">
          <span className="seat-no">0{p.id + 1}</span>
          <span className="virtue-badge" title="美德">
            <Gem size={12} />
            {p.virtue}
          </span>
        </span>
        <SeatStatus s={s} p={p} />
        <span className="seat-bottom">
          <strong>
            <HeroName name={h.name} />
          </strong>
          <Health p={p} compact />
          <span className="seat-res">
            <Stat
              icon={<Layers size={11} />}
              value={p.hand.length}
              label="手牌"
            />
            <Stat
              icon={<Droplet size={11} />}
              value={p.blood}
              label="血晶"
              tone="blood"
            />
            {p.armor > 0 && (
              <Stat icon={<Shield size={11} />} value={p.armor} label="护甲" />
            )}
            {p.weapon && (
              <Stat icon={<Sword size={11} />} value="" label="兵装" />
            )}
            {p.kin && <Stat icon={<Users size={11} />} value="" label="眷属" />}
            {p.level > 0 && (
              <Stat
                icon={<ChevronsUp size={11} />}
                value={p.level}
                label="血脉等级"
              />
            )}
            {p.veil && <Stat icon={<Moon size={11} />} value="" label="暗月" />}
            {final && p.alive && (
              <Stat
                icon={<Heart size={11} />}
                value={p.lives}
                label="生命"
                tone="life"
              />
            )}
          </span>
        </span>
        <Floaters items={floaters} />
      </button>
      <button type="button" className="seat-detail" onClick={onInspect}>
        <Eye size={12} /> 血脉
        {p.alive && (
          <span>
            第 {s.order.indexOf(p.id) + 1} 位 · 距离 {distance(s, 0, p.id)}
          </span>
        )}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ table

function Stage({ s, banner }: { s: State; banner: Banner | null }) {
  if (!banner) return null;
  const who = hero(s.players[banner.who].hero);
  return (
    <div className={`stage ${banner.tone}`} key={banner.id}>
      <img src={`./media/${who.id}.jpg`} alt="" className="stage-portrait" />
      <div className="stage-text">
        <span className="eyebrow">{banner.who === 0 ? '你' : who.name}</span>
        <h2>
          {banner.card && (
            <CardSymbol name={CARDS[banner.card].symbol} size={20} />
          )}
          {banner.title}
        </h2>
        <p>{banner.detail}</p>
      </div>
    </div>
  );
}

function Table({
  s,
  banner,
  foeTargetable,
  foeHinted,
  foeFloaters,
  pledgeBlock,
  onFoe,
  onPledge,
}: {
  s: State;
  banner: Banner | null;
  foeTargetable: boolean;
  foeHinted: boolean;
  foeFloaters: Floater[];
  pledgeBlock: string | null;
  onFoe: () => void;
  onPledge: () => void;
}) {
  const foe = FOES[s.foe.kind];
  const reward = foe.reward + (s.event === EVENT.huntersMoon ? 2 : 0);
  const holder = s.pillar === null ? null : s.players[s.pillar];
  return (
    <div className="table">
      <Stage s={s} banner={banner} />
      {isFinal(s) ? (
        <div className="final-grail">
          <Trophy size={30} strokeWidth={1} />
          <div>
            <span className="eyebrow">MOON BLOOD BESTOWAL</span>
            <h3>月血，只为一人流淌</h3>
            <p>
              每回合 {RULES.final.ap} 行动 · 摸 {RULES.final.draw} 张 · 技能{' '}
              {RULES.final.skills} 次 · 血袭 {RULES.final.slashes} 次
            </p>
            <p className={frenzy(s) ? 'frenzy on' : 'frenzy'}>
              {frenzy(s)
                ? '血月狂潮：所有攻击伤害 +1'
                : `第 ${RULES.frenzyRound} 轮起血月狂潮，所有攻击伤害 +1`}
            </p>
          </div>
        </div>
      ) : (
        <div className="table-objects">
          <button
            type="button"
            className={`foe-card ${foeTargetable ? 'targetable' : ''} ${foeHinted ? 'hinted' : ''}`}
            onClick={onFoe}
          >
            <span
              className="foe-art"
              style={{ backgroundImage: 'url(./media/lowanro.jpg)' }}
            >
              <Skull size={26} />
            </span>
            <span className="foe-info">
              <span className="eyebrow">WANDERING FOE · 狩猎</span>
              <strong>{foe.name}</strong>
              <span
                className="foe-hp"
                aria-label={`体力 ${s.foe.hp}/${foe.hp}`}
              >
                <i style={{ width: `${(s.foe.hp / foe.hp) * 100}%` }} />
              </span>
              <small>
                体力 {s.foe.hp}/{foe.hp} <b>最后一击 +{reward} 美德</b>
              </small>
              <small className="muted">{foe.desc}</small>
            </span>
            <Floaters items={foeFloaters} />
          </button>
          <div className={`pillar-card ${s.phase === 0 ? 'dormant' : ''}`}>
            <span className="eyebrow">BLOOD PLEDGE</span>
            <strong>
              <Flame size={16} /> 血誓之柱
            </strong>
            <p>
              {s.phase === 0
                ? '第 3 轮开启'
                : holder
                  ? `${hero(holder.hero).name}${holder.id === 0 ? '（你）' : ''}持誓`
                  : '无人立誓'}
            </p>
            <small>
              立誓 +{RULES.pledgeVirtue} 美德，守到自己下回合再 +
              {RULES.pillarEcho}；美德高于持誓者不可覆写
            </small>
            <button
              type="button"
              className="quiet small"
              disabled={!!pledgeBlock}
              onClick={onPledge}
              title={pledgeBlock ?? ''}
            >
              <Flag size={13} /> 立誓 · {pledgeCost(s)} 血晶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- sidebar

export function SidePanel({
  s,
  onInspect,
}: {
  s: State;
  onInspect: (id: string) => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [s.serial]);
  const cut = upcomingCut(s);
  const rows = ranking(s);
  const me = s.players[0];
  const rival = s.players[me.sigil];
  const final = isFinal(s);
  return (
    <div className="side-panel">
      <div className="side-title">
        <Trophy size={15} />
        <span>圣杯的注视</span>
        <small>{final ? '生命 · 体力' : '美德排名'}</small>
      </div>
      <ol className="leaderboard">
        {rows.map((p, i) => (
          <li
            key={p.id}
            className={`${p.id === 0 ? 'you' : ''} ${p.alive ? '' : 'out'}`}
          >
            {cut && i === cut.keep && p.alive && (
              <span className="cut-line">
                筛选线 · 第 {cut.round} 轮保留 {cut.keep} 人
                {cut.round - s.round === 1
                  ? '（本轮结束时）'
                  : `（${cut.round - s.round} 轮后）`}
              </span>
            )}
            <span className="rank-no">{i + 1}</span>
            <button
              type="button"
              className="rank-name"
              onClick={() => onInspect(p.hero)}
            >
              {hero(p.hero).name}
              {p.id === 0 && <small>你</small>}
            </button>
            {final && p.alive ? (
              <span className="rank-final">
                {'♥'.repeat(p.lives)} <small>{p.hp}</small>
              </span>
            ) : (
              <strong>{p.virtue}</strong>
            )}
          </li>
        ))}
      </ol>
      {!final && (
        <div className="sigil-panel">
          <Target size={17} />
          <div>
            <span>宿敌刻印{me.sigilDone ? ' · 已完成' : ''}</span>
            <p>击倒 {hero(rival.hero).name}</p>
            <small>
              {me.sigilDone
                ? '已获得额外美德'
                : `首次击倒额外 +${RULES.sigilVirtue} 美德`}
            </small>
          </div>
        </div>
      )}
      <div className="side-title">
        <BookOpen size={14} />
        <span>血战纪事</span>
      </div>
      <div className="battle-log" ref={logRef} aria-live="off">
        {s.log.map((entry, i) => (
          <p key={`${i}-${entry.text}`} className={entry.type}>
            <span>{String(entry.round).padStart(2, '0')}</span>
            {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ match

export function Match({
  s,
  effects,
  interactive,
  onAct,
  onInspect,
  onBoard,
}: {
  s: State;
  effects: Effects;
  /** False while a dialog is open; keyboard shortcuts pause. */
  interactive: boolean;
  onAct: (a: Action) => void;
  onInspect: (heroId: string) => void;
  onBoard: () => void;
}) {
  const me = s.players[0];
  const myTurn = !s.result && !s.pending && s.turn === 0 && me.alive;
  const final = isFinal(s);

  // Transient UI state is stamped with the state it belongs to, so a new game
  // state invalidates it without effects: hints and notices last one action,
  // a selection lasts for the turn while its card is still in hand.
  const [hintState, setHintState] = useState<{
    serial: number;
    value: Scored | null;
  }>({ serial: -1, value: null });
  const [noticeState, setNoticeState] = useState({ serial: -1, text: '' });
  const [picked, setPicked] = useState<{ round: number; value: Selection }>({
    round: -1,
    value: null,
  });
  const hint = hintState.serial === s.serial ? hintState.value : null;
  const notice = noticeState.serial === s.serial ? noticeState.text : '';
  const setHint = (value: Scored | null) =>
    setHintState({ serial: s.serial, value });
  const setNotice = (text: string) =>
    setNoticeState({ serial: s.serial, text });
  const setSelection = (value: Selection) =>
    setPicked({ round: s.round, value });
  const raw = myTurn && picked.round === s.round ? picked.value : null;
  const selection =
    raw?.kind === 'card' && !me.hand.some((c) => c.id === raw.id) ? null : raw;

  const selectedCard =
    selection?.kind === 'card'
      ? me.hand.find((c) => c.id === selection.id)
      : undefined;
  const targetKind = selection?.kind === 'skill' ? 'skill' : selectedCard?.type;
  const needsTarget =
    selection?.kind === 'skill' ||
    (!!selectedCard && CARDS[selectedCard.type].target);
  const targets =
    myTurn && targetKind && needsTarget ? validTargets(s, targetKind) : [];
  const cardBlock = selectedCard ? canPlay(s, selectedCard) : null;

  const blocks = {
    skill: canSkill(s),
    lamp: canLamp(s),
    pledge: canPledge(s),
    upgrade: canUpgrade(s),
  };
  const anyMove =
    myTurn &&
    (me.hand.some((c) => !canPlay(s, c)) ||
      !blocks.skill ||
      !blocks.lamp ||
      !blocks.pledge ||
      !blocks.upgrade);

  const act = (a: Action) => {
    setSelection(null);
    onAct(a);
  };

  const pickTarget = (target: number) => {
    if (!myTurn || !needsTarget || !targets.includes(target)) return false;
    if (selection?.kind === 'skill') act({ type: 'skill', target });
    else if (selectedCard)
      act({ type: 'card', cardId: selectedCard.id, target });
    return true;
  };

  const chooseCard = (id: number) => {
    if (!myTurn) return;
    const card = me.hand.find((c) => c.id === id);
    if (!card) return;
    if (selection?.kind === 'card' && selection.id === id) {
      // A second click plays an untargeted card; otherwise it deselects.
      if (!CARDS[card.type].target && !canPlay(s, card))
        act({ type: 'card', cardId: id });
      else setSelection(null);
      return;
    }
    setSelection({ kind: 'card', id });
    const block = canPlay(s, card);
    setNotice(
      block ??
        (CARDS[card.type].target
          ? '点击亮起的目标出牌。'
          : '再点一次或按「使用」打出。'),
    );
  };

  const toggleSkill = () => {
    if (!myTurn || blocks.skill) return;
    setSelection(selection?.kind === 'skill' ? null : { kind: 'skill' });
    setNotice('点击亮起的目标发动技能。');
  };

  const askHint = () => {
    const best = suggest(s);
    setHint(best);
    if (best) {
      setNotice(`低语：${describeAction(s, best.action)}`);
      if (best.action.type === 'card')
        setSelection({ kind: 'card', id: best.action.cardId });
      if (best.action.type === 'skill') setSelection({ kind: 'skill' });
    }
  };

  // Keyboard: 1–9 cards, S skill, L lamp, P pledge, U upgrade, H hint, E end, Esc cancel.
  const keyState = useRef({
    setSelection,
    myTurn,
    interactive,
    chooseCard,
    toggleSkill,
    askHint,
    act,
    blocks,
    s,
    selectedCard,
  });
  useEffect(() => {
    keyState.current = {
      setSelection,
      myTurn,
      interactive,
      chooseCard,
      toggleSkill,
      askHint,
      act,
      blocks,
      s,
      selectedCard,
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keyState.current;
      if (!k.interactive || !k.myTurn || e.metaKey || e.ctrlKey || e.altKey)
        return;
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      if (/^[1-9]$/.test(key)) {
        const card = k.s.players[0].hand[Number(key) - 1];
        if (card) k.chooseCard(card.id);
      } else if (key === 'escape') k.setSelection(null);
      else if (key === 's') k.toggleSkill();
      else if (key === 'l' && !k.blocks.lamp) k.act({ type: 'lamp' });
      else if (key === 'p' && !k.blocks.pledge) k.act({ type: 'pledge' });
      else if (key === 'u' && !k.blocks.upgrade) k.act({ type: 'upgrade' });
      else if (key === 'h') k.askHint();
      else if (key === 'e') k.act({ type: 'end' });
      else if (
        key === 'enter' &&
        k.selectedCard &&
        !CARDS[k.selectedCard.type].target &&
        !canPlay(k.s, k.selectedCard)
      )
        k.act({ type: 'card', cardId: k.selectedCard.id });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hintTarget =
    hint && (hint.action.type === 'card' || hint.action.type === 'skill')
      ? hint.action.target
      : undefined;
  const hintCard =
    hint?.action.type === 'card' ? hint.action.cardId : undefined;
  const hintKind = hint?.action.type;
  const floatersFor = (seat: number) =>
    effects.floaters.filter((f) => f.seat === seat);
  const hitSeats = new Set(
    effects.floaters
      .filter((f) => f.tone === 'dmg' || f.tone === 'down')
      .map((f) => f.seat),
  );

  const actor = s.pending ? s.pending.target : s.turn;
  const statusTitle = s.result
    ? '血宴落幕'
    : s.pending
      ? s.pending.target === 0
        ? '有攻击需要你响应'
        : `${hero(s.players[actor].hero).name}正在响应`
      : myTurn
        ? '你的出牌阶段'
        : s.spectate
          ? `观战 · ${hero(s.players[s.turn].hero).name}的回合`
          : `${hero(s.players[s.turn].hero).name}的回合`;
  const statusText =
    notice ||
    (myTurn
      ? needsTarget
        ? '点击亮起的敌人或中央强敌。Esc 取消。'
        : anyMove
          ? '选择手牌、技能，或点灯立誓。不确定时可求一句「低语」。'
          : '没有可做的事了——结束回合吧。'
      : '观察其他血族的行动，等待你的时机。');

  return (
    <div className={`match ${final ? 'final' : ''} ${me.alive ? '' : 'gone'}`}>
      <nav className="phasebar" aria-label="牌局阶段">
        <div className="round-counter">
          <span>ROUND</span>
          <strong>{String(s.round).padStart(2, '0')}</strong>
        </div>
        <ol className="phase-steps">
          {PHASES.map((phase, i) => (
            <li
              key={phase.name}
              className={`${s.phase === i ? 'active' : ''} ${s.phase > i ? 'passed' : ''}`}
            >
              <span className="phase-mark">{['I', 'II', 'III', 'IV'][i]}</span>
              <span>
                {phase.name}
                <small>
                  {phase.rounds} · {phase.summary}
                </small>
              </span>
            </li>
          ))}
        </ol>
        <div className="event-chip" title={EVENTS[s.event].text}>
          <Moon size={14} />
          <strong>{EVENTS[s.event].name}</strong>
          <span>{EVENTS[s.event].text}</span>
        </div>
        <div className="deck-count" title="牌堆 / 弃牌">
          <Layers size={16} />
          <span>
            {s.deck.length}
            <small>牌堆</small>
          </span>
        </div>
      </nav>

      <div className="board">
        <div className="arena">
          <div className="opponents">
            {s.players.slice(1).map((p) => (
              <Seat
                key={p.id}
                s={s}
                p={p}
                targetable={needsTarget && targets.includes(p.id)}
                hinted={hintTarget === p.id}
                floaters={floatersFor(p.id)}
                hit={hitSeats.has(p.id)}
                onClick={() => {
                  if (!pickTarget(p.id)) onInspect(p.hero);
                }}
                onInspect={() => onInspect(p.hero)}
              />
            ))}
          </div>
          <Table
            s={s}
            banner={effects.banner}
            foeTargetable={needsTarget && targets.includes(FOE)}
            foeHinted={hintTarget === FOE}
            foeFloaters={floatersFor(FOE)}
            pledgeBlock={myTurn ? blocks.pledge : '等待你的回合'}
            onFoe={() => {
              if (!pickTarget(FOE))
                setNotice(
                  '选择「血袭」「烈火壶」或角色技能，再点击强敌进行狩猎。',
                );
            }}
            onPledge={() => act({ type: 'pledge' })}
          />
          <div
            className={`turn-notice ${myTurn ? 'mine' : ''} ${s.pending?.target === 0 ? 'alert' : ''}`}
            aria-live="polite"
          >
            <span className="notice-icon">
              {myTurn ? <Sword size={16} /> : <Hourglass size={16} />}
            </span>
            <div>
              <strong>{statusTitle}</strong>
              <span>{statusText}</span>
            </div>
            {myTurn && (
              <span
                className="action-pips"
                aria-label={`行动点 ${s.ap}/${turnAP(s)}`}
              >
                {Array.from({ length: turnAP(s) }, (_, i) => (
                  <i className={i < s.ap ? 'lit' : ''} key={i} />
                ))}
                <small>
                  {s.ap}/{turnAP(s)} 行动
                </small>
              </span>
            )}
          </div>
        </div>
        <aside className="side">
          <SidePanel s={s} onInspect={onInspect} />
        </aside>
      </div>

      <section className="dock">
        <div
          className={`self-panel ${hitSeats.has(0) ? 'hit' : ''} ${myTurn ? 'acting' : ''}`}
        >
          <img src={`./media/${me.hero}.jpg`} alt="" />
          <div>
            <span className="eyebrow">
              {me.alive
                ? `本轮第 ${s.order.indexOf(0) + 1} 位行动`
                : 'YOUR BLOODSWORN'}
            </span>
            <button
              type="button"
              className="self-name"
              onClick={() => onInspect(me.hero)}
            >
              <HeroName name={hero(me.hero).name} /> <Eye size={13} />
            </button>
            <Health p={me} />
            <div className="self-res">
              <Stat
                icon={<Gem size={14} />}
                value={me.virtue}
                label="美德"
                tone="virtue"
              />
              <Stat
                icon={<Droplet size={14} />}
                value={`${me.blood}/${RULES.maxBlood}`}
                label="血晶"
                tone="blood"
              />
              <Stat icon={<Shield size={14} />} value={me.armor} label="护甲" />
              <Stat
                icon={<Target size={14} />}
                value={
                  attackRange(s, me) === Infinity ? '∞' : attackRange(s, me)
                }
                label="攻击距离"
              />
              {final && me.alive && (
                <Stat
                  icon={<Heart size={14} />}
                  value={`${me.lives}/${RULES.final.lives}`}
                  label="生命"
                  tone="life"
                />
              )}
            </div>
            <div className="equipped">
              <span className={me.weapon ? 'on' : ''}>
                <Sword size={11} />
                兵装
              </span>
              <span className={me.kin ? 'on' : ''}>
                <Users size={11} />
                眷属
              </span>
              <span className={me.level > 0 ? 'on' : ''}>
                <ChevronsUp size={11} />
                Lv.{me.level}
              </span>
              {me.veil && (
                <span className="on">
                  <Moon size={11} />
                  暗月
                </span>
              )}
            </div>
          </div>
          <Floaters items={floatersFor(0)} />
        </div>

        <div className="hand-area">
          <div className="hand-heading">
            <span>
              手牌 <b>{me.hand.length}</b>
            </span>
            <small>
              血袭 {myTurn ? s.slashes : 0}/{slashLimit(s, me)} · 伤害{' '}
              {slashDamage(s, me)}
            </small>
            <button
              type="button"
              className="text-button board-button"
              onClick={onBoard}
            >
              <Trophy size={13} /> 战况
            </button>
          </div>
          <div
            className="hand-cards"
            style={{ '--count': me.hand.length } as CSSProperties}
          >
            {me.hand.map((c, i) => (
              <PlayingCard
                key={c.id}
                card={c}
                selected={selectedCard?.id === c.id}
                hinted={hintCard === c.id}
                disabled={!myTurn || !!canPlay(s, c)}
                shortcut={i < 9 ? String(i + 1) : undefined}
                onClick={() => chooseCard(c.id)}
              />
            ))}
            {!me.hand.length && (
              <p className="muted empty-hand">手中空无一物。</p>
            )}
          </div>
        </div>

        <div
          className={`detail-panel ${selection || selectedCard ? '' : 'idle'}`}
        >
          {selection?.kind === 'skill' ? (
            <>
              <span className="eyebrow">
                BLOODSWORN SKILL · {skillCost(me)} 血晶
              </span>
              <h3>{hero(me.hero).skill}</h3>
              <p>{hero(me.hero).skillText}</p>
              <p className="detail-hint">点击亮起的目标发动。</p>
            </>
          ) : selectedCard ? (
            <>
              <span className="eyebrow">
                {CARDS[selectedCard.type].category} ·{' '}
                {CARDS[selectedCard.type].sub}
              </span>
              <h3>{CARDS[selectedCard.type].name}</h3>
              <p>{CARDS[selectedCard.type].text}</p>
              {cardBlock ? (
                <p className="detail-hint warn">{cardBlock}</p>
              ) : needsTarget ? (
                <p className="detail-hint">点击亮起的目标出牌。</p>
              ) : (
                <button
                  type="button"
                  className="primary"
                  onClick={() => act({ type: 'card', cardId: selectedCard.id })}
                >
                  使用 <ArrowRight size={16} />
                </button>
              )}
            </>
          ) : !me.alive ? (
            <>
              <span className="eyebrow">SPECTATING</span>
              <h3>你已离场</h3>
              <p>以亡者之眼见证终局。暂停菜单可随时返回夜之馆。</p>
            </>
          ) : (
            <>
              <span className="eyebrow">TACTICAL NOTE</span>
              <h3>{final ? '让长夜见证你的血' : '美德，比杀戮更重要'}</h3>
              <p>
                {final
                  ? '最后存活者胜利。倒下会燃尽一条生命，第二条命以半数体力 +1 重返。'
                  : '点灯与狩猎稳定积累美德；击倒血族 +3，自己倒下 −2。留一张闪应对突袭。'}
              </p>
            </>
          )}
        </div>
      </section>

      <div className="toolbar">
        <button
          type="button"
          className={`tool skill ${selection?.kind === 'skill' ? 'active' : ''} ${hintKind === 'skill' ? 'hinted' : ''}`}
          disabled={!myTurn || !!blocks.skill}
          title={blocks.skill ?? ''}
          onClick={toggleSkill}
        >
          <Droplet size={17} />
          <span>
            {hero(me.hero).skill}
            <small>
              {skillCost(me)} 血晶 · {myTurn ? s.skillUses : 0}/{skillLimit(s)}{' '}
              次
            </small>
          </span>
          <kbd>S</kbd>
        </button>
        {!final && (
          <button
            type="button"
            className={`tool ${hintKind === 'lamp' ? 'hinted' : ''}`}
            disabled={!myTurn || !!blocks.lamp}
            title={blocks.lamp ?? ''}
            onClick={() => act({ type: 'lamp' })}
          >
            <Flame size={17} />
            <span>
              点燃遗骸
              <small>+1 美德 · 血晶 · 摸牌</small>
            </span>
            <kbd>L</kbd>
          </button>
        )}
        {!final && (
          <button
            type="button"
            className={`tool ${hintKind === 'pledge' ? 'hinted' : ''}`}
            disabled={!myTurn || !!blocks.pledge}
            title={blocks.pledge ?? ''}
            onClick={() => act({ type: 'pledge' })}
          >
            <Flag size={17} />
            <span>
              血誓立誓
              <small>
                {s.phase === 0
                  ? '第 3 轮开启'
                  : `${pledgeCost(s)} 血晶 · +${RULES.pledgeVirtue} 美德`}
              </small>
            </span>
            <kbd>P</kbd>
          </button>
        )}
        <button
          type="button"
          className={`tool ${hintKind === 'upgrade' ? 'hinted' : ''}`}
          disabled={!myTurn || !!blocks.upgrade}
          title={blocks.upgrade ?? ''}
          onClick={() => act({ type: 'upgrade' })}
        >
          <ChevronsUp size={17} />
          <span>
            强化血脉
            <small>
              {me.level === 0
                ? `${RULES.upgradeCost} 血晶 · 血袭伤害 +1`
                : me.level === 1
                  ? `${RULES.upgradeCost} 血晶 · 技能消耗 −1`
                  : '血脉已完全觉醒'}
            </small>
          </span>
          <kbd>U</kbd>
        </button>
        <button
          type="button"
          className="tool hint"
          disabled={!myTurn}
          onClick={askHint}
        >
          <Lightbulb size={17} />
          <span>
            低语
            <small>求一句建议</small>
          </span>
          <kbd>H</kbd>
        </button>
        <button
          type="button"
          className={`end-turn ${myTurn && !anyMove ? 'pulse' : ''} ${hintKind === 'end' ? 'hinted' : ''}`}
          disabled={!myTurn}
          onClick={() => act({ type: 'end' })}
        >
          结束回合 <ChevronRight size={18} />
          <kbd>E</kbd>
        </button>
      </div>
    </div>
  );
}
