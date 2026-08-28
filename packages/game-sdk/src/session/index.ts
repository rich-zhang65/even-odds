import type { GameAction, GameDefinition } from "../types";
import { createTurnBasedSession } from "./turn-based";
import type { Session, SessionOptions } from "./types";

export const createSession = <S, A extends GameAction>(
  def: GameDefinition<S, A>,
  opts: SessionOptions<S>
): Session<S, A> => {
  switch (def.meta.mode) {
    case "turn-based":
      return createTurnBasedSession(def, opts);
    case "realtime":
      throw new Error(`realtime sessions are not implemented yet (game: ${def.meta.id})`);
  }
};

export { createTurnBasedSession } from "./turn-based";
export type {
  ActionResult,
  Session,
  SessionEmit,
  SessionEvent,
  SessionOptions,
  SessionPhase,
  Snapshot,
} from "./types";
