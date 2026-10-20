import {
  CARDS,
  EVENT,
  EVENTS,
  FOES,
  HEROES,
  PHASES,
  RULES,
  hero,
} from './data.ts';
import {
  actorOf,
  alivePlayers,
  canLamp,
  canPlay,
  canPledge,
  canSkill,
  canUpgrade,
  compareStanding,
  handLimit,
  isFinal,
  judgeScore,
  phaseOfRound,
  pledgeCost,
  finalHpBonus,
  frenzy,
  respawnHp,
  responses,
  skillCost,
  slashDamage,
  turnAP,
  validTargets,
} from './rules.ts';
import {
  FOE,
  type Action,
  type Card,
  type CardType,
  type Difficulty,
  type Fx,
  type LogEntry,
  type Player,
  type Seat,
  type State,
  type Suit,
} from './types.ts';

const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
const RANKS = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];
const LOG_LIMIT = 160;

// ---------------------------------------------------------------- utilities

/** Structural copy, far cheaper than a JSON round-trip (the AI clones a lot). */
export function cloneState(s: State): State {
  return {
    ...s,
    players: s.players.map((p) => ({ ...p, hand: p.hand.slice() })),
    deck: s.deck.slice(),
    discard: s.discard.slice(),
    order: s.order.slice(),
    foe: { ...s.foe },
    pending: s.pending && { ...s.pending },
    log: s.log.slice(),
    fx: [],
    eliminated: s.eliminated.slice(),
    result: s.result && { ...s.result },
  };
}

/** Linear congruential generator; the seed lives in the state so replays are exact. */
export function random(s: State): number {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}

export function shuffle<T>(s: State, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const pname = (s: State, id: Seat) => hero(s.players[id].hero).name;

function log(s: State, text: string, type: LogEntry['type'] = 'normal') {
  s.log.push({ text, round: s.round, type });
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
}

const fx = (s: State, effect: Fx) => s.fx.push(effect);

// --------------------------------------------------------- resource helpers

function gainVirtue(s: State, p: Player, amount: number) {
  const next = Math.max(0, p.virtue + amount);
  const delta = next - p.virtue;
  p.virtue = next;
  if (delta) fx(s, { t: 'virtue', who: p.id, amount: delta });
}

function gainBlood(s: State, p: Player, amount: number) {
  const next = Math.min(RULES.maxBlood, Math.max(0, p.blood + amount));
  const delta = next - p.blood;
  p.blood = next;
  if (delta) fx(s, { t: 'blood', who: p.id, amount: delta });
}

function heal(s: State, p: Player, amount: number) {
  const next = Math.min(p.maxHp, p.hp + amount);
  const delta = next - p.hp;
  p.hp = next;
  if (delta > 0) fx(s, { t: 'heal', who: p.id, amount: delta });
}

function draw(s: State, p: Player, n: number) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) {
      s.deck = shuffle(s, s.discard.splice(0));
      if (!s.deck.length) return;
      log(s, '牌堆耗尽，弃牌重新洗入。');
    }
    p.hand.push(s.deck.pop()!);
  }
}

function discardCard(s: State, p: Player, id: number): Card | undefined {
  const i = p.hand.findIndex((c) => c.id === id);
  if (i < 0) return undefined;
  const [card] = p.hand.splice(i, 1);
  s.discard.push(card);
  return card;
}

// ------------------------------------------------------------------- setup

