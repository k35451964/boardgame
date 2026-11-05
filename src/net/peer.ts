import type { PeerOptions } from 'peerjs';

/**
 * PeerJS 설정.
 * 기본값은 PeerJS 무료 공용 중계 서버(0.peerjs.com)를 써서 서로를 찾고,
 * 실제 게임 데이터는 브라우저끼리 직접(WebRTC) 주고받는다.
 * 환경 변수로 다른 서버나 TURN 서버를 지정할 수 있다 (README 참고).
 */
type PeerOpts = PeerOptions;

export function peerOptions(): PeerOpts {
  const env = import.meta.env;
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  if (env.VITE_TURN_URLS) {
    iceServers.push({
      urls: String(env.VITE_TURN_URLS).split(','),
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL,
    });
  }
  const opts: PeerOpts = { debug: 1, config: { iceServers } };
  if (env.VITE_PEER_HOST) {
    opts.host = env.VITE_PEER_HOST;
    opts.port = Number(env.VITE_PEER_PORT ?? 443);
    opts.path = env.VITE_PEER_PATH ?? '/';
    opts.secure = env.VITE_PEER_SECURE !== 'false';
  }
  return opts;
}

/** 방 코드 → 방장 브라우저의 PeerJS 주소 */
export function hostPeerId(code: string): string {
  return `saenggyo-bg-${code.toLowerCase()}`;
}

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
