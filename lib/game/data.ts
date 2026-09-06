export const HEROES = [
  { id:'albert', name:'阿尔伯特', en:'Albert', title:'洛里克的继血者', style:'均衡 · 血刃 · 讨伐', hp:5, range:1, color:'#bc7665', weapon:'宝石军刀 / 冲锋枪', skill:'血之刃', cost:2, skillText:'对任意敌人造成 1 点伤害；其美德不低于你时，改为 2 点。可以「闪」响应。', passive:'起义者', passiveText:'每回合首次伤害美德不低于你的血族，额外获得 1 美德。', quote:'高贵的血，从不向命运俯首。', ratings:[4,3,4], art:'albert'},
  { id:'jan', name:'血手扬', en:'Bloodhand Jan', title:'渴血战斧的主人', style:'近战 · 反击 · 吸血', hp:5, range:1, color:'#ba514a', weapon:'渴血战斧 / 魔术石', skill:'臣服吾血', cost:2, skillText:'失去 1 点体力，对一名敌人造成 2 点伤害，并恢复 1 点体力。体力为 1 时不可发动；可以「闪」响应。', passive:'血手传承', passiveText:'受伤后获得复仇。下一次造成伤害时，恢复 1 点体力并消耗复仇。', quote:'听见了吗？我的斧头，仍在饥渴。', ratings:[5,3,2], art:'jan'},
  { id:'lanh', name:'庄兰', en:'Trang Lanh', title:'暗月的新娘', style:'隐匿 · 银蛇 · 机动', hp:4, range:2, color:'#b7b7ba', weapon:'满月轮刃', skill:'娜塔之母', cost:3, skillText:'召来银蛇，对任意一名敌人造成 2 点伤害，可用「闪」响应。随后获得 1 次暗月，抵挡下一次攻击。', passive:'暗月之女', passiveText:'受到攻击时可将「血袭」作为「闪」响应；每次成功闪避，获得 1 血晶。', quote:'月光落下之处，银蛇静候。', ratings:[4,5,2], art:'lanh'},
  { id:'layla', name:'狙击手蕾拉', en:'Sniper Layla', title:'涅布拉的长夜之眼', style:'远程 · 连射 · 再生', hp:4, range:5, color:'#b8a382', weapon:'象形拳刃 / 狙击步枪', skill:'维尔德机枪', cost:3, skillText:'对任意敌人造成 3 点伤害，可用一张「闪」闪避整次扫射。', passive:'涅布拉血统', passiveText:'回合开始时，若体力低于 2，恢复至 2。攻击距离无限制。', quote:'死亡来临之前，你听不见枪声。', ratings:[5,2,3], art:'layla'},
  { id:'samir', name:'萨米尔·帕特雷斯', en:'Senator Samir Patres', title:'元老院的古血议员', style:'防御 · 血桩 · 蜥化', hp:4, range:1, color:'#a592bc', weapon:'元老院刺剑 / 灵鸟戒指', skill:'蜥龙化身', cost:2, skillText:'化作古兽，对一名敌人造成 2 点伤害，可用「闪」响应。随后获得 1 护甲。', passive:'不动之剑', passiveText:'用「闪」或「啸」成功防御后，下一张「血袭」伤害 +1。', quote:'王朝化为尘土，古血依旧奔流。', ratings:[4,4,3], art:'samir'},
  { id:'zork', name:'佐克', en:'Zork', title:'深海归来的铁壳', style:'重甲 · 火箭 · 掠夺', hp:6, range:1, color:'#9b9986', weapon:'海底电缆 / 鱼叉枪', skill:'人体火箭', cost:3, skillText:'冲撞任意敌人，造成 2 点伤害；可以「闪」响应。无视距离与护甲。', passive:'深海法则', passiveText:'击倒血族后，体力上限 +1，并恢复 1 点体力。上限最高为 8。', quote:'沉寂的深海之下，铁壳仍有心跳。', ratings:[4,5,1], art:'zork'},
] as const;
export type HeroId = typeof HEROES[number]['id'];
export type CardType = 'slash'|'dodge'|'heal'|'howl'|'duel'|'steal'|'supply'|'fire'|'weapon'|'armor'|'kin'|'blood'|'oath';
export const CARDS: Record<CardType,{name:string;sub:string;type:string;symbol:string;text:string;target:boolean;count:number}> = {
 slash:{name:'血袭',sub:'杀',type:'基本',symbol:'sword',text:'对攻击范围内的一名血族或游荡敌人造成 1 点伤害。每回合限用 1 次。',target:true,count:24},
 dodge:{name:'夜行',sub:'闪',type:'基本',symbol:'moon',text:'受到攻击时使用，抵消这次伤害。',target:false,count:18},
 heal:{name:'金血针',sub:'桃',type:'基本',symbol:'drop',text:'恢复 1 点体力。濒死时自动使用。',target:false,count:12},
 howl:{name:'震慑之啸',sub:'格挡',type:'基本',symbol:'wind',text:'响应攻击，抵消伤害；令攻击者失去 1 血晶。',target:false,count:7},
 duel:{name:'血之决斗',sub:'决斗',type:'谋略',symbol:'swords',text:'无视距离。对方可用一张「血袭」化解，否则受到 2 点伤害。',target:true,count:6},
 steal:{name:'暗影掠夺',sub:'顺手牵羊',type:'谋略',symbol:'hand',text:'偷取一名血族的随机手牌和 1 血晶，无视距离。',target:true,count:5},
 supply:{name:'夜之馈赠',sub:'无中生有',type:'谋略',symbol:'cards',text:'摸 2 张牌。',target:false,count:6},
 fire:{name:'烈火壶',sub:'火攻',type:'谋略',symbol:'flame',text:'对任意敌人造成 1 点伤害，可以「闪」响应。',target:true,count:6},
 weapon:{name:'淬血兵装',sub:'武器',type:'装备',symbol:'sword',text:'装备武器：攻击距离 +1，每回合可多用 1 张「血袭」。同类不叠加。',target:false,count:4},
 armor:{name:'血之屏障',sub:'防具',type:'装备',symbol:'shield',text:'获得 2 点护甲，最多 3 点。护甲逐点吸收伤害。',target:false,count:4},
 kin:{name:'眷属契约',sub:'眷属',type:'装备',symbol:'kin',text:'缔约一个眷属。每次狩猎伤害 +1；再次使用时改为摸 2 张牌。',target:false,count:4},
 blood:{name:'凝血结晶',sub:'血晶',type:'谋略',symbol:'gem',text:'获得 2 枚血晶，用于施放角色技能或升级。',target:false,count:5},
 oath:{name:'暂时同盟',sub:'结盟',type:'谋略',symbol:'link',text:'与另一名血族结盟 2 轮。不能互相攻击；你获得 1 美德，双方各摸 1 张牌。最终阶段解散。',target:true,count:4},
};
export const PHASES = ['暮色初临','血誓仪式','圣杯筛选','月血赐福'];
export const EVENTS = [
 {name:'苍白之夜',text:'本轮没有额外效果。谨慎分配手牌与血晶。'},
 {name:'血晶潮汐',text:'所有未被淘汰的血族获得 1 血晶。'},
 {name:'夜之馈赠',text:'所有未被淘汰的血族额外摸 1 张牌。'},
 {name:'血月高悬',text:'本轮所有「血袭」伤害 +1。'},
 {name:'亡者低语',text:'所有未被淘汰的血族恢复 1 点体力。'},
];
export const FOES = [
 {name:'钟楼守卫',hp:3,reward:2,desc:'驻守洛安罗的游荡强敌。'},
 {name:'饥渴的血囊',hp:2,reward:1,desc:'击败后额外获得 2 血晶。'},
 {name:'异乡入侵者',hp:5,reward:4,desc:'强大的外来敌人。每次未击倒的狩猎会受到 1 点反噬。'},
 {name:'墓园执刑者',hp:4,reward:3,desc:'在墓园徘徊的危险强敌。'},
];
export const hero = (id:string) => HEROES.find(h=>h.id===id)!;
