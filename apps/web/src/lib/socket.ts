import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@even-odds/game-sdk";

/* One connection carries every match, so it cannot be typed to one game's state.
   What comes down it is narrowed once, in useMatch, by the page that knows which
   game it is showing. */
export type MatchSocket = Socket<ServerToClientEvents<unknown>, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

let instance: MatchSocket | null = null;

export const getSocket = (): MatchSocket => {
  instance ??= io(SERVER_URL, { transports: ["websocket"] });
  return instance;
};

export const tokenKey = (matchId: string): string => `even-odds:token:${matchId}`;
