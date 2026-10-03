import { AirHockey } from '@even-odds/air-hockey';
import { Battleship } from '@even-odds/battleship';
import type { GameAction, GameDefinition } from '@even-odds/game-sdk';
import { Gomoku } from '@even-odds/gomoku';
import { Pong } from '@even-odds/pong';
import { Yazy } from '@even-odds/yazy';

/* Pong is a development-only game: the home page hides it in production, and
   leaving it here would still let anyone open one by talking to this server. */
const GAMES: Record<string, GameDefinition<unknown, GameAction>> = {
  yazy: Yazy,
  ...(process.env.NODE_ENV === 'production' ? {} : { pong: Pong }),
  'air-hockey': AirHockey,
  battleship: Battleship,
  gomoku: Gomoku,
};

export const getGameDefinition = (
  gameId: string,
): GameDefinition<unknown, GameAction> | undefined => GAMES[gameId];
