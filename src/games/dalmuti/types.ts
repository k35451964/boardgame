import type { PlayerId } from '../../engine/types';

export type Phase = 'revolution' | 'tax' | 'play' | 'roundEnd';

export interface Trick {
  by: PlayerId;
  cards: string[];
  rank: number;
  count: number;
}

export type DLog =
  | { kind: 'deal'; round: number }
  | { kind: 'play'; player: PlayerId; cards: string[]; rank: number }
  | { kind: 'pass'; player: PlayerId; absent?: boolean }
  | { kind: 'newTrick'; player: PlayerId }
  | { kind: 'finish'; player: PlayerId; place: number }
  | { kind: 'tax'; from: PlayerId; to: PlayerId; count: number }
  | { kind: 'revolution'; player: PlayerId; greater: boolean }
  | { kind: 'roundEnd'; round: number };

export interface DState {
  /** 이번 판 자리 순서 (지난 판 등수 순) */
  seats: PlayerId[];
  round: number;
  hands: Record<PlayerId, string[]>;
  phase: Phase;
  turn: PlayerId | null;
  trick: Trick | null;
  /** 지금 트릭에서 패스한 사람 */
  passed: PlayerId[];
  /** 이번 판에 손패를 다 턴 순서 */
  finished: PlayerId[];
  /** 지난 판 등수 (칭호 표시용) */
  lastOrder: PlayerId[] | null;
  /** 꼴찌들이 바칠 카드 (혁명 여부가 정해지면 적용) */
  taxPlan: { from: PlayerId; to: PlayerId; cards: string[] }[];
  /** 왕들이 돌려줄 카드 수 */
  taxReturns: { from: PlayerId; to: PlayerId; count: number }[];
  /** 조커 2장을 모두 가진 사람 (혁명을 선언할 수 있음) */
  revolutionCandidate: PlayerId | null;
  scores: Record<PlayerId, number>;
  log: DLog[];
}

export type DAction =
  | { type: 'play'; cards: string[] }
  | { type: 'pass' }
  /** 자리 비운 사람 대신: 선이어도 넘긴다 */
  | { type: 'absentPass' }
  | { type: 'taxReturn'; cards: string[] }
  | { type: 'revolution'; declare: boolean }
  | { type: 'deal'; seed: number };

export interface DPlayerView {
  id: PlayerId;
  count: number;
  /** 내 손패 (다른 사람은 null) */
  hand: string[] | null;
  passed: boolean;
  finishedPlace: number | null;
  lastPlace: number | null;
  score: number;
}

export interface DView {
  viewer: PlayerId | null;
  round: number;
  phase: Phase;
  turn: PlayerId | null;
  trick: Trick | null;
  players: DPlayerView[];
  finished: PlayerId[];
  lastOrder: PlayerId[] | null;
  /** 내가 돌려줄 카드 수 (세금 단계) */
  myTaxReturn: { to: PlayerId; count: number; received: string[] } | null;
  /** 세금 단계에서 아직 돌려주지 않은 사람 */
  taxPending: PlayerId[];
  /** 내가 혁명을 선언할 수 있는지 */
  canRevolt: boolean;
  /** 내가 꼴찌라서 바친 카드 */
  myTaxGiven: { to: PlayerId; cards: string[] } | null;
  log: DLog[];
}
