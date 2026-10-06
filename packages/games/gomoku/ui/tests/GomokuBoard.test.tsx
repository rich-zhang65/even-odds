import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameResult, PlayerId, Snapshot } from '@even-odds/game-sdk';
import type { GomokuState, Stone } from '../../src/types';
import { GomokuBoard } from '../GomokuBoard';

const snapshotOf = (
  stones: Stone[],
  turn: PlayerId,
  result: GameResult | null = null,
): Snapshot<GomokuState> => ({
  mode: 'turn-based',
  matchId: 'm1',
  phase: result === null ? 'playing' : 'over',
  state: { stones, turn },
  currentPlayer: turn,
  result,
});

const render = (snapshot: Snapshot<GomokuState>, seat: PlayerId | null) =>
  renderToStaticMarkup(
    <GomokuBoard snapshot={snapshot} seat={seat} onAction={() => {}} />,
  );

const enabledPoints = (html: string): number =>
  (html.match(/<button(?![^>]*disabled)/g) ?? []).length;

describe('GomokuBoard', () => {
  it('opens every empty point to the player on turn', () => {
    const stones: Stone[] = [{ at: { x: 7, y: 7 }, by: 'p0' }];

    expect(enabledPoints(render(snapshotOf(stones, 'p1'), 'p1'))).toBe(224);
  });

  it('opens nothing to the player waiting, or to anyone watching', () => {
    const snapshot = snapshotOf([], 'p0');

    expect(enabledPoints(render(snapshot, 'p1'))).toBe(0);
    expect(enabledPoints(render(snapshot, null))).toBe(0);
  });

  it('opens nothing once the game is over', () => {
    const snapshot = snapshotOf([], 'p0', { winner: 'p1' });

    expect(enabledPoints(render(snapshot, 'p0'))).toBe(0);
  });

  it('draws one line through the winning run, just past each end', () => {
    const stones: Stone[] = [];
    for (let step = 0; step < 5; step++) {
      stones.push({ at: { x: 2 + step, y: 9 - step }, by: 'p1' });
      if (step < 4) stones.push({ at: { x: step, y: 0 }, by: 'p0' });
    }
    const html = render(snapshotOf(stones, 'p0', { winner: 'p1' }), 'p0');

    expect(html.match(/<line/g)).toHaveLength(1);
    expect(html).toContain('x1="2.1" y1="9.9" x2="6.9" y2="5.1"');
  });

  it('draws a line for each run the winning stone completed', () => {
    const red = [
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 6, y: 7 },
      { x: 7, y: 7 },
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 8 },
      { x: 5, y: 9 },
      { x: 5, y: 7 },
    ];
    const stones: Stone[] = [];
    for (const [index, at] of red.entries()) {
      stones.push({ at, by: 'p0' });
      if (index < red.length - 1)
        stones.push({ at: { x: index * 2, y: 0 }, by: 'p1' });
    }
    const html = render(snapshotOf(stones, 'p1', { winner: 'p0' }), 'p0');

    expect(html.match(/<line/g)).toHaveLength(2);
    expect(html).toContain('x1="3.1" y1="7.5" x2="7.9" y2="7.5"');
    expect(html).toContain('x1="5.5" y1="5.1" x2="5.5" y2="9.9"');
  });

  it('draws no line while the game is still going', () => {
    const stones: Stone[] = [{ at: { x: 7, y: 7 }, by: 'p0' }];

    expect(render(snapshotOf(stones, 'p1'), 'p1')).not.toContain('<line');
  });

  it('names the stone on a point, and the five that won', () => {
    const stones: Stone[] = [];
    for (let x = 3; x < 8; x++) {
      stones.push({ at: { x, y: 7 }, by: 'p0' });
      if (x < 7) stones.push({ at: { x, y: 0 }, by: 'p1' });
    }
    const html = render(snapshotOf(stones, 'p1', { winner: 'p0' }), 'p0');

    expect(html.match(/part of the winning line/g)).toHaveLength(5);
    expect(html).toContain('aria-label="D8, Red, part of the winning line"');
    expect(html).toContain('aria-label="D15, Blue"');
  });
});
