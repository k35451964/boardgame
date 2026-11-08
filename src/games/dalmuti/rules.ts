import { createRng, shuffle } from '../../engine/rng';
import type { GameResult, HandOps, PlayerId } from '../../engine/types';
import { JOKER_RANK, cardRank, fullDeck, isJoker } from './data';
import type { DAction, DState, DView } from './types';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;

// ───────── 도우미 ─────────

/** 카드 묶음의 숫자. 조커는 다른 카드에 맞춰지고, 조커만 내면 13. 섞인 숫자면 null */
export function setRank(cards: string[]): number | null {
  const ranks = [...new Set(cards.filter((c) => !isJoker(c)).map(cardRank))];
  if (ranks.length > 1) return null;
  return ranks[0] ?? JOKER_RANK;
}

export function sortHand(hand: string[]): string[] {
  return [...hand].sort((a, b) => cardRank(a) - cardRank(b) || a.localeCompare(b));
}

/** 손패에서 카드 빼기. 모르는 손패('?')면 아무 '?'나 하나 뺀다 */
function removeCards(hand: string[], cards: string[]): string[] {
  const out = [...hand];
  for (const c of cards) {
    let i = out.indexOf(c);
    if (i < 0) i = out.indexOf('?');
    if (i >= 0) out.splice(i, 1);
  }
  return out;
}

const active = (s: DState) => s.seats.filter((p) => s.hands[p].length > 0);

function nextActive(s: DState, from: PlayerId): PlayerId | null {
  const n = s.seats.length;
  const start = s.seats.indexOf(from);
  for (let k = 1; k <= n; k++) {
    const p = s.seats[(start + k) % n];
    if (s.hands[p].length > 0) return p;
  }
  return null;
}

/** 꼴찌가 바칠 가장 좋은 카드 (숫자가 작은 것부터, 조커는 마지막) */
function bestCards(hand: string[], count: number): string[] {
  return sortHand(hand).slice(0, count);
}

// ───────── 시작과 카드 나누기 ─────────

export function setup(players: PlayerId[], _options: unknown, seed: number): DState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error('4~8명만 할 수 있어요.');
  const random = createRng(seed);
  const s: DState = {
    seats: shuffle(players, random),
    round: 0,
    hands: Object.fromEntries(players.map((p) => [p, []])),
    phase: 'roundEnd',
    turn: null,
    trick: null,
    passed: [],
    finished: [],
    lastOrder: null,
    taxPlan: [],
    taxReturns: [],
    revolutionCandidate: null,
    scores: Object.fromEntries(players.map((p) => [p, 0])),
    log: [],
  };
  return deal(s, Math.floor(random() * 2 ** 31));
}

function deal(prev: DState, seed: number): DState {
  const s = structuredClone(prev);
  const random = createRng(seed);
  if (s.lastOrder) s.seats = [...s.lastOrder];
  s.round++;
  const deck = shuffle(fullDeck(), random);
  s.hands = Object.fromEntries(s.seats.map((p) => [p, [] as string[]]));
  deck.forEach((c, i) => s.hands[s.seats[i % s.seats.length]].push(c));
  for (const p of s.seats) s.hands[p] = sortHand(s.hands[p]);
  s.trick = null;
  s.passed = [];
  s.finished = [];
  s.taxPlan = [];
  s.taxReturns = [];
  s.revolutionCandidate = null;
  s.log.push({ kind: 'deal', round: s.round });

  if (s.round === 1) {
    s.phase = 'play';
    s.turn = s.seats[0];
    return trimLog(s);
  }
  // 세금: 꼴찌 → 대왕 2장, 하인 → 귀족 1장 (가장 좋은 카드)
  const n = s.seats.length;
  const [king, noble] = [s.seats[0], s.seats[1]];
  const [servant, slave] = [s.seats[n - 2], s.seats[n - 1]];
  s.taxPlan = [
    { from: slave, to: king, cards: bestCards(s.hands[slave], 2) },
    { from: servant, to: noble, cards: bestCards(s.hands[servant], 1) },
  ];
  s.taxReturns = [
    { from: king, to: slave, count: 2 },
    { from: noble, to: servant, count: 1 },
  ];
  // 조커 2장을 한 사람이 다 가지면 혁명을 선언할 수 있다
  s.revolutionCandidate = s.seats.find((p) => s.hands[p].filter(isJoker).length === 2) ?? null;
  if (s.revolutionCandidate) {
    s.phase = 'revolution';
    s.turn = s.revolutionCandidate;
  } else {
    applyTax(s);
  }
  return trimLog(s);
}

