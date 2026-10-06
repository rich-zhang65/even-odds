import type {
  EngineContext,
  PlayerId,
  RealtimeGame,
} from '@even-odds/game-sdk';
import { assets } from './assets';
import {
  FACE_OFF_MS,
  GRACE_MS,
  OPENING_MS,
  GOAL,
  PADDLE,
  PUCK,
  SUB_STEPS,
  TABLE,
  TARGET_SCORE,
} from './types';
import type { AirHockeyAction, AirHockeyState, Vec } from './types';

const OPPONENT: Record<PlayerId, PlayerId> = { p0: 'p1', p1: 'p0' };

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

/* Whether the puck is lined up with the mouth closely enough to go through it.
   The mouth is a slot in the end wall, so all of the puck has to fit: its
   centre at least a radius inside each post. One that overhangs a post meets
   the wall like anywhere else and comes back. */
const inMouth = (x: number): boolean =>
  Math.abs(x - TABLE.width / 2) <= GOAL.width / 2 - PUCK.radius;

/* Every player owns a rectangle: the full width, their own half, inset by the
   paddle's radius so its edge stops on the line rather than over it. */
/* Whoever just scored, while the puck waits to come back, or null. A goal
   drops the puck to the side that conceded, so the scorer is the other one;
   the opening face-off has no scorer because nobody has scored yet. */
export const justScored = (state: AirHockeyState): PlayerId | null =>
  state.faceOff.inMs > 0 &&
  state.faceOff.toward !== null &&
  state.scores.p0 + state.scores.p1 > 0
    ? OPPONENT[state.faceOff.toward]
    : null;

/* How the puck should be drawn. After a goal it is hidden, then blinks on its
   spot through the grace period while nobody can touch it; the rest of the
   time, the opening countdown included, it shows plainly. */
export const puckLook = (
  state: AirHockeyState,
): 'hidden' | 'blinking' | 'solid' => {
  const { inMs, toward } = state.faceOff;
  if (toward === null || inMs <= 0) return 'solid';
  return inMs > GRACE_MS ? 'hidden' : 'blinking';
};

/* Where to draw the puck when your own paddle is heading along `heading` (a
   unit vector) and has run into it. The client draws your paddle at your
   cursor but the puck a tenth of a second behind the server, so a fast ram can
   carry the paddle past the puck's centre between frames. Pushed out the
   nearest way, the puck would then be drawn behind the paddle until the hit
   arrived. This pushes it out ahead instead, keeping its offset from the line
   of travel. A puck the paddle never reached, or already clear ahead, is left
   where it is. Drawing only: the server's collision is untouched. */
export const inFrontOf = (at: Vec, centre: Vec, heading: Vec): Vec => {
  const rel = { x: at.x - centre.x, y: at.y - centre.y };
  const along = rel.x * heading.x + rel.y * heading.y;
  const side = { x: rel.x - along * heading.x, y: rel.y - along * heading.y };
  const offset = Math.hypot(side.x, side.y);
  if (offset >= TOUCHING) return at;

  const reach = Math.sqrt(TOUCHING * TOUCHING - offset * offset);
  if (along >= reach) return at;
  return {
    x: centre.x + side.x + heading.x * reach,
    y: centre.y + side.y + heading.y * reach,
  };
};

/* The opening count for the screen, 3 then 2 then 1, or null once it is over
   and on every face-off after a goal. */
export const countdown = (state: AirHockeyState): number | null =>
  state.faceOff.toward === null && state.faceOff.inMs > 0
    ? Math.ceil(state.faceOff.inMs / 1000)
    : null;

export const penned = (player: PlayerId, at: Vec): Vec => ({
  x: clamp(at.x, PADDLE.radius, TABLE.width - PADDLE.radius),
  y:
    player === 'p0'
      ? clamp(at.y, HALFWAY + PADDLE.radius, TABLE.height - PADDLE.radius)
      : clamp(at.y, PADDLE.radius, HALFWAY - PADDLE.radius),
});

const restingPuck = (toward: PlayerId | null): AirHockeyState['puck'] => ({
  at:
    toward === null
      ? { ...CENTRE }
      : {
          x: TABLE.width / 2,
          y: toward === 'p0' ? TABLE.height * 0.75 : TABLE.height * 0.25,
        },
  velocity: { x: 0, y: 0 },
});

const capped = (velocity: Vec): Vec => {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= PUCK.maxSpeed) return velocity;
  return {
    x: (velocity.x / speed) * PUCK.maxSpeed,
    y: (velocity.y / speed) * PUCK.maxSpeed,
  };
};

/* Straight to the conceding side's spot. Sending it back through the middle
   first would only be drawn as the puck sliding the length of the table. */
const concede = (state: AirHockeyState, to: PlayerId): AirHockeyState => ({
  ...state,
  puck: restingPuck(OPPONENT[to]),
  scores: { ...state.scores, [to]: state.scores[to] + 1 },
  faceOff: { inMs: FACE_OFF_MS, toward: OPPONENT[to] },
});

