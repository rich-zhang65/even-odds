import type { EngineContext, PlayerId, RealtimeGame } from "@even-odds/game-sdk";
import { assets } from "./assets";
import { FACE_OFF_MS, GOAL, PADDLE, PUCK, SUB_STEPS, TABLE, TARGET_SCORE } from "./types";
import type { AirHockeyAction, AirHockeyState, Vec } from "./types";

const OPPONENT: Record<PlayerId, PlayerId> = { p0: "p1", p1: "p0" };

/* p0 defends the near end, p1 the far one, and neither may cross the halfway
   line. Their own half is the whole constraint on where a paddle can be. */
const HALFWAY = TABLE.height / 2;

/* The countdown is subtracted a step at a time and 1000/60 has no exact float
   representation, so it lands a hair above zero instead of on it and costs an
   extra tick. Well under any real duration, well over the error. */
const SLACK_MS = 1e-6;

const TOUCHING = PUCK.radius + PADDLE.radius;
const CENTRE: Vec = { x: TABLE.width / 2, y: HALFWAY };

const clamp = (value: number, low: number, high: number): number =>
  value < low ? low : value > high ? high : value;

const lerp = (a: Vec, b: Vec, t: number): Vec => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const inMouth = (x: number): boolean => Math.abs(x - TABLE.width / 2) <= GOAL.width / 2;

/* Every player owns a rectangle: the full width, their own half, inset by the
   paddle's radius so its edge stops on the line rather than over it. */
export const penned = (player: PlayerId, at: Vec): Vec => ({
  x: clamp(at.x, PADDLE.radius, TABLE.width - PADDLE.radius),
  y:
    player === "p0"
      ? clamp(at.y, HALFWAY + PADDLE.radius, TABLE.height - PADDLE.radius)
      : clamp(at.y, PADDLE.radius, HALFWAY - PADDLE.radius),
});

const restingPuck = (toward: PlayerId): AirHockeyState["puck"] => ({
  at: { x: TABLE.width / 2, y: toward === "p0" ? TABLE.height * 0.75 : TABLE.height * 0.25 },
  velocity: { x: 0, y: 0 },
});

const capped = (velocity: Vec): Vec => {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= PUCK.maxSpeed) return velocity;
  return { x: (velocity.x / speed) * PUCK.maxSpeed, y: (velocity.y / speed) * PUCK.maxSpeed };
};

const concede = (state: AirHockeyState, to: PlayerId): AirHockeyState => ({
  ...state,
  puck: { at: { ...CENTRE }, velocity: { x: 0, y: 0 } },
  scores: { ...state.scores, [to]: state.scores[to] + 1 },
  faceOff: { inMs: FACE_OFF_MS, toward: OPPONENT[to] },
});

/* The closest point to the puck on the segment a paddle covered this slice. */
const closestOn = (a: Vec, b: Vec, to: Vec): Vec => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return a;
  const along = clamp(((to.x - a.x) * dx + (to.y - a.y) * dy) / lengthSq, 0, 1);
  return { x: a.x + dx * along, y: a.y + dy * along };
};

/* Circle against the whole swept segment, not against where the paddle ended
   up. A pointer has no speed limit, so a hand can cross its own half between
   two ticks — many times the puck's width — and a paddle tested only at its
   endpoints would step clean over the puck without ever touching it. */
const strike = (
  puck: AirHockeyState["puck"],
  from: Vec,
  to: Vec,
  hand: Vec,
): AirHockeyState["puck"] | null => {
  const contact = closestOn(from, to, puck.at);
  if (Math.hypot(puck.at.x - contact.x, puck.at.y - contact.y) >= TOUCHING) return null;

  const travel = { x: to.x - from.x, y: to.y - from.y };
  const travelled = Math.hypot(travel.x, travel.y);
  const dx = puck.at.x - to.x;
  const dy = puck.at.y - to.y;
  const distance = Math.hypot(dx, dy);

  /* Normally the puck is pushed straight out from the paddle. When the paddle
     has swept past it there is no such direction to use, so it goes the way the
     hand was travelling — shoved ahead of the paddle rather than left behind. */
  const swept = distance < 1e-9 || distance >= TOUCHING;
  const nx = swept ? (travelled === 0 ? 0 : travel.x / travelled) : dx / distance;
  const ny = swept ? (travelled === 0 ? 1 : travel.y / travelled) : dy / distance;

  const closing = puck.velocity.x * nx + puck.velocity.y * ny;
  const bounced =
    closing < 0
      ? { x: puck.velocity.x - 2 * closing * nx, y: puck.velocity.y - 2 * closing * ny }
      : puck.velocity;

  /* What a strike adds is capped. A pointer can cross the table between two
     ticks, and an uncapped transfer would let a flick launch the puck at any
     speed a hand can produce. */
  const push = clamp(hand.x * nx + hand.y * ny, 0, PADDLE.maxTransfer);

  return {
    at: { x: to.x + nx * TOUCHING, y: to.y + ny * TOUCHING },
    velocity: capped({ x: bounced.x + nx * push, y: bounced.y + ny * push }),
  };
};

