import {CARDS,HEROES,hero,FOES,EVENTS,PHASES,type CardType} from './data';
export type Card = {id:number;type:CardType;suit:string;rank:string};
export type Player = {id:number;hero:string;hp:number;maxHp:number;virtue:number;blood:number;hand:Card[];armor:number;weapon:boolean;kin:boolean;alive:boolean;lives:number;ally:number|null;allianceUntil:number;revenge:boolean;counter:boolean;veil:boolean;level:number;kills:number;sigil:number;sigilDone:boolean};
export type Pending = {source:number;target:number;amount:number;kind:'attack'|'duel';label:string;ignoreArmor:boolean};
export type State = {version:1;seed:number;players:Player[];deck:Card[];discard:Card[];nextId:number;turn:number;round:number;phase:number;ap:number;slashes:number;skillUsed:boolean;skillUses?:number;explored:boolean;pledged:boolean;upgraded:boolean;bonusUsed:boolean;event:number;foe:{kind:number;hp:number};pillar:number|null;pending:Pending|null;log:{text:string;round:number;type:string}[];result:null|{winner:number|null;reason:string};difficulty:'normal'|'tactical';serial:number};
export type Action = {type:'card';cardId:number;target?:number}|{type:'skill';target:number}|{type:'explore'|'pledge'|'upgrade'|'end'}|{type:'respond';cardId?:number};
const clone=(s:State):State=>JSON.parse(JSON.stringify(s));
function random(s:State){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296}
function shuffle<T>(s:State,arr:T[]){for(let i=arr.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function log(s:State,text:string,type='normal'){s.log.push({text,round:s.round,type});s.log=s.log.slice(-100)}
export function pname(s:State,id:number){return hero(s.players[id].hero).name}
function draw(s:State,p:Player,n:number){for(let i=0;i<n;i++){if(!s.deck.length){s.deck=shuffle(s,s.discard.splice(0));if(!s.deck.length)return;}p.hand.push(s.deck.pop()!)}}
function discard(s:State,p:Player,id:number){const i=p.hand.findIndex(c=>c.id===id);if(i<0)return;const [c]=p.hand.splice(i,1);s.discard.push(c);return c}
export function createGame(chosen:string,difficulty:'normal'|'tactical'='normal',seed=Date.now()):State{
 const order=[hero(chosen),...HEROES.filter(h=>h.id!==chosen)];
 const s:State={version:1,seed:seed>>>0,players:[],deck:[],discard:[],nextId:0,turn:0,round:1,phase:0,ap:3,slashes:0,skillUsed:false,explored:false,pledged:false,upgraded:false,bonusUsed:false,event:0,foe:{kind:0,hp:3},pillar:null,pending:null,log:[],result:null,difficulty,serial:0};
 s.players=order.map((h,i)=>({id:i,hero:h.id,hp:h.hp,maxHp:h.hp,virtue:0,blood:2,hand:[],armor:0,weapon:false,kin:false,alive:true,lives:2,ally:null,allianceUntil:0,revenge:false,counter:false,veil:false,level:0,kills:0,sigil:(i+3)%6,sigilDone:false}));
 for(const type of Object.keys(CARDS) as CardType[])for(let i=0;i<CARDS[type].count;i++){const id=s.nextId++;s.deck.push({id,type,suit:['♠','♥','♣','♦'][id%4],rank:['A','2','3','4','5','6','7','8','9','10','J','Q','K'][id%13]})}
 shuffle(s,s.deck);s.players.forEach(p=>draw(s,p,4));beginTurn(s);log(s,'黄昏降临。狩猎、点灯、缔约，争夺圣杯的注视。','phase');return s;
}
export function distance(s:State,a:number,b:number){const alive=s.players.filter(p=>p.alive).map(p=>p.id);const d=Math.abs(alive.indexOf(a)-alive.indexOf(b));return Math.min(d,alive.length-d)}
export function attackRange(p:Player){return hero(p.hero).range+(p.weapon?1:0)}
export function isAlly(s:State,a:number,b:number){return s.players[a].ally===b&&s.players[a].allianceUntil>=s.round&&s.phase<3}
export function validTargets(s:State,kind:CardType|'skill'):number[]{const p=s.players[s.turn];const result=s.players.filter(t=>t.alive&&t.id!==p.id&&(kind==='oath'?!isAlly(s,p.id,t.id):!isAlly(s,p.id,t.id))&&(kind!=='slash'||distance(s,p.id,t.id)<=attackRange(p))).map(t=>t.id);if(s.phase<3&&['slash','fire','skill'].includes(kind))result.push(-1);return result}
export function responses(s:State){if(!s.pending)return [];const p=s.players[s.pending.target];return p.hand.filter(c=>s.pending!.kind==='duel'?c.type==='slash':c.type==='dodge'||c.type==='howl'||(p.hero==='lanh'&&c.type==='slash'))}
export function canPlay(s:State,card:Card):string|null{
 if(s.result)return '对局已经结束';if(s.pending)return '请先响应攻击';if(s.ap<=0)return '行动点已耗尽';const p=s.players[s.turn];
 if(['dodge','howl'].includes(card.type))return '在受到攻击时使用';
 if(card.type==='slash'&&s.slashes>=slashLimit(s,p))return '本回合血袭次数已用完';
 if(card.type==='heal'&&p.hp>=p.maxHp)return '体力已满';
 if(card.type==='weapon'&&p.weapon)return '已装备武器';if(card.type==='armor'&&p.armor>=3)return '护甲已满';
 if(card.type==='oath'&&s.phase===3)return '最终阶段不能结盟';
 if(CARDS[card.type].target&&!validTargets(s,card.type).length)return '没有合法目标';return null;
}
export function skillCost(p:Player){return Math.max(1,hero(p.hero).cost-(p.level>=2?1:0))}
export const turnAP=(s:State)=>s.phase===3?5:3;
export const skillLimit=(s:State)=>s.phase===3?2:1;
export const skillsUsed=(s:State)=>s.skillUses??(s.skillUsed?1:0);
export const slashLimit=(s:State,p:Player)=> (s.phase===3?2:1)+(p.weapon?1:0);
export function canSkill(s:State){const p=s.players[s.turn];return !s.result&&!s.pending&&s.ap>0&&skillsUsed(s)<skillLimit(s)&&p.blood>=skillCost(p)&&(p.hero!=='jan'||p.hp>1)}
function cap(p:Player){p.blood=Math.min(9,Math.max(0,p.blood));p.hp=Math.min(p.maxHp,Math.max(0,p.hp));p.virtue=Math.max(0,p.virtue);p.armor=Math.min(3,Math.max(0,p.armor))}
function breakAlliance(s:State,p:Player){if(p.ally!==null){const old=s.players[p.ally];if(old.ally===p.id){old.ally=null;old.allianceUntil=0}}p.ally=null;p.allianceUntil=0}
function finishIfNeeded(s:State){const alive=s.players.filter(p=>p.alive);if(alive.length===1){s.result={winner:alive[0].id,reason:'最后的血族获得了月血赐福。'};s.pending=null;return}if(!s.players[0].alive){s.result={winner:null,reason:s.phase===3?'两次生命已经耗尽。月血未曾垂怜。':'你的美德不足，被圣杯筛除。'};s.pending=null}}
function hurt(s:State,target:number,amount:number,source:number,ignoreArmor=false){
 const t=s.players[target];if(!t.alive)return;const attacker=s.players[source];
 if(!ignoreArmor){const blocked=Math.min(t.armor,amount);t.armor-=blocked;amount-=blocked;if(blocked)log(s,`${pname(s,target)}的屏障吸收了 ${blocked} 点伤害。`)}
 if(amount<=0)return;const oldVirtue=t.virtue;t.hp-=amount;t.revenge=t.hero==='jan'||t.revenge;
 log(s,`${pname(s,target)}受到 ${amount} 点伤害。`,'damage');
 if(source!==target){if(attacker.hero==='albert'&&!s.bonusUsed&&oldVirtue>=attacker.virtue){attacker.virtue++;s.bonusUsed=true;log(s,'起义者：阿尔伯特获得 1 美德。','gain')}
 if(attacker.revenge){attacker.hp=Math.min(attacker.maxHp,attacker.hp+1);attacker.revenge=false;log(s,'血手传承：血手扬恢复 1 点体力。','gain')}}
 while(t.hp<=0){const peach=t.hand.find(c=>c.type==='heal');if(!peach)break;discard(s,t,peach.id);t.hp++;log(s,`${pname(s,target)}濒死使用金血针。`,'gain')}
 if(t.hp>0)return;
 if(source!==target){attacker.virtue+=3;attacker.blood+=2;attacker.kills++;draw(s,attacker,1);log(s,`${pname(s,source)}击倒血族，获得 3 美德、2 血晶并摸 1 张牌。`,'gain');
 if(attacker.sigil===target&&!attacker.sigilDone){attacker.sigilDone=true;attacker.virtue+=3;log(s,`${pname(s,source)}完成宿敌刻印，额外获得 3 美德。`,'gain')}
 if(attacker.hero==='zork'){attacker.maxHp=Math.min(8,attacker.maxHp+1);attacker.hp=Math.min(attacker.maxHp,attacker.hp+1);log(s,'深海法则：佐克的体力上限增长。','gain')}cap(attacker)}
 if(s.phase<3){t.hp=t.maxHp;t.virtue=Math.max(0,t.virtue-2);t.armor=0;log(s,`${pname(s,target)}失去 2 美德，重生。`)}
 else{t.lives--;if(t.lives>0){t.hp=t.maxHp;log(s,`${pname(s,target)}用最后一次生命重返战场。`,'phase')}else{t.hp=0;t.alive=false;breakAlliance(s,t);log(s,`${pname(s,target)}离开了这场血宴。`,'damage')}}finishIfNeeded(s);
}
function defend(s:State,c:Card){const pending=s.pending!;const p=s.players[pending.target];discard(s,p,c.id);log(s,`${pname(s,p.id)}以「${CARDS[c.type].name}」化解了${pending.label}。`);if(c.type==='howl')s.players[pending.source].blood=Math.max(0,s.players[pending.source].blood-1);if(p.hero==='samir'&&['dodge','howl'].includes(c.type))p.counter=true;if(p.hero==='lanh'&&pending.kind==='attack')p.blood=Math.min(9,p.blood+1);s.pending=null}
function attack(s:State,target:number,amount:number,label:string,kind:'attack'|'duel'='attack',ignoreArmor=false){
 const p=s.players[s.turn];
 if(target===-1){amount+=(p.kin?1:0);s.foe.hp-=amount;log(s,`${pname(s,p.id)}以${label}狩猎，造成 ${amount} 点伤害。`);if(s.foe.hp<=0){const foe=FOES[s.foe.kind];p.virtue+=foe.reward;p.blood+=1+(s.foe.kind===1?2:0);draw(s,p,1);log(s,`${pname(s,p.id)}击败${foe.name}，获得 ${foe.reward} 美德、血晶与战利品。`,'gain');s.foe.kind=(s.foe.kind+1)%FOES.length;s.foe.hp=FOES[s.foe.kind].hp;}else if(s.foe.kind===2)hurt(s,p.id,1,p.id,true);cap(p);return}
 const t=s.players[target];if(t.veil){t.veil=false;log(s,`${pname(s,target)}的暗月庇护抵消了${label}。`);return}
 s.pending={source:s.turn,target,amount,kind,label,ignoreArmor};
 if(target!==0){const available=responses(s);if(available.length)defend(s,available.sort((a,b)=>(a.type==='howl'?-1:1)-(b.type==='howl'?-1:1))[0]);else{s.pending=null;hurt(s,target,amount,s.turn,ignoreArmor)}}
}
function beginTurn(s:State){if(s.result)return;const p=s.players[s.turn];s.ap=turnAP(s);s.slashes=0;s.skillUsed=false;s.skillUses=0;s.explored=false;s.pledged=false;s.upgraded=false;s.bonusUsed=false;p.blood=Math.min(9,p.blood+(s.phase===3?2:1));draw(s,p,s.phase===3?4:2);if(p.hero==='layla'&&p.hp<2)p.hp=2;log(s,`${pname(s,p.id)}的回合：摸 ${s.phase===3?4:2} 张牌，获得 ${s.phase===3?2:1} 血晶、${turnAP(s)} 行动点。`,'turn')}
function rank(s:State){return [...s.players.filter(p=>p.alive)].sort((a,b)=>b.virtue-a.virtue||b.hp-a.hp||b.blood-a.blood||a.id-b.id)}
export const ranking=(s:State)=>[...s.players].sort((a,b)=>Number(b.alive)-Number(a.alive)||b.virtue-a.virtue||b.hp-a.hp||b.blood-a.blood||a.id-b.id);
function nextRound(s:State){s.round++;const newPhase=Math.min(3,Math.floor((s.round-1)/2));if(newPhase!==s.phase){s.phase=newPhase;log(s,`第 ${s.phase+1} 阶段 · ${PHASES[s.phase]}`,'phase');if(s.phase===2||s.phase===3){const survivors=rank(s).slice(0,s.phase===2?5:3).map(p=>p.id);s.players.filter(p=>p.alive&&!survivors.includes(p.id)).forEach(p=>{p.alive=false;breakAlliance(s,p);log(s,`${pname(s,p.id)}被圣杯筛除。`,'damage')});if(s.phase===3){s.players.filter(p=>p.alive).forEach(p=>{breakAlliance(s,p);p.lives=2;p.maxHp=Math.min(10,p.maxHp+Math.floor(p.virtue/8));p.hp=p.maxHp;p.blood=Math.min(9,p.blood+3);draw(s,p,3)});if(s.pillar!==null)s.pillar=null;log(s,'同盟解散。三名血族恢复体力、各获两次生命、3 张牌和 3 血晶。此后每回合 5 行动、摸 4 张牌、获得 2 血晶，技能与基础血袭各可使用 2 次。','phase')}finishIfNeeded(s);if(s.result)return}}
 s.players.forEach(p=>{if(p.ally!==null&&p.allianceUntil<s.round)breakAlliance(s,p)});
 s.event=1+Math.floor(random(s)*(EVENTS.length-1));log(s,`异象 · ${EVENTS[s.event].name}：${EVENTS[s.event].text}`,'phase');
 s.players.filter(p=>p.alive).forEach(p=>{if(s.event===1)p.blood++;if(s.event===2)draw(s,p,1);if(s.event===4)p.hp++;cap(p)});
 if(s.round>=14){const winner=[...s.players.filter(p=>p.alive)].sort((a,b)=>(b.lives*20+b.hp+b.virtue)-(a.lives*20+a.hp+a.virtue)||a.id-b.id)[0];s.result={winner:winner.id,reason:'长夜终结：按剩余生命 ×20 + 体力 + 美德裁定赐血者。'};log(s,'长夜终结，圣杯作出最终裁决。','phase')}
}
function endTurn(s:State){const p=s.players[s.turn];const limit=s.phase===3?Math.max(5,p.hp+2):Math.max(3,p.hp);if(p.hand.length>limit){const value=(c:Card)=>c.type==='heal'?9:['dodge','howl'].includes(c.type)?8:c.type==='slash'?7:c.type==='supply'?6:4;const sorted=[...p.hand].sort((a,b)=>value(a)-value(b));const excess=p.hand.length-limit;for(let i=0;i<excess;i++)discard(s,p,sorted[i].id);log(s,`${pname(s,p.id)}弃置 ${excess} 张牌，保留优先级最高的手牌。`)}
 for(let i=0;i<6;i++){s.turn=(s.turn+1)%6;if(s.turn===0)nextRound(s);if(s.result)return;if(s.players[s.turn].alive){beginTurn(s);return}}
}
export function reduceGame(state:State,action:Action):State{
 if(state.result)return state;const s=clone(state);const p=s.players[s.turn];
 if(action.type==='respond'){if(!s.pending||s.pending.target!==0)return state;const pending=s.pending;if(action.cardId!==undefined){const c=responses(s).find(c=>c.id===action.cardId);if(!c)return state;defend(s,c)}else{s.pending=null;hurt(s,pending.target,pending.amount,pending.source,pending.ignoreArmor)}s.serial++;return s}
 if(s.pending)return state;
 if(action.type==='end'){endTurn(s);s.serial++;return s}
 if(s.ap<=0)return state;
 if(action.type==='card'){
 const c=p.hand.find(c=>c.id===action.cardId);if(!c||canPlay(s,c))return state;const data=CARDS[c.type];if(data.target&&(action.target===undefined||!validTargets(s,c.type).includes(action.target)))return state;
 const target=action.target!;discard(s,p,c.id);s.ap--;log(s,`${pname(s,p.id)}打出「${data.name}」。`);
 switch(c.type){case 'slash':{s.slashes++;const bonus=(p.counter?1:0)+(s.event===3?1:0)+(p.level>=1?1:0)+(s.phase===3&&s.round>=9?1:0);p.counter=false;attack(s,target,1+bonus,data.name);break}
 case 'heal':p.hp=Math.min(p.maxHp,p.hp+1);break;
 case 'duel':attack(s,target,2,data.name,'duel');break;
 case 'fire':attack(s,target,1,data.name);break;
 case 'steal':{const t=s.players[target];if(t.hand.length){const i=Math.floor(random(s)*t.hand.length);p.hand.push(t.hand.splice(i,1)[0])}if(t.blood>0){t.blood--;p.blood++}break}
 case 'supply':draw(s,p,2);break;case 'weapon':p.weapon=true;break;case 'armor':p.armor=Math.min(3,p.armor+2);break;
 case 'kin':if(p.kin)draw(s,p,2);else p.kin=true;break;case 'blood':p.blood+=2;break;
 case 'oath':{const t=s.players[target];breakAlliance(s,p);breakAlliance(s,t);p.ally=t.id;t.ally=p.id;p.allianceUntil=t.allianceUntil=s.round+1;p.virtue++;draw(s,p,1);draw(s,t,1);log(s,`${pname(s,p.id)}与${pname(s,t.id)}缔结同盟，持续至第 ${p.allianceUntil} 轮结束。`,'gain');break}
 }
 }else if(action.type==='skill'){
 if(!canSkill(s)||!validTargets(s,'skill').includes(action.target))return state;p.blood-=skillCost(p);s.ap--;s.skillUses=skillsUsed(s)+1;s.skillUsed=true;const h=hero(p.hero);log(s,`${h.name}发动「${h.skill}」。`,'skill');let amount=2;
 if(p.hero==='albert')amount=action.target===-1||s.players[action.target].virtue>=p.virtue?2:1;
 if(p.hero==='jan')p.hp--;if(p.hero==='layla')amount=3;
 attack(s,action.target,amount,h.skill,'attack',p.hero==='zork');
 if(p.hero==='jan')p.hp=Math.min(p.maxHp,p.hp+1);if(p.hero==='lanh')p.veil=true;if(p.hero==='samir')p.armor=Math.min(3,p.armor+1);
 }else if(action.type==='explore'){
 if(s.explored||s.phase===3)return state;s.explored=true;s.ap--;p.virtue++;p.blood++;draw(s,p,1);log(s,`${pname(s,p.id)}点燃遗骸之灯：+1 美德、+1 血晶，摸 1 张牌。`,'gain');
 }else if(action.type==='pledge'){
 if(s.pledged||s.phase<1||s.phase===3||s.pillar===p.id||p.blood<1)return state;s.pledged=true;s.ap--;p.blood--;if(s.pillar!==null){const old=s.players[s.pillar];old.virtue=Math.max(0,old.virtue-2)}s.pillar=p.id;p.virtue+=2;log(s,`${pname(s,p.id)}覆写血誓柱，获得 2 美德；原誓言失效。`,'gain');
 }else if(action.type==='upgrade'){
 if(s.upgraded||p.level>=2||p.blood<3)return state;s.upgraded=true;p.blood-=3;p.level++;s.ap--;log(s,`${pname(s,p.id)}强化血脉至 ${p.level} 级。`,'gain');
 }
 s.players.forEach(cap);s.serial++;return s;
}
export function chooseAI(s:State):Action{
 if(s.pending){const available=responses(s);return {type:'respond',cardId:available[0]?.id}}
 const p=s.players[s.turn];if(s.ap<=0)return {type:'end'};
 const playable=p.hand.filter(c=>!canPlay(s,c));
 const heal=playable.find(c=>c.type==='heal');if(heal&&p.hp<p.maxHp-1)return {type:'card',cardId:heal.id};
 const equipment=playable.find(c=>(c.type==='weapon'&&!p.weapon)||(c.type==='kin'&&!p.kin&&s.phase<3)||(c.type==='armor'&&p.hp<=3));if(equipment)return {type:'card',cardId:equipment.id};
 const targetFor=(type:CardType|'skill')=>{const ts=validTargets(s,type).filter(id=>id>=0).map(id=>s.players[id]);ts.sort((a,b)=>(b.virtue+(b.hp<=2?7:0)+(p.sigil===b.id?2:0))-(a.virtue+(a.hp<=2?7:0)+(p.sigil===a.id?2:0)));if(!ts.length)return -1;return ts[(s.seed+s.serial)%Math.min(s.difficulty==='tactical'?1:2,ts.length)].id};
 if(s.phase<3&&!s.explored&&s.ap===3)return {type:'explore'};
 if(!s.upgraded&&p.level<1&&p.blood>=5)return {type:'upgrade'};
 const slash=playable.find(c=>c.type==='slash');if(slash){const target=(s.phase<3&&(s.foe.hp<=2+(p.kin?1:0)+(p.level>0?1:0)||s.round===1))?-1:targetFor('slash');if(target>=0||s.phase<3)return {type:'card',cardId:slash.id,target}}
 if(canSkill(s)){const target=s.phase<3&&s.foe.hp<=2+(p.kin?1:0)?-1:targetFor('skill');if(target>=0||s.phase<3)return {type:'skill',target}}
 const attackCard=playable.find(c=>c.type==='duel'||c.type==='fire');if(attackCard)return {type:'card',cardId:attackCard.id,target:targetFor(attackCard.type)};
 if(s.phase===1||s.phase===2){if(!s.pledged&&s.pillar!==p.id&&p.blood>=1)return {type:'pledge'}}
 if(s.phase<3&&!s.explored)return {type:'explore'};
 const useful=playable.find(c=>['supply','blood','steal','armor','heal'].includes(c.type));if(useful)return {type:'card',cardId:useful.id,target:CARDS[useful.type].target?targetFor(useful.type):undefined};
 const oath=playable.find(c=>c.type==='oath');if(oath&&p.ally===null){const t=targetFor('oath');if(t>=0)return {type:'card',cardId:oath.id,target:t}}
 return {type:'end'};
}
export function parseSave(raw:string):State|null{
 try{const s=JSON.parse(raw);const integer=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&Number(v)>=min&&Number(v)<=max;
 if(s.version!==1||!Array.isArray(s.players)||s.players.length!==6||!Array.isArray(s.deck)||!Array.isArray(s.discard)||!Array.isArray(s.log)||!integer(s.turn,0,5)||!integer(s.round,1,14)||!integer(s.phase,0,3)||!integer(s.ap,0,s.phase===3?5:3)||!integer(s.event,0,4)||!integer(s.seed,0,4294967295)||!integer(s.serial,0,100000)||!s.foe||!integer(s.foe.kind,0,3)||!integer(s.foe.hp,1,FOES[s.foe.kind].hp)||!(s.pillar===null||integer(s.pillar,0,5))||!['normal','tactical'].includes(s.difficulty))return null;
 for(const k of ['skillUsed','explored','pledged','upgraded','bonusUsed'])if(typeof s[k]!=='boolean')return null;
 if(!integer(s.slashes,0,s.phase===3?3:2)||(s.skillUses!==undefined&&(!integer(s.skillUses,0,s.phase===3?2:1)||s.skillUsed!==(s.skillUses>0)))||s.log.some((entry:{text:unknown;round:unknown;type:unknown})=>typeof entry.text!=='string'||typeof entry.type!=='string'||!integer(entry.round,1,14)))return null;
 if(new Set(s.players.map((p:Player)=>p.hero)).size!==6)return null;
 for(const [i,p]of s.players.entries()){
 if(p.id!==i||!HEROES.some(h=>h.id===p.hero)||!Array.isArray(p.hand)||!integer(p.hp,0,p.maxHp)||!integer(p.maxHp,1,10)||!integer(p.blood,0,9)||!integer(p.virtue,0,1000)||!integer(p.armor,0,3)||!integer(p.level,0,2)||!integer(p.lives,0,2)||!integer(p.kills,0,1000)||!integer(p.sigil,0,5)||!integer(p.allianceUntil,0,15)||!(p.ally===null||integer(p.ally,0,5)))return null;
 for(const k of ['weapon','kin','alive','revenge','counter','veil','sigilDone'])if(typeof p[k]!=='boolean')return null;
 }
 const cards=[...s.deck,...s.discard,...s.players.flatMap((p:Player)=>p.hand)];if(cards.length!==105||cards.some((c:Card)=>!CARDS[c.type]||!integer(c.id,0,104)||!['♠','♥','♣','♦'].includes(c.suit)||typeof c.rank!=='string')||new Set(cards.map((c:Card)=>c.id)).size!==cards.length)return null;
 if(s.pending!==null){const p=s.pending;if(!p||!integer(p.source,0,5)||p.target!==0||!integer(p.amount,1,10)||!['attack','duel'].includes(p.kind)||typeof p.label!=='string'||typeof p.ignoreArmor!=='boolean')return null}
 if(s.result!==null&&(!s.result||!(s.result.winner===null||integer(s.result.winner,0,5))||typeof s.result.reason!=='string'))return null;
 s.log=s.log.map((entry:{text:string})=>({...entry,text:entry.text.replace(/功绩|功迹/g,'美德').replace(/在夜之馆重生/g,'重生')}));
 if(s.result)s.result.reason=s.result.reason.replace(/功绩|功迹/g,'美德');
 return s as State;
 }catch{return null}
}
