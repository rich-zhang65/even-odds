import { describe, expect, it } from 'vitest';
import { createRandom } from '@even-odds/game-sdk';
import type { EngineContext, PlayerId } from '@even-odds/game-sdk';
import { Gomoku, stoneAt, winningLine } from '../logic';
import { BOARD, RUN } from '../types';
import type { Cell, GomokuState, Stone } from '../types';

const context = (): EngineContext => ({
  matchId: 'm1',
  players: ['p0', 'p1'],
  random: createRandom(1),
  now: 0,
});

const place = (state: GomokuState, by: PlayerId, at: Cell): GomokuState =>
  Gomoku.reduce(state, { type: 'PLACE', at }, by, context());

/* A board built stone by stone in the order given, alternating as a real game
   would so the turn and the play order stay honest. */
const played = (moves: Cell[]): GomokuState =>
  moves.reduce(
    (state, at, index) => place(state, index % 2 === 0 ? 'p0' : 'p1', at),
    Gomoku.setup(context()),
  );

/* p0 builds a run along `axis`; p1 answers far away each time. The last stone
   played is p0's, which is what completes the line. */
const runOf = (count: number, axis: Cell, from: Cell = { x: 5, y: 5 }) => {
  const moves: Cell[] = [];
  for (let step = 0; step < count; step++) {
    moves.push({ x: from.x + axis.x * step, y: from.y + axis.y * step });
    if (step < count - 1) moves.push({ x: 0, y: step });
  }
  return played(moves);
};

describe('Gomoku — placing', () => {
  it('starts empty with p0 to play', () => {
    const fresh = Gomoku.setup(context());

    expect(fresh.stones).toEqual([]);
    expect(Gomoku.currentPlayer(fresh)).toBe('p0');
  });

  it('alternates after every stone', () => {
    const one = place(Gomoku.setup(context()), 'p0', { x: 7, y: 7 });
    expect(Gomoku.currentPlayer(one)).toBe('p1');

    const two = place(one, 'p1', { x: 7, y: 8 });
    expect(Gomoku.currentPlayer(two)).toBe('p0');
  });

  it('keeps the stones in the order they were played', () => {
    const state = played([
      { x: 7, y: 7 },
      { x: 8, y: 8 },
    ]);

    expect(state.stones).toEqual<Stone[]>([
      { at: { x: 7, y: 7 }, by: 'p0' },
      { at: { x: 8, y: 8 }, by: 'p1' },
    ]);
  });

  it('refuses a point off the board, or between points', () => {
    const fresh = Gomoku.setup(context());

    for (const at of [
      { x: -1, y: 0 },
      { x: BOARD, y: 0 },
      { x: 0, y: BOARD },
      { x: 1.5, y: 2 },
    ]) {
      expect(
        Gomoku.isLegal(fresh, { type: 'PLACE', at }, 'p0', context()),
      ).toBe(false);
    }
  });

  it('refuses a point that already has a stone, either colour', () => {
    const taken = played([{ x: 7, y: 7 }]);
    const shot = { type: 'PLACE', at: { x: 7, y: 7 } } as const;

    expect(Gomoku.isLegal(taken, shot, 'p1', context())).toBe(false);
    expect(Gomoku.isLegal(taken, shot, 'p0', context())).toBe(false);
    expect(stoneAt(taken.stones, { x: 7, y: 7 })?.by).toBe('p0');
  });
});