/* Two paddles can face each other across the halfway line fourteen units apart,
   and the puck wants twelve of clearance from each. Twenty-four does not fit in
   fourteen, so a puck caught between two converging paddles cannot satisfy both
   and is pushed out sideways instead — which is what it does on a real table.
   Without this the second paddle resolved wins and leaves the puck buried in
   the first. */
/* The puck sitting on the edge of a paddle rather than inside it. Exported
   because the client has to draw by exactly this rule: it puts your own paddle
   under your cursor a tenth of a second before the server's puck catches up,
   and without it your paddle would be drawn over the puck for that long. */
export const clearOfPaddle = (at: Vec, centre: Vec): Vec => {
  const dx = at.x - centre.x;
  const dy = at.y - centre.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= TOUCHING) return at;

  // Dead centre leaves no direction to leave by; up the table is as good as any.
  if (distance === 0) return { x: centre.x, y: centre.y + TOUCHING };
  return { x: centre.x + (dx / distance) * TOUCHING, y: centre.y + (dy / distance) * TOUCHING };
};

const freed = (at: Vec, first: Vec, second: Vec): Vec => {
  /* Resolving one paddle then the other leaves the puck exactly a contact away
     from whichever went last, so the tell is that it is still buried in the
     other one. */
  const buried =
    Math.hypot(at.x - first.x, at.y - first.y) < TOUCHING - 1e-9 ||
    Math.hypot(at.x - second.x, at.y - second.y) < TOUCHING - 1e-9;
  if (!buried) return at;

  const between = { x: first.x - second.x, y: first.y - second.y };
  const apart = Math.hypot(between.x, between.y);

  /* Only a genuine pinch needs this. Once the paddles are two contacts apart
     there is room for a point that clears both, so pushing off each in turn has
     already found it — and the escape below would be a teleport to the midpoint
     rather than a slide off an edge. */
  if (apart >= TOUCHING * 2) return at;

  const sideways = apart === 0 ? { x: 1, y: 0 } : { x: -between.y / apart, y: between.x / apart };
  const middle = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };

  // Far enough along the escape that both paddles are exactly a contact away.
  const clear = Math.sqrt(Math.max(0, TOUCHING * TOUCHING - (apart / 2) * (apart / 2)));
  const escape = (sign: number): Vec => ({
    x: middle.x + sideways.x * clear * sign,
    y: middle.y + sideways.y * clear * sign,
  });

  const onTable = (p: Vec): boolean =>
    p.x >= PUCK.radius &&
    p.x <= TABLE.width - PUCK.radius &&
    p.y >= PUCK.radius &&
    p.y <= TABLE.height - PUCK.radius;

  // Leave by the side it is already on, unless that side is into a wall.
  const nearer = (at.x - middle.x) * sideways.x + (at.y - middle.y) * sideways.y < 0 ? -1 : 1;
  const out = onTable(escape(nearer)) ? escape(nearer) : escape(-nearer);

  return {
    x: clamp(out.x, PUCK.radius, TABLE.width - PUCK.radius),
    y: clamp(out.y, PUCK.radius, TABLE.height - PUCK.radius),
  };
};

const EDGE = PUCK.radius;

/* Inside the boards. The goal mouth is not a wall, so a puck on its way in is
   not "inside" anything and must be left alone to cross the line. */
const inWall = (at: Vec): boolean =>
  at.x < EDGE ||
  at.x > TABLE.width - EDGE ||
  ((at.y < EDGE || at.y > TABLE.height - EDGE) && !inMouth(at.x));

const clears = (at: Vec, centre: Vec): boolean =>
  Math.hypot(at.x - centre.x, at.y - centre.y) >= TOUCHING - 1e-9;

/* Slid along the face of a wall until it is off a paddle: around the paddle
   rather than through the boards. Either side of the paddle will do, so it
   takes the nearer one that is still on the table — picking the nearer one
   blindly and clamping would slide it straight back into the paddle. */