export function createGame(
  chosen: string,
  difficulty: Difficulty = 'normal',
  seed: number = Date.now(),
): State {
  const s: State = {
    version: 2,
    matchId: seed >>> 0,
    seed: seed >>> 0,
    players: [],
    deck: [],
    discard: [],
    turn: 0,
    round: 1,
    phase: 0,
    order: [],
    starter: 0,
    ap: 0,
    slashes: 0,
    skillUses: 0,
    lit: false,
    pledged: false,
    upgraded: false,
    bonusUsed: false,
    drained: false,
    event: EVENT.calm,
    foe: { kind: 0, hp: FOES[0].hp },
    pillar: null,
    pending: null,
    log: [],
    fx: [],
    eliminated: [],
    result: null,
    spectate: false,
    difficulty,
    serial: 0,
  };
  // Opponents take random seats so every match has a different table.
  const rivals = shuffle(
    s,
    HEROES.filter((h) => h.id !== chosen),
  );
  s.players = [hero(chosen), ...rivals].map((h, i) => ({
    id: i,
    hero: h.id,
    hp: h.hp,
    maxHp: h.hp,
    virtue: 0,
    blood: RULES.startBlood,
    hand: [],
    armor: 0,
    weapon: false,
    kin: false,
    alive: true,
    lives: RULES.final.lives,
    ally: null,
    allianceUntil: 0,
    revenge: false,
    counter: false,
    veil: false,
    moonstep: false,
    level: 0,
    kills: 0,
    falls: 0,
    sigil: (i + 3) % RULES.seats,
    sigilDone: false,
  }));
  let id = 0;
  for (const type of Object.keys(CARDS) as CardType[]) {
    for (let i = 0; i < CARDS[type].count; i++, id++) {
      s.deck.push({ id, type, suit: SUITS[id % 4], rank: RANKS[id % 13] });
    }
  }
  shuffle(s, s.deck);
  for (const p of s.players) draw(s, p, RULES.startHand);
  log(s, '黄昏降临。狩猎、点灯、立誓，争夺圣杯的注视。', 'phase');
  s.order = s.players.map((p) => p.id);
  fx(s, { t: 'round', round: 1, phase: 0, event: s.event });
  beginTurn(s);
  return s;
}

// ------------------------------------------------------------ damage & death

function finishIfNeeded(s: State) {
  if (s.result) return;
  const alive = alivePlayers(s);
  if (alive.length === 1) {
    s.result = {
      winner: alive[0].id,
      reason: `${pname(s, alive[0].id)}是最后的血族，月血为其流淌。`,
    };
  } else if (!s.players[0].alive && !s.spectate) {
    s.result = {
      winner: null,
      reason: isFinal(s)
        ? '两次生命已经耗尽，月血未曾垂怜。'
        : '你的美德不足，被圣杯筛除。',
    };
  }
  if (s.result) s.pending = null;
}

function breakAlliance(s: State, p: Player) {
  if (p.ally !== null) {
    const other = s.players[p.ally];
    if (other.ally === p.id) {
      other.ally = null;
      other.allianceUntil = 0;
    }
  }
  p.ally = null;
  p.allianceUntil = 0;
}

function eliminate(s: State, p: Player) {
  p.alive = false;
  p.hp = 0;
  breakAlliance(s, p);
  if (s.pillar === p.id) s.pillar = null;
  s.eliminated.push(p.id);
  fx(s, { t: 'out', who: p.id });
}

