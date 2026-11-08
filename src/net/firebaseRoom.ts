import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type DatabaseReference,
} from 'firebase/database';
import { createRng, randomSeed } from '../engine/rng';
import type { PlayerId } from '../engine/types';
import { BOT_DELAY_MS, MAX_CHAT, makeRoomCode, pickBotName, randomId, uniqueName, winnerText, type AnyGame } from './common';
import { database, myUid } from './firebase';
import type { ChatMessage, ConnectionState, RoomClient, RoomSnapshot, RoomStatus, SeatInfo } from './types';

/**
 * 데이터베이스 구조 (rooms/{방코드})
 *   meta      { gameId, hostUid, createdAt }      처음 만들 때 한 번만 씀
 *   options   게임 설정 (방장만)
 *   seats     { [자리id]: { name, bot, order } }  사람은 자리id = 로그인 id
 *   game      { json, version }                  게임 상태 전체 (JSON 문자열)
 *   chat      { [자동id]: { uid, from, text, at, system? } }
 *   presence  { [로그인id]: true }                 지금 접속 중인 사람
 */
interface SeatData {
  name: string;
  bot: boolean;
  order: number;
}
interface RoomData {
  meta?: { gameId: string; hostUid: string; createdAt: number };
  options?: unknown;
  seats?: Record<string, SeatData>;
  game?: { json: string; version: number };
  chat?: Record<string, { uid: string; from: string; text: string; at: number; system?: boolean }>;
  presence?: Record<string, boolean>;
}

/** 새 방을 만들고 방 코드를 돌려준다. */
/** 방 만들기에 실패한 이유를 사람이 알아볼 수 있는 문장으로 */
export function explainFirebaseError(e: unknown): string {
  const text = String((e as { code?: string })?.code ?? '') + ' ' + String(e);
  if (/operation-not-allowed|admin-restricted-operation/.test(text)) {
    return '익명 로그인이 꺼져 있어요. Firebase 콘솔 → Authentication → 로그인 방법 → "익명"을 사용 설정해 주세요.';
  }
  if (/PERMISSION_DENIED|permission_denied|ROOM_RULES/.test(text)) {
    return '데이터베이스 규칙이 아직 적용되지 않았어요. Firebase 콘솔 → Realtime Database → 규칙 탭에 database.rules.json 내용을 붙여 넣고 "게시"해 주세요.';
  }
  if (/unauthorized-domain/.test(text)) {
    return '이 사이트 주소가 허용되지 않았어요. Firebase 콘솔 → Authentication → 설정 → 승인된 도메인에 k35451964.github.io 를 추가해 주세요.';
  }
  if (/api-key|invalid-api-key|API key/i.test(text)) {
    return 'Firebase 설정값(apiKey)이 올바르지 않아요.';
  }
  if (/network|offline|timeout/i.test(text)) {
    return 'Firebase에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.';
  }
  return `방을 만들지 못했어요. (${text.trim().slice(0, 120)})`;
}

export async function createOnlineRoom(game: AnyGame, name: string): Promise<string> {
  const uid = await myUid();
  const db = database();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode();
    try {
      await update(ref(db, `rooms/${code}`), {
        meta: { gameId: game.id, hostUid: uid, createdAt: serverTimestamp() },
        options: game.defaultOptions,
        [`seats/${uid}`]: { name: name.slice(0, 12) || '방장', bot: false, order: serverTimestamp() },
      });
      return code;
    } catch (e) {
      // 같은 코드의 방이 이미 있으면 권한 오류가 난다 → 다른 코드로 다시
      if (!String(e).includes('PERMISSION_DENIED')) throw e;
    }
  }
  // 무작위 코드 5개가 모두 겹칠 리는 없으므로, 계속 거부되면 규칙 문제다
  throw new Error('ROOM_RULES PERMISSION_DENIED');
}

export class FirebaseRoom implements RoomClient {
  private uid: string | null = null;
  private data: RoomData | null = null;
  private loaded = false;
  private hadSeat = false;
  private joinAttempted = false;
  private spectatorNoticeShown = false;
  private connected = false;
  private presenceOn = false;
  private state: unknown = null;
  private stateVersion = -1;
  private listeners = new Set<() => void>();
  private unsubs: (() => void)[] = [];
  private snapshot: RoomSnapshot;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private notice: string | null = null;
  private readonly botRandom = createRng(randomSeed());
  onError?: (message: string) => void;

  constructor(
    private readonly code: string,
    private readonly game: AnyGame,
    private readonly name: string,
  ) {
    this.snapshot = this.buildSnapshot();
    void this.init();
  }

