import type { ReactElement } from 'react';
import type { Card, Essence } from '../types';
import { CARD_IMAGES } from '../images';

/** 분야별 실루엣 그림 3가지씩 (64×64). 카드 배경에 은은하게 깔린다. */
const stroke = { stroke: 'currentColor', fill: 'none', strokeLinecap: 'round' as const };

const petals = Array.from({ length: 10 }, (_, i) => (
  <ellipse key={i} cx="32" cy="10.5" rx="3.2" ry="7" transform={`rotate(${i * 36} 32 20)`} />
));

export const ART: Record<Essence, Record<string, ReactElement>> = {
  insect: {
    ladybug: <g key="ladybug">
      <circle cx="32" cy="16" r="7" />
      <path
        fillRule="evenodd"
        d="M32 20c-11 0-19 8.5-19 19.5C13 50 21.5 58 32 58s19-8 19-18.5C51 28.5 43 20 32 20zm-1.2 3h2.4v32h-2.4zM23 31a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm18 0a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM24 43a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm16 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
      <path d="M14 30l-7-4M13 40H5M15 50l-7 5M50 30l7-4M51 40h8M49 50l7 5M28 10l-4-6M36 10l4-6" strokeWidth="2.5" {...stroke} />
    </g>,
    butterfly: <g key="butterfly">
      <path d="M31 20c-4-8-14-12-22-9-6 2-5 12 0 18 4 5 11 7 19 6-6 3-11 9-9 16 2 6 9 6 13 1 2-3 2-7 1-10z" />
      <path d="M33 20c4-8 14-12 22-9 6 2 5 12 0 18-4 5-11 7-19 6 6 3 11 9 9 16-2 6-9 6-13 1-2-3-2-7-1-10z" />
      <rect x="30" y="17" width="4" height="34" rx="2" />
      <path d="M31 18c-2-5-5-8-9-10M33 18c2-5 5-8 9-10" strokeWidth="2" {...stroke} />
    </g>,
    beetle: <g key="beetle">
      <path d="M32 3c2.5 4 3.5 9 2.2 15h-4.4C28.5 12 29.5 7 32 3z" />
      <ellipse cx="32" cy="22" rx="8" ry="6" />
      <path fillRule="evenodd" d="M32 27c-10 0-15 7-15 15 0 10 7 18 15 18s15-8 15-18c0-8-5-15-15-15zm-1 4h2v26h-2z" />
      <path d="M18 34l-8-4M17 44H8M19 53l-7 6M46 34l8-4M47 44h9M45 53l7 6" strokeWidth="2.5" {...stroke} />
    </g>,
    dragonfly: (
      <g key="dragonfly">
        <circle cx="32" cy="10" r="4.5" />
        <rect x="30" y="14" width="4" height="9" rx="2" />
        <rect x="30.6" y="22" width="2.8" height="38" rx="1.4" />
        <path d="M30 16C22 10 9 10 4 14c4 5 15 6 26 4zM34 16c8-6 21-6 26-2-4 5-15 6-26 4zM30 20c-7 3-17 9-20 15 7 1 15-5 20-12zM34 20c7 3 17 9 20 15-7 1-15-5-20-12z" />
      </g>
    ),
    bee: (
      <g key="bee">
        <circle cx="20" cy="34" r="6" />
        <path fillRule="evenodd" d="M44 22c-10 0-20 5-20 12s10 12 20 12 16-5 16-12-6-12-16-12zM34 23h4v22h-4zM44 22h4v24h-4z" />
        <path d="M31 26c-6-10-2-20 6-20 6 0 6 10-2 18zM41 24c0-10 8-16 14-12 4 4-2 12-12 14z" opacity=".55" />
        <path d="M16 30l-6-7M19 29l-2-9" strokeWidth="2" {...stroke} />
      </g>
    ),
    ant: (
      <g key="ant">
        <circle cx="13" cy="30" r="6" />
        <ellipse cx="27" cy="31" rx="6" ry="4.5" />
        <ellipse cx="46" cy="32" rx="12" ry="8" />
        <path d="M9 25l-4-9M14 24l1-10M24 34l-5 12M28 35l1 13M31 34l7 12M24 28l-6-10M30 28l4-11" strokeWidth="2.2" {...stroke} />
      </g>
    ),
    grasshopper: (
      <g key="grasshopper">
        <path d="M6 30c0-5 4-8 9-8h30c8 0 14 3 14 7s-6 6-14 6H15c-5 0-9-1-9-5z" />
        <path d="M40 34l8-15 6 27M27 35l-4 12M19 35l-3 10M10 23L4 10M14 22l2-12" strokeWidth="2.5" {...stroke} />
      </g>
    ),
    cicada: (
      <g key="cicada">
        <ellipse cx="32" cy="14" rx="9" ry="5" />
        <path d="M26 18h12l-2 22c-1 4-3 6-4 6s-3-2-4-6z" />
        <path d="M27 19C18 22 10 34 10 50c8-4 14-14 17-26zM37 19c9 3 17 15 17 31-8-4-14-14-17-26z" opacity=".55" />
      </g>
    ),
  },
  fish: {
    fish: <g key="fish">
      <path
        fillRule="evenodd"
        d="M4 20l10 12-10 12h6l8-8c5 7 13 11 22 11 10 0 17-6 20-15-3-9-10-15-20-15-9 0-17 4-22 11l-8-8zm44 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
      <path d="M34 18c2-5 7-8 12-8-2 3-3 6-3 9zM36 46c1 4 4 7 9 8-2-3-2-6-2-9z" />
    </g>,
    minnow: <g key="minnow">
      <path
        fillRule="evenodd"
        d="M2 32l8-7v5c8-6 20-9 32-8 9 1 16 5 20 10-4 5-11 9-20 10-12 1-24-2-32-8v5zm49-3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
      />
      <path d="M30 23l4-8 6 8z" />
      <path d="M20 31c8 2 18 2 30-1" strokeWidth="1.5" stroke="#0003" fill="none" />
    </g>,
    catfish: <g key="catfish">
      <path
        fillRule="evenodd"
        d="M6 24l8 9-8 9h5l7-6c6 6 15 9 25 9 9 0 15-5 17-12-2-7-8-12-17-12-10 0-19 3-25 9l-7-6zm42 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
      />
      <path d="M58 37c3 3 4 7 3 11M56 39c1 4 0 8-2 11M57 29c3-2 5-5 5-9" strokeWidth="1.8" {...stroke} />
    </g>,
  },
  plant: {
    flower: <g key="flower">
      {petals}
      <circle cx="32" cy="20" r="5.5" />
      <rect x="30.8" y="26" width="2.4" height="34" rx="1" />
      <path d="M32 47c-6-8-15-9-21-6 5 5 12 8 21 6zM32 53c6-7 14-8 20-5-5 5-12 7-20 5z" />
    </g>,
    leafy: <g key="leafy">
      <rect x="30.8" y="12" width="2.4" height="48" rx="1" />
      <path d="M32 22c-3-8-10-12-18-11 1 8 8 13 18 11zM32 34c4-8 12-11 20-9-2 8-10 12-20 9zM32 46c-4-7-11-10-19-8 2 7 9 11 19 8zM32 15c-2.5-5 0-10 0-12 0 2 2.5 7 0 12z" />
    </g>,
    tree: <g key="tree">
      <path d="M32 4L18 24h7L13 40h9L8 56h48L42 40h9L39 24h7z" />
      <rect x="29" y="54" width="6" height="8" />
    </g>,
  },
  bird: {
    perched: <g key="perched">
      <path
        fillRule="evenodd"
        d="M44 14c-6 0-10 4-11 9-8 1-15 7-17 15l-10 8 13-2c4 6 11 9 18 8 9-1 15-8 15-17 0-4-1-7-3-10l7-3-7-2c-1-4-3-6-5-6zm1 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
      />
      <path d="M8 59h50" strokeWidth="3" {...stroke} />
      <path d="M34 52v7M40 52v7" strokeWidth="2" {...stroke} />
    </g>,
    flying: <g key="flying">
      <path d="M2 30c10-9 22-8 30 6 8-14 20-15 30-6-10-1-20 4-30 18C22 34 12 29 2 30z" />
      <path d="M38 10c4-3.6 8.8-3.2 12 2.4 3.2-5.6 8-6 12-2.4-4-.4-8 1.6-12 7.2C46 11.6 42 9.6 38 10z" />
    </g>,
    crane: <g key="crane">
      <path d="M40 6c3 0 5 2 5 4l8 2-8 1c-1 2-2 4-4 5-1 6-2 12 2 18 2 3 2 7-1 10-4 4-12 5-19 2-6-3-10-9-12-16 6 5 13 6 18 4 3-1 6-4 6-8 0-6-1-12 1-18-1-1-1-2-1-3 0-1 2-3 5-3z" />
      <path d="M30 46l-3 16M34 46l3 16" strokeWidth="2" {...stroke} />
    </g>,
    owl: (
      <g key="owl">
        <path
          fillRule="evenodd"
          d="M16 12l6 6c3-1.5 6.5-2 10-2s7 .5 10 2l6-6v14c2 3 3 7 3 11 0 12-8 21-19 21S13 49 13 37c0-4 1-8 3-11zm9 13a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm14 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM30 36l2 4 2-4z"
        />
        <path d="M8 60h48" strokeWidth="3" {...stroke} />
      </g>
    ),
    duck: (
      <g key="duck">
        <path d="M18 18c0-5 4-9 9-9 6 0 9 5 8 10l6 1-6 3c-1 4-4 7-6 10 8-1 18-4 25-10 2 10-4 22-20 24-12 1-22-5-24-14 4 2 9 2 12 0-3-3-4-8-4-15z" />
        <path d="M4 56c5-3 9-3 14 0s9 3 14 0 9-3 14 0 9 3 14 0" strokeWidth="2.5" {...stroke} />
      </g>
    ),
  },
  env: {
    mountain: <g key="mountain">
      <circle cx="47" cy="15" r="7" />
      <path d="M2 58l18-29 9 13 8-11 25 27z" />
    </g>,
    wetland: <g key="wetland">
      <path d="M14 42V12M20 42V20M44 42V14M50 42V22" strokeWidth="2.4" {...stroke} />
      <ellipse cx="14" cy="14" rx="2.6" ry="6.5" />
      <ellipse cx="44" cy="16" rx="2.6" ry="6.5" />
      <path d="M4 45c5-4 9-4 14 0s9 4 14 0 9-4 14 0 9 4 14 0v6c-5 4-9 4-14 0s-9-4-14 0-9 4-14 0-9-4-14 0zM4 55c5-4 9-4 14 0s9 4 14 0 9-4 14 0 9 4 14 0v7H4z" />
    </g>,
    forest: <g key="forest">
      <circle cx="18" cy="20" r="11" />
      <rect x="16.5" y="28" width="3" height="12" />
      <circle cx="45" cy="15" r="9" />
      <rect x="43.5" y="21" width="3" height="12" />
      <path d="M26 40c9 0 16 3 16 8s-10 6-10 14h-9c0-9 10-9 10-13s-7-5-13-5z" />
    </g>,
  },
};

