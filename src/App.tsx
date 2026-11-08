import { Home } from './ui/Home';
import { RoomPage } from './ui/RoomPage';
import { CardsPage } from './ui/CardsPage';
import { RulesPage } from './ui/RulesPage';
import { DalmutiRulesPage } from './games/dalmuti/ui/DalmutiRules';
import { useHashPath } from './ui/router';
import { normalizeRoomCode } from './net/common';

export function App() {
  const path = useHashPath();
  const room = path.match(/^\/room\/([A-Za-z0-9]+)/);
  if (room) {
    const code = normalizeRoomCode(room[1]);
    return <RoomPage key={code} code={code} />;
  }
  const local = path.match(/^\/local(?:\/(\w+))?$/);
  if (local) return <RoomPage key={`local-${local[1] ?? 'alchemy'}`} code="LOCAL" local gameId={local[1] ?? 'alchemy'} />;
  if (path === '/rules' || path === '/rules/alchemy') return <RulesPage />;
  if (path === '/rules/dalmuti') return <DalmutiRulesPage />;
  if (path === '/cards') return <CardsPage />;
  return <Home />;
}
