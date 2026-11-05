import type { PlayerId } from '../../engine/types';
import { CARDS, MAX_RESERVED, MAX_TOKENS, PATRONS, TAKE_TWO_MIN } from './data';
import { bonusesOf, buyableCards, pointsOf, tokenTotal, validate } from './rules';
import {
  ESSENCES,
  TIERS,
  TOKEN_COLORS,
  type AlchemyAction,
  type AlchemyState,
  type Card,
  type Essence,
  type EssenceCounts,
  type PlayerState,
  type TokenCounts,
} from './types';

/**
 * 단순한 욕심쟁이 봇.
 * 살 수 있으면 가장 가치 있는 레시피를 사고, 아니면 목표 레시피에 필요한 정수를 모은다.
 */
export function botAction(state: AlchemyState, playerId: PlayerId, random: () => number): AlchemyAction {
  const me = state.players.find((p) => p.id === playerId)!;

  if (state.phase === 'patron') return { type: 'choosePatron', patronId: state.patronChoices[0] };
  if (state.phase === 'discard') return { type: 'discard', tokens: chooseDiscard(state, me) };

  const bonus = bonusesOf(me);
  const myPoints = pointsOf(me);
  const lateGame = Math.max(...state.players.map(pointsOf)) >= state.options.targetScore - 5;

  const value = (card: Card) => cardValue(state, me, bonus, card, lateGame) + random() * 0.3;

  // 1) 목표 레시피 정하기: 가치 / 필요한 턴 수
  const candidates: Card[] = [];
  for (const t of TIERS) for (const id of state.market[t]) if (id) candidates.push(CARDS[id]);
  for (const r of me.reserved) candidates.push(CARDS[r.cardId]);
  const ranked = candidates
    .map((card) => {
      const v = value(card);
      return { card, v, score: v / (turnsNeeded(me, bonus, card) + 1) };
    })
    .sort((a, b) => b.score - a.score);

  // 2) 살 수 있으면 산다. 단, 더 좋은 목표가 코앞이면 0점짜리로 재료를 낭비하지 않는다.
  const buyable = new Set(buyableCards(state, me));
  const bestBuy = ranked.find((r) => buyable.has(r.card.id));
  if (bestBuy) {
    const top = ranked[0];
    const worthIt =
      top === bestBuy ||
      bestBuy.card.points > 0 ||
      bestBuy.v >= 0.9 ||
      turnsNeeded(me, bonus, top.card) >= 3 ||
      (lateGame && myPoints >= state.options.targetScore - 2);
    if (worthIt) return { type: 'buy', cardId: bestBuy.card.id };
  }

  // 3) 정수 가져오기
  const room = MAX_TOKENS - tokenTotal(me.tokens);
  const take = chooseTokens(state, me, bonus, ranked.map((r) => r.card), Math.max(room, 0));
  if (take.length > 0 && validate(state, playerId, { type: 'take', colors: take }) === null) {
    // 토큰이 꽉 차 가는데 목표가 비싼 카드면 예약해서 촉매를 받는 편이 낫다
    const top = ranked[0]?.card;
    const reserveInstead =
      top &&
      me.reserved.length < MAX_RESERVED &&
      !me.reserved.some((r) => r.cardId === top.id) &&
      top.points >= 3 &&
      (room <= 2 || random() < 0.12);
    if (!reserveInstead) return { type: 'take', colors: take };
  }

  // 4) 예약
  if (me.reserved.length < MAX_RESERVED) {
    const target = ranked.find((r) => !me.reserved.some((x) => x.cardId === r.card.id));
    if (target) return { type: 'reserve', cardId: target.card.id };
    const deckTier = [3, 2, 1].find((t) => state.decks[t as 1 | 2 | 3].length > 0) as 1 | 2 | 3 | undefined;
    if (deckTier) return { type: 'reserveDeck', tier: deckTier };
  }

  // 5) 아무 정수라도
  const any = ESSENCES.filter((e) => state.bank[e] > 0).slice(0, Math.min(3, Math.max(room, 1)));
  if (any.length > 0) return { type: 'take', colors: any };
  if (bestBuy) return { type: 'buy', cardId: bestBuy.card.id };
  return { type: 'pass' };
}

