import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { HandOps } from '../../engine/types';
import { fullDeck, isJoker } from './data';
import { dalmutiGame as G } from './index';
import { apply, secret, setRank, setup, substitute, validate, view } from './rules';
import type { DState } from './types';

const P4 = ['a', 'b', 'c', 'd'];
const total = (s: DState) => Object.values(s.hands).reduce((n, h) => n + h.length, 0);

describe('카드', () => {
  it('80장: 1위 1장 … 12위 12장 + 어릿광대 2장', () => {
    const deck = fullDeck();
    expect(deck.length).toBe(80);
    expect(new Set(deck).size).toBe(80);
    expect(deck.filter(isJoker).length).toBe(2);
    expect(deck.filter((c) => c.startsWith('r7-')).length).toBe(7);
  });
  it('묶음 숫자: 어릿광대는 맞춰지고, 혼자면 13, 섞이면 무효', () => {
    expect(setRank(['r5-0', 'r5-1'])).toBe(5);
    expect(setRank(['r5-0', 'j-1'])).toBe(5);
    expect(setRank(['j-1'])).toBe(13);
    expect(setRank(['r5-0', 'r6-0'])).toBeNull();
  });
});

describe('첫 판', () => {
  it('모든 카드를 나누고 첫 자리가 선', () => {
    const s = setup(P4, {}, 1);
    expect(total(s)).toBe(80);
    expect(s.round).toBe(1);
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(s.seats[0]);
    expect(Object.values(s.hands).map((h) => h.length).sort()).toEqual([20, 20, 20, 20]);
  });
  it('5명이면 16장씩', () => {
    const s = setup(['a', 'b', 'c', 'd', 'e'], {}, 2);
    expect(Object.values(s.hands).every((h) => h.length === 16)).toBe(true);
  });
});

describe('내기와 패스', () => {
  function withHands(hands: Record<string, string[]>): DState {
    const s = setup(P4, {}, 3);
    s.seats = [...P4];
    s.hands = hands;
    s.turn = 'a';
    return s;
  }
  it('같은 장수로 더 강한 카드만 낼 수 있다', () => {
    let s = withHands({ a: ['r9-0', 'r9-1', 'r2-0'], b: ['r8-0', 'r8-1', 'r10-0', 'r10-1'], c: ['r3-0'], d: ['r4-0'] });
    expect(validate(s, 'a', { type: 'pass' })).not.toBeNull(); // 선은 패스 불가
    expect(validate(s, 'a', { type: 'play', cards: ['r9-0', 'r2-0'] })).not.toBeNull(); // 섞임
    s = apply(s, 'a', { type: 'play', cards: ['r9-0', 'r9-1'] });
    expect(s.turn).toBe('b');
    expect(validate(s, 'b', { type: 'play', cards: ['r10-0', 'r10-1'] })).not.toBeNull(); // 약함
    expect(validate(s, 'b', { type: 'play', cards: ['r8-0'] })).not.toBeNull(); // 장수 다름
    expect(validate(s, 'b', { type: 'play', cards: ['r8-0', 'r8-1'] })).toBeNull();
  });
  it('모두 패스하면 마지막에 낸 사람이 새로 시작', () => {
    let s = withHands({ a: ['r9-0', 'r2-0'], b: ['r10-0'], c: ['r11-0'], d: ['r12-0'] });
    s = apply(s, 'a', { type: 'play', cards: ['r9-0'] });
    s = apply(s, 'b', { type: 'pass' });
    s = apply(s, 'c', { type: 'pass' });
    expect(s.trick).not.toBeNull();
    s = apply(s, 'd', { type: 'pass' });
    expect(s.trick).toBeNull();
    expect(s.turn).toBe('a');
  });
  it('다 낸 사람이 마지막에 냈으면 다음 사람이 선', () => {
    let s = withHands({ a: ['r9-0'], b: ['r10-0', 'r11-0'], c: ['r11-1', 'r12-0'], d: ['r12-1', 'r12-2'] });
    s = apply(s, 'a', { type: 'play', cards: ['r9-0'] });
    expect(s.finished).toEqual(['a']);
    s = apply(s, 'b', { type: 'pass' });
    s = apply(s, 'c', { type: 'pass' });
    s = apply(s, 'd', { type: 'pass' });
    expect(s.turn).toBe('b');
    expect(s.trick).toBeNull();
  });
  it('한 명만 남으면 판이 끝나고 점수와 다음 자리가 정해진다', () => {
    let s = withHands({ a: ['r1-0'], b: ['r2-0'], c: ['r3-0'], d: ['r12-0', 'r12-1'] });
    s = apply(s, 'a', { type: 'play', cards: ['r1-0'] });
    s = apply(s, 'b', { type: 'play', cards: ['r2-0'] }); // b도 다 냄 (같은 트릭이라도 더 약한 카드는 못 내지만 테스트용)
    s.trick = null;
    s.turn = 'c';
    s = apply(s, 'c', { type: 'play', cards: ['r3-0'] });
    expect(s.phase).toBe('roundEnd');
    expect(s.finished).toEqual(['a', 'b', 'c', 'd']);
    expect(s.scores).toEqual({ a: 3, b: 2, c: 1, d: 0 });
    expect(G.activePlayer(s)).toBeNull();
  });
});

