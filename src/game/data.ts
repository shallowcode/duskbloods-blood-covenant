import type { CardType, HeroId } from './types.ts';

export interface HeroData {
  id: HeroId;
  name: string;
  en: string;
  title: string;
  style: string;
  hp: number;
  /** Slash range; Infinity for Layla. */
  range: number;
  color: string;
  weapon: string;
  skill: string;
  cost: number;
  skillText: string;
  passive: string;
  passiveText: string;
  quote: string;
  /** Offense, survival, complexity — 1 to 5. */
  ratings: [number, number, number];
  tip: string;
}

export const HEROES: readonly HeroData[] = [
  {
    id: 'albert',
    name: '阿尔伯特',
    en: 'Albert',
    title: '洛里克的继血者',
    style: '均衡 · 血刃 · 讨伐',
    hp: 5,
    range: 1,
    color: '#bc7665',
    weapon: '宝石军刀 / 冲锋枪',
    skill: '血之刃',
    cost: 2,
    skillText:
      '对任意目标造成 1 点伤害，可用「闪」响应；目标美德不低于你时，改为 2 点。',
    passive: '起义者',
    passiveText: '每回合首次对美德不低于你的血族造成伤害时，获得 1 美德。',
    quote: '高贵的血，从不向命运俯首。',
    ratings: [4, 3, 2],
    tip: '紧咬排名领先者：每次讨伐都在缩小差距。',
  },
  {
    id: 'jan',
    name: '血手扬',
    en: 'Bloodhand Jan',
    title: '渴血战斧的主人',
    style: '近战 · 反击 · 吸血',
    hp: 5,
    range: 1,
    color: '#ba514a',
    weapon: '渴血战斧 / 魔术石',
    skill: '臣服吾血',
    cost: 2,
    skillText:
      '失去 1 点体力并获得「复仇」，对任意目标造成 3 点伤害，可用「闪」响应。体力为 1 时不可发动。',
    passive: '血手传承',
    passiveText:
      '受伤后获得「复仇」：下一次造成伤害时恢复 1 点体力并获得 1 血晶。',
    quote: '听见了吗？我的斧头，仍在饥渴。',
    ratings: [5, 3, 3],
    tip: '用体力换伤害，再靠「复仇」把血吸回来。',
  },
  {
    id: 'lanh',
    name: '庄兰',
    en: 'Trang Lanh',
    title: '暗月的新娘',
    style: '隐匿 · 银蛇 · 机动',
    hp: 4,
    range: 2,
    color: '#b7b7ba',
    weapon: '满月轮刃',
    skill: '娜塔之母',
    cost: 3,
    skillText:
      '召来银蛇，对任意目标造成 2 点伤害，可用「闪」响应。随后获得「暗月」：你下回合开始前，下一次受到的伤害 -1。',
    passive: '暗月之女',
    passiveText:
      '受到攻击时，可将「血袭」当作「夜行」打出；自你的回合起，每轮限一次。',
    quote: '月光落下之处，银蛇静候。',
    ratings: [3, 5, 4],
    tip: '血袭兼作闪避，手牌越多越难被击倒。',
  },
  {
    id: 'layla',
    name: '狙击手蕾拉',
    en: 'Sniper Layla',
    title: '涅布拉的长夜之眼',
    style: '远程 · 狙杀 · 再生',
    hp: 4,
    range: Infinity,
    color: '#b8a382',
    weapon: '象形拳刃 / 狙击步枪',
    skill: '维尔德机枪',
    cost: 3,
    skillText: '对任意目标造成 3 点伤害，可用一张「闪」闪避整次扫射。',
    passive: '涅布拉血统',
    passiveText: '血袭无距离限制。每个回合开始时恢复 1 点体力。',
    quote: '死亡来临之前，你听不见枪声。',
    ratings: [5, 2, 3],
    tip: '远距离点杀残血者，收割击倒奖励。',
  },
  {
    id: 'samir',
    name: '萨米尔·帕特雷斯',
    en: 'Senator Samir Patres',
    title: '元老院的古血议员',
    style: '防御 · 血桩 · 蜥化',
    hp: 4,
    range: 1,
    color: '#a592bc',
    weapon: '元老院刺剑 / 灵鸟戒指',
    skill: '蜥龙化身',
    cost: 2,
    skillText:
      '化作古兽，对任意目标造成 2 点伤害，可用「闪」响应。随后获得 1 护甲。',
    passive: '不动之剑',
    passiveText: '用「夜行」或「震慑之啸」成功防御后，下一张「血袭」伤害 +1。',
    quote: '王朝化为尘土，古血依旧奔流。',
    ratings: [3, 4, 3],
    tip: '护甲与反击并行，越挨打越危险。',
  },
  {
    id: 'zork',
    name: '佐克',
    en: 'Zork',
    title: '深海归来的铁壳',
    style: '重甲 · 火箭 · 掠夺',
    hp: 5,
    range: 1,
    color: '#9b9986',
    weapon: '海底电缆 / 鱼叉枪',
    skill: '人体火箭',
    cost: 3,
    skillText: '冲撞任意目标，造成 2 点伤害，可用「闪」响应。无视护甲。',
    passive: '深海法则',
    passiveText: '击倒血族后，体力上限 +1（最多 7）并恢复 1 点体力。',
    quote: '沉寂的深海之下，铁壳仍有心跳。',
    ratings: [4, 5, 1],
    tip: '血厚甲硬，最适合新手；越战越强。',
  },
];

