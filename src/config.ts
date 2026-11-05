/** 사이트 이름과 게임 목록. 이름을 바꾸고 싶으면 여기만 고치면 된다. */
export const SITE_TITLE = '생교 보드게임';

export interface GameEntry {
  id: string;
  title: string;
  tagline: string;
  players: string;
  minutes: string;
  ready: boolean;
}

export const GAMES: GameEntry[] = [
  {
    id: 'alchemy',
    title: '생교 연금공방',
    tagline: '정수를 모아 레시피를 익히고, 익힌 레시피로 더 큰 비약을 만드세요. 후원자를 먼저 모시는 연금술사가 이깁니다.',
    players: '2~4명',
    minutes: '30~45분',
    ready: true,
  },
  {
    id: 'next',
    title: '다음 게임',
    tagline: '곧 추가될 예정이에요.',
    players: '',
    minutes: '',
    ready: false,
  },
];
