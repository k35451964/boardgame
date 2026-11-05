import { Peer, type DataConnection } from 'peerjs';
import { createRng, randomSeed } from '../engine/rng';
import type { GameDefinition, PlayerId } from '../engine/types';
import { hostPeerId, peerOptions, randomId } from './peer';
import { keys, load, remove, save } from './storage';
import type { ChatMessage, RoomClient, RoomSnapshot, RoomStatus, SeatInfo, ToGuest, ToHost } from './types';

interface Seat extends SeatInfo {
  /** 재접속할 때 같은 사람인지 확인하는 비밀값 (손님에게 보내지 않음) */
  token: string | null;
}

interface SavedRoom {
  gameId: string;
  seats: Seat[];
  options: unknown;
  state: unknown;
  chat: ChatMessage[];
  version: number;
  savedAt: number;
}

const BOT_NAMES = ['봇 아델', '봇 브론', '봇 시엘', '봇 도린', '봇 에반'];
const BOT_DELAY_MS = 1100;
const SAVE_TTL_MS = 1000 * 60 * 60 * 24;
const MAX_CHAT = 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGame = GameDefinition<any, any, any, any>;

/**
 * 방장 브라우저에서 돌아가는 "서버".
 * 모든 규칙 판정과 상태 보관을 여기서 하고, 손님에게는 각자 볼 수 있는 화면 상태만 보낸다.
 * local=true면 네트워크 없이 봇과 연습하는 모드.
 */
export class HostRoom implements RoomClient {
  private seats: Seat[] = [];
  private options: unknown;
  private state: unknown = null;
  private chatLog: ChatMessage[] = [];
  private version = 0;
  private peer: Peer | null = null;
  private conns = new Map<DataConnection, PlayerId | null>();
  private listeners = new Set<() => void>();
  private snapshot: RoomSnapshot;
  private connection: RoomSnapshot['connection'];
  private notice: string | null = null;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private idRetries = 0;
  private closed = false;
  private closing = false;
  private readonly myId: PlayerId;
  private readonly botRandom = createRng(randomSeed());
  onError?: (message: string) => void;

  static hasSaved(code: string): boolean {
    const saved = load<SavedRoom>(keys.host(code));
    return !!saved && Date.now() - saved.savedAt < SAVE_TTL_MS;
  }

  constructor(
    private readonly code: string,
    private readonly game: AnyGame,
    hostName: string,
    private readonly local = false,
  ) {
    const saved = local ? null : load<SavedRoom>(keys.host(code));
    if (saved && saved.gameId === game.id && Date.now() - saved.savedAt < SAVE_TTL_MS) {
      this.seats = saved.seats.map((s) => ({ ...s, connected: s.bot || s.host }));
      this.options = saved.options;
      this.state = saved.state;
      this.chatLog = saved.chat ?? [];
      this.version = saved.version;
      this.myId = this.seats.find((s) => s.host)!.id;
      const me = this.seats.find((s) => s.host)!;
      if (hostName) me.name = hostName;
    } else {
      this.options = { ...game.defaultOptions };
      this.myId = randomId('p');
      this.seats = [{ id: this.myId, name: hostName || '방장', bot: false, host: true, connected: true, token: null }];
      if (local) {
        this.seats.push(this.makeBot());
        this.addSystemChat('봇과 연습하는 방이에요. 봇을 더 넣거나 빼고 시작해 보세요.');
      }
    }
    this.connection = local ? 'online' : 'connecting';
    this.snapshot = this.buildSnapshot();
    this.persist();
    if (!local) this.openPeer();
    this.scheduleBot();
  }

  // ───────── RoomClient ─────────

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  act(action: unknown) {
    const err = this.tryAction(this.myId, action);
    if (err) this.onError?.(err);
  }

  chat(text: string) {
    const me = this.seats.find((s) => s.id === this.myId)!;
    this.pushChat(me.name, text);
  }