  // ───────── RoomClient ─────────

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async act(action: unknown) {
    const me = this.snapshot.myId;
    if (!me) return this.onError?.('관전 중에는 둘 수 없어요.');
    let error: string | null = null;
    try {
      const res = await runTransaction(this.ref('game'), (cur: RoomData['game'] | null) => {
        if (!cur) return cur;
        const state = JSON.parse(cur.json);
        try {
          error = this.game.validate(state, me, action);
        } catch {
          error = '잘못된 행동입니다.';
        }
        if (error) return undefined; // 취소
        const next = this.game.apply(state, me, action);
        return { json: JSON.stringify(next), version: cur.version + 1 };
      });
      if (!res.committed) {
        if (error) this.onError?.(error);
        return;
      }
      this.afterCommit(res.snapshot.val());
    } catch (e) {
      console.error(e);
      this.onError?.('저장하지 못했어요. 인터넷 연결을 확인해 주세요.');
    }
  }

  chat(text: string) {
    const clean = String(text ?? '').trim().slice(0, 200);
    if (!clean || !this.uid) return;
    const me = this.data?.seats?.[this.uid];
    void push(this.ref('chat'), {
      uid: this.uid,
      from: (me?.name ?? this.name ?? '관전자').slice(0, 20),
      text: clean,
      at: serverTimestamp(),
    }).catch(() => this.onError?.('메시지를 보내지 못했어요.'));
  }

  leave() {
    this.closed = true;
    if (this.botTimer) clearTimeout(this.botTimer);
    for (const u of this.unsubs) u();
    this.unsubs = [];
    if (this.uid && this.presenceOn) void remove(this.ref(`presence/${this.uid}`)).catch(() => {});
  }

  /** 방장 전용: 방을 완전히 지운다. 다른 사람들에게는 "방이 닫혔어요"가 뜬다. */
  async destroy() {
    try {
      await remove(this.ref(''));
    } catch {
      this.onError?.('방을 닫지 못했어요.');
    }
    this.leave();
  }

  async start() {
    if (!this.isHost()) return;
    if (this.state && this.status() === 'playing') return;
    const players = this.playerSeats().map((s) => s.id);
    if (players.length < this.game.minPlayers) {
      this.onError?.(`최소 ${this.game.minPlayers}명이 필요해요. 친구를 부르거나 봇을 추가하세요.`);
      return;
    }
    const state = this.game.setup(players, this.data?.options ?? this.game.defaultOptions, randomSeed());
    try {
      const cur = this.data?.game;
      await set(this.ref('game'), { json: JSON.stringify(state), version: cur ? cur.version + 1 : 1 });
      this.systemChat('게임을 시작합니다!');
    } catch (e) {
      console.error(e);
      this.onError?.('게임을 시작하지 못했어요.');
    }
  }

  addBot() {
    if (!this.isHost() || this.state) return;
    if (this.seatList().length >= this.game.maxPlayers) {
      this.onError?.(`최대 ${this.game.maxPlayers}명까지예요.`);
      return;
    }
    const name = pickBotName(this.seatList().map((s) => s.name));
    void set(this.ref(`seats/${randomId('bot-')}`), { name, bot: true, order: serverTimestamp() }).catch(() =>
      this.onError?.('봇을 추가하지 못했어요.'),
    );
  }

  removeSeat(id: PlayerId) {
    if (!this.isHost() || this.state || id === this.uid) return;
    const seat = this.data?.seats?.[id];
    void remove(this.ref(`seats/${id}`)).then(() => {
      if (seat && !seat.bot) this.systemChat(`${seat.name} 님이 자리에서 나갔어요.`);
    });
  }

  setOptions(options: unknown) {
    if (!this.isHost() || this.state) return;
    void set(this.ref('options'), options);
  }

  /** 연결이 끊긴 사람의 차례를 봇이 대신 둔다 (자리에 앉은 사람만) */
  substitute(playerId: PlayerId) {
    if (!this.snapshot.myId || !this.state || this.status() !== 'playing') return;
    const seat = this.data?.seats?.[playerId];
    if (!seat || seat.bot || this.data?.presence?.[playerId]) return;
    if (this.game.activePlayer(this.state) !== playerId) return;
    void this.runBot(playerId, this.stateVersion, false);
  }

  backToLobby() {
    if (!this.isHost() || this.status() !== 'ended') return;
    void remove(this.ref('game'));
  }

  // ───────── 내부 ─────────

