import type { GameAction, GameDefinition } from "@even-odds/game-sdk";
import { Yazy } from "@even-odds/yazy";

const GAMES: Record<string, GameDefinition<unknown, GameAction>> = {
  yazy: Yazy,
};

export const getGame = (gameId: string): GameDefinition<unknown, GameAction> | undefined =>
  GAMES[gameId];
