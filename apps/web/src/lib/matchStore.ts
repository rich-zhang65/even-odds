import type {
  GameAction,
  PlayerId,
  SeatFlags,
  Snapshot,
} from '@even-odds/game-sdk';
import { getSocket } from './socket';

export type MatchState = {
  snapshot: Snapshot<unknown> | null;
  seat: PlayerId | null;
  seats: SeatFlags;
  error: string | null;
};

export type MatchStore = {
  subscribe: (listener: () => void) => () => void;
  getState: () => MatchState;
  send: (action: GameAction) => void;

  /* Every snapshot, outside React. A realtime game receives twenty a second and
     draws on every frame between them; routing that through useSyncExternalStore
     would re-render the tree at the same rate to move three divs. */
  onSnapshot: (listener: (snapshot: Snapshot<unknown>) => void) => () => void;
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
  const snapshotListeners = new Set<(snapshot: Snapshot<unknown>) => void>();

  const set = (patch: Partial<MatchState>): void => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  const onGameState = (payload: { snapshot: Snapshot<unknown> }): void => {
    for (const listener of snapshotListeners) listener(payload.snapshot);
    set({ snapshot: payload.snapshot });
  };

  const onMatchState = (payload: { seats: SeatFlags }): void =>
    set({ seats: payload.seats });

  // Always re-join: the server hands an account back the seat it already holds,
  // so one path covers the creator arriving, a refresh, a new tab and a dropped
  // socket.
  const join = (): void => {
    getSocket().emit('match:join', { matchId }, (res) => {
      if ('error' in res) {
        set({ error: res.error });
        return;
      }
      set({ seat: res.you, error: null });
    });
  };

  // The handshake is refused outright when the session has gone, so this is the
  // only place that ever learns it.
  const onRefused = (error: Error): void => {
    if (error.message === 'unauthorized') set({ error: 'unauthorized' });
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        const socket = getSocket();
        socket.on('game:state', onGameState);
        socket.on('match:state', onMatchState);
        socket.on('connect', join);
        socket.on('connect_error', onRefused);
        if (socket.connected) join();
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        const socket = getSocket();
        socket.off('game:state', onGameState);
        socket.off('match:state', onMatchState);
        socket.off('connect', join);
        socket.off('connect_error', onRefused);
      };
    },

    onSnapshot(listener) {
      snapshotListeners.add(listener);
      return () => snapshotListeners.delete(listener);
    },

    getState: () => state,

    send: (action) => {
      getSocket().emit('game:action', action, (res) => {
        if ('error' in res) set({ error: res.error });
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