  /** 페이지를 벗어날 때: 연결만 끊는다. 같은 주소로 돌아오면 방이 다시 열리고 친구들이 자동으로 붙는다. */
  leave() {
    if (this.closing) return;
    this.closed = true;
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.peer?.destroy();
  }

  /** 방을 완전히 닫는다: 친구들에게 알리고 저장된 진행 상황도 지운다. */
  destroy() {
    this.closing = true;
    if (!this.local) remove(keys.host(this.code));
    for (const conn of this.conns.keys()) {
      this.send(conn, { t: 'closed', reason: '방장이 방을 닫았어요.' });
    }
    this.closed = true;
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    // 메시지가 전달될 시간을 잠깐 준다
    setTimeout(() => this.peer?.destroy(), 400);
  }

  start() {
    if (this.state && this.status() !== 'ended') return;
    if (this.seats.length < this.game.minPlayers) {
      this.onError?.(`최소 ${this.game.minPlayers}명이 필요해요. 친구를 부르거나 봇을 추가하세요.`);
      return;
    }
    this.state = this.game.setup(
      this.seats.map((s) => s.id),
      this.options,
      randomSeed(),
    );
    this.addSystemChat('게임을 시작합니다!');
    this.changed();
  }

  addBot() {
    if (this.state && this.status() === 'playing') return;
    if (this.seats.length >= this.game.maxPlayers) {
      this.onError?.(`최대 ${this.game.maxPlayers}명까지예요.`);
      return;
    }
    this.seats.push(this.makeBot());
    this.changed();
  }

  removeSeat(id: PlayerId) {
    if (this.state && this.status() === 'playing') return;
    const seat = this.seats.find((s) => s.id === id);
    if (!seat || seat.host) return;
    this.seats = this.seats.filter((s) => s.id !== id);
    for (const [conn, pid] of this.conns) {
      if (pid === id) {
        this.send(conn, { t: 'closed', reason: '방장이 자리에서 내보냈어요.' });
        this.conns.set(conn, null);
        setTimeout(() => conn.close(), 300);
      }
    }
    if (!seat.bot) this.addSystemChat(`${seat.name} 님이 자리에서 나갔어요.`);
    this.changed();
  }

  setOptions(options: unknown) {
    if (this.state && this.status() === 'playing') return;
    this.options = options;
    this.changed();
  }

  backToLobby() {
    if (this.status() !== 'ended') return;
    this.state = null;
    this.changed();
  }

  // ───────── 내부 ─────────

