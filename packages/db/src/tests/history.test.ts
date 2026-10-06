import { describe, expect, it } from 'vitest';
import { outcomeFor, recentGames } from '../history';
import type { PastMatch } from '../history';

describe('outcomeFor', () => {
  it('reads the stored winner from the side of the seat asking', () => {
    expect(outcomeFor('p0', 'p0')).toBe('won');
    expect(outcomeFor('p0', 'p1')).toBe('lost');
    expect(outcomeFor('p1', 'p1')).toBe('won');
  });

  it('is a draw for both seats when nobody won', () => {
    expect(outcomeFor(null, 'p0')).toBe('draw');
    expect(outcomeFor(null, 'p1')).toBe('draw');
  });
});

describe('recentGames', () => {
  let minute = 0;
  // Newest first, as historyFor returns them.
  const played = (...gameIds: string[]): PastMatch[] =>
    gameIds.map((gameId, index) => ({
      id: `m${index}`,
      gameId,
      outcome: 'won',
      reason: null,
      opponent: 'victoria',
      score: null,
      finishedAt: new Date(2026, 9, 6, 12, 60 - (minute += 1)),
    }));

  it('lists each game once, by the last time it was played', () => {
    expect(
      recentGames(played('gomoku', 'yazy', 'gomoku', 'battleship', 'yazy'), 5),
    ).toEqual(['gomoku', 'yazy', 'battleship']);
  });

  it('stops at the limit', () => {
    expect(recentGames(played('a', 'b', 'c', 'd', 'e', 'f', 'a'), 5)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('is empty before anything has been played', () => {
    expect(recentGames([], 5)).toEqual([]);
  });
});
