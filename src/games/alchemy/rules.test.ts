import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import { CARDS, CARD_LIST, PATRON_LIST } from './data';
import { alchemyGame } from './index';
import { apply, bonusesOf, emptyTokens, paymentFor, pointsOf, setup, tokenTotal, validate, view } from './rules';
import { ESSENCES, type AlchemyState } from './types';

const P = ['a', 'b'];

function fresh(players = P, seed = 1): AlchemyState {
  return setup(players, { targetScore: 15 }, seed);
}

/** 테스트용: 현재 차례 플레이어 id */
const cur = (s: AlchemyState) => s.players[s.turn].id;

describe('카드 데이터', () => {
  it('85장이고 id가 겹치지 않는다', () => {
    expect(CARD_LIST.length).toBe(85);
    expect(new Set(CARD_LIST.map((c) => c.id)).size).toBe(85);
    expect(CARD_LIST.filter((c) => c.tier === 1).length).toBe(40);
    expect(CARD_LIST.filter((c) => c.tier === 2).length).toBe(25);
    expect(CARD_LIST.filter((c) => c.tier === 3).length).toBe(20);
  });
  it('색마다 같은 구성이다', () => {
    for (const e of ESSENCES) {
      const mine = CARD_LIST.filter((c) => c.essence === e);
      expect(mine.length).toBe(17);
      expect(mine.reduce((s, c) => s + c.points, 0)).toBe(CARD_LIST.reduce((s, c) => s + c.points, 0) / 5);
    }
  });
  it('후원자는 10명', () => {
    expect(PATRON_LIST.length).toBe(10);
  });
});

describe('시작', () => {
  it('인원수에 맞게 토큰과 후원자를 놓는다', () => {
    const s2 = fresh(['a', 'b']);
    expect(s2.bank.fire).toBe(4);
    expect(s2.patrons.length).toBe(3);
    const s4 = fresh(['a', 'b', 'c', 'd']);
    expect(s4.bank.fire).toBe(6);
    expect(s4.patrons.length).toBe(5);
    expect(s4.bank.catalyst).toBe(5);
    expect(s4.market[1].length).toBe(4);
    expect(s4.decks[1].length).toBe(36);
  });
  it('같은 시드면 같은 판', () => {
    expect(fresh(P, 42)).toEqual(fresh(P, 42));
  });
});

describe('정수 가져오기', () => {
  it('서로 다른 3개', () => {
    const s = fresh();
    const p = cur(s);
    expect(validate(s, p, { type: 'take', colors: ['fire', 'water', 'life'] })).toBeNull();
    const n = apply(s, p, { type: 'take', colors: ['fire', 'water', 'life'] });
    expect(n.players[0].tokens.fire).toBe(1);
    expect(n.bank.fire).toBe(3);
    expect(n.turn).toBe(1);
  });
  it('같은 색 2개는 4개 이상 남았을 때만', () => {
    const s = fresh();
    const p = cur(s);
    expect(validate(s, p, { type: 'take', colors: ['fire', 'fire'] })).toBeNull();
    s.bank.fire = 3;
    expect(validate(s, p, { type: 'take', colors: ['fire', 'fire'] })).not.toBeNull();
  });
  it('같은 색 3개나 촉매는 안 된다', () => {
    const s = fresh();
    const p = cur(s);
    expect(validate(s, p, { type: 'take', colors: ['fire', 'fire', 'fire'] })).not.toBeNull();
    expect(validate(s, p, { type: 'take', colors: ['catalyst' as never] })).not.toBeNull();
    expect(validate(s, p, { type: 'take', colors: ['fire', 'water', 'life', 'light'] })).not.toBeNull();
  });
  it('내 차례가 아니면 안 된다', () => {
    const s = fresh();
    const other = s.players[1].id;
    expect(validate(s, other, { type: 'take', colors: ['fire'] })).toBe('내 차례가 아닙니다.');
  });
});

describe('토큰 10개 제한', () => {
  it('넘으면 반납 단계로 가고, 정확한 개수만 반납 가능', () => {
    const s = fresh();
    const p = cur(s);
    s.players[0].tokens = { ...emptyTokens(), fire: 3, water: 3, life: 3 };
    const n = apply(s, p, { type: 'take', colors: ['light', 'shadow'] });
    expect(n.phase).toBe('discard');
    expect(n.turn).toBe(0);
    expect(validate(n, p, { type: 'take', colors: ['fire'] })).not.toBeNull();
    expect(validate(n, p, { type: 'discard', tokens: { fire: 2 } })).not.toBeNull();
    expect(validate(n, p, { type: 'discard', tokens: { fire: 1 } })).toBeNull();
    const m = apply(n, p, { type: 'discard', tokens: { fire: 1 } });
    expect(tokenTotal(m.players[0].tokens)).toBe(10);
    expect(m.phase).toBe('action');
    expect(m.turn).toBe(1);
  });
  it('반납 단계가 아닐 때 반납 행동은 거부', () => {
    const s = fresh();
    expect(validate(s, cur(s), { type: 'discard', tokens: {} })).not.toBeNull();
  });
});

