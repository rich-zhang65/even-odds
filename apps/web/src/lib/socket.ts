import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@even-odds/game-sdk";
import type { YahtzeeState } from "@even-odds/yahtzee";

// Pinned to Yahtzee while it is the only game; becomes a generic when there are two.
export type MatchSocket = Socket<ServerToClientEvents<YahtzeeState>, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

let instance: MatchSocket | null = null;

export const getSocket = (): MatchSocket => {
  instance ??= io(SERVER_URL, { transports: ["websocket"] });
  return instance;
};

export const tokenKey = (matchId: string): string => `even-odds:token:${matchId}`;
