import type { GameResult, PlayerId } from '../../engine/types';
import { createRng, shuffle } from '../../engine/rng';
import {
  CARDS,
  CARD_LIST,
  JOKER_COUNT,
  MARKET_SIZE,
  MAX_RESERVED,
  MAX_TOKENS,
  PATRONS,
  PATRON_LIST,
  TAKE_TWO_MIN,
  emptyEssences,
  essenceTokenCount,
} from './data';
import {
  ESSENCES,
  TIERS,
  TOKEN_COLORS,
  type AlchemyAction,
  type AlchemyOptions,
  type AlchemyState,
  type AlchemyView,
  type Card,
  type Essence,
  type EssenceCounts,
  type PlayerState,
  type Tier,
  type TokenColor,
  type TokenCounts,
} from './types';

/** 목표 점수는 15점 고정 */
export const TARGET_SCORE = 15;
export const DEFAULT_OPTIONS: AlchemyOptions = { targetScore: TARGET_SCORE };


// ───────────────────────── 계산 도우미 ─────────────────────────

export function emptyTokens(): TokenCounts {
  return { ...emptyEssences(), joker: 0 };
}

export function bonusesOf(player: Pick<PlayerState, 'cards'>): EssenceCounts {
  const b = emptyEssences();
  for (const id of player.cards) b[CARDS[id].essence]++;
  return b;
}

export function pointsOf(player: Pick<PlayerState, 'cards' | 'patrons'>): number {
  let pts = 0;
  for (const id of player.cards) pts += CARDS[id].points;
  for (const id of player.patrons) pts += PATRONS[id].points;
  return pts;
}

export function tokenTotal(tokens: TokenCounts): number {
  return TOKEN_COLORS.reduce((sum, c) => sum + tokens[c], 0);
}

/** 카드를 등록하는 데 실제로 낼 토큰. 낼 수 없으면 null. 색 토큰을 먼저 쓰고 모자라는 만큼 생교를 쓴다. */
export function paymentFor(player: Pick<PlayerState, 'cards' | 'tokens'>, card: Card): TokenCounts | null {
  const bonus = bonusesOf(player);
  const pay = emptyTokens();
  let shortage = 0;
  for (const e of ESSENCES) {
    const need = Math.max(0, card.cost[e] - bonus[e]);
    const useColor = Math.min(need, player.tokens[e]);
    pay[e] = useColor;
    shortage += need - useColor;
  }
  if (shortage > player.tokens.joker) return null;
  pay.joker = shortage;
  return pay;
}

/** 직접 고른 지불 방법이 맞는지 검사. 맞으면 실제로 낼 토큰, 틀리면 이유. */
export function checkPayment(
  player: Pick<PlayerState, 'cards' | 'tokens'>,
  card: Card,
  payment: Partial<TokenCounts>,
): TokenCounts | string {
  if (!payment || typeof payment !== 'object') return '잘못된 지불입니다.';
  const bonus = bonusesOf(player);
  const pay = emptyTokens();
  let jokerNeeded = 0;
  for (const e of ESSENCES) {
    const need = Math.max(0, card.cost[e] - bonus[e]);
    const p = payment[e] ?? 0;
    if (!isInt(p) || p < 0 || p > need) return '잘못된 지불입니다.';
    if (p > player.tokens[e]) return '토큰이 부족합니다.';
    pay[e] = p;
    jokerNeeded += need - p;
  }
  const cat = payment.joker ?? 0;
  if (cat !== jokerNeeded) return '생교 개수가 맞지 않습니다.';
  if (cat > player.tokens.joker) return '토큰이 부족합니다.';
  pay.joker = cat;
  return pay;
}

function qualifiesForPatron(player: PlayerState, patronId: string): boolean {
  const bonus = bonusesOf(player);
  const req = PATRONS[patronId].require;
  return ESSENCES.every((e) => bonus[e] >= req[e]);
}

function currentPlayer(state: AlchemyState): PlayerState {
  return state.players[state.turn];
}

function findInMarket(state: AlchemyState, cardId: string): { tier: Tier; slot: number } | null {
  for (const tier of TIERS) {
    const slot = state.market[tier].indexOf(cardId);
    if (slot >= 0) return { tier, slot };
  }
  return null;
}

export function canTakeAnyToken(state: AlchemyState): boolean {
  return ESSENCES.some((e) => state.bank[e] > 0);
}

export function canReserveAny(state: AlchemyState, player: PlayerState): boolean {
  if (player.reserved.length >= MAX_RESERVED) return false;
  return TIERS.some((t) => state.decks[t].length > 0 || state.market[t].some((c) => c !== null));
}