describe('세금과 혁명', () => {
  function afterRound1(seed: number): DState {
    const s = setup(P4, {}, seed);
    s.phase = 'roundEnd';
    s.lastOrder = ['a', 'b', 'c', 'd'];
    return s;
  }
  it('꼴찌는 가장 좋은 카드 2장, 하인은 1장을 바치고, 왕들이 돌려준다', () => {
    // 조커가 한 사람에게 몰리지 않는 시드 찾기
    let s!: DState;
    for (let seed = 1; ; seed++) {
      s = apply(afterRound1(seed), 'a', { type: 'deal', seed });
      if (s.phase === 'tax') break;
    }
    expect(s.seats).toEqual(['a', 'b', 'c', 'd']);
    expect(s.hands.a.length).toBe(22);
    expect(s.hands.b.length).toBe(21);
    expect(s.hands.c.length).toBe(19);
    expect(s.hands.d.length).toBe(18);
    expect(validate(s, 'c', { type: 'taxReturn', cards: [s.hands.c[0]] })).not.toBeNull();
    expect(validate(s, 'a', { type: 'taxReturn', cards: [s.hands.a[0]] })).not.toBeNull(); // 2장 필요
    s = apply(s, 'a', { type: 'taxReturn', cards: s.hands.a.slice(-2) });
    s = apply(s, 'b', { type: 'taxReturn', cards: s.hands.b.slice(-1) });
    expect(Object.values(s.hands).map((h) => h.length)).toEqual([20, 20, 20, 20]);
    expect(s.phase).toBe('play');
    expect(s.turn).toBe('a');
  });
  it('어릿광대 2장을 가진 꼴찌가 혁명하면 자리가 뒤집히고 세금이 없다', () => {
    let s!: DState;
    for (let seed = 1; ; seed++) {
      s = apply(afterRound1(seed), 'a', { type: 'deal', seed });
      if (s.phase === 'revolution' && s.revolutionCandidate === 'd') break;
    }
    expect(view(s, 'd').canRevolt).toBe(true);
    expect(view(s, 'a').canRevolt).toBe(false);
    s = apply(s, 'd', { type: 'revolution', declare: true });
    expect(s.seats).toEqual(['d', 'c', 'b', 'a']);
    expect(s.phase).toBe('play');
    expect(s.turn).toBe('d');
    expect(Object.values(s.hands).every((h) => h.length === 20)).toBe(true);
  });
  it('혁명을 안 하면 세금이 그대로 진행된다', () => {
    let s!: DState;
    for (let seed = 1; ; seed++) {
      s = apply(afterRound1(seed), 'a', { type: 'deal', seed });
      if (s.phase === 'revolution') break;
    }
    const cand = s.revolutionCandidate!;
    s = apply(s, cand, { type: 'revolution', declare: false });
    expect(s.phase).toBe('tax');
    expect(s.hands.a.length).toBe(22);
  });
  it('자리 비운 사람 대신: 선이면 넘기고, 세금은 받은 카드를 그대로 돌려준다', () => {
    let s!: DState;
    for (let seed = 1; ; seed++) {
      s = apply(afterRound1(seed), 'a', { type: 'deal', seed });
      if (s.phase === 'tax') break;
    }
    const sub = substitute(s, 'a')!;
    expect(sub.type).toBe('taxReturn');
    expect(validate(s, 'a', sub)).toBeNull();
  });
});

/** DB처럼: 손패를 카드 id 집합으로 들고 handOps를 적용 */
function applyOps(db: Record<string, Set<string>>, ops: HandOps) {
  if (ops.replaceAll) for (const [p, h] of Object.entries(ops.replaceAll)) db[p] = new Set(h);
  for (const t of ops.transfers)
    for (const c of t.cards) {
      if (t.from) db[t.from].delete(c);
      if (t.to) db[t.to].add(c);
    }
  for (const p of ops.clear ?? []) db[p] = new Set();
}

describe('봇끼리 여러 판 + 온라인 저장 방식 검증', () => {
  it('4~8명, 각 3판씩: 규칙대로 진행되고, 손패를 모르는 쪽에서 계산해도 결과가 같다', () => {
    for (const n of [4, 5, 6, 7, 8]) {
      for (let seed = 1; seed <= 6; seed++) {
        const players = 'abcdefgh'.slice(0, n).split('');
        const random = createRng(seed * 13 + n);
        let s = G.setup(players, {}, seed);
        const db: Record<string, Set<string>> = Object.fromEntries(players.map((p) => [p, new Set(s.hands[p])]));
        let steps = 0;
        while (s.round <= 3 && steps < 5000) {
          steps++;
          const p = G.activePlayer(s) ?? s.seats[0];
          const action = G.bot!(s, p, random);
          expect(G.validate(s, p, action), JSON.stringify(action)).toBeNull();
          const next = G.apply(s, p, action);

          // 온라인: 행동하는 사람은 자기 손패만 안다
          const { pub } = secret.split(s);
          const partial = secret.merge(pub, { [p]: s.hands[p] });
          expect(G.validate(partial, p, action)).toBeNull();
          const nextPartial = G.apply(partial, p, action);
          if (action.type !== 'deal') {
            expect(secret.split(nextPartial).pub).toEqual(secret.split(next).pub);
          }
          applyOps(db, secret.handOps(partial, nextPartial, p, action));
          if (action.type === 'deal') applyOps(db, secret.handOps(s, next, p, action));
          for (const q of players) expect([...db[q]].sort(), `${q} 손패`).toEqual([...next.hands[q]].sort());

          if (next.phase !== 'roundEnd' && next.phase === 'play') expect(total(next)).toBeLessThanOrEqual(80);
          s = next;
        }
        expect(s.round).toBeGreaterThan(3);
      }
    }
  });
});
