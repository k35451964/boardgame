import type { ComponentType } from 'react';
import type { GameDefinition } from '../engine/types';
import type { RoomClient, RoomSnapshot } from '../net/types';
import { alchemyGame } from './alchemy';
import { AlchemyBoard } from './alchemy/ui/AlchemyBoard';
import { AlchemyOptionsEditor } from './alchemy/ui/AlchemyOptions';

export interface BoardProps {
  snapshot: RoomSnapshot;
  client: RoomClient;
}

export interface OptionsProps {
  options: unknown;
  editable: boolean;
  onChange: (options: unknown) => void;
}

export interface GameModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  definition: GameDefinition<any, any, any, any>;
  Board: ComponentType<BoardProps>;
  Options: ComponentType<OptionsProps>;
}

export const GAME_MODULES: Record<string, GameModule> = {
  alchemy: { definition: alchemyGame, Board: AlchemyBoard, Options: AlchemyOptionsEditor },
};