const slideAlong = (at: Vec, centre: Vec, alongX: boolean): Vec => {
  if (clears(at, centre)) return at;

  const pinned = alongX ? at.y - centre.y : at.x - centre.x;
  const room = TOUCHING * TOUCHING - pinned * pinned;
  if (room <= 0) return at;

  const reach = Math.sqrt(room);
  const free = alongX ? at.x : at.y;
  const from = alongX ? centre.x : centre.y;
  const limit = alongX ? TABLE.width - EDGE : TABLE.height - EDGE;

  const sides = [from - reach, from + reach]
    .filter((side) => side >= EDGE && side <= limit)
    .sort((one, other) => Math.abs(free - one) - Math.abs(free - other));
  if (sides.length === 0) return at;

  return alongX ? { x: sides[0], y: at.y } : { x: at.x, y: sides[0] };
};

/* Somewhere the puck is actually allowed to be. */
const legal = (at: Vec, first: Vec, second: Vec): boolean =>
  clears(at, first) && clears(at, second) && !inWall(at);

/* Points on the edge of a paddle, for when no straight push works. Sixteen is
   plenty: the legal area is most of the table, so a gap is never narrow. */
const RING = Array.from({ length: 16 }, (_, step) => (step / 16) * Math.PI * 2);

const around = (centre: Vec): Vec[] =>
  RING.map((angle) => ({
    x: centre.x + Math.cos(angle) * TOUCHING,
    y: centre.y + Math.sin(angle) * TOUCHING,
  }));

/* No tick may end with the puck inside a paddle or inside a wall, so it goes to
   the nearest place that is neither. Pushing straight off each paddle settles
   open play and is the only path most ticks take. The rest is for a puck with
   nowhere obvious to go — squeezed between two paddles, or held against the
   boards by one, where a straight push would drive it through a wall. */
const clearOf = (at: Vec, first: Vec, second: Vec): Vec => {
  const pushed = freed(clearOfPaddle(clearOfPaddle(at, first), second), first, second);
  if (legal(pushed, first, second)) return pushed;

  const onWall: Vec = {
    x: clamp(pushed.x, EDGE, TABLE.width - EDGE),
    y: inMouth(pushed.x) ? pushed.y : clamp(pushed.y, EDGE, TABLE.height - EDGE),
  };

  const slid = [true, false].map((alongX) => {
    let out = onWall;
    for (const centre of [first, second]) out = slideAlong(out, centre, alongX);
    return out;
  });

  const nearest = [...slid, ...around(first), ...around(second)]
    .filter((option) => legal(option, first, second))
    .sort(
      (one, other) =>
        Math.hypot(one.x - at.x, one.y - at.y) - Math.hypot(other.x - at.x, other.y - at.y),
    );

  return nearest[0] ?? pushed;
};

const advance = (
  state: AirHockeyState,
  dt: number,
  hands: Record<PlayerId, Vec>,
  swept: Record<PlayerId, { from: Vec; to: Vec }>,
): AirHockeyState => {
  const { velocity } = state.puck;
  let next: Vec = {
    x: state.puck.at.x + velocity.x * dt,
    y: state.puck.at.y + velocity.y * dt,
  };
  let heading = velocity;

  // The long sides are solid: reflect and push clear, so a puck cannot stick.
  if (next.x - PUCK.radius <= 0 && heading.x < 0) {
    next = { ...next, x: PUCK.radius };
    heading = { ...heading, x: -heading.x };
  } else if (next.x + PUCK.radius >= TABLE.width && heading.x > 0) {
    next = { ...next, x: TABLE.width - PUCK.radius };
    heading = { ...heading, x: -heading.x };
  }

  /* The ends are solid either side of the mouth. Inside it the puck keeps going
     and the goal is judged when its centre crosses the line, so the shot has to
     actually go in rather than merely touch. */
  if (next.y - PUCK.radius <= 0 && heading.y < 0 && !inMouth(next.x)) {
    next = { ...next, y: PUCK.radius };
    heading = { ...heading, y: -heading.y };
  } else if (next.y + PUCK.radius >= TABLE.height && heading.y > 0 && !inMouth(next.x)) {
    next = { ...next, y: TABLE.height - PUCK.radius };
    heading = { ...heading, y: -heading.y };
  }

  let moved: AirHockeyState = { ...state, puck: { at: next, velocity: heading } };

  for (const player of ["p0", "p1"] as const) {
    const struck = strike(moved.puck, swept[player].from, swept[player].to, hands[player]);
    if (struck !== null) moved = { ...moved, puck: struck };
  }

  moved = {
    ...moved,
    puck: { ...moved.puck, at: clearOf(moved.puck.at, swept.p0.to, swept.p1.to) },
  };

  if (moved.puck.at.y <= 0) return concede(moved, "p0");
  if (moved.puck.at.y >= TABLE.height) return concede(moved, "p1");

  const slowed = Math.max(0, 1 - PUCK.damping * dt);
  return {
    ...moved,
    puck: {
      at: moved.puck.at,
      velocity: { x: moved.puck.velocity.x * slowed, y: moved.puck.velocity.y * slowed },
    },
  };
};