/** Deal damage from `source` (a seat or FOE). Armor soaks first unless ignored. */
function dealDamage(
  s: State,
  targetId: Seat,
  amount: number,
  source: number,
  ignoreArmor = false,
) {
  const t = s.players[targetId];
  if (!t.alive || amount <= 0) return;
  if (!ignoreArmor && t.armor > 0) {
    const blocked = Math.min(t.armor, amount);
    t.armor -= blocked;
    amount -= blocked;
    fx(s, { t: 'block', who: t.id, amount: blocked });
    log(s, `${pname(s, t.id)}的屏障吸收了 ${blocked} 点伤害。`);
  }
  if (t.veil && source >= 0 && source !== t.id) {
    t.veil = false;
    amount--;
    fx(s, { t: 'veil', who: t.id });
    log(s, `${pname(s, t.id)}的暗月削弱了 1 点伤害。`);
  }
  if (amount <= 0) return;
  const attacker = source >= 0 ? s.players[source] : null;
  const virtueBefore = t.virtue;
  t.hp -= amount;
  fx(s, { t: 'damage', who: t.id, amount, source });
  log(s, `${pname(s, t.id)}受到 ${amount} 点伤害。`, 'damage');
  if (t.hero === 'jan') t.revenge = true;

  if (attacker && attacker.id !== t.id) {
    if (attacker.id === s.turn && !s.drained) {
      s.drained = true;
      gainBlood(s, attacker, RULES.drainBlood);
    }
    if (
      attacker.hero === 'albert' &&
      !s.bonusUsed &&
      virtueBefore >= attacker.virtue
    ) {
      s.bonusUsed = true;
      gainVirtue(s, attacker, 1);
      log(s, '起义者：阿尔伯特获得 1 美德。', 'gain');
    }
    if (attacker.revenge) {
      attacker.revenge = false;
      heal(s, attacker, 1);
      gainBlood(s, attacker, 1);
      log(s, '血手传承：血手扬恢复 1 点体力并获得 1 血晶。', 'gain');
    }
  }

  while (t.hp <= 0) {
    const needle = t.hand.find((c) => c.type === 'heal');
    if (!needle) break;
    discardCard(s, t, needle.id);
    t.hp++;
    fx(s, { t: 'heal', who: t.id, amount: 1 });
    log(s, `${pname(s, t.id)}濒死，自动注射金血针。`, 'gain');
  }
  if (t.hp > 0) return;
  knockDown(s, t, attacker);
}

function knockDown(s: State, t: Player, attacker: Player | null) {
  fx(s, { t: 'down', who: t.id, source: attacker ? attacker.id : FOE });
  t.falls++;
  if (attacker && attacker.id !== t.id) {
    attacker.kills++;
    gainVirtue(s, attacker, RULES.killVirtue);
    gainBlood(s, attacker, RULES.killBlood);
    draw(s, attacker, 1);
    log(
      s,
      `${pname(s, attacker.id)}击倒${pname(s, t.id)}：+${RULES.killVirtue} 美德、+${RULES.killBlood} 血晶、摸 1 张牌。`,
      'gain',
    );
    if (attacker.sigil === t.id && !attacker.sigilDone) {
      attacker.sigilDone = true;
      gainVirtue(s, attacker, RULES.sigilVirtue);
      log(
        s,
        `${pname(s, attacker.id)}完成宿敌刻印，额外 +${RULES.sigilVirtue} 美德。`,
        'gain',
      );
    }
    if (attacker.hero === 'zork' && attacker.maxHp < 7) {
      attacker.maxHp++;
      heal(s, attacker, 1);
      log(s, '深海法则：佐克的体力上限 +1。', 'gain');
    }
  }
  if (!isFinal(s)) {
    t.hp = t.maxHp;
    t.armor = 0;
    gainVirtue(s, t, -RULES.deathPenalty);
    log(s, `${pname(s, t.id)}倒下后重生，失去 ${RULES.deathPenalty} 美德。`);
    return;
  }
  t.lives--;
  if (t.lives > 0) {
    t.hp = respawnHp(t);
    t.armor = 0;
    log(
      s,
      `${pname(s, t.id)}燃尽一条生命，以 ${t.hp} 点体力重返战场。`,
      'phase',
    );
  } else {
    eliminate(s, t);
    log(s, `${pname(s, t.id)}离开了这场血宴。`, 'damage');
  }
  finishIfNeeded(s);
}

// ---------------------------------------------------------------- attacks

