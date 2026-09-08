export type PlayerId = 'p0' | 'p1';

export type RandomAPI = {
  int(min: number, max: number): number;
  dice(count: number, sides: number): number[];
  shuffle<T>(items: readonly T[]): T[];
};

export type EngineContext = {
  matchId: string;
  players: readonly PlayerId[];
  random: RandomAPI;
  now: number;
};

export type AssetManifest = {
  icon: string | null;
  sprites: Record<string, string | null>;
  sounds: Record<string, string | null>;
};

export type GameMeta = {
  id: string;
  name: string;
  tagline: string;
  estimatedMinutes: number;
  roles?: readonly [string, string];
  assets: AssetManifest;
};

export type GameAction = {
  type: string;
};

export type GameResult =
  { winner: PlayerId; reason?: string } | { draw: true; reason?: string };

/* Two runtimes, two contracts, discriminated by `mode` on the definition itself
   rather than inside meta -- TypeScript narrows a union by its own properties,
   not by a nested one, and `mode` describes how a game runs rather than how it
   presents, so meta is the wrong home for it anyway.

   Neither is a superset of the other. A turn-based game has a player on turn and
   nothing to tick; a realtime game ticks and has nobody on turn. Held in one
   optional-everything shape, both games carried a field that could not mean
   anything: a placeholder currentPlayer nothing read, and a tick the session had
   to check for at runtime. Spelled out in full rather than a shared base
   intersected with the differences. */
export type TurnBasedGame<S, A extends GameAction> = {
  mode: 'turn-based';
  meta: GameMeta;
  setup(ctx: EngineContext): S;
  currentPlayer(state: S): PlayerId;
  isLegal(state: S, action: A, by: PlayerId, ctx: EngineContext): boolean;
  reduce(state: S, action: A, by: PlayerId, ctx: EngineContext): S;
  isTerminal(state: S): GameResult | null;

  playerView?(state: S, viewer: PlayerId): S;
  ai?(state: S, me: PlayerId, ctx: EngineContext): A;
};

export type RealtimeGame<S, A extends GameAction> = {
  mode: 'realtime';
  meta: GameMeta;
  tickRateHz: number;
  setup(ctx: EngineContext): S;
  tick(state: S, dtMs: number, ctx: EngineContext): S;
  isLegal(state: S, action: A, by: PlayerId, ctx: EngineContext): boolean;
  reduce(state: S, action: A, by: PlayerId, ctx: EngineContext): S;
  isTerminal(state: S): GameResult | null;

  playerView?(state: S, viewer: PlayerId): S;
  ai?(state: S, me: PlayerId, ctx: EngineContext): A;
};

export type GameDefinition<S, A extends GameAction> =
  TurnBasedGame<S, A> | RealtimeGame<S, A>;
