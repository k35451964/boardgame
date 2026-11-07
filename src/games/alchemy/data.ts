import { ESSENCES, type Card, type Essence, type EssenceCounts, type Patron, type Tier } from './types';

export const ESSENCE_INFO: Record<Essence | 'catalyst', { name: string; short: string }> = {
  fire: { name: '불꽃', short: '불' },
  water: { name: '물결', short: '물' },
  life: { name: '생명', short: '생' },
  light: { name: '빛', short: '빛' },
  shadow: { name: '그림자', short: '암' },
  catalyst: { name: '촉매', short: '촉' },
};

export const TIER_INFO: Record<Tier, { name: string }> = {
  1: { name: '기초 조제' },
  2: { name: '숙련 조제' },
  3: { name: '대연성' },
};

export const MARKET_SIZE = 4;
export const MAX_TOKENS = 10;
export const MAX_RESERVED = 3;
export const CATALYST_COUNT = 5;
/** 같은 정수 2개를 가져가려면 은행에 이 개수 이상 남아 있어야 한다. */
export const TAKE_TWO_MIN = 4;

/** 인원수별 정수 토큰 개수 */
export function essenceTokenCount(players: number): number {
  if (players <= 2) return 4;
  if (players === 3) return 5;
  return 7;
}

export function emptyEssences(): EssenceCounts {
  return { fire: 0, water: 0, life: 0, light: 0, shadow: 0 };
}

/**
 * 레시피 비용 패턴. 키는 "이 레시피 정수로부터 몇 칸 떨어진 정수인가"(0~4),
 * 값은 개수. 각 패턴을 다섯 정수 모두에 돌려서 적용하므로 색별 대칭이 보장된다.
 */
type Pattern = { cost: Partial<Record<0 | 1 | 2 | 3 | 4, number>>; points: number };

const PATTERNS: Record<Tier, Pattern[]> = {
  1: [
    { cost: { 1: 3 }, points: 0 },
    { cost: { 2: 2, 4: 1 }, points: 0 },
    { cost: { 1: 1, 2: 1, 3: 1 }, points: 0 },
    { cost: { 0: 1, 2: 1, 4: 2 }, points: 0 },
    { cost: { 1: 1, 2: 1, 3: 1, 4: 1 }, points: 0 },
    { cost: { 3: 2, 4: 2 }, points: 0 },
    { cost: { 2: 4 }, points: 1 },
    { cost: { 1: 2, 3: 1 }, points: 0 },
  ],
  2: [
    { cost: { 1: 3, 3: 2 }, points: 1 },
    { cost: { 0: 2, 2: 2, 4: 2 }, points: 1 },
    { cost: { 4: 5 }, points: 2 },
    { cost: { 2: 4, 3: 2, 4: 1 }, points: 2 },
    { cost: { 1: 6 }, points: 3 },
    { cost: { 0: 1, 1: 3, 3: 3 }, points: 2 },
  ],
  3: [
    { cost: { 1: 4, 2: 2, 3: 2, 4: 4 }, points: 3 },
    { cost: { 2: 6, 3: 3 }, points: 4 },
    { cost: { 1: 2, 3: 4, 4: 5 }, points: 4 },
    { cost: { 2: 5, 4: 5 }, points: 5 },
  ],
};