function huntFoe(s: State, p: Player, amount: number, label: string) {
  amount += p.kin ? 1 : 0;
  s.foe.hp -= amount;
  fx(s, { t: 'damage', who: FOE, amount, source: p.id });
  log(s, `${pname(s, p.id)}以${label}狩猎，造成 ${amount} 点伤害。`);
  const kind = s.foe.kind;
  const foe = FOES[kind];
  if (s.foe.hp <= 0) {
    const reward = foe.reward + (s.event === EVENT.huntersMoon ? 2 : 0);
    gainVirtue(s, p, reward);
    gainBlood(s, p, kind === 1 ? 3 : 1);
    draw(s, p, 1);
    fx(s, { t: 'foe', who: p.id, kind });
    log(
      s,
      `${pname(s, p.id)}击败${foe.name}：+${reward} 美德、血晶与战利品。`,
      'gain',
    );
    s.foe.kind = (kind + 1) % FOES.length;
    s.foe.hp = FOES[s.foe.kind].hp;
    log(s, `${FOES[s.foe.kind].name}出现在洛安罗。`);
  } else if (kind === 2) {
    log(s, `${foe.name}反噬了${pname(s, p.id)}。`, 'damage');
    dealDamage(s, p.id, 1, FOE, true);
  }
}

/** Start an attack; the target answers through a `respond` action. */
function attack(
  s: State,
  source: Seat,
  target: number,
  amount: number,
  label: string,
  kind: 'attack' | 'duel' = 'attack',
  ignoreArmor = false,
) {
  const p = s.players[source];
  if (target === FOE) {
    huntFoe(s, p, amount, label);
    return;
  }
  if (frenzy(s)) amount++;
  s.pending = { kind, source, target, amount, label, ignoreArmor };
}

function defend(s: State, card: Card) {
  const pending = s.pending!;
  const p = s.players[pending.target];
  discardCard(s, p, card.id);
  fx(s, { t: 'defend', who: p.id, card: card.type });
  if (pending.kind === 'duel') {
    log(s, `${pname(s, p.id)}以「血袭」迎战。`);
    s.pending = { ...pending, source: pending.target, target: pending.source };
    return;
  }
  log(
    s,
    `${pname(s, p.id)}以「${CARDS[card.type].name}」化解了${pending.label}。`,
  );
  if (card.type === 'howl') {
    gainBlood(s, s.players[pending.source], -1);
  }
  if (p.hero === 'samir' && (card.type === 'dodge' || card.type === 'howl'))
    p.counter = true;
  if (p.hero === 'lanh' && card.type === 'slash') p.moonstep = true;
  s.pending = null;
}

// -------------------------------------------------------------- turn flow

function beginTurn(s: State) {
  if (s.result) return;
  const p = s.players[s.turn];
  const final = isFinal(s);
  const lim = final ? RULES.final : RULES.early;
  s.ap = turnAP(s);
  s.slashes = 0;
  s.skillUses = 0;
  s.lit = false;
  s.pledged = false;
  s.upgraded = false;
  s.bonusUsed = false;
  s.drained = false;
  p.veil = false;
  p.moonstep = false;
  fx(s, { t: 'turn', who: p.id });
  log(
    s,
    `${pname(s, p.id)}的回合：摸 ${lim.draw} 张牌，+${lim.blood} 血晶。`,
    'turn',
  );
  gainBlood(s, p, lim.blood);
  draw(s, p, lim.draw);
  if (p.hero === 'layla' && p.hp < p.maxHp) {
    heal(s, p, 1);
    log(s, '涅布拉血统：蕾拉恢复 1 点体力。', 'gain');
  }
  if (s.pillar === p.id && !final) {
    gainVirtue(s, p, RULES.pillarEcho);
    log(
      s,
      `血誓回响：${pname(s, p.id)}守住了誓言，+${RULES.pillarEcho} 美德。`,
      'gain',
    );
  }
}

/** Value used to decide which cards survive the end-of-turn hand limit. */
const KEEP_VALUE: Partial<Record<CardType, number>> = {
  heal: 9,
  dodge: 8,
  howl: 8,
  slash: 7,
  duel: 6,
  supply: 6,
  fire: 5,
  blood: 5,
};