export function buyableCards(state: AlchemyState, player: PlayerState): string[] {
  const ids: string[] = [];
  for (const tier of TIERS) for (const id of state.market[tier]) if (id && paymentFor(player, CARDS[id])) ids.push(id);
  for (const r of player.reserved) if (paymentFor(player, CARDS[r.cardId])) ids.push(r.cardId);
  return ids;
}

export function hasAnyAction(state: AlchemyState, player: PlayerState): boolean {
  return canTakeAnyToken(state) || canReserveAny(state, player) || buyableCards(state, player).length > 0;
}

// ───────────────────────── 시작 ─────────────────────────

export function setup(playerIds: PlayerId[], _options: AlchemyOptions, seed: number): AlchemyState {
  if (playerIds.length < 2 || playerIds.length > 4) throw new Error('2~4명만 플레이할 수 있습니다.');
  const random = createRng(seed);
  const n = essenceTokenCount(playerIds.length);
  const bank: TokenCounts = { insect: n, fish: n, plant: n, bird: n, env: n, joker: JOKER_COUNT };
  const decks = {} as Record<Tier, string[]>;
  const market = {} as Record<Tier, (string | null)[]>;
  for (const tier of TIERS) {
    const deck = shuffle(
      CARD_LIST.filter((c) => c.tier === tier).map((c) => c.id),
      random,
    );
    market[tier] = [];
    for (let i = 0; i < MARKET_SIZE; i++) market[tier].push(deck.pop() ?? null);
    decks[tier] = deck;
  }
  // 인원수+1장. 같은 쌤(이름)의 타일은 한 판에 한 장만
  const patrons: string[] = [];
  const usedNames = new Set<string>();
  for (const p of shuffle(PATRON_LIST, random)) {
    if (patrons.length >= playerIds.length + 1) break;
    if (usedNames.has(p.name)) continue;
    usedNames.add(p.name);
    patrons.push(p.id);
  }
  const order = shuffle(playerIds, random);
  return {
    options: { targetScore: TARGET_SCORE },
    players: order.map((id) => ({ id, tokens: emptyTokens(), cards: [], reserved: [], patrons: [] })),
    turn: 0,
    round: 1,
    bank,
    decks,
    market,
    patrons,
    phase: 'action',
    patronChoices: [],
    finalRound: false,
    consecutivePasses: 0,
    log: [],
    result: null,
  };
}

// ───────────────────────── 검증 ─────────────────────────

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isEssence = (v: unknown): v is Essence => typeof v === 'string' && (ESSENCES as readonly string[]).includes(v);