const CARD_NAMES: Record<Essence, Record<Tier, string[]>> = {
  fire: {
    1: ['불씨 가루', '따뜻한 생강차', '화염초 연고', '숯검댕 잉크', '도마뱀 기름', '매운 고추 물약', '횃불 기름', '불꽃놀이 화약'],
    2: ['용암 정수', '불사조 깃털 탕약', '대장장이의 비약', '화산재 결정', '붉은 사자 물약', '도깨비불 등잔'],
    3: ['태양 용광로', '불사조의 재생약', '꺼지지 않는 불꽃', '붉은 왕의 비전서'],
  },
  water: {
    1: ['새벽 이슬', '맑은 샘물', '해초 수프', '안개 한 병', '빗물 정제수', '진주 가루', '차가운 습포', '연못 물풀'],
    2: ['심해 잉크', '인어의 눈물', '서리 결정', '조류 나침반', '얼음 장미 물약', '안개 바다 지도'],
    3: ['대해의 심장', '빙하의 기억', '달의 조수 비약', '푸른 여왕의 비전서'],
  },
  life: {
    1: ['약초 다발', '이끼 연고', '버섯 수프', '새싹 즙', '꿀 물약', '민트 사탕', '쑥 뜸', '들꽃 화관'],
    2: ['맨드레이크 뿌리', '고목의 수액', '치유의 향', '덩굴 결계', '요정 꽃가루', '허브 정원 일지'],
    3: ['세계수의 열매', '만병통치약', '생명의 샘', '초록 현자의 비전서'],
  },
  light: {
    1: ['반딧불 등잔', '금가루', '해바라기 기름', '호박 조각', '밀랍 양초', '별사탕', '아침 햇살 병', '은방울 종'],
    2: ['황금 연금액', '별빛 결정', '천사의 깃털', '무지개 프리즘', '새벽 종소리', '햇무리 렌즈'],
    3: ['태양왕의 왕관', '황금 변성술', '별의 언어', '금빛 현자의 비전서'],
  },
  shadow: {
    1: ['박쥐 날개', '밤그늘 꽃', '까마귀 깃털', '그을음 가루', '거미줄 실', '수면 물약', '먹물 버섯', '부엉이 깃털'],
    2: ['저주 해독제', '그림자 망토', '악몽 포획병', '흑요석 거울', '투명 물약', '그믐달 부적'],
    3: ['일식의 비약', '망각의 강물', '밤의 계약서', '검은 현자의 비전서'],
  },
};

function buildCards(): Card[] {
  const cards: Card[] = [];
  for (const tier of [1, 2, 3] as Tier[]) {
    ESSENCES.forEach((essence, ei) => {
      PATTERNS[tier].forEach((pattern, pi) => {
        const cost = emptyEssences();
        for (const [offset, n] of Object.entries(pattern.cost)) {
          cost[ESSENCES[(ei + Number(offset)) % ESSENCES.length]] = n ?? 0;
        }
        cards.push({
          id: `c${tier}${ei}${pi}`,
          tier,
          essence,
          points: pattern.points,
          cost,
          name: CARD_NAMES[essence][tier][pi],
        });
      });
    });
  }
  return cards;
}

export const CARD_LIST: readonly Card[] = buildCards();
export const CARDS: Readonly<Record<string, Card>> = Object.fromEntries(CARD_LIST.map((c) => [c.id, c]));

const PATRON_NAMES = [
  '왕실 약제사',
  '떠돌이 상단주',
  '마법학교 교장',
  '등대지기 노인',
  '용 사냥꾼 길드',
  '수도원 원장',
  '해적 선장',
  '숲의 드루이드',
  '밤시장 상인',
  '왕국 기사단장',
];

function buildPatrons(): Patron[] {
  const patrons: Patron[] = [];
  ESSENCES.forEach((_, ei) => {
    // 두 가지 정수를 4개씩
    const pair = emptyEssences();
    pair[ESSENCES[ei]] = 4;
    pair[ESSENCES[(ei + 2) % 5]] = 4;
    patrons.push({ id: `p${ei}a`, name: PATRON_NAMES[ei], points: 3, require: pair });
  });
  ESSENCES.forEach((_, ei) => {
    // 세 가지 정수를 3개씩 (연속한 세 정수)
    const triple = emptyEssences();
    triple[ESSENCES[ei]] = 3;
    triple[ESSENCES[(ei + 1) % 5]] = 3;
    triple[ESSENCES[(ei + 3) % 5]] = 3;
    patrons.push({ id: `p${ei}b`, name: PATRON_NAMES[5 + ei], points: 3, require: triple });
  });
  return patrons;
}

export const PATRON_LIST: readonly Patron[] = buildPatrons();
export const PATRONS: Readonly<Record<string, Patron>> = Object.fromEntries(PATRON_LIST.map((p) => [p.id, p]));