function trimHand(s: State, p: Player) {
  const limit = handLimit(s, p);
  const excess = p.hand.length - limit;
  if (excess <= 0) return;
  const worst = [...p.hand]
    .sort((a, b) => (KEEP_VALUE[a.type] ?? 4) - (KEEP_VALUE[b.type] ?? 4))
    .slice(0, excess);
  for (const c of worst) discardCard(s, p, c.id);
  const names = worst.map((c) => `「${CARDS[c.type].name}」`).join('');
  log(
    s,
    `${pname(s, p.id)}弃置 ${excess} 张牌${p.id === 0 ? `：${names}` : ''}。`,
  );
}

function applyCut(s: State, keep: number) {
  const survivors = new Set(
    alivePlayers(s)
      .sort(compareStanding)
      .slice(0, keep)
      .map((p) => p.id),
  );
  const cut = alivePlayers(s).filter((p) => !survivors.has(p.id));
  // Lowest standing leaves first, so the elimination record reads bottom-up.
  cut.sort(compareStanding).reverse();
  for (const p of cut) {
    eliminate(s, p);
    log(s, `${pname(s, p.id)}被圣杯筛除（${p.virtue} 美德）。`, 'damage');
  }
  if (cut.length) fx(s, { t: 'cut', who: cut.map((p) => p.id) });
}

function enterFinal(s: State) {
  s.pillar = null;
  for (const p of alivePlayers(s)) {
    breakAlliance(s, p);
    p.lives = RULES.final.lives;
    p.maxHp += finalHpBonus(p);
    p.hp = p.maxHp;
    gainBlood(s, p, 3);
    draw(s, p, 3);
  }
  log(
    s,
    '月血赐福：同盟解散，三名血族满血、各有两条生命，补给 3 张牌与 3 血晶。每 10 美德 +1 体力上限（至多 +2）。',
    'phase',
  );
}

function startRound(s: State) {
  s.round++;
  const phase = phaseOfRound(s.round);
  if (phase !== s.phase) {
    s.phase = phase;
    log(s, `第 ${phase + 1} 阶段 · ${PHASES[phase].name}`, 'phase');
  }
  const cut = RULES.cuts.find((c) => c.round === s.round);
  if (cut) applyCut(s, cut.keep);
  if (s.round === RULES.finalRound) enterFinal(s);

  if (s.round >= RULES.lastRound) {
    const best = alivePlayers(s).sort(
      (a, b) => judgeScore(b) - judgeScore(a) || compareStanding(a, b),
    )[0];
    s.result = {
      winner: best.id,
      reason: '长夜终结：圣杯按「生命 ×20 + 体力 + 美德」裁定赐血者。',
    };
    log(s, '长夜终结，圣杯作出最终裁决。', 'phase');
    return;
  }

  for (const p of s.players)
    if (p.ally !== null && p.allianceUntil < s.round) breakAlliance(s, p);
  s.event = 1 + Math.floor(random(s) * (EVENTS.length - 1));
  log(s, `异象 · ${EVENTS[s.event].name}：${EVENTS[s.event].text}`, 'phase');
  for (const p of alivePlayers(s)) {
    if (s.event === EVENT.tide) gainBlood(s, p, 1);
    if (s.event === EVENT.gift) draw(s, p, 1);
    if (s.event === EVENT.whisper) heal(s, p, 1);
  }

  // Turn order: the grail watches the leader first. Highest virtue acts
  // first and the trailing seats act last, so nobody is fixed into a late
  // seat before the cuts. Ties follow a ring that rotates every round.
  const ring = s.players.map((p) => p.id);
  const pivot = s.round % ring.length;
  const rotated = [...ring.slice(pivot), ...ring.slice(0, pivot)];
  s.order = rotated
    .filter((id) => s.players[id].alive)
    .sort((a, b) => s.players[b].virtue - s.players[a].virtue);
  s.starter = s.order[0];
  fx(s, { t: 'round', round: s.round, phase: s.phase, event: s.event });
}

