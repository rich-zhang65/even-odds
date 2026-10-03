import { AirHockey } from '@even-odds/air-hockey';
import { Battleship } from '@even-odds/battleship';
import type { GameAction, GameDefinition } from '@even-odds/game-sdk';
import { Gomoku } from '@even-odds/gomoku';
import { Pong } from '@even-odds/pong';
import { Yazy } from '@even-odds/yazy';

const GAMES: Record<string, GameDefinition<unknown, GameAction>> = {
  yazy: Yazy,
  pong: Pong,
  'air-hockey': AirHockey,
  battleship: Battleship,
  gomoku: Gomoku,
};

export const getGameDefinition = (
  gameId: string,
): GameDefinition<unknown, GameAction> | undefined => GAMES[gameId];
