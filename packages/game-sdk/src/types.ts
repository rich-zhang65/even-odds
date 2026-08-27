export type PlayerId = "p0" | "p1";

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
  mode: "turn-based" | "realtime";
  roles?: readonly [string, string];
  assets: AssetManifest;
};

export type GameAction = {
  type: string;
};

export type GameResult =
  | { winner: PlayerId; reason?: string }
  | { draw: true; reason?: string };

export type GameDefinition<S, A extends GameAction> = {
  meta: GameMeta;
  setup(ctx: EngineContext): S;
  currentPlayer(state: S): PlayerId;
  isLegal(state: S, action: A, by: PlayerId, ctx: EngineContext): boolean;
  reduce(state: S, action: A, by: PlayerId, ctx: EngineContext): S;
  isTerminal(state: S): GameResult | null;

  playerView?(state: S, viewer: PlayerId): S;
  ai?(state: S, me: PlayerId, ctx: EngineContext): A;
  tick?(state: S, dtMs: number, ctx: EngineContext): S;
  tickRateHz?: number;
};
