import type { GameResult, PlayerId } from '../../engine/types';

/** 다섯 가지 토큰(재료). 순서가 곧 색 순환 순서다. */
export const ESSENCES = ['insect', 'fish', 'plant', 'bird', 'env'] as const;
export type Essence = (typeof ESSENCES)[number];
/** 생교는 어떤 토큰으로도 쓸 수 있는 만능 토큰. */
export type TokenColor = Essence | 'joker';
export const TOKEN_COLORS: readonly TokenColor[] = [...ESSENCES, 'joker'];

export type EssenceCounts = Record<Essence, number>;
export type TokenCounts = Record<TokenColor, number>;
export type Tier = 1 | 2 | 3;
export const TIERS: readonly Tier[] = [1, 2, 3];

export interface Card {
  id: string;
  tier: Tier;
  /** 이 카드를 등록하면 영구히 얻는 토큰(할인). */
  essence: Essence;
  points: number;
  cost: EssenceCounts;
  name: string;
}

export interface Patron {
  id: string;
  name: string;
  points: number;
  /** 필요한 카드(할인) 개수 */
  require: EssenceCounts;
}

export interface ReservedCard {
  cardId: string;
  /** 덱 맨 위에서 몰래 예약했으면 다른 사람에게 숨긴다. */
  hidden: boolean;
}

export interface PlayerState {
  id: PlayerId;
  tokens: TokenCounts;
  cards: string[];
  reserved: ReservedCard[];
  patrons: string[];
}

export interface AlchemyOptions {
  targetScore: number;
}

export type Phase = 'action' | 'discard' | 'patron' | 'ended';

export type LogEntry =
  | { kind: 'take'; player: PlayerId; tokens: Essence[] }
  | { kind: 'buy'; player: PlayerId; cardId: string; fromReserve: boolean }
  | { kind: 'reserve'; player: PlayerId; cardId: string | null; tier: Tier; joker: boolean }
  | { kind: 'discard'; player: PlayerId; tokens: Partial<TokenCounts> }
  | { kind: 'patron'; player: PlayerId; patronId: string }
  | { kind: 'pass'; player: PlayerId }
  | { kind: 'finalRound'; player: PlayerId }
  | { kind: 'end' };

export interface AlchemyState {
  options: AlchemyOptions;
  /** 턴 순서대로 */
  players: PlayerState[];
  turn: number;
  round: number;
  bank: TokenCounts;
  decks: Record<Tier, string[]>;
  market: Record<Tier, (string | null)[]>;
  patrons: string[];
  phase: Phase;
  /** phase가 'patron'일 때 고를 수 있는 쌤 */
  patronChoices: string[];
  finalRound: boolean;
  consecutivePasses: number;
  log: LogEntry[];
  result: GameResult | null;
}

export type AlchemyAction =
  /** 서로 다른 토큰 3개 (은행에 남은 색이 3가지 미만이면 남은 색 모두), 또는 같은 토큰 2개 (은행에 4개 이상 있을 때) */
  | { type: 'take'; colors: Essence[] }
  /** 진열된 카드 예약 */
  | { type: 'reserve'; cardId: string }
  /** 덱 맨 위 카드를 몰래 예약 */
  | { type: 'reserveDeck'; tier: Tier }
  /** 진열된 카드 또는 내가 예약한 카드 등록하기.
   *  payment를 생략하면 색 토큰을 먼저 쓰고 모자란 만큼 생교를 쓴다.
   *  직접 주면 색 토큰 대신 생교를 더 낼 수 있다. */
  | { type: 'buy'; cardId: string; payment?: Partial<TokenCounts> }
  /** 토큰이 10개를 넘으면 반납 */
  | { type: 'discard'; tokens: Partial<TokenCounts> }
  | { type: 'choosePatron'; patronId: string }
  /** 할 수 있는 행동이 하나도 없을 때만 */
  | { type: 'pass' };

export interface PlayerView {
  id: PlayerId;
  tokens: TokenCounts;
  cards: string[];
  /** 숨겨진 예약은 cardId가 null */
  reserved: { cardId: string | null; tier: Tier; hidden: boolean }[];
  patrons: string[];
  bonuses: EssenceCounts;
  points: number;
}

export interface AlchemyView {
  viewer: PlayerId | null;
  options: AlchemyOptions;
  players: PlayerView[];
  turn: number;
  round: number;
  bank: TokenCounts;
  deckCounts: Record<Tier, number>;
  market: Record<Tier, (string | null)[]>;
  patrons: string[];
  phase: Phase;
  patronChoices: string[];
  finalRound: boolean;
  log: LogEntry[];
  result: GameResult | null;
}
