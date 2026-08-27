import type { GameAction, GameDefinition } from "@even-odds/game-sdk";
import { Yahtzee } from "@even-odds/yahtzee";

const GAMES: Record<string, GameDefinition<unknown, GameAction>> = {
  yahtzee: Yahtzee,
};

export const getGame = (gameId: string): GameDefinition<unknown, GameAction> | undefined =>
  GAMES[gameId];