function applyTax(s: DState) {
  for (const t of s.taxPlan) {
    s.hands[t.from] = removeCards(s.hands[t.from], t.cards);
    s.hands[t.to] = sortHand([...s.hands[t.to], ...t.cards]);
    s.log.push({ kind: 'tax', from: t.from, to: t.to, count: t.cards.length });
  }
  s.phase = 'tax';
  s.turn = s.taxReturns[0]?.from ?? null;
}

function startPlay(s: DState) {
  s.phase = 'play';
  s.taxPlan = [];
  s.taxReturns = [];
  s.revolutionCandidate = null;
  s.turn = s.seats[0];
  s.trick = null;
  s.passed = [];
}

function trimLog(s: DState): DState {
  if (s.log.length > 60) s.log = s.log.slice(-60);
  return s;
}

// ───────── 검증 ─────────

export function validate(s: DState, player: PlayerId, action: DAction): string | null {
  if (!action || typeof action !== 'object') return '잘못된 행동이에요.';
  const hand = s.hands[player];
  if (!hand) return '이 게임에 참여하지 않았어요.';
  switch (action.type) {
    case 'deal':
      if (s.phase !== 'roundEnd') return '판이 아직 끝나지 않았어요.';
      if (typeof action.seed !== 'number') return '잘못된 행동이에요.';
      return null;
    case 'revolution':
      if (s.phase !== 'revolution' || s.revolutionCandidate !== player) return '지금은 혁명을 선언할 수 없어요.';
      if (typeof action.declare !== 'boolean') return '잘못된 행동이에요.';
      return null;
    case 'taxReturn': {
      if (s.phase !== 'tax') return '지금은 카드를 돌려줄 때가 아니에요.';
      const t = s.taxReturns.find((x) => x.from === player);
      if (!t) return '돌려줄 카드가 없어요.';
      if (!Array.isArray(action.cards) || action.cards.length !== t.count) return `카드 ${t.count}장을 골라 주세요.`;
      if (new Set(action.cards).size !== action.cards.length) return '같은 카드를 두 번 고를 수 없어요.';
      if (!action.cards.every((c) => typeof c === 'string' && hand.includes(c))) return '가지고 있지 않은 카드예요.';
      return null;
    }
    case 'play': {
      if (s.phase !== 'play') return '지금은 카드를 낼 수 없어요.';
      if (s.turn !== player) return '내 차례가 아니에요.';
      const cards = action.cards;
      if (!Array.isArray(cards) || cards.length === 0) return '낼 카드를 골라 주세요.';
      if (new Set(cards).size !== cards.length) return '같은 카드를 두 번 고를 수 없어요.';
      if (!cards.every((c) => typeof c === 'string' && c !== '?' && hand.includes(c))) return '가지고 있지 않은 카드예요.';
      const rank = setRank(cards);
      if (rank === null) return '같은 숫자의 카드만 함께 낼 수 있어요. (어릿광대는 어디든 섞을 수 있어요)';
      if (s.trick) {
        if (cards.length !== s.trick.count) return `${s.trick.count}장을 내야 해요.`;
        if (rank >= s.trick.rank) return '앞사람보다 숫자가 작은(강한) 카드를 내야 해요.';
      }
      return null;
    }
    case 'pass':
      if (s.phase !== 'play') return '지금은 넘길 수 없어요.';
      if (s.turn !== player) return '내 차례가 아니에요.';
      if (!s.trick) return '선은 넘길 수 없어요. 아무 카드나 내 주세요.';
      return null;
    case 'absentPass':
      if (s.phase !== 'play' || s.turn !== player) return '지금은 넘길 수 없어요.';
      return null;
    default:
      return '알 수 없는 행동이에요.';
  }
}

