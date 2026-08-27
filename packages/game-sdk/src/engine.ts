import type { EngineContext, GameAction, GameDefinition, GameResult, PlayerId } from "./types";
import { createRandom } from "./random";

export type Engine<S, A extends GameAction> = {
  state: S;
  context: EngineContext;
  dispatch(action: A, by: PlayerId): { ok: true; state: S } | { ok: false; error: string };
  result(): GameResult | null;
};

export const createEngine = <S, A extends GameAction>(
  def: GameDefinition<S, A>,
  opts: { matchId: string; seed: number; now?: number }
): Engine<S, A> => {
  const ctx: EngineContext = {
    matchId: opts.matchId,
    players: ["p0", "p1"],
    random: createRandom(opts.seed),
    now: opts.now ?? Date.now(),
  };
  let state = def.setup(ctx);

  return {
    get state() {
      return state;
    },
    get context() {
      return ctx;
    },
    dispatch(action, by) {
      const terminal = def.isTerminal(state);
      if (terminal) return { ok: false, error: "match is over" };
      if (def.currentPlayer(state) !== by) return { ok: false, error: "not your turn" };
      if (!def.isLegal(state, action, by, ctx)) return { ok: false, error: "illegal action" };
      state = def.reduce(state, action, by, ctx);
      return { ok: true, state };
    },
    result() {
      return def.isTerminal(state);
    },
  };
};