function endTurn(s: State) {
  const p = s.players[s.turn];
  if (p.alive) trimHand(s, p);
  const at = s.order.indexOf(s.turn);
  const next = s.order.slice(at + 1).find((id) => s.players[id].alive);
  if (next === undefined) {
    startRound(s);
    if (s.result) return;
    s.turn = s.order[0];
  } else {
    s.turn = next;
  }
  beginTurn(s);
}

// ---------------------------------------------------------------- actions

function playCard(s: State, p: Player, card: Card, target: number) {
  const data = CARDS[card.type];
  discardCard(s, p, card.id);
  s.ap--;
  fx(s, {
    t: 'card',
    who: p.id,
    card: card.type,
    target: data.target ? target : undefined,
  });
  const on = data.target
    ? target === FOE
      ? FOES[s.foe.kind].name
      : pname(s, target)
    : '';
  log(s, `${pname(s, p.id)}打出「${data.name}」${on ? `，目标${on}` : ''}。`);
  switch (card.type) {
    case 'slash': {
      s.slashes++;
      const amount = slashDamage(s, p);
      p.counter = false;
      attack(s, p.id, target, amount, data.name);
      break;
    }
    case 'heal':
      heal(s, p, 1);
      break;
    case 'duel':
      attack(s, p.id, target, 2, data.name, 'duel');
      break;
    case 'fire':
      attack(s, p.id, target, 1, data.name);
      break;
    case 'steal': {
      const t = s.players[target];
      if (t.hand.length) {
        const [taken] = t.hand.splice(Math.floor(random(s) * t.hand.length), 1);
        p.hand.push(taken);
      }
      if (t.blood > 0) {
        gainBlood(s, t, -1);
        gainBlood(s, p, 1);
      }
      fx(s, { t: 'steal', who: p.id, from: t.id });
      break;
    }
    case 'supply':
      draw(s, p, 2);
      break;
    case 'weapon':
      p.weapon = true;
      break;
    case 'armor':
      p.armor = Math.min(RULES.maxArmor, p.armor + 2);
      break;
    case 'kin':
      if (p.kin) draw(s, p, 2);
      else p.kin = true;
      break;
    case 'blood':
      gainBlood(s, p, 2);
      break;
    case 'oath': {
      const t = s.players[target];
      breakAlliance(s, p);
      breakAlliance(s, t);
      p.ally = t.id;
      t.ally = p.id;
      p.allianceUntil = t.allianceUntil = s.round + 1;
      gainVirtue(s, p, 1);
      draw(s, p, 1);
      draw(s, t, 1);
      fx(s, { t: 'ally', who: p.id, with: t.id });
      log(
        s,
        `${pname(s, p.id)}与${pname(s, t.id)}缔结同盟，持续至第 ${p.allianceUntil} 轮结束。`,
        'gain',
      );
      break;
    }
    default:
      break;
  }
}

function castSkill(s: State, p: Player, target: number) {
  const h = hero(p.hero);
  gainBlood(s, p, -skillCost(p));
  s.ap--;
  s.skillUses++;
  fx(s, { t: 'skill', who: p.id, target });
  const on = target === FOE ? FOES[s.foe.kind].name : pname(s, target);
  log(s, `${h.name}发动「${h.skill}」，目标${on}。`, 'skill');
  switch (p.hero) {
    case 'albert': {
      const leader = target === FOE || s.players[target].virtue >= p.virtue;
      attack(s, p.id, target, leader ? 2 : 1, h.skill);
      break;
    }
    case 'jan':
      p.hp--;
      p.revenge = true;
      fx(s, { t: 'damage', who: p.id, amount: 1, source: p.id });
      attack(s, p.id, target, 3, h.skill);
      break;
    case 'lanh':
      attack(s, p.id, target, 2, h.skill);
      p.veil = true;
      break;
    case 'layla':
      attack(s, p.id, target, 3, h.skill);
      break;
    case 'samir':
      attack(s, p.id, target, 2, h.skill);
      p.armor = Math.min(RULES.maxArmor, p.armor + 1);
      break;
    case 'zork':
      attack(s, p.id, target, 2, h.skill, 'attack', true);
      break;
  }
}