export const AirHockey: RealtimeGame<AirHockeyState, AirHockeyAction> = {
  mode: "realtime",

  meta: {
    id: "air-hockey",
    name: "Air Hockey",
    tagline: "Rebound off the walls",
    estimatedMinutes: 4,
    assets,
  },

  tickRateHz: 60,

  setup: (ctx) => ({
    puck: { at: { ...CENTRE }, velocity: { x: 0, y: 0 } },
    paddles: {
      p0: {
        at: { x: TABLE.width / 2, y: TABLE.height * 0.8 },
        target: { x: TABLE.width / 2, y: TABLE.height * 0.8 },
      },
      p1: {
        at: { x: TABLE.width / 2, y: TABLE.height * 0.2 },
        target: { x: TABLE.width / 2, y: TABLE.height * 0.2 },
      },
    },
    scores: { p0: 0, p1: 0 },
    faceOff: { inMs: FACE_OFF_MS, toward: ctx.random.int(0, 1) === 0 ? "p0" : "p1" },
  }),

  isLegal: (_state, action) => Number.isFinite(action.x) && Number.isFinite(action.y),

  reduce: (state, action, by) => ({
    ...state,
    paddles: {
      ...state.paddles,
      [by]: { ...state.paddles[by], target: penned(by, { x: action.x, y: action.y }) },
    },
  }),

  tick: (state, dtMs, _ctx: EngineContext) => {
    const dt = dtMs / 1000;
    const from: Record<PlayerId, Vec> = { p0: state.paddles.p0.at, p1: state.paddles.p1.at };
    const to: Record<PlayerId, Vec> = {
      p0: state.paddles.p0.target,
      p1: state.paddles.p1.target,
    };

    /* A paddle arrives at its target within the tick, so its speed over the tick
       is the whole displacement. That is what a strike carries. */
    const hands: Record<PlayerId, Vec> = {
      p0: { x: (to.p0.x - from.p0.x) / dt, y: (to.p0.y - from.p0.y) / dt },
      p1: { x: (to.p1.x - from.p1.x) / dt, y: (to.p1.y - from.p1.y) / dt },
    };

    const settled: AirHockeyState = {
      ...state,
      paddles: {
        p0: { at: to.p0, target: to.p0 },
        p1: { at: to.p1, target: to.p1 },
      },
    };

    /* A waiting puck is still solid. Parking a paddle on the spot slides it out
       from underneath rather than swallowing it, and it stays at rest. */
    const waiting = (at: Vec): Vec => clearOf(at, to.p0, to.p1);

    if (settled.faceOff.inMs > 0) {
      const inMs = settled.faceOff.inMs - dtMs;
      if (inMs > SLACK_MS) {
        return {
          ...settled,
          puck: { ...settled.puck, at: waiting(settled.puck.at) },
          faceOff: { ...settled.faceOff, inMs },
        };
      }
      const dropped = restingPuck(settled.faceOff.toward);
      return {
        ...settled,
        puck: { ...dropped, at: waiting(dropped.at) },
        faceOff: { ...settled.faceOff, inMs: 0 },
      };
    }

    /* Sliced so the puck meets the walls and the paddles in something close to
       the order it really would. Each slice hands the paddles' segment to the
       collision, which is what actually stops a flung hand skipping the puck. */
    let next = settled;
    for (let slice = 1; slice <= SUB_STEPS; slice++) {
      const t = slice / SUB_STEPS;
      const was = (slice - 1) / SUB_STEPS;
      next = advance(next, dt / SUB_STEPS, hands, {
        p0: { from: lerp(from.p0, to.p0, was), to: lerp(from.p0, to.p0, t) },
        p1: { from: lerp(from.p1, to.p1, was), to: lerp(from.p1, to.p1, t) },
      });
      if (next.faceOff.inMs > 0) return next;
    }

    return next;
  },

  isTerminal: (state) => {
    if (state.scores.p0 >= TARGET_SCORE) return { winner: "p0" };
    if (state.scores.p1 >= TARGET_SCORE) return { winner: "p1" };
    return null;
  },
};
