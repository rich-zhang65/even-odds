import { describe, expect, it } from 'vitest';
import { outcomeFor } from '../history';

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
