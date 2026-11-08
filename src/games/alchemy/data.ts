import { ESSENCES, type Card, type Essence, type EssenceCounts, type Patron, type Tier } from './types';

export const ESSENCE_INFO: Record<Essence | 'joker', { name: string; short: string }> = {
  insect: { name: '곤충', short: '곤' },
  fish: { name: '어류', short: '어' },
  plant: { name: '식물', short: '식' },
  bird: { name: '조류', short: '조' },
  env: { name: '환경', short: '환' },
  joker: { name: '생교', short: '생' },
};

export const TIER_INFO: Record<Tier, { name: string }> = {
  1: { name: '흔한 종' },
  2: { name: '보호종' },
  3: { name: '멸종위기' },
};

export const MARKET_SIZE = 4;
export const MAX_TOKENS = 10;
export const MAX_RESERVED = 3;
export const JOKER_COUNT = 5;
/** 같은 토큰 2개를 가져가려면 은행에 이 개수 이상 남아 있어야 한다. */
export const TAKE_TWO_MIN = 4;

/** 인원수별 토큰 토큰 개수 */
export function essenceTokenCount(players: number): number {
  if (players <= 2) return 4;
  if (players === 3) return 5;
  return 7;
}

export function emptyEssences(): EssenceCounts {
  return { insect: 0, fish: 0, plant: 0, bird: 0, env: 0 };
}

/**
 * 카드 비용 패턴. 키는 "이 카드 토큰으로부터 몇 칸 떨어진 토큰인가"(0~4),
 * 값은 개수. 각 패턴을 다섯 토큰 모두에 돌려서 적용하므로 색별 대칭이 보장된다.
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

/** 실제 한국 자생종 · 서식지. 1단계 흔한 종, 2단계 보호·특산종, 3단계 멸종위기종 */
const CARD_NAMES: Record<Essence, Record<Tier, string[]>> = {
  insect: {
    1: ['무당벌레', '배추흰나비', '방아깨비', '일본왕개미', '꿀벌', '고추잠자리', '참매미', '왕귀뚜라미'],
    2: ['장수풍뎅이', '넓적사슴벌레', '늦반딧불이', '호랑나비', '꼬마잠자리', '물방개'],
    3: ['장수하늘소', '붉은점모시나비', '산굴뚝나비', '수염풍뎅이'],
  },
  fish: {
    1: ['붕어', '피라미', '송사리', '미꾸라지', '잉어', '메기', '버들치', '갈겨니'],
    2: ['쉬리', '꺽지', '쏘가리', '각시붕어', '납자루', '동사리'],
    3: ['꼬치동자개', '감돌고기', '흰수마자', '얼룩새코미꾸리'],
  },
  plant: {
    1: ['민들레', '쑥', '강아지풀', '질경이', '토끼풀', '제비꽃', '개나리', '냉이'],
    2: ['금강초롱꽃', '할미꽃', '얼레지', '노루귀', '매발톱', '구상나무'],
    3: ['광릉요강꽃', '나도풍란', '한란', '섬개야광나무'],
  },
  bird: {
    1: ['참새', '까치', '멧비둘기', '직박구리', '박새', '청둥오리', '제비', '큰부리까마귀'],
    2: ['원앙', '물총새', '소쩍새', '꾀꼬리', '오색딱다구리', '수리부엉이'],
    3: ['황새', '저어새', '두루미', '검독수리'],
  },
  env: {
    1: ['개울', '연못', '논', '텃밭', '뒷산', '갯벌', '모래톱', '공원 숲'],
    2: ['습지', '하구', '계곡', '석회동굴', '오름', '해안사구'],
    3: ['람사르 습지', '국립공원', '생태통로', 'DMZ 생태계'],
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

/**
 * 쌤 6명. 두 분야 4장씩(3명) 또는 세 분야 3장씩(3명).
 * 다섯 분야가 조건에 똑같이 3번씩 들어가도록 짰다.
 */
function patron(id: string, name: string, require: Partial<EssenceCounts>): Patron {
  return { id, name, points: 3, require: { ...emptyEssences(), ...require } };
}

function buildPatrons(): Patron[] {
  return [
    patron('p-chae', '채쌤', { insect: 4, plant: 4 }),
    patron('p-yang', '양쌤', { fish: 4, bird: 4 }),
    patron('p-kim', '김쌤', { plant: 4, env: 4 }),
    patron('p-jang', '장쌤', { insect: 3, fish: 3, bird: 3 }),
    patron('p-hwang', '황쌤', { insect: 3, bird: 3, env: 3 }),
    patron('p-office', '과사쌤', { fish: 3, plant: 3, env: 3 }),
  ];
}

export const PATRON_LIST: readonly Patron[] = buildPatrons();
export const PATRONS: Readonly<Record<string, Patron>> = Object.fromEntries(PATRON_LIST.map((p) => [p.id, p]));
