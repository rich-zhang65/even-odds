import type { PlayerId, SeatFlags, Snapshot } from "@even-odds/game-sdk";
import type { YazyAction, YazyState } from "@even-odds/yazy";
import { getSocket, tokenKey } from "./socket";

export type MatchState = {
  snapshot: Snapshot<YazyState> | null;
  seat: PlayerId | null;
  seats: SeatFlags;
  error: string | null;
};

export type MatchStore = {
  subscribe: (listener: () => void) => () => void;
  getState: () => MatchState;
  send: (action: YazyAction) => void;
};

export const EMPTY_MATCH: MatchState = {
  snapshot: null,
  seat: null,
  seats: { p0: false, p1: false },
  error: null,
};

const createMatchStore = (matchId: string): MatchStore => {
  let state = EMPTY_MATCH;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<MatchState>): void => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  const onGameState = (payload: { snapshot: Snapshot<YazyState> }): void =>
    set({ snapshot: payload.snapshot });

  const onMatchState = (payload: { seats: SeatFlags }): void => set({ seats: payload.seats });

  // Always re-join: the server reads a known token as a reconnect, so one path
  // covers the creator arriving, a refresh reclaiming a seat, and a dropped socket.
  const join = (): void => {
    const stored = sessionStorage.getItem(tokenKey(matchId));
    getSocket().emit("match:join", { matchId, token: stored ?? undefined }, (res) => {
      if ("error" in res) {
        set({ error: res.error });
        return;
      }
      sessionStorage.setItem(tokenKey(matchId), res.token);
      set({ seat: res.you, error: null });
    });
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        const socket = getSocket();
        socket.on("game:state", onGameState);
        socket.on("match:state", onMatchState);
        socket.on("connect", join);
        if (socket.connected) join();
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        const socket = getSocket();
        socket.off("game:state", onGameState);
        socket.off("match:state", onMatchState);
        socket.off("connect", join);
      };
    },

    getState: () => state,

    send: (action) => {
      getSocket().emit("game:action", action, (res) => {
        if ("error" in res) set({ error: res.error });
      });
    },
  };
};

const stores = new Map<string, MatchStore>();

export const getMatchStore = (matchId: string): MatchStore => {
  const existing = stores.get(matchId);
  if (existing) return existing;

  const store = createMatchStore(matchId);
  stores.set(matchId, store);
  return store;
};