describe('Gomoku — winning', () => {
  it('wins on five along any of the four axes', () => {
    for (const axis of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: -1 },
    ]) {
      const state = runOf(RUN, axis, { x: 5, y: 7 });

      expect(Gomoku.isTerminal(state)).toEqual({ winner: 'p0' });
      expect(winningLine(state)?.line).toHaveLength(RUN);
    }
  });

  it('is not a win on four', () => {
    expect(Gomoku.isTerminal(runOf(RUN - 1, { x: 1, y: 0 }))).toBeNull();
  });

  /* Free-style: an overline is still a win. The tournament rule would call six
     no win at all, which is the opposite of what a player expects. */
  it('still wins on six', () => {
    const state = runOf(RUN + 1, { x: 1, y: 0 });

    expect(Gomoku.isTerminal(state)).toEqual({ winner: 'p0' });
    expect(winningLine(state)?.line).toHaveLength(RUN + 1);
  });

  it('does not count a run broken by the other colour', () => {
    // p0 takes 5,5 to 7,5 and 9,5 to 10,5; p1 sits in the gap at 8,5.
    const state = played([
      { x: 5, y: 5 },
      { x: 8, y: 5 },
      { x: 6, y: 5 },
      { x: 0, y: 0 },
      { x: 7, y: 5 },
      { x: 0, y: 1 },
      { x: 9, y: 5 },
      { x: 0, y: 2 },
      { x: 10, y: 5 },
    ]);

    expect(Gomoku.isTerminal(state)).toBeNull();
  });

  it('does not count two colours sharing a line', () => {
    const state = played([
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
    ]);

    expect(Gomoku.isTerminal(state)).toBeNull();
  });

  /* Only the stone just played can have completed a line, which is what makes
     looking at that stone alone correct. If an earlier stone could win, a game
     would be able to continue past a win. */
  it('reports the win on the stone that made it, not a later one', () => {
    const winning = runOf(RUN, { x: 1, y: 0 });
    const line = winningLine(winning);

    expect(line?.by).toBe('p0');
    expect(line?.line[0]).toEqual({ x: 5, y: 5 });
  });

  /* The fixtures above all start their winning run with p0's opening stone, so
     they would also pass if the check looked at the first stone instead of the
     last. This one throws a stone away in the corner first, which is the only
     shape that tells the two apart. */
  it('finds a win whose line does not include the first stone played', () => {
    const state = played([
      { x: 0, y: 0 },
      { x: 0, y: 14 },
      { x: 5, y: 5 },
      { x: 2, y: 14 },
      { x: 6, y: 5 },
      { x: 4, y: 14 },
      { x: 7, y: 5 },
      { x: 6, y: 14 },
      { x: 8, y: 5 },
      { x: 8, y: 14 },
      { x: 9, y: 5 },
    ]);

    expect(Gomoku.isTerminal(state)).toEqual({ winner: 'p0' });
    expect(winningLine(state)?.line).toHaveLength(RUN);
    expect(winningLine(state)?.line).not.toContainEqual({ x: 0, y: 0 });
  });

  it('names the line it was won with, in board order', () => {
    const state = runOf(RUN, { x: 1, y: 1 }, { x: 3, y: 3 });

    expect(winningLine(state)?.line).toEqual([
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 6, y: 6 },
      { x: 7, y: 7 },
    ]);
  });

  it('has no line to report on an empty board', () => {
    expect(winningLine(Gomoku.setup(context()))).toBeNull();
    expect(Gomoku.isTerminal(Gomoku.setup(context()))).toBeNull();
  });
});

describe('Gomoku — a full board', () => {
  /* (x + 2y) mod 4 splits the board so that no three of a colour ever touch:
     along a row the residue steps by 1, down a column by 2, and along either
     diagonal by 3 or -1. Every one of those cycles, so nothing can line up. */
  const packed = (): GomokuState => {
    const stones: Stone[] = [];
    for (let y = 0; y < BOARD; y++) {
      for (let x = 0; x < BOARD; x++) {
        stones.push({ at: { x, y }, by: (x + 2 * y) % 4 < 2 ? 'p0' : 'p1' });
      }
    }
    return { stones, turn: 'p0' };
  };

  it('is a draw when the last point is taken with nobody in a row', () => {
    const full = packed();

    // Guards the fixture: a pattern that accidentally lined up would hide this.
    expect(winningLine(full)).toBeNull();
    expect(full.stones).toHaveLength(BOARD * BOARD);
    expect(Gomoku.isTerminal(full)).toEqual({
      draw: true,
      reason: 'the board is full',
    });
  });

  it('is still undecided one point short', () => {
    const nearly = packed();

    expect(
      Gomoku.isTerminal({ ...nearly, stones: nearly.stones.slice(0, -1) }),
    ).toBeNull();
  });
});