describe('예약', () => {
  it('진열대 예약: 촉매를 받고 빈칸이 채워진다', () => {
    const s = fresh();
    const p = cur(s);
    const id = s.market[2][1]!;
    const deckBefore = s.decks[2].length;
    const n = apply(s, p, { type: 'reserve', cardId: id });
    expect(n.players[0].reserved).toEqual([{ cardId: id, hidden: false }]);
    expect(n.players[0].tokens.catalyst).toBe(1);
    expect(n.market[2][1]).not.toBe(id);
    expect(n.market[2][1]).not.toBeNull();
    expect(n.decks[2].length).toBe(deckBefore - 1);
  });
  it('덱 예약은 다른 사람에게 숨겨진다', () => {
    const s = fresh();
    const p = cur(s);
    const n = apply(s, p, { type: 'reserveDeck', tier: 3 });
    const other = n.players[1].id;
    expect(view(n, p).players[0].reserved[0].cardId).not.toBeNull();
    expect(view(n, other).players[0].reserved[0]).toEqual({ cardId: null, tier: 3, hidden: true });
    expect(view(n, null).players[0].reserved[0].cardId).toBeNull();
  });
  it('최대 3장', () => {
    const s = fresh();
    const p = cur(s);
    s.players[0].reserved = [
      { cardId: s.decks[1][0], hidden: true },
      { cardId: s.decks[1][1], hidden: true },
      { cardId: s.decks[1][2], hidden: true },
    ];
    expect(validate(s, p, { type: 'reserve', cardId: s.market[1][0]! })).not.toBeNull();
    expect(validate(s, p, { type: 'reserveDeck', tier: 1 })).not.toBeNull();
  });
  it('촉매가 없으면 예약만 한다', () => {
    const s = fresh();
    s.bank.catalyst = 0;
    const n = apply(s, cur(s), { type: 'reserveDeck', tier: 1 });
    expect(n.players[0].tokens.catalyst).toBe(0);
    expect(n.players[0].reserved.length).toBe(1);
  });
});

describe('레시피 익히기', () => {
  it('할인을 먼저 쓰고, 모자라면 촉매를 쓴다', () => {
    const card = CARD_LIST.find((c) => c.tier === 2 && c.cost.water === 3 && c.cost.light === 2)!;
    const player = {
      cards: [CARD_LIST.find((c) => c.tier === 1 && c.essence === 'water')!.id],
      tokens: { ...emptyTokens(), water: 1, light: 1, catalyst: 2 },
    };
    expect(bonusesOf(player).water).toBe(1);
    const pay = paymentFor(player, card)!;
    expect(pay).toEqual({ ...emptyTokens(), water: 1, light: 1, catalyst: 2 });
    expect(paymentFor({ ...player, tokens: { ...player.tokens, catalyst: 1 } }, card)).toBeNull();
  });
  it('사면 토큰이 은행으로 돌아가고 카드가 내 것이 된다', () => {
    const s = fresh();
    const p = cur(s);
    const id = s.market[1][0]!;
    s.players[0].tokens = { ...emptyTokens(), ...CARDS[id].cost };
    const bankBefore = tokenTotal(s.bank);
    const n = apply(s, p, { type: 'buy', cardId: id });
    expect(n.players[0].cards).toEqual([id]);
    expect(tokenTotal(n.players[0].tokens)).toBe(0);
    expect(tokenTotal(n.bank)).toBe(bankBefore + tokenTotal({ ...emptyTokens(), ...CARDS[id].cost }));
    expect(n.market[1]).not.toContain(id);
  });
  it('예약한 카드도 살 수 있다', () => {
    const s = fresh();
    const p = cur(s);
    const id = s.decks[3][0];
    s.players[0].reserved = [{ cardId: id, hidden: true }];
    expect(validate(s, p, { type: 'buy', cardId: id })).toBe('재료가 부족합니다.');
    s.players[0].tokens = { ...emptyTokens(), ...CARDS[id].cost };
    const n = apply(s, p, { type: 'buy', cardId: id });
    expect(n.players[0].reserved).toEqual([]);
    expect(n.players[0].cards).toEqual([id]);
  });
  it('남의 예약 카드나 덱 속 카드는 살 수 없다', () => {
    const s = fresh();
    s.players[0].tokens = { fire: 9, water: 9, life: 9, light: 9, shadow: 9, catalyst: 5 };
    expect(validate(s, cur(s), { type: 'buy', cardId: s.decks[1][0] })).not.toBeNull();
  });
});

