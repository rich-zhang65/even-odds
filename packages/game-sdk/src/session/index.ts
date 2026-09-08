import type { GameAction, GameDefinition } from '../types';
import { createRealtimeSession } from './realtime';
import { createTurnBasedSession } from './turn-based';
import type { Session, SessionOptions } from './types';

export const createSession = <S, A extends GameAction>(
  def: GameDefinition<S, A>,
  opts: SessionOptions<S>,
): Session<S, A> => {
  switch (def.mode) {
    case 'turn-based':
      return createTurnBasedSession(def, opts);
    case 'realtime':
      return createRealtimeSession(def, opts);
    default:
      return def satisfies never;
  }
};

export { createRealtimeSession } from './realtime';
export { createTurnBasedSession } from './turn-based';
export { systemScheduler } from './scheduler';
export type { Cancel, Scheduler } from './scheduler';
export type {
  ActionResult,
  Session,
  SessionEmit,
  SessionEvent,
  SessionOptions,
  SessionPhase,
  RealtimeSnapshot,
  Snapshot,
  TurnBasedSnapshot,
} from './types';
