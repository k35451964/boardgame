import { useState } from 'react';
import { GAMES } from '../config';
import type { GameModule } from '../games/registry';
import type { RoomClient, RoomSnapshot } from '../net/types';
import { ChatBox } from './ChatBox';
import { navigate, roomLink } from './router';

interface Props {
  snapshot: RoomSnapshot;
  client: RoomClient;
  module: GameModule;
  onClose: () => void;
}

export function Lobby({ snapshot: s, client, module, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const game = GAMES.find((g) => g.id === s.gameId);
  const link = roomLink(s.code);
  const max = module.definition.maxPlayers;
  const min = module.definition.minPlayers;

  const copy = async () => {
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share({ title: game?.title, text: `${game?.title} 같이 하자! 방 코드 ${s.code}`, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('이 링크를 복사해서 보내 주세요', link);
    }
  };

  const emptySlots = Math.max(0, max - s.seats.length);

  return (
    <div className="lobby">
      <header className="lobby-head">
        <button className="btn btn-ghost btn-small" onClick={() => navigate('/')}>
          ← 나가기
        </button>
        <h1>{game?.title}</h1>
        <span />
      </header>

      {!s.local && (
        <section className="panel share">
          <div>
            <p className="share-label">방 코드</p>
            <p className="share-code">{s.code}</p>
          </div>
          {s.isHost ? (
            <div className="share-actions">
              <button className="btn btn-primary" onClick={copy}>
                {copied ? '복사했어요!' : '초대 링크 보내기'}
              </button>
              <button className="btn btn-ghost btn-small" onClick={onClose}>
                방 닫기
              </button>
            </div>
          ) : (
            <p className="hint">
              {s.status === 'connecting' ? '방에 연결하는 중...' : s.myId ? '방장이 게임을 시작하길 기다리는 중...' : '자리가 꽉 차서 관전 중이에요.'}
            </p>
          )}
        </section>
      )}

      <div className="lobby-grid">
        <section className="panel seats">
          <h2>
            참가자 <small>{s.seats.length}/{max}</small>
          </h2>
          <ul>
            {s.seats.map((seat) => (
              <li key={seat.id} className={seat.id === s.myId ? 'is-me' : ''}>
                <span className={`dot ${seat.connected ? 'on' : 'off'}`} title={seat.connected ? '접속 중' : '연결 끊김'} />
                <span className="seat-name">{seat.name}</span>
                {seat.host && <span className="chip">방장</span>}
                {seat.bot && <span className="chip">봇</span>}
                {seat.id === s.myId && <span className="chip chip-me">나</span>}
                {s.isHost && !seat.host && (
                  <button className="btn btn-ghost btn-small" onClick={() => client.removeSeat?.(seat.id)}>
                    빼기
                  </button>
                )}
              </li>
            ))}
            {Array.from({ length: emptySlots }, (_, i) => (
              <li key={`empty${i}`} className="is-empty">
                <span className="dot" />
                <span className="seat-name">빈 자리</span>
                {s.isHost && i === 0 && (
                  <button className="btn btn-small" onClick={() => client.addBot?.()}>
                    + 봇 추가
                  </button>
                )}
              </li>
            ))}
          </ul>
          {s.status === 'connecting' && s.seats.length === 0 && <p className="hint">방 정보를 받아오는 중...</p>}
          {s.myId === null && s.seats.length > 0 && <p className="hint">관전 중이에요.</p>}
        </section>

        <section className="panel">
          <h2>설정</h2>
          {s.options != null ? (
            <module.Options options={s.options} editable={s.isHost} onChange={(o) => client.setOptions?.(o)} />
          ) : (
            <p className="hint">...</p>
          )}
          {s.isHost ? (
            <button className="btn btn-primary btn-wide" disabled={s.seats.length < min} onClick={() => client.start?.()}>
              {s.seats.length < min ? `${min}명 이상 모이면 시작` : '게임 시작'}
            </button>
          ) : null}
        </section>

        {!s.local && (
          <section className="panel lobby-chat">
            <h2>채팅</h2>
            <ChatBox messages={s.chat} onSend={(t) => client.chat(t)} />
          </section>
        )}
      </div>
    </div>
  );
}