const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;

/* The first moment, within `span` seconds, that a puck at `at` moving at
   `velocity` touches a paddle at `centre` moving at `paddle`, or null if it
   does not. Both move in straight lines through a slice, so this is where
   their gap closes to a contact: the earlier root of a quadratic in time. A
   pair already touching counts as touching now, but only while still closing,
   so a puck just bounced off is not caught again. */
const contactTime = (
  at: Vec,
  velocity: Vec,
  centre: Vec,
  paddle: Vec,
  span: number,
): number | null => {
  const gap = { x: at.x - centre.x, y: at.y - centre.y };
  const closing = { x: velocity.x - paddle.x, y: velocity.y - paddle.y };
  const a = dot(closing, closing);
  const b = 2 * dot(gap, closing);
  const c = dot(gap, gap) - TOUCHING * TOUCHING;

  if (c <= 0) return b < 0 ? 0 : null;
  if (a === 0) return null;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= span ? t : null;
};

/* The direction a puck leaves a paddle by. Straight out from its centre, except
   where the paddle has gone past the puck's centre: a paddle outruns the capped
   puck, and pushing it out the nearest way would then send it out the back. So
   it goes out ahead the way the hand was travelling, keeping its offset from
   the line of travel so a glancing ram still glances. */
const leaving = (at: Vec, centre: Vec, paddle: Vec): Vec => {
  const gap = { x: at.x - centre.x, y: at.y - centre.y };
  const distance = Math.hypot(gap.x, gap.y);
  const speed = Math.hypot(paddle.x, paddle.y);
  if (speed > 0 && (distance < 1e-9 || dot(gap, paddle) < 0)) {
    const heading = { x: paddle.x / speed, y: paddle.y / speed };
    const out = inFrontOf(at, centre, heading);
    return {
      x: (out.x - centre.x) / TOUCHING,
      y: (out.y - centre.y) / TOUCHING,
    };
  }
  return distance < 1e-9
    ? { x: 0, y: 1 }
    : { x: gap.x / distance, y: gap.y / distance };
};

/* Bounced off the paddle as a moving surface, leaving along `normal`: the
   puck's closing speed relative to the paddle is turned around and scaled by
   the bounce, so a paddle that hits a resting puck sends it off faster than
   itself rather than carrying it on its face. The paddle's speed is capped:
   a pointer can cross the table between two ticks, and uncapped that would
   launch the puck at any speed a hand can produce. */
const bounceOff = (velocity: Vec, normal: Vec, paddle: Vec): Vec => {
  const pushing = clamp(dot(paddle, normal), 0, PADDLE.maxTransfer);
  const closing = dot(velocity, normal) - pushing;
  if (closing >= 0) return velocity;
  const kick = -(1 + PUCK.bounce) * closing;
  return capped({
    x: velocity.x + kick * normal.x,
    y: velocity.y + kick * normal.y,
  });
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
  return {
    x: centre.x + (dx / distance) * TOUCHING,
    y: centre.y + (dy / distance) * TOUCHING,
  };
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

  const sideways =
    apart === 0
      ? { x: 1, y: 0 }
      : { x: -between.y / apart, y: between.x / apart };
  const middle = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };

  // Far enough along the escape that both paddles are exactly a contact away.
  const clear = Math.sqrt(
    Math.max(0, TOUCHING * TOUCHING - (apart / 2) * (apart / 2)),
  );
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
  const nearer =
    (at.x - middle.x) * sideways.x + (at.y - middle.y) * sideways.y < 0
      ? -1
      : 1;
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
  const pushed = freed(
    clearOfPaddle(clearOfPaddle(at, first), second),
    first,
    second,
  );
  if (legal(pushed, first, second)) return pushed;

  const onWall: Vec = {
    x: clamp(pushed.x, EDGE, TABLE.width - EDGE),
    y: inMouth(pushed.x)
      ? pushed.y
      : clamp(pushed.y, EDGE, TABLE.height - EDGE),
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
        Math.hypot(one.x - at.x, one.y - at.y) -
        Math.hypot(other.x - at.x, other.y - at.y),
    );

  return nearest[0] ?? pushed;
};

/* A puck that ends a slice inside a paddle anyway -- one moving faster than
   the puck can be sent, so it catches up after the bounce -- is set on the
   edge it leaves by and given the paddle's push. */
const offPaddle = (
  puck: AirHockeyState['puck'],
  centre: Vec,
  paddle: Vec,
): AirHockeyState['puck'] => {
  if (Math.hypot(puck.at.x - centre.x, puck.at.y - centre.y) >= TOUCHING)
    return puck;
  const normal = leaving(puck.at, centre, paddle);
  return {
    at: {
      x: centre.x + normal.x * TOUCHING,
      y: centre.y + normal.y * TOUCHING,
    },
    velocity: bounceOff(puck.velocity, normal, paddle),
  };
};

