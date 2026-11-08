import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { CARD_LIST, ESSENCE_INFO, TIER_INFO } from './data';
import { ESSENCES, TIERS } from './types';

// CARDS.md 생성: npx vitest run --config vitest.sim.config.ts src/games/alchemy/cardlist.sim.ts
it('카드 목록 만들기', () => {
  let md = '# 생플렌더 카드 목록 (90종)\n\n그림을 넣고 싶은 종이 있으면 `public/cards/` 에 그림을 올리고 `src/games/alchemy/images.ts` 에 한 줄 추가하면 돼요.\n권장: 정사각형 400×400px, png · jpg · webp.\n';
  for (const e of ESSENCES) {
    md += `\n## ${ESSENCE_INFO[e].name}\n\n| 단계 | 종 · 서식지 | 점수 |\n|---|---|---|\n`;
    for (const t of TIERS) for (const c of CARD_LIST.filter((x) => x.essence === e && x.tier === t)) md += `| ${TIER_INFO[t].name} | ${c.name} | ${c.points} |\n`;
  }
  writeFileSync('CARDS.md', md);
});
