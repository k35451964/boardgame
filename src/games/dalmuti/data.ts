/** 카드: 숫자가 작을수록 강하고, 숫자만큼 장수가 있다 (1위 1장 … 12위 12장). 조커 2장. */
export interface RankInfo {
  rank: number;
  name: string;
  emoji: string;
  /** 사람 카드일 때 붙는 설명 */
  tag?: string;
}

/** 순서는 무작위로 정했다. 단, 농노(유미)는 가장 약하고 가장 많은 12번 */
export const RANKS: RankInfo[] = [
  { rank: 1, name: '하마', emoji: '🦛' },
  { rank: 2, name: '호랑이', emoji: '🐅' },
  { rank: 3, name: '장수풍뎅이', emoji: '🪲' },
  { rank: 4, name: '인간', emoji: '🧑' },
  { rank: 5, name: '벌꿀오소리', emoji: '🦡' },
  { rank: 6, name: '상어', emoji: '🦈' },
  { rank: 7, name: '북극곰', emoji: '🐻‍❄️' },
  { rank: 8, name: '코끼리', emoji: '🐘' },
  { rank: 9, name: '얼룩말', emoji: '🦓' },
  { rank: 10, name: '기린', emoji: '🦒' },
  { rank: 11, name: '코뿔소', emoji: '🦏' },
  { rank: 12, name: '유미', emoji: '👩‍🌾', tag: '농노' },
];

export const JOKER: RankInfo = { rank: 13, name: '김태성', emoji: '🤡', tag: '어릿광대' };
export const JOKER_COUNT = 2;
/** 조커만 낼 때의 숫자 (가장 약함) */
export const JOKER_RANK = 13;

export function rankInfo(rank: number): RankInfo | undefined {
  return rank === JOKER_RANK ? JOKER : RANKS[rank - 1];
}

/** 카드 id: 'r{숫자}-{번호}' 또는 'j-{번호}' */
export function cardRank(id: string): number {
  if (id.startsWith('j-')) return JOKER_RANK;
  return Number(id.slice(1, id.indexOf('-')));
}
export const isJoker = (id: string) => id.startsWith('j-');

export function fullDeck(): string[] {
  const deck: string[] = [];
  for (const r of RANKS) for (let i = 0; i < r.rank; i++) deck.push(`r${r.rank}-${i}`);
  for (let i = 1; i <= JOKER_COUNT; i++) deck.push(`j-${i}`);
  return deck;
}

/** 등수별 칭호 */
export function titleFor(place: number, total: number): string {
  if (place === 0) return '대왕';
  if (place === total - 1) return '노비';
  if (place === 1) return '귀족';
  if (place === total - 2) return '하인';
  return '평민';
}
