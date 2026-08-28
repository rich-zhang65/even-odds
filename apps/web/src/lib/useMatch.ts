"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_MATCH, getMatchStore } from "./matchStore";
import type { MatchState } from "./matchStore";
import type { YahtzeeAction } from "@even-odds/yahtzee";

const serverState = (): MatchState => EMPTY_MATCH;

export const useMatch = (matchId: string) => {
  const store = getMatchStore(matchId);
  const state = useSyncExternalStore(store.subscribe, store.getState, serverState);

  return {
    snapshot: state.snapshot,
    seat: state.seat,
    seats: state.seats,
    error: state.error,
    send: (action: YahtzeeAction) => store.send(action),
  };
};
