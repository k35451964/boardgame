import type { PlayerId } from '../engine/types';

export interface SeatInfo {
  id: PlayerId;
  name: string;
  bot: boolean;
  host: boolean;
  connected: boolean;
}

export interface ChatMessage {
  id: number;
  from: string;
  text: string;
  at: number;
  system?: boolean;
}

export type RoomStatus = 'connecting' | 'lobby' | 'playing' | 'ended' | 'closed';
export type ConnectionState = 'online' | 'connecting' | 'reconnecting' | 'offline';

export interface RoomSnapshot<View = unknown, Options = unknown> {
  code: string;
  gameId: string;
  isHost: boolean;
  /** 로컬(봇 연습) 모드면 true */
  local: boolean;
  /** 내 자리. 관전 중이면 null */
  myId: PlayerId | null;
  status: RoomStatus;
  seats: SeatInfo[];
  options: Options | null;
  view: View | null;
  chat: ChatMessage[];
  connection: ConnectionState;
  /** 사람에게 보여줄 문제 상황 (방을 못 찾음 등) */
  notice: string | null;
  /** 상태가 바뀔 때마다 1씩 증가 */
  version: number;
}

/** 화면이 방과 대화하는 방법. 방장/손님/로컬 모두 같은 모양이다. */
export interface RoomClient<View = unknown, Action = unknown, Options = unknown> {
  getSnapshot(): RoomSnapshot<View, Options>;
  subscribe(listener: () => void): () => void;
  act(action: Action): void;
  chat(text: string): void;
  leave(): void;
  // 아래는 방장만
  start?(): void;
  addBot?(): void;
  removeSeat?(id: PlayerId): void;
  setOptions?(options: Options): void;
  backToLobby?(): void;
  /** 행동이 거부되었을 때 화면에 띄울 메시지 */
  onError?: (message: string) => void;
}

// ───────── 통신 메시지 ─────────

export type ToHost =
  | { t: 'hello'; name: string; token: string; gameId: string }
  | { t: 'action'; action: unknown }
  | { t: 'chat'; text: string };

export type ToGuest =
  | { t: 'welcome'; you: PlayerId | null }
  | {
      t: 'sync';
      gameId: string;
      status: RoomStatus;
      seats: SeatInfo[];
      options: unknown;
      view: unknown;
      chat: ChatMessage[];
      version: number;
    }
  | { t: 'error'; message: string }
  | { t: 'closed'; reason: string };