/** 종마다 어울리는 그림. 목록에 없으면 분야의 첫 그림 */
export const ART_BY_NAME: Record<string, string> = {
  무당벌레: 'ladybug', 배추흰나비: 'butterfly', 방아깨비: 'grasshopper', 일본왕개미: 'ant', 꿀벌: 'bee',
  고추잠자리: 'dragonfly', 참매미: 'cicada', 왕귀뚜라미: 'grasshopper', 장수풍뎅이: 'beetle', 넓적사슴벌레: 'beetle',
  늦반딧불이: 'beetle', 호랑나비: 'butterfly', 꼬마잠자리: 'dragonfly', 물방개: 'beetle', 장수하늘소: 'beetle',
  붉은점모시나비: 'butterfly', 산굴뚝나비: 'butterfly', 수염풍뎅이: 'beetle',
  붕어: 'fish', 피라미: 'minnow', 송사리: 'minnow', 미꾸라지: 'minnow', 잉어: 'fish', 메기: 'catfish',
  버들치: 'minnow', 갈겨니: 'minnow', 쉬리: 'minnow', 꺽지: 'fish', 쏘가리: 'fish', 각시붕어: 'fish',
  납자루: 'fish', 동사리: 'catfish', 꼬치동자개: 'catfish', 감돌고기: 'fish', 흰수마자: 'minnow', 얼룩새코미꾸리: 'minnow',
  민들레: 'flower', 쑥: 'leafy', 강아지풀: 'leafy', 질경이: 'leafy', 토끼풀: 'leafy', 제비꽃: 'flower',
  개나리: 'flower', 냉이: 'leafy', 금강초롱꽃: 'flower', 할미꽃: 'flower', 얼레지: 'flower', 노루귀: 'flower',
  매발톱: 'flower', 구상나무: 'tree', 광릉요강꽃: 'flower', 나도풍란: 'flower', 한란: 'flower', 섬개야광나무: 'tree',
  참새: 'perched', 까치: 'perched', 멧비둘기: 'perched', 직박구리: 'perched', 박새: 'perched', 청둥오리: 'duck',
  제비: 'flying', 큰부리까마귀: 'perched', 원앙: 'duck', 물총새: 'perched', 소쩍새: 'owl', 꾀꼬리: 'perched',
  오색딱다구리: 'perched', 수리부엉이: 'owl', 황새: 'crane', 저어새: 'crane', 두루미: 'crane', 검독수리: 'flying',
  개울: 'forest', 연못: 'wetland', 논: 'wetland', 텃밭: 'forest', 뒷산: 'mountain', 갯벌: 'wetland',
  모래톱: 'wetland', '공원 숲': 'forest', 습지: 'wetland', 하구: 'wetland', 계곡: 'forest', 석회동굴: 'mountain',
  오름: 'mountain', 해안사구: 'wetland', '람사르 습지': 'wetland', 국립공원: 'mountain', 생태통로: 'forest', 'DMZ 생태계': 'forest',
};

/** 카드 배경 그림: 친구들이 그린 그림이 있으면 그것, 없으면 분야별 실루엣 */
export function CardArt({ card }: { card: Card }) {
  const image = CARD_IMAGES[card.name];
  if (image) {
    return <img className="card-photo" src={`${import.meta.env.BASE_URL}cards/${image}`} alt="" loading="lazy" draggable={false} />;
  }
  const set = ART[card.essence];
  const art = set[ART_BY_NAME[card.name]] ?? Object.values(set)[0];
  return (
    <svg className="card-art" viewBox="0 0 64 64" fill="currentColor" aria-hidden>
      {art}
    </svg>
  );
}
