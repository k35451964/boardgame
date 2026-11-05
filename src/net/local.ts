import { createRng, randomSeed } from '../engine/rng';
import type { PlayerId } from '../engine/types';
import { BOT_DELAY_MS, MAX_CHAT, pickBotName, randomId, winnerText, type AnyGame } from './common';
import type { ChatMessage, RoomClient, RoomSnapshot, RoomStatus, SeatInfo } from './types';

/** 네트워크 없이 이 브라우저 안에서 봇과 연습하는 방. */
export class LocalRoom implements RoomClient {
  private seats: SeatInfo[];
  private options: unknown;
  private state: unknown = null;
  private chatLog: ChatMessage[] = [];
  private version = 0;
  private listeners = new Set<() => void>();
  private snapshot: RoomSnapshot;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private readonly myId: PlayerId = randomId('p');
  private readonly botRandom = createRng(randomSeed());
  onError?: (message: string) => void;

  constructor(
    private readonly game: AnyGame,
    name: string,
  ) {
    this.options = { ...game.defaultOptions };
    this.seats = [{ id: this.myId, name: name || '나', bot: false, host: true, connected: true }];
    this.seats.push(this.makeBot());
    this.snapshot = this.buildSnapshot();
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  act(action: unknown) {
    const err = this.tryAction(this.myId, action);
    if (err) this.onError?.(err);
  }

  chat() {}

  leave() {
    this.closed = true;
    if (this.botTimer) clearTimeout(this.botTimer);
  }

  start() {
    if (this.state && this.status() !== 'ended') return;
    this.state = this.game.setup(
      this.seats.map((s) => s.id),
      this.options,
      randomSeed(),
    );
    this.changed();
  }

  addBot() {
    if (this.state || this.seats.length >= this.game.maxPlayers) return;
    this.seats.push(this.makeBot());
    this.changed();
  }

  removeSeat(id: PlayerId) {
    if (this.state) return;
    this.seats = this.seats.filter((s) => s.id !== id || s.host);
    this.changed();
  }

  setOptions(options: unknown) {
    if (this.state) return;
    this.options = options;
    this.changed();
  }

  backToLobby() {
    this.state = null;
    this.changed();
  }

  private makeBot(): SeatInfo {
    return { id: randomId('bot-'), name: pickBotName(this.seats?.map((s) => s.name) ?? []), bot: true, host: false, connected: true };
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
    if (this.status() === 'ended') {
      const text = winnerText(this.game, this.state, (id) => this.seats.find((s) => s.id === id)?.name ?? '?');
      if (text) this.chatLog = [...this.chatLog, { id: Date.now(), from: '', text, at: Date.now(), system: true }].slice(-MAX_CHAT);
    }
    this.changed();
    return null;
  }

  private scheduleBot() {
    if (this.botTimer || this.closed || !this.state || this.status() !== 'playing') return;
    const active = this.game.activePlayer(this.state);
    const seat = this.seats.find((s) => s.id === active);
    if (!seat?.bot || !this.game.bot) return;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (!this.state || this.closed || this.game.activePlayer(this.state) !== seat.id) return;
      const err = this.tryAction(seat.id, this.game.bot!(this.state, seat.id, this.botRandom));
      if (err) console.error('봇 행동 오류', err);
    }, BOT_DELAY_MS);
  }

  private buildSnapshot(): RoomSnapshot {
    return {
      code: 'LOCAL',
      gameId: this.game.id,
      isHost: true,
      local: true,
      myId: this.myId,
      status: this.status(),
      seats: this.seats,
      options: this.options,
      view: this.state ? this.game.view(this.state, this.myId) : null,
      chat: this.chatLog,
      connection: 'online',
      notice: null,
      version: this.version,
    };
  }

  private changed() {
    this.version++;
    this.snapshot = this.buildSnapshot();
    for (const l of this.listeners) l();
    this.scheduleBot();
  }
}
