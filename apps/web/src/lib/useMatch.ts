"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_MATCH, getMatchStore } from "./matchStore";
import type { MatchState } from "./matchStore";
import type { YazyAction } from "@even-odds/yazy";

const serverState = (): MatchState => EMPTY_MATCH;

export const useMatch = (matchId: string) => {
  const store = getMatchStore(matchId);
  const state = useSyncExternalStore(store.subscribe, store.getState, serverState);

  return {
    snapshot: state.snapshot,
    seat: state.seat,
    seats: state.seats,
    error: state.error,
    send: (action: YazyAction) => store.send(action),
  };
};
