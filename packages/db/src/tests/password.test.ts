import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../password';

describe('passwords', () => {
  it('verifies the password it hashed, and nothing else', async () => {
    const stored = await hashPassword('123');

    expect(await verifyPassword('123', stored)).toBe(true);
    expect(await verifyPassword('1234', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('never stores the password, and salts every hash differently', async () => {
    const first = await hashPassword('123');
    const second = await hashPassword('123');

    expect(first).not.toContain('123$');
    expect(first).not.toBe(second);
    expect(await verifyPassword('123', second)).toBe(true);
  });

  /* The parameters are read back from the hash, not from the current
     constants, so raising the cost later leaves existing accounts working. */
  it('reads its cost from the hash rather than the current constants', async () => {
    const [, , , , salt, key] = (await hashPassword('123')).split('$');
    const rebuilt = ['scrypt', 2 ** 17, 8, 1, salt, key].join('$');

    expect(await verifyPassword('123', rebuilt)).toBe(true);
    // Same salt and key, cheaper cost: a different derivation, so no match.
    expect(
      await verifyPassword(
        '123',
        ['scrypt', 2 ** 14, 8, 1, salt, key].join('$'),
      ),
    ).toBe(false);
  });

  it('refuses a hash in a scheme it does not know', async () => {
    expect(await verifyPassword('123', 'plain$123')).toBe(false);
    expect(await verifyPassword('123', '123')).toBe(false);
  });
});
