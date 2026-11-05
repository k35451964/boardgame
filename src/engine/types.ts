/**
 * 모든 보드게임이 따르는 공통 규격.
 * 새 게임을 추가할 때는 이 인터페이스를 구현하는 모듈 하나와 화면 컴포넌트만 만들면 된다.
 * 규칙 함수는 모두 "순수 함수"여야 한다: 같은 입력이면 같은 결과, 입력 상태를 직접 바꾸지 않음.
 */
export type PlayerId = string;

export interface GameResult {
  winners: PlayerId[];
  ranking: { playerId: PlayerId; score: number; tiebreak: number }[];
}

export interface GameDefinition<State, Action, View, Options> {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  defaultOptions: Options;
  /** 게임 시작 상태를 만든다. seed로 섞기 때문에 같은 seed면 같은 판이 나온다. */
  setup(players: PlayerId[], options: Options, seed: number): State;
  /** 행동이 규칙에 맞으면 null, 아니면 이유(한국어 문장)를 돌려준다. */
  validate(state: State, player: PlayerId, action: Action): string | null;
  /** 검증을 통과한 행동을 적용한 새 상태를 돌려준다. */
  apply(state: State, player: PlayerId, action: Action): State;
  /** 지금 입력해야 하는 플레이어. 게임이 끝났으면 null. */
  activePlayer(state: State): PlayerId | null;
  /** 특정 플레이어에게 보여줄 화면용 상태 (숨김 정보 가림). viewer가 null이면 관전자. */
  view(state: State, viewer: PlayerId | null): View;
  result(state: State): GameResult | null;
  /** 컴퓨터 플레이어의 다음 행동. */
  bot?(state: State, player: PlayerId, random: () => number): Action;
}
