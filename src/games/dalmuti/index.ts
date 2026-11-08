import type { GameDefinition } from '../../engine/types';
import { botAction } from './bot';
import { MAX_PLAYERS, MIN_PLAYERS, activePlayer, apply, result, secret, setup, substitute, validate, view } from './rules';
import type { DAction, DState, DView } from './types';

export const dalmutiGame: GameDefinition<DState, DAction, DView, Record<string, never>> = {
  id: 'dalmuti',
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  defaultOptions: {},
  setup,
  validate,
  apply,
  activePlayer,
  view,
  result,
  bot: botAction,
  substitute,
  secret,
  announce: (s, nameOf) => (s.phase === 'roundEnd' && s.lastOrder ? `${s.round}판 끝! 대왕: ${nameOf(s.lastOrder[0])}` : null),
};