// ───────── 적용 ─────────

export function apply(prev: DState, player: PlayerId, action: DAction): DState {
  if (action.type === 'deal') return deal(prev, action.seed);
  const s = structuredClone(prev);
  switch (action.type) {
    case 'revolution': {
      if (action.declare) {
        const greater = s.seats[s.seats.length - 1] === player;
        s.log.push({ kind: 'revolution', player, greater });
        // 꼴찌가 선언하면 대혁명: 자리(등수)가 뒤집힌다
        if (greater) s.seats.reverse();
        startPlay(s);
      } else {
        s.revolutionCandidate = null;
        applyTax(s);
      }
      break;
    }
    case 'taxReturn': {
      const t = s.taxReturns.find((x) => x.from === player)!;
      s.hands[player] = removeCards(s.hands[player], action.cards);
      s.hands[t.to] = sortHand([...s.hands[t.to], ...action.cards]);
      s.taxReturns = s.taxReturns.filter((x) => x !== t && x.from !== player);
      s.log.push({ kind: 'tax', from: player, to: t.to, count: action.cards.length });
      if (s.taxReturns.length === 0) startPlay(s);
      else s.turn = s.taxReturns[0].from;
      break;
    }
    case 'play': {
      const rank = setRank(action.cards)!;
      s.hands[player] = removeCards(s.hands[player], action.cards);
      s.trick = { by: player, cards: [...action.cards], rank, count: action.cards.length };
      s.passed = [];
      s.log.push({ kind: 'play', player, cards: [...action.cards], rank });
      if (s.hands[player].length === 0) {
        s.finished.push(player);
        s.log.push({ kind: 'finish', player, place: s.finished.length });
      }
      if (active(s).length <= 1) {
        endRound(s);
        break;
      }
      s.turn = nextActive(s, player);
      break;
    }
    case 'pass':
    case 'absentPass': {
      s.log.push({ kind: 'pass', player, absent: action.type === 'absentPass' || undefined });
      if (!s.trick) {
        // 자리 비운 사람이 선이면 다음 사람에게 선을 넘긴다
        s.turn = nextActive(s, player);
        break;
      }
      s.passed.push(player);
      const lastBy = s.trick.by;
      const others = active(s).filter((p) => p !== lastBy);
      if (others.every((p) => s.passed.includes(p))) {
        const leader = s.hands[lastBy].length > 0 ? lastBy : nextActive(s, lastBy)!;
        s.trick = null;
        s.passed = [];
        s.turn = leader;
        s.log.push({ kind: 'newTrick', player: leader });
      } else {
        s.turn = nextActive(s, player);
      }
      break;
    }
  }
  return trimLog(s);
}

function endRound(s: DState) {
  const last = active(s)[0];
  if (last) {
    s.finished.push(last);
    s.hands[last] = [];
  }
  const n = s.seats.length;
  s.finished.forEach((p, i) => (s.scores[p] += n - 1 - i));
  s.lastOrder = [...s.finished];
  s.phase = 'roundEnd';
  s.turn = null;
  s.trick = null;
  s.passed = [];
  s.log.push({ kind: 'roundEnd', round: s.round });
}

// ───────── 보기 ─────────

