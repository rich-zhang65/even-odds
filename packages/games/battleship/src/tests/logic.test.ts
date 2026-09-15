import { describe, expect, it } from 'vitest';
import { createRandom } from '@even-odds/game-sdk';
import type { EngineContext, PlayerId } from '@even-odds/game-sdk';
import { Battleship, cellsOf, fleetProblem, isSunk } from '../logic';
import { BOARD, FLEET } from '../types';
import type { BattleshipState, Cell, Ship } from '../types';

const context = (): EngineContext => ({
  matchId: 'm1',
  players: ['p0', 'p1'],
  random: createRandom(1),
  now: 0,
});

/* Five rows, one ship each, nothing touching. Legal and easy to reason about:
   a ship's row is its length, so a coordinate names a vessel on sight. */
const LINE_UP: Ship[] = [
  { id: 'carrier', at: { x: 0, y: 0 }, facing: 'across' },
  { id: 'battleship', at: { x: 0, y: 1 }, facing: 'across' },
  { id: 'cruiser', at: { x: 0, y: 2 }, facing: 'across' },
  { id: 'submarine', at: { x: 0, y: 3 }, facing: 'across' },
  { id: 'destroyer', at: { x: 0, y: 4 }, facing: 'across' },
];

// The same fleet shifted clear, so the two sides are not mirror images.
const OTHER_LINE_UP: Ship[] = LINE_UP.map((ship) => ({
  ...ship,
  at: { x: ship.at.x + 2, y: ship.at.y + 5 },
}));

const deploy = (state: BattleshipState, by: PlayerId, ships: Ship[]) =>
  Battleship.reduce(state, { type: 'DEPLOY', ships }, by, context());

const fire = (state: BattleshipState, by: PlayerId, at: Cell) =>
  Battleship.reduce(state, { type: 'FIRE', at }, by, context());

/* Both fleets down and firing under way. p1 deployed second, so p1 shoots
   first. */
const engaged = (): BattleshipState =>
  deploy(
    deploy(Battleship.setup(context()), 'p0', LINE_UP),
    'p1',
    OTHER_LINE_UP,
  );

const shotsAt = (cells: Cell[], state: BattleshipState, by: PlayerId) =>
  cells.reduce((running, at) => fire(running, by, at), state);

describe('Battleship — deploying', () => {
  it('asks p0 for a fleet first, then p1', () => {
    const fresh = Battleship.setup(context());
    expect(Battleship.currentPlayer(fresh)).toBe('p0');

    const half = deploy(fresh, 'p0', LINE_UP);
    expect(Battleship.currentPlayer(half)).toBe('p1');
    expect(half.phase).toBe('deploying');
  });

  it('starts firing once both fleets are down', () => {
    const state = engaged();

    expect(state.phase).toBe('firing');
    expect(state.boards.p0.ships).toHaveLength(FLEET.length);
    expect(state.boards.p1.ships).toHaveLength(FLEET.length);
  });

  it('gives the first shot to whoever deployed second', () => {
    expect(Battleship.currentPlayer(engaged())).toBe('p1');
  });

  it('will not let a player deploy twice', () => {
    const half = deploy(Battleship.setup(context()), 'p0', LINE_UP);
    const again = { type: 'DEPLOY', ships: LINE_UP } as const;

    expect(Battleship.isLegal(half, again, 'p0', context())).toBe(false);
  });

  it('refuses a fleet once firing has started', () => {
    const order = { type: 'DEPLOY', ships: LINE_UP } as const;

    expect(Battleship.isLegal(engaged(), order, 'p0', context())).toBe(false);
  });
});

describe('Battleship — what counts as a fleet', () => {
  it('accepts a legal line-up', () => {
    expect(fleetProblem(LINE_UP)).toBeNull();
  });

  it('wants every ship, once each', () => {
    expect(fleetProblem(LINE_UP.slice(1))).not.toBeNull();
    expect(
      fleetProblem([
        ...LINE_UP.slice(0, 4),
        { id: 'cruiser', at: { x: 0, y: 6 }, facing: 'across' },
      ]),
    ).not.toBeNull();
  });

  it('keeps ships on the board, bow and stern', () => {
    const hanging: Ship[] = [
      { id: 'carrier', at: { x: BOARD - 2, y: 0 }, facing: 'across' },
      ...LINE_UP.slice(1),
    ];
    const above: Ship[] = [
      { id: 'carrier', at: { x: 0, y: -1 }, facing: 'down' },
      ...LINE_UP.slice(1),
    ];

    expect(fleetProblem(hanging)).not.toBeNull();
    expect(fleetProblem(above)).not.toBeNull();
  });

  it('refuses ships that share a cell, crossing or in line', () => {
    const stacked: Ship[] = [
      ...LINE_UP.slice(0, 4),
      { id: 'destroyer', at: { x: 0, y: 0 }, facing: 'across' },
    ];
    const crossing: Ship[] = [
      ...LINE_UP.slice(0, 4),
      { id: 'destroyer', at: { x: 3, y: 0 }, facing: 'down' },
    ];

    expect(fleetProblem(stacked)).not.toBeNull();
    expect(fleetProblem(crossing)).not.toBeNull();
  });

  it('refuses a fractional cell, which would sit between squares', () => {
    const between: Ship[] = [
      { id: 'carrier', at: { x: 0.5, y: 0 }, facing: 'across' },
      ...LINE_UP.slice(1),
    ];

    expect(fleetProblem(between)).not.toBeNull();
  });
});