  private ref(path: string): DatabaseReference {
    return ref(database(), `rooms/${this.code}${path ? `/${path}` : ''}`);
  }

  private async init() {
    try {
      this.uid = await myUid();
    } catch (e) {
      console.error(e);
      this.notice = '로그인하지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.';
      this.refresh();
      return;
    }
    if (this.closed) return;
    const db = database();
    this.unsubs.push(
      onValue(ref(db, '.info/connected'), (snap) => {
        this.connected = snap.val() === true;
        if (!this.connected) this.presenceOn = false;
        this.ensurePresence();
        this.refresh();
      }),
    );
    this.unsubs.push(
      onValue(
        this.ref(''),
        (snap) => this.handleRoom(snap.val() as RoomData | null),
        (err) => {
          console.error(err);
          this.notice = '방 정보를 읽을 수 없어요.';
          this.refresh();
        },
      ),
    );
  }

  private handleRoom(data: RoomData | null) {
    if (this.closed) return;
    if (!data?.meta) {
      this.data = null;
      this.notice = this.loaded ? '방장이 방을 닫았어요.' : '방을 찾을 수 없어요. 방 코드를 확인해 주세요.';
      this.loaded = true;
      this.refresh(true);
      return;
    }
    if (data.meta.gameId !== this.game.id) {
      this.data = null;
      this.notice = '다른 게임의 방이에요.';
      this.loaded = true;
      this.refresh(true);
      return;
    }
    this.data = data;
    this.loaded = true;

    if (data.game && data.game.version !== this.stateVersion) {
      try {
        this.state = JSON.parse(data.game.json);
        this.stateVersion = data.game.version;
      } catch {
        console.error('게임 상태를 읽지 못했어요');
      }
    } else if (!data.game) {
      this.state = null;
      this.stateVersion = -1;
    }

    this.maybeJoin();
    this.ensurePresence();
    this.refresh();
    this.scheduleBot();
  }

  /** 처음 들어왔을 때 자리에 앉는다. 게임이 이미 시작했으면 관전. */
  private maybeJoin() {
    const uid = this.uid!;
    const seats = this.data?.seats ?? {};
    const mine = seats[uid];
    if (mine) {
      this.hadSeat = true;
      if (!this.joinAttempted && !this.state && this.name && mine.name !== this.name) {
        const others = Object.entries(seats).filter(([id]) => id !== uid).map(([, s]) => s.name);
        void set(this.ref(`seats/${uid}/name`), uniqueName(this.name.slice(0, 12), others));
      }
      this.joinAttempted = true;
      return;
    }
    if (this.hadSeat && !this.state) {
      // 방장이 자리에서 뺐다
      this.hadSeat = false;
      this.onError?.('방장이 자리에서 내보냈어요. 관전 중이에요.');
      return;
    }
    if (this.joinAttempted) return;
    this.joinAttempted = true;
    if (this.state) {
      this.showSpectatorNotice('이미 게임이 시작돼서 관전으로 들어왔어요.');
      return;
    }
    const name = uniqueName((this.name || '손님').slice(0, 12), Object.values(seats).map((s) => s.name));
    void set(this.ref(`seats/${uid}`), { name, bot: false, order: serverTimestamp() })
      .then(() => this.systemChat(`${name} 님이 들어왔어요.`))
      .catch((e) => {
        console.error(e);
        this.onError?.('자리에 앉지 못했어요.');
      });
  }

  private showSpectatorNotice(text: string) {
    if (this.spectatorNoticeShown) return;
    this.spectatorNoticeShown = true;
    this.onError?.(text);
  }

  private ensurePresence() {
    if (!this.connected || this.presenceOn || !this.uid || !this.data) return;
    this.presenceOn = true;
    const p = this.ref(`presence/${this.uid}`);
    onDisconnect(p)
      .remove()
      .then(() => set(p, true))
      .catch((e) => {
        this.presenceOn = false;
        console.warn('접속 표시 실패', e);
      });
  }

  private systemChat(text: string) {
    if (!this.uid) return;
    void push(this.ref('chat'), { uid: this.uid, from: '', text, at: serverTimestamp(), system: true }).catch(() => {});
  }

  private afterCommit(game: RoomData['game'] | null) {
    if (!game) return;
    try {
      const state = JSON.parse(game.json);
      if (this.game.activePlayer(state) === null) {
        const text = winnerText(this.game, state, (id) => this.data?.seats?.[id]?.name ?? '?');
        if (text) this.systemChat(text);
      }
    } catch {
      /* 무시 */
    }
  }