export function validate(state: AlchemyState, playerId: PlayerId, action: AlchemyAction): string | null {
  if (!action || typeof action !== 'object') return '잘못된 행동입니다.';
  if (state.phase === 'ended') return '게임이 이미 끝났습니다.';
  const player = currentPlayer(state);
  if (player.id !== playerId) return '내 차례가 아닙니다.';

  if (state.phase === 'discard' && action.type !== 'discard') return '먼저 토큰을 반납해야 합니다.';
  if (state.phase === 'patron' && action.type !== 'choosePatron') return '먼저 쌤을 골라야 합니다.';
  if (state.phase === 'action' && (action.type === 'discard' || action.type === 'choosePatron')) {
    return '지금은 할 수 없는 행동입니다.';
  }

  switch (action.type) {
    case 'take': {
      const colors = action.colors;
      if (!Array.isArray(colors) || colors.length < 1 || colors.length > 3 || !colors.every(isEssence)) {
        return '토큰을 1~3개 골라 주세요.';
      }
      const distinct = new Set(colors).size;
      const available = ESSENCES.filter((e) => state.bank[e] > 0).length;
      if (colors.length === 2 && distinct === 1) {
        if (state.bank[colors[0]] < TAKE_TWO_MIN) {
          return `같은 토큰 2개는 은행에 ${TAKE_TWO_MIN}개 이상 남아 있을 때만 가져올 수 있습니다.`;
        }
        return null;
      }
      if (distinct !== colors.length) return '서로 다른 토큰을 고르거나, 같은 토큰 2개만 골라 주세요.';
      for (const c of colors) if (state.bank[c] < 1) return '은행에 남아 있지 않은 토큰입니다.';
      // 서로 다른 토큰은 3개. 은행에 남은 색이 3가지 미만일 때만 남은 색을 모두 가져간다.
      const required = Math.min(3, available);
      if (colors.length !== required) return `서로 다른 토큰 ${required}개를 골라 주세요.`;
      return null;
    }
    case 'reserve': {
      if (player.reserved.length >= MAX_RESERVED) return `예약은 최대 ${MAX_RESERVED}장까지입니다.`;
      if (!findInMarket(state, action.cardId)) return '진열대에 없는 카드입니다.';
      return null;
    }
    case 'reserveDeck': {
      if (player.reserved.length >= MAX_RESERVED) return `예약은 최대 ${MAX_RESERVED}장까지입니다.`;
      if (!TIERS.includes(action.tier)) return '잘못된 단계입니다.';
      if (state.decks[action.tier].length === 0) return '덱이 비어 있습니다.';
      return null;
    }
    case 'buy': {
      const inMarket = findInMarket(state, action.cardId);
      const inReserve = player.reserved.some((r) => r.cardId === action.cardId);
      if (!inMarket && !inReserve) return '등록할 수 없는 카드입니다.';
      if (action.payment !== undefined) {
        const checked = checkPayment(player, CARDS[action.cardId], action.payment);
        return typeof checked === 'string' ? checked : null;
      }
      if (!paymentFor(player, CARDS[action.cardId])) return '토큰이 부족합니다.';
      return null;
    }
    case 'discard': {
      const need = tokenTotal(player.tokens) - MAX_TOKENS;
      const given = action.tokens;
      if (!given || typeof given !== 'object') return '반납할 토큰을 골라 주세요.';
      let sum = 0;
      for (const [color, n] of Object.entries(given)) {
        if (!(TOKEN_COLORS as readonly string[]).includes(color)) return '잘못된 토큰입니다.';
        if (!isInt(n) || n < 0) return '잘못된 개수입니다.';
        if (n > player.tokens[color as TokenColor]) return '가지고 있는 것보다 많이 반납할 수 없습니다.';
        sum += n;
      }
      if (sum !== need) return `토큰을 정확히 ${need}개 반납해야 합니다.`;
      return null;
    }
    case 'choosePatron': {
      if (!state.patronChoices.includes(action.patronId)) return '고를 수 없는 쌤입니다.';
      return null;
    }
    case 'pass': {
      if (hasAnyAction(state, player)) return '할 수 있는 행동이 있으면 넘길 수 없습니다.';
      return null;
    }
    default:
      return '알 수 없는 행동입니다.';
  }
}

// ───────────────────────── 적용 ─────────────────────────

function refill(state: AlchemyState, tier: Tier, slot: number) {
  state.market[tier][slot] = state.decks[tier].pop() ?? null;
}

function giveJoker(state: AlchemyState, player: PlayerState): boolean {
  if (state.bank.joker <= 0) return false;
  state.bank.joker--;
  player.tokens.joker++;
  return true;
}

export function apply(prev: AlchemyState, playerId: PlayerId, action: AlchemyAction): AlchemyState {
  const state = structuredClone(prev);
  const player = currentPlayer(state);
  if (player.id !== playerId) throw new Error('not your turn');

  switch (action.type) {
    case 'take': {
      for (const c of action.colors) {
        state.bank[c]--;
        player.tokens[c]++;
      }
      state.log.push({ kind: 'take', player: player.id, tokens: [...action.colors] });
      state.consecutivePasses = 0;
      afterMainAction(state);
      break;
    }
    case 'reserve': {
      const pos = findInMarket(state, action.cardId)!;
      refill(state, pos.tier, pos.slot);
      player.reserved.push({ cardId: action.cardId, hidden: false });
      const got = giveJoker(state, player);
      state.log.push({ kind: 'reserve', player: player.id, cardId: action.cardId, tier: pos.tier, joker: got });
      state.consecutivePasses = 0;
      afterMainAction(state);
      break;
    }
    case 'reserveDeck': {
      const cardId = state.decks[action.tier].pop()!;
      player.reserved.push({ cardId, hidden: true });
      const got = giveJoker(state, player);
      state.log.push({ kind: 'reserve', player: player.id, cardId: null, tier: action.tier, joker: got });
      state.consecutivePasses = 0;
      afterMainAction(state);
      break;
    }
    case 'buy': {
      const card = CARDS[action.cardId];
      const pay =
        action.payment !== undefined ? (checkPayment(player, card, action.payment) as TokenCounts) : paymentFor(player, card)!;
      for (const c of TOKEN_COLORS) {
        player.tokens[c] -= pay[c];
        state.bank[c] += pay[c];
      }
      const pos = findInMarket(state, action.cardId);
      if (pos) refill(state, pos.tier, pos.slot);
      else player.reserved = player.reserved.filter((r) => r.cardId !== action.cardId);
      player.cards.push(action.cardId);
      state.log.push({ kind: 'buy', player: player.id, cardId: action.cardId, fromReserve: !pos });
      state.consecutivePasses = 0;
      afterMainAction(state);
      break;
    }
    case 'discard': {
      const returned: Partial<TokenCounts> = {};
      for (const c of TOKEN_COLORS) {
        const n = action.tokens[c] ?? 0;
        if (n > 0) {
          player.tokens[c] -= n;
          state.bank[c] += n;
          returned[c] = n;
        }
      }
      state.log.push({ kind: 'discard', player: player.id, tokens: returned });
      checkPatrons(state);
      break;
    }
    case 'choosePatron': {
      grantPatron(state, player, action.patronId);
      endTurn(state);
      break;
    }
    case 'pass': {
      state.consecutivePasses++;
      state.log.push({ kind: 'pass', player: player.id });
      endTurn(state);
      break;
    }
  }
  if (state.log.length > 120) state.log = state.log.slice(-120);
  return state;
}

