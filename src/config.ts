/** 사이트 이름과 게임 목록. 이름을 바꾸고 싶으면 여기만 고치면 된다. */
export const SITE_TITLE = '생교 보드게임';

/**
 * Firebase 웹 앱 설정.
 * Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에 나오는 값을 그대로 붙여 넣는다.
 * 이 값들은 웹사이트에 공개돼도 괜찮다 (데이터 보호는 database.rules.json 이 맡는다).
 */
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  appId: '',
};

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