/**
 * Apply an action. Returns the same object for an illegal action, so callers
 * can detect rejection with `next === state`.
 */
export function reduceGame(state: State, action: Action): State {
  if (state.result) return state;
  const s = cloneState(state);

  if (action.type === 'respond') {
    const pending = s.pending;
    if (!pending) return state;
    if (action.cardId !== undefined) {
      const card = responses(s).find((c) => c.id === action.cardId);
      if (!card) return state;
      defend(s, card);
    } else {
      s.pending = null;
      dealDamage(
        s,
        pending.target,
        pending.amount,
        pending.source,
        pending.ignoreArmor,
      );
    }
  } else {
    if (s.pending) return state;
    const p = s.players[s.turn];
    switch (action.type) {
      case 'end':
        endTurn(s);
        break;
      case 'card': {
        const card = p.hand.find((c) => c.id === action.cardId);
        if (!card || canPlay(s, card)) return state;
        const needsTarget = CARDS[card.type].target;
        const target = action.target ?? FOE;
        if (
          needsTarget &&
          (action.target === undefined ||
            !validTargets(s, card.type).includes(target))
        )
          return state;
        playCard(s, p, card, target);
        break;
      }
      case 'skill':
        if (canSkill(s) || !validTargets(s, 'skill').includes(action.target))
          return state;
        castSkill(s, p, action.target);
        break;
      case 'lamp':
        if (canLamp(s)) return state;
        s.lit = true;
        s.ap--;
        fx(s, { t: 'lamp', who: p.id });
        gainVirtue(s, p, 1);
        gainBlood(s, p, 1);
        draw(s, p, 1);
        log(
          s,
          `${pname(s, p.id)}点燃遗骸之灯：+1 美德、+1 血晶、摸 1 张牌。`,
          'gain',
        );
        break;
      case 'pledge': {
        if (canPledge(s)) return state;
        const prev = s.pillar;
        gainBlood(s, p, -pledgeCost(s));
        s.pledged = true;
        s.ap--;
        s.pillar = p.id;
        fx(s, { t: 'pledge', who: p.id });
        gainVirtue(s, p, RULES.pledgeVirtue);
        log(
          s,
          prev === null
            ? `${pname(s, p.id)}在血誓之柱立誓，+${RULES.pledgeVirtue} 美德。`
            : `${pname(s, p.id)}覆写了${pname(s, prev)}的血誓，+${RULES.pledgeVirtue} 美德。`,
          'gain',
        );
        break;
      }
      case 'upgrade':
        if (canUpgrade(s)) return state;
        gainBlood(s, p, -RULES.upgradeCost);
        s.upgraded = true;
        s.ap--;
        p.level++;
        fx(s, { t: 'upgrade', who: p.id, level: p.level });
        log(s, `${pname(s, p.id)}强化血脉至 ${p.level} 级。`, 'gain');
        break;
    }
  }

  // A player knocked out of the final on their own turn hands play onward.
  if (!s.result && !s.pending && !s.players[s.turn].alive) endTurn(s);
  finishIfNeeded(s);
  s.serial++;
  return s;
}

/** True when it is the human's move (main phase or response). */
export const humanToAct = (s: State) => !s.result && actorOf(s) === 0;

/** Let the AI finish a match the human has already lost. */
export function startSpectating(state: State): State {
  if (!state.result || state.result.winner !== null || state.players[0].alive)
    return state;
  const s = cloneState(state);
  s.result = null;
  s.spectate = true;
  log(s, '你的血已冷却。以亡者之眼，见证这场血宴的终局。', 'phase');
  s.serial++;
  return s;
}