function afterMainAction(state: AlchemyState) {
  if (tokenTotal(currentPlayer(state).tokens) > MAX_TOKENS) {
    state.phase = 'discard';
    return;
  }
  checkPatrons(state);
}

function checkPatrons(state: AlchemyState) {
  const player = currentPlayer(state);
  const eligible = state.patrons.filter((id) => qualifiesForPatron(player, id));
  if (eligible.length === 0) {
    endTurn(state);
  } else if (eligible.length === 1) {
    grantPatron(state, player, eligible[0]);
    endTurn(state);
  } else {
    state.phase = 'patron';
    state.patronChoices = eligible;
  }
}

function grantPatron(state: AlchemyState, player: PlayerState, patronId: string) {
  state.patrons = state.patrons.filter((id) => id !== patronId);
  player.patrons.push(patronId);
  state.patronChoices = [];
  state.log.push({ kind: 'patron', player: player.id, patronId });
}

function endTurn(state: AlchemyState) {
  const player = currentPlayer(state);
  if (!state.finalRound && pointsOf(player) >= state.options.targetScore) {
    state.finalRound = true;
    state.log.push({ kind: 'finalRound', player: player.id });
  }
  const next = (state.turn + 1) % state.players.length;
  const everyonePassed = state.consecutivePasses >= state.players.length;
  if ((state.finalRound && next === 0) || everyonePassed) {
    endGame(state);
    return;
  }
  state.turn = next;
  if (next === 0) state.round++;
  state.phase = 'action';
}

function endGame(state: AlchemyState) {
  state.phase = 'ended';
  state.log.push({ kind: 'end' });
  state.result = computeResult(state);
}

export function computeResult(state: AlchemyState): GameResult {
  const ranking = state.players
    .map((p) => ({ playerId: p.id, score: pointsOf(p), tiebreak: p.cards.length }))
    .sort((a, b) => b.score - a.score || a.tiebreak - b.tiebreak);
  const best = ranking[0];
  const winners = ranking.filter((r) => r.score === best.score && r.tiebreak === best.tiebreak).map((r) => r.playerId);
  return { winners, ranking };
}

// ───────────────────────── 보기 ─────────────────────────

export function view(state: AlchemyState, viewer: PlayerId | null): AlchemyView {
  return {
    viewer,
    options: state.options,
    players: state.players.map((p) => ({
      id: p.id,
      tokens: { ...p.tokens },
      cards: [...p.cards],
      reserved: p.reserved.map((r) => ({
        cardId: r.hidden && p.id !== viewer && state.phase !== 'ended' ? null : r.cardId,
        tier: CARDS[r.cardId].tier,
        hidden: r.hidden,
      })),
      patrons: [...p.patrons],
      bonuses: bonusesOf(p),
      points: pointsOf(p),
    })),
    turn: state.turn,
    round: state.round,
    bank: { ...state.bank },
    deckCounts: { 1: state.decks[1].length, 2: state.decks[2].length, 3: state.decks[3].length },
    market: { 1: [...state.market[1]], 2: [...state.market[2]], 3: [...state.market[3]] },
    patrons: [...state.patrons],
    phase: state.phase,
    patronChoices: [...state.patronChoices],
    finalRound: state.finalRound,
    log: state.log.slice(-60),
    result: state.result,
  };
}

export function activePlayer(state: AlchemyState): PlayerId | null {
  return state.phase === 'ended' ? null : state.players[state.turn].id;
}