describe('후원자', () => {
  it('조건을 채우면 자동으로 온다', () => {
    const s = fresh();
    const p = cur(s);
    const patron = PATRON_LIST.find((x) => x.id === s.patrons[0])!;
    // 후원자 조건만큼 레시피를 미리 쥐여 주고 하나 모자라게
    const cards: string[] = [];
    for (const e of ESSENCES) {
      const pool = CARD_LIST.filter((c) => c.essence === e && !Object.values(s.market).flat().includes(c.id));
      for (let i = 0; i < patron.require[e]; i++) cards.push(pool[i].id);
    }
    const last = cards.pop()!;
    s.players[0].cards = cards;
    s.players[0].reserved = [{ cardId: last, hidden: false }];
    s.players[0].tokens = { ...emptyTokens(), catalyst: 5, ...CARDS[last].cost };
    const n = apply(s, p, { type: 'buy', cardId: last });
    expect(n.players[0].patrons).toContain(patron.id);
    expect(n.patrons).not.toContain(patron.id);
    expect(pointsOf(n.players[0])).toBeGreaterThanOrEqual(3);
  });
  it('여럿이면 고르는 단계로 간다', () => {
    const s = fresh(['a', 'b', 'c', 'd'], 7);
    const p = cur(s);
    // 모든 색 5장씩: 어떤 후원자든 조건 충족
    const cards: string[] = [];
    for (const e of ESSENCES) cards.push(...CARD_LIST.filter((c) => c.essence === e).slice(0, 5).map((c) => c.id));
    s.players[0].cards = cards;
    const n = apply(s, p, { type: 'take', colors: ['fire'] });
    expect(n.phase).toBe('patron');
    expect(n.patronChoices.length).toBe(5);
    expect(validate(n, p, { type: 'take', colors: ['fire'] })).not.toBeNull();
    const m = apply(n, p, { type: 'choosePatron', patronId: n.patronChoices[2] });
    expect(m.players[0].patrons).toEqual([n.patronChoices[2]]);
    expect(m.patrons.length).toBe(4);
    expect(m.phase).toBe('action');
  });
});

describe('게임 끝', () => {
  it('목표 점수에 닿으면 그 라운드 마지막 사람까지 하고 끝난다', () => {
    const s = fresh(['a', 'b', 'c'], 3);
    const high = CARD_LIST.filter((c) => c.tier === 3 && !Object.values(s.market).flat().includes(c.id));
    s.players[1].cards = high.slice(0, 4).map((c) => c.id); // 15점 이상
    s.turn = 1;
    let n = apply(s, s.players[1].id, { type: 'take', colors: ['fire'] });
    expect(n.finalRound).toBe(true);
    expect(n.phase).toBe('action');
    expect(n.turn).toBe(2);
    n = apply(n, n.players[2].id, { type: 'take', colors: ['fire'] });
    expect(n.phase).toBe('ended');
    expect(n.result!.winners).toEqual([s.players[1].id]);
    expect(alchemyGame.activePlayer(n)).toBeNull();
  });
  it('동점이면 레시피가 적은 사람이 이긴다', () => {
    const s = fresh(['a', 'b'], 5);
    const t3 = CARD_LIST.filter((c) => c.tier === 3);
    const five = t3.filter((c) => c.points === 5);
    const three = t3.filter((c) => c.points === 3);
    s.players[0].cards = [five[0].id, five[1].id, five[2].id]; // 15점 3장
    s.players[1].cards = [five[3].id, five[4].id, three[0].id, CARD_LIST.find((c) => c.points === 1 && c.tier === 1)!.id, CARD_LIST.filter((c) => c.points === 1 && c.tier === 1)[1].id];
    let n = apply(s, s.players[0].id, { type: 'take', colors: ['fire'] });
    n = apply(n, n.players[1].id, { type: 'take', colors: ['fire'] });
    expect(n.phase).toBe('ended');
    expect(n.result!.ranking[0].score).toBe(15);
    expect(n.result!.ranking[1].score).toBe(15);
    expect(n.result!.winners).toEqual([s.players[0].id]);
  });
  it('할 게 없을 때만 넘기기 가능', () => {
    const s = fresh();
    expect(validate(s, cur(s), { type: 'pass' })).not.toBeNull();
  });
});

describe('봇끼리 끝까지', () => {
  it('2~4인 게임이 항상 규칙대로 끝난다', () => {
    for (const n of [2, 3, 4]) {
      for (let seed = 1; seed <= 30; seed++) {
        const players = ['a', 'b', 'c', 'd'].slice(0, n);
        let s = alchemyGame.setup(players, { targetScore: 15 }, seed);
        const random = createRng(seed * 7);
        let steps = 0;
        while (alchemyGame.activePlayer(s) && steps < 2000) {
          const p = alchemyGame.activePlayer(s)!;
          const a = alchemyGame.bot!(s, p, random);
          const err = alchemyGame.validate(s, p, a);
          expect(err, JSON.stringify(a)).toBeNull();
          s = alchemyGame.apply(s, p, a);
          // 토큰 총량 보존
          const total = tokenTotal(s.bank) + s.players.reduce((t, x) => t + tokenTotal(x.tokens), 0);
          expect(total).toBe(5 * (n === 2 ? 4 : n === 3 ? 5 : 6) + 5);
          steps++;
        }
        expect(s.phase).toBe('ended');
      }
    }
  });
});