  private makeBot(): Seat {
    const used = new Set(this.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `봇 ${this.seats.length + 1}`;
    return { id: randomId('b'), name, bot: true, host: false, connected: true, token: null };
  }

  private status(): RoomStatus {
    if (!this.state) return 'lobby';
    return this.game.activePlayer(this.state) === null ? 'ended' : 'playing';
  }

  private tryAction(player: PlayerId, action: unknown): string | null {
    if (!this.state || this.status() !== 'playing') return '게임이 진행 중이 아니에요.';
    let err: string | null;
    try {
      err = this.game.validate(this.state, player, action);
    } catch {
      err = '잘못된 행동입니다.';
    }
    if (err) return err;
    this.state = this.game.apply(this.state, player, action);
    if (this.status() === 'ended') this.announceResult();
    this.changed();
    return null;
  }

  private announceResult() {
    const result = this.game.result(this.state);
    if (!result) return;
    const names = result.winners.map((id) => this.seats.find((s) => s.id === id)?.name ?? '?');
    this.addSystemChat(`게임 끝! 승리: ${names.join(', ')}`);
  }

  private scheduleBot() {
    if (this.botTimer || this.closed || !this.state || this.status() !== 'playing') return;
    const active = this.game.activePlayer(this.state);
    const seat = this.seats.find((s) => s.id === active);
    if (!seat?.bot || !this.game.bot) return;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (!this.state || this.closed) return;
      const now = this.game.activePlayer(this.state);
      if (now !== seat.id) return;
      const action = this.game.bot!(this.state, seat.id, this.botRandom);
      const err = this.tryAction(seat.id, action);
      if (err) console.error('봇 행동 오류', err, action);
    }, BOT_DELAY_MS);
  }

  private pushChat(from: string, text: string) {
    const clean = String(text ?? '').trim().slice(0, 200);
    if (!clean) return;
    this.chatLog.push({ id: Date.now() + Math.random(), from, text: clean, at: Date.now() });
    this.chatLog = this.chatLog.slice(-MAX_CHAT);
    this.changed();
  }

  private addSystemChat(text: string) {
    this.chatLog.push({ id: Date.now() + Math.random(), from: '', text, at: Date.now(), system: true });
    this.chatLog = this.chatLog.slice(-MAX_CHAT);
  }

  private publicSeats(): SeatInfo[] {
    return this.seats.map(({ token: _token, ...rest }) => rest);
  }

  private buildSnapshot(): RoomSnapshot {
    return {
      code: this.code,
      gameId: this.game.id,
      isHost: true,
      local: this.local,
      myId: this.myId,
      status: this.status(),
      seats: this.publicSeats(),
      options: this.options,
      view: this.state ? this.game.view(this.state, this.myId) : null,
      chat: this.chatLog,
      connection: this.connection,
      notice: this.notice,
      version: this.version,
    };
  }

  private changed() {
    this.version++;
    this.snapshot = this.buildSnapshot();
    for (const l of this.listeners) l();
    this.broadcast();
    this.persist();
    this.scheduleBot();
  }

  /** 연결 상태만 바뀌었을 때 (게임 상태는 그대로) */
  private refreshLocal() {
    this.snapshot = this.buildSnapshot();
    for (const l of this.listeners) l();
  }

  private persist() {
    if (this.local) return;
    const data: SavedRoom = {
      gameId: this.game.id,
      seats: this.seats,
      options: this.options,
      state: this.state,
      chat: this.chatLog,
      version: this.version,
      savedAt: Date.now(),
    };
    save(keys.host(this.code), data);
  }

  private syncFor(viewer: PlayerId | null): ToGuest {
    return {
      t: 'sync',
      gameId: this.game.id,
      status: this.status(),
      seats: this.publicSeats(),
      options: this.options,
      view: this.state ? this.game.view(this.state, viewer) : null,
      chat: this.chatLog,
      version: this.version,
    };
  }

  private broadcast() {
    for (const [conn, pid] of this.conns) this.send(conn, this.syncFor(pid));
  }

  private send(conn: DataConnection, msg: ToGuest) {
    try {
      if (conn.open) conn.send(msg);
    } catch (e) {
      console.warn('전송 실패', e);
    }
  }

  // ───────── 네트워크 ─────────

  private openPeer() {
    if (this.closed) return;
    this.peer?.destroy();
    const peer = new Peer(hostPeerId(this.code), peerOptions());
    this.peer = peer;

    peer.on('open', () => {
      this.idRetries = 0;
      this.connection = 'online';
      this.notice = null;
      this.refreshLocal();
    });

    peer.on('connection', (conn) => this.handleConnection(conn));

    peer.on('disconnected', () => {
      if (this.closed || peer.destroyed) return;
      // 중계 서버와만 끊긴 것. 이미 연결된 친구들과의 연결은 유지된다.
      this.connection = 'reconnecting';
      this.refreshLocal();
      this.retryTimer = setTimeout(() => {
        if (!peer.destroyed) peer.reconnect();
      }, 2000);
    });

    peer.on('error', (err) => {
      if (this.closed) return;
      const type = (err as { type?: string }).type;
      if (type === 'unavailable-id') {
        // 새로고침 직후에는 예전 연결이 아직 주소를 쥐고 있을 수 있다. 잠시 후 다시 시도.
        this.idRetries++;
        this.connection = 'reconnecting';
        this.notice =
          this.idRetries > 10
            ? '이 방 주소를 다른 창에서 이미 쓰고 있는 것 같아요. 다른 탭을 닫아 주세요.'
            : '방을 다시 여는 중...';
        this.refreshLocal();
        this.retryTimer = setTimeout(() => this.openPeer(), 3000);
      } else if (type === 'peer-unavailable') {
        // 방장은 다른 사람에게 먼저 연결하지 않으므로 무시
      } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
        this.connection = 'reconnecting';
        this.notice = '중계 서버에 연결하지 못했어요. 다시 시도하는 중...';
        this.refreshLocal();
        this.retryTimer = setTimeout(() => this.openPeer(), 4000);
      } else if (type === 'browser-incompatible') {
        this.connection = 'offline';
        this.notice = '이 브라우저는 온라인 대전을 지원하지 않아요. 크롬이나 사파리 최신 버전을 써 주세요.';
        this.refreshLocal();
      } else {
        console.warn('PeerJS 오류', err);
      }
    });
  }

  private handleConnection(conn: DataConnection) {
    this.conns.set(conn, null);
    conn.on('data', (raw) => this.handleMessage(conn, raw as ToHost));
    conn.on('close', () => this.handleClose(conn));
    conn.on('error', () => this.handleClose(conn));
  }

  private handleClose(conn: DataConnection) {
    if (!this.conns.has(conn)) return;
    const pid = this.conns.get(conn);
    this.conns.delete(conn);
    // 같은 사람이 다른 연결로 이미 돌아왔으면 접속 끊김으로 표시하지 않는다
    const stillHere = pid && [...this.conns.values()].includes(pid);
    const seat = this.seats.find((s) => s.id === pid);
    if (seat && !stillHere) {
      seat.connected = false;
      this.changed();
    }
  }

  private handleMessage(conn: DataConnection, msg: ToHost) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'hello':
        this.handleHello(conn, msg);
        break;
      case 'action': {
        const pid = this.conns.get(conn);
        if (!pid) return this.send(conn, { t: 'error', message: '관전 중에는 둘 수 없어요.' });
        const err = this.tryAction(pid, msg.action);
        if (err) this.send(conn, { t: 'error', message: err });
        break;
      }
      case 'chat': {
        const pid = this.conns.get(conn);
        const seat = this.seats.find((s) => s.id === pid);
        this.pushChat(seat?.name ?? '관전자', msg.text);
        break;
      }
    }
  }

  private handleHello(conn: DataConnection, msg: Extract<ToHost, { t: 'hello' }>) {
    if (msg.gameId !== this.game.id) {
      this.send(conn, { t: 'closed', reason: '다른 게임의 방이에요.' });
      return;
    }
    const name = String(msg.name ?? '').trim().slice(0, 12) || '손님';
    const token = String(msg.token ?? '');
    let seat = token ? this.seats.find((s) => s.token === token) : undefined;
    if (seat) {
      // 재접속
      seat.connected = true;
      if (seat.name !== name && !this.state) seat.name = name;
      // 같은 사람의 예전 연결은 정리
      for (const [other, pid] of this.conns) if (other !== conn && pid === seat.id) this.conns.set(other, null);
    } else if (!this.state && this.seats.length < this.game.maxPlayers) {
      seat = { id: randomId('p'), name: this.uniqueName(name), bot: false, host: false, connected: true, token };
      this.seats.push(seat);
      this.addSystemChat(`${seat.name} 님이 들어왔어요.`);
    }
    this.conns.set(conn, seat?.id ?? null);
    this.send(conn, { t: 'welcome', you: seat?.id ?? null });
    if (!seat) {
      this.send(conn, {
        t: 'error',
        message: this.state ? '이미 게임이 시작돼서 관전으로 들어왔어요.' : '자리가 꽉 차서 관전으로 들어왔어요.',
      });
    }
    this.changed();
  }

  private uniqueName(name: string): string {
    const used = new Set(this.seats.map((s) => s.name));
    if (!used.has(name)) return name;
    for (let i = 2; ; i++) if (!used.has(`${name}${i}`)) return `${name}${i}`;
  }
}
