import type { GameDefinition, PlayerId } from '../engine/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = GameDefinition<any, any, any, any>;

export const BOT_NAMES = ['봇 아델', '봇 브론', '봇 시엘', '봇 도린', '봇 에반'];
export const BOT_DELAY_MS = 1100;
export const MAX_CHAT = 60;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode(): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export function normalizeRoomCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5);
}

export function randomId(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

export function pickBotName(usedNames: string[]): string {
  const used = new Set(usedNames);
  return BOT_NAMES.find((n) => !used.has(n)) ?? `봇 ${usedNames.length + 1}`;
}

export function uniqueName(name: string, usedNames: string[]): string {
  const used = new Set(usedNames);
  if (!used.has(name)) return name;
  for (let i = 2; ; i++) if (!used.has(`${name}${i}`)) return `${name}${i}`;
}

export function winnerText(game: AnyGame, state: unknown, nameOf: (id: PlayerId) => string): string | null {
  const result = game.result(state);
  if (!result) return null;
  return `게임 끝! 승리: ${result.winners.map(nameOf).join(', ')}`;
}
