import type { PlayerId } from '../../engine/types';
import { JOKER_RANK, cardRank, isJoker } from './data';
import { setRank, sortHand } from './rules';
import type { DAction, DState } from './types';

/** 숫자별로 묶기 (조커 제외) */
function groups(hand: string[]): Map<number, string[]> {
  const m = new Map<number, string[]>();
  for (const c of hand) {
    if (isJoker(c)) continue;
    const r = cardRank(c);
    m.set(r, [...(m.get(r) ?? []), c]);
  }
  return m;
}

/**
 * 단순한 봇: 선이면 가장 약한 카드 묶음을 통째로 내고,
 * 따라갈 때는 이길 수 있는 가장 약한 묶음을 낸다. 조커는 아껴 둔다.
 */
export function botAction(s: DState, me: PlayerId, random: () => number): DAction {
  const hand = sortHand(s.hands[me]);
  const jokers = hand.filter(isJoker);

  if (s.phase === 'revolution') {
    // 꼴찌 쪽이면 혁명 선언
    const place = s.seats.indexOf(me);
    return { type: 'revolution', declare: place >= s.seats.length - 2 };
  }
  if (s.phase === 'tax') {
    const t = s.taxReturns.find((x) => x.from === me)!;
    // 가장 약한 카드를 돌려준다 (조커는 주지 않음)
    const weak = [...hand].filter((c) => !isJoker(c)).reverse();
    return { type: 'taxReturn', cards: weak.slice(0, t.count) };
  }
  if (s.phase === 'roundEnd') return { type: 'deal', seed: Math.floor(random() * 2 ** 31) };

  const g = groups(hand);
  const ranksWeakFirst = [...g.keys()].sort((a, b) => b - a);

  if (!s.trick) {
    if (ranksWeakFirst.length === 0) return { type: 'play', cards: jokers };
    // 가장 약한 숫자 묶음 (가끔은 두 번째로 약한 것)
    const pick = ranksWeakFirst[ranksWeakFirst.length > 1 && random() < 0.2 ? 1 : 0];
    return { type: 'play', cards: g.get(pick)! };
  }

  const need = s.trick.count;
  const options: string[][] = [];
  for (const r of ranksWeakFirst) {
    if (r >= s.trick.rank) continue;
    const cards = g.get(r)!;
    if (cards.length >= need) options.push(cards.slice(0, need));
    else if (cards.length + jokers.length >= need) options.push([...cards, ...jokers.slice(0, need - cards.length)]);
  }
  if (jokers.length >= need && JOKER_RANK < s.trick.rank) options.push(jokers.slice(0, need));
  // 조커를 안 쓰는 선택을 먼저
  options.sort((a, b) => a.filter(isJoker).length - b.filter(isJoker).length || setRank(b)! - setRank(a)!);
  const choice = options[0];
  // 손패가 많이 남았는데 강한 카드로만 이길 수 있으면 가끔 아껴 둔다
  if (!choice || (setRank(choice)! <= 3 && hand.length > 8 && random() < 0.6)) return { type: 'pass' };
  return { type: 'play', cards: choice };
}
