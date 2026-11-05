import { useEffect, useState, useSyncExternalStore } from 'react';
import { GAME_MODULES } from '../games/registry';
import { GuestRoom } from '../net/guest';
import { HostRoom } from '../net/host';
import { getMyName, getToken, setMyName } from '../net/storage';
import type { RoomClient } from '../net/types';
import { CREATING_KEY } from './Home';
import { Lobby } from './Lobby';
import { navigate } from './router';
import { useToast } from './useToast';

const GAME_ID = 'alchemy';

export function RoomPage({ code, local = false }: { code: string; local?: boolean }) {
  const [name, setName] = useState(getMyName());
  const [ready, setReady] = useState(!!getMyName());

  if (!ready) {
    return (
      <div className="center-screen">
        <form
          className="panel name-prompt"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            setMyName(name);
            setReady(true);
          }}
        >
          <h1>닉네임을 정해 주세요</h1>
          <p>방 {code}에 들어가요.</p>
          <input autoFocus value={name} maxLength={12} placeholder="닉네임" onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
            들어가기
          </button>
        </form>
      </div>
    );
  }
  return <RoomInner code={code} local={local} name={name.trim()} />;
}

function wasCreatedHere(code: string): boolean {
  try {
    return sessionStorage.getItem(CREATING_KEY) === code;
  } catch {
    return false;
  }
}

function RoomInner({ code, local, name }: { code: string; local: boolean; name: string }) {
  const toast = useToast();
  const [client] = useState<RoomClient>(() => {
    const module = GAME_MODULES[GAME_ID];
    if (local) return new HostRoom(code, module.definition, name, true);
    if (HostRoom.hasSaved(code) || wasCreatedHere(code)) return new HostRoom(code, module.definition, name);
    return new GuestRoom(code, GAME_ID, name, getToken(code));
  });
  client.onError = toast.show;

  useEffect(() => () => client.leave(), [client]);

  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const module = GAME_MODULES[snap.gameId] ?? GAME_MODULES[GAME_ID];

  // 브라우저 탭 제목에 방 코드 표시
  useEffect(() => {
    document.title = local ? '봇과 연습 · 생교 보드게임' : `방 ${code} · 생교 보드게임`;
  }, [code, local]);

  const closeRoom = () => {
    if (client instanceof HostRoom) {
      if (!local && !confirm('방을 닫을까요? 친구들도 모두 나가게 돼요.')) return;
      client.destroy();
    }
    navigate('/');
  };

  let body;
  if (snap.status === 'closed') {
    body = (
      <div className="center-screen">
        <div className="panel">
          <h1>방이 닫혔어요</h1>
          <p>{snap.notice}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            처음으로
          </button>
        </div>
      </div>
    );
  } else if (snap.status === 'connecting' || snap.status === 'lobby') {
    body = <Lobby snapshot={snap} client={client} module={module} onClose={closeRoom} />;
  } else {
    body = <module.Board snapshot={snap} client={client} />;
  }

  return (
    <>
      {body}
      {snap.connection !== 'online' && snap.status !== 'closed' && (snap.status !== 'connecting' || snap.notice) && (
        <div className="conn-banner" role="status">
          {snap.notice ?? (snap.connection === 'reconnecting' ? '다시 연결하는 중...' : '연결하는 중...')}
        </div>
      )}
      {toast.message && (
        <div className="toast" role="alert">
          {toast.message}
        </div>
      )}
    </>
  );
}
