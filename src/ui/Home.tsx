import { useState } from 'react';
import { GAMES, SITE_TITLE } from '../config';
import { GAME_MODULES } from '../games/registry';
import { normalizeRoomCode } from '../net/common';
import { isFirebaseConfigured } from '../net/firebase';
import { createOnlineRoom, explainFirebaseError } from '../net/firebaseRoom';
import { getMyName, setMyName } from '../net/storage';
import { navigate } from './router';

export function Home() {
  const [name, setName] = useState(getMyName());
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const online = isFirebaseConfigured();

  const ensureName = () => {
    if (!name.trim()) {
      setError('닉네임을 먼저 적어 주세요.');
      document.getElementById('nickname')?.focus();
      return false;
    }
    setMyName(name);
    return true;
  };

  const createRoom = async (gameId: string) => {
    if (!ensureName() || creating) return;
    setCreating(true);
    try {
      const newCode = await createOnlineRoom(GAME_MODULES[gameId].definition, name.trim());
      navigate(`/room/${newCode}`);
    } catch (e) {
      console.error(e);
      setError(explainFirebaseError(e));
      setCreating(false);
    }
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureName()) return;
    const c = normalizeRoomCode(code);
    if (c.length !== 5) {
      setError('방 코드는 5글자예요.');
      return;
    }
    navigate(`/room/${c}`);
  };

  const practice = () => {
    if (!ensureName()) return;
    navigate('/local');
  };

  return (
    <div className="home">
      <header className="home-hero">
        <div className="home-badge" aria-hidden>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={56} height={56} />
        </div>
        <h1>{SITE_TITLE}</h1>
        <p>설치 없이 링크 하나로 친구들과 바로 하는 보드게임</p>
      </header>

      <section className="panel home-name">
        <label htmlFor="nickname">닉네임</label>
        <input
          id="nickname"
          value={name}
          maxLength={12}
          placeholder="예: 연금술사 민지"
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
        />
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="game-list">
        {GAMES.map((g) => (
          <article key={g.id} className={`panel game-entry ${g.ready ? '' : 'is-soon'}`}>
            <div className="game-entry-head">
              <h2>{g.title}</h2>
              {g.ready ? (
                <span className="chips">
                  <span className="chip">{g.players}</span>
                  <span className="chip">{g.minutes}</span>
                </span>
              ) : (
                <span className="chip">준비 중</span>
              )}
            </div>
            <p>{g.tagline}</p>
            {g.ready && (
              <div className="game-entry-actions">
                <button className="btn btn-primary" onClick={() => createRoom(g.id)} disabled={!online || creating}>
                  {creating ? '방 만드는 중...' : '방 만들기'}
                </button>
                <button className="btn" onClick={practice}>
                  봇과 연습
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/rules')}>
                  규칙 보기
                </button>
              </div>
            )}
          </article>
        ))}
      </section>

      {!online && (
        <p className="panel notice">
          온라인 대전을 하려면 Firebase 설정이 필요해요 (README 참고). 지금은 봇과 연습만 할 수 있어요.
        </p>
      )}

      <form className="panel join" onSubmit={joinRoom}>
        <h2>친구 방에 들어가기</h2>
        <div className="join-row">
          <input
            aria-label="방 코드"
            value={code}
            maxLength={5}
            placeholder="방 코드 5글자"
            onChange={(e) => {
              setCode(normalizeRoomCode(e.target.value));
              setError('');
            }}
          />
          <button className="btn btn-primary" type="submit" disabled={!online}>
            참가
          </button>
        </div>
        <p className="hint">친구가 보내준 링크를 눌러도 바로 들어갈 수 있어요.</p>
      </form>
    </div>
  );
}
