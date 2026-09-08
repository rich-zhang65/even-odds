import { createRandom } from '../random';
import type {
  EngineContext,
  GameAction,
  GameResult,
  PlayerId,
  RealtimeGame,
} from '../types';
import { systemScheduler } from './scheduler';
import type { Cancel } from './scheduler';
import type {
  RealtimeSnapshot,
  Session,
  SessionEvent,
  SessionOptions,
  SessionPhase,
} from './types';

const OPPONENT: Record<PlayerId, PlayerId> = { p0: 'p1', p1: 'p0' };

const DEFAULT_GRACE_MS = 60_000;
const BROADCAST_HZ = 20;

/* 1000/60 has no exact float representation, so subtracting it off an accumulator
   leaves the remainder a hair under a step and silently drops a frame -- six steps
   of elapsed time buy five ticks, and the simulation runs slow. A nanosecond of
   slack is far below any timer's resolution and far above the error. */
const SLACK_MS = 1e-6;

export const createRealtimeSession = <S, A extends GameAction>(
  def: RealtimeGame<S, A>,
  opts: SessionOptions<S>,
): Session<S, A> => {
  const clock = opts.scheduler ?? systemScheduler;
  const graceMs = opts.graceMs ?? DEFAULT_GRACE_MS;
  const hz = def.tickRateHz;
  const stepMs = 1000 / hz;
  const broadcastEvery = Math.max(1, Math.round(hz / BROADCAST_HZ));

  const ctx: EngineContext = {
    matchId: opts.matchId,
    players: ['p0', 'p1'],
    random: createRandom(opts.seed),
    now: opts.now ?? clock.now(),
  };

  let state = def.setup(ctx);
  let phase: SessionPhase = 'waiting';
  let forfeit: GameResult | null = null;
  let tick = 0;
  let accumulator = 0;
  let last = clock.now();
  let stopLoop: Cancel | null = null;
  let stopGrace: Cancel | null = null;

  const connected: Record<PlayerId, boolean> = { p0: false, p1: false };

  /* Held until the next tick rather than applied on arrival, so every input
     lands on a step boundary and the simulation advances the same way whatever
     the network did. It is also why handleAction can only ever report receipt. */
  const pending: Record<PlayerId, A[]> = { p0: [], p1: [] };

  const snapshotFor = (viewer: PlayerId): RealtimeSnapshot<S> => ({
    mode: 'realtime',
    matchId: ctx.matchId,
    phase,
    state: def.playerView?.(state, viewer) ?? state,
    tick,
    at: clock.now(),
    result: forfeit ?? def.isTerminal(state),
  });

  const broadcast = (event: SessionEvent<S>): void => {
    for (const player of ctx.players) opts.emit(player, event);
  };

  const broadcastState = (): void => {
    for (const player of ctx.players) {
      opts.emit(player, { type: 'state', snapshot: snapshotFor(player) });
    }
  };

  const clearGrace = (): void => {
    if (stopGrace === null) return;
    stopGrace();
    stopGrace = null;
  };

  const halt = (): void => {
    if (stopLoop === null) return;
    stopLoop();
    stopLoop = null;
  };

  const finish = (result: GameResult): void => {
    halt();
    clearGrace();
    phase = 'over';
    broadcastState();
    broadcast({ type: 'over', result });
  };

  const step = (): void => {
    tick += 1;

    for (const player of ctx.players) {
      const queued = pending[player];
      pending[player] = [];
      for (const action of queued) {
        // Re-checked here, not on arrival: the state it was judged against has moved.
        if (def.isLegal(state, action, player, ctx)) {
          state = def.reduce(state, action, player, ctx);
        }
      }
    }

    state = def.tick(state, stepMs, ctx);

    const terminal = def.isTerminal(state);
    if (terminal) {
      finish(terminal);
      return;
    }

    if (tick % broadcastEvery === 0) broadcastState();
  };

  /* A fixed timestep behind a timer that is not: setInterval drifts and browsers
     throttle it, so the elapsed time is banked and spent in whole steps. The
     simulation therefore sees the same dt every time regardless of jitter, which
     is what makes a replay of the same inputs land in the same place. */
  const frame = (): void => {
    if (phase !== 'playing') return;

    const now = clock.now();
    accumulator += now - last;
    last = now;

    while (accumulator >= stepMs - SLACK_MS && phase === 'playing') {
      accumulator -= stepMs;
      step();
    }
  };

  const forfeitBy = (player: PlayerId): void => {
    stopGrace = null;
    if (phase === 'over') return;
    forfeit = { winner: OPPONENT[player], reason: 'opponent disconnected' };
    finish(forfeit);
  };

  return {
    start: () => {
      if (phase !== 'waiting') return;
      connected.p0 = true;
      connected.p1 = true;
      phase = 'playing';
      last = clock.now();
      accumulator = 0;
      broadcastState();
      stopLoop = clock.every(stepMs, frame);
    },

    handleAction: (action, by) => {
      if (phase !== 'playing') return { ok: false, error: `match is ${phase}` };
      pending[by].push(action);
      // Receipt, not application. The next tick decides whether it was legal.
      return { ok: true };
    },

    onDisconnect: (player) => {
      if (phase === 'over') return;
      connected[player] = false;
      opts.emit(OPPONENT[player], { type: 'opponent', connected: false });

      if (phase !== 'playing') return;
      phase = 'paused';
      halt();
      broadcastState();
      stopGrace = clock.after(graceMs, () => forfeitBy(player));
    },

    onReconnect: (player) => {
      if (phase === 'over') return;
      connected[player] = true;
      clearGrace();

      opts.emit(OPPONENT[player], { type: 'opponent', connected: true });

      if (phase === 'paused' && connected.p0 && connected.p1) {
        phase = 'playing';
        // Time passed while paused is not simulated: the match resumes, it does
        // not fast-forward through the seconds nobody was playing.
        last = clock.now();
        accumulator = 0;
        stopLoop = clock.every(stepMs, frame);
      }
      broadcastState();
    },

    snapshotFor,

    stop: () => {
      halt();
      clearGrace();
      phase = 'over';
    },
  };
};