export const hero = (id: string): HeroData => {
  const found = HEROES.find((h) => h.id === id);
  if (!found) throw new Error(`Unknown hero ${id}`);
  return found;
};

export type CardCategory = '基本' | '谋略' | '装备';

export interface CardData {
  name: string;
  /** The Sanguosha card it mirrors, for players who know the genre. */
  sub: string;
  category: CardCategory;
  symbol: string;
  /** Short rules text printed on the card face. */
  short: string;
  text: string;
  target: boolean;
  /** Cards that only ever leave the hand as responses. */
  reaction: boolean;
  count: number;
}

export const CARDS: Record<CardType, CardData> = {
  slash: {
    name: '血袭',
    sub: '杀',
    category: '基本',
    symbol: 'sword',
    short: '距离内 1 伤害',
    text: '对攻击范围内的一名血族或中央强敌造成 1 点伤害，可用「闪」响应。每回合限用 1 次。',
    target: true,
    reaction: false,
    count: 24,
  },
  dodge: {
    name: '夜行',
    sub: '闪',
    category: '基本',
    symbol: 'moon',
    short: '抵消一次攻击',
    text: '受到攻击时打出，抵消这次伤害。',
    target: false,
    reaction: true,
    count: 18,
  },
  heal: {
    name: '金血针',
    sub: '桃',
    category: '基本',
    symbol: 'drop',
    short: '恢复 1 体力',
    text: '恢复 1 点体力。体力降至 0 时自动使用。',
    target: false,
    reaction: false,
    count: 12,
  },
  howl: {
    name: '震慑之啸',
    sub: '格挡',
    category: '基本',
    symbol: 'wind',
    short: '抵消 · 攻击者 -1 血晶',
    text: '受到攻击时打出，抵消这次伤害，并令攻击者失去 1 血晶。',
    target: false,
    reaction: true,
    count: 7,
  },
  duel: {
    name: '血之决斗',
    sub: '决斗',
    category: '谋略',
    symbol: 'swords',
    short: '轮流拼血袭 · 败者受 2 伤',
    text: '无视距离。目标与你轮流打出「血袭」，先无法（或不愿）打出的一方受到对方 2 点伤害。',
    target: true,
    reaction: false,
    count: 6,
  },
  steal: {
    name: '暗影掠夺',
    sub: '顺手牵羊',
    category: '谋略',
    symbol: 'hand',
    short: '夺 1 手牌 + 1 血晶',
    text: '无视距离。随机夺取一名血族的 1 张手牌和 1 血晶。',
    target: true,
    reaction: false,
    count: 5,
  },
  supply: {
    name: '夜之馈赠',
    sub: '无中生有',
    category: '谋略',
    symbol: 'cards',
    short: '摸 2 张牌',
    text: '摸 2 张牌。',
    target: false,
    reaction: false,
    count: 6,
  },
  fire: {
    name: '烈火壶',
    sub: '火攻',
    category: '谋略',
    symbol: 'flame',
    short: '任意距离 1 伤害',
    text: '无视距离，对一名血族或中央强敌造成 1 点伤害，可用「闪」响应。',
    target: true,
    reaction: false,
    count: 6,
  },
  weapon: {
    name: '淬血兵装',
    sub: '武器',
    category: '装备',
    symbol: 'sword',
    short: '距离 +1 · 血袭 +1 次',
    text: '装备武器：攻击距离 +1，每回合可多用 1 张「血袭」。不可叠加。',
    target: false,
    reaction: false,
    count: 4,
  },
  armor: {
    name: '血之屏障',
    sub: '防具',
    category: '装备',
    symbol: 'shield',
    short: '+2 护甲',
    text: '获得 2 点护甲（最多 3 点）。护甲逐点吸收伤害。',
    target: false,
    reaction: false,
    count: 4,
  },
  kin: {
    name: '眷属契约',
    sub: '眷属',
    category: '装备',
    symbol: 'kin',
    short: '狩猎伤害 +1',
    text: '缔约一个眷属：对中央强敌的伤害 +1。已有眷属时改为摸 2 张牌。',
    target: false,
    reaction: false,
    count: 4,
  },
  blood: {
    name: '凝血结晶',
    sub: '血晶',
    category: '谋略',
    symbol: 'gem',
    short: '+2 血晶',
    text: '获得 2 血晶，用于角色技能、血誓与强化血脉。',
    target: false,
    reaction: false,
    count: 5,
  },
  oath: {
    name: '暂时同盟',
    sub: '结盟',
    category: '谋略',
    symbol: 'link',
    short: '结盟 2 轮 · +1 美德',
    text: '与一名血族结盟至下一轮结束：双方不能互相攻击，你获得 1 美德，双方各摸 1 张牌。最终阶段不可用。',
    target: true,
    reaction: false,
    count: 4,
  },
};

