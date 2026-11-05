import { Peer, type DataConnection } from 'peerjs';
import { hostPeerId, peerOptions } from './peer';
import type { RoomClient, RoomSnapshot, ToGuest, ToHost } from './types';

const CONNECT_TIMEOUT_MS = 12000;

/**
 * 손님 브라우저. 방장에게 행동을 보내고, 방장이 보내주는 화면 상태를 그대로 보여준다.
 * 연결이 끊기면 계속 다시 붙는다.
 */
export class GuestRoom implements RoomClient {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private listeners = new Set<() => void>();
  private snapshot: RoomSnapshot;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private closed = false;
  onError?: (message: string) => void;

  constructor(
    private readonly code: string,
    private readonly gameId: string,
    private readonly name: string,
    private readonly token: string,
  ) {
    this.snapshot = {
      code,
      gameId,
      isHost: false,
      local: false,
      myId: null,
      status: 'connecting',
      seats: [],
      options: null,
      view: null,
      chat: [],
      connection: 'connecting',
      notice: null,
      version: 0,
    };
    this.openPeer();
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  act(action: unknown) {
    if (!this.send({ t: 'action', action })) this.onError?.('연결이 끊겨 있어요. 잠시 후 다시 해 주세요.');
  }

  chat(text: string) {
    this.send({ t: 'chat', text });
  }

  leave() {
    this.closed = true;
    this.clearTimers();
    this.conn?.close();
    this.peer?.destroy();
  }

  // ───────── 내부 ─────────

  private update(patch: Partial<RoomSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const l of this.listeners) l();
  }

  private send(msg: ToHost): boolean {
    if (!this.conn?.open) return false;
    try {
      this.conn.send(msg);
      return true;
    } catch {
      return false;
    }
  }

  private clearTimers() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.retryTimer = this.connectTimer = null;
  }

  private openPeer() {
    if (this.closed) return;
    const peer = new Peer(peerOptions());
    this.peer = peer;
    peer.on('open', () => this.connect());
    peer.on('disconnected', () => {
      if (!this.closed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err) => {
      if (this.closed) return;
      const type = (err as { type?: string }).type;
      if (type === 'peer-unavailable') {
        // 방장이 아직(또는 더 이상) 방을 열어 두지 않음
        this.scheduleRetry(
          this.snapshot.version === 0
            ? '방을 찾을 수 없어요. 방 코드가 맞는지, 방장이 페이지를 열어 두었는지 확인해 주세요.'
            : '방장의 연결이 끊겼어요. 다시 연결하는 중...',
        );
      } else if (type === 'browser-incompatible') {
        this.update({
          connection: 'offline',
          notice: '이 브라우저는 온라인 대전을 지원하지 않아요. 크롬이나 사파리 최신 버전을 써 주세요.',
        });
      } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
        // 중계 서버 문제: Peer를 새로 만든다
        peer.destroy();
        this.scheduleRetry('중계 서버에 연결하지 못했어요. 다시 시도하는 중...', true);
      } else {
        console.warn('PeerJS 오류', err);
      }
    });
  }

  private connect() {
    if (this.closed || !this.peer || this.peer.destroyed) return;
    this.conn?.close();
    const conn = this.peer.connect(hostPeerId(this.code), { reliable: true, serialization: 'json' });
    this.conn = conn;
    this.update({ connection: this.snapshot.version === 0 ? 'connecting' : 'reconnecting' });

    this.connectTimer = setTimeout(() => {
      if (!conn.open) {
        conn.close();
        this.scheduleRetry(
          this.attempts >= 2
            ? '방장과 직접 연결이 잘 안 돼요. 같은 와이파이라면 괜찮지만, 회사·학교망이나 일부 모바일 데이터에서는 막힐 수 있어요.'
            : null,
        );
      }
    }, CONNECT_TIMEOUT_MS);

    conn.on('open', () => {
      if (this.connectTimer) clearTimeout(this.connectTimer);
      this.attempts = 0;
      this.send({ t: 'hello', name: this.name, token: this.token, gameId: this.gameId });
      this.update({ connection: 'online', notice: null });
    });
    conn.on('data', (raw) => this.handle(raw as ToGuest));
    conn.on('close', () => {
      if (this.conn !== conn || this.closed) return;
      this.scheduleRetry('방장의 연결이 끊겼어요. 다시 연결하는 중...');
    });
    conn.on('error', () => {
      if (this.conn !== conn || this.closed) return;
      this.scheduleRetry(null);
    });
  }

  private scheduleRetry(notice: string | null, newPeer = false) {
    if (this.closed) return;
    this.attempts++;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.update({
      connection: this.snapshot.version === 0 ? 'connecting' : 'reconnecting',
      notice: notice ?? this.snapshot.notice,
    });
    const delay = Math.min(2000 * this.attempts, 8000);
    this.retryTimer = setTimeout(() => {
      if (newPeer || !this.peer || this.peer.destroyed) this.openPeer();
      else if (this.peer.disconnected) {
        this.peer.reconnect();
        setTimeout(() => this.connect(), 1000);
      } else this.connect();
    }, delay);
  }

  private handle(msg: ToGuest) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'welcome':
        this.update({ myId: msg.you });
        break;
      case 'sync':
        this.update({
          status: msg.status,
          seats: msg.seats,
          options: msg.options,
          view: msg.view,
          chat: msg.chat,
          version: msg.version,
        });
        break;
      case 'error':
        this.onError?.(msg.message);
        break;
      case 'closed':
        this.closed = true;
        this.clearTimers();
        this.update({ status: 'closed', connection: 'offline', notice: msg.reason });
        this.peer?.destroy();
        break;
    }
  }
}
