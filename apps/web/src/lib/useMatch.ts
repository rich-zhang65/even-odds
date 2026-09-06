"use client";

import { useSyncExternalStore } from "react";
import type { GameAction, Snapshot } from "@even-odds/game-sdk";
import { EMPTY_MATCH, getMatchStore } from "./matchStore";
import type { MatchState } from "./matchStore";

const serverState = (): MatchState => EMPTY_MATCH;

/* The one place the wire stops being unknown. A page knows which game it is
   showing; the socket and the store, shared across every match, cannot. */
export const useMatch = <S, A extends GameAction>(matchId: string) => {
  const store = getMatchStore(matchId);
  const state = useSyncExternalStore(store.subscribe, store.getState, serverState);

  /* Handed straight through rather than wrapped. Stores are cached per match, so
     this is the same reference every render — a wrapper here would be a new
     function twenty times a second and restart every effect that depends on it. */
  const send: (action: A) => void = store.send;

  return {
    snapshot: state.snapshot as Snapshot<S> | null,
    seat: state.seat,
    seats: state.seats,
    error: state.error,
    send,
  };
};