  private isHost(): boolean {
    return !!this.uid && this.data?.meta?.hostUid === this.uid;
  }

  private seatList(): (SeatData & { id: string })[] {
    return Object.entries(this.data?.seats ?? {})
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  }

  /** 대기실에서 실제로 게임에 들어갈 자리 (먼저 온 순서대로 최대 인원까지) */
  private playerSeats() {
    return this.seatList().slice(0, this.game.maxPlayers);
  }

  private status(): RoomStatus {
    if (!this.loaded) return 'connecting';
    if (!this.data) return 'closed';
    if (!this.state) return 'lobby';
    return this.game.activePlayer(this.state) === null ? 'ended' : 'playing';
  }

  private myId(): PlayerId | null {
    const uid = this.uid;
    if (!uid || !this.data) return null;
    if (this.state) {
      const players = (this.state as { players?: { id: string }[] }).players ?? [];
      return players.some((p) => p.id === uid) ? uid : null;
    }
    return this.playerSeats().some((s) => s.id === uid) ? uid : null;
  }

  /** 봇을 대신 둘 사람: 방장이 접속해 있으면 방장, 아니면 먼저 들어온 접속자 */
  private botRunner(): string | null {
    const presence = this.data?.presence ?? {};
    const hostUid = this.data?.meta?.hostUid;
    if (hostUid && presence[hostUid]) return hostUid;
    const human = this.seatList().find((s) => !s.bot && presence[s.id]);
    return human?.id ?? null;
  }

  private scheduleBot() {
    if (this.botTimer || this.closed || !this.state || this.status() !== 'playing' || !this.game.bot) return;
    if (this.botRunner() !== this.uid) return;
    const active = this.game.activePlayer(this.state);
    if (!active || !this.data?.seats?.[active]?.bot) return;
    const expected = this.stateVersion;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (!this.closed) void this.runBot(active, expected);
    }, BOT_DELAY_MS);
  }

  private async runBot(botId: string, expectedVersion: number, continueBots = true) {
    try {
      const res = await runTransaction(this.ref('game'), (cur: RoomData['game'] | null) => {
        if (!cur) return cur;
        if (cur.version !== expectedVersion) return undefined; // 그 사이 상태가 바뀜
        const state = JSON.parse(cur.json);
        if (this.game.activePlayer(state) !== botId) return undefined;
        const action = this.game.bot!(state, botId, this.botRandom);
        if (this.game.validate(state, botId, action)) return undefined;
        return { json: JSON.stringify(this.game.apply(state, botId, action)), version: cur.version + 1 };
      });
      if (res.committed) this.afterCommit(res.snapshot.val());
    } catch (e) {
      console.warn('봇 행동 저장 실패', e);
    }
    // 저장에 실패했으면 다음 상태 변화 때 다시 시도된다
    if (continueBots) this.scheduleBot();
  }

  private connection(): ConnectionState {
    if (!this.loaded) return 'connecting';
    return this.connected ? 'online' : 'reconnecting';
  }

  private buildSnapshot(): RoomSnapshot {
    const presence = this.data?.presence ?? {};
    const hostUid = this.data?.meta?.hostUid;
    const all = this.seatList();
    const seats: SeatInfo[] = (this.state ? all : all.slice(0, this.game.maxPlayers)).map((s) => ({
      id: s.id,
      name: s.name,
      bot: s.bot,
      host: s.id === hostUid,
      connected: s.bot || !!presence[s.id],
    }));
    const chat: ChatMessage[] = Object.entries(this.data?.chat ?? {})
      .map(([id, m]) => ({ id, from: m.from, text: m.text, at: typeof m.at === 'number' ? m.at : Date.now(), system: m.system }))
      .sort((a, b) => a.at - b.at)
      .slice(-MAX_CHAT);
    const myId = this.myId();
    const connection = this.connection();
    return {
      code: this.code,
      gameId: this.game.id,
      isHost: this.isHost(),
      local: false,
      myId,
      status: this.status(),
      seats,
      options: this.data?.options ?? null,
      view: this.state ? this.game.view(this.state, myId) : null,
      chat,
      connection,
      notice:
        this.notice ?? (connection === 'reconnecting' ? '인터넷 연결이 끊겼어요. 다시 연결하는 중...' : null),
      version: this.stateVersion,
    };
  }

  private refresh(force = false) {
    const next = this.buildSnapshot();
    if (!force && JSON.stringify(next) === JSON.stringify(this.snapshot)) return;
    this.snapshot = next;
    for (const l of this.listeners) l();
  }
}
