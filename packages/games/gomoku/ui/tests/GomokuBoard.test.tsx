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