/* One slice. Continuous against the paddles: each contact is found at the
   moment it happens, the puck bounces there, and it travels on for the rest of
   the slice. A pointer has no speed limit, so a hand can cross its own half
   between two ticks; testing only where the paddle ended up would let it step
   clean over the puck, and resolving there would park the puck against it. */
const advance = (
  state: AirHockeyState,
  dt: number,
  hands: Record<PlayerId, Vec>,
  swept: Record<PlayerId, { from: Vec; to: Vec }>,
): AirHockeyState => {
  let at = state.puck.at;
  let velocity = state.puck.velocity;
  let time = 0;

  // A puck struck by one paddle can reach the other within the same slice.
  for (let contacts = 0; contacts < 4; contacts++) {
    let first: { player: PlayerId; t: number } | null = null;
    for (const player of ['p0', 'p1'] as const) {
      const paddle = hands[player];
      const centre = {
        x: swept[player].from.x + paddle.x * time,
        y: swept[player].from.y + paddle.y * time,
      };
      const t = contactTime(at, velocity, centre, paddle, dt - time);
      if (t !== null && (first === null || t < first.t)) first = { player, t };
    }
    if (first === null) break;

    at = { x: at.x + velocity.x * first.t, y: at.y + velocity.y * first.t };
    time += first.t;
    const paddle = hands[first.player];
    const centre = {
      x: swept[first.player].from.x + paddle.x * time,
      y: swept[first.player].from.y + paddle.y * time,
    };
    const bounced = bounceOff(velocity, leaving(at, centre, paddle), paddle);
    // Nothing left to give: a paddle faster than the puck can go. Settled below.
    if (bounced === velocity) break;
    velocity = bounced;
  }

  let next: Vec = {
    x: at.x + velocity.x * (dt - time),
    y: at.y + velocity.y * (dt - time),
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
  } else if (
    next.y + PUCK.radius >= TABLE.height &&
    heading.y > 0 &&
    !inMouth(next.x)
  ) {
    next = { ...next, y: TABLE.height - PUCK.radius };
    heading = { ...heading, y: -heading.y };
  }

  let moved: AirHockeyState = {
    ...state,
    puck: { at: next, velocity: heading },
  };

  for (const player of ['p0', 'p1'] as const) {
    moved = {
      ...moved,
      puck: offPaddle(moved.puck, swept[player].to, hands[player]),
    };
  }
  moved = {
    ...moved,
    puck: {
      ...moved.puck,
      at: clearOf(moved.puck.at, swept.p0.to, swept.p1.to),
    },
  };

  if (moved.puck.at.y <= 0) return concede(moved, 'p0');
  if (moved.puck.at.y >= TABLE.height) return concede(moved, 'p1');

  const slowed = Math.max(0, 1 - PUCK.damping * dt);
  return {
    ...moved,
    puck: {
      at: moved.puck.at,
      velocity: {
        x: moved.puck.velocity.x * slowed,
        y: moved.puck.velocity.y * slowed,
      },
    },
  };
};

export const AirHockey: RealtimeGame<AirHockeyState, AirHockeyAction> = {
  mode: 'realtime',

  meta: {
    id: 'air-hockey',
    name: 'Air Hockey',
    tagline: 'Rebound off the walls',
    estimatedMinutes: 4,
    assets,
  },

  tickRateHz: 60,

  setup: () => ({
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
    faceOff: { inMs: OPENING_MS, toward: null },
  }),

  isLegal: (_state, action) =>
    Number.isFinite(action.x) && Number.isFinite(action.y),

  reduce: (state, action, by) => ({
    ...state,
    paddles: {
      ...state.paddles,
      [by]: {
        ...state.paddles[by],
        target: penned(by, { x: action.x, y: action.y }),
      },
    },
  }),

  tick: (state, dtMs, _ctx: EngineContext) => {
    const dt = dtMs / 1000;
    const from: Record<PlayerId, Vec> = {
      p0: state.paddles.p0.at,
      p1: state.paddles.p1.at,
    };
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

    /* The moment a waiting puck goes live it becomes solid, so a paddle parked
       on the spot slides it out from underneath rather than swallowing it. It
       stays at rest. */
    const waiting = (at: Vec): Vec => clearOf(at, to.p0, to.p1);

    if (settled.faceOff.inMs > 0) {
      const inMs = settled.faceOff.inMs - dtMs;
      if (inMs > SLACK_MS) {
        // A ghost while it waits: the paddles move, the puck does not.
        return { ...settled, faceOff: { ...settled.faceOff, inMs } };
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
    if (state.scores.p0 >= TARGET_SCORE) return { winner: 'p0' };
    if (state.scores.p1 >= TARGET_SCORE) return { winner: 'p1' };
    return null;
  },

  score: (state) => state.scores,
};
