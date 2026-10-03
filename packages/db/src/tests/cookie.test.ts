import { describe, expect, it } from 'vitest';
import { sessionTokenFrom } from '../cookie';

describe('sessionTokenFrom', () => {
  it('finds the session among other cookies', () => {
    expect(sessionTokenFrom('theme=dark; eo_session=abc123; other=1')).toBe(
      'abc123',
    );
  });

  it('keeps a value that itself contains =', () => {
    expect(sessionTokenFrom('eo_session=a=b=')).toBe('a=b=');
  });

  it('does not mistake a cookie whose name merely ends the same way', () => {
    expect(sessionTokenFrom('not_eo_session=x')).toBeNull();
  });

  it('is null with no header or no session cookie', () => {
    expect(sessionTokenFrom(undefined)).toBeNull();
    expect(sessionTokenFrom('theme=dark')).toBeNull();
  });
});