export const DECK_SIZE = Object.values(CARDS).reduce((n, c) => n + c.count, 0);

export interface PhaseData {
  name: string;
  rounds: string;
  summary: string;
}

export const PHASES: readonly PhaseData[] = [
  { name: '暮色初临', rounds: '1–2 轮', summary: '自由成长' },
  { name: '血誓仪式', rounds: '3–4 轮', summary: '血誓之柱开启' },
  { name: '圣杯筛选', rounds: '5–6 轮', summary: '留存五人' },
  { name: '月血赐福', rounds: '7 轮起', summary: '三人决战' },
];

export const EVENTS = [
  { name: '苍白之夜', text: '黄昏初临，没有额外效果。' },
  { name: '血晶潮汐', text: '所有血族获得 1 血晶。' },
  { name: '夜之馈赠', text: '所有血族额外摸 1 张牌。' },
  { name: '血月高悬', text: '本轮「血袭」伤害 +1。' },
  { name: '亡者低语', text: '所有血族恢复 1 点体力。' },
  { name: '猎人之月', text: '本轮击败强敌额外 +2 美德。' },
  { name: '灰烬之雾', text: '本轮「血袭」无视距离。' },
] as const;

export const EVENT = {
  calm: 0,
  tide: 1,
  gift: 2,
  bloodMoon: 3,
  whisper: 4,
  huntersMoon: 5,
  ash: 6,
} as const;

export const FOES = [
  { name: '钟楼守卫', hp: 3, reward: 2, desc: '驻守洛安罗的游荡强敌。' },
  { name: '饥渴的血囊', hp: 2, reward: 1, desc: '击败后额外获得 2 血晶。' },
  {
    name: '异乡入侵者',
    hp: 5,
    reward: 4,
    desc: '强大的外来者。未能击倒它的狩猎者会受到 1 点反噬。',
  },
  { name: '墓园执刑者', hp: 4, reward: 3, desc: '在墓园徘徊的危险强敌。' },
];

/** Tunable rule constants, collected so balance passes touch one place. */
export const RULES = {
  seats: 6,
  maxBlood: 9,
  maxArmor: 3,
  startBlood: 2,
  startHand: 4,
  /** Blood to claim an empty pillar; an occupied pillar costs one more. */
  pledgeCost: 1,
  pledgeVirtue: 1,
  /** Virtue the pillar holder receives at the start of each of their turns. */
  pillarEcho: 2,
  /** Blood the turn player drains the first time each turn they wound a Bloodsworn. */
  drainBlood: 1,
  killVirtue: 3,
  killBlood: 2,
  sigilVirtue: 3,
  deathPenalty: 2,
  upgradeCost: 3,
  /** Rounds at which the table is cut, and how many seats survive. */
  cuts: [
    { round: 5, keep: 5 },
    { round: 7, keep: 3 },
  ],
  finalRound: 7,
  /** If nobody has won when this round would begin, the grail judges. */
  lastRound: 14,
  /** From this round of the final, slashes deal +1. */
  frenzyRound: 9,
  final: { ap: 5, draw: 4, blood: 2, skills: 2, slashes: 2, lives: 2 },
  early: { ap: 3, draw: 2, blood: 1, skills: 1, slashes: 1 },
} as const;
