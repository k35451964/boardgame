import { describe, expect, it } from 'vitest';
import { CARD_LIST } from './data';
import { ART, ART_BY_NAME } from './ui/cardArt';

describe('카드 그림', () => {
  it('모든 종에 그 분야의 그림이 지정되어 있다', () => {
    for (const card of CARD_LIST) {
      const key = ART_BY_NAME[card.name];
      expect(key, card.name).toBeTruthy();
      expect(ART[card.essence][key], `${card.name} → ${key}`).toBeTruthy();
    }
  });
});
