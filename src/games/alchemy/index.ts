import type { GameDefinition } from '../../engine/types';
import { botAction } from './bot';
import { DEFAULT_OPTIONS, activePlayer, apply, computeResult, setup, validate, view } from './rules';
import type { AlchemyAction, AlchemyOptions, AlchemyState, AlchemyView } from './types';

export const alchemyGame: GameDefinition<AlchemyState, AlchemyAction, AlchemyView, AlchemyOptions> = {
  id: 'alchemy',
  minPlayers: 2,
  maxPlayers: 4,
  defaultOptions: DEFAULT_OPTIONS,
  setup,
  validate,
  apply,
  activePlayer,
  view,
  result: (s) => (s.phase === 'ended' ? (s.result ?? computeResult(s)) : null),
  bot: botAction,
};
