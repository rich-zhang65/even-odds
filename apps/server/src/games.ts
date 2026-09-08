import { AirHockey } from '@even-odds/air-hockey';
import type { GameAction, GameDefinition } from '@even-odds/game-sdk';
import { Pong } from '@even-odds/pong';
import { Yazy } from '@even-odds/yazy';

const GAMES: Record<string, GameDefinition<unknown, GameAction>> = {
  yazy: Yazy,
  pong: Pong,
  'air-hockey': AirHockey,
};

export const getGame = (
  gameId: string,
): GameDefinition<unknown, GameAction> | undefined => GAMES[gameId];
