import { Home } from './ui/Home';
import { RoomPage } from './ui/RoomPage';
import { RulesPage } from './ui/RulesPage';
import { useHashPath } from './ui/router';
import { normalizeRoomCode } from './net/common';

export function App() {
  const path = useHashPath();
  const room = path.match(/^\/room\/([A-Za-z0-9]+)/);
  if (room) {
    const code = normalizeRoomCode(room[1]);
    return <RoomPage key={code} code={code} />;
  }
  if (path === '/local') return <RoomPage key="local" code="LOCAL" local />;
  if (path === '/rules') return <RulesPage />;
  return <Home />;
}