export function view(s: DState, viewer: PlayerId | null): DView {
  const mine = viewer ? s.taxReturns.find((t) => t.from === viewer) : undefined;
  const given = viewer && s.phase === 'tax' ? s.log.find((l) => l.kind === 'tax' && l.from === viewer) : undefined;
  const plan = viewer ? s.taxPlan.find((t) => t.from === viewer) : undefined;
  return {
    viewer,
    round: s.round,
    phase: s.phase,
    turn: s.turn,
    trick: s.trick,
    players: s.seats.map((p) => ({
      id: p,
      count: s.hands[p].length,
      hand: p === viewer ? sortHand(s.hands[p].filter((c) => c !== '?')) : null,
      passed: s.passed.includes(p),
      finishedPlace: s.finished.includes(p) ? s.finished.indexOf(p) : null,
      lastPlace: s.lastOrder ? s.lastOrder.indexOf(p) : null,
      score: s.scores[p] ?? 0,
    })),
    finished: [...s.finished],
    lastOrder: s.lastOrder,
    myTaxReturn: mine
      ? { to: mine.to, count: mine.count, received: s.taxPlan.find((t) => t.to === viewer)?.cards ?? [] }
      : null,
    taxPending: s.taxReturns.map((t) => t.from),
    canRevolt: s.phase === 'revolution' && s.revolutionCandidate === viewer,
    myTaxGiven: plan && given ? { to: plan.to, cards: plan.cards } : null,
    log: s.log.slice(-30),
  };
}

/** 지금 무언가 해야 하는 사람. 판이 끝났으면 null */
export function activePlayer(s: DState): PlayerId | null {
  return s.phase === 'roundEnd' ? null : s.turn;
}

export function result(s: DState): GameResult | null {
  if (s.phase !== 'roundEnd') return null;
  const ranking = s.seats
    .map((p) => ({ playerId: p, score: s.scores[p], tiebreak: s.lastOrder ? s.lastOrder.indexOf(p) : 0 }))
    .sort((a, b) => b.score - a.score || a.tiebreak - b.tiebreak);
  return { winners: [ranking[0].playerId], ranking };
}

// ───────── 자리 비운 사람 대신 ─────────

export function substitute(s: DState, player: PlayerId): DAction | null {
  if (s.phase === 'play' && s.turn === player) return { type: 'absentPass' };
  if (s.phase === 'revolution' && s.revolutionCandidate === player) return { type: 'revolution', declare: false };
  if (s.phase === 'tax') {
    // 받았던 카드를 그대로 돌려준다 (손패를 몰라도 할 수 있는 것)
    const received = s.taxPlan.find((t) => t.to === player)?.cards;
    if (received && s.taxReturns.some((t) => t.from === player)) return { type: 'taxReturn', cards: received };
  }
  return null;
}

// ───────── 온라인 저장: 손패는 따로 ─────────

type Pub = Omit<DState, 'hands'> & { handCounts: Record<PlayerId, number> };

export const secret = {
  split(s: DState) {
    const { hands, ...rest } = s;
    const pub: Pub = { ...rest, handCounts: Object.fromEntries(Object.entries(hands).map(([p, h]) => [p, h.length])) };
    return { pub, hands };
  },
  merge(pubRaw: unknown, known: Record<PlayerId, string[] | undefined>): DState {
    const { handCounts, ...rest } = pubRaw as Pub;
    const hands: Record<PlayerId, string[]> = {};
    for (const [p, n] of Object.entries(handCounts)) {
      const k = known[p];
      hands[p] = k && k.length === n ? sortHand(k) : Array(n).fill('?');
    }
    return { ...rest, hands };
  },
  handOps(prev: DState, next: DState, player: PlayerId, action: DAction): HandOps {
    switch (action.type) {
      case 'deal':
        return { replaceAll: next.hands, transfers: [] };
      case 'play': {
        const ops: HandOps = { transfers: [{ from: player, to: null, cards: action.cards }] };
        // 마지막 한 명이 남아 판이 끝나면 그 사람 손패도 비운다
        if (next.phase === 'roundEnd') ops.clear = next.seats.filter((p) => p !== player);
        return ops;
      }
      case 'taxReturn': {
        const t = prev.taxReturns.find((x) => x.from === player)!;
        return { transfers: [{ from: player, to: t.to, cards: action.cards }] };
      }
      case 'revolution':
        return action.declare ? { transfers: [] } : { transfers: prev.taxPlan.map((t) => ({ ...t })) };
      default:
        return { transfers: [] };
    }
  },
};
