import { useEffect, useState, useSyncExternalStore } from 'react';
import { GAMES } from '../config';
import { GAME_MODULES } from '../games/registry';
import { FirebaseRoom } from '../net/firebaseRoom';
import { get, ref } from 'firebase/database';
import { database, isFirebaseConfigured, myUid } from '../net/firebase';
import { LocalRoom } from '../net/local';
import { getMyName, setMyName } from '../net/storage';
import type { RoomClient } from '../net/types';
import { ErrorBoundary } from './ErrorBoundary';
import { Lobby } from './Lobby';
import { navigate } from './router';
import { useToast } from './useToast';

export function RoomPage({ code, local = false, gameId }: { code: string; local?: boolean; gameId?: string }) {
  const [name, setName] = useState(getMyName());
  const [ready, setReady] = useState(!!getMyName());

  if (!local && !isFirebaseConfigured()) {
    return (
      <div className="center-screen">
        <div className="panel">
          <h1>온라인 대전 준비 중</h1>
          <p>아직 Firebase 설정이 들어가지 않았어요.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            처음으로
          </button>
        </div>
      </div>
    );
  }

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
  if (local) return <RoomInner code={code} local gameId={gameId ?? 'alchemy'} name={name.trim()} />;
  return <OnlineRoomLoader code={code} name={name.trim()} />;
}

/** 방 코드로 어떤 게임의 방인지 먼저 알아낸다 */
function OnlineRoomLoader({ code, name }: { code: string; name: string }) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await myUid();
        const snap = await get(ref(database(), `rooms/${code}/meta/gameId`));
        if (!alive) return;
        const id = snap.val() as string | null;
        if (!id) setProblem('방을 찾을 수 없어요. 방 코드를 확인해 주세요.');
        else if (!GAME_MODULES[id]) setProblem('이 사이트에 없는 게임의 방이에요.');
        else setGameId(id);
      } catch (e) {
        console.error(e);
        if (alive) setProblem('방 정보를 읽지 못했어요. 인터넷 연결을 확인해 주세요.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);
  if (problem) {
    return (
      <div className="center-screen">
        <div className="panel">
          <h1>방에 들어갈 수 없어요</h1>
          <p>{problem}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            처음으로
          </button>
        </div>
      </div>
    );
  }
  if (!gameId) return <div className="center-screen hint">방에 연결하는 중...</div>;
  return <RoomInner code={code} local={false} gameId={gameId} name={name} />;
}

function RoomInner({ code, local, gameId, name }: { code: string; local: boolean; gameId: string; name: string }) {
  const toast = useToast();
  const [client] = useState<RoomClient>(() => {
    const module = GAME_MODULES[gameId];
    return local ? new LocalRoom(module.definition, name) : new FirebaseRoom(code, module.definition, name);
  });
  client.onError = toast.show;
  // 개발할 때만: 브라우저 콘솔에서 방 상태를 들여다볼 수 있게
  if (import.meta.env.DEV) (window as unknown as { __room: RoomClient }).__room = client;

  useEffect(() => () => client.leave(), [client]);

  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const module = GAME_MODULES[snap.gameId] ?? GAME_MODULES[gameId];

  useEffect(() => {
    const title = GAMES.find((g) => g.id === gameId)?.title ?? '';
    document.title = local ? `${title} 연습 · 생교 보드게임` : `${title} 방 ${code} · 생교 보드게임`;
  }, [code, local, gameId]);

  const closeRoom = () => {
    if (!confirm('방을 닫을까요? 친구들도 모두 나가게 되고, 진행 중인 게임도 사라져요.')) return;
    client.destroy?.();
    navigate('/');
  };

  let body;
  if (snap.status === 'closed') {
    body = (
      <div className="center-screen">
        <div className="panel">
          <h1>방에 들어갈 수 없어요</h1>
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
    body = (
      <ErrorBoundary>
        <module.Board snapshot={snap} client={client} />
      </ErrorBoundary>
    );
  }

  return (
    <>
      {body}
      {snap.status !== 'closed' && snap.notice && (
        <div className="conn-banner" role="status">
          {snap.notice}
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