function cardValue(state: AlchemyState, me: PlayerState, bonus: EssenceCounts, card: Card, lateGame: boolean): number {
  let v = card.points * (lateGame ? 2 : 1.2);
  if (!lateGame) {
    // 이 정수 할인이 진열된 다른 레시피와 후원자에게 얼마나 도움이 되는지
    let help = 0;
    for (const t of TIERS)
      for (const id of state.market[t]) {
        if (!id || id === card.id) continue;
        const c = CARDS[id];
        if (c.cost[card.essence] > bonus[card.essence]) help += 0.08 + c.points * 0.04;
      }
    for (const pid of state.patrons) {
      const req = PATRONS[pid].require[card.essence];
      if (req > bonus[card.essence]) help += 0.35;
    }
    v += help;
  }
  // 이미 예약한 카드는 예약 칸을 비우는 이점
  if (me.reserved.some((r) => r.cardId === card.id)) v += 0.4;
  return v;
}

function missingFor(me: PlayerState, bonus: EssenceCounts, card: Card): EssenceCounts {
  const miss = {} as EssenceCounts;
  for (const e of ESSENCES) miss[e] = Math.max(0, card.cost[e] - bonus[e] - me.tokens[e]);
  return miss;
}

function turnsNeeded(me: PlayerState, bonus: EssenceCounts, card: Card): number {
  const miss = missingFor(me, bonus, card);
  const total = ESSENCES.reduce((s, e) => s + miss[e], 0) - me.tokens.catalyst;
  if (total <= 0) return 0;
  const maxOne = Math.max(...ESSENCES.map((e) => miss[e]));
  return Math.max(Math.ceil(total / 3), Math.ceil(maxOne / 2));
}

function chooseTokens(
  state: AlchemyState,
  me: PlayerState,
  bonus: EssenceCounts,
  targets: Card[],
  room: number,
): Essence[] {
  if (room <= 0) return [];
  const first = targets[0];
  if (first) {
    const miss = missingFor(me, bonus, first);
    const needed = ESSENCES.filter((e) => miss[e] > 0 && state.bank[e] > 0);
    // 한 가지 색만 많이 필요하면 2개 가져오기
    if (room >= 2 && needed.length === 1 && miss[needed[0]] >= 2 && state.bank[needed[0]] >= TAKE_TWO_MIN) {
      return [needed[0], needed[0]];
    }
  }
  const weight: Record<Essence, number> = { fire: 0, water: 0, life: 0, light: 0, shadow: 0 };
  targets.slice(0, 3).forEach((card, i) => {
    const miss = missingFor(me, bonus, card);
    for (const e of ESSENCES) if (miss[e] > 0) weight[e] += (3 - i) * Math.min(miss[e], 3);
  });
  const picks = ESSENCES.filter((e) => state.bank[e] > 0 && weight[e] > 0)
    .sort((a, b) => weight[b] - weight[a])
    .slice(0, Math.min(3, room));
  return picks;
}

function chooseDiscard(state: AlchemyState, me: PlayerState): Partial<TokenCounts> {
  const bonus = bonusesOf(me);
  let extra = tokenTotal(me.tokens) - MAX_TOKENS;
  const left = { ...me.tokens };
  const out: Partial<TokenCounts> = {};
  // 진열된 카드 기준으로 덜 필요한 색부터 반납
  const demand: Record<Essence, number> = { fire: 0, water: 0, life: 0, light: 0, shadow: 0 };
  for (const t of TIERS)
    for (const id of state.market[t]) if (id) for (const e of ESSENCES) demand[e] += Math.max(0, CARDS[id].cost[e] - bonus[e]);
  for (const r of me.reserved) for (const e of ESSENCES) demand[e] += 3 * Math.max(0, CARDS[r.cardId].cost[e] - bonus[e]);
  while (extra > 0) {
    const color =
      ESSENCES.filter((e) => left[e] > 0).sort((a, b) => demand[a] / (left[a] + 1) - demand[b] / (left[b] + 1))[0] ??
      TOKEN_COLORS.find((c) => left[c] > 0)!;
    left[color]--;
    out[color] = (out[color] ?? 0) + 1;
    extra--;
  }
  return out;
}