describe('Battleship — firing', () => {
  it('records a hit on a ship and a miss on open water', () => {
    const hit = fire(engaged(), 'p1', { x: 0, y: 0 });
    expect(hit.boards.p0.incoming).toEqual([{ at: { x: 0, y: 0 }, hit: true }]);

    const miss = fire(engaged(), 'p1', { x: 9, y: 9 });
    expect(miss.boards.p0.incoming).toEqual([
      { at: { x: 9, y: 9 }, hit: false },
    ]);
  });

  it('passes the turn whether the shot hit or missed', () => {
    expect(
      Battleship.currentPlayer(fire(engaged(), 'p1', { x: 0, y: 0 })),
    ).toBe('p0');
    expect(
      Battleship.currentPlayer(fire(engaged(), 'p1', { x: 9, y: 9 })),
    ).toBe('p0');
  });

  it('refuses a cell already fired at, hit or miss', () => {
    const once = fire(engaged(), 'p1', { x: 0, y: 0 });
    const twice = fire(once, 'p0', { x: 5, y: 9 });

    expect(
      Battleship.isLegal(
        twice,
        { type: 'FIRE', at: { x: 0, y: 0 } },
        'p1',
        context(),
      ),
    ).toBe(false);
  });

  it('refuses a shot off the board', () => {
    const state = engaged();

    for (const at of [
      { x: -1, y: 0 },
      { x: BOARD, y: 0 },
      { x: 0, y: BOARD },
      { x: 1.5, y: 2 },
    ]) {
      expect(
        Battleship.isLegal(state, { type: 'FIRE', at }, 'p1', context()),
      ).toBe(false);
    }
  });

  it('refuses a shot before the fleets are down', () => {
    const fresh = Battleship.setup(context());
    const shot = { type: 'FIRE', at: { x: 0, y: 0 } } as const;

    expect(Battleship.isLegal(fresh, shot, 'p0', context())).toBe(false);
  });

  it('sinks a ship only when every cell of it has been hit', () => {
    const destroyer = LINE_UP[4];
    const cells = cellsOf(destroyer);
    const part = shotsAt(cells.slice(0, 1), engaged(), 'p1');
    const all = shotsAt(cells, engaged(), 'p1');

    expect(isSunk(part.boards.p0, destroyer)).toBe(false);
    expect(isSunk(all.boards.p0, destroyer)).toBe(true);
  });
});

describe('Battleship — winning', () => {
  it('ends when one fleet is entirely sunk', () => {
    const everyCell = LINE_UP.flatMap(cellsOf);
    const sunk = shotsAt(everyCell, engaged(), 'p1');

    expect(Battleship.isTerminal(sunk)).toEqual({ winner: 'p1' });
  });

  it('is not over while anything is still afloat', () => {
    const allButOne = LINE_UP.flatMap(cellsOf).slice(0, -1);
    const nearly = shotsAt(allButOne, engaged(), 'p1');

    expect(Battleship.isTerminal(nearly)).toBeNull();
  });

  it('does not call an empty board a wiped-out one', () => {
    const halfDeployed = Battleship.reduce(
      {
        phase: 'firing',
        boards: {
          p0: { ships: [], incoming: [] },
          p1: { ships: LINE_UP, incoming: [] },
        },
        turn: 'p0',
      },
      { type: 'FIRE', at: { x: 9, y: 9 } },
      'p0',
      context(),
    );

    expect(Battleship.isTerminal(halfDeployed)).toBeNull();
  });
});

describe('Battleship — what each player is allowed to see', () => {
  const view = (state: BattleshipState, viewer: PlayerId): BattleshipState => {
    const masked = Battleship.playerView?.(state, viewer);
    if (masked === undefined) throw new Error('battleship must mask its state');
    return masked;
  };

  it('leaves your own fleet alone', () => {
    expect(view(engaged(), 'p0').boards.p0.ships).toHaveLength(FLEET.length);
  });

  it('hides every ship of theirs that is still afloat', () => {
    expect(view(engaged(), 'p0').boards.p1.ships).toEqual([]);
  });

  /* The one that matters. Anything reaching the client is reachable by the
     player, so the masked view must not carry an afloat position at all --
     not hidden behind a flag, not anywhere in the payload. */
  it('leaks no afloat position, even mid-game', () => {
    const scattered = shotsAt(
      [
        { x: 2, y: 5 },
        { x: 7, y: 7 },
        { x: 4, y: 9 },
      ],
      engaged(),
      'p0',
    );
    const seen = JSON.stringify(view(scattered, 'p0').boards.p1);

    const afloat = OTHER_LINE_UP.filter(
      (ship) => !isSunk(scattered.boards.p1, ship),
    );
    expect(afloat.length).toBeGreaterThan(0);
    for (const ship of afloat) {
      expect(seen).not.toContain(ship.id);
    }
  });

  it('reveals a ship once it is sunk, so the wreck can be drawn and named', () => {
    const destroyer = OTHER_LINE_UP[4];
    const sunk = shotsAt(cellsOf(destroyer), engaged(), 'p0');

    expect(view(sunk, 'p0').boards.p1.ships).toEqual([destroyer]);
  });

  it('keeps your own shots and their outcomes', () => {
    const fired = shotsAt(
      [
        { x: 2, y: 5 },
        { x: 0, y: 9 },
      ],
      engaged(),
      'p0',
    );
    const seen = view(fired, 'p0').boards.p1.incoming;

    expect(seen).toEqual([
      { at: { x: 2, y: 5 }, hit: true },
      { at: { x: 0, y: 9 }, hit: false },
    ]);
  });

  it('masks during deployment too, before a shot is ever fired', () => {
    const half = deploy(Battleship.setup(context()), 'p0', LINE_UP);

    expect(view(half, 'p1').boards.p0.ships).toEqual([]);
    expect(view(half, 'p0').boards.p0.ships).toHaveLength(FLEET.length);
  });
});
