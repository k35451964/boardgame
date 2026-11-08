/** 사이트 이름과 게임 목록. 이름을 바꾸고 싶으면 여기만 고치면 된다. */
export const SITE_TITLE = '생교 보드게임';

/**
 * Firebase 웹 앱 설정.
 * Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에 나오는 값을 그대로 붙여 넣는다.
 * 이 값들은 웹사이트에 공개돼도 괜찮다 (데이터 보호는 database.rules.json 이 맡는다).
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDXnysqQHmCfVkfpXH4JvEyFirxzjpNkQU',
  authDomain: 'boradgame-a2237.firebaseapp.com',
  databaseURL: 'https://boradgame-a2237-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'boradgame-a2237',
  appId: '1:1085439938888:web:a5619d004511156ddc237d',
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
    title: '생플렌더',
    tagline: '곤충·어류·식물·조류·환경 토큰을 모아 생물 카드를 도감에 등록하세요. 흔한 종부터 멸종위기종까지, 쌤들의 눈에 들면 점수가 쑥쑥.',
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
